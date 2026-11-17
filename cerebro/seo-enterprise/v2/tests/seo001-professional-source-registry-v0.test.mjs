import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkOfficialSeoFeed} from '../runtime/seo001-official-feed-readonly-v0.mjs';
const body='<?xml version="1.0"?><rss><channel><item><title>Google test update</title><pubDate>Tue, 17 Nov 2026 08:00:00 GMT</pubDate></item></channel></rss>';
test('source registry 21 entries and unknown Vicseo remains unclaimed',()=>{
 const p=new URL('../registry/seo001-professional-source-registry-v0.json',import.meta.url);
 const r=JSON.parse(fs.readFileSync(p,'utf8'));
 assert.equal(r.sources.length,21);
 assert.equal(r.sources.find(s=>s.source_id==='VICSEO').url,null);
 assert.equal(r.sources.filter(s=>s.fetch_allowed).length,1);
 assert.equal(r.policy.no_prod_writes,true);
 assert.equal(r.policy.d31_independent_review_required,true);
});
test('first read establishes baseline; never confuses reading with learning',async()=>{
 const r=await checkOfficialSeoFeed({fetchImpl:async()=>({ok:true,text:async()=>body})});
 assert.equal(r.delta_state,'BASELINE_ONLY');
 assert.equal(r.latest_item_title,'Google test update');
 assert.equal(r.learning,'SEO-D32_CANDIDATE_NOT_TRAINED');
 assert.equal(r.prod_publication_allowed,false);
 assert.equal(r.prod_departments_certified,0);
 const again=await checkOfficialSeoFeed({fetchImpl:async()=>({ok:true,text:async()=>body}),priorDigest:r.content_sha256});
 assert.equal(again.delta_state,'UNCHANGED');
});
test('fails closed on status and malformed feeds',async()=>{
 await assert.rejects(checkOfficialSeoFeed({fetchImpl:async()=>({ok:false,status:503})}),/SOURCE_HTTP_503/);
 await assert.rejects(checkOfficialSeoFeed({fetchImpl:async()=>({ok:true,text:async()=>'<html>bad</html>'})}),/SOURCE_INVALID/);
 await assert.rejects(checkOfficialSeoFeed({fetchImpl:async()=>({ok:true,text:async()=>body}),priorDigest:'fake'}),/INVALID_PREVIOUS/);
});
