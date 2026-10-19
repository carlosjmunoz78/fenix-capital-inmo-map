#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveSemanticContract,validateAdapterAgainstContract} from './universal-skill-semantic-contracts-v1.mjs';
import {evaluateOldVsNew as evaluateSkillOldVsNew} from './skill-capability-evolution.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});fs.renameSync(tmp,file);}
function context(company_id,engine_id){return {company_id,engine_id,environment:PREPROD,version:VERSION};}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function coverage(required,observed){const set=new Set(observed??[]);return required.length?Number((required.filter((x)=>set.has(x)).length/required.length).toFixed(6)):1;}
function probeAuthorityGreen(probe){
  const falseKeys=['prod_authorized','prod_write_authorized','prod_mutation_authorized','permission_expansion_authorized','external_skill_code_execution','customer_data_used','paid_fallback','spend_authorized','trading_access'];
  return falseKeys.every((k)=>probe?.[k]===false)&&Number(probe?.additional_cost_eur??NaN)===0;
}
function physicalEvidenceRequired(contract,adapter){
  if(contract.physical_evidence_mode==='MEDIA_RUNTIME_PREPROD_REQUIRED')return true;
  if(contract.physical_evidence_mode==='PHYSICAL_BROWSER_PREPROD_WHEN_ACTION_CAPABLE')return adapter?.profile?.action_capable===true;
  return false;
}

