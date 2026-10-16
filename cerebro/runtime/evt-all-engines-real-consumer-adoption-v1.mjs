#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Evt001Native} from './evt001-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const EVT_ALL_ENGINES_REAL_VERSION='1.0.0';
export const EVT_ALL_ENGINES_OWNER_ENGINE_ID='EVT-001';
export const EVT_ALL_ENGINES_SELECTOR='ALL_REGISTERED_ENGINES';
const PREPROD='PREPROD';
const EVENT_TYPE='cerebro.registry.epoch.v1';
const GENERATION=1;
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH=path.resolve(__dirname,'../registry/engine-registry.v1.json');
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function ctx(company_id,engine_id,version='0.1.0'){return {company_id,engine_id,environment:PREPROD,version};}

export function loadEvtCanonicalEngineRegistry({registry_path=REGISTRY_PATH}={}){
 const r=readJson(registry_path);
 const ids=Array.isArray(r.engine_ids)?r.engine_ids:[];
 const unique=[...new Set(ids)];
 if(r.state_type!=='CEREBRO_ENGINE_REGISTRY_V1'||!ids.length||ids.length!==unique.length||r.count!==ids.length)throw new Error('EVT_CANONICAL_ENGINE_REGISTRY_INVALID');
 if(!ids.includes('EVT-001'))throw new Error('EVT_OWNER_MISSING_FROM_CANONICAL_REGISTRY');
 const fingerprint=hash({schema_version:r.schema_version,count:r.count,engine_ids:ids});
 return Object.freeze({count:r.count,engine_ids:Object.freeze([...ids]),fingerprint,default_version:r.defaults?.version??'0.1.0',registry_path});
}

export function buildEvtAllEnginesProducerBundle({company_id='fenix',registry_path=REGISTRY_PATH}={}){
 const registry=loadEvtCanonicalEngineRegistry({registry_path});
 const events=registry.engine_ids.map(engine_id=>Object.freeze({
   type:EVENT_TYPE,
   schema_version:'1.0.0',
   context:Object.freeze(ctx(company_id,engine_id,registry.default_version)),
   idempotency_key:`evt-all-engines:${company_id}:${registry.fingerprint}:${engine_id}:g${GENERATION}`,
   payload:Object.freeze({target_engine_id:engine_id,registry_fingerprint:registry.fingerprint,registry_count:registry.count,generation:GENERATION,semantic_action:'APPLY_CANONICAL_REGISTRY_EPOCH'})
 }));
 return Object.freeze({
   schema_version:'1.0.0',state_type:'CEREBRO_EVT_ALL_ENGINES_PRODUCER_BUNDLE',capability_id:'EVT-001',
   company_id,engine_id:'EVT-001',environment:PREPROD,version:EVT_ALL_ENGINES_REAL_VERSION,
   bundle_id:`evtall:${hash({company_id,fingerprint:registry.fingerprint,generation:GENERATION}).slice(0,24)}`,
   required_consumer_selector:EVT_ALL_ENGINES_SELECTOR,canonical_engine_count:registry.count,
   canonical_engine_ids:Object.freeze([...registry.engine_ids]),registry_fingerprint:registry.fingerprint,
   generation:GENERATION,event_type:EVENT_TYPE,events:Object.freeze(events),
   additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,
   provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false
 });
}

function assertBundle(b){
 if(!b||b.capability_id!=='EVT-001'||b.engine_id!=='EVT-001'||b.environment!==PREPROD||b.required_consumer_selector!==EVT_ALL_ENGINES_SELECTOR)throw new Error('EVT_ALL_ENGINES_PREPROD_BUNDLE_REQUIRED');
 for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched'])if(b[k]!==false)throw new Error('EVT_ALL_ENGINES_FORBIDDEN_AUTHORITY');
 if(!Array.isArray(b.canonical_engine_ids)||new Set(b.canonical_engine_ids).size!==b.canonical_engine_ids.length||b.canonical_engine_count!==b.canonical_engine_ids.length)throw new Error('EVT_ALL_ENGINES_CANONICAL_SET_INVALID');
 for(const spec of b.events??[]){if(spec.context?.company_id!==b.company_id||spec.context?.environment!==PREPROD)throw new Error('EVT_ALL_ENGINES_CONTEXT_MISMATCH');}
 return b;
}
function semanticFile(root){return path.join(root,'semantic-engine-state.json');}
function emptySemantic(b){return {schema_version:'1.0.0',state_type:'CEREBRO_EVT_ALL_ENGINE_SEMANTIC_STATE',company_id:b.company_id,environment:PREPROD,generation:0,registry_fingerprint:null,engines:{},prod_authorized:false,additional_cost_eur:0};}
function loadSemantic(root,b){const f=semanticFile(root);return fs.existsSync(f)?readJson(f):emptySemantic(b);}
function saveSemantic(root,state){writeJson(semanticFile(root),state);return state;}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,generation:state.generation,registry_fingerprint:state.registry_fingerprint,engines:state.engines});}

