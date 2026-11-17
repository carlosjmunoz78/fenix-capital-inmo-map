/** P0-A shadow contract only. NOT connected to existing owner gateway, proxy, or PROD.
 * Dependencies (getUser/getClaims/readSession) must be trusted server-side and from
 * the SAME issuer/token. An unverified decoded JWT is NEVER verifiedClaims.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny=(reason)=>({status:'DENIED',reason,authorized:false,read_only:true,executed:false});
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validUuid=x=>typeof x==='string'&&UUID.test(x);
const exactTime=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>0;
const sec=x=>x*1000;
/**
 * @param {{identity:object,verifiedClaims:object,issuer:string,environment:string,nowMs?:number}} input
 * @param {(query:{sessionId:string,userId:string})=>Promise<null|object>} readActiveSession
 *   PRIVILEGED, fixed-query server callback, never a browser/API supplied function.
 * @returns {Promise<{status:'DENIED'|'ALLOW',reason:string,authorized:boolean,read_only:boolean,executed:boolean}>}
 */
export async function authorizeOwnerLabRead(input,readActiveSession){
 if(!object(input)||typeof readActiveSession!=='function')
  return deny('TRUSTED_SESSION_READER_REQUIRED');
 const {identity,verifiedClaims,issuer,environment}=input;
 const now=input.nowMs===undefined?Date.now():input.nowMs;
 if(!Number.isSafeInteger(now)||now<0)return deny('CLOCK_INVALID');
 if(environment!=='LAB'||typeof issuer!=='string'||
    !/^https:\/\/[a-z0-9.-]+\.supabase\.co\/auth\/v1$/.test(issuer))
   return deny('SCOPED_ISSUER_REQUIRED');
 if(!object(identity)||identity.actor_code!=='CARLOS-ADMIN'||
    identity.active!==true||identity.company_id!=='fenix'||
    !validUuid(identity.user_id))return deny('OWNER_SCOPE_DENIED');
 if(!object(verifiedClaims)||verifiedClaims.iss!==issuer||
    !validUuid(verifiedClaims.sub)||verifiedClaims.sub!==identity.user_id||
    !validUuid(verifiedClaims.session_id)||!exactTime(verifiedClaims.exp)||
    sec(verifiedClaims.exp)<=now||
    (verifiedClaims.nbf!==undefined&&(!exactTime(verifiedClaims.nbf)||sec(verifiedClaims.nbf)>now+30000))||
    (verifiedClaims.iat!==undefined&&(!exactTime(verifiedClaims.iat)||sec(verifiedClaims.iat)>now+30000)))
   return deny('VERIFIED_TOKEN_CLAIMS_DENIED');
 // Cannot accept client-asserted session state; the callback must read auth.sessions
 // through a privileged fixed-query channel inside the original issuer project.
 let session;
 try{session=await readActiveSession({sessionId:verifiedClaims.session_id,userId:identity.user_id})}
 catch{return deny('AUTHORITATIVE_SESSION_UNAVAILABLE')}
 if(!object(session)||session.id!==verifiedClaims.session_id||
    session.user_id!==identity.user_id||
    (session.not_after!==null&&session.not_after!==undefined&&
      (typeof session.not_after!=='string'||!Number.isFinite(Date.parse(session.not_after))||
       Date.parse(session.not_after)<=now)))
   return deny('SESSION_REVOKED_OR_EXPIRED');
 // A real session row must exist at decision time, not merely a JWT signature.
 return {status:'ALLOW',reason:'ACTIVE_SESSION_CONFIRMED_BY_SERVER',authorized:true,
  read_only:true,executed:false};
}
