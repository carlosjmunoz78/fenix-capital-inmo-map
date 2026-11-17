import test from 'node:test';
import assert from 'node:assert/strict';
import {SUPABASE_EDGE_METADATA_READ_CONTRACT,probeSupabaseOwnedEdge} from '../supabase-mgmt-edge-readback.mjs';
const NOW=1794419220000;
const PRINCIPAL={trusted:true,source:'github_oidc',client_id:'cerebro',company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',capability:'fact001.supabase.edge_canary.lab'};
const H='a'.repeat(64);
const token='x'.repeat(40);
const payload={id:'only-lab-canary-id',slug:'cerebro-fact001-sb-mgmt-canary-lab',
 status:'ACTIVE',version:1,ezbr_sha256:H};
const mock=(status,body)=>async (url,options)=>{
 assert.equal(url,'https://api.supabase.com/v1/projects/cluhljgonannaafpmblx/functions/cerebro-fact001-sb-mgmt-canary-lab');
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
 assert.equal(options.headers.Accept,'application/json');
 assert.equal(options.headers.Authorization,'Bearer '+token);
 return {status,json:async()=>body};
};
const fail=(fn,code)=>assert.rejects(fn,x=>x.message===code);
test('contract has only fixed GET and no body download or writes',()=>{
 assert.equal(SUPABASE_EDGE_METADATA_READ_CONTRACT.method,'GET');
 assert.equal(SUPABASE_EDGE_METADATA_READ_CONTRACT.writes_enabled,false);
 assert.equal(SUPABASE_EDGE_METADATA_READ_CONTRACT.body_download_enabled,false);
});
test('absent synthetic target is verified without a project-wide scan',async()=>{
 const p=await probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:mock(404),now:()=>NOW});
 assert.equal(p.exists,false);assert.equal(p.verified,true);
 assert.equal(p.sha256,null);assert.equal(p.mutations,0);assert.equal(p.metadata_only,true);
});
test('existing exact slug returns only version and bundle hash',async()=>{
 const p=await probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:mock(200,payload),now:()=>NOW});
 assert.equal(p.exists,true);assert.equal(p.sha256,H);assert.equal(p.version,1);
 assert.equal(p.checked_at,NOW);assert(!JSON.stringify(p).includes(token));
});
test('foreign slugs or partial JSON cannot be considered verified',async()=>{
 for(const x of [{...payload,slug:'cerebro-console-gateway-v0'},
  {...payload,ezbr_sha256:'bad'}, {...payload,version:-1},
  {...payload,id:undefined}, {...payload,status:'UNKNOWN'},['wrong']]){
  await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:mock(200,x),now:()=>NOW}),
     'SB_EDGE_READ_SHAPE_DENIED');
 }
});
test('401 403 429 500 fail closed, not absence',async()=>{
 for(const status of [401,403,429,500]){
  const expected=status===401||status===403?'SB_EDGE_READ_AUTH_'+status:
    status===429?'SB_EDGE_READ_RATE_LIMIT':'SB_EDGE_READ_HTTP_UNVERIFIED';
  await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:mock(status),now:()=>NOW}),expected);
 }
});
test('broken JSON and network failure cannot be marked verified',async()=>{
 await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,now:()=>NOW,
  http:async()=>({status:200,json:async()=>{throw Error('bad')}})}),'SB_EDGE_READ_NOT_JSON');
 await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,now:()=>NOW,
  http:async()=>{throw Error('private')}}),'SB_EDGE_READ_NETWORK_UNAVAILABLE');
});
test('CEREBRO service identity is independent of ChatGPT OAuth and user claims',async()=>{
 for(const p of [null,{...PRINCIPAL,source:'chatgpt'},
  {...PRINCIPAL,trusted:false},{...PRINCIPAL,environment:'PROD'},
  {...PRINCIPAL,capability:'*'}]){
  await fail(()=>probeSupabaseOwnedEdge({principal:p,token,http:mock(404),now:()=>NOW}),
    'SB_MGMT_SERVICE_IDENTITY_DENIED');
 }
});
test('invalid, empty and multiline tokens denied before HTTP',async()=>{
 for(const t of ['','short','abc\\nsecret','x'.repeat(9000)]){
  await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token:t,http:async()=>{throw Error('CALLED')},now:()=>NOW}),
  'SB_EDGE_READ_TOKEN_DENIED');
 }
});
test('clock and bad upstream status rejected',async()=>{
 await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:mock(404),now:()=>NaN}), 'SB_EDGE_READ_CLOCK_DENIED');
 await fail(()=>probeSupabaseOwnedEdge({principal:PRINCIPAL,token,http:async()=>({status:'404'}),now:()=>NOW}),
  'SB_EDGE_READ_UPSTREAM_UNVERIFIED');
});
