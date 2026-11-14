import test from 'node:test';
import assert from 'node:assert/strict';
import {RULESET,repairSeoV4FromKnownOwnerFeedback} from '../runtime/seo-d13-v4-canonical-deterministic-repair-v0.mjs';

test('V4 repair only accepts exact source hashes for two known items, no arbitrary copy',()=>{
 const ids=Object.keys(RULESET);
 assert.deepEqual(ids,['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002']);
 for(const [work_id,v] of Object.entries(RULESET)){
  assert.match(v.original_sha256,/^[a-f0-9]{64}$/);
  assert.ok(v.corrections.length>=3);
  for(const [from,to] of v.corrections){
   assert.ok(from.length>35);
   assert.ok(to.length>25);
   assert.equal(to.includes(':'),false);
   assert.doesNotMatch(to,/\bademás\b|\ben conclusión\b/i);
  }
  assert.throws(()=>repairSeoV4FromKnownOwnerFeedback({work_id,html:'<h1>fabricado</h1>'}),/UNKNOWN_OR_MODIFIED_SOURCE_DIGEST/);
 }
 assert.throws(()=>repairSeoV4FromKnownOwnerFeedback({work_id:'OTHER',html:'abc'}),/WORK_OR_HTML_SCOPE/);
});
test('no mutation of the original V3: repair of later cloud candidate is a new digest',()=>{
 const b2c=RULESET['SEO001-FENIX-B2C-EDITORIAL-001'];
 assert.match(b2c.corrections[0][1],/al llegar a casa/);
 assert.match(b2c.corrections[1][1],/Por ejemplo/);
 assert.match(b2c.corrections[2][1],/nota simple/i);
 const b2b=RULESET['SEO001-FENIX-B2B-EDITORIAL-002'];
 assert.ok(b2b.corrections.some(([from])=>/segunda visita/i.test(from)));
 assert.ok(b2b.corrections.every(([from,to])=>from!==to));
});
