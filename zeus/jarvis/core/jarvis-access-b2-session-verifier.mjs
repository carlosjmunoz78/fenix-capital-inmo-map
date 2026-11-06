/**
 * CUT31 · Cloudflare Access -> B2 session binding (LAB candidate, OFF).
 *
 * No auto-enrollment. Access authenticates the *identity*, not a CEREBRO grant.
 * OWNER_ROOT is returned ONLY if a pre-existing D1 LAB session binding matches
 * the server-side HMAC and has not expired/revoked; B3 stays independent/OFF.
 *
 * Session material uses Access getIdentity() user_uuid + issued-at. A unique
 * per-device Access session identifier is NOT guaranteed by this interface.
 * CUT31 deliberately does not claim per-device revocation certification.
 * A later independent B10 gate must validate physical session isolation.
 *
 * This component must run in the SAME Worker invocation as ctx.access;
 * ctx.access is not forwarded through Cloudflare Service Bindings.
 * Never pass ctx, an unverified JWT, or trusted principal from request JSON.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const AUD=/^[A-Za-z0-9_-]{15,128}$/;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,24}$/;
const HEX=/^[0-9a-f]{64}$/;
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&
 a.length===b.length&&a.split('').every((c,i)=>c===b[i]);
const invalid=()=>{throw Error('B2_ACCESS_SESSION_NOT_VERIFIED')};
const enc=new TextEncoder();
function toKey(hex){
 if(typeof hex!=='string'||!HEX.test(hex))invalid();
 return Uint8Array.from(hex.match(/../g),h=>parseInt(h,16));
}
function toHex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function createJarvisAccessB2SessionVerifier({
 sessionStore,environment='LAB',enabled=false,
 clock=()=>Date.now(),cryptoImpl=globalThis.crypto
}={}){
 if(typeof enabled!=='boolean')throw TypeError('B2_ACCESS_ENABLED_BOOLEAN_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('B2_ACCESS_LAB_ONLY');
 if(enabled&&(typeof sessionStore?.get!=='function'||
   typeof clock!=='function'||typeof cryptoImpl?.subtle?.importKey!=='function'||
   typeof cryptoImpl?.subtle?.sign!=='function'))
  throw TypeError('B2_ACCESS_TRUSTED_ADAPTERS_REQUIRED');
 return Object.freeze({async verify({ctx,env}={}){
  if(!enabled||env?.JARVIS_B2_ACCESS_ENABLED!=='true')invalid();
  const aud=env?.JARVIS_ACCESS_AUD;
  const email=env?.JARVIS_OWNER_EMAIL;
  const ownerId=env?.JARVIS_OWNER_ID;
  if(typeof aud!=='string'||!AUD.test(aud)||
    typeof email!=='string'||!EMAIL.test(email)||email!==email.toLowerCase()||
    !ID.test(ownerId)||ownerId==='*'||typeof env?.JARVIS_B2_HMAC_KEY_HEX!=='string')invalid();
  if(!ctx?.access||typeof ctx.access.getIdentity!=='function'||
    typeof ctx.access.aud!=='string'||!same(ctx.access.aud,aud))invalid();
  let identity;
  try{identity=await ctx.access.getIdentity()}catch{invalid()}
  if(typeof identity?.email!=='string'||!same(identity.email.toLowerCase(),email)||
    typeof identity.user_uuid!=='string'||!UUID.test(identity.user_uuid)||
    !Number.isSafeInteger(identity.iat)||identity.iat<=0)invalid();
  // Access validates token/session. The clock rule is defense in depth,
  // never an extension of the Access login window.
  let now;
  try{now=clock()}catch{invalid()}
  if(!Number.isSafeInteger(now)||now<=0||
    identity.iat*1000>now+60_000||now-identity.iat*1000>24*60*60*1000)invalid();
  const material='jarvis-b2-access-v1\0'+ownerId+'\0'+
    identity.user_uuid.toLowerCase()+'\0'+String(identity.iat);
  let hmac;
  try{
    const key=await cryptoImpl.subtle.importKey('raw',toKey(env.JARVIS_B2_HMAC_KEY_HEX),
      {name:'HMAC',hash:'SHA-256'},false,['sign']);
    hmac=toHex(await cryptoImpl.subtle.sign('HMAC',key,enc.encode(material)));
  }catch{invalid()}
  // No session enrollment or mutation ever takes place in this verifier.
  let row;
  try{row=await sessionStore.get({ownerId,sessionHmac:hmac,environment:'LAB'})}
  catch{invalid()}
  if(!row||row.ownerId!==ownerId||!same(row.sessionHmac,hmac)||
    row.environment!=='LAB'||row.role!=='OWNER_ROOT'||
    row.active!==true||row.revoked===true||
    !Number.isSafeInteger(row.expiresAt)||row.expiresAt<=now||
    !Array.isArray(row.authorizedCompanies)||row.authorizedCompanies.length<1||
    row.authorizedCompanies.some(c=>typeof c!=='string'||!ID.test(c)||c==='*'))invalid();
  // Do not expose hash, access UUID, email, claims, secret or raw token.
  return Object.freeze({ownerId,roles:Object.freeze(['OWNER_ROOT']),
    authorizedCompanies:Object.freeze([...new Set(row.authorizedCompanies)]),
    environment:'LAB',verifiedBy:'CLOUDFLARE_ACCESS_D1_SESSION',
    b3Granted:false});
 }});
}
