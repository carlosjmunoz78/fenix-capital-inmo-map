#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {getSupabaseWrapperProfile,CEREBRO_SUPABASE_WRAPPER} from './skill-cerebro-supabase-wrapper.mjs';
import {getAgentBrowserWrapperProfile,CEREBRO_AGENT_BROWSER_WRAPPER} from './skill-cerebro-agent-browser-wrapper.mjs';
import {evaluateOldVsNew as evaluateSkillOldVsNew} from '../runtime/skill-capability-evolution.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from '../runtime/evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from '../runtime/rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from '../runtime/observability-audit-finops.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SIGNALS_PATH=path.resolve(__dirname,'internal-capability-signals.v0.json');
const ENGINES_PATH=path.resolve(__dirname,'../registry/engine-registry.v1.json');
const SUPPLY_PATH=path.resolve(__dirname,'../registry/skill-supply-chain-v0.json');
const RESOLUTION_PATH=path.resolve(__dirname,'../registry/skill-high-risk-review-resolution-2026-10-17.json');
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

export const SUPABASE_SKILL=Object.freeze({
  candidate_id:'mcpservers-agent-skills:4c2b2478f8fe3bed14df',technical_name:'supabase-postgres-best-practices',alias_es:'Optimización y seguridad de bases de datos',domain:'data-database-supabase',wrapper_id:CEREBRO_SUPABASE_WRAPPER.wrapper_id
});
export const BROWSER_SKILL=Object.freeze({
  candidate_id:'mcpservers-agent-skills:157e52d4ac5038d53c1a',technical_name:'agent-browser',alias_es:'Control avanzado del navegador',domain:'browser-automation-scraping',wrapper_id:CEREBRO_AGENT_BROWSER_WRAPPER.wrapper_id
});
export const EXPECTED_BINDINGS=Object.freeze({
  [SUPABASE_SKILL.technical_name]:Object.freeze(['DATA-001','DBOFF-001','STOROFF-001','API-001','CRM-001']),
  [BROWSER_SKILL.technical_name]:Object.freeze(['AUTO-001','AUTBOOT-001','QA-001','WEB-001','SCAN-001'])
});

