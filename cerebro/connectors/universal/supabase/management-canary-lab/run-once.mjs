// One authorized owner-signed run. No PAT in GitHub. API calls only via sealed CEREBRO Vault service.
import fs from 'node:fs';
const path='cerebro/connectors/universal/supabase/management-canary-lab/requests/execute-once.v1.json';
const order=JSON.parse(fs.readFileSync(path,'utf8'));
const fixed={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',target_project:'cluhljgonannaafpmblx',target_function:'cerebro-fact001-sb-mgmt-canary-lab',max_cost_eur:0,request_id:'FACT001-SBMGT-CANARY-20261112',action:'OWNER_AUTHORIZED_ONCE'};
if(JSON.stringify(order)!==JSON.stringify(fixed))throw Error('OWNER_ORDER_DENIED');
const url='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-sb-mgmt-owner-lab/once';
const audience='cerebro-fact001-sb-mgmt-owner-lab-20261112';
async function jwt(){
 const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!ep||!grant)throw Error('OIDC_NOT_AVAILABLE');
 const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent(audience);
 const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');
 const token=(await r.json()).value;if(!token||token.split('.').length!==3)throw Error('OIDC_MALFORMED');
 return token;
}
async function call(step,sha=null,version=null,token=null){
 const data={company_id:fixed.company_id,engine_id:fixed.engine_id,environment:fixed.environment,version:fixed.version,client_id:fixed.client_id,source:fixed.source,target_project:fixed.target_project,target_function:fixed.target_function,max_cost_eur:0,request_id:fixed.request_id,step,expected_sha256:sha,expected_version:version};
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(100000)});
 let x={};try{x=await r.json()}catch{}
 return {http:r.status,body:x};
}
const anon=await call('preflight');
const fake=await call('preflight',null,null,'invalid-token');
if(anon.http!==401||fake.http!==401)throw Error('UNAUTH_OR_FORGED_NOT_DENIED');
const signed=await jwt();
const prodReq={company_id:fixed.company_id,engine_id:fixed.engine_id,environment:'PROD',version:fixed.version,client_id:fixed.client_id,source:fixed.source,target_project:fixed.target_project,target_function:fixed.target_function,max_cost_eur:0,request_id:fixed.request_id,step:'preflight',expected_sha256:null,expected_version:null};
const prod=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+signed,'Content-Type':'application/json'},body:JSON.stringify(prodReq),redirect:'error',signal:AbortSignal.timeout(20000)});
if(prod.status!==403)throw Error('PROD_SCOPE_DENIAL_FAILED');
console.log('SUPABASE_CEREBRO_ANON_401=PASS;FORGED_401=PASS;PROD_403=PASS');
const results=[];
let last=null,created=false,completed=false;
async function verified(step,expectedSha=null,expectedVersion=null){
 const res=await call(step,expectedSha,expectedVersion,await jwt());
 if(res.http!==200||res.body.status!=='COMPLETED'||res.body.step!==step){
  console.log('CEREBRO_SUPABASE_STEP_'+step+'_HTTP='+res.http);
  console.log('CEREBRO_SUPABASE_ERROR_'+step+'='+String(res.body.code||res.body.status||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
  throw Error('SBMGT_STEP_'+step+'_FAILED');
 }
 const x=res.body;
 console.log('CEREBRO_SUPABASE_STEP_'+step+'='+x.status);
 results.push({step,status:x.status,version:x.version||null,sha256:x.sha256||null,exists:x.exists||false});
 return x;
}
try{
 await verified('preflight');
 last=await verified('create');created=true;
 const original=last;
 last=await verified('update',last.sha256,last.version);
 last=await verified('restore',last.sha256,last.version);
 if(last.sha256!==original.sha256)throw Error('RESTORED_BUNDLE_HASH_MISMATCH');
 await verified('delete',last.sha256,last.version);
 await verified('verify_absent');
 completed=true;
}finally{
 if(created&&!completed){
  // Fail-closed: no automatic blind deletion; only delete precisely the last readback hash.
  // When unsure, an owner must reconcile this one synthetic canary.
  console.log('SUPABASE_LAB_OWNER_RECONCILIATION_REQUIRED=true');
 }
 fs.writeFileSync('fact001-supabase-mgmt-canary-proof.json',JSON.stringify({completed,results,scope:'fenix-capital/FACT-001/LAB/1.0.0',target:fixed.target_function,pat_exposed:false},null,2));
}
if(!completed)process.exitCode=1;
