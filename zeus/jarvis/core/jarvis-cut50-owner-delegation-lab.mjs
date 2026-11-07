/**
 * CUT50 · Independent OWNER_ROOT B2/B3 -> existing CEREBRO Console/ACTGW
 * This is an in-process Node LAB adapter, NOT a Cloudflare deployable route.
 * The authentication boundary is created per request; never share a session
 * marked 'owner verified' between requests or channels.
 *
 * OFF by default. No credentials logged or copied into Console audits.
 * B2 Access+random device cookie+D1 checks remain in the original B2 verifier.
 * B3 separately verifies an exact action grant per skill and company.
 */
import { randomUUID } from 'node:crypto';
import {CerebroGatewayV0} from '../../cerebro/console/gateway.mjs';
import {bindJarvisCapabilityDelegationV0} from '../../cerebro/console/jarvis-capability-delegation-v0.mjs';

const MAX_BODY_BYTES=16_384;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,89}$/;
const SKILL=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const deny=(code,reason)=>new Response(JSON.stringify({
 status:'DENIED',reason,environment:'LAB',production_authorized:false
}),{status:code,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
const isString=v=>typeof v==='string'&&ID.test(v);
const allowedOrigin=x=>typeof x==='string'&&/^https:\/\/[A-Za-z0-9._:-]+$/.test(x)&&
 !x.includes('@')&&!x.includes('..');
const ownerAuthorized=(principal,device,company)=>
 isString(principal?.ownerId)&&isString(principal?.sessionId)&&
 principal.roles?.includes('OWNER_ROOT')===true&&
 Array.isArray(principal.authorizedCompanies)&&principal.authorizedCompanies.includes(company)&&
 device?.ownerId===principal.ownerId&&device.environment==='LAB'&&
 device.verifiedBy==='ACCESS_AND_PER_DEVICE_D1_SESSION'&&device.b3Granted===false&&
 device.roles?.includes('OWNER_ROOT')===true&&
 Array.isArray(device.authorizedCompanies)&&device.authorizedCompanies.includes(company);

export function createJarvisOwnerDelegationLabV0({
 deviceSessionGate,identityProvider,b3DecisionService,actionGateway,
 readCanonicalCatalogue,readReleaseManifests,rateLimiter,
 allowedHost,allowedOrigin:clientOrigin,channel='fenix-app',enabled=false
}={}){
 if(typeof enabled!=='boolean')throw TypeError('ENABLE_BOOLEAN_REQUIRED');
 if(enabled&&(
  typeof deviceSessionGate?.verify!=='function'||
  typeof identityProvider?.verify!=='function'||
  typeof b3DecisionService?.authorize!=='function'||
  typeof actionGateway?.execute!=='function'||
  actionGateway?.contract?.().environment!=='PREPROD'||
  typeof readCanonicalCatalogue!=='function'||
  typeof readReleaseManifests!=='function'||
  typeof rateLimiter!=='function'||
  !allowedOrigin(allowedHost)||!allowedOrigin(clientOrigin)||
  !isString(channel)
 ))throw TypeError('TRUSTED_SERVER_ADAPTERS_REQUIRED');

 return async function handle(request,env,ctx){
  if(!enabled||env?.JARVIS_OWNER_DELEGATION_LAB_ENABLED!=='true')
   return deny(503,'OWNER_DELEGATION_DISABLED');
  if(!(request instanceof Request))return deny(400,'REQUEST_INVALID');
  const url=new URL(request.url);
  if(url.origin!==allowedHost||request.headers.get('origin')!==clientOrigin)
   return deny(403,'ORIGIN_OR_HOST_DENIED');
  if(request.method!=='POST')return deny(405,'METHOD_DENIED');
  if(url.pathname!=='/__jarvis/lab/delegate'||url.search||url.hash)
   return deny(404,'ROUTE_NOT_FOUND');
  if(!/application\/json/i.test(request.headers.get('content-type')??''))
   return deny(415,'JSON_REQUIRED');
  const auth=request.headers.get('authorization')??'';
  if(!/^Bearer [^\s]+$/.test(auth)||auth.length>8200)
   return deny(401,'BEARER_REQUIRED');

  let raw,body;
  try{
   raw=await request.text();
   if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)
    return deny(413,'BODY_TOO_LARGE');
   body=JSON.parse(raw);
  }catch{return deny(400,'BODY_INVALID')}
  if(!body||Array.isArray(body)||typeof body!=='object'||
    !isString(body.company_id)||!['jarvis.capabilities','jarvis.delegate'].includes(body.command))
   return deny(400,'COMMAND_OR_COMPANY_INVALID');
  if(body.command==='jarvis.delegate'&&(
   !SKILL.test(body.capability_id)||!isString(body.idempotency_key)||
   !body.parameters||typeof body.parameters!=='object'||Array.isArray(body.parameters)||
   body.estimated_additional_cost_eur!==undefined&&body.estimated_additional_cost_eur!==0))
    return deny(400,'DELEGATION_PAYLOAD_INVALID');

  // Independent B2 proof, not forged headers. No fallback to Access UUID/iAT.
  let device,principal;
  try{
   device=await deviceSessionGate.verify({request,env,ctx});
   principal=await identityProvider.verify({channel,accessToken:auth.slice(7)});
  }catch{return deny(403,'B2_OR_IDENTITY_DENIED')}
  if(!ownerAuthorized(principal,device,body.company_id))
   return deny(403,'OWNER_OR_COMPANY_DENIED');

  const actionName=body.command==='jarvis.capabilities'
   ?'JARVIS_CAPABILITIES_READ'
   :'JARVIS_DELEGATE:'+body.capability_id;
  // B3 is PREPROD-specific and independent of the LAB device session.
  // A B2 LAB session ALONE does not grant actions in ACTGW PREPROD.
  let decision;
  try{
   const rate=await rateLimiter({ownerId:principal.ownerId,sessionId:principal.sessionId,
    companyId:body.company_id,actionName});
   if(rate!==true)return deny(429,'RATE_LIMIT_DENIED');
   decision=await b3DecisionService.authorize({token:auth.slice(7),
    companyId:body.company_id,environment:'PREPROD',actionName});
  }catch{return deny(503,'B3_AUTH_UNAVAILABLE')}
  if(decision?.decision!=='ALLOW'||decision.ownerId!==principal.ownerId||
    decision.companyId!==body.company_id||decision.environment!=='PREPROD'||
    decision.action!==actionName)
   return deny(403,'B3_GRANT_DENIED');

  // A short-lived Console instance cannot be reused by a different request.
  // ACTGW is the SAME existing shared instance for actual idempotency.
  // No client session_id or role is trusted, nor may client select a handler.
  const consoleGateway=new CerebroGatewayV0();
  const grantBinding=Object.freeze({
   principalOwnerId:principal.ownerId,companyId:body.company_id,
   operation:body.command==='jarvis.capabilities'?'LIST_CAPABILITIES':'DELEGATE',
   capabilityId:body.command==='jarvis.delegate'?body.capability_id:null
  });
  bindJarvisCapabilityDelegationV0({
   consoleGateway,actionGateway,readCanonicalCatalogue,readReleaseManifests,
   verifyOwner:async args=>
    args.company_id===grantBinding.companyId&&
    args.operation===grantBinding.operation&&
    args.capability_id===grantBinding.capabilityId
  });
  const sessionId=randomUUID();
  consoleGateway.createSession({session_id:sessionId,company_id:body.company_id});
  let result;
  try{
   result=await consoleGateway.execute({
    session_id:sessionId,command:body.command,
    payload:body.command==='jarvis.capabilities'?{}:{
     capability_id:body.capability_id,idempotency_key:body.idempotency_key,
     parameters:body.parameters,estimated_additional_cost_eur:0
    }
   });
  }catch{return deny(503,'GATEWAY_EXECUTION_UNAVAILABLE')}
  // Only a trusted ActionGateway result may indicate a completed synchronous
  // handler; a queued job still requires status/receipt verification.
  const status=result?.status==='ACTION_EXECUTED'||result?.status==='DISCOVERED'?200:
   result?.status==='HUMAN_REQUIRED'?409:403;
  return new Response(JSON.stringify(result),{status,headers:{
   'content-type':'application/json; charset=utf-8','cache-control':'no-store',
   'x-content-type-options':'nosniff'
  }});
 };
}
