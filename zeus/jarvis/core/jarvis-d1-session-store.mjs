/**
 * CUT22 · Read-only D1 session lookup, server-only LAB.
 * D1 has NO RLS; use only behind the trusted B2 identity adapter, B3 grants,
 * and private Worker binding. Never returns a token, secret or raw session id.
 */
const ownerPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const hashPattern=/^[a-f0-9]{64}$/;
const channelPattern=/^[a-z][a-z0-9-]{1,79}$/;
const SELECT="SELECT owner_id,session_hmac,environment,channel,role,active,revoked,authorized_companies_json,expires_at_ms FROM jarvis_lab_session_binding_v0 WHERE owner_id=? AND session_hmac=? AND environment='LAB' AND channel=? AND active=1 AND revoked=0 AND expires_at_ms>? LIMIT 1";
export function createJarvisD1SessionStore({
 db,environment='LAB',trustedChannel='fenix-app',clock=()=>Date.now()
}={}){
 if(environment!=='LAB')throw TypeError('D1_B2_LAB_ONLY');
 if(typeof db?.prepare!=='function'||typeof clock!=='function'||
    !channelPattern.test(trustedChannel))
   throw TypeError('TRUSTED_D1_B2_ADAPTERS_REQUIRED');
 return Object.freeze({
  async get({ownerId,sessionHmac,environment:scope}={}){
   if(scope!=='LAB'||typeof ownerId!=='string'||!ownerPattern.test(ownerId)||
      typeof sessionHmac!=='string'||!hashPattern.test(sessionHmac))
     throw Error('D1_B2_SESSION_SCOPE_INVALID');
   let now;
   try{now=clock()}catch{throw Error('D1_B2_CLOCK_UNAVAILABLE')}
   if(!Number.isSafeInteger(now)||now<=0)throw Error('D1_B2_CLOCK_UNAVAILABLE');
   let row;
   try{row=await db.prepare(SELECT).bind(ownerId,sessionHmac,trustedChannel,now).first();}
   catch{throw Error('D1_B2_SESSION_DB_UNAVAILABLE')}
   if(row==null)return null;
   let companies;
   try{companies=JSON.parse(row.authorized_companies_json)}catch{
    throw Error('D1_B2_SESSION_ROW_INVALID');
   }
   if(row.owner_id!==ownerId||row.session_hmac!==sessionHmac||
     row.environment!=='LAB'||row.channel!==trustedChannel||
     row.role!=='OWNER_ROOT'||row.active!==1||row.revoked!==0||
     !Number.isSafeInteger(row.expires_at_ms)||row.expires_at_ms<=now||
     !Array.isArray(companies)||companies.length<1||companies.length>50||
     companies.some(c=>typeof c!=='string'||!ownerPattern.test(c)||c==='*'))
    throw Error('D1_B2_SESSION_ROW_INVALID');
   return Object.freeze({
    ownerId:row.owner_id,sessionHmac:row.session_hmac,environment:'LAB',
    role:'OWNER_ROOT',active:true,revoked:false,expiresAt:row.expires_at_ms,
    authorizedCompanies:Object.freeze([...new Set(companies)])
   });
  }
 });
}
