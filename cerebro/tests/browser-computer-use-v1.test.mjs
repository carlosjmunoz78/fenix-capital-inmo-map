import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVisionComputerUseAction,getBrowserComputerUseContract} from '../runtime/browser-computer-use-v1.mjs';

const authorizedVision={
  dom_resolution:{resolved:false},
  screenshot_evidence:{file:'shot.png',fresh:true},
  provider:{mode:'LOCAL',incremental_spend_eur:0,target:{x:120,y:240}},
  confidence:0.99,
  confidence_threshold:0.92,
  engine_authority:{}
};

test('authorized local vision target becomes coordinate click without creating authority',()=>{
  const r=resolveVisionComputerUseAction({intent:'CLICK',vision:authorizedVision});
  assert.equal(r.status,'AUTHORIZED_TARGET_ACTION');
  assert.deepEqual(r.action,{type:'CLICK_POINT',x:120,y:240});
  assert.equal(r.action_authority_created,false);
});

test('double click and move map to bounded computer-use action types',()=>{
  assert.equal(resolveVisionComputerUseAction({intent:'DOUBLE_CLICK',vision:authorizedVision}).action.type,'DOUBLE_CLICK_POINT');
  assert.equal(resolveVisionComputerUseAction({intent:'MOVE',vision:authorizedVision}).action.type,'MOVE_POINT');
});

test('low confidence remains HUMAN_REQUIRED and never creates coordinate action',()=>{
  const r=resolveVisionComputerUseAction({intent:'CLICK',vision:{...authorizedVision,confidence:0.5}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.vision_resolution.human_required,'LOW_CONFIDENCE');
  assert.equal(r.action,null);
});

test('paid visual provider remains MONEY_LIMIT before action creation',()=>{
  const r=resolveVisionComputerUseAction({intent:'CLICK',vision:{...authorizedVision,provider:{...authorizedVision.provider,incremental_spend_eur:0.01}}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.vision_resolution.human_required,'MONEY_LIMIT');
  assert.equal(r.action,null);
});

test('unknown computer-use intent fails closed',()=>{
  const r=resolveVisionComputerUseAction({intent:'DELETE_FILE',vision:authorizedVision});
  assert.equal(r.status,'HOLD_UNKNOWN_COMPUTER_USE_INTENT');
  assert.equal(r.action,null);
});

test('contract keeps vision separate from execution authority',()=>{
  const c=getBrowserComputerUseContract();
  assert.equal(c.vision_creates_action_authority,false);
  assert.equal(c.execution_authority_source,'ORIGIN_ENGINE_POLICY_AND_GOVERNED_ACTION_CONTRACT');
});