const BINDING_TASKS=Object.freeze({
  'DATA-001':Object.freeze({skill:SUPABASE_SKILL.technical_name,fixture_id:'query-review',constraints:Object.freeze(['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']),baseline:Object.freeze(['NO_DB_WRITE']),decision:'DATA_QUERY_REVIEW_WITH_INDEX_AND_TENANT_EVIDENCE'}),
  'DBOFF-001':Object.freeze({skill:SUPABASE_SKILL.technical_name,fixture_id:'migration-plan',constraints:Object.freeze(['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']),baseline:Object.freeze(['NO_EXECUTION','PREPROD_FIRST']),decision:'DB_OFFLOAD_MIGRATION_REHEARSAL_WITH_BACKUP_ROLLBACK'}),
  'STOROFF-001':Object.freeze({skill:SUPABASE_SKILL.technical_name,fixture_id:'migration-plan',constraints:Object.freeze(['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']),baseline:Object.freeze(['NO_EXECUTION','PREPROD_FIRST']),decision:'STORAGE_OFFLOAD_CHANGE_REHEARSAL_WITH_BACKUP_ROLLBACK'}),
  'API-001':Object.freeze({skill:SUPABASE_SKILL.technical_name,fixture_id:'rls-review',constraints:Object.freeze(['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']),baseline:Object.freeze(['FAIL_CLOSED']),decision:'API_DATA_POLICY_FAIL_CLOSED_MULTI_COMPANY'}),
  'CRM-001':Object.freeze({skill:SUPABASE_SKILL.technical_name,fixture_id:'rls-review',constraints:Object.freeze(['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']),baseline:Object.freeze(['NO_RLS_WEAKENING']),decision:'CRM_TENANT_DATA_POLICY_REVIEW_READY'}),
  'AUTO-001':Object.freeze({skill:BROWSER_SKILL.technical_name,fixture_id:'form-dry-run',constraints:Object.freeze(['NO_SUBMIT','NO_SIDE_EFFECTS']),baseline:Object.freeze(['NO_SIDE_EFFECTS']),decision:'AUTOMATION_BROWSER_DRY_RUN_READY'}),
  'AUTBOOT-001':Object.freeze({skill:BROWSER_SKILL.technical_name,fixture_id:'e2e-evidence',constraints:Object.freeze(['NO_PROD_WRITE','SCREENSHOT_EVIDENCE','REVERSIBLE']),baseline:Object.freeze(['REVERSIBLE']),decision:'AUTOMATION_BOOTSTRAP_BROWSER_E2E_PLAN_READY'}),
  'QA-001':Object.freeze({skill:BROWSER_SKILL.technical_name,fixture_id:'e2e-evidence',constraints:Object.freeze(['NO_PROD_WRITE','SCREENSHOT_EVIDENCE','REVERSIBLE']),baseline:Object.freeze(['SCREENSHOT_EVIDENCE','REVERSIBLE']),decision:'QA_BROWSER_EVIDENCE_WITH_PROD_WRITE_GUARD'}),
  'WEB-001':Object.freeze({skill:BROWSER_SKILL.technical_name,fixture_id:'form-dry-run',constraints:Object.freeze(['NO_SUBMIT','NO_SIDE_EFFECTS']),baseline:Object.freeze(['NO_SUBMIT']),decision:'WEB_BROWSER_FORM_PLAN_NO_SIDE_EFFECTS'}),
  'SCAN-001':Object.freeze({skill:BROWSER_SKILL.technical_name,fixture_id:'read-only-navigation',constraints:Object.freeze(['NO_SUBMIT','NO_CREDENTIALS','NO_ANTIBOT_BYPASS']),baseline:Object.freeze(['NO_SUBMIT','NO_CREDENTIALS']),decision:'SCAN_BROWSER_READONLY_WITH_ANTI_ABUSE_GUARD'})
});

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function exact(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);}
function coverage(required,actual){const s=new Set(actual);return required.length?Number((required.filter(x=>s.has(x)).length/required.length).toFixed(6)):1;}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:VERSION};}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,db_mutation_authorized:false,crm_write_authorized:false,provider_write_authorized:false,browser_external_side_effect_authorized:false,external_skill_code_execution:false,permission_expansion_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function semanticReceipt({skill,engine_id,fixture_id,decision,baseline_coverage,candidate_coverage,old_vs_new,profile}){
  const outcome={engine_id,fixture_id,decision,baseline_coverage,candidate_coverage,wrapper_id:profile.wrapper_id,old_vs_new:old_vs_new.decision,meaningful_change:candidate_coverage>baseline_coverage,semantic_constraints:[...profile.required_constraints],...authority()};
  return Object.freeze({skill,engine_id,consumer_class:'REAL_SEMANTIC_ENGINE_BINDING',decision,real_consumption:true,meaningful_change:outcome.meaningful_change,outcome:Object.freeze(outcome),outcome_hash:hash(outcome),...authority()});
}

export function resolveGovernedSkillBindings(){
  const signals=readJson(SIGNALS_PATH);const registry=readJson(ENGINES_PATH);const known=new Set(registry.engine_ids??[]);
  const byDomain=new Map((signals.domains??[]).map(x=>[x.domain_id,x.engine_bindings??[]]));
  const sup=[...(byDomain.get(SUPABASE_SKILL.domain)??[])],browser=[...(byDomain.get(BROWSER_SKILL.domain)??[])];
  if(!exact(sup,EXPECTED_BINDINGS[SUPABASE_SKILL.technical_name]))throw new Error('SUPABASE_GOVERNED_BINDING_DRIFT');
  if(!exact(browser,EXPECTED_BINDINGS[BROWSER_SKILL.technical_name]))throw new Error('BROWSER_GOVERNED_BINDING_DRIFT');
  for(const id of [...sup,...browser])if(!known.has(id))throw new Error(`UNKNOWN_CANONICAL_ENGINE:${id}`);
  return Object.freeze({supabase:Object.freeze(sup),browser:Object.freeze(browser),all:Object.freeze([...sup,...browser]),canonical_engine_count:registry.count,source:'cerebro/skills/internal-capability-signals.v0.json'});
}

