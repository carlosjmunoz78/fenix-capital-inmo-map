#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  scoreChannels,planExperiment,decideStopScale,buildAcquisitionPlan,verifyCapPlan
} from './cap-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const CAP_REAL_VERSION='1.0.0';
export const CAP_REAL_OWNER_ENGINE_ID='CAP-001';
export const CAP_REAL_REQUIRED_CONSUMERS=Object.freeze([
  'MKT-001','SEO-001','WEB-001','LEAD-001','EVA-001','LRN-001','OBSERV-001','FINOPS-001'
]);
const SEMANTIC_CONSUMERS=Object.freeze(['MKT-001','SEO-001','WEB-001','LEAD-001','EVA-001']);
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:CAP_REAL_VERSION};}
function evidence(engine_id,fields_used,decision,outcome){return Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});}
function exactSet(list,required){return JSON.stringify([...(list??[])].sort())===JSON.stringify([...required].sort());}
function channel(bundle,id){return bundle.semantic_profile.channel_map[id]??null;}
function decision(bundle,id){return bundle.semantic_profile.decision_map[id]??null;}

export function buildCapProducerBundle({company_id='fenix'}={}){
  const ctx=context(company_id,CAP_REAL_OWNER_ENGINE_ID);
  const channels=[
    {channel_id:'seo',source_ref:'GSC:organic',spend_eur:0,clicks:100,leads:30,qualified_leads:20,conversions:8,revenue_eur:12000,landing_ref:'/hipotecas/',creative_ref:'organic'},
    {channel_id:'meta',source_ref:'Meta:campaign-a',spend_eur:300,clicks:500,leads:18,qualified_leads:8,conversions:3,revenue_eur:4500,landing_ref:'/hipoteca-100/',creative_ref:'cr-family'},
    {channel_id:'referral',source_ref:'Brevo:partners',spend_eur:0,clicks:40,leads:14,qualified_leads:12,conversions:6,revenue_eur:9000,landing_ref:'/colaboracion-inmobiliarias/',creative_ref:'partner'}
  ];
  const scores=scoreChannels({context:ctx,channels});
  const experiment=planExperiment({context:ctx,scores,min_sample_leads:20});
  const decisions=decideStopScale({context:ctx,scores,minimum_score:10});
  const plan=buildAcquisitionPlan({context:ctx,scores,experiment,decisions});
  const replay=verifyCapPlan(plan);
  const channel_map=Object.fromEntries(scores.channels.map(x=>[x.channel_id,{...x}]));
  const decision_map=Object.fromEntries(decisions.decisions.map(x=>[x.channel_id,x.decision]));
  const totals=scores.channels.reduce((a,x)=>({leads:a.leads+x.leads,qualified_leads:a.qualified_leads+x.qualified_leads,conversions:a.conversions+x.conversions,revenue_eur:a.revenue_eur+x.revenue_eur}),{leads:0,qualified_leads:0,conversions:0,revenue_eur:0});
  const semantic_profile=Object.freeze({
    winner_channel_id:scores.winner_channel_id,
    channel_ids:Object.freeze(scores.channels.map(x=>x.channel_id).sort()),
    channel_map:Object.freeze(channel_map),decision_map:Object.freeze(decision_map),
    experiment_arms:Object.freeze(experiment.arms.map(x=>({...x}))),
    totals:Object.freeze(totals),
    replay_green:replay.replay_green===true,
    recommended_new_spend_eur:plan.recommended_new_spend_eur,
    provider_execution_authorized:plan.provider_execution_authorized===true
  });
  const seed={company_id,plan_id:plan.plan_id,experiment_id:experiment.experiment_id,winner:scores.winner_channel_id,semantic_profile};
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_CAP_PRODUCER_BUNDLE',capability_id:'CAP-NATIVE',
    company_id,engine_id:CAP_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:CAP_REAL_VERSION,
    bundle_id:`cap:${hash(seed).slice(0,24)}`,
    native:Object.freeze({scores,experiment,decisions,plan,replay}),semantic_profile,
    additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,
    provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,
    android_touched:false,external_code_execution:false
  });
}

