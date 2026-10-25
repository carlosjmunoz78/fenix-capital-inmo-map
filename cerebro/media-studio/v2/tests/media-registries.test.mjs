import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetRecord,assertAssetUsable,dedupeAssets } from '../runtime/asset-registry.mjs';
import { createVoiceProfile,canUseVoice } from '../runtime/voice-registry.mjs';
import { createEffectSpec,deriveEffectVariant,assertEffectRights,EFFECT_FAMILIES } from '../runtime/effects-factory.mjs';
import { allDepartmentKnowledgeBaselines,departmentKnowledgeBaseline } from '../knowledge/department-knowledge-baseline.mjs';

test('asset registry fails closed on rights and tenant isolation',()=>{
  const a=createAssetRecord({company_id:'fenix',asset_type:'VIDEO',name:'master',rights_status:'VALID',license_ref:'L1',provenance_ref:'P1'});
  assert.equal(assertAssetUsable(a,{company_id:'fenix'}),true);
  assert.throws(()=>assertAssetUsable(a,{company_id:'other'}),/CROSS_COMPANY_DENY/);
  const d=dedupeAssets([a,{...a,asset_id:'AST-DUP'}]);
  assert.equal(d.length,1);
});

test('authorized real voice can be used only inside its company and rights record',()=>{
  const v=createVoiceProfile({company_id:'fenix',identity_type:'REAL_AUTHORIZED',rights_record:{status:'VALID',provenance_record:'PRV',revocation_process:'REV'},modalities:['speech','voice_conversion'],canonical_refs:['AUDIO-1']});
  assert.equal(canUseVoice(v,{company_id:'fenix',use:'speech'}).decision,'PASS');
  assert.equal(canUseVoice(v,{company_id:'other',use:'speech'}).decision,'DENY');
  const blocked=createVoiceProfile({company_id:'fenix',identity_type:'REAL_AUTHORIZED',rights_record:{status:'UNKNOWN'},modalities:['speech']});
  assert.equal(canUseVoice(blocked,{company_id:'fenix',use:'speech'}).decision,'HUMAN_REQUIRED');
});

test('effects factory supports broad reusable families and protected variants',()=>{
  assert.ok(EFFECT_FAMILIES.length>=20);
  const fx=createEffectSpec({family:'ENERGY',description:'contained cyan energy core',compatible_surfaces:['RASTER_VIDEO_2D']});
  assert.equal(assertEffectRights(fx),true);
  const v=deriveEffectVariant(fx,{parameters:{intensity:0.7}});
  assert.equal(v.parent_effect_id,fx.effect_id);
  assert.notEqual(v.effect_id,fx.effect_id);
});

test('all 48 departments receive baseline knowledge and critical craft departments are seeded deeply',()=>{
  const all=allDepartmentKnowledgeBaselines();
  assert.equal(all.length,48);
  for(const b of all){assert.ok(b.topics.length>=10);assert.equal(b.daily_refresh_required,true);}
  for(const id of ['D09','D10','D11','D12','D21','D22','D23','D28','D33','D34','D35','D36','D37','D38','D48']) assert.equal(departmentKnowledgeBaseline(id).status,'SEEDED_CRITICAL_BASELINE');
});
