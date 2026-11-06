/**
 * CUT31 · Candidate upgrade to SAME Access-protected LAB Worker.
 * NOT DEPLOYED. GET /__jarvis/b2-status checks a pre-existing, active D1
 * session binding. No enrollment, mutation, grants, mission or live Gateway.
 *
 * Requires independent review before replacing the live CUT30 canary bundle.
 */
import {createJarvisAccessOwnerCanary} from '../core/jarvis-access-owner-canary.mjs';
import {createJarvisAccessB2SessionVerifier} from '../core/jarvis-access-b2-session-verifier.mjs';
import {createJarvisD1SessionStore} from '../core/jarvis-d1-session-store.mjs';

const canary=createJarvisAccessOwnerCanary({enabled:true,environment:'LAB'});
const common={
 'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
 'x-frame-options':'DENY'
};
const result=(status,reason)=>new Response(JSON.stringify({status:reason,environment:'LAB',
 b3:'OFF',gateway:'OFF',prod:'NO_GO'}),{status,headers:common});
export default {
 async fetch(request,env,ctx){
  if(!(request instanceof Request))return result(400,'INVALID_REQUEST');
  let url;
  try{url=new URL(request.url)}catch{return result(400,'INVALID_URL')}
  if(url.pathname!=='/__jarvis/b2-status')return canary.fetch(request,env,ctx);
  if(request.method!=='GET')return result(405,'METHOD_DENIED');
  if(url.search||url.hash)return result(404,'ROUTE_DENIED');
  if(env?.JARVIS_ENVIRONMENT!=='LAB'||
     env?.JARVIS_B2_ACCESS_ENABLED!=='true'||
     env?.JARVIS_B2_B3_LIVE_ENABLED!=='false'||
     env?.JARVIS_GATEWAY_ENABLED!=='false')
    return result(503,'B2_LAB_DISABLED');
  if(typeof env?.JARVIS_LAB_DB?.prepare!=='function')
    return result(503,'B2_D1_BINDING_UNAVAILABLE');
  try{
   const store=createJarvisD1SessionStore({
    db:env.JARVIS_LAB_DB,environment:'LAB',trustedChannel:'cloudflare-access'
   });
   const verifier=createJarvisAccessB2SessionVerifier({
    sessionStore:store,enabled:true,environment:'LAB'
   });
   await verifier.verify({ctx,env});
   return result(200,'B2_SESSION_VERIFIED_NO_B3_GRANTS');
  }catch{
   return result(403,'B2_ACCESS_SESSION_NOT_VERIFIED');
  }
 }
};
