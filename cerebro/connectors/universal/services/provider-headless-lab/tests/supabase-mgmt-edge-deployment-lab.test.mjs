import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSupabaseIsolatedLab,exerciseSupabaseIsolatedCanary,SUPABASE_CANARY} from '../supabase-mgmt-edge-deployment-lab.mjs';
const principal={trusted:true,client_id:'cerebro',company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',source:'github_oidc'};
const trustedConfig={origin:'CEREBRO_SERVER_PRIVATE_CONFIG',environment:'LAB',owner_approved:true,max_cost_eur:0,project_ref:'labpreview123456789'};
const token='x'.repeat(32),slug=SUPABASE_CANARY;
const sha=n=>n.toString(16).padStart(64,'0');
function fake(){
 const state={present:false,version:0,digest:null,events:[],contents:[]};
 return {state,async http(url,init){
  state.events.push({url,method:init.method});
  if(init.method==='GET')return new Response(state.present?JSON.stringify({slug,status:'ACTIVE',version:state.version,ezbr_sha256:state.digest,verify_jwt:true}):null,{status:state.present?200:404});
  if(init.method==='POST'){
   const form=init.body;
   assert.equal(form instanceof FormData,true);
   const metadata=JSON.parse(form.get('metadata'));
   assert.equal(metadata.verify_jwt,true);
   assert.equal(metadata.entrypoint_path,'index.ts');
   assert.equal(metadata.name,slug);
   const text=await form.get('file').text();
   assert.match(text,/Deno.serve/);
   assert.match(text,/status:404/);
   assert.ok(url.endsWith('/functions/deploy?slug='+slug));
   state.contents.push(text);
   state.present=true;state.version++;
   state.digest=sha(text.includes('canary V2')?2:1);
   return new Response(JSON.stringify({slug,status:'ACTIVE',version:state.version,verify_jwt:true}),{status:201});
  }
  if(init.method==='DELETE'){
   assert.equal(state.present,true);state.present=false;
   return new Response(null,{status:204});
  }
  throw Error('unexpected method');
 }};
}
test('requires a signed trusted CEREBRO principal and a separate zero-cost LAB project',()=>{
 assert.throws(()=>assertSupabaseIsolatedLab({trustedConfig,principal:{...principal,trusted:false}}),/SIGNED_PRINCIPAL_REQUIRED/);
 for(const p of ['cluhljgonannaafpmblx','hnqlnvakzaywtafeiybt']){
  assert.throws(()=>assertSupabaseIsolatedLab({trustedConfig:{...trustedConfig,project_ref:p},principal}),/SEPARATE_PROJECT_REQUIRED/);
 }
 assert.throws(()=>assertSupabaseIsolatedLab({trustedConfig:{...trustedConfig,max_cost_eur:1},principal}),/SEPARATE_PROJECT_REQUIRED/);
 assert.throws(()=>assertSupabaseIsolatedLab({trustedConfig:{...trustedConfig,owner_approved:false},principal}),/SEPARATE_PROJECT_REQUIRED/);
 assert.equal(assertSupabaseIsolatedLab({trustedConfig,principal}).slug,slug);
});
test('isolated create/update/source rollback/delete with all physical readbacks mocked',async()=>{
 const f=fake();const res=await exerciseSupabaseIsolatedCanary({trustedConfig,principal,managementToken:token,http:f.http});
 assert.deepEqual([res.created,res.updated,res.rolledBack,res.cleaned],[true,true,true,true]);
 assert.equal(res.protected_projects_modified,0);
 assert.equal(res.customer_writes,0);
 assert.equal(f.state.present,false);
 assert.deepEqual(f.state.contents.map(s=>s.includes('canary V2')?'v2':'v1'),['v1','v2','v1']);
 assert.equal(f.state.events.filter(x=>x.method==='POST').length,3);
});
test('fails closed on existing canary without any write',async()=>{
 const f=fake();f.state.present=true;f.state.version=1;f.state.digest=sha(1);
 await assert.rejects(exerciseSupabaseIsolatedCanary({trustedConfig,principal,managementToken:token,http:f.http}),/BASELINE_NOT_EMPTY/);
 assert.deepEqual(f.state.events.map(x=>x.method),['GET']);
});
test('fails closed on invalid credential and protected project without making a call',async()=>{
 const f=fake();
 await assert.rejects(exerciseSupabaseIsolatedCanary({trustedConfig:{...trustedConfig,project_ref:'cluhljgonannaafpmblx'},principal,managementToken:token,http:f.http}),/SEPARATE_PROJECT_REQUIRED/);
 await assert.rejects(exerciseSupabaseIsolatedCanary({trustedConfig,principal,managementToken:'x',http:f.http}),/PRIVATE_TOKEN_REQUIRED/);
 assert.equal(f.state.events.length,0);
});
test('fails closed and leaves mutation for reconciliation on uncertain API error',async()=>{
 const f=fake();const x=f.http;
 f.http=async(url,opts)=>{if(opts.method==='POST')return new Response(null,{status:503});return x(url,opts);};
 await assert.rejects(exerciseSupabaseIsolatedCanary({trustedConfig,principal,managementToken:token,http:f.http}),/DEPLOY_HTTP_503/);
 assert.equal(f.state.present,false);
});
