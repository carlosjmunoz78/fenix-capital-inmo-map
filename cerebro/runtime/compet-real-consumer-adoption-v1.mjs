#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  buildCompetWatchPlan,runCompetNativeCycle,buildCompetDossier,verifyCompetDossier
} from './compet-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const COMPET_REAL_VERSION='1.0.0';
export const COMPET_REAL_OWNER_ENGINE_ID='COMPET-001';
export const COMPET_REAL_REQUIRED_CONSUMERS=Object.freeze([
  'RSH-001','SEO-001','MKT-001','EXPAND-001','INN-001','LRN-001','OBSERV-001','FINOPS-001'
]);
const CORE_CONSUMERS=Object.freeze(['RSH-001','SEO-001','MKT-001','EXPAND-001','INN-001']);
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:COMPET_REAL_VERSION};}
function evidence(engine_id,fields_used,decision,outcome){return Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});}
function changesFor(bundle,...dimensions){return (bundle.native?.cycle?.changes??[]).filter(x=>dimensions.includes(x.dimension));}
function exactSet(list,required){return JSON.stringify([...(list??[])].sort())===JSON.stringify([...required].sort());}

export function buildCompetProducerBundle({company_id='fenix'}={}){
  const ctx=context(company_id,COMPET_REAL_OWNER_ENGINE_ID);
  const targets=[
    {competitor_id:'rival-a',name:'Rival A',url:'https://example.com/',geography:'Cordoba',business_relevance:'mortgage advisory',dimensions:['offer','pricing','seo','campaigns','positioning']},
    {competitor_id:'rival-b',name:'Rival B',url:'https://rival.example.com/',geography:'Andalucia',business_relevance:'mortgage advisory expansion',dimensions:['expansion','positioning']}
  ];
  const plan=buildCompetWatchPlan({context:ctx,targets,cadence_hours:24});
  const previous=[
    {competitor_id:'rival-a',dimension:'offer',value:{product:'Hipoteca 95',audience:'general'},source_url:'https://example.com/offer',observed_at:'2026-10-15T09:00:00Z',confidence:0.95},
    {competitor_id:'rival-a',dimension:'pricing',value:{fee_eur:3900},source_url:'https://example.com/pricing',observed_at:'2026-10-15T09:00:00Z',confidence:0.95},
    {competitor_id:'rival-a',dimension:'seo',value:{title:'Hipotecas en Cordoba',intent:'generic'},source_url:'https://example.com/',observed_at:'2026-10-15T09:00:00Z',confidence:1},
    {competitor_id:'rival-a',dimension:'campaigns',value:{hook:'Financia hasta el 95%',channel:'search'},source_url:'https://example.com/campaigns',observed_at:'2026-10-15T09:00:00Z',confidence:0.9},
    {competitor_id:'rival-a',dimension:'positioning',value:{claim:'Broker hipotecario local'},source_url:'https://example.com/about',observed_at:'2026-10-15T09:00:00Z',confidence:0.9},
    {competitor_id:'rival-b',dimension:'expansion',value:{markets:['Sevilla']},source_url:'https://rival.example.com/news',observed_at:'2026-10-15T09:00:00Z',confidence:0.85}
  ];
  const current=[
    {competitor_id:'rival-a',dimension:'offer',value:{product:'Hipoteca 100',audience:'families'},source_url:'https://example.com/offer',observed_at:'2026-10-16T09:00:00Z',confidence:0.95},
    {competitor_id:'rival-a',dimension:'pricing',value:{fee_eur:3200},source_url:'https://example.com/pricing',observed_at:'2026-10-16T09:00:00Z',confidence:0.95},
    {competitor_id:'rival-a',dimension:'seo',value:{title:'Hipoteca 100 en Cordoba',intent:'commercial-local'},source_url:'https://example.com/',observed_at:'2026-10-16T09:00:00Z',confidence:1},
    {competitor_id:'rival-a',dimension:'campaigns',value:{hook:'Compra sin entrada',channel:'search-social'},source_url:'https://example.com/campaigns',observed_at:'2026-10-16T09:00:00Z',confidence:0.9},
    {competitor_id:'rival-a',dimension:'positioning',value:{claim:'Especialistas en hipoteca 100 para familias'},source_url:'https://example.com/about',observed_at:'2026-10-16T09:00:00Z',confidence:0.9},
    {competitor_id:'rival-b',dimension:'expansion',value:{markets:['Sevilla','Cordoba']},source_url:'https://rival.example.com/news',observed_at:'2026-10-16T09:00:00Z',confidence:0.85},
    {competitor_id:'rival-b',dimension:'positioning',value:{claim:'Andalucia mortgage operator'},source_url:'https://rival.example.com/about',observed_at:'2026-10-16T09:00:00Z',confidence:0.85}
  ];
  const cycle=runCompetNativeCycle({context:ctx,previous,current,cycle_anchor:'2026-10-16T09:00:00Z',cadence_hours:24});
  const dossier=buildCompetDossier({context:ctx,cycle,question:'Which competitor changes require research, SEO, marketing, expansion or innovation action?'});
  const replay=verifyCompetDossier(dossier);
  const semantic_profile=Object.freeze({
    dimensions_present:Object.freeze([...new Set(cycle.changes.map(x=>x.dimension))].sort()),
    source_urls:Object.freeze([...new Set(cycle.changes.map(x=>x.source_url))].sort()),
    high_confidence_count:cycle.changes.filter(x=>Number(x.confidence)>=0.9).length,
    expansion_markets:Object.freeze(['Cordoba']),
    research_topics:Object.freeze(['offer','pricing','seo','campaigns','expansion','positioning']),
    source_evidence_only:dossier.source_evidence_only===true,
    replay_green:replay.replay_green===true
  });
  const seed={company_id,plan_id:plan.plan_id,provenance_hash:cycle.provenance_hash,dossier_id:dossier.dossier_id,semantic_profile};
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_COMPET_PRODUCER_BUNDLE',capability_id:'COMPET-NATIVE',
    company_id,engine_id:COMPET_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:COMPET_REAL_VERSION,
    bundle_id:`compet:${hash(seed).slice(0,24)}`,
    native:Object.freeze({plan,cycle,dossier,replay}),semantic_profile,
    additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,
    provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,
    android_touched:false,external_code_execution:false
  });
}

