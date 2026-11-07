import {isApprovedJarvisB2LabOrigin} from './jarvis-b2-approved-lab-origins.mjs';
/**
 * CUT32 · B2 device session enrollment (LAB candidate; OFF default).
 * A HIGH_RISK administrative operation must first open a <=10-minute LAB
 * window in Worker Secrets/vars. The owner then uses an Access-authenticated,
 * same-origin POST. No public token is ever displayed; a random 256-bit
 * HttpOnly __Host cookie is set only after D1 session+audit transaction.
 *
 * MUST NOT deploy until CUT30 negatives, backup, rollback and owner approval.
 * No B3 grant, mission access, or App/CRM mutation.
 */
const SECRET=/^[a-f0-9]{64}$/;
const AUD=/^[A-Za-z0-9_-]{15,128}$/;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,24}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const OWNER=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;

const TTL=1800_000;
const COOKIE='__Host-jarvis_b2';
const sqlSession=`INSERT INTO jarvis_lab_session_binding_v0
(owner_id,session_hmac,environment,channel,role,active,revoked,
 authorized_companies_json,expires_at_ms,issued_at_ms)
SELECT ?,?,'LAB','cloudflare-access','OWNER_ROOT',1,0,'["fenix"]',?,?
WHERE (SELECT count(*) FROM jarvis_lab_session_binding_v0
 WHERE owner_id=? AND environment='LAB' AND channel='cloudflare-access'
 AND active=1 AND revoked=0 AND expires_at_ms>?) < 2
RETURNING session_hmac`;
const sqlAudit=`INSERT INTO jarvis_lab_b2_device_enrollment_audit_v0
(owner_id,session_hmac,event_code,environment,issued_at_ms,expires_at_ms)
SELECT ?,?,'ENROLLED','LAB',?,? WHERE EXISTS(
 SELECT 1 FROM jarvis_lab_session_binding_v0
 WHERE owner_id=? AND session_hmac=? AND issued_at_ms=?)`;
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a===b;
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const toHex=buf=>Array.from(new Uint8Array(buf),v=>v.toString(16).padStart(2,'0')).join('');
const keyBytes=hex=>Uint8Array.from(hex.match(/.{2}/g),v=>parseInt(v,16));
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const fail=(code,reason)=>new Response(JSON.stringify({status:'DENIED',reason,
 environment:'LAB',gateway:'OFF',b3:'OFF'}),{status:code,headers});
export function createJarvisB2DeviceEnrollment({
 db,environment='LAB',enabled=false,clock=()=>Date.now(),cryptoImpl=globalThis.crypto
}={}){
 if(enabled&&environment!=='LAB')throw TypeError('B2_ENROLL_LAB_ONLY');
 if(typeof enabled!=='boolean')throw TypeError('B2_ENROLL_BOOLEAN_REQUIRED');
 if(enabled&&(
  typeof db?.prepare!=='function'||typeof db?.batch!=='function'||
  typeof clock!=='function'||typeof cryptoImpl?.getRandomValues!=='function'||
  typeof cryptoImpl?.subtle?.importKey!=='function'))
  throw TypeError('B2_ENROLL_SERVER_ADAPTERS_REQUIRED');
 return Object.freeze({async enroll({request,ctx,env}={}){
  if(!enabled||env?.JARVIS_B2_ENROLLMENT_ENABLED!=='true')
   return fail(503,'ENROLLMENT_OFF');
  if(!(request instanceof Request)||request.method!=='POST')
   return fail(405,'METHOD_DENIED');
  let url;
  try{url=new URL(request.url)}catch{return fail(400,'INVALID_REQUEST')}
  if(!isApprovedJarvisB2LabOrigin(url.origin)||url.pathname!=='/__jarvis/b2-device-enroll'||
    url.search||url.hash||request.headers.get('origin')!==url.origin||
    request.headers.get('sec-fetch-site')!=='same-origin'||
    request.headers.get('x-jarvis-enrollment')!=='1'||
    (request.headers.get('content-length')&&!['0'].includes(request.headers.get('content-length'))))
   return fail(403,'ORIGIN_DENIED');
  if(env?.JARVIS_ENVIRONMENT!=='LAB'||env?.JARVIS_B2_B3_LIVE_ENABLED!=='false'||
     env?.JARVIS_GATEWAY_ENABLED!=='false')
   return fail(503,'LAB_GATES_OFF');
  let now;
  try{now=clock()}catch{return fail(503,'CLOCK_UNAVAILABLE')}
  const until=Number(env?.JARVIS_B2_ENROLLMENT_UNTIL_MS);
  if(!Number.isSafeInteger(now)||now<=0||
     !Number.isSafeInteger(until)||until<now||until>now+600_000)
   return fail(403,'ENROLLMENT_WINDOW_CLOSED');
  const email=env?.JARVIS_OWNER_EMAIL,owner=env?.JARVIS_OWNER_ID;
  const aud=env?.JARVIS_ACCESS_AUD,key=env?.JARVIS_B2_HMAC_KEY_HEX;
  if(typeof email!=='string'||!EMAIL.test(email)||email!==email.toLowerCase()||
     typeof owner!=='string'||!OWNER.test(owner)||owner==='*'||
     typeof aud!=='string'||!AUD.test(aud)||
     typeof key!=='string'||!SECRET.test(key))
   return fail(503,'OWNER_CONFIG_UNAVAILABLE');
  if(!ctx?.access||ctx.access.aud!==aud||typeof ctx.access.getIdentity!=='function')
   return fail(403,'ACCESS_REQUIRED');
  let identity;
  try{identity=await ctx.access.getIdentity()}catch{return fail(403,'ACCESS_REQUIRED')}
  if(typeof identity?.email!=='string'||!same(identity.email.toLowerCase(),email)||
     typeof identity.user_uuid!=='string'||!UUID.test(identity.user_uuid))
   return fail(403,'OWNER_NOT_VERIFIED');
  const random=new Uint8Array(32);
  let cookie,sessionHmac;
  try{
   cryptoImpl.getRandomValues(random);
   cookie=b64url(random);
   const material='jarvis-b2-device-v1\0'+owner+'\0'+
     identity.user_uuid.toLowerCase()+'\0'+cookie;
   const k=await cryptoImpl.subtle.importKey('raw',keyBytes(key),
     {name:'HMAC',hash:'SHA-256'},false,['sign']);
   sessionHmac=toHex(await cryptoImpl.subtle.sign('HMAC',k,new TextEncoder().encode(material)));
  }catch{return fail(503,'CRYPTO_UNAVAILABLE')}
  const expires=now+TTL;
  let result;
  try{
   result=await db.batch([
    db.prepare(sqlSession).bind(owner,sessionHmac,expires,now,owner,now),
    db.prepare(sqlAudit).bind(owner,sessionHmac,now,expires,owner,sessionHmac,now)
   ]);
  }catch{return fail(503,'ENROLLMENT_STORAGE_UNAVAILABLE')}
  if(!Array.isArray(result)||result.length!==2||result[0]?.success!==true||
     result[1]?.success!==true||result[0]?.meta?.changes!==1||
     result[1]?.meta?.changes!==1)
   return fail(503,'ENROLLMENT_NOT_CONFIRMED');
  const response=new Response(JSON.stringify({
   status:'B2_DEVICE_ENROLLED_LAB',b3:'OFF',gateway:'OFF',prod:'NO_GO'
  }),{status:201,headers:{...headers,
   'set-cookie':COOKIE+'='+cookie+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=1800'}});
  return response;
 }});
}
