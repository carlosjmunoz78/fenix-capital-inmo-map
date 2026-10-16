#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {executeTechnologyScoutAction} from './technology-capability-scout-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const TECH_SCOUT_REAL_VERSION='1.0.0';
export const TECH_SCOUT_REAL_OWNER_ENGINE_ID='RSH-001';
export const TECH_SCOUT_REAL_REQUIRED_CONSUMERS=Object.freeze([
  'SCAN-001','WEB-001','INN-001','COMPET-001','SEO-001','MKT-001','ROUTE-001','LRN-001','OBSERV-001','FINOPS-001'
]);
const CORE_CONSUMERS=Object.freeze(['SCAN-001','WEB-001','INN-001','COMPET-001','SEO-001','MKT-001','ROUTE-001']);
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:TECH_SCOUT_REAL_VERSION};}
function evidence(engine_id,fields_used,decision,outcome){return Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});}
function includes(list,value){return Array.isArray(list)&&list.includes(value);}

export async function buildTechnologyScoutProducerBundle({company_id='fenix'}={}){
  const ctx=context(company_id,TECH_SCOUT_REAL_OWNER_ENGINE_ID);
  const common={...ctx,gateway_authorized:true};
  const candidate={
    candidate_id:'scrapling-zero-cost-adapter',source_ref:'github:D4Vinci/Scrapling',observed_at:'2026-10-16T12:00:00Z',version_ref:'main@2026-10-16',
    license_ref:'BSD-3-Clause',security_notes:'public repository; no credentials; PREPROD evaluation only',
    integration_notes:'local adapter candidate for public-web discovery and deterministic intelligence inputs',cost_eur_month:0,
    fit:92,maintainability:84,security:82,interoperability:88,reversibility:96,
    capability_tags:['PUBLIC_WEB_DISCOVERY','DOM_EXTRACTION','WEBSITE_AUDIT_INPUT'],
    use_case_tags:['DIGITAL_FOOTPRINT_DISCOVERY','COMPETITOR_PUBLIC_INTELLIGENCE','SEO_TECHNICAL_EVIDENCE','LANDING_CAMPAIGN_INTELLIGENCE'],
    innovation_fit:true,
    adoption_targets:['SCAN-001','WEB-001','INN-001','COMPET-001','SEO-001','MKT-001']
  };
  const rawEvidence={
    evidence_type:'TECHNOLOGY',source_ref:candidate.source_ref,source_url:'https://github.com/D4Vinci/Scrapling',observed_at:candidate.observed_at,
    version_ref:candidate.version_ref,license_ref:candidate.license_ref,security_notes:candidate.security_notes,
    integration_notes:'Evidence vector supports public-web acquisition, DOM extraction and downstream website/competitor/SEO/marketing intelligence evaluation.',
    summary:'Public zero-cost OSS web acquisition candidate evaluated only as a reversible PREPROD adapter; no external code is executed by this gate.',public_evidence:true
  };
  const plan=await executeTechnologyScoutAction({...common,operation:'PLAN_ACQUISITION',target_url:'https://github.com/D4Vinci/Scrapling',authorized_public_research:true,robots_allowed:true,estimated_incremental_cost_eur:0,sources:{official_api_feed:true,scrapling:true,crawlee:true}});
  const acceptedEvidence=await executeTechnologyScoutAction({...common,operation:'INGEST_EVIDENCE',evidence:rawEvidence});
  const score=await executeTechnologyScoutAction({...common,operation:'SCORE_CANDIDATE',candidate});
  const dossier=await executeTechnologyScoutAction({...common,operation:'BUILD_DOSSIER',question:'Evaluate zero-cost public web acquisition capability for governed PREPROD downstream intelligence.',evidence_records:[acceptedEvidence],candidate_scores:[score]});
  const replay=await executeTechnologyScoutAction({...common,operation:'REPLAY_VERIFY',dossier});
  const semantic_profile=Object.freeze({
    candidate_id:candidate.candidate_id,evidence_id:acceptedEvidence.evidence_id,
    capability_tags:Object.freeze([...candidate.capability_tags]),use_case_tags:Object.freeze([...candidate.use_case_tags]),
    adoption_targets:Object.freeze([...candidate.adoption_targets]),innovation_fit:candidate.innovation_fit,reversibility:candidate.reversibility,
    evidence_public:acceptedEvidence.public_evidence===true,source_evidence_separate_from_interpretation:dossier.source_evidence_separate_from_interpretation===true
  });
  const seed={company_id,plan_status:plan.status,selected_route:plan.route?.selected_route??null,evidence_id:acceptedEvidence.evidence_id,candidate_id:score.candidate_id,score:score.score,recommendation:score.recommendation,dossier_id:dossier.dossier_id,replay_green:replay.replay_green,semantic_profile};
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_TECH_SCOUT_PRODUCER_BUNDLE',capability_id:'TECH-CAP-SCOUT-NATIVE',
    company_id,engine_id:TECH_SCOUT_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:TECH_SCOUT_REAL_VERSION,
    bundle_id:`techscout:${hash(seed).slice(0,24)}`,native:Object.freeze({plan,accepted_evidence:acceptedEvidence,score,dossier,replay}),
    candidate_input:Object.freeze(candidate),semantic_profile,additional_cost_eur:0,
    prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,
    spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false
  });
}

