import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBrowserVisionFallback,getBrowserVisionFallbackCapabilities} from '../runtime/browser-vision-fallback-v1.mjs';

const screenshot={file:'evidence.png',fresh:true};

test('vision is bypassed when DOM already resolved target',()=>{
  const r=evaluateBrowserVisionFallback({dom_resolution:{resolved:true}});
  assert.equal(r.status,'NOT_NEEDED_DOM_RESOLVED');
  assert.equal(r.execution_authority_granted,false);
});

test('no vision provider becomes LOW_CONFIDENCE rather than guessing',()=>{
  const r=evaluateBrowserVisionFallback({dom_resolution:{resolved:false},provider:{mode:'NONE'}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'LOW_CONFIDENCE');
});

test('local zero-cost vision may resolve target but never grants action authority',()=>{
  const r=evaluateBrowserVisionFallback({
    dom_resolution:{resolved:false},screenshot_evidence:screenshot,
    provider:{mode:'LOCAL',incremental_spend_eur:0,target:{x:120,y:80}},confidence:0.97
  });
  assert.equal(r.status,'AUTHORIZED_TARGET_ONLY');
  assert.equal(r.target_resolution_authorized,true);
  assert.equal(r.execution_authority_granted,false);
  assert.deepEqual(r.target,{x:120,y:80});
});

test('low confidence always requires human',()=>{
  const r=evaluateBrowserVisionFallback({
    dom_resolution:{resolved:false},screenshot_evidence:screenshot,
    provider:{mode:'LOCAL',target:{x:1,y:2}},confidence:0.5
  });
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'LOW_CONFIDENCE');
});

test('paid vision is MONEY_LIMIT and external sensitive vision is policy conflict',()=>{
  const paid=evaluateBrowserVisionFallback({
    dom_resolution:{resolved:false},screenshot_evidence:screenshot,
    provider:{mode:'EXTERNAL',incremental_spend_eur:0.01,target:{x:1,y:2}},confidence:0.99,
    engine_authority:{external_vision_authorized:true}
  });
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');

  const sensitive=evaluateBrowserVisionFallback({
    dom_resolution:{resolved:false},screenshot_evidence:screenshot,
    provider:{mode:'EXTERNAL',incremental_spend_eur:0,sensitive_data_present:true,target:{x:1,y:2}},confidence:0.99,
    engine_authority:{external_vision_authorized:true}
  });
  assert.equal(sensitive.status,'HUMAN_REQUIRED');
  assert.equal(sensitive.human_required,'POLICY_CONFLICT');
});

test('external vision requires explicit origin-engine authority',()=>{
  const r=evaluateBrowserVisionFallback({
    dom_resolution:{resolved:false},screenshot_evidence:screenshot,
    provider:{mode:'EXTERNAL',incremental_spend_eur:0,target:{x:1,y:2}},confidence:0.99,
    engine_authority:{external_vision_authorized:false}
  });
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'POLICY_CONFLICT');
});

test('capability contract keeps DOM first and paid AI optional',()=>{
  const c=getBrowserVisionFallbackCapabilities();
  assert.equal(c.dom_first,true);
  assert.equal(c.paid_provider_required,false);
  assert.equal(c.local_provider_supported,true);
  assert.equal(c.vision_can_grant_execution_authority,false);
});
