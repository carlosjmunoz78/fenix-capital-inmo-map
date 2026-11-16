import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LAB_MANIFEST} from './worker.mjs';
import worker from './worker.mjs';
const source = fs.readFileSync(new URL('./worker.mjs', import.meta.url), 'utf8');
test('scope explicitly LAB FACT-001 and historical company id unverified', () => {
 assert.deepEqual(LAB_MANIFEST, {
 company_id: 'fenix-capital', canonical_company_mapping_verified: false,
 engine_id: 'FACT-001', environment: 'LAB', version: 'p0b-provider-proof-v0.1.0',
 policy_version: 'p0b-proof-policy-v1', external_actions_enabled: false, prod_execution_enabled: false
 });
});
test('fetch is always 404 with no content or data leak', async()=> {
 for (const method of ['GET','POST','DELETE','PUT']) {
   const res=await worker.fetch(new Request('https://example.com/run',{method}));
   assert.equal(res.status,404);assert.equal(await res.text(),'Not Found');
   assert.equal(res.headers.get('cache-control'),'no-store');
 }
});
test('no scheduled, queue, secret, database or outbound API surface',()=> {
 assert.equal(Object.keys(worker).join(','),'fetch');
 assert.doesNotMatch(source, /\b(?:fetch\s*\(|fetch\s*:\s*async|await\s+fetch|require\(|setInterval|scheduled\s*\(|queue\s*\(|D1|KV\.|R2\.|secret_|service_role|process\.env|CEREBRO_LAB_SERVICE_ROLE_KEY)\b/);
});
test('static source does not import anything or expose privileged dynamic actions',()=>{
 assert.doesNotMatch(source,/^import\s/m);
 assert.doesNotMatch(source,/\b(?:eval|new Function|WebSocket|crypto\.subtle|console\.log)\b/);
});
