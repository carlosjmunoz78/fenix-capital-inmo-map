import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=new URL('../',import.meta.url),run=fs.readFileSync(new URL('run-recover-source23.mjs',base),'utf8'),api=fs.readFileSync(new URL('index.ts',base),'utf8'),order=JSON.parse(fs.readFileSync(new URL('request-template-source23.v1.json',base),'utf8'));
test('pinned source chunk runner keeps index 23 only with checkpoint75/v3 and no provider writes',()=>{
 assert.equal(order.offset,75);assert.equal(order.item_index,23);assert.equal(order.checkpoint_version,3);
 assert.equal(order.previous_zip_sha256,'5ad72bef9789927e0caab76ad1f907d7cdef4583d3d2c556c6c5c7ef04bc187f');
 assert.ok(run.includes('source23-20261111.v1.json'));assert.ok(run.includes('source-chunk'));assert.ok(run.includes('item_index:23'));assert.ok(run.includes('checkpoint_moved:false'));assert.ok(api.includes("await verifyGitHubOidc(auth.slice(7))"));assert.ok(api.includes('SOURCECHUNK_'));assert.ok(api.includes("kind==='source-chunk'"));assert.ok(!/method:\s*['"](?:PUT|PATCH|DELETE)['"]/.test(run+api));
});