import {test} from 'node:test';
import assert from 'node:assert/strict';
import deviceHandler from '../../../api/cerebro-device-live.ts';
import jobHandler from '../../../api/cerebro-agent-job-live.ts';

// In-process negative acceptance tests only. No real JWT, private data or outbound HTTP.
const HOST='fenix-capital-preprod-cne6y2k01.vercel.app';
const AUTH='Bearer '+'s'.repeat(80);
const APIKEY='synthetic-test-publishable-key-1234';
const handlers=[
 {name:'device',route:'/api/cerebro-device-live',handler:deviceHandler},
 {name:'jobs',route:'/api/cerebro-agent-job-live',handler:jobHandler}
];
function responseCapture(){
 const state={status:null,body:null,headers:{}};
 return {state,res:{
  setHeader(k,v){state.headers[k.toLowerCase()]=v},
  status(n){state.status=n;return this},
  json(x){state.body=x;return this}
 }};
}
async function request(handler,route,{method='GET',query='?company_id=fenix',
 headers={},auth=true}={}){
 const {state,res}=responseCapture();
 await handler({method,url:route+query,headers:{
  host:HOST,...(auth?{authorization:AUTH,apikey:APIKEY}:{}),...headers
 }},res);
 return state;
}
test('P0-A: both isolated Preview owner proxies fail closed before LAB reads',async t=>{
 const previous={env:process.env.VERCEL_ENV,key:process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY,fetch:globalThis.fetch};
 t.after(()=>{
  if(previous.env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous.env;
  if(previous.key===undefined)delete process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY;
  else process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY=previous.key;
  globalThis.fetch=previous.fetch;
 });
 process.env.VERCEL_ENV='preview';
 process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY='synthetic-lab-publishable-key-123';
 for(const {name,route,handler} of handlers){
  await t.test(name+' denies anonymous, write, cross-tenant, origin and extra query without HTTP',async()=>{
   let fetches=0;
   globalThis.fetch=async()=>{fetches++;throw Error('Outbound request forbidden')};
   const cases=[
    [{auth:false},401],
    [{method:'POST'},405],
    [{query:'?company_id=another-company'},403],
    [{query:'?company_id=fenix&environment=PROD'},403],
    [{query:'?company_id=fenix&company_id=fenix'},403],
    [{headers:{origin:'https://untrusted.example'}},403],
    [{headers:{host:'app.fenixcapital.es'}},403]
   ];
   for(const [opts,status] of cases){
    const actual=await request(handler,route,opts);
    assert.equal(actual.status,status,name+' '+JSON.stringify(opts));
    assert.equal(actual.body?.executed,false);
    assert.equal(actual.headers['cache-control'],'private, no-store, max-age=0');
   }
   assert.equal(fetches,0);
  });
  await t.test(name+' denies expired/revoked/non-owner when identity resolver rejects',async()=>{
   for(const [status,body] of [
    [401,{error:'token_expired'}],
    [403,{error:'session_revoked'}],
    [200,{ok:true,context:{actor_code:'OTHER-USER'}}],
    [200,{ok:false,context:{actor_code:'CARLOS-ADMIN'}}],
    [200,{ok:true,context:{}}]
   ]){
    const urls=[];
    globalThis.fetch=async url=>{
     urls.push(String(url));
     return {status,json:async()=>body};
    };
    const r=await request(handler,route);
    assert.equal(r.status,403,name+' resolver status '+status);
    assert.equal(r.body?.executed,false);
    assert.equal(urls.length,1,'must never contact LAB when owner is rejected');
    assert.match(urls[0],/\/session\/context$/);
   }
  });
  await t.test(name+' authenticated resolver cannot bypass schema validation',async()=>{
   const urls=[];
   globalThis.fetch=async url=>{
    urls.push(String(url));
    if(urls.length===1)return {status:200,json:async()=>({ok:true,context:{actor_code:'CARLOS-ADMIN'}})};
    return {status:200,text:async()=>JSON.stringify({status:'OK',company_id:'another-company',secret:'NEVER_SHOW'})};
   };
   const r=await request(handler,route);
   assert.equal(r.status,503);
   assert.equal(r.body?.executed,false);
   assert.ok(!JSON.stringify(r.body).includes('NEVER_SHOW'));
   assert.equal(urls.length,2);
   assert.match(urls[1],/^https:\/\/hnqlnvakzaywtafeiybt\.supabase\.co\/functions\/v1\/cerebro-operativa-/);
  });
 }
});
