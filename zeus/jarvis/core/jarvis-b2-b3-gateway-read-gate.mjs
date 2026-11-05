/**
 * JARVIS B2 -> B3 -> universal Gateway adapter, lab-only and read-only.
 * Not installed on a deployed Edge Function. Existing mission creation and
 * execution remain DISABLED here until separate authorization/rollback gates.
 * Trusted mission scope comes from a server store, not client query/body.
 */
const reply=(status,reason)=>new Response(JSON.stringify({status:'DENIED',reason}),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff'}
});
const MISSION_PATH=/^\/v1\/missions\/([A-Za-z0-9_-]{1,200})$/;
const CHANNEL=/^[a-z][a-z0-9-]{1,79}$/;
const id=(s)=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(s);
export function createJarvisB2B3GatewayReadGate({
 handler,identityProvider,b3DecisionService,missionStore,rateLimiter,
 enabled=false,environment='LAB',trustedChannel='fenix-app'
}={}){
 if(typeof handler!=='function')throw TypeError('TRUSTED_HANDLER_REQUIRED');
 if(enabled!==true&&enabled!==false)throw TypeError('ENABLED_MUST_BE_BOOLEAN');
 if(environment!=='LAB'&&enabled)throw TypeError('PROD_OR_PREPROD_READ_GATE_NOT_CERTIFIED');
 if(!CHANNEL.test(trustedChannel))throw TypeError('TRUSTED_CHANNEL_INVALID');
 if(enabled&&(
  typeof identityProvider?.verify!=='function'||
  typeof b3DecisionService?.authorize!=='function'||
  typeof missionStore?.get!=='function'||
  typeof rateLimiter!=='function'
 ))throw TypeError('SERVER_AUTHORIZATION_ADAPTERS_REQUIRED');
 return async function readGate(request){
  if(!enabled)return reply(503,'B2_B3_LAB_GATE_DISABLED');
  if(!(request instanceof Request))return reply(400,'REQUEST_INVALID');
  let url;try{url=new URL(request.url)}catch{return reply(400,'URL_INVALID')}
  if(request.method!=='GET')return reply(405,'WRITE_ROUTE_NOT_ENABLED');
  const m=url.pathname.match(MISSION_PATH);
  if(!m||url.search||url.hash)return reply(404,'READ_ROUTE_NOT_ALLOWED');
  const bearer=request.headers.get('authorization')||'';
  if(!/^Bearer\s+[^\s]+$/.test(bearer)||bearer.length>8200)
   return reply(401,'BEARER_REQUIRED');
  const token=bearer.replace(/^Bearer\s+/,'');
  let principal,mission;
  try{
   principal=await identityProvider.verify(Object.freeze({
    channel:trustedChannel,accessToken:token
   }));
   if(!id(principal?.ownerId)||!id(principal?.sessionId)||
     !Array.isArray(principal?.roles)||!principal.roles.includes('OWNER_ROOT')||
     !Array.isArray(principal?.authorizedCompanies)||!principal.authorizedCompanies.length)
     return reply(403,'OWNER_AUTH_REQUIRED');
   mission=await missionStore.get(m[1]);
   if(!mission||mission.id!==m[1]||mission.ownerId!==principal.ownerId||
     mission.environment!=='LAB'||!id(mission.companyId)||
     !principal.authorizedCompanies.includes(mission.companyId))
    return reply(404,'MISSION_NOT_FOUND');
   const rateOk=await rateLimiter({ownerId:principal.ownerId,
    sessionId:principal.sessionId,companyId:mission.companyId,
    actionName:'MISSION_INSPECT'});
   if(rateOk!==true)return reply(429,'RATE_LIMIT_DENIED');
  }catch{return reply(403,'OWNER_AUTH_UNAVAILABLE')}
  let decision;
  try{
   decision=await b3DecisionService.authorize({
    token,companyId:mission.companyId,environment:'LAB',
    actionName:'MISSION_INSPECT'
   });
  }catch{return reply(503,'B3_POLICY_UNAVAILABLE')}
  // Cross-check owner scope; B3 ALLOW alone cannot override B2 OWNER_ROOT.
  if(decision?.decision!=='ALLOW'||decision.ownerId!==principal.ownerId||
    decision.companyId!==mission.companyId||decision.environment!=='LAB'||
    decision.action!=='MISSION_INSPECT')return reply(403,'B3_POLICY_DENIED');
  try{return await handler(request)}
  catch{return reply(503,'GATEWAY_UNAVAILABLE')}
 }
}
