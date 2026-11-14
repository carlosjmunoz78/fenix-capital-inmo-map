// Probe ONLY the isolated, pre-existing Vercel LAB Preview.
// This script deliberately has no cookies, credentials, redirects, service tokens or PROD URL.
// It asserts Vercel SSO denies anonymous access. It does not test authenticated owner E2E.
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

const ALLOWED_HOST='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app';
const url=process.env.CEREBRO_LAB_PREVIEW_URL||'';
const target=new URL(url);
assert.equal(target.protocol,'https:');
assert.equal(target.hostname,ALLOWED_HOST);
assert.equal(target.username,'');
assert.equal(target.password,'');
assert.equal(target.search,'');
assert.equal(target.hash,'');
assert.equal(target.pathname,'/');
const targets=['/cerebro?section=operativa&visual_lab=cockpit-v3','/api/cerebro-universal-preview'];
const allowedStatus=new Set([301,302,303,307,308,401,403]);
async function probe(path){
 let outcome;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetch(new URL(path,url),{
    method:'GET',redirect:'manual',cache:'no-store',
    headers:{accept:'text/html'},signal:controller.signal
   });}finally{clearTimeout(timer);}
   outcome={path,status:response.status,attempt};
   if(allowedStatus.has(response.status)){
    if(response.status>=300&&response.status<400){
     const location=response.headers.get('location')||'';
     const destination=new URL(location,new URL(path,url));
     // Only authentication challenge redirects are allowed. Never follow them or get cookies.
     if(destination.hostname===ALLOWED_HOST && !/auth|login|sso|vercel/i.test(destination.pathname))throw Error('SSO_REDIRECT_NOT_VERIFIED');
     if(destination.hostname!==ALLOWED_HOST && destination.hostname!=='vercel.com' && !destination.hostname.endsWith('.vercel.com'))throw Error('SSO_REDIRECT_UNEXPECTED_HOST');
    }
    console.log(JSON.stringify({check:'ANONYMOUS_SSO_DENIED',...outcome}));
    return;
   }
   throw Error('ANONYMOUS_ACCESS_NOT_DENIED_HTTP_'+response.status);
  }catch(err){
   if(String(err).includes('ANONYMOUS_ACCESS_NOT_DENIED')||String(err).includes('SSO_REDIRECT'))throw err;
   if(attempt===2)throw Error('PROBE_TRANSPORT_UNAVAILABLE: '+String(err));
   await sleep(400);
  }
 }
}
for(const path of targets)await probe(path);
console.log('REMOTE_PREVIEW_SSO_GUARD_GREEN; OWNER_LOGIN_E2E_PENDING; NO_PROD_MUTATIONS');