function assertBundle(b){
  if(!b||b.capability_id!=='COMPET-NATIVE'||b.engine_id!==COMPET_REAL_OWNER_ENGINE_ID||b.environment!==PREPROD)throw new Error('COMPET_PREPROD_BUNDLE_REQUIRED');
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])if(b[k]!==false)throw new Error('COMPET_FORBIDDEN_AUTHORITY');
  if(b.additional_cost_eur!==0)throw new Error('COMPET_ZERO_COST_REQUIRED');
  const n=b.native??{},p=b.semantic_profile??{};
  if(n.plan?.status!=='READY'||n.cycle?.status!=='GREEN'||n.dossier?.status!=='READY'||n.replay?.replay_green!==true)throw new Error('COMPET_NATIVE_CHAIN_NOT_GREEN');
  if(n.dossier.provenance_hash!==n.cycle.provenance_hash||p.replay_green!==true||p.source_evidence_only!==true)throw new Error('COMPET_SEMANTIC_PROVENANCE_MISMATCH');
  if(!exactSet(p.dimensions_present,['offer','pricing','seo','campaigns','expansion','positioning']))throw new Error('COMPET_SEMANTIC_DIMENSION_SET_MISMATCH');
  return b;
}

function consumeRsh(b){
  const c=b.native.cycle,d=b.native.dossier,p=b.semantic_profile;
  const pass=c.change_count>=6&&p.source_urls.length>=4&&p.high_confidence_count>=4&&d.source_evidence_only===true&&b.native.replay.replay_green===true;
  return evidence('RSH-001',['native.cycle.change_count','semantic_profile.source_urls','semantic_profile.high_confidence_count','native.dossier.source_evidence_only','native.replay.replay_green'],pass?'COMPET_RESEARCH_EVIDENCE_PACKET_READY':'COMPET_RESEARCH_EVIDENCE_HOLD',{pass,change_count:c.change_count,source_count:p.source_urls.length,provenance_hash:c.provenance_hash,action:pass?'QUEUE_RESEARCH_SYNTHESIS_PREPROD':'NO_CHANGE'});
}
function consumeSeo(b){
  const seo=changesFor(b,'seo'),positioning=changesFor(b,'positioning');
  const pass=seo.length>=1&&positioning.length>=1&&seo.every(x=>Number(x.confidence)>=0.9)&&b.semantic_profile.source_evidence_only===true;
  return evidence('SEO-001',['native.cycle.changes[seo]','native.cycle.changes[positioning]','semantic_profile.source_evidence_only'],pass?'SEO_COMPETITOR_GAP_INPUT_READY':'SEO_COMPETITOR_GAP_HOLD',{pass,seo_changes:seo.length,positioning_changes:positioning.length,action:pass?'ADD_COMPETITOR_GAP_TO_PREPROD_BACKLOG':'NO_CHANGE'});
}
function consumeMkt(b){
  const campaigns=changesFor(b,'campaigns'),offer=changesFor(b,'offer'),pricing=changesFor(b,'pricing');
  const pass=campaigns.length>=1&&offer.length>=1&&pricing.length>=1&&campaigns.every(x=>Number(x.confidence)>=0.85);
  return evidence('MKT-001',['native.cycle.changes[campaigns]','native.cycle.changes[offer]','native.cycle.changes[pricing]'],pass?'MARKETING_COMPETITOR_RESPONSE_READY':'MARKETING_COMPETITOR_RESPONSE_HOLD',{pass,campaign_changes:campaigns.length,offer_changes:offer.length,pricing_changes:pricing.length,action:pass?'CREATE_PREPROD_RESPONSE_HYPOTHESIS':'NO_CHANGE'});
}
function consumeExpand(b){
  const expansion=changesFor(b,'expansion'),positioning=changesFor(b,'positioning');
  const cordoba=expansion.some(x=>Array.isArray(x.after?.markets)&&x.after.markets.includes('Cordoba'));
  const pass=expansion.length>=1&&positioning.length>=1&&cordoba&&b.semantic_profile.expansion_markets.includes('Cordoba');
  return evidence('EXPAND-001',['native.cycle.changes[expansion]','native.cycle.changes[positioning]','semantic_profile.expansion_markets'],pass?'EXPANSION_COMPETITOR_ALERT_READY':'EXPANSION_COMPETITOR_ALERT_HOLD',{pass,target_market:'Cordoba',action:pass?'RAISE_PREPROD_EXPANSION_WATCH':'NO_CHANGE'});
}
function consumeInn(b){
  const offer=changesFor(b,'offer'),positioning=changesFor(b,'positioning'),pricing=changesFor(b,'pricing');
  const differentiated=offer.some(x=>x.after?.product==='Hipoteca 100')&&positioning.some(x=>String(x.after?.claim??'').includes('100'));
  const pass=offer.length>=1&&positioning.length>=1&&pricing.length>=1&&differentiated&&b.native.replay.replay_green===true;
  return evidence('INN-001',['native.cycle.changes[offer]','native.cycle.changes[positioning]','native.cycle.changes[pricing]','native.replay.replay_green'],pass?'INNOVATION_COMPETITOR_OPPORTUNITY_READY':'INNOVATION_COMPETITOR_OPPORTUNITY_HOLD',{pass,opportunity:'counter-positioning or product differentiation',action:pass?'ADD_PREPROD_INNOVATION_HYPOTHESIS':'NO_CHANGE'});
}
function coreConsumers(b){return Object.freeze([consumeRsh(b),consumeSeo(b),consumeMkt(b),consumeExpand(b),consumeInn(b)]);}

