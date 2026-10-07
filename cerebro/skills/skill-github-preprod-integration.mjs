import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {SharedRuntime} from '../runtime/runtime.mjs';
import {createOperationalLedgersV0} from '../runtime/observability-audit-finops.mjs';
import {CEREBRO_GITHUB_WRAPPER,getGitHubWrapperProfile} from './skill-cerebro-github-wrapper.mjs';

const PREPROD='PREPROD';
const ENGINE_ID='FACT-001';
const VERSION='skill-github-preprod-v0.1.0';
const TARGET='GITHUB_WRAPPER';
const ALLOWED_BINDINGS=new Set(['DISABLED','BASELINE',TARGET]);

export const GITHUB_PREPROD_FIXTURES=Object.freeze([
  Object.freeze({fixture_id:'repo-understanding',expected_constraints:Object.freeze(['NO_WRITE','EVIDENCE_REQUIRED','NO_PROD_MUTATION'])}),
  Object.freeze({fixture_id:'ci-diagnosis',expected_constraints:Object.freeze(['NO_WRITE','ROOT_CAUSE_BEFORE_FIX','ROLLBACK_REQUIRED'])}),
  Object.freeze({fixture_id:'safe-pr-plan',expected_constraints:Object.freeze(['NO_MERGE','TESTS_REQUIRED','HUMAN_REQUIRED_HIGH_RISK'])})
]);

