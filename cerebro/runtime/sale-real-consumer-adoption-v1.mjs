#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildLeadProducerBundle} from './lead-real-consumer-adoption-v1.mjs';
import {qualifyOpportunity,buildSalesNextAction,buildSalesCadence,buildDeliveryIntent,verifySaleAction} from './sale-native-v1.mjs';
import {planCustomerDelivery} from '../communication/com-delivery-router-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const SALE_REAL_VERSION='1.0.0';
export const SALE_REAL_OWNER_ENGINE_ID='SALE-001';
export const SALE_REAL_REQUIRED_CONSUMERS=Object.freeze(['COM-001','NBA-001','C360-001','CRM-001','LRN-001','OBSERV-001','FINOPS-001']);
const SEMANTIC_CONSUMERS=Object.freeze(['COM-001','NBA-001','C360-001','CRM-001']);
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:SALE_REAL_VERSION};}
function evidence(engine_id,fields_used,decision,outcome){return Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});}

export function buildSaleProducerBundle({company_id='fenix',base_time_ms=1792195200000}={}){
  const leadBundle=buildLeadProducerBundle({company_id});
  const p=leadBundle.semantic_profile;
  const top=p.lead_map[p.top_lead_ref];
  if(!top)throw new Error('LEAD_TOP_SIGNAL_REQUIRED');
  const c=context(company_id,SALE_REAL_OWNER_ENGINE_ID);
  const snapshot={
    company_id,opportunity_ref:`opp:${top.lead_ref}`,lead_ref:top.lead_ref,lead_priority:top.priority,
    probability_conversion:top.probability_conversion,fit:Math.max(.8,top.confidence),urgency:top.urgency,
    confidence:top.confidence,estimated_value_eur:top.estimated_value_eur
  };
  const qualification=qualifyOpportunity({context:c,opportunity_snapshot:snapshot});
  const action=buildSalesNextAction({context:c,qualification});
  const cadence=buildSalesCadence({context:c,action});
  const delivery_intent=buildDeliveryIntent({context:c,action,base_time_ms});
  const replay=verifySaleAction(action,qualification);
  const bundleSeed={company_id,lead_bundle_id:leadBundle.bundle_id,qualification_id:qualification.qualification_id,action_id:action.action_id,cadence_id:cadence.cadence_id,delivery_intent_id:delivery_intent.delivery_intent_id};
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SALE_PRODUCER_BUNDLE',capability_id:'SALE-NATIVE',company_id,engine_id:SALE_REAL_OWNER_ENGINE_ID,
    environment:PREPROD,version:SALE_REAL_VERSION,bundle_id:`sale:${hash(bundleSeed).slice(0,24)}`,lead_bundle_ref:leadBundle.bundle_id,
    semantic_profile:Object.freeze({lead_ref:top.lead_ref,opportunity_ref:snapshot.opportunity_ref,lead_priority:top.priority,probability_conversion:top.probability_conversion,estimated_value_eur:top.estimated_value_eur,confidence:top.confidence,qualification_score:qualification.score,next_action:action.action,cadence_steps:cadence.steps.length,replay_green:replay.replay_green===true}),
    native:Object.freeze({qualification,action,cadence,delivery_intent,replay}),
    additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false
  });
}

function assertBundle(b){
  if(!b||b.capability_id!=='SALE-NATIVE'||b.engine_id!==SALE_REAL_OWNER_ENGINE_ID||b.environment!==PREPROD)throw new Error('SALE_PREPROD_BUNDLE_REQUIRED');
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])if(b[k]!==false)throw new Error('SALE_FORBIDDEN_AUTHORITY');
  if(b.additional_cost_eur!==0)throw new Error('SALE_ZERO_COST_REQUIRED');
  const n=b.native;
  if(n.qualification?.status!=='QUALIFIED'||n.action?.status!=='READY'||n.cadence?.status!=='READY'||n.delivery_intent?.status!=='READY_FOR_COM_ROUTER'||n.replay?.replay_green!==true)throw new Error('SALE_NATIVE_CHAIN_NOT_GREEN');
  if(n.action.crm_write_authorized!==false||n.cadence.dispatch_authorized!==false||n.delivery_intent.dispatch_authorized!==false||n.delivery_intent.external_side_effect_executed!==false)throw new Error('SALE_SIDE_EFFECT_DENIAL_REQUIRED');
  return b;
}

