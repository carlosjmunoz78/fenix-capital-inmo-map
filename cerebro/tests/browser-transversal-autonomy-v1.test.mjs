import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBrowserExecution,getBrowserHumanRequiredCodes} from '../runtime/browser-transversal-autonomy-v1.mjs';

const canonical=['SEO-001','APP-001','MKT-001','TRN-001','COMPET-001','LAB-TRD'];
const binding={healthy:true,kill_switch_enabled:true,fresh_attestation:true};
const baseAuthority={browser_use_authorized:true};

function run(overrides={}){
  return evaluateBrowserExecution({
    engine_id:overrides.engine_id??'SEO-001',
    environment:overrides.environment??'PREPROD',
    canonical_engine_ids:canonical,
    route_needed:overrides.route_needed??true,
    browser_binding:overrides.browser_binding??binding,
    operation:overrides.operation??{kind:'OBSERVE',incremental_spend_eur:0},
    engine_authority:overrides.engine_authority??baseAuthority
  });
}

test('browser is a transversal tool and ordinary observation needs no separate human approval',()=>{
  const r=run({environment:'PROD'});
  assert.equal(r.status,'AUTHORIZED');
  assert.equal(r.browser_is_tool_not_authority,true);
  assert.equal(r.browser_use_requires_separate_human_approval,false);
  assert.equal(r.human_required,null);
  assert.equal(r.action_execution_authorized,true);
});

test('authenticated observation is allowed only with a governed healthy session binding',()=>{
  const yes=run({operation:{kind:'AUTHENTICATED_OBSERVE'},engine_authority:{browser_use_authorized:true,session_binding_authorized:true}});
  assert.equal(yes.status,'AUTHORIZED');
  const no=run({operation:{kind:'AUTHENTICATED_OBSERVE'},engine_authority:{browser_use_authorized:true,session_binding_authorized:false}});
  assert.equal(no.status,'HOLD_SESSION_BINDING_NOT_AUTHORIZED');
  assert.equal(no.human_required,null);
});

test('routine browser mutation inherits origin-engine authority instead of receiving browser authority',()=>{
  const r=run({
    environment:'PROD',
    operation:{kind:'ROUTINE_MUTATION',incremental_spend_eur:0},
    engine_authority:{
      browser_use_authorized:true,operation_authorized:true,prod_mutation_authorized:true,
      promotion_gate_green:true,rollback_ready:true,observability_ready:true,audit_ready:true,idempotency_proven:true
    }
  });
  assert.equal(r.status,'AUTHORIZED');
  assert.equal(r.authority_source,'ORIGIN_ENGINE_POLICY_AND_GOVERNED_ACTION_CONTRACT');
  assert.equal(r.human_required,null);
});

test('browser cannot create PROD mutation authority when origin engine gate is incomplete',()=>{
  const r=run({environment:'PROD',operation:{kind:'ROUTINE_MUTATION'},engine_authority:{browser_use_authorized:true,operation_authorized:true,prod_mutation_authorized:false}});
  assert.equal(r.status,'HOLD_PROD_ACTION_GATE_NOT_GREEN');
  assert.equal(r.action_execution_authorized,false);
  assert.equal(r.human_required,null);
});

test('incremental spend is always MONEY_LIMIT instead of silent browser purchase',()=>{
  const r=run({operation:{kind:'ROUTINE_MUTATION',incremental_spend_eur:1},engine_authority:{browser_use_authorized:true,operation_authorized:true}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'MONEY_LIMIT');
});

test('canonical legal signature risk security confidence policy and customer boundaries remain human exceptions',()=>{
  const cases=[
    ['legal_required','LEGAL_REQUIRED'],['signature_required','SIGNATURE_REQUIRED'],['low_confidence','LOW_CONFIDENCE'],
    ['high_risk','HIGH_RISK'],['policy_conflict','POLICY_CONFLICT'],['security_incident','SECURITY_INCIDENT'],
    ['customer_human_request','CUSTOMER_HUMAN_REQUEST']
  ];
  for(const [flag,reason] of cases){
    const r=run({operation:{kind:'OBSERVE',[flag]:true}});
    assert.equal(r.status,'HUMAN_REQUIRED');
    assert.equal(r.human_required,reason);
  }
});

test('Trading can use the browser only inside an independently authorized isolated Trading runtime',()=>{
  const no=run({engine_id:'LAB-TRD',operation:{kind:'OBSERVE',trading_scope:true},engine_authority:{browser_use_authorized:true}});
  assert.equal(no.status,'HOLD_TRADING_ISOLATION_NOT_PROVEN');
  const yes=run({engine_id:'LAB-TRD',operation:{kind:'OBSERVE',trading_scope:true},engine_authority:{browser_use_authorized:true,trading_scope_authorized:true,isolated_trading_runtime:true}});
  assert.equal(yes.status,'AUTHORIZED');
});

test('external browser skill code is not required and remains fail closed',()=>{
  const r=run({operation:{kind:'OBSERVE',external_skill_code_execution:true}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'POLICY_CONFLICT');
  assert.equal(r.external_skill_code_execution,false);
});

test('human exception vocabulary remains the exact canonical eight',()=>{
  assert.deepEqual(getBrowserHumanRequiredCodes(),[
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
});