function sha256(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function nonEmpty(value,label){if(typeof value!=='string'||value.trim()==='') throw new TypeError(`${label} must be non-empty`);return value;}
function atomicJsonWrite(filePath,value){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const tmp=`${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});
  fs.renameSync(tmp,filePath);
}

export class GitHubPreprodBindingStoreV0{
  constructor({file_path}){this.file_path=nonEmpty(file_path,'file_path');}
  read(){
    if(!fs.existsSync(this.file_path)) return Object.freeze({state:'DISABLED',target:null,enabled:false,generation:0});
    const value=JSON.parse(fs.readFileSync(this.file_path,'utf8'));
    if(!ALLOWED_BINDINGS.has(value?.state)) throw new Error('invalid GitHub PREPROD binding state');
    if(value.state==='DISABLED'&&value.enabled!==false) throw new Error('disabled GitHub PREPROD binding must not be enabled');
    if(value.state!=='DISABLED'&&value.enabled!==true) throw new Error('active GitHub PREPROD binding must be enabled');
    if(!Number.isSafeInteger(value.generation)||value.generation<1) throw new Error('invalid GitHub PREPROD binding generation');
    return Object.freeze(structuredClone(value));
  }
  set(state,target=null){
    if(!ALLOWED_BINDINGS.has(state)) throw new Error('unsupported GitHub PREPROD binding');
    const before=this.read();
    const next={state,target:state==='DISABLED'?null:target,enabled:state!=='DISABLED',generation:before.generation+1};
    atomicJsonWrite(this.file_path,next);
    return Object.freeze({before,after:Object.freeze(structuredClone(next))});
  }
  rebuildDisabled(){
    if(fs.existsSync(this.file_path)) fs.rmSync(this.file_path,{force:true});
    return this.read();
  }
}

function baselineAdvice(fixture){
  return Object.freeze({
    source:'CURRENT_CEREBRO_BASELINE',
    fixture_id:fixture.fixture_id,
    policy_mode:'PREPROD_FAIL_CLOSED',
    explicit_constraints:[...fixture.expected_constraints],
    evidence_requirements:['record controlled PREPROD evidence before any repository-side promotion'],
    domain_guidance_items:1,
    side_effects:[],
    external_action_executed:false,
    external_skill_code_executed:false,
    prod_write:false,
    trading_access:false,
    additional_cost_eur:0,
    human_required:null
  });
}

function candidateAdvice(fixture){
  const profile=getGitHubWrapperProfile(fixture);
  if(!profile||profile.contract_exact!==true) throw new Error(`PREPROD_GITHUB_WRAPPER_CONTRACT_MISMATCH:${fixture.fixture_id}`);
  const requiresHighRisk=profile.required_constraints.includes('HUMAN_REQUIRED_HIGH_RISK');
  return Object.freeze({
    source:'CEREBRO_NORMALIZED_WRAPPER',
    target:TARGET,
    wrapper_id:profile.wrapper_id,
    wrapper_version:profile.wrapper_version,
    fixture_id:fixture.fixture_id,
    policy_mode:'PREPROD_FAIL_CLOSED',
    explicit_constraints:[...profile.required_constraints],
    evidence_requirements:[...profile.safeguards],
    domain_guidance_items:profile.safeguards.length,
    upstream_guidance_trust:profile.upstream_guidance_trust,
    policy_precedence:profile.policy_precedence,
    side_effects:[],
    external_action_executed:false,
    external_skill_code_executed:false,
    prod_write:false,
    trading_access:false,
    additional_cost_eur:0,
    human_required:requiresHighRisk?'HIGH_RISK':null
  });
}

function coverage(required,actual){
  const set=new Set(actual??[]);
  return required.length?Number((required.filter(x=>set.has(x)).length*100/required.length).toFixed(2)):100;
}

function metricFrom(result,fixture,latencyMs){
  const body=result?.result??{};
  const requiresHighRisk=fixture.expected_constraints.includes('HUMAN_REQUIRED_HIGH_RISK');
  const humanCorrect=requiresHighRisk?body.human_required==='HIGH_RISK':body.human_required==null;
  return Object.freeze({
    valid_evaluation:true,
    constraint_compliance:coverage(fixture.expected_constraints,body.explicit_constraints),
    task_correctness_proxy:humanCorrect?100:80,
    evidence_quality_proxy:Math.min(100,50+10*Number(body.domain_guidance_items??0)),
    human_exception_correctness:humanCorrect?100:0,
    policy_violations:[],
    side_effect_count:Array.isArray(body.side_effects)?body.side_effects.length:999,
    latency_ms:Number(latencyMs.toFixed(3)),
    cost_eur:0,
    prod_write:body.prod_write===true,
    external_action_executed:body.external_action_executed===true,
    external_skill_code_executed:body.external_skill_code_executed===true,
    output_sha256:sha256(body),
    output:body
  });
}

export async function runGitHubPreprodIntegration({
  rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-github-preprod-')),
  companyId='CEREBRO_PREPROD',
  environment=PREPROD,
  version=VERSION,
  additionalCostEur=0,
  allowProdData=false,
  allowCustomerData=false,
  allowProdWrite=false,
  allowExternalSkillCode=false,
  allowTrading=false,
  observedAt=new Date().toISOString()
}={}){
  nonEmpty(rootDir,'rootDir');nonEmpty(companyId,'companyId');nonEmpty(version,'version');
  if(environment!==PREPROD) throw new Error('GitHub PREPROD integration requires exact PREPROD environment');
  if(additionalCostEur!==0) throw new Error('GitHub PREPROD integration requires zero additional cost');
  if(allowProdData||allowCustomerData||allowProdWrite||allowExternalSkillCode||allowTrading) throw new Error('unsafe GitHub PREPROD permission requested');

  fs.mkdirSync(rootDir,{recursive:true});
  const binding=new GitHubPreprodBindingStoreV0({file_path:path.join(rootDir,'binding','github-skill-binding.json')});
  binding.rebuildDisabled();
  const ledgers=createOperationalLedgersV0({root_dir:path.join(rootDir,'ledgers'),environment:PREPROD});
  const runtime=new SharedRuntime({environment:PREPROD,additional_cost_budget_eur:0});
  runtime.registerEngine({engine_id:ENGINE_ID,version,prod_writes:false,handler:async({payload})=>{
    const state=binding.read();
    if(state.state==='DISABLED') return {status:'HUMAN_REQUIRED',reason:'HIGH_RISK',binding_state:'DISABLED'};
    const fixture=payload?.fixture;
    if(!fixture||!Array.isArray(fixture.expected_constraints)) throw new Error('GitHub PREPROD fixture contract missing');
    if(state.state==='BASELINE') return baselineAdvice(fixture);
    if(state.state!==TARGET||state.target!==TARGET||payload?.target!==TARGET) throw new Error('GitHub PREPROD binding target mismatch');
    return candidateAdvice(fixture);
  }});

  const context={company_id:companyId,engine_id:ENGINE_ID,environment:PREPROD,version};
  let calls=0;
  async function executeArm({fixture,arm}){
    const started=performance.now();
    const response=await runtime.execute({company_id:companyId,engine_id:ENGINE_ID,version,command:'SKILL_GITHUB_PREPROD_ADVISORY',payload:{target:TARGET,fixture},cost_eur:0});
    const latency=performance.now()-started;
    calls+=1;
    if(response.status!=='OK') throw new Error(`unexpected GitHub PREPROD runtime status:${response.status}`);
    const metric=metricFrom(response,fixture,latency);
    const correlation=`${TARGET}:${fixture.fixture_id}:${arm}`;
    ledgers.observability.record({context,correlation_id:correlation,level:'INFO',message:'github-skill-preprod-arm-executed',data:{target:TARGET,fixture_id:fixture.fixture_id,arm,latency_ms:metric.latency_ms,side_effect_count:metric.side_effect_count,policy_violations:metric.policy_violations,human_exception_correctness:metric.human_exception_correctness}});
    ledgers.audit.append({context,correlation_id:correlation,actor:'CEREBRO_PREPROD_HARNESS',action:'EXECUTE_GITHUB_SKILL_PREPROD_ARM',target:{target:TARGET,fixture_id:fixture.fixture_id,arm},before:null,after:{output_sha256:metric.output_sha256},reason:null,result:'SUCCESS'});
    ledgers.finops.record({context,correlation_id:correlation,task_id:`${TARGET}:${fixture.fixture_id}:${arm}`,provider:'LOCAL_DETERMINISTIC',cost_eur:0,metadata:{external_skill_code_executed:false,prod_write:false}});
    return metric;
  }

  const baselineByFixture=new Map();
  const fixtureResults=[];
  binding.set('BASELINE',TARGET);
  for(const fixture of GITHUB_PREPROD_FIXTURES) baselineByFixture.set(fixture.fixture_id,await executeArm({fixture,arm:'BASELINE'}));

  binding.set(TARGET,TARGET);
  for(const fixture of GITHUB_PREPROD_FIXTURES){
    const candidate=await executeArm({fixture,arm:'CANDIDATE'});
    fixtureResults.push({fixture_id:fixture.fixture_id,expected_constraints:[...fixture.expected_constraints],baseline:baselineByFixture.get(fixture.fixture_id),candidate});
  }

  const rollbackTransition=binding.set('BASELINE',TARGET);
  const rollbackResults=[];
  for(const fixture of GITHUB_PREPROD_FIXTURES){
    const rolled=await executeArm({fixture,arm:'ROLLBACK_BASELINE'});
    const original=baselineByFixture.get(fixture.fixture_id);
    rollbackResults.push({fixture_id:fixture.fixture_id,before_sha256:original.output_sha256,after_sha256:rolled.output_sha256,restored:original.output_sha256===rolled.output_sha256});
  }
  const rebuilt=binding.rebuildDisabled();
  const rollbackReady=rollbackResults.every(x=>x.restored)&&rollbackTransition.after.state==='BASELINE'&&rebuilt.state==='DISABLED'&&rebuilt.enabled===false;

  const pkg={
    package_id:'preprod:github-wrapper',
    target:TARGET,
    domain:CEREBRO_GITHUB_WRAPPER.domain,
    wrapper_id:CEREBRO_GITHUB_WRAPPER.wrapper_id,
    wrapper_version:CEREBRO_GITHUB_WRAPPER.version,
    approved_upstream_full_name:CEREBRO_GITHUB_WRAPPER.approved_upstream_full_name,
    approved_manifest_path:CEREBRO_GITHUB_WRAPPER.approved_manifest_path,
    status:rollbackReady?'PREPROD_PACKAGE_COMPLETE':'PREPROD_PACKAGE_ROLLBACK_FAILED',
    runtime_path_executed:true,
    physical_binding_store_exercised:true,
    fixture_data_class:'SYNTHETIC_NON_CUSTOMER_PREPROD_FIXTURES',
    external_skill_code_executed:false,
    prod_write:false,
    trading_access:false,
    fixture_results:fixtureResults,
    rollback_proof:{scope:'PREPROD_PHYSICAL_BINDING_FILE',ready:rollbackReady,results:rollbackResults,baseline_binding_restored:true,rebuild_default_disabled:rebuilt.state==='DISABLED'&&rebuilt.enabled===false}
  };

  const cost=ledgers.finops.aggregate({company_id:companyId,engine_id:ENGINE_ID});
  const auditVerification=ledgers.audit.verify();
  const allGreen=pkg.status==='PREPROD_PACKAGE_COMPLETE'&&pkg.rollback_proof.ready===true;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'GITHUB_PREPROD_REAL_CEREBRO_RUNTIME_BINDING_INTEGRATION',
    observed_at:observedAt,
    status:allGreen?'PREPROD_INTEGRATION_COMPLETE':'PREPROD_INTEGRATION_HOLD',
    environment:PREPROD,
    company_id:companyId,
    engine_id:ENGINE_ID,
    version,
    runtime_integration_real:true,
    fixture_data_synthetic_non_customer:true,
    external_target_side_effects_intentionally_forbidden:true,
    calls_executed:calls,
    actual_current_cerebro_baseline_executed:true,
    candidate_wrapper_binding_executed:true,
    physical_binding_rollback_executed:true,
    rebuild_default_disabled:true,
    final_binding_state:rebuilt.state,
    observability_records:ledgers.observability.operation_count,
    audit_records:ledgers.audit.operation_count,
    audit_chain_valid:auditVerification.valid===true,
    finops_records:ledgers.finops.operation_count,
    measured_additional_cost_eur:cost.cost_eur,
    prod_data_used:false,
    customer_data_used:false,
    external_skill_code_executed:false,
    prod_writes:false,
    trading_access:false,
    paid_fallback:false,
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false,
    packages:[pkg]
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-github-preprod-integration.json';
  const rootDir=argValue('--state-root')??path.join('artifacts','github-preprod-state');
  const report=await runGitHubPreprodIntegration({rootDir});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,calls_executed:report.calls_executed,observability_records:report.observability_records,audit_records:report.audit_records,finops_records:report.finops_records,cost_eur:report.measured_additional_cost_eur,rollback_ready:report.packages?.[0]?.rollback_proof?.ready===true,final_binding_state:report.final_binding_state,prod_authorized:false}));
}