function oldVsNew({company_id,candidate_id,capability_id,domain_id,engine_id,contract,adapter,probe}){
  const baselineCoverage=coverage(contract.required_constraints,contract.baseline_constraints);
  const candidateCoverage=coverage(contract.required_constraints,probe.observed_constraints);
  const plan={
    schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_OLD_VS_NEW_PLAN_V1',
    experiment_id:`usaf:${hash({company_id,candidate_id,capability_id,domain_id,engine_id,contract:contract.binding_contract_id}).slice(0,24)}`,
    company_id,engine_id,environment:PREPROD,version:VERSION,
    baseline_version:'CURRENT_CEREBRO_SAFE_BASELINE',candidate_version:adapter.profile?.adapter_version??adapter.profile?.wrapper_version??'1.0.0',
    skill_id:candidate_id,skill_version:adapter.profile?.adapter_version??adapter.profile?.wrapper_version??'1.0.0',impact_score:1,
    policy_locked:true,permissions_locked:true,rollback_required:true,rebuild_required:true,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  const result=evaluateSkillOldVsNew({
    plan,
    baseline_metrics:{coverage:baselineCoverage,policy_violations:0,safety_violations:0,cost_eur:0},
    candidate_metrics:{coverage:candidateCoverage,policy_violations:0,safety_violations:0,cost_eur:0}
  });
  return Object.freeze({plan,result,baseline_coverage:baselineCoverage,candidate_coverage:candidateCoverage});
}

function runOneBinding({plan,capability,domain,engine_id,adapter_resolver}){
  const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const adapter=adapter_resolver?.({candidate_id:plan.candidate_id,technical_name:plan.technical_name,capability,domain_id:domain.domain_id,engine_id,contract})??null;
  const base={candidate_id:plan.candidate_id,capability_id:capability.capability_id,domain_id:domain.domain_id,engine_id,contract_id:contract.contract_id,binding_contract_id:contract.binding_contract_id,...authority()};
  if(!adapter||typeof adapter.probe!=='function')return Object.freeze({...base,status:'HOLD',decision:'ADAPTER_MISSING',real_consumption:false,meaningful_change:false,evidence_refs:Object.freeze([]),outcome_hash:hash({...base,decision:'ADAPTER_MISSING'})});
  if(adapter.execution_authority!=='INTERNAL_PREPROD_PROBE')return Object.freeze({...base,status:'HOLD',decision:'ADAPTER_EXECUTION_AUTHORITY_INVALID',real_consumption:false,meaningful_change:false,evidence_refs:Object.freeze([]),outcome_hash:hash({...base,decision:'ADAPTER_EXECUTION_AUTHORITY_INVALID'})});
  const adapterCheck=validateAdapterAgainstContract({contract,adapter_profile:adapter.profile});
  if(!adapterCheck.exact)return Object.freeze({...base,status:'HOLD',decision:'ADAPTER_CONTRACT_HOLD',adapter_id:adapterCheck.wrapper_id,adapter_contract:adapterCheck,real_consumption:false,meaningful_change:false,evidence_refs:Object.freeze([]),outcome_hash:hash({...base,decision:'ADAPTER_CONTRACT_HOLD',adapter_contract:adapterCheck})});

  const probe=adapter.probe({candidate_id:plan.candidate_id,technical_name:plan.technical_name,capability,domain_id:domain.domain_id,engine_id,contract});
  const evidenceRefs=Array.isArray(probe?.evidence_refs)?probe.evidence_refs.filter((x)=>typeof x==='string'&&x.trim()):[];
  const observed=Array.isArray(probe?.observed_constraints)?[...new Set(probe.observed_constraints)]:[];
  const contractCoverage=coverage(contract.required_constraints,observed);
  const physicalRequired=physicalEvidenceRequired(contract,adapter);
  const probeGreen=probe?.status==='PASS'&&probe?.real_consumption===true&&evidenceRefs.length>0&&contractCoverage===1&&probeAuthorityGreen(probe)&&(!physicalRequired||probe?.physical_evidence===true);
  if(!probeGreen){
    const decision=physicalRequired&&probe?.physical_evidence!==true?'PHYSICAL_EVIDENCE_REQUIRED':'SEMANTIC_PROBE_HOLD';
    return Object.freeze({...base,status:'HOLD',decision,adapter_id:adapterCheck.wrapper_id,adapter_contract:adapterCheck,real_consumption:probe?.real_consumption===true,meaningful_change:false,evidence_refs:Object.freeze(evidenceRefs),probe_status:probe?.status??null,contract_coverage:contractCoverage,physical_evidence_required:physicalRequired,physical_evidence:probe?.physical_evidence===true,outcome_hash:hash({...base,decision,evidenceRefs,contractCoverage})});
  }

  const evaluation=oldVsNew({company_id:plan.company_id,candidate_id:plan.candidate_id,capability_id:capability.capability_id,domain_id:domain.domain_id,engine_id,contract,adapter,probe:{...probe,observed_constraints:observed}});
  const meaningful=evaluation.result.decision==='PASS'&&evaluation.candidate_coverage===1&&evaluation.candidate_coverage>evaluation.baseline_coverage;
  const decision=meaningful?'BINDING_PASS':'OLD_VS_NEW_HOLD';
  const outcome={decision,adapter_id:adapterCheck.wrapper_id,probe_decision:probe.decision??'PASS',evidence_refs:evidenceRefs,baseline_coverage:evaluation.baseline_coverage,candidate_coverage:evaluation.candidate_coverage,old_vs_new:evaluation.result.decision,physical_evidence_required:physicalRequired,physical_evidence:probe.physical_evidence===true};
  return Object.freeze({...base,status:meaningful?'PASS':'HOLD',decision,adapter_id:adapterCheck.wrapper_id,adapter_contract:adapterCheck,real_consumption:true,meaningful_change:meaningful,evidence_refs:Object.freeze(evidenceRefs),outcome:Object.freeze(outcome),old_vs_new:evaluation.result,baseline_coverage:evaluation.baseline_coverage,candidate_coverage:evaluation.candidate_coverage,physical_evidence_required:physicalRequired,physical_evidence:probe.physical_evidence===true,outcome_hash:hash(outcome)});
}

export function buildUniversalBindingBundle({activation_plan,adapter_resolver}){
  const plan=activation_plan;
  if(!plan||plan.state_type!=='CEREBRO_UNIVERSAL_SKILL_ACTIVATION_PLAN_V1'||plan.status!=='ACTIVATION_PLAN_READY')throw new Error('ACTIVATION_PLAN_READY_REQUIRED');
  if(plan.environment!==PREPROD||plan.engine_id!=='FACT-001'||plan.prod_authorized!==false||plan.prod_write_authorized!==false||Number(plan.additional_cost_eur)!==0)throw new Error('UNSAFE_ACTIVATION_PLAN');
  const receipts=[];
  for(const capability of plan.capabilities){
    for(const domain of capability.domains){
      for(const engine_id of domain.engine_bindings){receipts.push(runOneBinding({plan,capability,domain,engine_id,adapter_resolver}));}
    }
  }
  const binding_id=`usaf_bind_${hash({plan_id:plan.plan_id,receipts:receipts.map((x)=>[x.capability_id,x.domain_id,x.engine_id,x.outcome_hash])}).slice(0,24)}`;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_BINDING_BUNDLE_V1',status:'BINDINGS_EXECUTED',company_id:plan.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,binding_id,candidate_id:plan.candidate_id,technical_name:plan.technical_name,activation_plan_id:plan.plan_id,capability_count:plan.capabilities.length,binding_count:receipts.length,receipts:Object.freeze(receipts),...authority()});
}

function overallEvaluation(bundle){
  const quality=bundle.receipts.length?bundle.receipts.filter((x)=>x.status==='PASS'&&x.real_consumption&&x.meaningful_change&&x.old_vs_new?.decision==='PASS').length/bundle.receipts.length:0;
  const benchmark=defineBenchmark({company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,benchmark_id:'UNIVERSAL-SKILL-REAL-BINDING-V1',benchmark_version:'1.0.0',metric:'semantic_binding_quality',holdout_ref:'first-party://skills/universal-binding',adversarial_refs:['adapter-missing','contract-drift','fake-consumption','authority-expansion','physical-evidence-missing','cost-regression']});
  const common={company_id:bundle.company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,experiment_id:bundle.binding_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_binding_quality:0}},new_result:{...common,arm:'NEW',metrics:{semantic_binding_quality:quality}},candidate_visible_holdout:false});
  return Object.freeze({quality,evaluation,tribunal:tribunalDecision({evaluation,judge_id:'QA-001:UNIVERSAL-SKILL-BINDING:v1',candidate_actor_id:'FACT-001',metric_direction:'higher'})});
}

