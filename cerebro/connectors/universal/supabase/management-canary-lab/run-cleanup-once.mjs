// FACT001: only deletes the inert synthetic canary after operator readback and signed owner order.
import fs from 'node:fs';
const path='cerebro/connectors/universal/supabase/management-canary-lab/requests/cleanup-once.v1.json';
const order=JSON.parse(fs.readFileSync(path,'utf8'));
const fixed={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',target_project:'cluhljgonannaafpmblx',target_function:'cerebro-fact001-sb-mgmt-canary-lab',max_cost_eur:0,request_id:'FACT001-SBMGT-CANARY-20261112',action:'OWNER_APPROVED_FIXED_CANARY_CLEANUP',expected_sha256:'471280452dbce865ab7c38f19ef363a5b36e646f1000bb3e7ba144151604fa05',expected_version:3};
if(JSON.stringify(order)!==JSON.stringify(fixed))throw Error('CLEANUP_SCOPE_DENIED');
const url='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-sb-mgmt-owner-lab/once';
async function call(step,sha=null,version=null){
 const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!ep||!grant)throw Error('OIDC_UNAVAILABLE');
 const issuer=await fetch(ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-sb-mgmt-owner-lab-20261112'),{headers:{Authorization:'Bearer '+grant},signal:AbortSignal.timeout(16000),redirect:'error'});
 if(issuer.status!==200)throw Error('OIDC_DENIED');
 const jwt=(await issuer.json()).value;
 const body={company_id:fixed.company_id,engine_id:fixed.engine_id,environment:fixed.environment,version:fixed.version,client_id:fixed.client_id,source:fixed.source,target_project:fixed.target_project,target_function:fixed.target_function,max_cost_eur:0,request_id:fixed.request_id,step,expected_sha256:sha,expected_version:version};
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});
 let out={};try{out=await r.json()}catch{}
 console.log('CEREBRO_SBMGMT_CLEANUP_'+step+'_HTTP='+r.status);
 console.log('CEREBRO_SBMGMT_CLEANUP_'+step+'_STATE='+String(out.status||out.code||'NO_RESPONSE').replace(/[^A-Z0-9_]/g,''));
 if(r.status!==200||out.step!==step||out.status!==(step==='delete'?'DELETE_VERIFIED':'ABSENT_VERIFIED'))throw Error('CLEANUP_NOT_VERIFIED');
}
await call('delete',fixed.expected_sha256,fixed.expected_version);
await call('verify_absent');
console.log('CEREBRO_SUPABASE_TEST_CANARY_FINAL_ABSENT=TRUE');
