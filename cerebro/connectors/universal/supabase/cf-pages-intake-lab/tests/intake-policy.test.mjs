import test from 'node:test';import assert from 'node:assert/strict';
import {SCOPE,assertCommand} from '../policy.mjs';
const valid={...SCOPE,provider:'cloudflare',operation:'pages.project.create_empty',
 resource_name:'cerebro-fact001-managed-pages-lab-s001',job_id:'FACT001-CF-CMD-20261111-SIGNED-01',
 request_id:'FACT001-CF-REQ-20261111-SIGNED-01',idempotency_key:'fact001-cf-intake-signed-20261111-01',max_cost_eur:0};
test('exact scoped command',()=>assert.equal(assertCommand(valid),true));
test('reject forged tenant, environment, operation and cost',()=>{
 for(const v of [{company_id:'other'},{environment:'PROD'},{operation:'worker.delete_all'},
   {max_cost_eur:1},{resource_name:'cerebro-jarvis-lab'},{token:'anything'},{job_id:'xyz'},{idempotency_key:'*'}])
  assert.throws(()=>assertCommand({...valid,...v}));
});
test('identity gate and exclusive table only, no Cloudflare scripts mutation',()=>{
 const source=requireRead();
 assert.ok(source.includes('verifyGitHubOidc(auth(req))'));
 assert.ok(source.includes("writes_to_provider:'D1_QUEUED_ONLY'"));
 assert.ok(source.includes('ON CONFLICT(idempotency_key) DO NOTHING'));
 assert.ok(source.includes("redirect:'manual'"));
 assert.ok(!source.includes('/workers/scripts'));
 assert.ok(!source.includes('console.log('));
});
function requireRead(){return requireFile(new URL('../index.ts',import.meta.url));}
import {readFileSync} from 'node:fs';function requireFile(url){return readFileSync(url,'utf8');}
