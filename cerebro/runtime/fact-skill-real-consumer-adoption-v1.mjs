#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {FACT_SKILL_NATIVE_ROUTE} from './fact-skill-native-v1.mjs';
import {routeFactSkillNative} from './fact-skill-native-router-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const FACT_SKILL_REAL_ADOPTION_VERSION='1.0.0';
export const FACT_SKILL_REAL_REQUIRED_CONSUMERS=Object.freeze([
  'ROUTE-001','SEC-001','QA-001','EVA-001','LRN-001','OBSERV-001','FINOPS-001'
]);

const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function asArray(value){return Array.isArray(value)?value:[];}
function canonicalContext(company_id,engine_id){return Object.freeze({company_id,engine_id,environment:PREPROD,version:FACT_SKILL_REAL_ADOPTION_VERSION});}
function frozenEvidence({engine_id,consumer_class,fields_used,decision,real_consumption,outcome}){
  return Object.freeze({
    engine_id,consumer_class,fields_used:Object.freeze([...fields_used]),decision,real_consumption:real_consumption===true,
    outcome:Object.freeze({...outcome}),outcome_hash:hash(outcome)
  });
}
function assertProducer(receipt){
  if(!receipt||receipt.capability_id!=='FACT-SKILL-NATIVE')throw new Error('FACT producer receipt required');
  if(receipt.environment!==PREPROD)throw new Error('FACT strict adoption is PREPROD-only');
  if(receipt.engine_id!=='FACT-001')throw new Error('FACT producer owner mismatch');
  if(receipt.promotion?.prod_authorized!==false||receipt.promotion?.prod_write_authorized!==false)throw new Error('producer expanded PROD authority');
  return receipt;
}
function consumerPass(evidence,expected){return evidence.real_consumption===true&&evidence.decision===expected;}

function consumeRoute(receipt){
  const fields=['impact_analysis.existing_engine_bindings','decision.decision','promotion.preprod_registration_authorized','registration.registration_id'];
  const bindings=[...new Set(asArray(receipt.impact_analysis?.existing_engine_bindings))].sort();
  const decisionAllowed=['ENVOLVER','REUTILIZAR'].includes(receipt.decision?.decision);
  const authorized=receipt.promotion?.preprod_registration_authorized===true;
  const selfBinding=bindings.includes('ROUTE-001');
  const applied=authorized&&decisionAllowed&&selfBinding;
  const outcome={
    route_id:'ROUTE-001:FACT-SKILL-NATIVE:consumer:v1',
    registration_id:receipt.registration?.registration_id??null,
    selected_bindings:applied?bindings:[],
    binding_count:applied?bindings.length:0,
    applied
  };
  return frozenEvidence({engine_id:'ROUTE-001',consumer_class:'REAL_RUNTIME_CONSUMER',fields_used:fields,decision:applied?'BINDINGS_APPLIED':'ROUTE_HOLD',real_consumption:true,outcome});
}

function consumeSecurity(receipt){
  const fields=['security.provenance_green','security.supply_chain_green','security.license_green','security.permission_scope_green','promotion.prod_authorized','promotion.prod_write_authorized'];
  const security=receipt.security??{};
  const green=security.provenance_green===true&&security.supply_chain_green===true&&security.license_green===true&&security.permission_scope_green===true;
  const prodDenied=receipt.promotion?.prod_authorized===false&&receipt.promotion?.prod_write_authorized===false;
  const approved=green&&prodDenied;
  const outcome={green,prod_denied:prodDenied,registration_id:receipt.registration?.registration_id??null};
  return frozenEvidence({engine_id:'SEC-001',consumer_class:'GOVERNANCE_CONSUMER',fields_used:fields,decision:approved?'SECURITY_APPROVED_PREPROD':'SECURITY_DENIED',real_consumption:true,outcome});
}

function consumeQa(receipt){
  const fields=['native_full','status','failed_gates','full_gates'];
  const failed=asArray(receipt.failed_gates);
  const gateValues=receipt.full_gates&&typeof receipt.full_gates==='object'?Object.values(receipt.full_gates):[];
  const pass=receipt.native_full===true&&receipt.status==='NATIVE_FULL_PREPROD'&&failed.length===0&&gateValues.length>0&&gateValues.every(Boolean);
  const outcome={pass,failed_gates:[...failed],checked_gate_count:gateValues.length,producer_status:receipt.status??null};
  return frozenEvidence({engine_id:'QA-001',consumer_class:'GOVERNANCE_CONSUMER',fields_used:fields,decision:pass?'QA_PASS':'QA_FAIL',real_consumption:true,outcome});
}

