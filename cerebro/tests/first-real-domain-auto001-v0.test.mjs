import test from 'node:test';
import assert from 'node:assert/strict';
import {FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT,runFirstRealAuto001AutonomyGate,validateFirstRealDomainEvidence} from '../runtime/first-real-domain-autonomy-template.mjs';

function routeState(overrides={}){
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_REAL_RESOURCE_STATE',company_id:'fenix',engine_id:'ROUTE-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',
    source_run_id:37897469664,source_head_sha:'bb80f5461e0b2df47cc41efa21464c6a481007da',
    last_safe_loop:{status:'SAFE_PREPROD_LOOP_GREEN',selected_resource_id:'gha-node-runtime',business_execution:false},
    repeatability:{consecutive_live_green_cycles:3,target_reached:true,recent_live_green_run_ids:[37896315736,37897230867,37897469664],fallback_rehearsal_green:true,restoration_green:true,full_loss_hold_green:true,no_human_noise:true},
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0,
    ...overrides
  };
}
function workflowEvidence(overrides={}){
  return {
    environment:'PREPROD',contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0,
    successful_runs:[
      {workflow_name:'CEREBRO RSI Learning Control Plane V0',run_id:37848464619,head_sha:'f876644cbd3b632c879f53d226e4d5a1cc6a47c3',conclusion:'success',observed_at:'2026-10-08T21:40:00Z'},
      {workflow_name:'CEREBRO RSI Learning Outbox Publisher V0',run_id:37848430193,head_sha:'f876644cbd3b632c879f53d226e4d5a1cc6a47c3',conclusion:'success',observed_at:'2026-10-08T21:40:00Z'}
    ],
    ...overrides
  };
}

test('AUTO-001 first real-domain evidence gate requires live evidence plus three distinct ROUTE cycles',()=>{
  const r=validateFirstRealDomainEvidence({route_state:routeState(),auto_workflow_evidence:workflowEvidence()});
  assert.equal(r.ok,true);
  assert.equal(r.decision,'EVIDENCE_GREEN');
  assert.equal(r.engine_id,'AUTO-001');
  assert.equal(r.domain_id,'fenix.automation');
  assert.equal(r.evidence_confidence,0.90);
  assert.equal(r.policy_min_confidence,0.90);
  assert.equal(r.route_live_green_cycles,3);
  assert.equal(r.route_live_green_run_ids.length,3);
  assert.equal(r.workflow_run_ids.length,2);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});

test('AUTO-001 executes OLD vs NEW tribunal, domain policy, SHADOW/CANARY and relearning without business authority',async()=>{
  const r=await runFirstRealAuto001AutonomyGate({route_state:routeState(),auto_workflow_evidence:workflowEvidence(),observed_at:'2026-10-09T07:30:00Z'});
  assert.equal(r.ok,true);
  assert.equal(r.status,'FIRST_REAL_DOMAIN_PREPROD_AUTONOMY_GREEN');
  assert.equal(r.b3_decision,'APPROVE_PREPROD_NEXT_STAGE');
  assert.equal(r.tribunal_decision,'PASS');
  assert.equal(r.b4_decision,'KEEP_NONPROD_AND_RELEARN');
  assert.equal(r.next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
  assert.equal(r.autonomy_mode,'PREPROD_AUTONOMOUS');
  assert.equal(r.business_execution,false);
  assert.equal(r.feedback_events_total,1);
  assert.equal(r.rollback_executed,false);
  assert.equal(r.current_domain_promotion_authority_required,true);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.multicompany_continuation,false);
  assert.equal(r.additional_cost_eur,0);
});

test('ROUTE repeatability below target HOLDs silently and never fabricates human escalation',()=>{
  const r=validateFirstRealDomainEvidence({route_state:routeState({repeatability:{consecutive_live_green_cycles:2,target_reached:false,recent_live_green_run_ids:[1,2],fallback_rehearsal_green:true,restoration_green:true,full_loss_hold_green:true,no_human_noise:true}}),auto_workflow_evidence:workflowEvidence()});
  assert.equal(r.ok,false);
  assert.equal(r.decision,'HOLD');
  assert.equal(r.reasons[0],'ROUTE001_REPEATABILITY_TARGET_NOT_REACHED');
  assert.equal(r.human_required,null);
});

test('current real automation workflow evidence must contain both successful canonical workflows',()=>{
  const r=validateFirstRealDomainEvidence({route_state:routeState(),auto_workflow_evidence:workflowEvidence({successful_runs:[workflowEvidence().successful_runs[0]]})});
  assert.equal(r.ok,false);
  assert.equal(r.reasons[0],'AUTO001_CURRENT_REAL_WORKFLOW_SUCCESS_REQUIRED');
  assert.equal(r.missing_or_invalid_workflow,'CEREBRO RSI Learning Outbox Publisher V0');
});

test('route/customer/secret/authority/cost boundaries fail closed before autonomy',()=>{
  for(const [key,value,expected] of [
    ['contains_customer_data',true,'ROUTE001_CUSTOMER_DATA_FORBIDDEN'],
    ['contains_secrets',true,'ROUTE001_SECRETS_FORBIDDEN'],
    ['prod_authorized',true,'ROUTE001_AUTHORITY_FORBIDDEN'],
    ['additional_cost_eur',1,'ROUTE001_COST_MUST_BE_ZERO']
  ]){
    const r=validateFirstRealDomainEvidence({route_state:routeState({[key]:value}),auto_workflow_evidence:workflowEvidence()});
    assert.equal(r.ok,false);assert.equal(r.reasons[0],expected);
  }
});

test('canonical high risk and nonzero money stay HUMAN_REQUIRED under existing exception policy',async()=>{
  const high=await runFirstRealAuto001AutonomyGate({route_state:routeState(),auto_workflow_evidence:workflowEvidence(),risk_class:'HIGH'});
  assert.equal(high.decision,'HUMAN_REQUIRED');
  assert.equal(high.human_required,'HIGH_RISK');
  const money=await runFirstRealAuto001AutonomyGate({route_state:routeState(),auto_workflow_evidence:workflowEvidence(),additional_cost_eur:1});
  assert.equal(money.decision,'HUMAN_REQUIRED');
  assert.equal(money.human_required,'MONEY_LIMIT');
});

test('contract proves this is PREPROD control-plane autonomy, not PROD business execution',()=>{
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.engine_id,'AUTO-001');
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.domain_id,'fenix.automation');
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.environment,'PREPROD');
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.route_repeatability_min_distinct_live_runs,3);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.business_execution,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.customer_data_allowed,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.secrets_allowed,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.prod_authorized,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.prod_write_authorized,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.trading_access,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.multicompany_continuation,false);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT.next_domain_requires_independent_gate,true);
});