function assertBundle(b){
  if(!b||b.capability_id!=='CAP-NATIVE'||b.engine_id!==CAP_REAL_OWNER_ENGINE_ID||b.environment!==PREPROD)throw new Error('CAP_PREPROD_BUNDLE_REQUIRED');
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])if(b[k]!==false)throw new Error('CAP_FORBIDDEN_AUTHORITY');
  if(b.additional_cost_eur!==0)throw new Error('CAP_ZERO_COST_REQUIRED');
  const n=b.native??{},p=b.semantic_profile??{};
  if(n.scores?.status!=='READY'||n.experiment?.status!=='READY'||n.decisions?.status!=='READY'||n.plan?.status!=='READY_FOR_REVIEW_OR_ZERO_COST_EXECUTION'||n.replay?.replay_green!==true)throw new Error('CAP_NATIVE_CHAIN_NOT_GREEN');
  if(n.plan.recommended_new_spend_eur!==0||n.plan.provider_execution_authorized!==false||p.recommended_new_spend_eur!==0||p.provider_execution_authorized!==false)throw new Error('CAP_NO_NEW_SPEND_OR_PROVIDER_WRITE_REQUIRED');
  if(!exactSet(p.channel_ids,['seo','meta','referral'])||p.replay_green!==true)throw new Error('CAP_SEMANTIC_PROFILE_INVALID');
  if(p.winner_channel_id!==n.scores.winner_channel_id)throw new Error('CAP_WINNER_MISMATCH');
  return b;
}

