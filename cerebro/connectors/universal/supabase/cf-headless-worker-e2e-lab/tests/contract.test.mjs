import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCOPE,TARGET,CLAIM,DONE,ISSUER,assertOrder,exactGroup,assertChild} from '../policy.mjs';
const request={...SCOPE,client_id:'cerebro',provider:'cloudflare',operation:'cloudflare.worker.headless_lifecycle_lab',request_id:'FACT001-CF-HEADLESS-WORKER-20261111-ONE',max_cost_eur:0};
test('exact signed 4D owner order and zero additional cost',()=>{
 assert.equal(assertOrder(request),true);
 for(const patch of [{environment:'PROD'},{company_id:'other'},{max_cost_eur:1},{operation:'cloudflare.worker.delete'},
  {worker:'production'},{token:'secret'},{request_id:'arbitrary'},{client_id:'chatgpt'}])
  assert.throws(()=>assertOrder({...request,...patch}));
});
test('scoped worker permission group requires exactly one matching account group',()=>{
 const good=[{name:'Workers Scripts Write',id:'e086da7e2179491d91ee5f35b3ca210a',scopes:['com.cloudflare.api.account'],is_selectable:false}];
 assert.equal(exactGroup(good,'Workers Scripts Write'),'e086da7e2179491d91ee5f35b3ca210a');
 assert.throws(()=>exactGroup([],'Workers Scripts Write'));
 assert.throws(()=>exactGroup([...good,...good],'Workers Scripts Write'));
 assert.throws(()=>exactGroup([{...good[0],scopes:['com.cloudflare.edge.zone']}],'Workers Scripts Write'));
});
test('child metadata rejects broad permissions and mismatched account',()=>{
 const id='a'.repeat(32),g='e086da7e2179491d91ee5f35b3ca210a';
 const good={id,name:'CEREBRO-FACT001-HEADLESS-WORKERS-LAB-20261111',status:'active',policies:[{
 effect:'allow',resources:{'com.cloudflare.api.account.e39a57e1ac42650ca5a6d5307cf0ac8e':'*'},permission_groups:[{id:g}]}]};
 assert.equal(assertChild(good,id,g),true);
 assert.throws(()=>assertChild({...good,name:'bad'},id,g));
 assert.throws(()=>assertChild({...good,policies:[{...good.policies[0],permission_groups:[{id:g},{id:'x'}]}]},id,g));
});
test('no dynamic target, credentials, or public exposure; finally revokes child',()=>{
 const src=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
 assert.equal(TARGET,'cerebro-fact001-worker-headless-e2e-20261111');
 assert.equal(ISSUER,'cerebro_cf_account_token_issuer_v2');
 assert.ok(src.includes("verifyGitHubOidc(bearer(req))"));
 assert.ok(src.includes("if(!['health','execute-once'].includes(route))"));
 assert.ok(src.includes("if(made&&child)"));
 assert.ok(src.includes("await cf(parent,'DELETE',account+'/tokens/'+childId)"));
 assert.ok(src.includes("await query('select vault.create_secret($1,$2,$3)'"));
 assert.ok(src.includes("sub.result?.enabled!==false"));
 assert.ok(src.includes("settings.result?.bindings?.length!==0"));
 assert.ok(src.includes("await sql.end"));
 assert.ok(!src.includes('console.log'));
 assert.ok(!src.includes('Deno.env.get("CF_'));
 assert.ok(CLAIM!==DONE);
});
