import test from 'node:test';
import assert from 'node:assert/strict';
import {decideIncidentAction,assertRepairEnvelope} from '../platform/incident-root-cause-escalator-v0.mjs';

const failure={workflow:'CEREBRO Skill AutoLoop Safe Handler V0',job:'safe-handler',step:'Install pinned zero-cost OSS inference runtime without install scripts',error:"Cannot read properties of null (reading 'edgesOut')",environment:'PREPROD'};

test('first identical failure permits at most one safe retry',()=>{
  const d=decideIncidentAction({current:failure,history:[]});
  assert.equal(d.state,'ONE_SAFE_RETRY_ALLOWED');
  assert.equal(d.retry_authorized,true);
  assert.equal(d.max_retries,1);
});

test('second identical failure forbids blind retry and requires root-cause repair',()=>{
  const d=decideIncidentAction({current:failure,history:[failure]});
  assert.equal(d.state,'ROOT_CAUSE_REPAIR_REQUIRED');
  assert.equal(d.retry_authorized,false);
  assert.equal(d.root_cause_repair_required,true);
});

test('bounded reversible PREPROD zero-cost repair can proceed without human',()=>{
  const repair={bounded:true,reversible:true,preprod_only:true,tests_defined:true,rollback_defined:true,additional_cost_eur:0,prod_write:false,permission_expansion:false,gate_relaxation:false};
  assert.equal(assertRepairEnvelope(repair).green,true);
  const d=decideIncidentAction({current:failure,history:[failure],proposedRepair:repair});
  assert.equal(d.state,'ROOT_CAUSE_REPAIR_READY');
  assert.equal(d.repair_authorized,true);
  assert.equal(d.prod_authorized,false);
});

test('canonical human exception remains fail-closed',()=>{
  const d=decideIncidentAction({current:{...failure,human_required_reason:'SECURITY_INCIDENT'},history:[failure]});
  assert.equal(d.state,'HUMAN_REQUIRED');
  assert.equal(d.retry_authorized,false);
  assert.equal(d.reason,'SECURITY_INCIDENT');
});

test('tool unavailability is not a human-required reason',()=>{
  const d=decideIncidentAction({current:{...failure,human_required_reason:'TOOL_UNAVAILABLE'},history:[failure]});
  assert.notEqual(d.state,'HUMAN_REQUIRED');
});