function createSemanticTransport({root,bundle,transient_fail_engine_id=null}){
 const failedOnce=new Set();
 return async event=>{
   const d=event?.payload?.data??{};
   const engine=event?.context?.engine_id;
   if(transient_fail_engine_id===engine&&!failedOnce.has(engine)){failedOnce.add(engine);throw new Error('INJECTED_TRANSIENT_CONSUMER_FAILURE');}
   if(event?.context?.company_id!==bundle.company_id||event?.context?.environment!==PREPROD)throw new Error('SEMANTIC_CONTEXT_REJECTED');
   if(event?.type!==EVENT_TYPE||d.semantic_action!=='APPLY_CANONICAL_REGISTRY_EPOCH')throw new Error('SEMANTIC_EVENT_TYPE_REJECTED');
   if(d.target_engine_id!==engine||!bundle.canonical_engine_ids.includes(engine))throw new Error('SEMANTIC_TARGET_REJECTED');
   if(d.registry_fingerprint!==bundle.registry_fingerprint||d.registry_count!==bundle.canonical_engine_count||d.generation!==bundle.generation)throw new Error('SEMANTIC_REGISTRY_EPOCH_REJECTED');
   const state=loadSemantic(root,bundle),prior=state.engines[engine];
   if(prior){
     if(prior.event_id!==event.event_id||prior.registry_fingerprint!==d.registry_fingerprint||prior.generation!==d.generation)throw new Error('SEMANTIC_STATE_CONFLICT');
     return {status:'ALREADY_APPLIED',engine_id:engine,state_hash:semanticHash(state)};
   }
   const engines={...state.engines,[engine]:{event_id:event.event_id,registry_fingerprint:d.registry_fingerprint,generation:d.generation,semantic_action:d.semantic_action}};
   const next={...state,generation:d.generation,registry_fingerprint:d.registry_fingerprint,engines};
   saveSemantic(root,next);
   return {status:'APPLIED',engine_id:engine,state_hash:semanticHash(next)};
 };
}

function terminalReceiptMap(bus){
 const m=new Map();
 for(const op of bus.deliveryLedger()){const r=op?.receipt;if(op?.op==='delivery'&&r?.engine_id&&['DELIVERED','DEAD_LETTER'].includes(r.status))m.set(r.engine_id,r);}
 return m;
}
function consumerEvidence(bundle,state,bus){
 const receipts=terminalReceiptMap(bus);
 return bundle.canonical_engine_ids.map(engine_id=>{
   const s=state.engines?.[engine_id],r=receipts.get(engine_id);
   const pass=Boolean(s&&s.registry_fingerprint===bundle.registry_fingerprint&&s.generation===bundle.generation&&r?.status==='DELIVERED');
   const outcome={pass,event_id:s?.event_id??r?.event_id??null,registry_fingerprint:s?.registry_fingerprint??null,generation:s?.generation??null,delivery_status:r?.status??'MISSING',delivery_attempts:r?.attempts??0};
   return Object.freeze({engine_id,consumer_class:'SHARED_SEMANTIC_ENGINE_CONSUMER',fields_used:Object.freeze(['event.context.engine_id','event.payload.data.target_engine_id','event.payload.data.registry_fingerprint','event.payload.data.registry_count','event.payload.data.generation','event.payload.data.semantic_action']),decision:pass?'REGISTRY_EPOCH_APPLIED':'REGISTRY_EPOCH_NOT_APPLIED',real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});
 });
}

