import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGES_SCOPE,PAGES_SAFE_NAME,PAGES_ACTIONS,pagesTick} from '../pages-adapter.mjs';
test('Pages only LAB + exact owned prefix',()=>{
 assert.equal(PAGES_SCOPE.environment,'LAB');
 assert.equal(PAGES_SAFE_NAME.test('cerebro-fact001-managed-pages-lab-a001'),true);
 for(const name of ['fenix-capital-inmo-map','cerebro-jarvis-lab','cerebro-fact001-managed-pages-lab-'] )
  assert.equal(PAGES_SAFE_NAME.test(name),false);
 assert.equal(PAGES_ACTIONS.length,4);
});
test('without independent Pages token no D1 or upstream operation',async()=>{
 assert.deepEqual(await pagesTick({RECOVERY_DB:{}},1234),{status:'PAGES_SECRET_NOT_CONFIGURED'});
});
test('empty Pages queue never uses Cloudflare',async()=>{
 let n=0;const db={prepare(){n++;return {bind(){return {first:async()=>null}}}}};
 assert.equal((await pagesTick({RECOVERY_DB:db,CF_PAGES_TOKEN:'a'.repeat(28)},1234)).status,'IDLE');
 assert.equal(n,1);
});
test('never deploy public Pages or expose token; owner ledger controls every mutation',()=>{
 const s=readFileSync(new URL('../pages-adapter.mjs',import.meta.url),'utf8');
 assert.ok(s.includes("method:'GET'")===false); // functions call verb as arguments
 assert.ok(s.includes('redirect:\\'manual\\''));
 assert.ok(s.includes("if(await owned(db,name))throw Error('PROJECT_EXISTS')"));
 assert.ok(s.includes('assertOwned(db,name'));
 assert.ok(s.includes('PAGES_PUBLIC_DEPLOYMENT_UNSAFE'));
 assert.ok(!s.includes('/deployments'));
 assert.ok(!s.includes('console.log('));
});
