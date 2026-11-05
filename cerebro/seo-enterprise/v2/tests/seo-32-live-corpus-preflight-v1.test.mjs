import test from 'node:test';
import assert from 'node:assert/strict';
import { runSeo32LiveCorpusPreflight } from '../runtime/seo-32-live-corpus-preflight-v1.mjs';

test('execute 32 scoped LAB source preflights using 200 real WordPress records', () => {
  const r = runSeo32LiveCorpusPreflight({company_id:'fenix',environment:'LAB',
    version:'1.0.0',external_writes:false,paid_ai_calls:0,budget_eur:0});
  assert.equal(r.status,'THIRTY_TWO_LAB_SOURCE_PREFLIGHTS_EXECUTED_NO_PROD_AUTONOMY');
  assert.equal(r.department_count,32);
  assert.equal(r.family_count,8);
  assert.equal(r.unique_source_ids,200);
  assert.equal(r.documents_with_copy,200);
  assert.equal(r.library_media,629);
  assert.equal(r.candidate_cases_count,5);
  assert.equal(r.production_autonomy_certified,0);
  assert.equal(r.permissions_increased,0);
  assert.equal(r.wordpress_mutations,0);
  assert.equal(r.additional_eur,0);
  assert.match(r.source_integrity_sha256,/^[0-9a-f]{64}$/);
  assert.equal(new Set(r.preflights.map(x=>x.department_id)).size,32);
  for(const d of r.preflights) {
    assert.equal(d.identity_certified,false);
    assert.equal(d.publish_allowed,false);
    assert.equal(d.external_writes,false);
    assert.equal(d.status,'LAB_READONLY_PREFLIGHT_EXECUTED_AGENT_NOT_CERTIFIED');
    assert.equal(d.qa_required,'SEO-D31');
    assert.equal(d.training_required,'SEO-D32');
    assert.ok(d.specialist_instruction.length>30);
  }
});
test('production, other company, fees, writes, and invalid limits fail closed', () => {
  for(const c of [
    {company_id:'captacasa'},{environment:'PROD'},{external_writes:true},
    {paid_ai_calls:1},{budget_eur:0.01},{case_limit:0},{case_limit:100}
  ])assert.throws(()=>runSeo32LiveCorpusPreflight(c),/(DENIED|INVALID)/);
});
test('preflight evidence is deterministic and excludes original copy and credentials',()=>{
  const a=runSeo32LiveCorpusPreflight(),b=runSeo32LiveCorpusPreflight();
  assert.deepEqual(a,b);
  const out=JSON.stringify(a);
  assert.ok(!out.includes('client_secret'));
  assert.ok(!out.includes('access_token'));
  assert.ok(!out.includes('<script'));
});
