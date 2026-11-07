/**
 * CUT30 · Cloudflare Access OWNER_ROOT admission canary, LAB only.
 *
 * A single, pre-existing Cloudflare Access identity is checked again against
 * a server-only owner email and Access audience. Access must be configured on
 * THIS Worker before any route may be exposed. This is NOT B2 enrollment and
 * does NOT grant mission read, write, credentials or owner role in CEREBRO.
 *
 * Never trust cf-access-* headers or unverified JWTs; only ctx.access supplied
 * by the Cloudflare Workers runtime after an authenticated Access invocation.
 *
 * Disabled by default, zero D1 operations and no personal data in responses.
 * No service bindings, static assets or DNS.
 */
const headers=Object.freeze({
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-content-type-options':'nosniff',
 'x-frame-options':'DENY',
 'referrer-policy':'no-referrer'
});
const denied=(status,reason)=>new Response(JSON.stringify({
 status:'DENIED',reason,environment:'LAB'
}),{status,headers});
const AUD=/^[A-Za-z0-9_-]{15,128}$/;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,24}$/;
const PATH='/__jarvis/owner-check';
const equal=(a,b)=>a.length===b.length&&
 a.split('').every((c,i)=>c===b[i]);
// Comparison of email identity is secondary defense after Cloudflare Access;
// an arbitrary requester cannot choose ctx.access via an HTTP header.
export function createJarvisAccessOwnerCanary({environment='LAB',enabled=false}={}){
 if(typeof enabled!=='boolean')throw TypeError('ENABLED_BOOLEAN_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('ACCESS_LAB_ONLY');
 return Object.freeze({async fetch(request,env,ctx){
  if(!enabled||env?.JARVIS_ACCESS_PROBE_ENABLED!=='true')
   return denied(503,'ACCESS_CANARY_DISABLED');
  if(!(request instanceof Request))return denied(400,'REQUEST_INVALID');
  if(request.method!=='GET')return denied(405,'METHOD_NOT_ALLOWED');
  let url;
  try{url=new URL(request.url)}catch{return denied(400,'URL_INVALID')}
  if(url.pathname!==PATH||url.search||url.hash)
   return denied(404,'ROUTE_NOT_FOUND');
  const expectedAud=env?.JARVIS_ACCESS_AUD;
  const expectedEmail=env?.JARVIS_OWNER_EMAIL;
  if(typeof expectedAud!=='string'||!AUD.test(expectedAud)||
     typeof expectedEmail!=='string'||!EMAIL.test(expectedEmail)||
     expectedEmail!==expectedEmail.trim()||expectedEmail!==expectedEmail.toLowerCase())
   return denied(503,'ACCESS_OWNER_CONFIGURATION_REQUIRED');
  // ctx.access must be set by Cloudflare Access itself, never supplied
  // in request body/headers. "aud" must identify the exact Access app.
  if(!ctx?.access||typeof ctx.access.getIdentity!=='function'||
      typeof ctx.access.aud!=='string'||!equal(ctx.access.aud,expectedAud))
   return denied(403,'ACCESS_AUTHENTICATION_REQUIRED');
  let identity;
  try{identity=await ctx.access.getIdentity()}catch{
   return denied(403,'ACCESS_IDENTITY_UNAVAILABLE');
  }
  const email=identity?.email;
  if(typeof email!=='string'||!EMAIL.test(email)||!equal(email.toLowerCase(),expectedEmail))
   return denied(403,'OWNER_NOT_ENROLLED');
  return new Response(JSON.stringify({
   status:'ACCESS_OWNER_VERIFIED',environment:'LAB',
   b2Enrollment:'NOT_STARTED',gateway:'OFF',permissions:'NONE',
   prod:'NO_GO'
  }),{status:200,headers});
 }});
}
