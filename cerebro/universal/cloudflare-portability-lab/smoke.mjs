import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{offlineCatalogCheck} from './worker/index.ts';
assert.deepEqual(offlineCatalogCheck(),{total:2506,read_only:true,executed:false,verified_live:false});
const config=JSON.parse(readFileSync(new URL('./wrangler.jsonc',import.meta.url),'utf8'));
assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.equal(config.observability.enabled,false);
assert.equal(config.assets.directory,'../../../dist');assert.equal(config.assets.not_found_handling,'single-page-application');
assert.deepEqual(config.assets.run_worker_first,['/api/*']);assert.equal(config.main,'./worker/index.ts');
assert(!Object.hasOwn(config,'routes')&&!Object.hasOwn(config,'triggers')&&!Object.hasOwn(config,'vars'));
let outbound=0,assets=0;const original=globalThis.fetch;
globalThis.fetch=async()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN')};
const env={ASSETS:{fetch:async()=>{assets++;return new Response('<main>STATIC TEST ONLY</main>',{status:200})}}};
const run=(path,init={})=>worker.fetch(new Request('https://example.invalid'+path,init),env);
try{
 const a=await run('/api/cerebro-agent-directory?company_id=fenix');assert.equal(a.status,503);
 const data=await a.json();assert.equal(data.production_authorized,false);assert.equal(data.executed,false);
 assert.equal(data.reason,'CLOUDFLARE_PORTABILITY_LAB_API_DISABLED');
 assert.equal((await run('/api/cerebro-agent-directory',{headers:{authorization:'Bearer '+ 'x'.repeat(50)}})).status,503);
 assert.equal((await run('/api/cerebro-agent-directory',{method:'POST'})).status,405);
 assert.equal((await run('/api/cerebro-agent-directory',{headers:{origin:'https://attacker.invalid'}})).status,403);
 assert.equal((await run('/api/cerebro-preview-owner')).status,503);
 assert.equal((await run('/api/another')).status,503);
 const page=await run('/inicio');assert.equal(page.status,200);assert.match(await page.text(),/STATIC TEST ONLY/);
 assert.equal(page.headers.get('x-robots-tag'),'noindex,nofollow');
 assert.equal((await run('/inicio',{method:'POST'})).status,405);
 assert.equal(outbound,0);assert.equal(assets,1);
}finally{globalThis.fetch=original}
console.log('PASS: portable 2506 catalog, SPA assets and API fail-closed; 0 network requests');