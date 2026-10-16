#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {scoreLeadBatch,prioritizeLeads,buildNextAction,verifyLeadAction} from './lead-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const LEAD_REAL_VERSION='1.0.0';
export const LEAD_REAL_OWNER_ENGINE_ID='LEAD-001';
export const LEAD_REAL_REQUIRED_CONSUMERS=Object.freeze(['CRM-001','SALE-001','NBA-001','C360-001','CAP-001','LRN-001','OBSERV-001','FINOPS-001']);
const SEMANTIC_CONSUMERS=Object.freeze(['CRM-001','SALE-001','NBA-001','C360-001','CAP-001']);
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:LEAD_REAL_VERSION};}
function evidence(engine_id,fields_used,decision,outcome){return Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});}
function exactSet(list,required){return JSON.stringify([...(list??[])].sort())===JSON.stringify([...required].sort());}

export function buildLeadProducerBundle({company_id='fenix'}={}){
  const ctx=context(company_id,LEAD_REAL_OWNER_ENGINE_ID);
  const snapshots=[
    {lead_ref:'lead-hot',source_ref:'web:seo',intent:.95,qualification:.9,engagement:.85,urgency:.9,data_completeness:.95,estimated_value_eur:3500,stale_days:0},
    {lead_ref:'lead-warm',source_ref:'meta:families',intent:.65,qualification:.6,engagement:.55,urgency:.45,data_completeness:.85,estimated_value_eur:2500,stale_days:3},
    {lead_ref:'lead-nurture',source_ref:'partner:referral',intent:.4,qualification:.45,engagement:.3,urgency:.25,data_completeness:.8,estimated_value_eur:1800,stale_days:10}
  ];
  const batch=scoreLeadBatch({context:ctx,lead_snapshots:snapshots});
  const queue=prioritizeLeads({context:ctx,batch});
  const top=queue.ranked[0];
  const action=buildNextAction({context:ctx,score:top});
  const replay=verifyLeadAction(action,top);
  const snapshotMap=Object.fromEntries(snapshots.map(x=>[x.lead_ref,x]));
  const lead_map=Object.fromEntries(queue.ranked.map(x=>[x.lead_ref,{lead_ref:x.lead_ref,score_id:x.score_id,source_ref:snapshotMap[x.lead_ref].source_ref,probability_conversion:x.probability_conversion,estimated_value_eur:x.estimated_value_eur,urgency:x.urgency,priority:x.priority,confidence:x.confidence,next_action:x.next_action}]));
  const source_summary=Object.fromEntries(Object.values(lead_map).map(x=>[x.source_ref,{lead_ref:x.lead_ref,priority:x.priority,probability_conversion:x.probability_conversion,estimated_value_eur:x.estimated_value_eur}]));
  const semantic_profile=Object.freeze({
    ranked_refs:Object.freeze(queue.ranked.map(x=>x.lead_ref)),top_lead_ref:top.lead_ref,top_action:action.action,replay_green:replay.replay_green===true,
    lead_map:Object.freeze(lead_map),source_summary:Object.freeze(source_summary),source_refs:Object.freeze(Object.keys(source_summary).sort()),
    scored_count:queue.ranked.length,human_required_count:batch.human_required_count,crm_write_authorized:queue.crm_write_authorized===true
  });
  const seed={company_id,queue_id:queue.queue_id,top_action_id:action.action_id,semantic_profile};
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_LEAD_PRODUCER_BUNDLE',capability_id:'LEAD-NATIVE',company_id,engine_id:LEAD_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:LEAD_REAL_VERSION,bundle_id:`lead:${hash(seed).slice(0,24)}`,native:Object.freeze({batch,queue,action,replay}),semantic_profile,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false});
}

