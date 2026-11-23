/**
 * LAB-only HTTP adapter to mount *inside an existing, Access-protected*
 * CEREBRO Gateway after independent owner+quota verification.
 *
 * This is NOT a Worker deployment. No public route or workers.dev address.
 * The browser is never trusted to select voice model, environment or billing.
 */
const BODY_MAX=1_500;
const READ_LIMIT=5_000_000;
const cors=(origin)=>({
  "access-control-allow-origin":origin,
  "access-control-allow-methods":"POST, OPTIONS",
  "access-control-allow-headers":"authorization, content-type",
  "access-control-expose-headers":"x-jarvis-voice-kind",
  "vary":"Origin",
  "cache-control":"private, no-store",
  "x-content-type-options":"nosniff"
});
const response=(status,state,reason,origin)=>new Response(JSON.stringify({state,reason}),{
  status,headers:{...cors(origin),"content-type":"application/json; charset=utf-8"}
});
export function createJarvisOnlineFreeVoiceHttpLab({voicePort,allowedOrigins,accessVerified}={}){
 if(typeof voicePort?.synthesize!=="function"||
    !Array.isArray(allowedOrigins)||allowedOrigins.length===0||
    allowedOrigins.some(x=>typeof x!=="string"||!x.startsWith("https://")||new URL(x).origin!==x)||
    typeof accessVerified!=="function")
  throw Error("LAB_HTTP_TRUSTED_DEPS_REQUIRED");
 const origins=new Set(allowedOrigins);
 return Object.freeze({async handle(request){
  if(!(request instanceof Request))throw TypeError("REQUEST_REQUIRED");
  const origin=request.headers.get("Origin");
  if(!origin||!origins.has(origin))
   return new Response("Forbidden",{status:403,headers:{"cache-control":"private, no-store"}});
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return response(405,"DENY","METHOD_NOT_ALLOWED",origin);
  const url=new URL(request.url);
  if(!url.pathname.endsWith("/voice/lab/generic-synthesize"))
   return response(404,"DENY","ROUTE_NOT_FOUND",origin);
  const authorization=request.headers.get("Authorization")||"";
  if(!/^Bearer\s+\S{20,8192}$/.test(authorization))
   return response(401,"DENY","AUTH_REQUIRED",origin);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
   return response(415,"DENY","JSON_REQUIRED",origin);
  if(Number(request.headers.get("content-length")||"0")>BODY_MAX)
   return response(413,"DENY","REQUEST_TOO_LARGE",origin);
  let payload;
  try{
   const raw=await request.text();
   if(raw.length>BODY_MAX)throw Error("TOO_LARGE");
   payload=JSON.parse(raw);
  }catch{return response(400,"DENY","INVALID_JSON",origin)}
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||
     ["jwt","ownerId","role","environment","model","voiceId","allowPaid","billing"].some(key=>key in payload))
   return response(400,"DENY","CLIENT_PRIVILEGE_CLAIMS_FORBIDDEN",origin);
  let verified=false;
  try{verified=await accessVerified(request,origin)===true}
  catch{return response(503,"DENY","ACCESS_VERIFICATION_UNAVAILABLE",origin)}
  if(!verified)return response(403,"DENY","CLOUDFLARE_ACCESS_REQUIRED",origin);
  const {surface,session_id,request_id,text,consent_ref}=payload;
  let result;
  try{
   result=await voicePort.synthesize({
    jwt:authorization.replace(/^Bearer\s+/,""),
    company_id:"fenix",engine_id:"VOICE-001",
    surface,session_id,request_id,text,consent_ref
   });
  }catch{return response(503,"DENY","VOICE_SERVICE_UNAVAILABLE",origin)}
  if(result?.state!=="AUDIO_BYTES_READY"||result.canonicalJarvisV2!==false)
   return response(403,"DENY",result?.reason||"VOICE_NOT_AUTHORIZED",origin);
  if(!(result.bytes instanceof Uint8Array)||result.bytes.length<100||result.bytes.length>READ_LIMIT)
   return response(503,"DENY","AUDIO_INVALID",origin);
  return new Response(result.bytes,{status:200,headers:{
   ...cors(origin),"content-type":"audio/mpeg",
   "x-jarvis-voice-kind":"GENERIC_NOT_JARVIS_V2",
   "content-security-policy":"default-src 'none'",
   "content-disposition":"inline"
  }});
 }});
}
