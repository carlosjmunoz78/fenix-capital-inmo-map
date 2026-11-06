/**
 * CUT32 candidate Access-protected worker, no deploy.
 * B2 device sessions are PRE-ENROLLED by a separate approved administration.
 * Never automatically mint, insert or renew session rows in this Worker.
 * The existing CUT30 /__jarvis/owner-check behavior is preserved.
 */
import {createJarvisAccessOwnerCanary} from '../core/jarvis-access-owner-canary.mjs';
import {createJarvisB2DeviceSessionGate} from '../core/jarvis-b2-device-session-gate.mjs';
import {createJarvisD1SessionStore} from '../core/jarvis-d1-session-store.mjs';
import {createJarvisB2DeviceEnrollment} from '../core/jarvis-b2-device-enrollment.mjs';
import {createJarvisB2DeviceSetup} from '../core/jarvis-b2-device-setup.mjs';

const canary=createJarvisAccessOwnerCanary({environment:'LAB',enabled:true});
const deviceSetup=createJarvisB2DeviceSetup({environment:'LAB',enabled:true});
const headers={'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff',
 'x-frame-options':'DENY','referrer-policy':'no-referrer'};
const respond=(status,code)=>new Response(JSON.stringify({
 status:code,environment:'LAB',b3:'OFF',gateway:'OFF',prod:'NO_GO'
}),{status,headers});
export default {async fetch(request,env,ctx){
 if(!(request instanceof Request))return respond(400,'REQUEST_INVALID');
 let url;
 try{url=new URL(request.url)}catch{return respond(400,'REQUEST_INVALID')}
 if(url.pathname==='/__jarvis/b2-device-setup'||
    url.pathname==='/__jarvis/b2-device-setup.js')
  return deviceSetup.fetch(request,env,ctx);
 if(url.pathname==='/__jarvis/b2-device-enroll'){
  if(env?.JARVIS_ENVIRONMENT!=='LAB'||
     env?.JARVIS_B2_ENROLLMENT_ENABLED!=='true'||
     env?.JARVIS_GATEWAY_ENABLED!=='false'||
     env?.JARVIS_B2_B3_LIVE_ENABLED!=='false'||
     typeof env?.JARVIS_LAB_DB?.batch!=='function')
    return respond(503,'B2_ENROLLMENT_DISABLED');
  const issuer=createJarvisB2DeviceEnrollment({
   db:env.JARVIS_LAB_DB,environment:'LAB',enabled:true
  });
  return issuer.enroll({request,ctx,env});
 }
 if(url.pathname!=='/__jarvis/b2-device-status')
  return canary.fetch(request,env,ctx);
 if(request.method!=='GET')return respond(405,'METHOD_DENIED');
 if(url.search||url.hash)return respond(404,'ROUTE_DENIED');
 if(env?.JARVIS_ENVIRONMENT!=='LAB'||
    env?.JARVIS_B2_DEVICE_ENABLED!=='true'||
    env?.JARVIS_B2_B3_LIVE_ENABLED!=='false'||
    env?.JARVIS_GATEWAY_ENABLED!=='false')
  return respond(503,'B2_DEVICE_DISABLED');
 if(typeof env?.JARVIS_LAB_DB?.prepare!=='function')
  return respond(503,'D1_UNAVAILABLE');
 try{
  const store=createJarvisD1SessionStore({
   db:env.JARVIS_LAB_DB,environment:'LAB',
   trustedChannel:'cloudflare-access'
  });
  const gate=createJarvisB2DeviceSessionGate({
   enabled:true,sessionStore:store,environment:'LAB'
  });
  await gate.verify({request,ctx,env});
  return respond(200,'B2_DEVICE_SESSION_VERIFIED_NO_B3');
 }catch{return respond(403,'B2_DEVICE_SESSION_NOT_VERIFIED')}
 }};
