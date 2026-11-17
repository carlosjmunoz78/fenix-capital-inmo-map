import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {queryCerebroAgentDirectoryV0,verifiedReadOnlyMode,default as handler} from '../../api/cerebro-agent-directory.ts';
const data=queryCerebroAgentDirectoryV0(new URLSearchParams({company_id:'fenix',kind:'ALL',limit:'25'}));
assert.equal(data.page.total,2506);assert.equal(data.records.length,25);
assert.equal(data.executed,false);assert.equal(data.read_only,true);assert.equal(data.active_agents_verified,false);
assert.equal(data.counts.total_runtime_instances,null);
assert.equal(verifiedReadOnlyMode('app.fenixcapital.es','production'),'OWNER_PROD_READONLY');
assert.equal(verifiedReadOnlyMode('evil.example','production'),null);
const oldEnv=process.env.VERCEL_ENV,oldFetch=globalThis.fetch;
process.env.VERCEL_ENV='production';
function response(){let code=200,body=null;return{status(n){code=n;return this},setHeader(){},json(x){body=x},get(){return{code,body}}}}
async function req(method,query,h={}){
 const out=response();await handler({method,url:'/api/cerebro-agent-directory?'+query,headers:{host:'app.fenixcapital.es',...h}},out);
 return out.get();
}
try{
 const a=await req('GET','company_id=fenix');assert.equal(a.code,401);assert.equal(a.body.reason,'OWNER_SESSION_REQUIRED');
 assert.equal((await req('POST','company_id=fenix')).code,405);
 assert.equal((await req('GET','company_id=other')).code,400);
 const h={authorization:'Bearer '+'a'.repeat(60),apikey:'sb_publishable_'+'b'.repeat(24)};
 globalThis.fetch=async()=>({status:200,json:async()=>({actor_code:'CARLOS-ADMIN'})});
 const o=await req('GET','company_id=fenix&kind=ALL&limit=25',h);
 assert.equal(o.code,200);assert.equal(o.body.page.total,2506);assert.equal(o.body.transport,'OWNER_PROD_READONLY');
 globalThis.fetch=async()=>({status:200,json:async()=>({actor_code:'NOT-OWNER'})});
 assert.equal((await req('GET','company_id=fenix',h)).code,403);
}finally{if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;globalThis.fetch=oldFetch}
const ui=readFileSync(new URL('../../src/CerebroRoleAgentRosterReadonly.tsx',import.meta.url),'utf8');
const cockpit=readFileSync(new URL('../../src/CerebroOperativeCockpitV3.tsx',import.meta.url),'utf8');
assert.match(cockpit,/CerebroRoleAgentRosterReadonly/);
assert.doesNotMatch(ui,/CerebroAgentJobLivePanel|onShowEngines|executeJob|activateEngine/);
console.log('PASS owner-only read-only directory; 2506 sourced roles; deny writes and other actors/tenants');