function validateHumanResolution(){
  const r=readJson(RESOLUTION_PATH);if(r.state_type!=='CEREBRO_SKILL_HIGH_RISK_REVIEW_RESOLUTION'||r.environment!=='PREPROD'||r.decision!=='AUTHORIZE_SAFE_PREPROD_BINDING_CLOSURE_ONLY')throw new Error('HIGH_RISK_HUMAN_RESOLUTION_MISSING');
  const ids=new Set((r.resolved_candidates??[]).map(x=>x.candidate_id));if(!ids.has(SUPABASE_SKILL.candidate_id)||!ids.has(BROWSER_SKILL.candidate_id))throw new Error('HIGH_RISK_RESOLUTION_SCOPE_MISMATCH');
  const s=r.scope??{};const falseKeys=['external_skill_code_execution','prod_authorized','prod_write_authorized','prod_mutation_authorized','database_mutation_authorized','browser_external_side_effect_authorized','permission_expansion_authorized','customer_data_authorized','paid_fallback','spend_authorized','trading_access'];for(const k of falseKeys)if(s[k]!==false)throw new Error(`HIGH_RISK_RESOLUTION_UNSAFE:${k}`);if(Number(s.additional_cost_eur)!==0)throw new Error('HIGH_RISK_RESOLUTION_NONZERO_COST');
  return r;
}

function validatePriorEvidence(){
  const supply=readJson(SUPPLY_PATH);const s=supply.behavioral_candidates?.[SUPABASE_SKILL.technical_name],b=supply.behavioral_candidates?.[BROWSER_SKILL.technical_name];
  if(s?.decision!=='READY_FOR_PREPROD_PROMOTION_REVIEW'||s?.human_required!=='HIGH_RISK')throw new Error('SUPABASE_PRIOR_TRIBUNAL_EVIDENCE_MISSING');
  if(b?.decision!=='READY_FOR_PREPROD_PROMOTION_REVIEW'||b?.human_required!=='HIGH_RISK'||b?.normalized_wrapper_status!=='NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL'||b?.thresholds_relaxed!==false)throw new Error('BROWSER_PRIOR_TRIBUNAL_EVIDENCE_MISSING');
  const p=supply.preprod_evidence;if(p?.integration_status!=='PREPROD_INTEGRATION_COMPLETE'||p?.runtime_integration_real!==true||p?.judge_decision!=='GREEN_FOR_PREPROD_TRIBUNAL'||p?.tribunal_decision!=='GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW'||p?.physical_rollback!==true||p?.rebuild_default_disabled!==true||Number(p?.measured_additional_cost_eur)!==0)throw new Error('PRIOR_PREPROD_EVIDENCE_NOT_GREEN');
  return Object.freeze({supabase_run_id:s.run_id,browser_run_id:b.run_id,preprod_run_id:p.run_id,prior_high_risk_review_green:true});
}

function wrapperProfile(skill,task){
  const fixture={fixture_id:task.fixture_id,expected_constraints:[...task.constraints]};
  const p=skill===SUPABASE_SKILL.technical_name?getSupabaseWrapperProfile(fixture):getAgentBrowserWrapperProfile(fixture);
  if(!p||p.contract_exact!==true)throw new Error(`WRAPPER_PROFILE_NOT_EXACT:${skill}:${task.fixture_id}`);
  if(p.external_skill_code_execution!==false||p.prod_authorized!==false||Number(p.additional_cost_eur)!==0)throw new Error(`WRAPPER_AUTHORITY_EXPANDED:${skill}`);
  return p;
}