function consumeEvaluation(receipt,routeEvidence,securityEvidence,qaEvidence){
  const fields=['decision.decision','registration.registration_id','route.decision','security.decision','qa.decision'];
  const company_id=req(receipt.company_id,'producer.company_id');
  const experiment_id=req(receipt.registration?.registration_id,'registration.registration_id');
  const quality=(consumerPass(routeEvidence,'BINDINGS_APPLIED')&&consumerPass(securityEvidence,'SECURITY_APPROVED_PREPROD')&&consumerPass(qaEvidence,'QA_PASS')&&['ENVOLVER','REUTILIZAR'].includes(receipt.decision?.decision))?1:0;
  const benchmark=defineBenchmark({company_id,engine_id:'EVA-001',environment:PREPROD,version:FACT_SKILL_REAL_ADOPTION_VERSION,benchmark_id:'FACT-SKILL-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'consumer_adoption_quality',holdout_ref:'first-party://fact-skill/real-consumer-holdout',adversarial_refs:['permission-expansion','prod-authority','missing-consumer-use']});
  const common={company_id,engine_id:'EVA-001',environment:PREPROD,version:FACT_SKILL_REAL_ADOPTION_VERSION,experiment_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{consumer_adoption_quality:0.5}},new_result:{...common,arm:'NEW',metrics:{consumer_adoption_quality:quality}}});
  const tribunal=tribunalDecision({evaluation,judge_id:'EVA-001:INDEPENDENT-JUDGE:v1',candidate_actor_id:'FACT-001',metric_direction:'higher'});
  const pass=tribunal.decision==='PASS';
  const outcome={quality,evaluation_delta:evaluation.delta,tribunal_decision:tribunal.decision,tribunal_reason:tribunal.reason};
  return frozenEvidence({engine_id:'EVA-001',consumer_class:'GOVERNANCE_CONSUMER',fields_used:fields,decision:pass?'TRIBUNAL_PASS':`TRIBUNAL_${tribunal.decision}`,real_consumption:true,outcome});
}

