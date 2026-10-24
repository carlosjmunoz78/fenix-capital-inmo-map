import test from 'node:test';
import assert from 'node:assert/strict';
import { GOVERNED_VIDEO_SOURCES_V2, resolveGovernedVideoSourceV2, sourceProvenanceV2, CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT } from '../runtime/creative-media-sources-v2.mjs';

test('registry allows only governed zero-cost providers',()=>{
  assert.deepEqual(CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT.allowed_providers,['PEXELS','FENIX_OWNED']);
  assert.equal(CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT.arbitrary_remote_video_urls,false);
  assert.equal(CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT.commercial_use_required,true);
  assert.equal(CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT.additional_cost_eur,0);
});

test('all five audited Pexels assets have commercial/modification provenance',()=>{
  const refs=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690','PEXELS:7735853','PEXELS:7646396'];
  for(const ref of refs){
    const s=resolveGovernedVideoSourceV2(ref);
    assert.equal(s.provider,'PEXELS');
    assert.equal(s.commercial_use,true);
    assert.equal(s.modification_allowed,true);
    assert.equal(s.attribution_required,false);
    assert.equal(s.endorsement_implication_forbidden,true);
    assert.equal(s.license_url,'https://www.pexels.com/license/');
    const p=sourceProvenanceV2(ref);
    assert.equal(p.asset_id,s.asset_id);
    assert.ok(p.page_url.startsWith('https://www.pexels.com/video/'));
  }
});

test('unknown or arbitrary source is rejected',()=>{
  assert.throws(()=>resolveGovernedVideoSourceV2('PEXELS:99999999'),/VIDEO_SOURCE_NOT_GOVERNED/);
  assert.throws(()=>resolveGovernedVideoSourceV2('https://example.com/video.mp4'),/VIDEO_SOURCE_NOT_GOVERNED/);
});

test('owned legacy video remains governed but flagged with baked-text limitation',()=>{
  const s=GOVERNED_VIDEO_SOURCES_V2['FENIX_OWNED:CORP_B2B_2026'];
  assert.equal(s.provider,'FENIX_OWNED');
  assert.match(s.notes,/baked-in legacy text/i);
});
