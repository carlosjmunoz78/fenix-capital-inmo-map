/**
 * CUT20 · Cloudflare Worker read-only candidate. NOT an auto-deploy entrypoint.
 * OFF by default, LAB only, needs trusted B2 identity + B3 grants + both rate
 * limiters. The D1 binding is server-only and never returned to the client.
 * Reuses OLD universal core/HTTP handler behind the existing security gates.
 * CREATE / EXECUTE routes are always denied, even if upstream grants exist.
 */
import {createJarvisD1MissionStore} from './jarvis-d1-mission-store.mjs';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
import {createJarvisB2B3GatewayReadGate} from './jarvis-b2-b3-gateway-read-gate.mjs';
import {createJarvisGatewaySecurityGate} from './jarvis-gateway-security-gate.mjs';

const respond=(status,reason)=>new Response(JSON.stringify({status:'DENIED',reason}),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff'}
});
const PATH=/^\/v1\/missions\/[A-Za-z0-9_-]{1,200}$/;

export function createJarvisCloudflareLabReadGateway({
 identityProvider,b3DecisionService,rateLimiter,perimeterLimiter,
 allowedOrigins=[],allowedHosts=[],environment='LAB',enabled=false
}={}){
 if(typeof enabled!=='boolean')throw TypeError('ENABLED_MUST_BE_BOOLEAN');
 if(enabled&&environment!=='LAB')throw TypeError('CLOUDFLARE_GATEWAY_LAB_ONLY');
 if(enabled&&(
  typeof identityProvider?.verify!=='function'||
  typeof b3DecisionService?.authorize!=='function'||
  typeof rateLimiter!=='function'||
  typeof perimeterLimiter!=='function'||
  !Array.isArray(allowedOrigins)||!allowedOrigins.length||
  !Array.isArray(allowedHosts)||!allowedHosts.length
 ))throw TypeError('CLOUDFLARE_GATEWAY_TRUSTED_PORTS_REQUIRED');
 return async function fetch(request,env){
  if(!enabled)return respond(503,'CLOUDFLARE_LAB_DISABLED');
  if(!(request instanceof Request))return respond(400,'REQUEST_INVALID');
  // Never accept mutative route; no D1 access before checking route and method.
  if(request.method!=='GET')return respond(405,'WRITE_ROUTE_NOT_ENABLED');
  let url;try{url=new URL(request.url)}catch{return respond(400,'URL_INVALID')}
  if(!PATH.test(url.pathname)||url.search||url.hash)
   return respond(404,'READ_ROUTE_NOT_ALLOWED');
  if(typeof env?.JARVIS_LAB_DB?.prepare!=='function')
   return respond(503,'ISOLATED_LAB_D1_NOT_BOUND');
  let store;
  try{store=createJarvisD1MissionStore({db:env.JARVIS_LAB_DB,environment:'LAB'})}
  catch{return respond(503,'ISOLATED_LAB_D1_UNAVAILABLE')}
  const core=new JarvisUniversalCore({identityProvider,store,environment:'LAB',
   capabilities:new Map()});
  const legacyHandler=createJarvisGatewayHandler({core,trustedAuthChannel:'fenix-app'});
  const readGate=createJarvisB2B3GatewayReadGate({
   handler:legacyHandler,identityProvider,b3DecisionService,missionStore:store,
   rateLimiter,enabled:true,environment:'LAB',trustedChannel:'fenix-app'
  });
  const perimeter=createJarvisGatewaySecurityGate({
   handler:readGate,enabled:true,allowedHosts,allowedOrigins,rateLimiter:perimeterLimiter
  });
  try{return await perimeter(request)}
  catch{return respond(503,'LAB_GATEWAY_UNAVAILABLE')}
 };
}