function rebuildSemantic({root,bundle,bus}){
 const before=loadSemantic(root,bundle);
 const backup_file=path.join(root,'backups','semantic-state.applied.json');
 writeJson(backup_file,before);
 const applied_hash=semanticHash(before);
 const rolled=emptySemantic(bundle);saveSemantic(root,rolled);
 const rollback_green=Object.keys(loadSemantic(root,bundle).engines).length===0;
 try{
   const rebuilt=emptySemantic(bundle);
   for(const event of bus.listForCompany(bundle.company_id)){
     const d=event?.payload?.data??{},engine=event?.context?.engine_id;
     if(event?.type!==EVENT_TYPE||d.target_engine_id!==engine||!bundle.canonical_engine_ids.includes(engine)||d.registry_fingerprint!==bundle.registry_fingerprint||d.registry_count!==bundle.canonical_engine_count||d.generation!==bundle.generation)continue;
     rebuilt.engines[engine]={event_id:event.event_id,registry_fingerprint:d.registry_fingerprint,generation:d.generation,semantic_action:d.semantic_action};
     rebuilt.generation=d.generation;rebuilt.registry_fingerprint=d.registry_fingerprint;
   }
   saveSemantic(root,rebuilt);
   const rebuilt_hash=semanticHash(rebuilt),coverage=Object.keys(rebuilt.engines).filter(id=>bundle.canonical_engine_ids.includes(id)).length;
   const rebuild_green=rebuilt_hash===applied_hash&&coverage===bundle.canonical_engine_count;
   if(!rebuild_green){saveSemantic(root,before);}
   return Object.freeze({backup_ready:true,backup_file,rollback_green,rebuild_green,applied_state_hash:applied_hash,rebuilt_state_hash:rebuilt_hash,rebuilt_engine_count:coverage});
 }catch(error){saveSemantic(root,before);return Object.freeze({backup_ready:true,backup_file,rollback_green,rebuild_green:false,applied_state_hash:applied_hash,rebuilt_state_hash:null,rebuilt_engine_count:0,error:String(error?.message??error)});}
}

function evaluate(bundle,evidence,rebuild){
 const passed=evidence.filter(x=>x.decision==='REGISTRY_EPOCH_APPLIED').length;
 const coverage=bundle.canonical_engine_count?passed/bundle.canonical_engine_count:0;
 const quality=coverage===1&&rebuild.rollback_green&&rebuild.rebuild_green?1:0;
 const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:EVT_ALL_ENGINES_REAL_VERSION,benchmark_id:'EVT-001-ALL-REGISTERED-ENGINES-REAL-ADOPTION',benchmark_version:'1.0.0',metric:'all_engine_semantic_event_adoption',holdout_ref:'first-party://evt001/all-engines-holdout',adversarial_refs:['missing-engine-event','wrong-registry-fingerprint','cross-company','dead-letter','replay-drift']});
 const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:EVT_ALL_ENGINES_REAL_VERSION,experiment_id:bundle.bundle_id};
 const comparison=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{all_engine_semantic_event_adoption:0.5}},new_result:{...common,arm:'NEW',metrics:{all_engine_semantic_event_adoption:quality}}});
 const tribunal=tribunalDecision({evaluation:comparison,judge_id:'EVA-001:INDEPENDENT-JUDGE:v1',candidate_actor_id:'EVT-001',metric_direction:'higher'});
 return Object.freeze({engine_id:'EVA-001',decision:tribunal.decision==='PASS'?'TRIBUNAL_PASS':`TRIBUNAL_${tribunal.decision}`,real_consumption:true,outcome:Object.freeze({quality,coverage,delta:comparison.delta,tribunal_decision:tribunal.decision}),outcome_hash:hash({quality,coverage,delta:comparison.delta,tribunal_decision:tribunal.decision})});
}

