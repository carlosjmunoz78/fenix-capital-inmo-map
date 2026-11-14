// Guard-only anonymous POST against EXISTING protected Vercel Preview, never PROD.
import assert from 'node:assert/strict';
const origin=process.env.CEREBRO_LAB_PREVIEW_URL||'';
const base=new URL(origin);
const host='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app';
assert.equal(base.protocol,'https:');assert.equal(base.hostname,host);
assert.equal(base.pathname,'/');assert.equal(base.search,'');
const response=await fetch(new URL('/api/cerebro-universal-preview',base),{
 method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12000),
 headers:{'content-type':'application/json',accept:'application/json'},
 body:JSON.stringify({action:'plan_instruction',params:{company_id:'fenix',environment:'LAB',instruction:'estado de staging'}})
});
assert([301,302,303,307,308,401,403].includes(response.status),
 'Anonymous command planning must not be reachable: HTTP '+response.status);
if(response.status>=300&&response.status<400){
 const dest=new URL(response.headers.get('location')||'',base);
 assert(dest.hostname===host||dest.hostname==='vercel.com'||dest.hostname.endsWith('.vercel.com'));
 assert(dest.hostname!==host||/auth|login|sso|vercel/i.test(dest.pathname),
  'Redirect must be an authentication challenge');
}
console.log(JSON.stringify({status:'OWNER_INSTRUCTION_ANONYMOUS_DENIED',http_status:response.status,
 production_access:false,staging_access:false,external_actions:false}));
