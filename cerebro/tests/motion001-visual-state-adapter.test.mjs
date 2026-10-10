import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEngineActivationVisualEvent,buildVisualStateDescriptor,resolveVisualAssetRole} from '../runtime/motion001-visual-state-adapter.mjs';

test('Phase 1 visual adapter resolves every canonical MOTION state to an immediately usable static role',()=>{
  for(const state of ['IDLE','LISTENING','PROCESSING','SPEAKING','HUMAN_REQUIRED','DEGRADED','ERROR']){
    const out=resolveVisualAssetRole(state,{reduced_motion:true});
    assert.equal(out.state,state);
    assert.equal(out.static_safe,true);
    assert.equal(out.fallback_is_usable_now,true);
  }
});

test('visual descriptor is multiempresa-ready and refuses PROD',()=>{
  const out=buildVisualStateDescriptor({company_id:'fenix',state:'PROCESSING',environment:'PREPROD',version:'v1'});
  assert.equal(out.company_id,'fenix');
  assert.equal(out.engine_id,'MOTION-001');
  assert.equal(out.environment,'PREPROD');
  assert.equal(out.prod_authorized,false);
  assert.equal(out.prod_write_authorized,false);
  assert.equal(out.trading_access,false);
  assert.throws(()=>buildVisualStateDescriptor({company_id:'fenix',state:'IDLE',environment:'PROD'}),/refuses/);
});

test('HUMAN_REQUIRED visual descriptor accepts only canonical reasons',()=>{
  assert.throws(()=>buildVisualStateDescriptor({company_id:'fenix',state:'HUMAN_REQUIRED',human_required_reason:'OTHER'}),/noncanonical/);
  const out=buildVisualStateDescriptor({company_id:'fenix',state:'HUMAN_REQUIRED',human_required_reason:'LOW_CONFIDENCE'});
  assert.equal(out.visual.asset_role,'STATE_HUMAN_REQUIRED_V1');
  assert.equal(out.visual.overlay.accent,'AMBER_WHITE');
});

test('reduced-motion uses static swap and retains state semantics',()=>{
  const out=buildVisualStateDescriptor({company_id:'fenix',state:'SPEAKING',reduced_motion:true});
  assert.equal(out.transition,'STATIC_SWAP');
  assert.equal(out.visual.reduced_motion,true);
  assert.equal(out.state,'SPEAKING');
});

test('engine activation visual events carry no raw content, secrets or PII',()=>{
  const out=buildEngineActivationVisualEvent({company_id:'fenix',engine_id:'SEO-001',region_id:'GROWTH_INTELLIGENCE',state:'PROCESSING',intensity:.64,route_from:'CORE_ORCHESTRATION',route_to:'GROWTH_INTELLIGENCE',confidence_band:'HIGH'});
  assert.equal(out.company_id,'fenix');
  assert.equal(out.engine_id,'SEO-001');
  assert.equal(out.intensity,.64);
  assert.equal(out.raw_content,null);
  assert.equal(out.secret_payload,null);
  assert.equal(out.customer_pii,null);
  assert.equal(out.prod_authorized,false);
  assert.equal(out.automatic_promotion,false);
});

test('visual event intensity is bounded',()=>{
  assert.throws(()=>buildEngineActivationVisualEvent({company_id:'fenix',engine_id:'SEO-001',region_id:'GROWTH_INTELLIGENCE',intensity:1.1}),/intensity/);
  assert.throws(()=>buildEngineActivationVisualEvent({company_id:'fenix',engine_id:'SEO-001',region_id:'GROWTH_INTELLIGENCE',intensity:-.1}),/intensity/);
});