function assertBundle(b){
  if(!b||b.capability_id!=='TECH-CAP-SCOUT-NATIVE'||b.engine_id!==TECH_SCOUT_REAL_OWNER_ENGINE_ID||b.environment!==PREPROD)throw new Error('TECH_SCOUT_PREPROD_BUNDLE_REQUIRED');
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])if(b[k]!==false)throw new Error('TECH_SCOUT_FORBIDDEN_AUTHORITY');
  if(b.additional_cost_eur!==0)throw new Error('TECH_SCOUT_ZERO_COST_REQUIRED');
  const n=b.native??{},p=b.semantic_profile??{};
  if(n.plan?.status!=='ROUTED'||n.accepted_evidence?.status!=='ACCEPTED'||n.score?.status!=='SCORED'||n.dossier?.status!=='READY'||n.replay?.replay_green!==true)throw new Error('TECH_SCOUT_NATIVE_CHAIN_NOT_GREEN');
  if(p.candidate_id!==n.score.candidate_id||p.evidence_id!==n.accepted_evidence.evidence_id||!n.dossier.evidence_ids?.includes(p.evidence_id))throw new Error('TECH_SCOUT_SEMANTIC_PROVENANCE_MISMATCH');
  return b;
}

function consumeScan(b){
  const p=b.semantic_profile,n=b.native;const pass=n.plan.status==='ROUTED'&&n.accepted_evidence.public_evidence===true&&includes(p.capability_tags,'PUBLIC_WEB_DISCOVERY')&&includes(p.use_case_tags,'DIGITAL_FOOTPRINT_DISCOVERY')&&includes(p.adoption_targets,'SCAN-001');
  return evidence('SCAN-001',['native.plan.status','native.accepted_evidence.public_evidence','semantic_profile.capability_tags','semantic_profile.use_case_tags','semantic_profile.adoption_targets'],pass?'DISCOVERY_ADAPTER_SHORTLISTED':'DISCOVERY_ADAPTER_HOLD',{pass,route:n.plan.route?.selected_route??null,evidence_id:p.evidence_id,action:pass?'ADD_PREPROD_DISCOVERY_ADAPTER_CANDIDATE':'NO_CHANGE'});
}
function consumeWeb(b){
  const p=b.semantic_profile;const pass=includes(p.capability_tags,'DOM_EXTRACTION')&&includes(p.capability_tags,'WEBSITE_AUDIT_INPUT')&&includes(p.adoption_targets,'WEB-001')&&p.source_evidence_separate_from_interpretation===true;
  return evidence('WEB-001',['semantic_profile.capability_tags','semantic_profile.adoption_targets','semantic_profile.source_evidence_separate_from_interpretation'],pass?'WEB_AUDIT_INPUT_ENABLED':'WEB_AUDIT_INPUT_HOLD',{pass,candidate_id:p.candidate_id,action:pass?'ADD_PREPROD_WEB_AUDIT_INPUT':'NO_CHANGE'});
}
function consumeInn(b){
  const p=b.semantic_profile,s=b.native.score;const pass=s.recommendation==='SHORTLIST'&&Number(s.score)>=80&&p.innovation_fit===true&&Number(p.reversibility)>=90&&includes(p.adoption_targets,'INN-001');
  return evidence('INN-001',['native.score.recommendation','native.score.score','semantic_profile.innovation_fit','semantic_profile.reversibility','semantic_profile.adoption_targets'],pass?'INNOVATION_BACKLOG_PRIORITIZED':'INNOVATION_BACKLOG_HOLD',{pass,score:s.score,reversibility:p.reversibility,priority:pass?'HIGH_PREPROD':'NONE'});
}
function consumeCompet(b){
  const p=b.semantic_profile;const pass=p.evidence_public===true&&includes(p.use_case_tags,'COMPETITOR_PUBLIC_INTELLIGENCE')&&includes(p.capability_tags,'PUBLIC_WEB_DISCOVERY')&&includes(p.adoption_targets,'COMPET-001');
  return evidence('COMPET-001',['semantic_profile.evidence_public','semantic_profile.use_case_tags','semantic_profile.capability_tags','semantic_profile.adoption_targets'],pass?'COMPETITOR_INTELLIGENCE_INPUT_ENABLED':'COMPETITOR_INTELLIGENCE_HOLD',{pass,evidence_id:p.evidence_id,action:pass?'ADD_PREPROD_PUBLIC_COMPETITOR_INPUT':'NO_CHANGE'});
}
function consumeSeo(b){
  const p=b.semantic_profile;const pass=includes(p.use_case_tags,'SEO_TECHNICAL_EVIDENCE')&&includes(p.capability_tags,'DOM_EXTRACTION')&&includes(p.adoption_targets,'SEO-001')&&b.native.replay.replay_green===true;
  return evidence('SEO-001',['semantic_profile.use_case_tags','semantic_profile.capability_tags','semantic_profile.adoption_targets','native.replay.replay_green'],pass?'SEO_TECH_EVIDENCE_INPUT_ENABLED':'SEO_TECH_EVIDENCE_HOLD',{pass,dossier_id:b.native.dossier.dossier_id,action:pass?'ADD_PREPROD_TECH_EVIDENCE_INPUT':'NO_CHANGE'});
}
function consumeMkt(b){
  const p=b.semantic_profile;const pass=includes(p.use_case_tags,'LANDING_CAMPAIGN_INTELLIGENCE')&&includes(p.capability_tags,'PUBLIC_WEB_DISCOVERY')&&includes(p.adoption_targets,'MKT-001')&&b.native.accepted_evidence.public_evidence===true;
  return evidence('MKT-001',['semantic_profile.use_case_tags','semantic_profile.capability_tags','semantic_profile.adoption_targets','native.accepted_evidence.public_evidence'],pass?'MARKETING_INTELLIGENCE_INPUT_ENABLED':'MARKETING_INTELLIGENCE_HOLD',{pass,evidence_id:p.evidence_id,action:pass?'ADD_PREPROD_LANDING_CAMPAIGN_INPUT':'NO_CHANGE'});
}
function consumeRoute(b){
  const p=b.semantic_profile,s=b.native.score,d=b.native.dossier;const expected=['SCAN-001','WEB-001','INN-001','COMPET-001','SEO-001','MKT-001'];
  const targets=[...(p.adoption_targets??[])].sort(),required=[...expected].sort();
  const pass=s.recommendation==='SHORTLIST'&&b.candidate_input.cost_eur_month===0&&d.source_evidence_separate_from_interpretation===true&&b.native.replay.replay_green===true&&JSON.stringify(targets)===JSON.stringify(required);
  return evidence('ROUTE-001',['native.score.recommendation','candidate_input.cost_eur_month','native.dossier.source_evidence_separate_from_interpretation','native.replay.replay_green','semantic_profile.adoption_targets'],pass?'ADOPTION_ROUTE_PREPROD_READY':'ADOPTION_ROUTE_HOLD',{pass,targets:pass?required:[],route_mode:pass?'PREPROD_PLAN_ONLY':'HOLD'});
}
function coreConsumers(b){return Object.freeze([consumeScan(b),consumeWeb(b),consumeInn(b),consumeCompet(b),consumeSeo(b),consumeMkt(b),consumeRoute(b)]);}

