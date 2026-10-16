#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runAutoHostIteration} from './rsi-learning-auto-host.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const REQUIRED_CAPABILITIES=Object.freeze(['FACT-SKILL-NATIVE','GH-SAFE-NATIVE','DB-SAFE-NATIVE','EVT-001','TECH-CAP-SCOUT-NATIVE','COMPET-NATIVE','CAP-NATIVE','LEAD-NATIVE']);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ADOPTION_PATH=path.resolve(__dirname,'../registry/native-capability-operational-adoption-v1.json');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function stable(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function iso(value,label='time'){const d=new Date(req(value,label));if(Number.isNaN(d.valueOf()))throw new Error(`${label} invalid`);return d.toISOString();}
function jsonFiles(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).map(x=>path.join(dir,x.name)).sort();}
function atomicJson(file,value){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function authorityGreen(report){const a=report?.authority??{};return a.prod_authorized===false&&a.prod_write_authorized===false&&a.provider_write_authorized===false&&a.crm_write_authorized===false&&a.db_mutation_authorized===false&&a.spend_authorized===false&&a.trading_access===false&&a.android_touched===false&&Number(a.additional_cost_eur)===0;}

function validateOperationalReport(report){
  if(!report||report.state_type!=='CEREBRO_NATIVE_CAPABILITY_OPERATIONAL_FULL_REPORT'||report.status!=='OPERATIONAL_FULL_PREPROD'||report.operational_full!==true)throw new Error('operational FULL report required');
  if(report.company_id!=='fenix'||report.environment!==PREPROD||report.version!==VERSION)throw new Error('operational report scope invalid');
  if(report.capability_count!==8||!Array.isArray(report.capabilities)||report.capabilities.length!==8)throw new Error('operational report must contain eight capabilities');
  const ids=report.capabilities.map(x=>x.capability_id).sort();if(JSON.stringify(ids)!==JSON.stringify([...REQUIRED_CAPABILITIES].sort()))throw new Error('operational capability set mismatch');
  if(!report.capabilities.every(x=>x.status==='ACTIVE_CONTINUOUS_PREPROD'&&x.consumer_coverage===1&&x.consumers_green===x.required_consumers&&x.additional_cost_eur===0))throw new Error('operational consumer coverage not green');
  if(report.event_bus_all_engines_green!==true||report.learning?.status!=='OUTBOX_GREEN'||!authorityGreen(report))throw new Error('operational event/learning/authority gate not green');
  return report;
}

function adoptionMap(){const registry=readJson(ADOPTION_PATH);if(registry.environment!==PREPROD||registry.capabilities?.length!==8)throw new Error('adoption registry invalid');return new Map(registry.capabilities.map(x=>[x.capability_id,x]));}

function readCurrentImprovementEvents({outbox_root,company_id='fenix'}){
  const batchesDir=path.join(path.resolve(req(outbox_root,'outbox_root')),company_id,'batches');
  const events=[];
  for(const file of jsonFiles(batchesDir)){
    const batch=readJson(file);if(batch.company_id!==company_id||batch.engine_id!=='LRN-001'||batch.environment!==PREPROD)throw new Error('LRN outbox batch scope invalid');
    if(batch.prod_authorized!==false||batch.trading_access!==false||batch.additional_cost_eur!==0)throw new Error('LRN outbox authority expanded');
    for(const event of batch.events??[])if(event.type==='capability.operational.improvement.feedback')events.push({batch_id:batch.batch_id,event});
  }
  return events;
}

function toLearningEvents({report,outboxEvents}){
  const byCap=new Map(outboxEvents.map(x=>[x.event?.payload?.capability_id,x]));
  const adoption=adoptionMap();const observed_at=iso(report.cycle_anchor,'cycle_anchor');const events=[];
  for(const capReport of [...report.capabilities].sort((a,b)=>a.capability_id.localeCompare(b.capability_id))){
    const capability_id=capReport.capability_id;const source=byCap.get(capability_id);if(!source)throw new Error(`missing operational improvement event:${capability_id}`);
    const binding=adoption.get(capability_id);if(!binding)throw new Error(`missing adoption binding:${capability_id}`);
    const output_hash=req(capReport.output_hash,'capability.output_hash');
    const target_engine_bindings=binding.required_consumers.includes('ALL_REGISTERED_ENGINES')?['ALL_REGISTERED_ENGINES']:[...binding.required_consumers].sort();
    const eventCore={capability_id,owner_engine_id:binding.owner_engine_id,status:capReport.status,consumer_coverage:capReport.consumer_coverage,required_consumers:capReport.required_consumers,consumers_green:capReport.consumers_green,output_hash,operational_evidence_hash:report.evidence_hash,cycle_anchor:observed_at};
    events.push(Object.freeze({
      event_id:`evt:continuous-improvement:${digest(eventCore).slice(0,24)}`,
      event_type:'CAPABILITY_OPERATIONAL_IMPROVEMENT_FEEDBACK',
      source_type:'ENGINE_RESULT',
      company_id:report.company_id,
      engine_id:binding.owner_engine_id,
      version:report.version,
      observed_at,
      learning_hypothesis:`Preserve or improve ${capability_id} operational outcome and consumer coverage without authority expansion, quality regression or additional cost.`,
      expected_metric_delta:{name:'operational_consumer_coverage',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW_PREPROD'},
      confidence:0.9,
      risk_class:'LOW',
      requires_production_mutation:false,
      evidence_refs:[`operational-report:${report.evidence_hash}`,`operational-output:${capability_id}:${output_hash}`,`lrn-outbox:${source.batch_id}:${source.event.origin_event_id??source.event.event_id}`],
      target_engine_bindings,
      reason:'DAILY_OPERATIONAL_OUTCOME_TO_GOVERNED_IMPROVEMENT_LOOP',
      payload:{...eventCore,feedback_kind:source.event.payload?.feedback_kind??'DAILY_OPERATIONAL_FEEDBACK',next_action:'OLD_VS_NEW_EXPERIMENT_THEN_EVALUATION_AND_TRIBUNAL',additional_cost_eur:0,prod_authorized:false}
    }));
  }
  return Object.freeze(events);
}

function hostConfig({state_root}){
  const root=path.resolve(req(state_root,'state_root'));
  return Object.freeze({company_id:'fenix',engine_id:'LRN-001',environment:PREPROD,version:VERSION,preprod_version:VERSION,data_dir:path.join(root,'data'),inbox_dir:path.join(root,'inbox'),backup_dir:path.join(root,'backups'),poll_interval_ms:60000,policy_pass:true,security_pass:true,local_persistence_enabled:true,remote_outbox:{enabled:false}});
}

function safeAutoHost(result,label){
  if(!result||result.status!=='GREEN'||result.learning?.status!=='GREEN')throw new Error(`${label}: learning host not green`);
  if(result.candidates?.status!=='CANDIDATES_GREEN')throw new Error(`${label}: improvement candidates not green`);
  if(result.orchestration?.status!=='ORCHESTRATOR_GREEN'||result.horizons?.status!=='HORIZON_EXECUTORS_GREEN'||result.meta_observability?.status!=='META_METRICS_GREEN')throw new Error(`${label}: orchestrator/horizons/meta not green`);
  if(result.prod_authorized!==false||result.prod_write_authorized!==false||result.trading_access!==false||result.additional_cost_eur!==0)throw new Error(`${label}: authority/cost expanded`);
  return result;
}

function dailyHorizonState(result){
  const completed=(result.horizons?.completed??[]).some(x=>x.cadence==='DAILY'&&x.status==='GREEN');
  const alreadyCurrent=!completed&&Number(result.orchestration?.planned_total??0)===0&&Number(result.horizons?.completed_total??0)===0;
  return Object.freeze({green:completed||alreadyCurrent,completed_this_run:completed,already_current:alreadyCurrent});
}

export async function runNativeCapabilityContinuousImprovementV1({operational_report,outbox_root,state_root,now=null}={}){
  const report=validateOperationalReport(typeof operational_report==='string'?readJson(path.resolve(operational_report)):operational_report);
  const outboxEvents=readCurrentImprovementEvents({outbox_root,company_id:report.company_id});
  if(outboxEvents.length!==8)throw new Error(`expected exactly 8 operational improvement outbox events, got ${outboxEvents.length}`);
  const learningEvents=toLearningEvents({report,outboxEvents});
  const cfg=hostConfig({state_root});ensureDir(cfg.inbox_dir);ensureDir(cfg.data_dir);ensureDir(cfg.backup_dir);
  const inputFingerprint=digest(learningEvents);
  const inboxFile=path.join(cfg.inbox_dir,`native-operational-improvement-${inputFingerprint.slice(0,24)}.json`);
  if(!fs.existsSync(inboxFile))atomicJson(inboxFile,{schema_version:'1.0.0',state_type:'CEREBRO_NATIVE_OPERATIONAL_IMPROVEMENT_EVENT_REPORT',company_id:report.company_id,environment:PREPROD,version:VERSION,events:learningEvents,prod_authorized:false,additional_cost_eur:0});
  const tick=iso(now??report.cycle_anchor,'now');
  const first=safeAutoHost(await runAutoHostIteration({raw_config:cfg,now:()=>tick}),'first');
  const firstPersisted=Number(first.learning?.last_result?.persisted_total??0);const firstDuplicates=Number(first.learning?.last_result?.duplicates_total??0);
  if(first.candidates.candidate_total<8||first.candidates.held_total!==0||first.candidates.human_required.length!==0)throw new Error('candidate materialization incomplete or held');
  const daily=dailyHorizonState(first);if(!daily.green)throw new Error('daily learning horizon neither executed nor already current');
  const second=safeAutoHost(await runAutoHostIteration({raw_config:cfg,now:()=>tick}),'idempotency');
  const secondSkipped=Number(second.learning?.last_result?.skipped_receipts??0);if(secondSkipped<1)throw new Error('learning inbox idempotency not proven');
  if(second.candidates.candidate_total!==first.candidates.candidate_total)throw new Error('candidate ledger not idempotent');
  const improvementCandidates=first.candidates.candidate_total;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_REPORT',company_id:report.company_id,environment:PREPROD,version:VERSION,
    status:'CONTINUOUS_IMPROVEMENT_GREEN_PREPROD',continuous_improvement_green:true,cycle_anchor:report.cycle_anchor,
    operational_evidence_hash:report.evidence_hash,learning_events_total:learningEvents.length,input_fingerprint:inputFingerprint,
    learning:{status:first.learning.status,persisted_this_cycle:firstPersisted,duplicates_this_cycle:firstDuplicates,ledger_operation_count:first.learning?.last_result?.ledger_exists===true?first.candidates.source_learning_total:null,idempotency_receipts_skipped_second_pass:secondSkipped},
    candidates:{status:first.candidates.status,candidate_total:improvementCandidates,new_candidates_this_cycle:first.candidates.persisted_total,duplicate_candidates_this_cycle:first.candidates.duplicates_total,held_total:first.candidates.held_total,next_gate:first.candidates.next_gate,production_apply_allowed:false,auto_promotion_allowed:false},
    orchestration:{status:first.orchestration.status,planned_total:first.orchestration.planned_total,created_total:first.orchestration.created_total},
    horizons:{status:first.horizons.status,completed_total:first.horizons.completed_total,daily_green:daily.green,daily_completed_this_run:daily.completed_this_run,daily_already_current:daily.already_current},
    meta_observability:{status:first.meta_observability.status,samples_total:first.meta_observability.samples_total},
    governance:{old_vs_new_required:true,evaluation_required:true,tribunal_required:true,automatic_code_mutation:false,automatic_prod_promotion:false,next_gate:'OLD_VS_NEW_EXPERIMENT_THEN_EVALUATION_AND_TRIBUNAL'},
    persistence:{state_root:path.resolve(state_root),restorable_from_previous_workflow_artifact:true,idempotency_green:true},
    authority:{prod_authorized:false,prod_write_authorized:false,provider_write_authorized:false,crm_write_authorized:false,db_mutation_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,additional_cost_eur:0},
    next_gate:'PERSIST_STATE_AND_REPEAT_AUTOMATICALLY_ON_NEXT_DAILY_RUN'
  });
}