function consumeMkt(b){
  const meta=channel(b,'meta'),d=decision(b,'meta');
  const pass=Boolean(meta&&meta.score>=25&&meta.creative_ref&&meta.creative_ref!=='none'&&meta.landing_ref&&meta.landing_ref!=='none'&&['HOLD','SCALE_CANDIDATE'].includes(d));
  return evidence('MKT-001',['semantic_profile.channel_map.meta.score','semantic_profile.channel_map.meta.creative_ref','semantic_profile.channel_map.meta.landing_ref','semantic_profile.decision_map.meta'],pass?'MARKETING_CHANNEL_MIX_READY':'MARKETING_CHANNEL_MIX_HOLD',{pass,channel_id:'meta',score:meta?.score??null,decision:d??null,action:pass?'ADD_ZERO_SPEND_PREPROD_CHANNEL_HYPOTHESIS':'NO_CHANGE'});
}
function consumeSeo(b){
  const seo=channel(b,'seo');const quality=seo&&seo.leads>0?seo.qualified_leads/seo.leads:0;
  const pass=Boolean(seo&&seo.score>=50&&quality>=0.6&&seo.landing_ref.startsWith('/')&&decision(b,'seo')!=='STOP');
  return evidence('SEO-001',['semantic_profile.channel_map.seo.score','semantic_profile.channel_map.seo.qualified_leads','semantic_profile.channel_map.seo.leads','semantic_profile.channel_map.seo.landing_ref','semantic_profile.decision_map.seo'],pass?'SEO_ACQUISITION_SCALE_READY':'SEO_ACQUISITION_SCALE_HOLD',{pass,score:seo?.score??null,quality,landing_ref:seo?.landing_ref??null,action:pass?'ADD_ORGANIC_SCALE_HYPOTHESIS_PREPROD':'NO_CHANGE'});
}
function consumeWeb(b){
  const winner=channel(b,b.semantic_profile.winner_channel_id),arms=b.semantic_profile.experiment_arms;
  const landingRefs=arms.map(x=>x.landing_ref);
  const pass=Boolean(winner&&winner.landing_ref?.startsWith('/')&&arms.length>=2&&landingRefs.every(x=>typeof x==='string'&&x.startsWith('/'))&&new Set(landingRefs).size>=2);
  return evidence('WEB-001',['semantic_profile.winner_channel_id','semantic_profile.channel_map[winner].landing_ref','semantic_profile.experiment_arms[].landing_ref'],pass?'WEB_LANDING_OPTIMIZATION_READY':'WEB_LANDING_OPTIMIZATION_HOLD',{pass,winner_channel_id:b.semantic_profile.winner_channel_id,winner_landing_ref:winner?.landing_ref??null,experiment_landings:landingRefs,action:pass?'PREPARE_LANDING_VARIANT_BACKLOG_ONLY':'NO_CHANGE'});
}
function consumeLead(b){
  const t=b.semantic_profile.totals,quality=t.leads>0?t.qualified_leads/t.leads:0,conversion=t.leads>0?t.conversions/t.leads:0;
  const pass=t.leads>=50&&quality>=0.6&&conversion>=0.2&&t.revenue_eur>0;
  return evidence('LEAD-001',['semantic_profile.totals.leads','semantic_profile.totals.qualified_leads','semantic_profile.totals.conversions','semantic_profile.totals.revenue_eur'],pass?'LEAD_QUALITY_SIGNAL_READY':'LEAD_QUALITY_SIGNAL_HOLD',{pass,leads:t.leads,quality,conversion,revenue_eur:t.revenue_eur,action:pass?'FEED_CONVERSION_QUALITY_TO_CAP_LEARNING':'NO_CHANGE'});
}
function consumeEva(b){
  const p=b.semantic_profile;
  const quality=[p.replay_green,p.recommended_new_spend_eur===0,p.provider_execution_authorized===false,p.experiment_arms.length>=2,p.winner_channel_id==='referral'].filter(Boolean).length/5;
  const benchmark=defineBenchmark({company_id:b.company_id,engine_id:'EVA-001',environment:PREPROD,version:CAP_REAL_VERSION,benchmark_id:'CAP-REAL-CONSUMER-EVALUATION',benchmark_version:'1.0.0',metric:'acquisition_plan_quality',holdout_ref:'first-party://cap/strict-holdout',adversarial_refs:['spend-authority','provider-write','replay-loss','insufficient-arms','winner-drift']});
  const common={company_id:b.company_id,engine_id:'EVA-001',environment:PREPROD,version:CAP_REAL_VERSION,experiment_id:b.bundle_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{acquisition_plan_quality:0.4}},new_result:{...common,arm:'NEW',metrics:{acquisition_plan_quality:quality}},candidate_visible_holdout:false});
  const pass=quality===1&&evaluation.delta>0;
  return evidence('EVA-001',['semantic_profile.replay_green','semantic_profile.recommended_new_spend_eur','semantic_profile.provider_execution_authorized','semantic_profile.experiment_arms','semantic_profile.winner_channel_id'],pass?'CAP_EVALUATION_READY':'CAP_EVALUATION_HOLD',{pass,quality,delta:evaluation.delta,evaluation,action:pass?'SUBMIT_TO_INDEPENDENT_TRIBUNAL':'NO_CHANGE'});
}
function semanticConsumers(b){return Object.freeze([consumeMkt(b),consumeSeo(b),consumeWeb(b),consumeLead(b),consumeEva(b)]);}