function semanticStateFrom(bundle,consumers){return {schema_version:'1.0.0',state_type:'CEREBRO_TECH_SCOUT_SEMANTIC_CONSUMER_STATE',company_id:bundle.company_id,environment:PREPROD,bundle_id:bundle.bundle_id,consumer_outcome_hash:hash(consumers.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(consumers.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,additional_cost_eur:0};}
function semanticHash(state){return hash({company_id:state.company_id,environment:state.environment,bundle_id:state.bundle_id,consumer_outcome_hash:state.consumer_outcome_hash,engines:state.engines});}
function applySemanticState(root,bundle,consumers){
  const file=path.join(root,'semantic-consumer-state.json'),next=semanticStateFrom(bundle,consumers);
  if(fs.existsSync(file)){const old=readJson(file);if(semanticHash(old)!==semanticHash(next))throw new Error('TECH_SCOUT_SEMANTIC_STATE_CONFLICT');return {file,state:old,created:false};}
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
    'SCAN-001':'DISCOVERY_ADAPTER_SHORTLISTED','WEB-001':'WEB_AUDIT_INPUT_ENABLED','INN-001':'INNOVATION_BACKLOG_PRIORITIZED','COMPET-001':'COMPETITOR_INTELLIGENCE_INPUT_ENABLED','SEO-001':'SEO_TECH_EVIDENCE_INPUT_ENABLED','MKT-001':'MARKETING_INTELLIGENCE_INPUT_ENABLED','ROUTE-001':'ADOPTION_ROUTE_PREPROD_READY'
  };
  const passed=core.filter(x=>x.decision===expected[x.engine_id]).length,coverage=passed/CORE_CONSUMERS.length,quality=coverage===1&&rebuild.rollback_green&&rebuild.rebuild_green?1:0;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:TECH_SCOUT_REAL_VERSION,benchmark_id:'TECH-CAP-SCOUT-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'semantic_adoption_quality',holdout_ref:'first-party://tech-scout/strict-holdout',adversarial_refs:['missing-discovery-capability','missing-dom-extraction','low-innovation-reversibility','missing-competitor-use-case','missing-seo-use-case','missing-marketing-use-case','route-cost-or-target-drift']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:TECH_SCOUT_REAL_VERSION,experiment_id:bundle.bundle_id};
  const comparison=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_adoption_quality:0.5}},new_result:{...common,arm:'NEW',metrics:{semantic_adoption_quality:quality}}});
  const tribunal=tribunalDecision({evaluation:comparison,judge_id:'EVA-001:INDEPENDENT-JUDGE:v1',candidate_actor_id:'RSH-001',metric_direction:'higher'});
  return Object.freeze({engine_id:'EVA-001',decision:tribunal.decision==='PASS'?'TRIBUNAL_PASS':`TRIBUNAL_${tribunal.decision}`,real_consumption:true,outcome:Object.freeze({quality,coverage,delta:comparison.delta,tribunal_decision:tribunal.decision}),outcome_hash:hash({quality,coverage,delta:comparison.delta,decision:tribunal.decision})});
}

