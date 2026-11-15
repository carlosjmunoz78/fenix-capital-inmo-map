/**
 * P0-A · Strict owner bearer adapter — SHADOW LAB ONLY.
 *
 * This module is neither deployed nor called from existing APIs. It can be used
 * only by a trusted server composition root, never with callbacks from clients.
 * Its dependencies are trusted interfaces, NOT implemented by this adapter.
 */
import {authorizeOwnerLabRead} from './owner-session-gate-shadow.mjs';

const ISSUER='https://cluhljgonannaafpmblx.supabase.co/auth/v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const denied=reason=>({status:'DENIED',reason,authorized:false,read_only:true,executed:false});
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

/**
 * @param {{ verifyIssuerJwt:(token:string,expectedIssuer:string)=>Promise<{user:{id:string},claims:object}>,
 *   resolveOwnerByVerifiedUser:(userId:string)=>Promise<{actor_code:string,active:boolean}>,
 *   readActiveSession:(query:{sessionId:string,userId:string})=>Promise<{id:string,user_id:string,not_after?:string|null}|null>}} dependencies
 * Dependencies MUST be created in server code and bind to issuer/authenticated
 * context. verifyIssuerJwt must verify signature and registered issuer/audience.
 * The session lookup MUST run in a privileged, fixed-query, issuer-side context.
 */
export function createOwnerBearerSessionGateShadow(dependencies){
 if(!obj(dependencies)||typeof dependencies.verifyIssuerJwt!=='function'||
    typeof dependencies.resolveOwnerByVerifiedUser!=='function'||
    typeof dependencies.readActiveSession!=='function')
   throw Error('TRUSTED_SERVER_DEPENDENCIES_REQUIRED');
 const {verifyIssuerJwt,resolveOwnerByVerifiedUser,readActiveSession}=dependencies;
 return async function decide(request){
  // Never read request-provided owner/claims/issuer/callbacks.
  if(!obj(request)||request.environment!=='LAB'||request.company_id!=='fenix')
   return denied('FENIX_LAB_SCOPE_ONLY');
  const raw=request.authorization;
  if(typeof raw!=='string'||raw.length>8200||!/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(raw))
   return denied('BEARER_REQUIRED');
  const token=raw.slice(7);
  let verified;
  try{verified=await verifyIssuerJwt(token,ISSUER)}
  catch{return denied('SIGNATURE_OR_IDENTITY_UNVERIFIED')}
  if(!obj(verified)||!obj(verified.user)||!UUID.test(String(verified.user.id||''))||
     !obj(verified.claims)||verified.claims.sub!==verified.user.id||
     verified.claims.iss!==ISSUER||
     verified.claims.aud!=='authenticated'||verified.claims.role!=='authenticated')
   return denied('SIGNATURE_OR_IDENTITY_UNVERIFIED');
  let actor;
  try{actor=await resolveOwnerByVerifiedUser(verified.user.id)}
  catch{return denied('OWNER_RESOLVER_UNAVAILABLE')}
  if(!obj(actor)||actor.actor_code!=='CARLOS-ADMIN'||actor.active!==true)
   return denied('OWNER_SCOPE_DENIED');
  return authorizeOwnerLabRead({
   environment:'LAB',issuer:ISSUER,nowMs:request.nowMs,
   identity:{actor_code:actor.actor_code,active:true,company_id:'fenix',user_id:verified.user.id},
   verifiedClaims:verified.claims
  },readActiveSession);
 };
}
export const OWNER_BEARER_SESSION_GATE_SHADOW=Object.freeze({
 environment:'LAB',company_id:'fenix',issuer:ISSUER,
 ready_for_http_integration:false,ready_for_prod:false,
 requires_privileged_session_reader:true,additional_subscription_eur:0
});
