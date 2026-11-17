/** Negative remote-only acceptance of owner LAB runtime: no keys/tokens. */
import assert from 'node:assert/strict';
const base='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-lab-runtime-v0';
const scope='company_id=fenix&environment=LAB&engine_id=LAB-DEMO-001&version=0.1.0';
const get=await fetch(base+'/state?'+scope,{method:'GET',redirect:'error',signal:AbortSignal.timeout(9000)});
assert.ok([401,403].includes(get.status),'Anonymous GET must be denied: '+get.status);
const post=await fetch(base+'/control',{method:'POST',redirect:'error',
 headers:{'content-type':'application/json'},
 body:JSON.stringify({company_id:'fenix',engine_id:'LAB-DEMO-001',environment:'LAB',version:'0.1.0',
  action:'RESUME',priority:null,expected_revision:1,idempotency_key:'labctrl-anonymous-must-fail-00001'}),
 signal:AbortSignal.timeout(9000)});
assert.ok([401,403].includes(post.status),'Anonymous control must be denied: '+post.status);
const other=await fetch(base+'/state?company_id=fenix&environment=PROD&engine_id=LAB-DEMO-001&version=0.1.0',
 {method:'GET',redirect:'error',signal:AbortSignal.timeout(9000)});
assert.ok([400,401,403,404].includes(other.status),'PROD scope must be denied: '+other.status);
console.log('LAB runtime anonymous and PROD negative gates GREEN; no authenticated mutations performed');
