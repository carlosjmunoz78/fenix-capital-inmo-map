import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';

function reqString(value,label){if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);return value.trim();}
function sha256(text){return crypto.createHash('sha256').update(text,'utf8').digest('hex');}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function atomicText(file,text){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,text,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function safeName(value){return value.replace(/[^A-Za-z0-9._-]/g,'_');}

export function normalizeRemoteOutboxConfig(input){
  if(!input||input.enabled!==true) return Object.freeze({enabled:false});
  const base_url=reqString(input.base_url,'remote_outbox.base_url').replace(/\/+$/,'');
  const url=new URL(base_url);
  if(url.protocol!=='https:') throw new Error('remote outbox requires HTTPS');
  if(url.hostname!=='raw.githubusercontent.com') throw new Error('remote outbox host must be raw.githubusercontent.com');
  if(!url.pathname.includes('/cerebro-rsi-learning-outbox-v0/cerebro/runtime/rsi-outbox')) throw new Error('remote outbox must target dedicated CEREBRO state branch');
  return Object.freeze({enabled:true,base_url,credentials_required:false,additional_cost_eur:0,prod_authorized:false,trading_access:false});
}

async function getText(url,fetch_impl){
  const response=await fetch_impl(url,{method:'GET',headers:{accept:'application/json'}});
  if(response.status===404) return null;
  if(!response.ok) throw new Error(`REMOTE_OUTBOX_HTTP_${response.status}`);
  return await response.text();
}

function validateIndex(index,company_id){
  if(!index||index.company_id!==company_id||index.engine_id!==ENGINE_ID||index.environment!==PREPROD) throw new Error('REMOTE_OUTBOX_INDEX_CONTEXT_MISMATCH');
  if(index.prod_authorized!==false||index.trading_access!==false) throw new Error('REMOTE_OUTBOX_INDEX_AUTHORITY_EXPANDED');
  if(!Array.isArray(index.batches)) throw new Error('REMOTE_OUTBOX_INDEX_BATCHES_REQUIRED');
}
function validateEntry(entry){
  if(!entry||typeof entry.batch_id!=='string'||!entry.batch_id) throw new Error('REMOTE_OUTBOX_BATCH_ID_REQUIRED');
  if(typeof entry.path!=='string'||!entry.path.startsWith('batches/')||entry.path.includes('..')||entry.path.includes('\\')) throw new Error('REMOTE_OUTBOX_INVALID_BATCH_PATH');
  if(!/^[0-9a-f]{64}$/.test(entry.sha256??'')) throw new Error('REMOTE_OUTBOX_SHA256_REQUIRED');
}
function validateBatch(batch,company_id,entry){
  if(!batch||batch.batch_id!==entry.batch_id||batch.company_id!==company_id||batch.engine_id!==ENGINE_ID||batch.environment!==PREPROD) throw new Error('REMOTE_OUTBOX_BATCH_CONTEXT_MISMATCH');
  if(batch.prod_authorized!==false||batch.prod_write_authorized!==false||batch.trading_access!==false) throw new Error('REMOTE_OUTBOX_BATCH_AUTHORITY_EXPANDED');
  if(!Array.isArray(batch.events)||batch.events.some(event=>event?.company_id!==company_id||event?.prod_authorized!==false)) throw new Error('REMOTE_OUTBOX_EVENT_TENANT_OR_AUTHORITY_MISMATCH');
}

export async function syncRemoteOutboxOnce({remote_outbox,company_id,inbox_dir,fetch_impl=globalThis.fetch}){
  const remote=normalizeRemoteOutboxConfig(remote_outbox);
  if(!remote.enabled) return Object.freeze({status:'REMOTE_OUTBOX_DISABLED',downloaded_total:0,skipped_total:0,prod_authorized:false});
  if(typeof fetch_impl!=='function') throw new Error('fetch implementation required');
  const company=reqString(company_id,'company_id');
  const inbox=path.resolve(reqString(inbox_dir,'inbox_dir'));
  ensureDir(inbox);
  const companyBase=`${remote.base_url}/${encodeURIComponent(company)}`;
  const indexText=await getText(`${companyBase}/index.json`,fetch_impl);
  if(indexText===null) return Object.freeze({status:'REMOTE_OUTBOX_EMPTY',downloaded_total:0,skipped_total:0,prod_authorized:false});
  const index=JSON.parse(indexText);validateIndex(index,company);
  let downloaded=0,skipped=0;
  for(const entry of [...index.batches].sort((a,b)=>String(a.batch_id).localeCompare(String(b.batch_id)))){
    validateEntry(entry);
    const localFile=path.join(inbox,`remote-${safeName(entry.batch_id)}.json`);
    if(fs.existsSync(localFile)){
      const existing=fs.readFileSync(localFile,'utf8');
      if(sha256(existing)!==entry.sha256) throw new Error(`REMOTE_OUTBOX_LOCAL_CONFLICT: ${entry.batch_id}`);
      skipped+=1;continue;
    }
    const batchText=await getText(`${companyBase}/${entry.path}`,fetch_impl);
    if(batchText===null) throw new Error(`REMOTE_OUTBOX_BATCH_MISSING: ${entry.batch_id}`);
    if(sha256(batchText)!==entry.sha256) throw new Error(`REMOTE_OUTBOX_CHECKSUM_MISMATCH: ${entry.batch_id}`);
    const batch=JSON.parse(batchText);validateBatch(batch,company,entry);
    atomicText(localFile,batchText);
    downloaded+=1;
  }
  return Object.freeze({status:'REMOTE_OUTBOX_GREEN',downloaded_total:downloaded,skipped_total:skipped,index_batches_total:index.batches.length,credentials_required:false,additional_cost_eur:0,prod_authorized:false,trading_access:false});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const result=await syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:reqString(arg('--base-url'),'--base-url')},company_id:reqString(arg('--company-id'),'--company-id'),inbox_dir:reqString(arg('--inbox'),'--inbox')});
    console.log(JSON.stringify(result));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