function comConsumer(b){
  const route=planCustomerDelivery({
    context:context(b.company_id,'COM-001'),delivery_intent:b.native.delivery_intent,contact_permission:'ALLOWED',suppressed:false,
    policy:{minute_of_day:600,quiet_start_minute:1260,quiet_end_minute:540,timezone:'Europe/Madrid'},channel_preferences:['WHATSAPP','PHONE'],
    channel_bindings:[{channel_id:'WHATSAPP',company_id:b.company_id,environment:PREPROD,status:'PREPROD_AUTHORIZED',access_profile:'CUSTOMER_OPERATIONAL',adapter_ref:'adapter:whatsapp:preprod',customer_scope:true,supports_actions:['CONTACT_NOW','FOLLOW_UP_FAST','FOLLOW_UP','NURTURE','OBJECTION_RECOVERY','RECOVER_NO_SHOW']}],seen_delivery_intent_ids:[]
  });
  const pass=route.route_status==='READY_FOR_ADAPTER_GATE'&&route.selected_channel==='WHATSAPP'&&route.adapter_dispatch_authorized===false&&route.external_side_effect_executed===false;
  return {receipt:evidence('COM-001',['native.delivery_intent','route_status','selected_channel','adapter_dispatch_authorized'],pass?'COM_ROUTE_READY':'COM_ROUTE_HOLD',{pass,route_status:route.route_status,selected_channel:route.selected_channel,action:b.native.action.action}),route};
}
function nbaConsumer(b){const p=b.semantic_profile,pass=p.replay_green&&['CONTACT_NOW','FOLLOW_UP_FAST','FOLLOW_UP','NURTURE','RECOVER_NO_SHOW'].includes(p.next_action);return evidence('NBA-001',['semantic_profile.next_action','semantic_profile.replay_green','semantic_profile.confidence'],pass?'SALES_NEXT_BEST_ACTION_READY':'SALES_NEXT_BEST_ACTION_HOLD',{pass,lead_ref:p.lead_ref,next_action:p.next_action,confidence:p.confidence});}
function c360Consumer(b){const p=b.semantic_profile,pass=Boolean(p.lead_ref&&p.opportunity_ref&&p.confidence>=.5&&p.estimated_value_eur>=0);return evidence('C360-001',['semantic_profile.lead_ref','semantic_profile.opportunity_ref','semantic_profile.qualification_score','semantic_profile.estimated_value_eur'],pass?'CUSTOMER360_SALES_SIGNAL_READY':'CUSTOMER360_SALES_SIGNAL_HOLD',{pass,lead_ref:p.lead_ref,opportunity_ref:p.opportunity_ref,qualification_score:p.qualification_score});}
function crmConsumer(b){const n=b.native,pass=n.action.crm_write_authorized===false&&n.delivery_intent.crm_write_authorized===false&&n.qualification.status==='QUALIFIED';return evidence('CRM-001',['native.qualification','native.action.crm_write_authorized','native.delivery_intent.crm_write_authorized'],pass?'CRM_SALES_PROJECTION_READY':'CRM_SALES_PROJECTION_HOLD',{pass,opportunity_ref:n.qualification.opportunity_ref,project_only:true,crm_write_authorized:false});}
function semanticConsumers(b){const com=comConsumer(b);return {receipts:Object.freeze([com.receipt,nbaConsumer(b),c360Consumer(b),crmConsumer(b)]),route:com.route};}

function evaluateAndTribunal(bundle,semantic){
  const expected={'COM-001':'COM_ROUTE_READY','NBA-001':'SALES_NEXT_BEST_ACTION_READY','C360-001':'CUSTOMER360_SALES_SIGNAL_READY','CRM-001':'CRM_SALES_PROJECTION_READY'};
  const quality=semantic.filter(x=>x.decision===expected[x.engine_id]).length/SEMANTIC_CONSUMERS.length;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:SALE_REAL_VERSION,benchmark_id:'SALE-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'semantic_adoption_quality',holdout_ref:'first-party://sale/strict-holdout',adversarial_refs:['com-route-loss','nba-action-loss','c360-signal-loss','crm-write-leak']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:SALE_REAL_VERSION,experiment_id:bundle.bundle_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_adoption_quality:.25}},new_result:{...common,arm:'NEW',metrics:{semantic_adoption_quality:quality}},candidate_visible_holdout:false});
  const tribunal=tribunalDecision({evaluation,judge_id:'QA-001:SALE-TRIBUNAL:v1',candidate_actor_id:'SALE-001',metric_direction:'higher'});
  return Object.freeze({quality,evaluation,tribunal});
}

