import test from 'node:test';
import assert from 'node:assert/strict';
import {createPromotionPlan,advancePromotion,postMonitor,CURRENT_PROMOTION_AUTHORITY} from '../runtime/promotion-pipeline.mjs';

function plan(){return createPromotionPlan({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',baseline_version:'old',candidate_version:'new',judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:'rb:1',rebuild_ref:'rebuild:1',post_metrics:{score:{min:80}},canary_percent:5});}

test('promotion envelope starts PREPROD with rollback rebuild and no PROD authority',()=>{
  const p=plan();
  assert.equal(p.state,'PREPROD');
  assert.equal(p.prod_authorized,false);
  assert.equal(p.prod_write_authorized,false);
  assert.equal(p.external_activation_authority,CURRENT_PROMOTION_AUTHORITY);
  assert.throws(()=>createPromotionPlan({...p,baseline_version:'x',candidate_version:'y',judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:'rb',rebuild_ref:'rebuild',post_metrics:{score:{min:1}},environment:'PROD'}),/prod_context_not_allowed/);
});

test('PREPROD to SHADOW to CANARY stops at current promotion authority',()=>{
  const shadow=advancePromotion(plan(),{shadow_pass:true});
  assert.equal(shadow.state,'SHADOW');
  const canary=advancePromotion(shadow,{canary_pass:true});
  assert.equal(canary.state,'CANARY');
  const held=advancePromotion(canary,{shadow_pass:true,canary_pass:true});
  assert.equal(held.state,'CANARY');
  assert.equal(held.next_gate,'CURRENT_PROMOTION_AUTHORITY_REQUIRED');
  assert.equal(held.prod_authorized,false);
  assert.equal(held.prod_write_authorized,false);
});

test('post-monitoring rolls back on breach and never activates PROD',()=>{
  const p=advancePromotion(advancePromotion(plan(),{shadow_pass:true}),{canary_pass:true});
  const bad=postMonitor({plan:p,observed_metrics:{score:70}});
  assert.equal(bad.decision,'ROLLBACK');
  assert.equal(bad.state,'ROLLED_BACK');
  const good=postMonitor({plan:p,observed_metrics:{score:90}});
  assert.equal(good.decision,'KEEP_NONPROD');
  assert.equal(good.prod_write_authorized,false);
});