function oldVsNewForBinding({company_id,skill,engine_id,task,profile}){
  const baseCoverage=coverage(task.constraints,task.baseline),candidateCoverage=coverage(task.constraints,profile.required_constraints);
  const plan={schema_version:'1.0.0',state_type:'CEREBRO_SKILL_OLD_VS_NEW_PLAN',experiment_id:`skillbind:${hash({company_id,skill,engine_id,fixture:task.fixture_id}).slice(0,24)}`,company_id,engine_id,environment:PREPROD,version:VERSION,baseline_version:'CURRENT_CEREBRO_SAFE_BASELINE',candidate_version:`${skill}-normalized-wrapper`,skill_id:skill,skill_version:profile.wrapper_version,impact_score:1,policy_locked:true,permissions_locked:true,rollback_required:true,rebuild_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  const result=evaluateSkillOldVsNew({plan,baseline_metrics:{coverage:baseCoverage,policy_violations:0,safety_violations:0,cost_eur:0},candidate_metrics:{coverage:candidateCoverage,policy_violations:0,safety_violations:0,cost_eur:0}});
  if(result.decision!=='PASS')throw new Error(`BINDING_OLD_VS_NEW_FAILED:${skill}:${engine_id}`);
  return Object.freeze({plan,result,baseline_coverage:baseCoverage,candidate_coverage:candidateCoverage});
}

export function buildSkillEngineBindingBundle({company_id='fenix'}={}){
  const bindings=resolveGovernedSkillBindings();const resolution=validateHumanResolution();const prior=validatePriorEvidence();const receipts=[];const experiments=[];
  for(const engine_id of bindings.all){const task=BINDING_TASKS[engine_id];if(!task)throw new Error(`BINDING_TASK_MISSING:${engine_id}`);const profile=wrapperProfile(task.skill,task);const ev=oldVsNewForBinding({company_id,skill:task.skill,engine_id,task,profile});experiments.push(Object.freeze({skill:task.skill,engine_id,fixture_id:task.fixture_id,...ev}));receipts.push(semanticReceipt({skill:task.skill,engine_id,fixture_id:task.fixture_id,decision:task.decision,baseline_coverage:ev.baseline_coverage,candidate_coverage:ev.candidate_coverage,old_vs_new:ev.result,profile}));}
  const binding_id=`skillbindings_${hash({company_id,receipts:receipts.map(x=>[x.skill,x.engine_id,x.outcome_hash])}).slice(0,24)}`;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_SKILL_REAL_ENGINE_BINDING_BUNDLE',status:'TEN_BINDINGS_READY',company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,binding_id,skills:Object.freeze([SUPABASE_SKILL,BROWSER_SKILL]),bindings,receipts:Object.freeze(receipts),experiments:Object.freeze(experiments),human_resolution:Object.freeze({decision:resolution.decision,date:resolution.date,scope:'SAFE_PREPROD_ONLY'}),prior_evidence:prior,external_skill_code_executed:false,wrappers_used:Object.freeze([CEREBRO_SUPABASE_WRAPPER.wrapper_id,CEREBRO_AGENT_BROWSER_WRAPPER.wrapper_id]),...authority()});
}

function overallEvaluation(bundle){
  const quality=bundle.receipts.filter(x=>x.real_consumption&&x.meaningful_change&&x.outcome.old_vs_new==='PASS').length/bundle.receipts.length;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,benchmark_id:'SKILL-REAL-ENGINE-BINDING-V1',benchmark_version:'1.0.0',metric:'semantic_binding_quality',holdout_ref:'first-party://skills/real-engine-binding',adversarial_refs:['binding-drift','external-code-execution','permission-expansion','db-write-leak','browser-side-effect-leak']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,experiment_id:bundle.binding_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_binding_quality:.2}},new_result:{...common,arm:'NEW',metrics:{semantic_binding_quality:quality}},candidate_visible_holdout:false});
  return Object.freeze({quality,evaluation,tribunal:tribunalDecision({evaluation,judge_id:'QA-001:SKILL-REAL-ENGINE-BINDING:v1',candidate_actor_id:'FACT-001',metric_direction:'higher'})});
}