function args(argv){const o={};for(let i=2;i<argv.length;i++){const a=argv[i];if(a==='--operational-report')o.operational_report=argv[++i];else if(a==='--outbox-root')o.outbox_root=argv[++i];else if(a==='--state-root')o.state_root=argv[++i];else if(a==='--now')o.now=argv[++i];else if(a==='--out')o.out=argv[++i];else throw new Error(`unknown argument:${a}`);}return o;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runNativeCapabilityContinuousImprovementV1(a).then(result=>{const json=JSON.stringify(result,null,2)+'\n';if(a.out){ensureDir(path.dirname(path.resolve(a.out)));fs.writeFileSync(path.resolve(a.out),json,'utf8');}process.stdout.write(json);}).catch(error=>{console.error(error?.stack??String(error));process.exitCode=1;});
}

export const NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',environment:PREPROD,capabilities:REQUIRED_CAPABILITIES,source:'OPERATIONAL_LRN_OUTBOX',learning_engine_id:'LRN-001',persistent_state:true,daily:true,restored_same_day_state_supported:true,improvement_candidates:true,old_vs_new_required:true,evaluation_required:true,tribunal_required:true,automatic_code_mutation:false,automatic_prod_promotion:false,additional_cost_target_eur:0,prod_authorized:false,trading_access:false,android_touched:false});