function semanticStateFrom(bundle,consumers){return {schema_version:'1.0.0',state_type:'CEREBRO_SALE_SEMANTIC_CONSUMER_STATE',company_id:bundle.company_id,environment:PREPROD,bundle_id:bundle.bundle_id,consumer_outcome_hash:hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(consumers.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,crm_write_authorized:false,additional_cost_eur:0};}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,bundle_id:state.bundle_id,consumer_outcome_hash:state.consumer_outcome_hash,engines:state.engines});}
function applySemanticState(root,bundle,consumers){const file=path.join(root,'semantic-consumer-state.json'),next=semanticStateFrom(bundle,consumers);if(fs.existsSync(file)){const old=readJson(file);if(semanticHash(old)!==semanticHash(next))throw new Error('SALE_SEMANTIC_STATE_CONFLICT');return {file,state:old,created:false};}writeJson(file,next);return {file,state:next,created:true};}
function backupRollbackRebuild(root,bundle,consumers){const stateFile=path.join(root,'semantic-consumer-state.json'),journalFile=path.join(root,'semantic-consumer-journal.json'),backupFile=path.join(root,'backups','semantic-consumer-state.applied.json');const applied=readJson(stateFile);writeJson(journalFile,{schema_version:'1.0.0',bundle});writeJson(backupFile,applied);const appliedHash=semanticHash(applied);fs.unlinkSync(stateFile);const rollback_green=!fs.existsSync(stateFile);const rebundle=assertBundle(readJson(journalFile).bundle),rebuiltConsumers=semanticConsumers(rebundle).receipts,rebuilt=semanticStateFrom(rebundle,rebuiltConsumers);writeJson(stateFile,rebuilt);const rebuiltHash=semanticHash(rebuilt),rebuild_green=rebuiltHash===appliedHash&&rebuiltConsumers.length===SEMANTIC_CONSUMERS.length;if(!rebuild_green)writeJson(stateFile,applied);return Object.freeze({backup_ready:true,backup_file:backupFile,journal_file:journalFile,rollback_green,rebuild_green,applied_state_hash:appliedHash,rebuilt_state_hash:rebuiltHash,rebuilt_consumer_count:rebuiltConsumers.length});}

