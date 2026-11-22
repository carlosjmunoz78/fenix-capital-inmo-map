import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {verify,rewriteParagraph,repairParagraphs,countWords,BATCH,MANIFEST} from '../runtime/seo-surgical-v6-offline-lab.mjs';
const m=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
test('previous V5 closed and new V6 zero models, zero writes',()=>{
 const v=verify().m;
 assert.equal(BATCH,'SEO001-SURGICAL-DETERMINISTIC-20261108-V6');
 assert.equal(v.source.artifact_id,13603278337);
 assert.equal(v.limits.max_model_calls,0);
 assert.equal(v.limits.max_cost_eur,0);
 Object.entries(v.limits).forEach(([k,x])=>{if(k.startsWith('allow_'))assert.equal(x,false,k);});
});
test('original excerpts hashes, 88 and 89 words, rewritten to 85 each',()=>{
 assert.deepEqual(m.targets.map(r=>r.before_words),[88,89]);
 for(const r of m.targets){
  assert.equal(sha(r.original_text),r.before_sha256);
  const edited=rewriteParagraph(r.original_text,r);
  assert.equal(countWords(edited),85);
  assert.equal(edited.includes('<'),false);
 }
});
test('fail closed on drift, duplicates, wrong length and unapproved positions',()=>{
 const r=m.targets[0];
 assert.throws(()=>rewriteParagraph(r.original_text+' otro',r),/SOURCE_PARAGRAPH_HASH_DRIFT/);
 assert.throws(()=>rewriteParagraph(r.original_text,{...r,after_words:84}),/REWRITE_RANGE/);
 assert.throws(()=>rewriteParagraph(r.original_text,{...r,rewrite_pairs:[['de la','por'],['de la','por']]}),/REWRITE_NON_UNIQUE/);
 assert.throws(()=>repairParagraphs('<h1>No</h1>',[m.targets[0]]),/UNAUTHORIZED_INDICES/);
 assert.throws(()=>repairParagraphs('<h1>No</h1>',m.targets),/HTML_UNSAFE_OR_SIZE/);
});