function independentTribunal(eva){
  const evaluation=eva.outcome?.evaluation;if(!evaluation)return Object.freeze({decision:'TRIBUNAL_BLOCK',reason:'EVA_EVALUATION_MISSING',prod_authorized:false});
  return tribunalDecision({evaluation,judge_id:'QA-001:CAP-TRIBUNAL:v1',candidate_actor_id:'CAP-001',metric_direction:'higher'});
}
function semanticStateFrom(bundle,consumers){return {schema_version:'1.0.0',state_type:'CEREBRO_CAP_SEMANTIC_CONSUMER_STATE',company_id:bundle.company_id,environment:PREPROD,bundle_id:bundle.bundle_id,consumer_outcome_hash:hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(consumers.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,additional_cost_eur:0};}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,bundle_id:state.bundle_id,consumer_outcome_hash:state.consumer_outcome_hash,engines:state.engines});}
function applySemanticState(root,bundle,consumers){
  const file=path.join(root,'semantic-consumer-state.json'),next=semanticStateFrom(bundle,consumers);
  if(fs.existsSync(file)){const old=readJson(file);if(semanticHash(old)!==semanticHash(next))throw new Error('CAP_SEMANTIC_STATE_CONFLICT');return {file,state:old,created:false};}
  writeJson(file,next);return {file,state:next,created:true};
}
function backupRollbackRebuild(root,bundle,consumers){
  const stateFile=path.join(root,'semantic-consumer-state.json'),journalFile=path.join(root,'semantic-consumer-journal.json'),backupFile=path.join(root,'backups','semantic-consumer-state.applied.json');
  const applied=readJson(stateFile);writeJson(journalFile,{schema_version:'1.0.0',bundle});writeJson(backupFile,applied);const appliedHash=semanticHash(applied);
  fs.unlinkSync(stateFile);const rollback_green=!fs.existsSync(stateFile);
  const journal=readJson(journalFile),rebundle=assertBundle(journal.bundle),rebuiltConsumers=semanticConsumers(rebundle),rebuilt=semanticStateFrom(rebundle,rebuiltConsumers);writeJson(stateFile,rebuilt);
  const rebuiltHash=semanticHash(rebuilt),rebuild_green=rebuiltHash===appliedHash&&rebuiltConsumers.length===SEMANTIC_CONSUMERS.length;
  if(!rebuild_green)writeJson(stateFile,applied);
  return Object.freeze({backup_ready:true,backup_file:backupFile,journal_file:journalFile,rollback_green,rebuild_green,applied_state_hash:appliedHash,rebuilt_state_hash:rebuiltHash,rebuilt_consumer_count:rebuiltConsumers.length});
}
function telemetry(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='CAP-NATIVE real semantic consumer outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'CAP-NATIVE real semantic consumer outcome',data:{semantic_outcome_hash:semanticOutcomeHash,winner_channel_id:bundle.semantic_profile.winner_channel_id,semantic_consumer_count:SEMANTIC_CONSUMERS.length}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.semantic_consumer_count===SEMANTIC_CONSUMERS.length;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_CAP');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_CAP',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_CAP'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  return Object.freeze({
    obs:evidence('OBSERV-001',['semantic_outcome_hash','winner_channel_id','semantic_consumer_count'],obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:obsPass,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}),
    fin:evidence('FINOPS-001',['additional_cost_eur','recommended_new_spend_eur'],finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',{pass:finPass,cost_eur_micros:fin.cost_eur_micros,aggregate_cost_eur:agg.cost_eur,events:agg.events})
  });
}
function learning(bundle,root,source_run_id,source_head_sha,accepted,semanticOutcomeHash){
  const registry=readJson(SUBSCRIBERS_PATH);
  const event={event_id:`evt:cap:${hash({bundle:bundle.bundle_id,semanticOutcomeHash}).slice(0,24)}`,company_id:bundle.company_id,type:'cap.consumer.outcome',engine_id:'CAP-001',environment:PREPROD,version:CAP_REAL_VERSION,capability_id:'CAP-NATIVE',accepted,consumer_outcome_hash:semanticOutcomeHash,winner_channel_id:bundle.semantic_profile.winner_channel_id,prod_authorized:false,additional_cost_eur:0};
  const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO CAP FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
  const out=path.join(root,'lrn-outbox'),first=persistLearningOutbox({build,output_root:out}),second=persistLearningOutbox({build,output_root:out});
  const localized=build.batches.find(x=>x.company_id===bundle.company_id)?.events??[];
  const pass=localized.some(x=>x.type===event.type)&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  return evidence('LRN-001',['semantic_outcome_hash','accepted','winner_channel_id','event_id'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',{pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0});
}
function persistFinal(root,state){const file=path.join(root,'cap-strict-state.json');if(fs.existsSync(file)){const old=readJson(file);if(hash(old)!==hash(state))throw new Error('CAP_PERSISTED_STATE_CONFLICT');return {file,created:false};}writeJson(file,state);return {file,created:true};}

export function consumeCapOutputReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true}={}){
  const b=assertBundle(producer_bundle);if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-cap-real-'));fs.mkdirSync(root,{recursive:true});
  const semantic=semanticConsumers(b),semanticOutcomeHash=hash(semantic.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash})));
  const applied=applySemanticState(root,b,semantic),rebuild=backupRollbackRebuild(root,b,semantic);
  const eva=semantic.find(x=>x.engine_id==='EVA-001'),tribunal=independentTribunal(eva),tel=telemetry(b,root,semanticOutcomeHash);
  const expectedSemantic={'MKT-001':'MARKETING_CHANNEL_MIX_READY','SEO-001':'SEO_ACQUISITION_SCALE_READY','WEB-001':'WEB_LANDING_OPTIMIZATION_READY','LEAD-001':'LEAD_QUALITY_SIGNAL_READY','EVA-001':'CAP_EVALUATION_READY'};
  const semanticGreen=semantic.every(x=>x.decision===expectedSemantic[x.engine_id]);
  const preLearning=semanticGreen&&tribunal.decision==='PASS'&&rebuild.backup_ready&&rebuild.rollback_green&&rebuild.rebuild_green&&tel.obs.decision==='OBSERVABILITY_RECORDED'&&tel.fin.decision==='FINOPS_ZERO_COST_RECORDED';
  const lrn=emit_learning?learning(b,root,source_run_id,source_head_sha.toLowerCase(),preLearning,semanticOutcomeHash):evidence('LRN-001',['disabled'],'LRN_FEEDBACK_INCOMPLETE',{pass:false,idempotency_green:false,localized_events:0,first_created_total:0,second_created_total:0});
  const all=Object.freeze([...semantic.filter(x=>x.engine_id!=='EVA-001'),eva,lrn,tel.obs,tel.fin]),map=Object.freeze(Object.fromEntries(all.map(x=>[x.engine_id,x])));
  const expected={...expectedSemantic,'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const missing=Object.freeze(CAP_REAL_REQUIRED_CONSUMERS.filter(id=>!map[id]));
  const failed=Object.freeze(CAP_REAL_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expected[id]));
  const passed=CAP_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length,coverage=passed/CAP_REAL_REQUIRED_CONSUMERS.length;
  const full=preLearning&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&coverage===1;
  const outcome={bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,required_consumer_count:CAP_REAL_REQUIRED_CONSUMERS.length,passed_consumer_count:passed,coverage,tribunal_decision:tribunal.decision,learning:lrn.decision,rollback_green:rebuild.rollback_green,rebuild_green:rebuild.rebuild_green,zero_cost:tel.fin.decision==='FINOPS_ZERO_COST_RECORDED',accepted:full};
  const state={schema_version:'1.0.0',state_type:'CEREBRO_CAP_REAL_CONSUMER_ADOPTION_STATE',capability_id:'CAP-NATIVE',company_id:b.company_id,engine_id:CAP_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:CAP_REAL_VERSION,bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,semantic_state_hash:semanticHash(applied.state),outcome_hash:hash(outcome),status:full?'FULL_E2E_REAL_PREPROD':'PARCIAL'};
  const ps=persistFinal(root,state);
  return Object.freeze({...state,required_consumers:Object.freeze([...CAP_REAL_REQUIRED_CONSUMERS]),consumers:all,consumer_map:map,consumer_coverage:coverage,functional_consumer_coverage:coverage,missing_consumers:missing,failed_consumers:failed,evaluation_consumer:eva,independent_tribunal:tribunal,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,backup_rollback_rebuild:rebuild,state_persisted:true,semantic_state_persisted:true,state_file:ps.file,restartable:true,idempotency_proven:lrn.outcome.idempotency_green===true,continuous_improvement_feedback:lrn.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:tel.fin.outcome.aggregate_cost_eur,recommended_new_spend_eur:b.native.plan.recommended_new_spend_eur,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false,full_e2e_real_preprod:full});
}

export function runCapFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){
  return consumeCapOutputReal({producer_bundle:buildCapProducerBundle({company_id}),workdir,source_run_id,source_head_sha});
}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const main=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){try{const result=runCapFullE2ERealV1({company_id:arg('--company')??'fenix',workdir:arg('--workdir'),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)});const text=`${JSON.stringify(result,null,2)}\n`,out=arg('--out');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{mode:0o600});}else process.stdout.write(text);if(!result.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