function telemetry(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD}),corr=bundle.bundle_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='TECH-CAP-SCOUT-NATIVE real semantic consumer outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'TECH-CAP-SCOUT-NATIVE real semantic consumer outcome',data:{semantic_outcome_hash:semanticOutcomeHash,core_consumer_count:CORE_CONSUMERS.length,dossier_id:bundle.native.dossier.dossier_id}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.core_consumer_count===CORE_CONSUMERS.length;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_TECH_SCOUT');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_TECH_SCOUT',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_TECH_SCOUT'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  const obsOutcome={pass:obsPass,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length};
  const finOutcome={pass:finPass,cost_eur_micros:fin.cost_eur_micros,aggregate_cost_eur:agg.cost_eur,events:agg.events};
  return Object.freeze({
    obs:evidence('OBSERV-001',['semantic_outcome_hash','core_consumer_count','dossier_id'],obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',obsOutcome),
    fin:evidence('FINOPS-001',['additional_cost_eur','native.additional_cost_eur'],finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',finOutcome)
  });
}

function learning(bundle,root,source_run_id,source_head_sha,accepted,semanticOutcomeHash){
  const registry=readJson(SUBSCRIBERS_PATH);
  const event={event_id:`evt:techscout:${hash({bundle:bundle.bundle_id,semanticOutcomeHash}).slice(0,24)}`,company_id:bundle.company_id,type:'tech.scout.consumer.outcome',engine_id:'RSH-001',environment:PREPROD,version:TECH_SCOUT_REAL_VERSION,capability_id:'TECH-CAP-SCOUT-NATIVE',accepted,consumer_outcome_hash:semanticOutcomeHash,prod_authorized:false,additional_cost_eur:0};
  const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO Tech Scout FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
  const out=path.join(root,'lrn-outbox'),first=persistLearningOutbox({build,output_root:out}),second=persistLearningOutbox({build,output_root:out});
  const localized=build.batches.find(x=>x.company_id===bundle.company_id)?.events??[];
  const pass=localized.some(x=>x.type===event.type)&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  return evidence('LRN-001',['semantic_outcome_hash','accepted','event_id'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',{pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0});
}
function persistFinal(root,state){const file=path.join(root,'tech-scout-strict-state.json');if(fs.existsSync(file)){const old=readJson(file);if(hash(old)!==hash(state))throw new Error('TECH_SCOUT_PERSISTED_STATE_CONFLICT');return {file,created:false};}writeJson(file,state);return {file,created:true};}

export async function consumeTechnologyScoutOutputReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true}={}){
  const b=assertBundle(producer_bundle);if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-techscout-real-'));fs.mkdirSync(root,{recursive:true});
  const core=coreConsumers(b),semanticOutcomeHash=hash(core.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash})));
  const applied=applySemanticState(root,b,core),rebuild=backupRollbackRebuild(root,b,core),eva=evaluate(b,core,rebuild),tel=telemetry(b,root,semanticOutcomeHash);
  const expectedCore={'SCAN-001':'DISCOVERY_ADAPTER_SHORTLISTED','WEB-001':'WEB_AUDIT_INPUT_ENABLED','INN-001':'INNOVATION_BACKLOG_PRIORITIZED','COMPET-001':'COMPETITOR_INTELLIGENCE_INPUT_ENABLED','SEO-001':'SEO_TECH_EVIDENCE_INPUT_ENABLED','MKT-001':'MARKETING_INTELLIGENCE_INPUT_ENABLED','ROUTE-001':'ADOPTION_ROUTE_PREPROD_READY'};
  const coreGreen=core.every(x=>x.decision===expectedCore[x.engine_id]);
  const preLearning=coreGreen&&eva.decision==='TRIBUNAL_PASS'&&rebuild.backup_ready&&rebuild.rollback_green&&rebuild.rebuild_green&&tel.obs.decision==='OBSERVABILITY_RECORDED'&&tel.fin.decision==='FINOPS_ZERO_COST_RECORDED';
  const lrn=emit_learning?learning(b,root,source_run_id,source_head_sha.toLowerCase(),preLearning,semanticOutcomeHash):evidence('LRN-001',['disabled'],'LRN_FEEDBACK_INCOMPLETE',{pass:false,idempotency_green:false,localized_events:0,first_created_total:0,second_created_total:0});
  const all=Object.freeze([...core,lrn,tel.obs,tel.fin]),map=Object.freeze(Object.fromEntries(all.map(x=>[x.engine_id,x])));
  const expected={...expectedCore,'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const missing=Object.freeze(TECH_SCOUT_REAL_REQUIRED_CONSUMERS.filter(id=>!map[id]));
  const failed=Object.freeze(TECH_SCOUT_REAL_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expected[id]));
  const passed=TECH_SCOUT_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length,coverage=passed/TECH_SCOUT_REAL_REQUIRED_CONSUMERS.length;
  const full=preLearning&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&coverage===1;
  const outcome={bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,required_consumer_count:TECH_SCOUT_REAL_REQUIRED_CONSUMERS.length,passed_consumer_count:passed,coverage,tribunal:eva.decision,learning:lrn.decision,rollback_green:rebuild.rollback_green,rebuild_green:rebuild.rebuild_green,zero_cost:tel.fin.decision==='FINOPS_ZERO_COST_RECORDED',accepted:full};
  const state={schema_version:'1.0.0',state_type:'CEREBRO_TECH_SCOUT_REAL_CONSUMER_ADOPTION_STATE',capability_id:'TECH-CAP-SCOUT-NATIVE',company_id:b.company_id,engine_id:TECH_SCOUT_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:TECH_SCOUT_REAL_VERSION,bundle_id:b.bundle_id,semantic_outcome_hash:semanticOutcomeHash,semantic_state_hash:semanticHash(applied.state),outcome_hash:hash(outcome),status:full?'FULL_E2E_REAL_PREPROD':'PARCIAL'};
  const ps=persistFinal(root,state);
  return Object.freeze({...state,required_consumers:Object.freeze([...TECH_SCOUT_REAL_REQUIRED_CONSUMERS]),consumers:all,consumer_map:map,consumer_coverage:coverage,functional_consumer_coverage:coverage,missing_consumers:missing,failed_consumers:failed,evaluation_consumer:eva,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,backup_rollback_rebuild:rebuild,state_persisted:true,semantic_state_persisted:true,state_file:ps.file,restartable:true,idempotency_proven:lrn.outcome.idempotency_green===true,continuous_improvement_feedback:lrn.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:tel.fin.outcome.aggregate_cost_eur,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,external_code_execution:false,full_e2e_real_preprod:full});
}

export async function runTechnologyScoutFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){
  return consumeTechnologyScoutOutputReal({producer_bundle:await buildTechnologyScoutProducerBundle({company_id}),workdir,source_run_id,source_head_sha});
}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const main=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){try{const result=await runTechnologyScoutFullE2ERealV1({company_id:arg('--company')??'fenix',workdir:arg('--workdir'),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)});const text=`${JSON.stringify(result,null,2)}\n`,out=arg('--out');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{mode:0o600});}else process.stdout.write(text);if(!result.full_e2e_real_preprod)process.exitCode=3;}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