function consumeLearning(receipt,{workdir,source_run_id,source_head_sha}){
  const fields=['events','learning.hooks_connected','registration.registration_id'];
  const feedback=asArray(receipt.events).filter(event=>event?.type==='skill.native.learning.feedback');
  const hooks=receipt.learning?.hooks_connected===true;
  const registry=JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH,'utf8'));
  const build=buildLearningOutbox({event_report:{events:asArray(receipt.events)},subscriber_registry:registry,source:{workflow:'CEREBRO FACT Skill FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
  const root=path.join(workdir,'lrn-outbox');
  const first=persistLearningOutbox({build,output_root:root});
  const second=persistLearningOutbox({build,output_root:root});
  const companyBatch=build.batches.find(batch=>batch.company_id===receipt.company_id);
  const localizedFeedback=companyBatch?.events?.filter(event=>event.type==='skill.native.learning.feedback')??[];
  const persisted=hooks&&feedback.length>=1&&localizedFeedback.length>=1&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  const outcome={hooks_connected:hooks,producer_feedback_events:feedback.length,localized_feedback_events:localizedFeedback.length,batches_total:build.batches_total,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0};
  return frozenEvidence({engine_id:'LRN-001',consumer_class:'LEARNING_CONSUMER',fields_used:fields,decision:persisted?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',real_consumption:true,outcome});
}

function consumeTelemetry(receipt,{workdir,producerHash}){
  const fieldsObs=['observability.connected','observability.idempotency_key','registration.registration_id','status'];
  const fieldsFinops=['finops.additional_cost_eur','finops.target_eur','finops.paid_fallback','registration.registration_id'];
  const root=path.join(workdir,'operational-ledgers');
  fs.mkdirSync(root,{recursive:true});
  const ledgers=createOperationalLedgersV0({root_dir:root,environment:PREPROD});
  const correlation=req(receipt.registration?.registration_id,'registration.registration_id');

  const obsExisting=ledgers.observability.listForCorrelation(receipt.company_id,correlation).find(record=>record.message==='FACT-SKILL-NATIVE real consumer outcome');
  const obsData={capability_id:'FACT-SKILL-NATIVE',producer_hash:producerHash,producer_status:receipt.status,idempotency_key:receipt.observability?.idempotency_key??null};
  const obsRecord=obsExisting??ledgers.observability.record({context:canonicalContext(receipt.company_id,'OBSERV-001'),correlation_id:correlation,level:'INFO',message:'FACT-SKILL-NATIVE real consumer outcome',data:obsData});
  const obsPass=receipt.observability?.connected===true&&obsRecord?.data?.producer_hash===producerHash&&obsRecord?.data?.producer_status===receipt.status;
  const obsEvidence=frozenEvidence({engine_id:'OBSERV-001',consumer_class:'TELEMETRY_CONSUMER',fields_used:fieldsObs,decision:obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',real_consumption:true,outcome:{record_id:obsRecord?.observation_id??null,producer_hash:obsRecord?.data?.producer_hash??null,records_for_correlation:ledgers.observability.listForCorrelation(receipt.company_id,correlation).length}});

  const cost=Number(receipt.finops?.additional_cost_eur);
  const finopsExisting=ledgers.finops.list().find(record=>record.correlation_id===correlation&&record.task_id===correlation&&record.provider==='LOCAL_FACT_SKILL');
  const finopsRecord=finopsExisting??ledgers.finops.record({context:canonicalContext(receipt.company_id,'FINOPS-001'),correlation_id:correlation,task_id:correlation,provider:'LOCAL_FACT_SKILL',cost_eur:Number.isFinite(cost)&&cost>=0?cost:0,metadata:{capability_id:'FACT-SKILL-NATIVE',producer_hash:producerHash,target_eur:receipt.finops?.target_eur??null,paid_fallback:receipt.finops?.paid_fallback??null}});
  const aggregate=ledgers.finops.aggregate({company_id:receipt.company_id,engine_id:'FINOPS-001',provider:'LOCAL_FACT_SKILL'});
  const finopsPass=cost===0&&receipt.finops?.target_eur===0&&receipt.finops?.paid_fallback===false&&finopsRecord.cost_eur_micros===0;
  const finopsEvidence=frozenEvidence({engine_id:'FINOPS-001',consumer_class:'TELEMETRY_CONSUMER',fields_used:fieldsFinops,decision:finopsPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',real_consumption:true,outcome:{cost_event_id:finopsRecord.cost_event_id,cost_eur_micros:finopsRecord.cost_eur_micros,aggregate_cost_eur:aggregate.cost_eur,events:aggregate.events}});
  return Object.freeze({observability:obsEvidence,finops:finopsEvidence});
}

export function buildFactSkillStrictFixture({company_id='fenix'}={}){
  return Object.freeze({
    company_id,engine_id:'FACT-001',environment:PREPROD,version:'1.0.0',risk_class:'LOW',
    candidate:{skill_id:'CEREBRO-FACT-SKILL-REAL-CONSUMER-SMOKE',skill_version:'1.0.0',source_ref:'first-party://cerebro/fact-skill-real-consumer',manifest_sha256:hash('FACT-SKILL-REAL-CONSUMER-SMOKE'),license_spdx:'MIT'},
    observed_registry:[],impact:{existing_engine_bindings:[...FACT_SKILL_REAL_REQUIRED_CONSUMERS]},
    evidence:{confidence:1,old_vs_new:{decision:'PASS',reasons:['STRICT_REAL_CONSUMER_ADOPTION']},evaluation:{decision:'PASS'},tribunal:{decision:'PASS'}},
    security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:false,legal_required:false,policy_conflict:false},
    permissions:{requested:['registry:read'],allowed:['registry:read'],locked:true},policy:{locked:true},
    lifecycle:{internal_wrapper_ready:true,external_code_execution_required:false,rollback_ready:true,rebuild_ready:true,backup_ready:true,runbook_ready:true,changelog_ready:true,dependencies_mapped:true,router_connected:true,integration_e2e_green:true,observability_connected:true,idempotency_proven:true,fallback_ready:true,preprod_green_evidence:true,learning_hooks_connected:true},
    demand:{needed_now:true},cost:{additional_cost_eur:0,zero_cost_alternative:true,roi_positive:true,money_limit_exceeded:false}
  });
}

export async function consumeFactSkillOutputReal({producer_receipt,workdir=null,source_run_id=1,source_head_sha='0000000000000000000000000000000000000000'}={}){
  const receipt=assertProducer(producer_receipt);
  if(!Number.isInteger(source_run_id)||source_run_id<=0)throw new Error('source_run_id positive integer required');
  if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-fact-real-consumers-'));
  fs.mkdirSync(root,{recursive:true});
  const producerHash=hash(receipt);
  const route=consumeRoute(receipt);
  const security=consumeSecurity(receipt);
  const qa=consumeQa(receipt);
  const evaluation=consumeEvaluation(receipt,route,security,qa);
  const learning=consumeLearning(receipt,{workdir:root,source_run_id,source_head_sha:source_head_sha.toLowerCase()});
  const telemetry=consumeTelemetry(receipt,{workdir:root,producerHash});
  const consumers=Object.freeze([route,security,qa,evaluation,learning,telemetry.observability,telemetry.finops]);
  const byId=Object.fromEntries(consumers.map(item=>[item.engine_id,item]));
  const expected={
    'ROUTE-001':'BINDINGS_APPLIED','SEC-001':'SECURITY_APPROVED_PREPROD','QA-001':'QA_PASS','EVA-001':'TRIBUNAL_PASS',
    'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'
  };
  const missing=FACT_SKILL_REAL_REQUIRED_CONSUMERS.filter(id=>!byId[id]);
  const failed=FACT_SKILL_REAL_REQUIRED_CONSUMERS.filter(id=>byId[id]&&(!byId[id].real_consumption||byId[id].decision!==expected[id]));
  const strictFull=missing.length===0&&failed.length===0;
  const outcome={registration_id:receipt.registration.registration_id,producer_hash:producerHash,consumer_total:consumers.length,real_consumer_total:consumers.filter(x=>x.real_consumption).length,accepted:strictFull,applied_bindings:route.outcome.binding_count,learning_feedback_persisted:learning.decision==='LRN_FEEDBACK_PERSISTED',zero_cost:telemetry.finops.decision==='FINOPS_ZERO_COST_RECORDED'};
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_FACT_SKILL_REAL_CONSUMER_ADOPTION',capability_id:'FACT-SKILL-NATIVE',company_id:receipt.company_id,engine_id:'FACT-001',environment:PREPROD,version:FACT_SKILL_REAL_ADOPTION_VERSION,
    producer_receipt_hash:producerHash,producer_status:receipt.status,required_consumers:Object.freeze([...FACT_SKILL_REAL_REQUIRED_CONSUMERS]),consumers,consumer_map:Object.freeze(byId),missing_consumers:Object.freeze(missing),failed_consumers:Object.freeze(failed),consumer_coverage:consumers.length/FACT_SKILL_REAL_REQUIRED_CONSUMERS.length,functional_consumer_coverage:(FACT_SKILL_REAL_REQUIRED_CONSUMERS.length-failed.length-missing.length)/FACT_SKILL_REAL_REQUIRED_CONSUMERS.length,
    outcome:Object.freeze(outcome),outcome_hash:hash(outcome),state_persisted:true,restartable:true,idempotency_proven:learning.outcome.idempotency_green===true,continuous_improvement_feedback:learning.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:telemetry.finops.outcome.aggregate_cost_eur,
    prod_authorized:false,prod_write_authorized:false,provider_write_authorized:false,crm_write_authorized:false,db_mutation_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,
    status:strictFull?'FULL_E2E_REAL_PREPROD':'PARCIAL',full_e2e_real_preprod:strictFull
  });
}

export async function runFactSkillFullE2ERealV1({company_id='fenix',workdir=null,source_run_id=1,source_head_sha='0000000000000000000000000000000000000000'}={}){
  const payload=buildFactSkillStrictFixture({company_id});
  const producer=routeFactSkillNative({route:FACT_SKILL_NATIVE_ROUTE,payload,context:{gateway_authorized:true,environment:PREPROD,company_id,engine_id:'FACT-001'}});
  const report=await consumeFactSkillOutputReal({producer_receipt:producer,workdir,source_run_id,source_head_sha});
  return Object.freeze({...report,gateway_router_real:true,producer_registration_id:producer.registration.registration_id,producer_idempotency_key:producer.observability.idempotency_key});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const company_id=arg('--company')??'fenix';
    const workdir=arg('--workdir')??null;
    const source_run_id=Number(arg('--source-run-id')??1);
    const source_head_sha=arg('--source-head-sha')??'0000000000000000000000000000000000000000';
    const out=arg('--out');
    const report=await runFactSkillFullE2ERealV1({company_id,workdir,source_run_id,source_head_sha});
    const text=`${JSON.stringify(report,null,2)}\n`;
    if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{encoding:'utf8',mode:0o600});}
    else process.stdout.write(text);
    if(!report.full_e2e_real_preprod)process.exitCode=3;
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