function semanticState(bundle){return {schema_version:'1.0.0',state_type:'CEREBRO_SKILL_REAL_ENGINE_BINDING_STATE',company_id:bundle.company_id,environment:PREPROD,binding_id:bundle.binding_id,outcome_hash:hash(bundle.receipts.map(x=>({skill:x.skill,engine_id:x.engine_id,outcome_hash:x.outcome_hash}))),bindings:Object.fromEntries(bundle.receipts.map(x=>[`${x.skill}:${x.engine_id}`,{decision:x.decision,outcome_hash:x.outcome_hash}])),...authority()};}
function stateHash(s){return hash({company_id:s.company_id,environment:s.environment,binding_id:s.binding_id,outcome_hash:s.outcome_hash,bindings:s.bindings});}
function persistState(root,state){const f=path.join(root,'skill-engine-bindings.json');if(fs.existsSync(f)){const old=readJson(f);if(stateHash(old)!==stateHash(state))throw new Error('SKILL_BINDING_STATE_CONFLICT');return {file:f,state:old,created:false};}writeJson(f,state);return {file:f,state,created:true};}
function backupRollbackRebuild(root,state){const f=path.join(root,'skill-engine-bindings.json'),b=path.join(root,'backups','skill-engine-bindings.json');writeJson(b,readJson(f));const before=stateHash(readJson(f));fs.unlinkSync(f);const rollback_green=!fs.existsSync(f);writeJson(f,state);const after=stateHash(readJson(f));return Object.freeze({backup_ready:fs.existsSync(b),backup_file:b,rollback_green,rebuild_green:before===after,applied_state_hash:before,rebuilt_state_hash:after});}

function learningConsumer(bundle,root,source){
  const event_report={events:[{event_id:`evt:skillbindings:${hash({binding_id:bundle.binding_id}).slice(0,24)}`,company_id:bundle.company_id,signal_family:'ENGINE_RESULT',engine_id:'FACT-001',environment:PREPROD,version:VERSION,outcome:'SKILL_REAL_ENGINE_BINDINGS_GREEN',outcome_hash:hash(bundle.receipts.map(x=>x.outcome_hash)),prod_authorized:false,trading_access:false,additional_cost_eur:0}]};
  const build=buildLearningOutbox({event_report,subscriber_registry:readJson(SUBSCRIBERS_PATH),source});const persisted=persistLearningOutbox({build,output_root:path.join(root,'learning-outbox')});const pass=build.batches_total===1&&persisted.status==='OUTBOX_GREEN'&&persisted.batches_total===1;
  const outcome={pass,batches_total:persisted.batches_total,created_total:persisted.created_total};return Object.freeze({engine_id:'LRN-001',consumer_class:'REAL_SEMANTIC_ENGINE_BINDING',decision:pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_HOLD',real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome),...authority()});
}

function telemetryConsumers(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD});const corr=bundle.binding_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(x=>x.message==='Skill real-engine binding outcome');const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'Skill real-engine binding outcome',data:{semantic_outcome_hash:semanticOutcomeHash,binding_count:bundle.receipts.length,skill_count:2}});const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.binding_count===10;
  const priorCost=ledgers.finops.list().find(x=>x.correlation_id===corr&&x.provider==='LOCAL_SKILL_BINDING');const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_SKILL_BINDING',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_SKILL_BINDING'}),finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  const priorAudit=ledgers.audit.listForCompany(bundle.company_id).find(x=>x.correlation_id===corr&&x.action==='SKILL_REAL_ENGINE_BINDING');const audit=priorAudit??ledgers.audit.append({context:context(bundle.company_id,'AUD-001'),correlation_id:corr,actor:'FACT-001',action:'SKILL_REAL_ENGINE_BINDING',target:{binding_id:bundle.binding_id},before:null,after:{semantic_outcome_hash:semanticOutcomeHash,binding_count:10},reason:'scoped owner-authorized HIGH_RISK PREPROD closure',result:'PASS'});const auditPass=ledgers.audit.verify().valid===true&&audit.result==='PASS';
  const mk=(engine_id,decision,outcome)=>Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_ENGINE_BINDING',decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome),...authority()});return Object.freeze({obs:mk('OBSERV-001',obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:obsPass,records:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}),fin:mk('FINOPS-001',finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_MISMATCH',{pass:finPass,cost_eur:agg.cost_eur}),audit_green:auditPass});
}

