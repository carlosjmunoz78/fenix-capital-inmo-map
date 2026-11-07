/**
 * CUT32 · B2 per-device session verification (LAB, OFF-by-default).
 *
 * Access proves the human identity; an independent random HttpOnly cookie
 * issued by a SEPARATE approved enrollment step proves this device session.
 * Different browser cookies produce different HMAC hashes, allowing selective
 * session revocation in the existing dedicated EU D1 session table.
 *
 * This module NEVER issues cookies or creates sessions. No fall-through to
 * user_uuid+iat (which may identify an SSO login, not a device).
 * Never log cookies, JWTs, email, keys, Access UUID, or HMAC.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const AUD=/^[A-Za-z0-9_-]{15,128}$/;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,24}$/;
const KEY=/^[0-9a-f]{64}$/;
const VALUE=/^[A-Za-z0-9_-]{43}$/;
export const B2_DEVICE_COOKIE='__Host-jarvis_b2';
const invalid=()=>{throw Error('B2_DEVICE_SESSION_NOT_VERIFIED')};
const encoder=new TextEncoder();
const toHex=buf=>Array.from(new Uint8Array(buf),n=>n.toString(16).padStart(2,'0')).join('');
const keyBytes=h=>Uint8Array.from(h.match(/.{2}/g),v=>parseInt(v,16));
function extractCookie(header){
 if(typeof header!=='string'||header.length>8192)invalid();
 let found=null;
 for(const element of header.split(';')){
  const piece=element.trim();
  if(!piece.startsWith(B2_DEVICE_COOKIE+'='))continue;
  const v=piece.slice(B2_DEVICE_COOKIE.length+1);
  if(found!==null||!VALUE.test(v))invalid();
  found=v;
 }
 if(found===null)invalid();
 return found;
}
export function createJarvisB2DeviceSessionGate({
 sessionStore,clock=()=>Date.now(),cryptoImpl=globalThis.crypto,
 environment='LAB',enabled=false
}={}){
 if(typeof enabled!=='boolean')throw TypeError('B2_DEVICE_BOOLEAN_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('B2_DEVICE_LAB_ONLY');
 if(enabled&&(typeof sessionStore?.get!=='function'||
   typeof clock!=='function'||typeof cryptoImpl?.subtle?.importKey!=='function'||
   typeof cryptoImpl?.subtle?.sign!=='function'))
  throw TypeError('B2_DEVICE_TRUSTED_ADAPTERS_REQUIRED');
 return Object.freeze({async verify({request,ctx,env}={}){
  if(!enabled||env?.JARVIS_B2_DEVICE_ENABLED!=='true')invalid();
  const aud=env?.JARVIS_ACCESS_AUD,email=env?.JARVIS_OWNER_EMAIL;
  const ownerId=env?.JARVIS_OWNER_ID,hmacKey=env?.JARVIS_B2_HMAC_KEY_HEX;
  if(typeof aud!=='string'||!AUD.test(aud)||
    typeof email!=='string'||!EMAIL.test(email)||email!==email.toLowerCase()||
    typeof ownerId!=='string'||!ID.test(ownerId)||ownerId==='*'||
    typeof hmacKey!=='string'||!KEY.test(hmacKey))invalid();
  if(!(request instanceof Request)||!ctx?.access||
     typeof ctx.access.aud!=='string'||ctx.access.aud!==aud||
     typeof ctx.access.getIdentity!=='function')invalid();
  let identity;
  try{identity=await ctx.access.getIdentity()}catch{invalid()}
  if(typeof identity?.email!=='string'||
    identity.email.toLowerCase()!==email||
    typeof identity.user_uuid!=='string'||!UUID.test(identity.user_uuid))invalid();
  const cookie=extractCookie(request.headers.get('cookie'));
  let now;
  try{now=clock()}catch{invalid()}
  if(!Number.isSafeInteger(now)||now<=0)invalid();
  const material='jarvis-b2-device-v1\0'+ownerId+'\0'+
   identity.user_uuid.toLowerCase()+'\0'+cookie;
  let digest;
  try{
   const key=await cryptoImpl.subtle.importKey('raw',keyBytes(hmacKey),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
   digest=toHex(await cryptoImpl.subtle.sign('HMAC',key,encoder.encode(material)));
  }catch{invalid()}
  let row;
  try{row=await sessionStore.get({ownerId,sessionHmac:digest,environment:'LAB'})}
  catch{invalid()}
  if(!row||row.ownerId!==ownerId||row.sessionHmac!==digest||
    row.environment!=='LAB'||row.role!=='OWNER_ROOT'||
    row.active!==true||row.revoked===true||
    !Number.isSafeInteger(row.expiresAt)||row.expiresAt<=now||
    !Array.isArray(row.authorizedCompanies)||row.authorizedCompanies.length===0||
    row.authorizedCompanies.some(c=>typeof c!=='string'||!ID.test(c)||c==='*'))
    invalid();
  return Object.freeze({
   ownerId,roles:Object.freeze(['OWNER_ROOT']),
   authorizedCompanies:Object.freeze([...new Set(row.authorizedCompanies)]),
   environment:'LAB',b3Granted:false,
   verifiedBy:'ACCESS_AND_PER_DEVICE_D1_SESSION'
  });
 }});
}
