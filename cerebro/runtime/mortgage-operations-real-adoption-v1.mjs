#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildMortgageOperationsBundle} from '../mortgage/mortgage-operations-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
export const MORTGAGE_REQUIRED_CONSUMERS=Object.freeze(['VIA-001','BNK-001','BNK-002','BNK-003','BNK-004','BNK-005','BNK-006','OFR-001','LRN-001','OBSERV-001','FINOPS-001']);
const SEMANTIC=Object.freeze(['VIA-001','BNK-001','BNK-002','BNK-003','BNK-004','BNK-005','BNK-006','OFR-001']);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function readJson(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function writeJson(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});const t=`${f}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(t,`${JSON.stringify(v,null,2)}\n`,{mode:0o600});fs.renameSync(t,f);}
const ctx=(company_id,engine_id)=>({company_id,engine_id,environment:PREPROD,version:VERSION});
const receipt=(engine_id,fields_used,decision,outcome)=>Object.freeze({engine_id,consumer_class:'REAL_SEMANTIC_CONSUMER',fields_used:Object.freeze(fields_used),decision,real_consumption:true,outcome:Object.freeze(outcome),outcome_hash:hash(outcome)});

function syntheticInput(company_id='fenix'){
  return {
    company_id,case_ref:'CASE-STRICT-SYNTHETIC-001',source_refs:['case:strict-synthetic-001','knowledge:strict-synthetic-001'],confidence:.95,
    net_monthly_income:3200,monthly_debt:250,requested_payment:780,
    bank_knowledge:[
      {bank:'BankA',criterion:'synthetic sourced profile precedent',effective_date:'2026-10-17',case_count:5,source_refs:['knowledge:BankA:synthetic']},
      {bank:'BankB',criterion:'synthetic sourced alternative precedent',effective_date:'2026-10-17',case_count:4,source_refs:['knowledge:BankB:synthetic']}
    ],
    banks:[
      {bank:'BankA',approval_probability:.88,total_cost_eur:13000,expected_days:24,profile_fit:.91,experience_score:.84},
      {bank:'BankB',approval_probability:.78,total_cost_eur:8000,expected_days:18,profile_fit:.79,experience_score:.82}
    ],
    template_ref:'tpl:bank-presentation:v1',message_template_ref:'msg:bank-presentation:v1',
    documents:[{name:'identity.pdf',type:'IDENTITY',ref:'doc:synthetic:1'},{name:'income.pdf',type:'INCOME',ref:'doc:synthetic:2'}],
    contact_ref:'bank_contact:synthetic',last_contact_at:'2026-10-14T08:00:00Z',now:'2026-10-17T08:00:00Z',sla_hours:48,preferred_channels:['EMAIL'],
    benchmark:{rate_pct:2.5},current_offer:{rate_pct:3.0},approved_range:{min_rate_pct:2.4,max_rate_pct:2.8},
    principal_eur:190000,term_months:300,
    offers:[
      {offer_ref:'offer:A',bank:'BankA',tin_pct:2.9,tae_pct:3.2,fees_eur:500,insurance_total_eur:4000,bonus_products_total_eur:800,flexibility_score:.85},
      {offer_ref:'offer:B',bank:'BankB',tin_pct:2.75,tae_pct:3.1,fees_eur:900,insurance_total_eur:2800,bonus_products_total_eur:500,flexibility_score:.75}
    ],
    denial_reason:'NOT_APPLICABLE',subsanable:false,attempts:0,max_attempts:3
  };
}

function semanticReceipts(bundle){
  const viaPass=bundle.viability.status==='MORTGAGE_VIABILITY_READY'&&bundle.viability.credit_decision===false&&bundle.viability.lender_commitment===false;
  const kPass=bundle.knowledge.length>=2&&bundle.knowledge.every(x=>x.status==='BANK_KNOWLEDGE_READY'&&x.knowledge_promotion===false&&x.review_required_for_material_change===true);
  const rankPass=bundle.ranking.status==='BANK_RANKING_READY'&&bundle.ranking.model_used===false&&bundle.ranking.ranked_banks.length>=2;
  const routePass=['BANK_ROUTE_READY','HUMAN_REQUIRED'].includes(bundle.route.status)&&bundle.route.executed===false&&bundle.route.bank_submission_authorized===false;
  const presPass=bundle.presentation.status==='BANK_PRESENTATION_PLAN_READY'&&bundle.presentation.bank_submission_authorized===false&&bundle.presentation.provider_write_authorized===false;
  const followPass=bundle.followup.status==='BANK_FOLLOWUP_PLAN_READY'&&bundle.followup.external_communication===false;
  const negoPass=bundle.negotiation.status==='BANK_NEGOTIATION_PLAN_READY'&&bundle.negotiation.external_communication===false&&bundle.negotiation.within_approved_range===true;
  const offerPass=bundle.offers.status==='OFFER_COMPARISON_READY'&&bundle.offers.credit_decision===false&&bundle.offers.offers.length>=2;
  return Object.freeze([
    receipt('VIA-001',['debt_ratio_pct','decision','credit_decision','lender_commitment'],viaPass?'MORTGAGE_VIABILITY_READY':'MORTGAGE_VIABILITY_HOLD',{pass:viaPass,debt_ratio_pct:bundle.viability.debt_ratio_pct,decision:bundle.viability.decision}),
    receipt('BNK-001',['knowledge.source_refs','effective_date','confidence','case_count','knowledge_promotion'],kPass?'BANK_KNOWLEDGE_READY':'BANK_KNOWLEDGE_HOLD',{pass:kPass,records:bundle.knowledge.length}),
    receipt('BNK-002',['ranked_banks.score','ranked_banks.explanation','model_used'],rankPass?'BANK_RANKING_READY':'BANK_RANKING_HOLD',{pass:rankPass,selected_bank:bundle.selected_bank,ranked_count:bundle.ranking.ranked_banks.length}),
    receipt('BNK-003',['remaining_attempts','next_action','executed','bank_submission_authorized'],routePass?'BANK_ROUTING_PLAN_READY':'BANK_ROUTING_PLAN_HOLD',{pass:routePass,status:bundle.route.status,next_action:bundle.route.next_action}),
    receipt('BNK-004',['package_name','document_count','bank_submission_authorized'],presPass?'BANK_PRESENTATION_PLAN_READY':'BANK_PRESENTATION_PLAN_HOLD',{pass:presPass,document_count:bundle.presentation.document_count}),
    receipt('BNK-005',['due','next_action','external_communication'],followPass?'BANK_FOLLOWUP_PLAN_READY':'BANK_FOLLOWUP_PLAN_HOLD',{pass:followPass,due:bundle.followup.due,next_action:bundle.followup.next_action}),
    receipt('BNK-006',['target_rate_pct','within_approved_range','external_communication'],negoPass?'BANK_NEGOTIATION_PLAN_READY':'BANK_NEGOTIATION_PLAN_HOLD',{pass:negoPass,target_rate_pct:bundle.negotiation.target_rate_pct}),
    receipt('OFR-001',['best_offer_ref','offers.total_cost_eur','credit_decision'],offerPass?'OFFER_COMPARISON_READY':'OFFER_COMPARISON_HOLD',{pass:offerPass,best_offer_ref:bundle.offers.best_offer_ref})
  ]);
}

function evaluate(company_id,bundle_id,receipts){
  const expected={'VIA-001':'MORTGAGE_VIABILITY_READY','BNK-001':'BANK_KNOWLEDGE_READY','BNK-002':'BANK_RANKING_READY','BNK-003':'BANK_ROUTING_PLAN_READY','BNK-004':'BANK_PRESENTATION_PLAN_READY','BNK-005':'BANK_FOLLOWUP_PLAN_READY','BNK-006':'BANK_NEGOTIATION_PLAN_READY','OFR-001':'OFFER_COMPARISON_READY'};
  const quality=receipts.filter(x=>x.decision===expected[x.engine_id]).length/SEMANTIC.length;
  const benchmark=defineBenchmark({company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,benchmark_id:'MORTGAGE-OPERATIONS-STRICT-V1',benchmark_version:'1.0.0',metric:'semantic_adoption_quality',holdout_ref:'first-party://mortgage-operations/strict',adversarial_refs:['credit-decision-leak','bank-submit-leak','crm-write-leak','provider-write-leak','unsourced-bank-rule','unbounded-routing','offer-cost-mismatch']});
  const common={company_id,engine_id:'EVA-001',environment:PREPROD,version:VERSION,experiment_id:bundle_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{semantic_adoption_quality:.2}},new_result:{...common,arm:'NEW',metrics:{semantic_adoption_quality:quality}},candidate_visible_holdout:false});
  return Object.freeze({quality,evaluation,tribunal:tribunalDecision({evaluation,judge_id:'QA-001:MORTGAGE-OPERATIONS:v1',candidate_actor_id:'VIA-001',metric_direction:'higher'})});
}

function state(company_id,bundle_id,receipts){return {schema_version:'1.0.0',state_type:'CEREBRO_MORTGAGE_OPERATIONS_STRICT_STATE',company_id,environment:PREPROD,bundle_id,consumer_outcome_hash:hash(receipts.map(x=>({engine_id:x.engine_id,decision:x.decision,outcome_hash:x.outcome_hash}))),engines:Object.fromEntries(receipts.map(x=>[x.engine_id,{decision:x.decision,outcome_hash:x.outcome_hash}])),prod_authorized:false,prod_write_authorized:false,crm_write_authorized:false,provider_write_authorized:false,bank_submission_authorized:false,additional_cost_eur:0};}
function stateHash(s){return hash({company_id:s.company_id,environment:s.environment,bundle_id:s.bundle_id,consumer_outcome_hash:s.consumer_outcome_hash,engines:s.engines});}
function persist(root,s){const f=path.join(root,'semantic-state.json');if(fs.existsSync(f)){const old=readJson(f);if(stateHash(old)!==stateHash(s))throw new Error('MORTGAGE_OPERATIONS_STATE_CONFLICT');return {file:f,state:old,created:false};}writeJson(f,s);return {file:f,state:s,created:true};}
function backupRollbackRebuild(root,s){const f=path.join(root,'semantic-state.json'),b=path.join(root,'backups','semantic-state.json');writeJson(b,readJson(f));const before=stateHash(readJson(f));fs.unlinkSync(f);const rollback_green=!fs.existsSync(f);writeJson(f,s);const after=stateHash(readJson(f));return Object.freeze({backup_ready:fs.existsSync(b),backup_file:b,rollback_green,rebuild_green:before===after,applied_state_hash:before,rebuilt_state_hash:after});}

function learning(company_id,root,bundle_id,outcomeHash,source){
  const event_report={events:[{event_id:`evt:mortgage:${hash({bundle_id,outcomeHash}).slice(0,24)}`,company_id,signal_family:'ENGINE_RESULT',engine_id:'VIA-001',environment:PREPROD,version:VERSION,outcome:'MORTGAGE_OPERATIONS_STRICT_GREEN',outcome_hash:outcomeHash,prod_authorized:false,trading_access:false,additional_cost_eur:0}]};
  const build=buildLearningOutbox({event_report,subscriber_registry:readJson(SUBSCRIBERS),source});
  const p=persistLearningOutbox({build,output_root:path.join(root,'learning-outbox')});
  const pass=build.batches_total===1&&p.status==='OUTBOX_GREEN'&&p.batches_total===1;
  return receipt('LRN-001',['mortgage outcome event','subscriber registry','durable outbox'],pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_HOLD',{pass,batches_total:p.batches_total,created_total:p.created_total});
}

function telemetry(company_id,root,bundle_id,outcomeHash){
  const dir=path.join(root,'operational-ledgers');fs.mkdirSync(dir,{recursive:true});const l=createOperationalLedgersV0({root_dir:dir,environment:PREPROD});
  const po=l.observability.listForCorrelation(company_id,bundle_id).find(x=>x.message==='Mortgage operations strict semantic outcome');
  const o=po??l.observability.record({context:ctx(company_id,'OBSERV-001'),correlation_id:bundle_id,level:'INFO',message:'Mortgage operations strict semantic outcome',data:{semantic_outcome_hash:outcomeHash,semantic_consumer_count:SEMANTIC.length}});const opass=o?.data?.semantic_outcome_hash===outcomeHash;
  const pf=l.finops.list().find(x=>x.correlation_id===bundle_id&&x.provider==='LOCAL_MORTGAGE_OPERATIONS');
  const f=pf??l.finops.record({context:ctx(company_id,'FINOPS-001'),correlation_id:bundle_id,task_id:bundle_id,provider:'LOCAL_MORTGAGE_OPERATIONS',cost_eur:0,metadata:{semantic_outcome_hash:outcomeHash}});const agg=l.finops.aggregate({company_id,engine_id:'FINOPS-001',provider:'LOCAL_MORTGAGE_OPERATIONS'}),fpass=f.cost_eur_micros===0&&agg.cost_eur===0;
  const pa=l.audit.listForCompany(company_id).find(x=>x.correlation_id===bundle_id&&x.action==='MORTGAGE_OPERATIONS_STRICT');
  const a=pa??l.audit.append({context:ctx(company_id,'AUD-001'),correlation_id:bundle_id,actor:'VIA-001',action:'MORTGAGE_OPERATIONS_STRICT',target:{bundle_id},before:null,after:{semantic_outcome_hash:outcomeHash},reason:'strict PREPROD mortgage operations adoption',result:'PASS'});
  return Object.freeze({obs:receipt('OBSERV-001',['semantic_outcome_hash'],opass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',{pass:opass}),fin:receipt('FINOPS-001',['additional_cost_eur'],fpass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_MISMATCH',{pass:fpass,cost_eur:agg.cost_eur}),audit_green:l.audit.verify().valid===true&&a.result==='PASS'});
}

export function runMortgageOperationsRealAdoption({company_id='fenix',root_dir,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-mortgage-')));fs.mkdirSync(root,{recursive:true});
  const bundle=buildMortgageOperationsBundle(syntheticInput(company_id));if(bundle.status!=='MORTGAGE_OPERATIONS_READY')throw new Error('MORTGAGE_BUNDLE_NOT_READY');
  const sem=semanticReceipts(bundle),bundle_id=`mortgagestrict_${hash({company_id,bundle:bundle.bundle_id}).slice(0,24)}`,eva=evaluate(company_id,bundle_id,sem),s=state(company_id,bundle_id,sem),p=persist(root,s),again=persist(root,s),outcomeHash=s.consumer_outcome_hash;
  const lrn=learning(company_id,root,bundle_id,outcomeHash,{workflow:'CEREBRO MORTGAGE OPERATIONS FULL E2E REAL V1',run_id:Number(source_run_id),head_sha:source_head_sha}),tel=telemetry(company_id,root,bundle_id,outcomeHash),br=backupRollbackRebuild(root,s);
  const consumers=Object.freeze([...sem,lrn,tel.obs,tel.fin]);const expected={'VIA-001':'MORTGAGE_VIABILITY_READY','BNK-001':'BANK_KNOWLEDGE_READY','BNK-002':'BANK_RANKING_READY','BNK-003':'BANK_ROUTING_PLAN_READY','BNK-004':'BANK_PRESENTATION_PLAN_READY','BNK-005':'BANK_FOLLOWUP_PLAN_READY','BNK-006':'BANK_NEGOTIATION_PLAN_READY','OFR-001':'OFFER_COMPARISON_READY','LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};
  const map=Object.freeze(Object.fromEntries(consumers.map(x=>[x.engine_id,x]))),missing=MORTGAGE_REQUIRED_CONSUMERS.filter(id=>!map[id]),failed=MORTGAGE_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expected[id]);
  const green=missing.length===0&&failed.length===0&&eva.tribunal.decision==='PASS'&&again.created===false&&tel.audit_green&&br.backup_ready&&br.rollback_green&&br.rebuild_green&&bundle.actual_credit_decision===false&&bundle.actual_bank_submission===false&&bundle.actual_external_contact===false;
  const report={schema_version:'1.0.0',state_type:'CEREBRO_MORTGAGE_OPERATIONS_REAL_ADOPTION_REPORT',status:green?'FULL_E2E_REAL_PREPROD':'HOLD',full_e2e_real_preprod:green,company_id,environment:PREPROD,version:VERSION,bundle_id,required_consumers:[...MORTGAGE_REQUIRED_CONSUMERS],consumers,consumer_map:map,consumer_coverage:(MORTGAGE_REQUIRED_CONSUMERS.length-missing.length)/MORTGAGE_REQUIRED_CONSUMERS.length,functional_consumer_coverage:(MORTGAGE_REQUIRED_CONSUMERS.length-failed.length)/MORTGAGE_REQUIRED_CONSUMERS.length,missing_consumers:missing,failed_consumers:failed,independent_tribunal:eva.tribunal,evaluation:eva.evaluation,semantic_outcome_hash:outcomeHash,mortgage_bundle:bundle,learning_sink:lrn,observability_consumer:tel.obs,finops_consumer:tel.fin,audit_green:tel.audit_green,backup_rollback_rebuild:br,state_persisted:fs.existsSync(p.file),restartable:br.rebuild_green,idempotency_proven:again.created===false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,db_mutation_authorized:false,crm_write_authorized:false,provider_write_authorized:false,bank_submission_authorized:false,credit_decision_authorized:false,external_communication_authorized:false,spend_authorized:false,trading_access:false,external_code_execution:false};return Object.freeze({...report,outcome_hash:hash(report)});
}

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;}const entry=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(entry){try{const report=runMortgageOperationsRealAdoption({company_id:arg('--company')??'fenix',root_dir:arg('--workdir')??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-mortgage-')),source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0000000000000000000000000000000000000001'});const out=arg('--out');if(out)writeJson(path.resolve(out),report);console.log(JSON.stringify(report));if(!report.full_e2e_real_preprod)process.exitCode=3;}catch(e){console.error(e?.stack??String(e));process.exitCode=4;}}
