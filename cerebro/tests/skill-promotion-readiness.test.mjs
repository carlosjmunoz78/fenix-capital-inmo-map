import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPromotionReadiness} from '../skills/skill-promotion-readiness.mjs';

function base(){
  return {
    staticLab:{results:[{status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL'}]},
    oldVsNew:{packages_total:2,packages:[{},{ }]},
    routeAudit:{status:'READY_ZERO_COST_ROUTE'},
    quotaPlan:{executable:true},
    behavioralGate:{allowed:true},
    rsiShadow:{bridge_status:'SHADOW_BRIDGE_GREEN'},
    behavioralResults:{results:[{decision:'PASS'}]},
    tribunal:{decision:'GREEN'},
    rollback:{ready:true}
  };
}

test('complete evidence can only reach PREPROD promotion review, never auto-merge',()=>{
  const report=assessPromotionReadiness(base());
  assert.equal(report.ready,true);
  assert.equal(report.status,'READY_FOR_PREPROD_PROMOTION_REVIEW');
  assert.equal(report.merge_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.autonomous_promotion_authorized,false);
  assert.equal(report.human_required,'HIGH_RISK');
});

test('missing behavioral evidence remains not ready',()=>{
  const input=base();
  input.behavioralResults=null;
  input.tribunal=null;
  input.rollback=null;
  const report=assessPromotionReadiness(input);
  assert.equal(report.ready,false);
  assert.ok(report.blockers.includes('BEHAVIORAL_OLD_VS_NEW_NOT_EXECUTED'));
  assert.ok(report.blockers.includes('TRIBUNAL_NOT_GREEN'));
  assert.ok(report.blockers.includes('ROLLBACK_PROOF_MISSING'));
  assert.equal(report.human_required,null);
});

test('unbound zero-cost route and closed gate are explicit blockers',()=>{
  const input=base();
  input.routeAudit={status:'BLOCKED_ZERO_COST_ROUTE_NOT_BOUND'};
  input.quotaPlan={executable:false};
  input.behavioralGate={allowed:false};
  const report=assessPromotionReadiness(input);
  assert.ok(report.blockers.includes('ZERO_COST_ROUTE_NOT_READY'));
  assert.ok(report.blockers.includes('FREE_QUOTA_PLAN_NOT_EXECUTABLE'));
  assert.ok(report.blockers.includes('BEHAVIORAL_EXECUTION_GATE_CLOSED'));
});
