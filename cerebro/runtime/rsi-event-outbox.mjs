import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';

function reqString(value,label){if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);return value.trim();}
function stableHash(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function sha256Bytes(value){return crypto.createHash('sha256').update(value).digest('hex');}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function atomicJson(file,value){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function canonicalSource(source={}){
  const workflow=reqString(source.workflow??'CEREBRO Skill Discovery Scout','source.workflow');
  const run_id=Number(source.run_id);
  if(!Number.isInteger(run_id)||run_id<=0) throw new Error('source.run_id positive integer required');
  const head_sha=reqString(source.head_sha,'source.head_sha');
  if(!/^[0-9a-f]{40}$/i.test(head_sha)) throw new Error('source.head_sha must be 40 hex chars');
  return Object.freeze({workflow,run_id,head_sha:head_sha.toLowerCase()});
}

export function normalizeLearningSubscribers(registry){
  if(!registry||registry.engine_id!==ENGINE_ID||registry.environment!==PREPROD) throw new Error('LRN subscriber registry must be PREPROD LRN-001');
  if(registry.prod_authorized!==false||registry.trading_access!==false) throw new Error('subscriber registry must deny PROD and Trading');
  if(!Array.isArray(registry.subscribers)) throw new Error('subscribers array required');
  const seen=new Set();
  const active=[];
  for(const raw of registry.subscribers){
    const company_id=reqString(raw.company_id,'subscriber.company_id');
    if(seen.has(company_id)) throw new Error(`duplicate subscriber ${company_id}`);
    seen.add(company_id);
    if(raw.enabled!==true) continue;
    if(raw.environment!==PREPROD) throw new Error(`subscriber ${company_id} must be PREPROD`);
    if(raw.prod_authorized!==false||raw.prod_write_authorized!==false||raw.trading_access!==false) throw new Error(`subscriber ${company_id} expanded forbidden authority`);
    if(raw.local_validation_required!==true) throw new Error(`subscriber ${company_id} must require local validation`);
    active.push(Object.freeze({company_id,version:reqString(raw.version,'subscriber.version')}));
  }
  return Object.freeze(active);
}

function localizeEvent(event,subscriber){
  if(!event||typeof event!=='object'||Array.isArray(event)) throw new Error('event object required');
  const origin_event_id=reqString(event.event_id,'event.event_id');
  const origin_company_id=reqString(event.company_id??'GLOBAL_ONLY','event.company_id');
  if(origin_company_id!=='GLOBAL_ONLY'&&origin_company_id!==subscriber.company_id) return null;
  const event_id=`evt:lrn:${stableHash(`${subscriber.company_id}|${origin_event_id}`).slice(0,24)}`;
  return Object.freeze({
    ...event,
    event_id,
    company_id:subscriber.company_id,
    environment:'PREPROD_CANDIDATE',
    origin_event_id,
    origin_company_id,
    local_validation_required:true,
    publish_authorized:false,
    persistent_publish_authorized:false,
    rsi_publish_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
}

export function buildLearningOutbox({event_report,subscriber_registry,source}){
  if(!event_report||!Array.isArray(event_report.events)) throw new Error('event_report.events required');
  const subscribers=normalizeLearningSubscribers(subscriber_registry);
  const src=canonicalSource(source);
  const batches=[];
  for(const subscriber of subscribers){
    const events=event_report.events.map(event=>localizeEvent(event,subscriber)).filter(Boolean).sort((a,b)=>a.event_id.localeCompare(b.event_id));
    if(events.length===0) continue;
    const batchSeed={company_id:subscriber.company_id,version:subscriber.version,source:src,event_ids:events.map(event=>event.event_id)};
    const batch_id=`lrn-batch:${stableHash(batchSeed).slice(0,24)}`;
    const batch=Object.freeze({
      schema_version:'1.0.0',
      state_type:'CEREBRO_RSI_LRN_EVENT_BATCH',
      batch_id,
      company_id:subscriber.company_id,
      engine_id:ENGINE_ID,
      environment:PREPROD,
      version:subscriber.version,
      source:src,
      source_event_count:event_report.events.length,
      events_total:events.length,
      events,
      local_validation_required:true,
      persistent_publish_authorized:false,
      rsi_publish_authorized:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false,
      additional_cost_eur:0
    });
    batches.push(batch);
  }
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_OUTBOX_BUILD',source:src,batches_total:batches.length,batches,prod_authorized:false,trading_access:false,additional_cost_eur:0});
}

function batchFilename(batch){return `${batch.batch_id.replace(/[^A-Za-z0-9._-]/g,'_')}.json`;}
function validateExistingBatch(file,batch){
  const existing=fs.readFileSync(file,'utf8');
  const next=`${JSON.stringify(batch,null,2)}\n`;
  if(stableHash(existing)!==stableHash(next)) throw new Error(`OUTBOX_BATCH_CONFLICT: ${batch.batch_id}`);
}

export function persistLearningOutbox({build,output_root}){
  if(!build||!Array.isArray(build.batches)) throw new Error('outbox build required');
  const root=path.resolve(reqString(output_root,'output_root'));
  const results=[];
  for(const batch of build.batches){
    const companyRoot=path.join(root,batch.company_id);
    const batchesRoot=path.join(companyRoot,'batches');
    ensureDir(batchesRoot);
    const filename=batchFilename(batch);
    const batchFile=path.join(batchesRoot,filename);
    let created=false;
    if(fs.existsSync(batchFile)) validateExistingBatch(batchFile,batch);
    else{atomicJson(batchFile,batch);created=true;}
    const bytes=fs.readFileSync(batchFile);
    const entry={batch_id:batch.batch_id,path:`batches/${filename}`,sha256:sha256Bytes(bytes),events_total:batch.events_total,source_run_id:batch.source.run_id,source_head_sha:batch.source.head_sha};
    const indexFile=path.join(companyRoot,'index.json');
    let prior={schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_OUTBOX_INDEX',company_id:batch.company_id,engine_id:ENGINE_ID,environment:PREPROD,version:batch.version,batches:[],prod_authorized:false,trading_access:false,additional_cost_eur:0};
    if(fs.existsSync(indexFile)) prior=readJson(indexFile);
    if(prior.company_id!==batch.company_id||prior.engine_id!==ENGINE_ID||prior.environment!==PREPROD||prior.prod_authorized!==false) throw new Error(`OUTBOX_INDEX_CONTEXT_MISMATCH: ${batch.company_id}`);
    const existing=prior.batches??[];
    const same=existing.find(item=>item.batch_id===entry.batch_id);
    if(same&&JSON.stringify(same)!==JSON.stringify(entry)) throw new Error(`OUTBOX_INDEX_CONFLICT: ${entry.batch_id}`);
    const batches=same?existing:[...existing,entry].sort((a,b)=>a.batch_id.localeCompare(b.batch_id));
    const index={...prior,version:batch.version,batches_total:batches.length,batches,prod_authorized:false,trading_access:false,additional_cost_eur:0};
    atomicJson(indexFile,index);
    results.push({company_id:batch.company_id,batch_id:batch.batch_id,created,batch_file:batchFile,index_file:indexFile,sha256:entry.sha256});
  }
  return Object.freeze({status:'OUTBOX_GREEN',results:Object.freeze(results),created_total:results.filter(r=>r.created).length,batches_total:results.length,prod_authorized:false,trading_access:false,additional_cost_eur:0});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const eventsPath=reqString(arg('--events'),'--events');
    const subscribersPath=reqString(arg('--subscribers'),'--subscribers');
    const outputRoot=reqString(arg('--output-root'),'--output-root');
    const runId=Number(reqString(arg('--source-run-id'),'--source-run-id'));
    const headSha=reqString(arg('--source-head-sha'),'--source-head-sha');
    const workflow=arg('--source-workflow')??'CEREBRO Skill Discovery Scout';
    const build=buildLearningOutbox({event_report:readJson(eventsPath),subscriber_registry:readJson(subscribersPath),source:{workflow,run_id:runId,head_sha:headSha}});
    const result=persistLearningOutbox({build,output_root:outputRoot});
    console.log(JSON.stringify({...result,source_run_id:runId,source_head_sha:headSha}));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
