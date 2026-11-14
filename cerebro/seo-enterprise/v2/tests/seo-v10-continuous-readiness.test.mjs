import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateV10} from '../runtime/seo-v10-continuous-readiness.mjs';
const root='cerebro/seo-enterprise/v2/';
const read=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const baseline=()=>({
 v7:read('registry/seo001-semantic-v7-review-only-2026-11-08.json'),
 v9:read('registry/seo001-v9-media-physical-result-2026-11-08.json'),
 v9Contract:read('registry/seo001-v9-media-live-gate-2026-11-08.json'),
 policy:read('seo-prod-draft-autopublish-policy-v0.json')
});
test('V10 consumes V7 V9 and existing promotion policy, returns deterministic no-release',()=>{
 const a=evaluateV10(),b=evaluateV10();
 assert.deepEqual(a,b);
 assert.equal(a.phases.length,10);
 assert.equal(a.phases.filter(x=>x.state==='UNVERIFIED').length,7);
 assert.equal(a.first_three_owner_signed_publication_receipts_verified,0);
 assert.equal(a.publish_allowed,false);
 assert.equal(a.autopublish_allowed,false);
 assert.equal(a.model_calls,0);
 assert.equal(a.wordpress_writes,0);
 assert.equal(a.next_automatable_task,'SOURCE_RIGHTS_RECEIPTS');
});
test('V10 only accepts eight distinct existing drafts, no synthetic approvals',()=>{
 const a=evaluateV10();
 assert.equal(new Set(a.historical_wordpress_drafts).size,8);
 assert.deepEqual(a.media_sources,[52718,52719,52720,52721]);
 assert.deepEqual(a.phases.filter(x=>x.human_exception).map(x=>x.human_exception),
   ['LEGAL_REQUIRED','SIGNATURE_REQUIRED']);
});
test('reject manipulated publication or licensing assertions and cross-company context',()=>{
 const mutators=[
  a=>a.v9.safety.release_authorized=true,
  a=>a.v9.unverified.commercial_usage_rights=true,
  a=>a.v9Contract.images[0].independent_provider_receipt=true,
  a=>a.v9.images[1].sha256=a.v9.images[0].sha256,
  a=>a.v7.limits.allow_publish=true,
  a=>a.policy.state='ENABLED',
  a=>a.policy.lifecycle.current_scoped_autopublish_grant_present=true,
  a=>a.v9.images[3].media_id=52720,
  a=>a.v9.source.conclusion='failure'
 ];
 for(const edit of mutators){const a=baseline();edit(a);
  assert.throws(()=>evaluateV10({provided:a}),/SEO001_V10_/);
 }
});
