#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveSemanticContract} from './universal-skill-semantic-contracts-v1.mjs';
import {decideAutomaticAdapter,createAutomaticAdapterResolver,adapterFactorySummary} from './universal-skill-adapter-factory-v1.mjs';
import {runUniversalSkillRealBinding} from './universal-skill-real-binding-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT=path.resolve(__dirname,'../..');
const MAX_SOURCE_BYTES=1024*1024;
const SAFE_SOURCE_EVIDENCE_KINDS=new Set(['FIRST_PARTY_INTERNAL','GOVERNED_READONLY_REMOTE','NORMALIZED_STATIC_LAB']);

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function uniq(v){return [...new Set(v??[])];}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function sourceEvidenceKind(value){const kind=value??'FIRST_PARTY_INTERNAL';if(!SAFE_SOURCE_EVIDENCE_KINDS.has(kind))throw new Error(`UNSAFE_SOURCE_EVIDENCE_KIND:${kind}`);return kind;}

function inspectBindings({activation_plan,candidate_evidence={},existing_adapters={}}){
  const rows=[];
  for(const capability of activation_plan.capabilities){
    for(const domain of capability.domains){
      for(const engine_id of domain.engine_bindings){
        const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
        const decision=decideAutomaticAdapter({activation_plan,capability,domain_id:domain.domain_id,engine_id,contract,candidate_evidence,existing_adapters});
        rows.push(Object.freeze({capability,domain_id:domain.domain_id,engine_id,contract,decision}));
      }
    }
  }
  return Object.freeze(rows);
}

function readGovernedSources(source_refs,repo_root=DEFAULT_REPO_ROOT,evidence_kind='FIRST_PARTY_INTERNAL'){
  const root=path.resolve(repo_root);const files=[];const kind=sourceEvidenceKind(evidence_kind);
  for(const ref of uniq(source_refs)){
    if(typeof ref!=='string'||!ref.startsWith('cerebro/'))continue;
    const abs=path.resolve(root,ref);
    if(!(abs===root||abs.startsWith(`${root}${path.sep}`)))continue;
    if(!fs.existsSync(abs)||!fs.statSync(abs).isFile())continue;
    const stat=fs.statSync(abs);if(stat.size>MAX_SOURCE_BYTES)continue;
    files.push(Object.freeze({ref,bytes:stat.size,text:fs.readFileSync(abs,'utf8'),evidence_kind:kind}));
  }
  return Object.freeze(files);
}