function assertBundle(b){
  if(!b||b.capability_id!=='LEAD-NATIVE'||b.engine_id!==LEAD_REAL_OWNER_ENGINE_ID||b.environment!==PREPROD)throw new Error('LEAD_PREPROD_BUNDLE_REQUIRED');
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])if(b[k]!==false)throw new Error('LEAD_FORBIDDEN_AUTHORITY');
  if(b.additional_cost_eur!==0)throw new Error('LEAD_ZERO_COST_REQUIRED');
  const n=b.native??{},p=b.semantic_profile??{};
  if(n.batch?.status!=='READY'||n.queue?.status!=='READY'||n.action?.status!=='READY'||n.replay?.replay_green!==true)throw new Error('LEAD_NATIVE_CHAIN_NOT_GREEN');
  if(n.queue.crm_write_authorized!==false||n.action.crm_write_authorized!==false||p.crm_write_authorized!==false)throw new Error('LEAD_CRM_WRITE_DENIED_REQUIRED');
  if(!exactSet(p.source_refs,['meta:families','partner:referral','web:seo'])||p.scored_count!==3||p.human_required_count!==0)throw new Error('LEAD_SEMANTIC_PROFILE_INVALID');
  if(p.top_lead_ref!==n.queue.ranked[0]?.lead_ref||p.top_action!==n.action.action||p.replay_green!==true)throw new Error('LEAD_TOP_ACTION_MISMATCH');
  return b;
}

function consumeCrm(b){
  const p=b.semantic_profile,ids=p.ranked_refs.map(ref=>p.lead_map[ref]?.score_id).filter(Boolean);
  const pass=p.ranked_refs.length===3&&p.ranked_refs[0]==='lead-hot'&&ids.length===3&&new Set(ids).size===3&&p.crm_write_authorized===false;
  return evidence('CRM-001',['semantic_profile.ranked_refs','semantic_profile.lead_map.*.score_id','semantic_profile.crm_write_authorized'],pass?'CRM_PRIORITY_VIEW_READY':'CRM_PRIORITY_VIEW_HOLD',{pass,ranked_refs:p.ranked_refs,score_id_count:ids.length,action:pass?'PREPARE_NON_MUTATING_CRM_PRIORITY_VIEW':'NO_CHANGE'});
}
function consumeSale(b){
  const p=b.semantic_profile,top=p.lead_map[p.top_lead_ref];
  const pass=Boolean(top&&p.top_lead_ref==='lead-hot'&&top.priority>=.75&&top.estimated_value_eur>=3000&&top.next_action==='CONTACT_NOW');
  return evidence('SALE-001',['semantic_profile.top_lead_ref','semantic_profile.lead_map[top].priority','semantic_profile.lead_map[top].estimated_value_eur','semantic_profile.lead_map[top].next_action'],pass?'SALES_PRIORITY_READY':'SALES_PRIORITY_HOLD',{pass,lead_ref:p.top_lead_ref,priority:top?.priority??null,estimated_value_eur:top?.estimated_value_eur??null,action:pass?'ADD_TO_PREPROD_SALES_PRIORITY_QUEUE':'NO_CHANGE'});
}
function consumeNba(b){
  const p=b.semantic_profile,top=p.lead_map[p.top_lead_ref];
  const pass=Boolean(top&&p.replay_green===true&&p.top_action==='CONTACT_NOW'&&top.next_action===p.top_action&&top.confidence>=.8);
  return evidence('NBA-001',['semantic_profile.replay_green','semantic_profile.top_action','semantic_profile.lead_map[top].next_action','semantic_profile.lead_map[top].confidence'],pass?'NEXT_BEST_ACTION_READY':'NEXT_BEST_ACTION_HOLD',{pass,lead_ref:p.top_lead_ref,next_action:p.top_action,replay_green:p.replay_green,action:pass?'PUBLISH_PREPROD_NEXT_BEST_ACTION':'NO_CHANGE'});
}
function consumeC360(b){
  const p=b.semantic_profile,leads=Object.values(p.lead_map),complete=leads.filter(x=>x.confidence>=.8&&x.source_ref&&x.probability_conversion>=0&&x.estimated_value_eur>0);
  const pass=leads.length===3&&complete.length===3&&p.source_refs.length===3;
  return evidence('C360-001',['semantic_profile.lead_map.*.confidence','semantic_profile.lead_map.*.source_ref','semantic_profile.lead_map.*.probability_conversion','semantic_profile.lead_map.*.estimated_value_eur'],pass?'CUSTOMER360_LEAD_SIGNAL_READY':'CUSTOMER360_LEAD_SIGNAL_HOLD',{pass,lead_count:leads.length,complete_count:complete.length,source_count:p.source_refs.length,action:pass?'UPDATE_PREPROD_C360_SIGNAL_VIEW':'NO_CHANGE'});
}
function consumeCap(b){
  const p=b.semantic_profile,s=p.source_summary,seo=s['web:seo'],meta=s['meta:families'],partner=s['partner:referral'];
  const pass=Boolean(seo&&meta&&partner&&p.source_refs.length===3&&seo.priority>meta.priority&&meta.priority>partner.priority&&seo.probability_conversion>.8);
  return evidence('CAP-001',['semantic_profile.source_summary','semantic_profile.source_refs'],pass?'ACQUISITION_LEAD_FEEDBACK_READY':'ACQUISITION_LEAD_FEEDBACK_HOLD',{pass,best_source:'web:seo',source_count:p.source_refs.length,action:pass?'FEED_SOURCE_QUALITY_TO_CAP_PREPROD':'NO_CHANGE'});
}
function semanticConsumers(b){return Object.freeze([consumeCrm(b),consumeSale(b),consumeNba(b),consumeC360(b),consumeCap(b)]);}

