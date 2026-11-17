// CEREBRO OS: negative-only network requests to Supabase PREPROD, NEVER to staging.
// No credentials, emails, personal data, customer payloads or downstream dispatch.
import assert from 'node:assert/strict';
const origin='https://staging.fenixcapital.es';
const base='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/';
for(const slug of ['fenix-web-lead-preprod','fenix-brevo-lead-intake-preprod']){
 const target=new URL(slug,base);
 assert.equal(target.hostname,'hnqlnvakzaywtafeiybt.supabase.co');
 const r=await fetch(target,{method:'POST',redirect:'manual',cache:'no-store',
  signal:AbortSignal.timeout(12000),
  headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({website:'',landing_url:''})
 });
 assert.equal(r.status,403,slug+': staging origin must be denied before processing');
 assert.notEqual(r.headers.get('access-control-allow-origin'),origin);
 const body=await r.json();
 assert.equal(body?.error,'origin_not_allowed');
 console.log(slug+': STAGING_ORIGIN_DENIED / HTTP 403 / no downstream action');
}
// Safe negative for a forged landing URL: only Supabase receives this string.
// The input is rejected before writing leads, enqueueing email or posting elsewhere.
const response=await fetch(new URL('fenix-web-lead-preprod',base),{
 method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12000),
 headers:{origin:'https://fenixcapital.es','content-type':'application/json'},
 body:JSON.stringify({website:'',landing_url:'https://staging.fenixcapital.es/blocked-sentinel'})
});
assert.equal(response.status,423,'suspended staging landing URL must not be processed');
assert.equal((await response.json()).error,'STAGING_SUSPENDED_BY_OWNER');
console.log('fenix-web-lead-preprod: STAGING_LANDING_DENIED / HTTP 423 / no downstream action');