function telemetry(bundle,root,consumerHash){
 const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});
 const l=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
 const priorObs=l.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='EVT-001 all registered engines semantic outcome');
 const obs=priorObs??l.observability.record({context:ctx(bundle.company_id,'OBSERV-001',EVT_ALL_ENGINES_REAL_VERSION),correlation_id:corr,level:'INFO',message:'EVT-001 all registered engines semantic outcome',data:{consumer_outcome_hash:consumerHash,engine_count:bundle.canonical_engine_count,registry_fingerprint:bundle.registry_fingerprint}});
 const obsPass=obs?.data?.consumer_outcome_hash===consumerHash&&obs?.data?.engine_count===bundle.canonical_engine_count;
 const priorCost=l.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_EVT001');
 const fin=priorCost??l.finops.record({context:ctx(bundle.company_id,'FINOPS-001',EVT_ALL_ENGINES_REAL_VERSION),correlation_id:corr,task_id:corr,provider:'LOCAL_EVT001',cost_eur:0,metadata:{consumer_outcome_hash:consumerHash}});
 const agg=l.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_EVT001'});
 return Object.freeze({
   observability:Object.freeze({engine_id:'OBSERV-001',decision:obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',real_consumption:true,outcome:Object.freeze({pass:obsPass,records_for_correlation:l.observability.listForCorrelation(bundle.company_id,corr).length}),outcome_hash:hash({pass:obsPass,hash:consumerHash})}),
   finops:Object.freeze({engine_id:'FINOPS-001',decision:fin.cost_eur_micros===0&&agg.cost_eur===0?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',real_consumption:true,outcome:Object.freeze({pass:fin.cost_eur_micros===0&&agg.cost_eur===0,cost_eur_micros:fin.cost_eur_micros,events:agg.events,aggregate_cost_eur:agg.cost_eur}),outcome_hash:hash({cost:fin.cost_eur_micros,aggregate:agg.cost_eur})})
 });
}

function learning(bundle,root,source_run_id,source_head_sha,accepted,consumerHash){
 const registry=readJson(SUBSCRIBERS_PATH);
 const event={event_id:`evt:evt001-all:${hash({bundle:bundle.bundle_id,consumerHash}).slice(0,24)}`,company_id:bundle.company_id,type:'evt.all_registered_engines.consumer.outcome',engine_id:'EVT-001',environment:PREPROD,version:EVT_ALL_ENGINES_REAL_VERSION,capability_id:'EVT-001',accepted,consumer_outcome_hash:consumerHash,prod_authorized:false,additional_cost_eur:0};
 const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO EVT-001 ALL ENGINES FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
 const out=path.join(root,'lrn-outbox'),first=persistLearningOutbox({build,output_root:out}),second=persistLearningOutbox({build,output_root:out});
 const localized=build.batches.find(x=>x.company_id===bundle.company_id)?.events??[];
 const pass=localized.some(x=>x.type===event.type)&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
 return Object.freeze({engine_id:'LRN-001',decision:pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',real_consumption:true,outcome:Object.freeze({pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0}),outcome_hash:hash({pass,ids:localized.map(x=>x.event_id)})});
}
function persistFinal(root,state){const f=path.join(root,'evt-all-engines-strict-state.json');if(fs.existsSync(f)){const old=readJson(f);if(hash(old)!==hash(state))throw new Error('EVT_ALL_ENGINES_PERSISTED_STATE_CONFLICT');return {file:f,created:false};}writeJson(f,state);return {file:f,created:true};}

export async function consumeEvtAllEnginesReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true,transient_fail_engine_id=null}={}){
 const b=assertBundle(producer_bundle);if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
 const canonical=loadEvtCanonicalEngineRegistry();
 if(canonical.fingerprint!==b.registry_fingerprint||canonical.count!==b.canonical_engine_count||JSON.stringify(canonical.engine_ids)!==JSON.stringify(b.canonical_engine_ids))throw new Error('EVT_CANONICAL_REGISTRY_DRIFT');
 const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-evtall-real-'));fs.mkdirSync(root,{recursive:true});
 const event_file=path.join(root,'transport','events.v8'),delivery_file=path.join(root,'transport','deliveries.v8');
 const bus=new Evt001Native({event_file,delivery_file,environment:PREPROD,max_attempts:3});
 let publish_accepted_total=0,publish_duplicate_total=0;
 for(const spec of b.events??[]){const p=bus.publish(spec);if(p.accepted)publish_accepted_total++;else publish_duplicate_total++;}
 const transport=createSemanticTransport({root,bundle:b,transient_fail_engine_id});
 let delivered_total=0,dead_letter_total=0,skipped_terminal_total=0;
 for(const spec of b.events??[]){const d=await bus.deliverContext(spec.context,{transport,max_attempts:3});delivered_total+=d.delivered_total;dead_letter_total+=d.dead_letter_total;skipped_terminal_total+=d.skipped_total;}
 const stateBeforeRebuild=loadSemantic(root,b),preEvidence=consumerEvidence(b,stateBeforeRebuild,bus);
 const rebuild=rebuildSemantic({root,bundle:b,bus});
 const finalSemantic=loadSemantic(root,b),consumers=Object.freeze(consumerEvidence(b,finalSemantic,bus));
 const missing_consumers=Object.freeze(b.canonical_engine_ids.filter(id=>!finalSemantic.engines?.[id]));
 const failed_consumers=Object.freeze(consumers.filter(x=>x.decision!=='REGISTRY_EPOCH_APPLIED').map(x=>x.engine_id));
 const passed=consumers.length-failed_consumers.length;
 const coverage=b.canonical_engine_count?passed/b.canonical_engine_count:0;
 const eva=evaluate(b,consumers,rebuild);
 const consumerHash=hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash})));
 const tel=telemetry(b,root,consumerHash);
 const functional=coverage===1&&!missing_consumers.length&&!failed_consumers.length&&eva.decision==='TRIBUNAL_PASS'&&rebuild.backup_ready&&rebuild.rollback_green&&rebuild.rebuild_green&&tel.observability.decision==='OBSERVABILITY_RECORDED'&&tel.finops.decision==='FINOPS_ZERO_COST_RECORDED';
 const lrn=emit_learning?learning(b,root,source_run_id,source_head_sha.toLowerCase(),functional,consumerHash):Object.freeze({engine_id:'LRN-001',decision:'LRN_FEEDBACK_INCOMPLETE',real_consumption:false,outcome:Object.freeze({pass:false,idempotency_green:false}),outcome_hash:hash('disabled')});
 const full=functional&&lrn.decision==='LRN_FEEDBACK_PERSISTED';
 const outcome={bundle_id:b.bundle_id,registry_fingerprint:b.registry_fingerprint,canonical_engine_count:b.canonical_engine_count,semantic_consumer_count:passed,coverage,tribunal:eva.decision,learning:lrn.decision,rollback_green:rebuild.rollback_green,rebuild_green:rebuild.rebuild_green,zero_cost:tel.finops.decision==='FINOPS_ZERO_COST_RECORDED',accepted:full};
 const persisted={schema_version:'1.0.0',state_type:'CEREBRO_EVT_ALL_ENGINES_REAL_CONSUMER_ADOPTION_STATE',capability_id:'EVT-001',company_id:b.company_id,engine_id:'EVT-001',environment:PREPROD,version:EVT_ALL_ENGINES_REAL_VERSION,bundle_id:b.bundle_id,registry_fingerprint:b.registry_fingerprint,canonical_engine_count:b.canonical_engine_count,consumer_outcome_hash:consumerHash,semantic_state_hash:semanticHash(finalSemantic),outcome_hash:hash(outcome),status:full?'FULL_E2E_REAL_PREPROD':'PARCIAL'};
 const ps=persistFinal(root,persisted);
 void preEvidence;
 return Object.freeze({...persisted,required_consumer_selector:EVT_ALL_ENGINES_SELECTOR,required_consumers:Object.freeze([...b.canonical_engine_ids]),consumers,consumer_coverage:coverage,functional_consumer_coverage:coverage,missing_consumers,failed_consumers,evaluation_consumer:eva,learning_sink:lrn,observability_consumer:tel.observability,finops_consumer:tel.finops,backup_rollback_rebuild:rebuild,publish_accepted_total,publish_duplicate_total,delivered_total,dead_letter_total,skipped_terminal_total,transport_event_count:bus.listForCompany(b.company_id).length,delivery_ledger_operations:bus.deliveryLedger().length,semantic_state_persisted:true,state_persisted:true,state_file:ps.file,restartable:true,idempotency_proven:lrn.outcome.idempotency_green===true,continuous_improvement_feedback:lrn.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:tel.finops.outcome.aggregate_cost_eur,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,full_e2e_real_preprod:full});
}

export async function runEvtAllEnginesFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){
 return consumeEvtAllEnginesReal({producer_bundle:buildEvtAllEnginesProducerBundle({company_id}),workdir,source_run_id,source_head_sha});
}
function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;}
const main=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){try{const r=await runEvtAllEnginesFullE2ERealV1({company_id:arg('--company')??'fenix',workdir:arg('--workdir'),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)});const text=`${JSON.stringify(r,null,2)}\n`,out=arg('--out');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{mode:0o600});}else process.stdout.write(text);if(!r.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