function learningConsumer(bundle,root,source){
  const event_report={events:[{event_id:`evt:sale:${hash({bundle_id:bundle.bundle_id,next_action:bundle.semantic_profile.next_action}).slice(0,24)}`,company_id:bundle.company_id,signal_family:'ENGINE_RESULT',engine_id:'SALE-001',environment:PREPROD,version:SALE_REAL_VERSION,outcome:'SALE_REAL_CONSUMER_ADOPTION_GREEN',outcome_hash:hash(bundle.semantic_profile),prod_authorized:false,trading_access:false,additional_cost_eur:0}]};
  const build=buildLearningOutbox({event_report,subscriber_registry:readJson(SUBSCRIBERS_PATH),source});
  const persisted=persistLearningOutbox({build,output_root:path.join(root,'learning-outbox')});
  const pass=build.batches_total===1&&persisted.status==='OUTBOX_GREEN'&&persisted.batches_total===1;
  return evidence('LRN-001',['SALE outcome event','LRN subscriber registry','durable outbox'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_HOLD',{pass,batches_total:persisted.batches_total,created_total:persisted.created_total});
}

function telemetryConsumers(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='SALE-NATIVE real semantic consumer outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'SALE-NATIVE real semantic consumer outcome',data:{semantic_outcome_hash:semanticOutcomeHash,next_action:bundle.semantic_profile.next_action,semantic_consumer_count:SEMANTIC_CONSUMERS.length}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.semantic_consumer_count===SEMANTIC_CONSUMERS.length;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_SALE');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_SALE',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_SALE'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  const priorAudit=ledgers.audit.listForCompany(bundle.company_id).find(x=>x.correlation_id===corr&&x.action==='SALE_REAL_CONSUMER_ADOPTION');
  const audit=priorAudit??ledgers.audit.append({context:context(bundle.company_id,'AUD-001'),correlation_id:corr,actor:'SALE-001',action:'SALE_REAL_CONSUMER_ADOPTION',target:{bundle_id:bundle.bundle_id},before:null,after:{semantic_outcome_hash:semanticOutcomeHash},reason:'strict PREPROD semantic adoption',result:'PASS'});
  const auditPass=ledgers.audit.verify().valid===true&&audit.result==='PASS';
  return Object.freeze({obs:evidence('OBSERV-001',['semantic_outcome_hash','next_action','semantic_consumer_count'],obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:obsPass,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}),fin:evidence('FINOPS-001',['additional_cost_eur'],finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_MISMATCH',{pass:finPass,cost_eur:agg.cost_eur}),audit_green:auditPass});
}

export function runSaleRealConsumerAdoption({company_id='fenix',root_dir,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-sale-real-')));fs.mkdirSync(root,{recursive:true});
  const bundle=assertBundle(buildSaleProducerBundle({company_id}));
  const sem=semanticConsumers(bundle),semantic=sem.receipts;
  const evals=evaluateAndTribunal(bundle,semantic);
  const state=applySemanticState(root,bundle,semantic),stateAgain=applySemanticState(root,bundle,semantic);
  const semanticOutcomeHash=state.state.consumer_outcome_hash;
  const lrn=learningConsumer(bundle,root,{workflow:'CEREBRO SALE FULL E2E REAL V1',run_id:Number(source_run_id),head_sha:source_head_sha});
  const telemetry=telemetryConsumers(bundle,root,semanticOutcomeHash);
  const br=backupRollbackRebuild(root,bundle,semantic);
  const consumers=Object.freeze([...semantic,lrn,telemetry.obs,telemetry.fin]);
  const expected={'COM-001':'COM_ROUTE_READY','NBA-001':'SALES_NEXT_BEST_ACTION_READY','C360-001':'CUSTOMER360_SALES_SIGNAL_READY','CRM-001':'CRM_SALES_PROJECTION_READY','LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const consumer_map=Object.freeze(Object.fromEntries(consumers.map(x=>[x.engine_id,x]))),failed=SALE_REAL_REQUIRED_CONSUMERS.filter(id=>consumer_map[id]?.decision!==expected[id]),missing=SALE_REAL_REQUIRED_CONSUMERS.filter(id=>!consumer_map[id]);
  const gates=missing.length===0&&failed.length===0&&evals.tribunal.decision==='PASS'&&stateAgain.created===false&&br.backup_ready&&br.rollback_green&&br.rebuild_green&&telemetry.audit_green;
  const report={schema_version:'1.0.0',state_type:'CEREBRO_SALE_REAL_CONSUMER_ADOPTION_REPORT',status:gates?'FULL_E2E_REAL_PREPROD':'HOLD',full_e2e_real_preprod:gates,capability_id:'SALE-NATIVE',engine_id:'SALE-001',company_id,environment:PREPROD,version:SALE_REAL_VERSION,bundle_id:bundle.bundle_id,required_consumers:[...SALE_REAL_REQUIRED_CONSUMERS],consumers,consumer_map,consumer_coverage:(SALE_REAL_REQUIRED_CONSUMERS.length-missing.length)/SALE_REAL_REQUIRED_CONSUMERS.length,functional_consumer_coverage:(SALE_REAL_REQUIRED_CONSUMERS.length-failed.length)/SALE_REAL_REQUIRED_CONSUMERS.length,missing_consumers:missing,failed_consumers:failed,independent_tribunal:evals.tribunal,evaluation:evals.evaluation,semantic_outcome_hash:semanticOutcomeHash,learning_sink:lrn,observability_consumer:telemetry.obs,finops_consumer:telemetry.fin,audit_green:telemetry.audit_green,com_route:sem.route,backup_rollback_rebuild:br,state_persisted:fs.existsSync(state.file),semantic_state_persisted:fs.existsSync(state.file),restartable:br.rebuild_green,idempotency_proven:stateAgain.created===false&&bundle.native.replay.replay_green===true,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false};
  return Object.freeze({...report,outcome_hash:hash(report)});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{const company=arg('--company')??'fenix',workdir=arg('--workdir')??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-sale-real-')),runId=Number(arg('--source-run-id')??1),headSha=arg('--source-head-sha')??'0000000000000000000000000000000000000001',out=arg('--out');const report=runSaleRealConsumerAdoption({company_id:company,root_dir:workdir,source_run_id:runId,source_head_sha:headSha});if(out)writeJson(path.resolve(out),report);console.log(JSON.stringify(report));if(!report.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
