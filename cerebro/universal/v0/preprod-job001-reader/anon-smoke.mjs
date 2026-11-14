// A single remote negative security probe, anonymous and read-only.
// Do not follow redirects, use tokens, print response bodies or touch App/CRM/PROD.
import assert from 'node:assert/strict';
const url='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-job001-read-lab-v0?company_id=fenix&environment=LAB';
const u=new URL(url);
assert.equal(u.hostname,'hnqlnvakzaywtafeiybt.supabase.co');
assert.equal(u.protocol,'https:');
const response=await fetch(url,{method:'GET',redirect:'manual',headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
assert.ok([401,403].includes(response.status),'Unexpected unauthenticated JOB001 Edge HTTP '+response.status);
console.log(JSON.stringify({check:'JOB001_PREPROD_OWNER_NEGATIVE_SECURITY_VERIFIED',status:response.status,authenticated:false,read_only:true}));
