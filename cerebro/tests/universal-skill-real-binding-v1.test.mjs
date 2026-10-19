import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';
import {runUniversalSkillRealBinding,buildUniversalBindingBundle} from '../runtime/universal-skill-real-binding-v1.mjs';

const base={company_id:'fenix',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0};

function safeProbeAuthority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function perfectAdapter({physical=true,actionCapable=false}={}){
  return ({contract,engine_id})=>({
    execution_authority:'INTERNAL_PREPROD_PROBE',
    profile:{
      adapter_id:`generated:${contract.domain_id}:${engine_id}`,
      adapter_version:'1.0.0',contract_exact:true,required_constraints:[...contract.required_constraints],action_capable:actionCapable,
      prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0
    },
    probe:()=>({
      status:'PASS',real_consumption:true,decision:'GENERIC_SEMANTIC_PROBE_PASS',observed_constraints:[...contract.required_constraints],
      evidence_refs:[`fixture:${contract.fixture_id}`,`engine:${engine_id}`],physical_evidence:physical,...safeProbeAuthority()
    })
  });
}

function engineeringPlan(){
  return buildUniversalActivationPlan({
    ...base,candidate_id:'blind:engineering-tool',technical_name:'opaque-engineering-tool',source_refs:['repo://blind/tool'],
    capabilities:[{capability_id:'blind:engineering-tool:code',technical_name:'opaque-code-capability',declared_domains:['software-engineering-devops'],domain_evidence:{'software-engineering-devops':['manifest:capabilities/code-change']}}]
  });
}

test('generic executor binds an unrecognized candidate across all governed engines without candidate-specific core code',()=>{
  const plan=engineeringPlan();
  assert.equal(plan.status,'ACTIVATION_PLAN_READY');
  const bundle=buildUniversalBindingBundle({activation_plan:plan,adapter_resolver:perfectAdapter()});
  assert.ok(bundle.binding_count>=1);
  assert.equal(bundle.binding_count,plan.capabilities[0].domains[0].engine_bindings.length);
  assert.ok(bundle.receipts.every((x)=>x.status==='PASS'&&x.real_consumption&&x.meaningful_change));
  assert.ok(bundle.receipts.every((x)=>x.candidate_coverage===1&&x.baseline_coverage<1&&x.old_vs_new.decision==='PASS'));
});

test('generic executor reaches FULL_SAFE_PREPROD with Tribunal, LRN, telemetry, rollback/rebuild and idempotency',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'usaf-real-binding-test-'));
  const report=runUniversalSkillRealBinding({activation_plan:engineeringPlan(),adapter_resolver:perfectAdapter(),root_dir:root,source_run_id:123,source_head_sha:'1111111111111111111111111111111111111111'});
  assert.equal(report.status,'FULL_SAFE_PREPROD');
  assert.equal(report.full_safe_preprod,true);
  assert.equal(report.per_binding_old_vs_new_pass,true);
  assert.equal(report.independent_tribunal.decision,'PASS');
  assert.equal(report.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_GREEN');
  assert.equal(report.observability_green,true);
  assert.equal(report.finops_green,true);
  assert.equal(report.audit_green,true);
  assert.equal(report.cost_eur,0);
  assert.equal(report.backup_rollback_rebuild.rollback_green,true);
  assert.equal(report.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(report.restartable,true);
  assert.equal(report.idempotency_proven,true);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.trading_access,false);
});

test('action-capable browser binding cannot become FULL without physical browser evidence',()=>{
  const plan=buildUniversalActivationPlan({
    ...base,candidate_id:'blind:browser',technical_name:'opaque-browser',
    capabilities:[{capability_id:'blind:browser:ui',technical_name:'opaque-ui',declared_domains:['browser-automation-scraping'],domain_evidence:{'browser-automation-scraping':['manifest:capabilities/browser-action']}}]
  });
  const report=runUniversalSkillRealBinding({activation_plan:plan,adapter_resolver:perfectAdapter({physical:false,actionCapable:true}),root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-browser-physical-'))});
  assert.equal(report.status,'BLOCKED_EXTERNAL');
  assert.equal(report.full_safe_preprod,false);
  assert.equal(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_HOLD');
  assert.notEqual(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_GREEN');
  assert.ok(report.missing_physical_bindings.length>0);
});

test('missing adapter holds only the candidate, emits HOLD learning and never fabricates integration evidence',()=>{
  const plan=engineeringPlan();
  const report=runUniversalSkillRealBinding({activation_plan:plan,adapter_resolver:()=>null,root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-adapter-missing-'))});
  assert.equal(report.status,'HOLD');
  assert.equal(report.full_safe_preprod,false);
  assert.equal(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_HOLD');
  assert.notEqual(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_GREEN');
  assert.ok(report.semantic_bindings.every((x)=>x.decision==='ADAPTER_MISSING'));
  assert.ok(report.semantic_bindings.every((x)=>x.real_consumption===false));
});

test('adapter authority expansion fails closed instead of becoming a real binding',()=>{
  const plan=engineeringPlan();
  const resolver=({contract,engine_id})=>({
    execution_authority:'INTERNAL_PREPROD_PROBE',
    profile:{adapter_id:`unsafe:${engine_id}`,contract_exact:true,required_constraints:[...contract.required_constraints],prod_authorized:true,prod_write_authorized:true,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0},
    probe:()=>({status:'PASS',real_consumption:true,observed_constraints:[...contract.required_constraints],evidence_refs:['fake'],physical_evidence:true,...safeProbeAuthority()})
  });
  const report=runUniversalSkillRealBinding({activation_plan:plan,adapter_resolver:resolver,root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-unsafe-adapter-'))});
  assert.equal(report.status,'HOLD');
  assert.equal(report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_HOLD');
  assert.ok(report.semantic_bindings.every((x)=>x.decision==='ADAPTER_CONTRACT_HOLD'));
});
