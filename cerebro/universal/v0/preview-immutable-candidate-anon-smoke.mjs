/** P0-A · real anonymous HTTP denial on exactly one READY immutable OPERATIVA LAB candidate.
 * Bounded GET and invalid POST only, no tokens/cookies, no redirect-follow, no PROD domain.
 * Tests admission security only: never proves real owner, revocation or control receipts.
 */
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

const HOST='fenix-capital-preprod-hyr2rrwvi.vercel.app';
const ROOT='https://'+HOST+'/';
const value=process.env.CEREBRO_LAB_REFERENCE_CANDIDATE_URL||'';
assert.equal(value,ROOT,'Exact immutable LAB candidate required');
const target=new URL(value);
assert.equal(target.hostname,HOST);
assert.equal(target.protocol,'https:');
assert.equal(target.username,'');
assert.equal(target.password,'');
assert.equal(target.search,'');
assert.equal(target.hash,'');
const routes=[
 {method:'GET',path:'/cerebro?section=operativa&visual_lab=cockpit-v3'},
 {method:'GET',path:'/api/cerebro-preview-owner'},
 {method:'POST',path:'/api/cerebro-lab-worker-control?company_id=otraempresa',body:'{}'},
 {method:'POST',path:'/api/cerebro-universal-preview',body:'{}'}
];
const deniedStatus=new Set([301,302,303,307,308,401,403]);
async function check({method,path,body}){
 let last='UNAVAILABLE';
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetch(new URL(path,ROOT),{
    method,redirect:'manual',cache:'no-store',
    headers:{accept:'text/html',...(body?{'content-type':'application/json'}:{})},
    body,signal:controller.signal
   });}finally{clearTimeout(timer);}
   if(!deniedStatus.has(response.status))
    throw Error('ANON_ACCESS_NOT_DENIED_'+response.status);
   if(response.status>=300&&response.status<400){
    const location=response.headers.get('location')||'';
    if(!location)throw Error('AUTH_CHALLENGE_LOCATION_MISSING');
    const redirect=new URL(location,new URL(path,ROOT));
    if(!(redirect.hostname===HOST||redirect.hostname==='vercel.com'||
       redirect.hostname.endsWith('.vercel.com'))||
       !/auth|login|sso|_vercel/i.test(redirect.pathname+redirect.search))
     throw Error('AUTH_CHALLENGE_NOT_VERIFIED');
   }
   console.log(JSON.stringify({status:'ANON_DENIED',method,path,status_code:response.status,attempt}));
   return;
  }catch(e){
   const error=String(e);
   if(/ANON_ACCESS_NOT_DENIED|AUTH_CHALLENGE/.test(error))throw e;
   last='TRANSPORT_UNAVAILABLE';
   if(attempt===2)break;
   await sleep(400);
  }
 }
 throw Error('CANDIDATE_NEGATIVE_'+last+'_'+method+'_'+path);
}
for(const route of routes)await check(route);
console.log('CANDIDATE_ANONYMOUS_HTTP_NEGATIVES=PASS; OWNER_REVOKED_SESSION_E2E=PENDING; PROD_UNCHANGED');