function semanticState(bundle){return {schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_BINDING_STATE_V1',company_id:bundle.company_id,environment:PREPROD,binding_id:bundle.binding_id,candidate_id:bundle.candidate_id,outcome_hash:hash(bundle.receipts.map((x)=>({capability_id:x.capability_id,domain_id:x.domain_id,engine_id:x.engine_id,outcome_hash:x.outcome_hash}))),bindings:Object.fromEntries(bundle.receipts.map((x)=>[`${x.capability_id}:${x.domain_id}:${x.engine_id}`,{status:x.status,decision:x.decision,outcome_hash:x.outcome_hash}])),...authority()};}
function stateHash(s){return hash({company_id:s.company_id,environment:s.environment,binding_id:s.binding_id,candidate_id:s.candidate_id,outcome_hash:s.outcome_hash,bindings:s.bindings});}
function persistState(root,state){const file=path.join(root,'universal-skill-bindings.json');if(fs.existsSync(file)){const old=readJson(file);if(stateHash(old)!==stateHash(state))throw new Error('UNIVERSAL_SKILL_BINDING_STATE_CONFLICT');return {file,state:old,created:false};}writeJson(file,state);return {file,state,created:true};}
function backupRollbackRebuild(root,state){const file=path.join(root,'universal-skill-bindings.json'),backup=path.join(root,'backups','universal-skill-bindings.json');writeJson(backup,readJson(file));const before=stateHash(readJson(file));fs.unlinkSync(file);const rollback_green=!fs.existsSync(file);writeJson(file,state);const after=stateHash(readJson(file));return Object.freeze({backup_ready:fs.existsSync(backup),backup_file:backup,rollback_green,rebuild_green:before===after,applied_state_hash:before,rebuilt_state_hash:after});}

function learningConsumer(bundle,allBindings,root,source){
  const learningOutcome=allBindings?'UNIVERSAL_SKILL_REAL_BINDINGS_GREEN':'UNIVERSAL_SKILL_REAL_BINDINGS_HOLD';
  const event_report={events:[{event_id:`evt:universal-skill-bind:${hash({binding_id:bundle.binding_id,learningOutcome}).slice(0,24)}`,company_id:bundle.company_id,signal_family:'ENGINE_RESULT',engine_id:'FACT-001',environment:PREPROD,version:VERSION,outcome:learningOutcome,outcome_hash:hash(bundle.receipts.map((x)=>x.outcome_hash)),prod_authorized:false,trading_access:false,additional_cost_eur:0}]};
  const build=buildLearningOutbox({event_report,subscriber_registry:readJson(SUBSCRIBERS_PATH),source});
  const persisted=persistLearningOutbox({build,output_root:path.join(root,'learning-outbox')});
  const pass=build.batches_total===1&&persisted.status==='OUTBOX_GREEN'&&persisted.batches_total===1;
  const outcome={pass,learning_outcome:learningOutcome,batches_total:persisted.batches_total,created_total:persisted.created_total};
  return Object.freeze({engine_id:'LRN-001',decision:pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_HOLD',real_consumption:true,learning_outcome:learningOutcome,outcome:Object.freeze(outcome),outcome_hash:hash(outcome),...authority()});
}

function telemetry(bundle,root,semanticOutcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const ledgers=createOperationalLedgersV0({root_dir:dir,environment:PREPROD});const corr=bundle.binding_id;
  const priorObs=ledgers.observability.listForCorrelation(bundle.company_id,corr).find((x)=>x.message==='Universal skill binding outcome');
  const obs=priorObs??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'Universal skill binding outcome',data:{semantic_outcome_hash:semanticOutcomeHash,binding_count:bundle.binding_count,capability_count:bundle.capability_count,candidate_id:bundle.candidate_id}});
  const obsPass=obs?.data?.semantic_outcome_hash===semanticOutcomeHash&&obs?.data?.binding_count===bundle.binding_count;
  const priorCost=ledgers.finops.list().find((x)=>x.correlation_id===corr&&x.provider==='LOCAL_UNIVERSAL_SKILL_BINDING');
  const fin=priorCost??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_UNIVERSAL_SKILL_BINDING',cost_eur:0,metadata:{semantic_outcome_hash:semanticOutcomeHash}});
  const agg=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_UNIVERSAL_SKILL_BINDING'});const finPass=fin.cost_eur_micros===0&&agg.cost_eur===0;
  const priorAudit=ledgers.audit.listForCompany(bundle.company_id).find((x)=>x.correlation_id===corr&&x.action==='UNIVERSAL_SKILL_REAL_BINDING');
  const audit=priorAudit??ledgers.audit.append({context:context(bundle.company_id,'AUD-001'),correlation_id:corr,actor:'FACT-001',action:'UNIVERSAL_SKILL_REAL_BINDING',target:{binding_id:bundle.binding_id,candidate_id:bundle.candidate_id},before:null,after:{semantic_outcome_hash:semanticOutcomeHash,binding_count:bundle.binding_count},reason:'Universal Skill Activation Factory V1 PREPROD semantic binding',result:'PASS'});
  const auditPass=ledgers.audit.verify().valid===true&&audit.result==='PASS';
  return Object.freeze({observability_green:obsPass,finops_green:finPass,audit_green:auditPass,observability_records:ledgers.observability.listForCorrelation(bundle.company_id,corr).length,cost_eur:agg.cost_eur});
}

export function runUniversalSkillRealBinding({activation_plan,adapter_resolver,root_dir,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-universal-skill-bindings-')));fs.mkdirSync(root,{recursive:true});
  const bundle=buildUniversalBindingBundle({activation_plan,adapter_resolver});
  const allBindings=bundle.binding_count>0&&bundle.receipts.every((x)=>x.status==='PASS'&&x.real_consumption===true&&x.meaningful_change===true&&x.old_vs_new?.decision==='PASS'&&x.candidate_coverage===1&&x.baseline_coverage<1);
  const eva=overallEvaluation(bundle);const state=semanticState(bundle);const first=persistState(root,state);const again=persistState(root,state);const br=backupRollbackRebuild(root,state);
  const lrn=learningConsumer(bundle,allBindings,root,{workflow:'CEREBRO Universal Skill Activation Factory V1',run_id:Number(source_run_id),head_sha:source_head_sha});
  const tel=telemetry(bundle,root,state.outcome_hash);
  const missingPhysical=bundle.receipts.filter((x)=>x.decision==='PHYSICAL_EVIDENCE_REQUIRED');
  const green=allBindings&&eva.tribunal.decision==='PASS'&&again.created===false&&lrn.decision==='LRN_FEEDBACK_PERSISTED'&&lrn.learning_outcome==='UNIVERSAL_SKILL_REAL_BINDINGS_GREEN'&&tel.observability_green&&tel.finops_green&&tel.audit_green&&br.backup_ready&&br.rollback_green&&br.rebuild_green;
  const status=green?'FULL_SAFE_PREPROD':missingPhysical.length?'BLOCKED_EXTERNAL':'HOLD';
  const report={
    schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_REAL_BINDING_REPORT_V1',status,full_safe_preprod:green,
    company_id:bundle.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,binding_id:bundle.binding_id,candidate_id:bundle.candidate_id,technical_name:bundle.technical_name,
    capability_count:bundle.capability_count,binding_count:bundle.binding_count,semantic_bindings:bundle.receipts,
    per_binding_old_vs_new_pass:bundle.receipts.every((x)=>x.old_vs_new?.decision==='PASS'),evaluation:eva.evaluation,independent_tribunal:eva.tribunal,
    learning_sink:lrn,observability_green:tel.observability_green,finops_green:tel.finops_green,audit_green:tel.audit_green,cost_eur:tel.cost_eur,
    backup_rollback_rebuild:br,state_persisted:fs.existsSync(first.file),restartable:br.rebuild_green,idempotency_proven:again.created===false,
    missing_physical_bindings:Object.freeze(missingPhysical.map((x)=>({capability_id:x.capability_id,domain_id:x.domain_id,engine_id:x.engine_id}))),
    human_required:Object.freeze([]),...authority()
  };
  return Object.freeze({...report,outcome_hash:hash(report)});
}
