import test from 'node:test';
import assert from 'node:assert/strict';
import { routeCreativeCapability, futureCreativeBinding } from '../runtime/creative-capability-router-v1.mjs';

const base = (overrides={}) => ({company_id:'fenix',engine_id:'SOC-001',environment:'PREPROD',version:'v1',media_kind:'DESIGN',expected_cost_eur:0,...overrides});

test('routes Canva-native design to Canva only when binding is green', () => {
  const green = routeCreativeCapability(base({brand_kit_required:true,canva_binding_green:true}));
  assert.equal(green.capability_id,'CREATIVE-CANVA-V1');
  const fallback = routeCreativeCapability(base({brand_kit_required:true,canva_binding_green:false}));
  assert.equal(fallback.capability_id,'CREATIVE-VISUAL-LOCAL-V1');
  assert.equal(fallback.status,'PREPROD_FALLBACK_WITH_CAPABILITY_GAP');
});

test('routes ordinary zero-cost design to OpenDesign in PREPROD', () => {
  const out = routeCreativeCapability(base({zero_cost_first:true}));
  assert.equal(out.capability_id,'CREATIVE-VISUAL-LOCAL-V1');
  assert.equal(out.status,'AUTHORIZED_LOCAL_ROUTE');
});

test('fails closed for local visual PROD without certification', () => {
  const out = routeCreativeCapability(base({environment:'PROD',prefer_local:true}));
  assert.equal(out.status,'HOLD_LOCAL_VISUAL_NOT_PROD_CERTIFIED');
});

test('keeps operational video on existing multimedia factory', () => {
  const out = routeCreativeCapability(base({media_kind:'VIDEO'}));
  assert.equal(out.capability_id,'DIGITAL-BUILD-MULTIMEDIA');
  assert.deepEqual(out.execution_path,['HYPERFRAMES','OPENMONTAGE','FFMPEG']);
});

test('OpenCut is LAB interactive editor only until upstream automation interfaces exist', () => {
  const out = routeCreativeCapability(base({media_kind:'VIDEO',interactive_editor_required:true}));
  assert.equal(out.capability_id,'CREATIVE-VIDEO-EDITOR-V1');
  assert.equal(out.status,'LAB_ROUTE');
  assert.match(out.automation_truth,/UPSTREAM_PLANNED/);
});

test('extra spend is canonical MONEY_LIMIT', () => {
  const out = routeCreativeCapability(base({expected_cost_eur:1}));
  assert.equal(out.status,'HUMAN_REQUIRED');
  assert.equal(out.reason,'MONEY_LIMIT');
});

test('future engines get candidates, never provider or publish authority', () => {
  const out = futureCreativeBinding({engine_id:'FUTURE-999',company_scope:'MULTI_COMPANY',media_kinds:['image','video']});
  assert.equal(out.status,'BINDING_CANDIDATE_ONLY');
  assert.equal(out.automatic_provider_authority,false);
  assert.equal(out.automatic_publish_authority,false);
});