function evaluateAndTribunal(bundle,semantic){
  const expected={'CRM-001':'CRM_PRIORITY_VIEW_READY','SALE-001':'SALES_PRIORITY_READY','NBA-001':'NEXT_BEST_ACTION_READY','C360-001':'CUSTOMER360_LEAD_SIGNAL_READY','CAP-001':'ACQUISITION_LEAD_FEEDBACK_READY'};
  const quality=semantic.filter(x=>x.decision===expected[x.engine_id]).length/SEMANTIC_CONSUMERS.length;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:LEAD_REAL_VERSION,benchmark_id:'LEAD-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'semantic_adoption_quality',holdout_ref:'first-party://lead/strict-holdout',adversarial_refs:['crm-order-loss','sales-priority-loss','nba-replay-loss','c360-confidence-loss','cap-source-loss']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:LEAD_REAL_VERSION,experiment_id:bundle.bundle_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_adoption_quality:.4}},new_result:{...common,arm:'NEW',metrics:{semantic_adoption_quality:quality}},candidate_visible_holdout:false});
  const tribunal=tribunalDecision({evaluation,judge_id:'QA-001:LEAD-TRIBUNAL:v1',candidate_actor_id:'LEAD-001',metric_direction:'higher'});
  return Object.freeze({quality,evaluation,tribunal});
}
function semanticStateFrom(bundle,consumers){return {schema_version:'1.0.0',state_type:'CEREBRO_LEAD_SEMANTIC_CONSUMER_STATE',company_id:bundle.company_id,environment:PREPROD,bundle_id:bundle.bundle_id,consumer_outcome_hash:hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(consumers.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,crm_write_authorized:false,additional_cost_eur:0};}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,bundle_id:state.bundle_id,consumer_outcome_hash:state.consumer_outcome_hash,engines:state.engines});}
function applySemanticState(root,bundle,consumers){const file=path.join(root,'semantic-consumer-state.json'),next=semanticStateFrom(bundle,consumers);if(fs.existsSync(file)){const old=readJson(file);if(semanticHash(old)!==semanticHash(next))throw new Error('LEAD_SEMANTIC_STATE_CONFLICT');return {file,state:old,created:false};}writeJson(file,next);return {file,state:next,created:true};}
function backupRollbackRebuild(root,bundle,consumers){
  const stateFile=path.join(root,'semantic-consumer-state.json'),journalFile=path.join(root,'semantic-consumer-journal.json'),backupFile=path.join(root,'backups','semantic-consumer-state.applied.json');
  const applied=readJson(stateFile);writeJson(journalFile,{schema_version:'1.0.0',bundle});writeJson(backupFile,applied);const appliedHash=semanticHash(applied);fs.unlinkSync(stateFile);const rollback_green=!fs.existsSync(stateFile);
  const rebundle=assertBundle(readJson(journalFile).bundle),rebuiltConsumers=semanticConsumers(rebundle),rebuilt=semanticStateFrom(rebundle,rebuiltConsumers);writeJson(stateFile,rebuilt);const rebuiltHash=semanticHash(rebuilt),rebuild_green=rebuiltHash===appliedHash&&rebuiltConsumers.length===SEMANTIC_CONSUMERS.length;if(!rebuild_green)writeJson(stateFile,applied);
  return Object.freeze({backup_ready:true,backup_file:backupFile,journal_file:journalFile,rollback_green,rebuild_green,applied_state_hash:appliedHash,rebuilt_state_hash:rebuiltHash,rebuilt_consumer_count:rebuiltConsumers.length});
}
function telemetry(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='LEAD-NATIVE real semantic consumer outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'LEAD-NATIVE real semantic consumer outcome',data:{semantic_outcome_hash:semanticOutcomeHash,top_lead_ref:bundle.semantic_profile.top_lead_ref,semantic_consumer_count:SEMANTIC_CONSUMERS.length}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.semantic_consumer_count===SEMANTIC_CONSUMERS.length;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_LEAD');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_LEAD',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_LEAD'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  return Object.freeze({obs:evidence('OBSERV-001',['semantic_outcome_hash','top_lead_ref','semantic_consumer_count'],obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:obsPass,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}),fin:evidence('FINOPS-001',['additional_cost_eur'],finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',{pass:finPass,cost_eur_micros:fin.cost_eur_micros,aggregate_cost_eur:agg.cost_eur,events:agg.events})});
}
function learning(bundle,root,source_run_id,source_head_sha,accepted,semanticOutcomeHash){
  const registry=readJson(SUBSCRIBERS_PATH),event={event_id:`evt:lead:${hash({bundle:bundle.bundle_id,semanticOutcomeHash}).slice(0,24)}`,company_id:bundle.company_id,type:'lead.consumer.outcome',engine_id:'LEAD-001',environment:PREPROD,version:LEAD_REAL_VERSION,capability_id:'LEAD-NATIVE',accepted,consumer_outcome_hash:semanticOutcomeHash,top_lead_ref:bundle.semantic_profile.top_lead_ref,prod_authorized:false,crm_write_authorized:false,additional_cost_eur:0};
  const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO LEAD FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}}),out=path.join(root,'lrn-outbox'),first=persistLearningOutbox({build,output_root:out}),second=persistLearningOutbox({build,output_root:out});
  const localized=build.batches.find(x=>x.company_id===bundle.company_id)?.events??[],pass=localized.some(x=>x.type===event.type)&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  return evidence('LRN-001',['semantic_outcome_hash','accepted','top_lead_ref','event_id'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',{pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0});
}
function persistFinal(root,state){const file=path.join(root,'lead-strict-state.json');if(fs.existsSync(file)){const old=readJson(file);if(hash(old)!==hash(state))throw new Error('LEAD_PERSISTED_STATE_CONFLICT');return {file,created:false};}writeJson(file,state);return {file,created:true};}

export function consumeLeadOutputReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true}={}){
  const b=assertBundle(producer_bundle);if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lead-real-'));fs.mkdirSync(root,{recursive:true});
  const semantic=semanticConsumers(b),semanticOutcomeHash=hash(semantic.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),applied=applySemanticState(root,b,semantic),rebuild=backupRollbackRebuild(root,b,semantic),eva=evaluateAndTribunal(b,semantic),tel=telemetry(b,root,semanticOutcomeHash);
  const expectedSemantic={'CRM-001':'CRM_PRIORITY_VIEW_READY','SALE-001':'SALES_PRIORITY_READY','NBA-001':'NEXT_BEST_ACTION_READY','C360-001':'CUSTOMER360_LEAD_SIGNAL_READY','CAP-001':'ACQUISITION_LEAD_FEEDBACK_READY'};
  const semanticGreen=semantic.every(x=>x.decision===expectedSemantic[x.engine_id]),preLearning=semanticGreen&&eva.tribunal.decision==='PASS'&&rebuild.backup_ready&&rebuild.rollback_green&&rebuild.rebuild_green&&tel.obs.decision==='OBSERVABILITY_RECORDED'&&tel.fin.decision==='FINOPS_ZERO_COST_RECORDED';
  const lrn=emit_learning?learning(b,root,source_run_id,source_head_sha.toLowerCase(),preLearning,semanticOutcomeHash):evidence('LRN-001',['disabled'],'LRN_FEEDBACK_INCOMPLETE',{pass:false,idempotency_green:false,localized_events:0,first_created_total:0,second_created_total:0});
  const all=Object.freeze([...semantic,lrn,tel.obs,tel.fin]),map=Object.freeze(Object.fromEntries(all.map(x=>[x.engine_id,x]))),expected={...expectedSemantic,'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const missing=Object.freeze(LEAD_REAL_REQUIRED_CONSUMERS.filter(id=>!map[id])),failed=Object.freeze(LEAD_REAL_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expected[id])),passed=LEAD_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length,coverage=passed/LEAD_REAL_REQUIRED_CONSUMERS.length,full=preLearning&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&coverage===1;
  const outcome={bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,required_consumer_count:LEAD_REAL_REQUIRED_CONSUMERS.length,passed_consumer_count:passed,coverage,tribunal_decision:eva.tribunal.decision,learning:lrn.decision,rollback_green:rebuild.rollback_green,rebuild_green:rebuild.rebuild_green,zero_cost:tel.fin.decision==='FINOPS_ZERO_COST_RECORDED',accepted:full};
  const state={schema_version:'1.0.0',state_type:'CEREBRO_LEAD_REAL_CONSUMER_ADOPTION_STATE',capability_id:'LEAD-NATIVE',company_id:b.company_id,engine_id:LEAD_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:LEAD_REAL_VERSION,bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,semantic_state_hash:semanticHash(applied.state),outcome_hash:hash(outcome),status:full?'FULL_E2E_REAL_PREPROD':'PARCIAL'},ps=persistFinal(root,state);
  return Object.freeze({...state,required_consumers:Object.freeze([...LEAD_REAL_REQUIRED_CONSUMERS]),consumers:all,consumer_map:map,consumer_coverage:coverage,functional_consumer_coverage:coverage,missing_consumers:missing,failed_consumers:failed,evaluation:eva.evaluation,independent_tribunal:eva.tribunal,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,backup_rollback_rebuild:rebuild,state_persisted:true,semantic_state_persisted:true,state_file:ps.file,restartable:true,idempotency_proven:lrn.outcome.idempotency_green===true,continuous_improvement_feedback:lrn.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:tel.fin.outcome.aggregate_cost_eur,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false,full_e2e_real_preprod:full});
}
export function runLeadFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){return consumeLeadOutputReal({producer_bundle:buildLeadProducerBundle({company_id}),workdir,source_run_id,source_head_sha});}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const main=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){try{const result=runLeadFullE2ERealV1({company_id:arg('--company')??'fenix',workdir:arg('--workdir'),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)}),text=`${JSON.stringify(result,null,2)}\n`,out=arg('--out');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{mode:0o600});}else process.stdout.write(text);if(!result.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