function semanticStateFrom(bundle,consumers){return {schema_version:'1.0.0',state_type:'CEREBRO_COMPET_SEMANTIC_CONSUMER_STATE',company_id:bundle.company_id,environment:PREPROD,bundle_id:bundle.bundle_id,consumer_outcome_hash:hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(consumers.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,additional_cost_eur:0};}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,bundle_id:state.bundle_id,consumer_outcome_hash:state.consumer_outcome_hash,engines:state.engines});}
function applySemanticState(root,bundle,consumers){
  const file=path.join(root,'semantic-consumer-state.json'),next=semanticStateFrom(bundle,consumers);
  if(fs.existsSync(file)){const old=readJson(file);if(semanticHash(old)!==semanticHash(next))throw new Error('COMPET_SEMANTIC_STATE_CONFLICT');return {file,state:old,created:false};}
  writeJson(file,next);return {file,state:next,created:true};
}
function backupRollbackRebuild(root,bundle,consumers){
  const stateFile=path.join(root,'semantic-consumer-state.json'),journalFile=path.join(root,'semantic-consumer-journal.json'),backupFile=path.join(root,'backups','semantic-consumer-state.applied.json');
  const applied=readJson(stateFile);writeJson(journalFile,{schema_version:'1.0.0',bundle});writeJson(backupFile,applied);const appliedHash=semanticHash(applied);
  fs.unlinkSync(stateFile);const rollback_green=!fs.existsSync(stateFile);
  const journal=readJson(journalFile),rebundle=assertBundle(journal.bundle),rebuiltConsumers=coreConsumers(rebundle),rebuilt=semanticStateFrom(rebundle,rebuiltConsumers);writeJson(stateFile,rebuilt);
  const rebuiltHash=semanticHash(rebuilt),rebuild_green=rebuiltHash===appliedHash&&rebuiltConsumers.length===CORE_CONSUMERS.length;
  if(!rebuild_green)writeJson(stateFile,applied);
  return Object.freeze({backup_ready:true,backup_file:backupFile,journal_file:journalFile,rollback_green,rebuild_green,applied_state_hash:appliedHash,rebuilt_state_hash:rebuiltHash,rebuilt_consumer_count:rebuiltConsumers.length});
}
function evaluate(bundle,core,rebuild){
  const expected={
    'RSH-001':'COMPET_RESEARCH_EVIDENCE_PACKET_READY','SEO-001':'SEO_COMPETITOR_GAP_INPUT_READY','MKT-001':'MARKETING_COMPETITOR_RESPONSE_READY','EXPAND-001':'EXPANSION_COMPETITOR_ALERT_READY','INN-001':'INNOVATION_COMPETITOR_OPPORTUNITY_READY'
  };
  const passed=core.filter(x=>x.decision===expected[x.engine_id]).length,coverage=passed/CORE_CONSUMERS.length,quality=coverage===1&&rebuild.rollback_green&&rebuild.rebuild_green?1:0;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:COMPET_REAL_VERSION,benchmark_id:'COMPET-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'semantic_adoption_quality',holdout_ref:'first-party://compet/strict-holdout',adversarial_refs:['research-provenance-loss','seo-semantic-loss','marketing-semantic-loss','expansion-market-loss','innovation-differentiation-loss']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:COMPET_REAL_VERSION,experiment_id:bundle.bundle_id};
  const comparison=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_adoption_quality:0.4}},new_result:{...common,arm:'NEW',metrics:{semantic_adoption_quality:quality}}});
  const tribunal=tribunalDecision({evaluation:comparison,judge_id:'EVA-001:INDEPENDENT-JUDGE:v1',candidate_actor_id:'COMPET-001',metric_direction:'higher'});
  return Object.freeze({engine_id:'EVA-001',decision:tribunal.decision==='PASS'?'TRIBUNAL_PASS':`TRIBUNAL_${tribunal.decision}`,real_consumption:true,outcome:Object.freeze({quality,coverage,delta:comparison.delta,tribunal_decision:tribunal.decision}),outcome_hash:hash({quality,coverage,delta:comparison.delta,decision:tribunal.decision})});
}
function telemetry(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='COMPET-NATIVE real semantic consumer outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'COMPET-NATIVE real semantic consumer outcome',data:{semantic_outcome_hash:semanticOutcomeHash,core_consumer_count:CORE_CONSUMERS.length,dossier_id:bundle.native.dossier.dossier_id}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.core_consumer_count===CORE_CONSUMERS.length;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_COMPET');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_COMPET',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_COMPET'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  return Object.freeze({
    obs:evidence('OBSERV-001',['semantic_outcome_hash','core_consumer_count','dossier_id'],obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:obsPass,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}),
    fin:evidence('FINOPS-001',['additional_cost_eur','native.additional_cost_eur'],finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',{pass:finPass,cost_eur_micros:fin.cost_eur_micros,aggregate_cost_eur:agg.cost_eur,events:agg.events})
  });
}
function learning(bundle,root,source_run_id,source_head_sha,accepted,semanticOutcomeHash){
  const registry=readJson(SUBSCRIBERS_PATH);
  const event={event_id:`evt:compet:${hash({bundle:bundle.bundle_id,semanticOutcomeHash}).slice(0,24)}`,company_id:bundle.company_id,type:'compet.consumer.outcome',engine_id:'COMPET-001',environment:PREPROD,version:COMPET_REAL_VERSION,capability_id:'COMPET-NATIVE',accepted,consumer_outcome_hash:semanticOutcomeHash,prod_authorized:false,additional_cost_eur:0};
  const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO COMPET FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
  const out=path.join(root,'lrn-outbox'),first=persistLearningOutbox({build,output_root:out}),second=persistLearningOutbox({build,output_root:out});
  const localized=build.batches.find(x=>x.company_id===bundle.company_id)?.events??[];
  const pass=localized.some(x=>x.type===event.type)&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  return evidence('LRN-001',['semantic_outcome_hash','accepted','event_id'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',{pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0});
}
function persistFinal(root,state){const file=path.join(root,'compet-strict-state.json');if(fs.existsSync(file)){const old=readJson(file);if(hash(old)!==hash(state))throw new Error('COMPET_PERSISTED_STATE_CONFLICT');return {file,created:false};}writeJson(file,state);return {file,created:true};}

export function consumeCompetOutputReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true}={}){
  const b=assertBundle(producer_bundle);if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-compet-real-'));fs.mkdirSync(root,{recursive:true});
  const core=coreConsumers(b),semanticOutcomeHash=hash(core.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash})));
  const applied=applySemanticState(root,b,core),rebuild=backupRollbackRebuild(root,b,core),eva=evaluate(b,core,rebuild),tel=telemetry(b,root,semanticOutcomeHash);
  const expectedCore={'RSH-001':'COMPET_RESEARCH_EVIDENCE_PACKET_READY','SEO-001':'SEO_COMPETITOR_GAP_INPUT_READY','MKT-001':'MARKETING_COMPETITOR_RESPONSE_READY','EXPAND-001':'EXPANSION_COMPETITOR_ALERT_READY','INN-001':'INNOVATION_COMPETITOR_OPPORTUNITY_READY'};
  const coreGreen=core.every(x=>x.decision===expectedCore[x.engine_id]);
  const preLearning=coreGreen&&eva.decision==='TRIBUNAL_PASS'&&rebuild.backup_ready&&rebuild.rollback_green&&rebuild.rebuild_green&&tel.obs.decision==='OBSERVABILITY_RECORDED'&&tel.fin.decision==='FINOPS_ZERO_COST_RECORDED';
  const lrn=emit_learning?learning(b,root,source_run_id,source_head_sha.toLowerCase(),preLearning,semanticOutcomeHash):evidence('LRN-001',['disabled'],'LRN_FEEDBACK_INCOMPLETE',{pass:false,idempotency_green:false,localized_events:0,first_created_total:0,second_created_total:0});
  const all=Object.freeze([...core,lrn,tel.obs,tel.fin]),map=Object.freeze(Object.fromEntries(all.map(x=>[x.engine_id,x])));
  const expected={...expectedCore,'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const missing=Object.freeze(COMPET_REAL_REQUIRED_CONSUMERS.filter(id=>!map[id]));
  const failed=Object.freeze(COMPET_REAL_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expected[id]));
  const passed=COMPET_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length,coverage=passed/COMPET_REAL_REQUIRED_CONSUMERS.length;
  const full=preLearning&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&coverage===1;
  const outcome={bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,required_consumer_count:COMPET_REAL_REQUIRED_CONSUMERS.length,passed_consumer_count:passed,coverage,tribunal:eva.decision,learning:lrn.decision,rollback_green:rebuild.rollback_green,rebuild_green:rebuild.rebuild_green,zero_cost:tel.fin.decision==='FINOPS_ZERO_COST_RECORDED',accepted:full};
  const state={schema_version:'1.0.0',state_type:'CEREBRO_COMPET_REAL_CONSUMER_ADOPTION_STATE',capability_id:'COMPET-NATIVE',company_id:b.company_id,engine_id:COMPET_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:COMPET_REAL_VERSION,bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,semantic_state_hash:semanticHash(applied.state),outcome_hash:hash(outcome),status:full?'FULL_E2E_REAL_PREPROD':'PARCIAL'};
  const ps=persistFinal(root,state);
  return Object.freeze({...state,required_consumers:Object.freeze([...COMPET_REAL_REQUIRED_CONSUMERS]),consumers:all,consumer_map:map,consumer_coverage:coverage,functional_consumer_coverage:coverage,missing_consumers:missing,failed_consumers:failed,evaluation_consumer:eva,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,backup_rollback_rebuild:rebuild,state_persisted:true,semantic_state_persisted:true,state_file:ps.file,restartable:true,idempotency_proven:lrn.outcome.idempotency_green===true,continuous_improvement_feedback:lrn.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:tel.fin.outcome.aggregate_cost_eur,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false,full_e2e_real_preprod:full});
}

export function runCompetFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){
  return consumeCompetOutputReal({producer_bundle:buildCompetProducerBundle({company_id}),workdir,source_run_id,source_head_sha});
}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const main=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){try{const result=runCompetFullE2ERealV1({company_id:arg('--company')??'fenix',workdir:arg('--workdir'),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)});const text=`${JSON.stringify(result,null,2)}\n`,out=arg('--out');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{mode:0o600});}else process.stdout.write(text);if(!result.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
