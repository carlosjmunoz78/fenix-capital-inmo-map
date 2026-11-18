/**
 * CEREBRO Cloudflare owner-only directory adapter — LAB ONLY, disabled by default.
 *
 * Defense in depth: cryptographic Cloudflare Access JWT validation AND existing
 * Supabase Gateway's CARLOS-ADMIN resolution. No service-role key, no DB writes,
 * no role grants or live agent execution. No host/path from request is used as
 * an upstream URL. Remains inert without explicit server configuration.
 */
import {
 queryCerebroAgentDirectoryV0,
 validateCerebroAgentDirectoryQueryV0
} from '../../../../api/cerebro-agent-directory.ts';

export type OwnerBindings={
 CEREBRO_OWNER_READONLY_ENABLED?:string;
 CF_ACCESS_ISSUER?:string;
 CF_ACCESS_AUD?:string;
 CF_ALLOWED_HOST?:string;
 SUPABASE_PUBLISHABLE_KEY?:string;
};
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const ACCESS_ISSUER=/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/;
const ACCESS_AUD=/^[A-Za-z0-9_-]{20,128}$/;
const HOST=/^[a-z0-9][a-z0-9.-]{2,252}$/;
const OWNER_READONLY='OWNER_PROD_READONLY' as const;
const safeHeaders={
 'Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization, Cf-Access-Jwt-Assertion',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'X-Robots-Tag':'noindex,nofollow',
 'Content-Type':'application/json; charset=utf-8'
};

function reply(status:number,value:unknown):Response{
 return new Response(JSON.stringify(value),{status,headers:safeHeaders});
}
function fail(status:number,reason:string){
 return reply(status,{status:'UNAVAILABLE',reason,executed:false,production_authorized:false});
}
function b64uToBytes(s:string):Uint8Array{
 if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>16384)throw Error('BAD_JWT_SEGMENT');
 const base=s.replace(/-/g,'+').replace(/_/g,'/');
 const binary=atob(base+'='.repeat((4-base.length%4)%4));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function decodePart(s:string):Record<string,unknown>{
 const bytes=b64uToBytes(s);
 if(bytes.length>8192)throw Error('JWT_PART_TOO_LONG');
 const raw=JSON.parse(new TextDecoder().decode(bytes));
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('JWT_PART_INVALID');
 return raw as Record<string,unknown>;
}
function isAccessConfigValid(env:OwnerBindings){
 return !!env.CF_ACCESS_ISSUER&&ACCESS_ISSUER.test(env.CF_ACCESS_ISSUER)&&
  !!env.CF_ACCESS_AUD&&ACCESS_AUD.test(env.CF_ACCESS_AUD)&&
  !!env.CF_ALLOWED_HOST&&HOST.test(env.CF_ALLOWED_HOST)&&
  !!env.SUPABASE_PUBLISHABLE_KEY&&/^sb_publishable_[A-Za-z0-9_-]{16,200}$/.test(env.SUPABASE_PUBLISHABLE_KEY);
}
/** Cryptographic RS256 verification against the configured Cloudflare Access issuer.
 * Merely having the Cf-Access-Jwt-Assertion header never grants access. */
export async function verifyCloudflareAccessJwt(
 token:string,issuer:string,audience:string
):Promise<boolean>{
 try{
  if(token.length<80||token.length>12000||!ACCESS_ISSUER.test(issuer)||!ACCESS_AUD.test(audience))return false;
  const segments=token.split('.');
  if(segments.length!==3)return false;
  const header=decodePart(segments[0]);
  const payload=decodePart(segments[1]);
  const kid=header.kid;
  if(header.alg!=='RS256'||typeof kid!=='string'||!/^[a-zA-Z0-9_-]{4,128}$/.test(kid))return false;
  if(payload.iss!==issuer)return false;
  if(!(Array.isArray(payload.aud)?payload.aud.includes(audience):payload.aud===audience))return false;
  const now=Math.floor(Date.now()/1000),leeway=60;
  if(typeof payload.exp!=='number'||!Number.isFinite(payload.exp)||payload.exp<=now-leeway)return false;
  if(typeof payload.iat!=='number'||!Number.isFinite(payload.iat)||payload.iat>now+leeway)return false;
  if(payload.nbf!==undefined&&(typeof payload.nbf!=='number'||payload.nbf>now+leeway))return false;
  const response=await fetch(issuer+'/cdn-cgi/access/certs',{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4500),
   headers:{accept:'application/json'}
  });
  if(response.status!==200)return false;
  const certs=await response.json() as {keys?:Array<Record<string,unknown>>};
  if(!Array.isArray(certs?.keys)||certs.keys.length>20)return false;
  const jwk=certs.keys.find(k=>k.kid===kid&&k.kty==='RSA'&&
   (k.alg===undefined||k.alg==='RS256')&&k.use!=='enc'&&
   typeof k.n==='string'&&typeof k.e==='string');
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk as JsonWebKey,
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
   b64uToBytes(segments[2]),new TextEncoder().encode(segments[0]+'.'+segments[1]));
 }catch{return false}
}

/** Only this endpoint is opt-in. Other /api/* endpoints still fail closed. */
export async function serveOwnerReadOnlyDirectory(request:Request,env:OwnerBindings):Promise<Response>{
 if(request.method!=='GET')return fail(405,'READ_ONLY');
 // A missing explicit flag or missing host/audience/pubkey is fail-closed.
 if(env.CEREBRO_OWNER_READONLY_ENABLED!=='true')return fail(503,'CLOUDFLARE_PORTABILITY_LAB_API_DISABLED');
 if(!isAccessConfigValid(env))return fail(503,'OWNER_ACCESS_CONFIG_INCOMPLETE');
 const url=new URL(request.url);
 if(url.protocol!=='https:'||url.hostname!==env.CF_ALLOWED_HOST||url.port)return fail(403,'HOST_SCOPE_DENIED');
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return fail(403,'ORIGIN_DENIED');
 try{validateCerebroAgentDirectoryQueryV0(url.searchParams)}
 catch{return fail(400,'INVALID_QUERY_OR_SCOPE')}
 const bearer=request.headers.get('authorization')||'';
 const apikey=request.headers.get('apikey')||'';
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey!==env.SUPABASE_PUBLISHABLE_KEY)
  return fail(401,'OWNER_SESSION_REQUIRED');
 const accessToken=request.headers.get('cf-access-jwt-assertion')||'';
 if(!accessToken)return fail(401,'ACCESS_ASSERTION_REQUIRED');
 if(!await verifyCloudflareAccessJwt(accessToken,env.CF_ACCESS_ISSUER!,env.CF_ACCESS_AUD!))
  return fail(403,'CLOUDFLARE_ACCESS_NOT_VERIFIED');
 try{
  const response=await fetch(OWNER,{method:'GET',redirect:'error',cache:'no-store',
   headers:{authorization:bearer,apikey,accept:'application/json'},signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return fail(403,'OWNER_NOT_VERIFIED');
  const body=await response.json() as {ok?:boolean;context?:{actor_code?:string};actor_code?:string};
  const ctx=body?.context&&typeof body.context==='object'?body.context:body;
  if(body?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')return fail(403,'OWNER_NOT_VERIFIED');
 }catch{return fail(503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const response={...queryCerebroAgentDirectoryV0(url.searchParams),transport:OWNER_READONLY};
  return reply(200,response);
 }catch{return fail(503,'REGISTRY_SOURCE_INVALID')}
}