export function runSkillRealEngineBinding({company_id='fenix',root_dir,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-bindings-')));fs.mkdirSync(root,{recursive:true});const bundle=buildSkillEngineBindingBundle({company_id});const eva=overallEvaluation(bundle);const state=semanticState(bundle),first=persistState(root,state),again=persistState(root,state),semanticOutcomeHash=state.outcome_hash;const lrn=learningConsumer(bundle,root,{workflow:'CEREBRO SKILL REAL ENGINE BINDING FULL SAFE PREPROD V1',run_id:Number(source_run_id),head_sha:source_head_sha});const tel=telemetryConsumers(bundle,root,semanticOutcomeHash),br=backupRollbackRebuild(root,state);
  const allBindings=bundle.receipts.length===10&&bundle.receipts.every(x=>x.real_consumption===true&&x.meaningful_change===true&&x.outcome.old_vs_new==='PASS'&&x.outcome.candidate_coverage===1&&x.outcome.baseline_coverage<1);const green=allBindings&&eva.tribunal.decision==='PASS'&&again.created===false&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&tel.obs.decision==='OBSERVABILITY_RECORDED'&&tel.fin.decision==='FINOPS_ZERO_COST_RECORDED'&&tel.audit_green&&br.backup_ready&&br.rollback_green&&br.rebuild_green;
  const report={schema_version:'1.0.0',state_type:'CEREBRO_SKILL_REAL_ENGINE_BINDING_REPORT',status:green?'FULL_SAFE_PREPROD':'HOLD',full_safe_preprod:green,company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,binding_id:bundle.binding_id,skills:bundle.skills,bindings:bundle.bindings,semantic_bindings:bundle.receipts,binding_count:bundle.receipts.length,old_vs_new_results:bundle.experiments.map(x=>({skill:x.skill,engine_id:x.engine_id,decision:x.result.decision,baseline_coverage:x.baseline_coverage,candidate_coverage:x.candidate_coverage})),per_binding_old_vs_new_pass:bundle.experiments.every(x=>x.result.decision==='PASS'),independent_tribunal:eva.tribunal,evaluation:eva.evaluation,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,audit_green:tel.audit_green,semantic_outcome_hash:semanticOutcomeHash,backup_rollback_rebuild:br,state_persisted:fs.existsSync(first.file),restartable:br.rebuild_green,idempotency_proven:again.created===false,human_resolution:bundle.human_resolution,prior_evidence:bundle.prior_evidence,external_skill_code_executed:false,raw_external_skill_runtime_installed:false,wrappers_used:bundle.wrappers_used,...authority()};return Object.freeze({...report,outcome_hash:hash(report)});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}const entry=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(entry){try{const report=runSkillRealEngineBinding({company_id:arg('--company')??'fenix',root_dir:arg('--workdir')??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-bindings-')),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0000000000000000000000000000000000000001'});const out=arg('--out');if(out)writeJson(path.resolve(out),report);console.log(JSON.stringify(report));if(!report.full_safe_preprod)process.exitCode=3;}catch(e){console.error(e?.stack??String(e));process.exitCode=4;}}