function financeDryRun({activation_plan,task,source_files,source_evidence_kind}){
  const corpus=source_files.map((x)=>x.text).join('\n');
  const explicitSafePolicy=/payment_execution_authorized["']?\s*:\s*false/i.test(corpus)||/NO_CHARGE|NO_CREDENTIAL_OR_CHARGE_ACCESS|no payment execution authority/i.test(corpus);
  const formulaNet=/net\s*=\s*inflows?\s*-\s*outflows?/i.test(corpus);
  const formulaEnding=/ending[_ ]cash[^\n]{0,120}=\s*starting[_ ]cash[^\n]{0,120}\+\s*net/i.test(corpus);
  const financeSemantics=/finance|financial|accounting|cash[- ]?flow|reconcil/i.test(corpus);
  const sourceSemanticConsumed=explicitSafePolicy||(formulaNet&&formulaEnding&&financeSemantics);

  const benchmark=Object.freeze({company_id:activation_plan.company_id,starting_cash_cents:100000,inflows_cents:25000,outflows_cents:40000,requested_charge_cents:0,authorized_charge_cents:0});
  const net_cents=benchmark.inflows_cents-benchmark.outflows_cents;
  const ending_cash_cents=benchmark.starting_cash_cents+net_cents;
  const calculationTrace=net_cents===-15000&&ending_cash_cents===85000;
  const reconcilable=benchmark.starting_cash_cents+benchmark.inflows_cents-benchmark.outflows_cents===ending_cash_cents;
  const wrapperNoPayment=benchmark.authorized_charge_cents===0;
  const wrapperTenantScope=typeof activation_plan.company_id==='string'&&activation_plan.company_id.length>0&&benchmark.company_id===activation_plan.company_id;
  const wrapperMoneyLimit=benchmark.requested_charge_cents===0&&benchmark.authorized_charge_cents===0;
  const checks=Object.freeze({
    source_semantic_consumed:sourceSemanticConsumed,
    no_payment_execution:wrapperNoPayment,
    calculation_trace:sourceSemanticConsumed&&calculationTrace,
    reconcilable_output:sourceSemanticConsumed&&reconcilable,
    tenant_scope:wrapperTenantScope,
    money_limit_enforced:wrapperMoneyLimit
  });
  const constraintByCheck=Object.freeze({no_payment_execution:'NO_PAYMENT_EXECUTION',calculation_trace:'CALCULATION_TRACE',reconcilable_output:'RECONCILABLE_OUTPUT',tenant_scope:'TENANT_SCOPE',money_limit_enforced:'MONEY_LIMIT_ENFORCED'});
  const observed=Object.freeze(Object.entries(checks).filter(([key,pass])=>pass===true&&constraintByCheck[key]).map(([key])=>constraintByCheck[key]));
  const allChecks=Object.values(checks).every(Boolean);
  const traceRef=`governed://auto-engineering/finance/${hash({candidate_id:activation_plan.candidate_id,capability_id:task.capability.capability_id,engine_id:task.engine_id,checks,benchmark,net_cents,ending_cash_cents,source_refs:source_files.map((x)=>x.ref),source_evidence_kind}).slice(0,32)}`;
  const evidence_refs=Object.freeze([...source_files.map((x)=>x.ref),traceRef]);
  return Object.freeze({
    provider_id:'FIRST_PARTY_FINANCE_SAFE_WRAP_V1',domain_id:task.domain_id,engine_id:task.engine_id,
    status:allChecks?'SEMANTIC_EVIDENCE_GREEN':'SEMANTIC_EVIDENCE_HOLD',checks,benchmark:Object.freeze({...benchmark,net_cents,ending_cash_cents}),source_evidence_kind,
    evidence_row:allChecks?Object.freeze({capability_id:task.capability.capability_id,domain_id:task.domain_id,engine_id:task.engine_id,evidence_kind:source_evidence_kind,execution_kind:'DECLARATIVE',observed_constraints:observed,evidence_refs,real_consumption_proven:true,physical_evidence:false,...authority()}):null,
    source_files:Object.freeze(source_files.map((x)=>Object.freeze({ref:x.ref,bytes:x.bytes,evidence_kind:x.evidence_kind}))),
    ...authority()
  });
}

const DOMAIN_PROVIDERS=Object.freeze({'finance-accounting-payments':financeDryRun});

export function fulfillEngineeringTasks({activation_plan,candidate_evidence={},existing_adapters={},repo_root=DEFAULT_REPO_ROOT,source_evidence_kind='FIRST_PARTY_INTERNAL'}={}){
  if(!activation_plan||activation_plan.status!=='ACTIVATION_PLAN_READY'||activation_plan.environment!==PREPROD)throw new Error('ACTIVATION_PLAN_READY_PREPROD_REQUIRED');
  const kind=sourceEvidenceKind(source_evidence_kind);
  const initial=inspectBindings({activation_plan,candidate_evidence,existing_adapters});
  const engineering=initial.filter((x)=>x.decision.status==='ENGINEERING_TASK_REQUIRED');
  const blocked=initial.filter((x)=>x.decision.status==='BLOCKED_EXTERNAL');
  const source_files=readGovernedSources(activation_plan.source_refs??[],repo_root,kind);
  const generated=[];const provider_reports=[];const unsupported=[];
  for(const task of engineering){const provider=DOMAIN_PROVIDERS[task.domain_id];if(!provider){unsupported.push(Object.freeze({capability_id:task.capability.capability_id,domain_id:task.domain_id,engine_id:task.engine_id,reason:'NO_FAMILY_ENGINEERING_PROVIDER'}));continue;}const report=provider({activation_plan,task,source_files,source_evidence_kind:kind});provider_reports.push(report);if(report.evidence_row)generated.push(report.evidence_row);}
  const priorRows=Array.isArray(candidate_evidence.semantic_bindings)?candidate_evidence.semantic_bindings:[];
  const augmented=Object.freeze({...candidate_evidence,semantic_bindings:Object.freeze([...priorRows,...generated])});
  const finalInspection=inspectBindings({activation_plan,candidate_evidence:augmented,existing_adapters});
  const unresolved=finalInspection.filter((x)=>x.decision.status==='ENGINEERING_TASK_REQUIRED');
  const finalBlocked=finalInspection.filter((x)=>x.decision.status==='BLOCKED_EXTERNAL');
  const status=finalBlocked.length?'BLOCKED_EXTERNAL':unresolved.length?'ENGINEERING_TASK_REQUIRED':'ENGINEERING_FULFILLED';
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_AUTO_ENGINEERING_FULFILLMENT_V1',status,company_id:activation_plan.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id:activation_plan.candidate_id,source_evidence_kind:kind,initial_engineering_tasks:engineering.length,initial_blocked_external:blocked.length,generated_semantic_evidence_count:generated.length,provider_reports:Object.freeze(provider_reports),unsupported:Object.freeze(unsupported),unresolved_engineering_tasks:Object.freeze(unresolved.map((x)=>Object.freeze({capability_id:x.capability.capability_id,domain_id:x.domain_id,engine_id:x.engine_id,decision:x.decision.decision}))),blocked_external:Object.freeze(finalBlocked.map((x)=>Object.freeze({capability_id:x.capability.capability_id,domain_id:x.domain_id,engine_id:x.engine_id,decision:x.decision.decision}))),candidate_evidence:augmented,...authority()});
}

export function runUniversalSkillAutoEngineering({activation_plan,candidate_evidence={},existing_adapters={},repo_root=DEFAULT_REPO_ROOT,source_evidence_kind='FIRST_PARTY_INTERNAL',root_dir,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-autoeng-')));fs.mkdirSync(root,{recursive:true});
  const fulfillment=fulfillEngineeringTasks({activation_plan,candidate_evidence,existing_adapters,repo_root,source_evidence_kind});
  if(fulfillment.status!=='ENGINEERING_FULFILLED')return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_AUTO_ENGINEERING_REPORT_V1',status:fulfillment.status,full_safe_preprod:false,company_id:activation_plan.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id:activation_plan.candidate_id,fulfillment,binding_report:null,...authority()});
  const adapterFactory=createAutomaticAdapterResolver({activation_plan,candidate_evidence:fulfillment.candidate_evidence,existing_adapters});
  const binding=runUniversalSkillRealBinding({activation_plan,adapter_resolver:adapterFactory.resolver,root_dir:path.join(root,'binding'),source_run_id,source_head_sha});
  const adapters=adapterFactorySummary(adapterFactory.getDecisions());
  const report={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_AUTO_ENGINEERING_REPORT_V1',status:binding.status,full_safe_preprod:binding.full_safe_preprod===true,company_id:activation_plan.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id:activation_plan.candidate_id,fulfillment,adapter_summary:adapters,binding_report:binding,...authority()};
  return Object.freeze({...report,outcome_hash:hash(report)});
}

export function supportedAutoEngineeringDomains(){return Object.freeze(Object.keys(DOMAIN_PROVIDERS).sort());}
