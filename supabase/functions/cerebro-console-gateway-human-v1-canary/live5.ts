import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { applyOverlay } from "./overlay.ts";
import { LIVE_CANARY_PERCENT, MAX_CANARY_PERCENT, cohortKeyFromRequest, selectRoute } from "./router-live5.ts";

const PROD_PROJECT_REF="cluhljgonannaafpmblx";
const UPSTREAM=`https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-v0`;
const SLUG="cerebro-console-gateway-human-v1-live5";
const ENVIRONMENT="PROD_CANARY_LIVE_5";
const OIDC_ISSUER="https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE=SLUG;
const REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const WORKFLOW_PATH=".github/workflows/cerebro-human-intelligence-prod-live5-v1.yml";
const FORWARD_HEADERS=['authorization','apikey','content-type','x-cerebro-key','x-cerebro-actor','x-cerebro-session-id','idempotency-key','x-client-info','origin'];

type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;[key:string]:unknown};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-cerebro-human-canary':'live5-v1'}});}
function b64urlBytes(value:string){const normalized=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);const raw=atob(normalized);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}
let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`,{cache:'no-store'});if(!configRes.ok)throw new Error('OIDC_CONFIG_UNAVAILABLE');const config=await configRes.json();const jwksRes=await fetch(String(config.jwks_uri),{cache:'no-store'});if(!jwksRes.ok)throw new Error('OIDC_JWKS_UNAVAILABLE');const jwks=await jwksRes.json();if(!Array.isArray(jwks?.keys))throw new Error('OIDC_JWKS_INVALID');jwksCache={at:Date.now(),keys:jwks.keys};return jwks.keys;}
async function authorizeOidc(req:Request){const bearer=req.headers.get('authorization')??'';if(!bearer.startsWith('Bearer '))return {ok:false as const,reason:'OIDC_MISSING'};const parts=bearer.slice(7).split('.');if(parts.length!==3)return {ok:false as const,reason:'OIDC_MALFORMED'};try{const header=b64urlJson<any>(parts[0]);const claims=b64urlJson<Claims>(parts[1]);if(header?.alg!=='RS256'||!header?.kid)return {ok:false as const,reason:'OIDC_ALG_OR_KID_INVALID'};const keys=await githubJwks(),jwk=keys.find((key:any)=>key?.kid===header.kid);if(!jwk)return {ok:false as const,reason:'OIDC_KID_UNKNOWN'};const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));if(!verified)return {ok:false as const,reason:'OIDC_SIGNATURE_INVALID'};const now=Math.floor(Date.now()/1000),audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:'OIDC_ISSUER_OR_AUDIENCE_INVALID'};if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:'OIDC_TIME_INVALID'};if(claims.repository!==REPOSITORY)return {ok:false as const,reason:'OIDC_REPOSITORY_INVALID'};if(!['pull_request','workflow_dispatch','schedule'].includes(String(claims.event_name??'')))return {ok:false as const,reason:'OIDC_EVENT_INVALID'};if(!String(claims.workflow_ref??'').includes(WORKFLOW_PATH))return {ok:false as const,reason:'OIDC_WORKFLOW_INVALID'};return {ok:true as const,claims};}catch(error){return {ok:false as const,reason:'OIDC_VERIFY_ERROR',detail:String(error instanceof Error?error.message:error)};}}
function suffix(req:Request){const u=new URL(req.url),marker=`/${SLUG}`,i=u.pathname.indexOf(marker);return {path:i>=0?(u.pathname.slice(i+marker.length)||'/'):u.pathname,search:u.search};}
function forwardedHeaders(req:Request){const h=new Headers();for(const name of FORWARD_HEADERS){const value=req.headers.get(name);if(value)h.set(name,value);}return h;}
function responseHeaders(upstream:Response,route:'OLD'|'NEW'){const h=new Headers(upstream.headers);h.set('cache-control','no-store');h.set('x-cerebro-human-canary','live5-v1');h.set('x-cerebro-human-upstream','cerebro-console-gateway-v0');h.set('x-cerebro-human-route',route.toLowerCase());h.set('x-cerebro-human-live-percent',String(LIVE_CANARY_PERCENT));return h;}
function rewrittenResponseHeaders(upstream:Response){const h=responseHeaders(upstream,'NEW');for(const name of ['content-length','content-encoding','etag','content-md5'])h.delete(name);h.set('content-type','application/json; charset=utf-8');return h;}
function auditRoute(route:'OLD'|'NEW',httpStatus:number,overlayApplied:boolean,reason:string){console.log(JSON.stringify({event:'CEREBRO_HI_ROUTE_V1',version:'live5-v1',route,http_status:httpStatus,overlay_applied:overlayApplied,reason:String(reason||'').slice(0,80),prod_write_authorized:false,trading_access:false,contains_user_data:false}));}

Deno.serve(async(req:Request)=>{
  const route=suffix(req);
  if(route.path==='/canary/health'||route.path==='/canary/rehearsal'||route.path==='/canary/router-rehearsal'){
    const auth=await authorizeOidc(req);if(!auth.ok)return json(403,{ok:false,status:403,error:auth.reason});
    if(req.method==='GET'&&route.path==='/canary/health')return json(200,{ok:true,status:200,service:SLUG,environment:ENVIRONMENT,upstream:'cerebro-console-gateway-v0',live_canary_percent:LIVE_CANARY_PERCENT,max_canary_percent:MAX_CANARY_PERCENT,fail_closed_target:'OLD',overlay_mode:'CONSERVATIVE_AUTHORITATIVE_PRESERVING',privacy_safe_route_logging:true,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
    if(req.method==='POST'&&route.path==='/canary/router-rehearsal'){
      let body:any;try{body=await req.json();}catch{return json(400,{ok:false,status:400,error:'INVALID_JSON'});}
      const requested=Number(body?.requested_percent??0);
      if(!Number.isFinite(requested)||requested<0||requested>MAX_CANARY_PERCENT)return json(400,{ok:false,status:400,error:'UNSAFE_REHEARSAL_PERCENT'});
      const keys=Array.isArray(body?.cohort_keys)?body.cohort_keys.slice(0,100).map((x:unknown)=>String(x).slice(0,240)):[];
      return json(200,{ok:true,status:200,service:SLUG,environment:ENVIRONMENT,live_canary_percent:LIVE_CANARY_PERCENT,requested_rehearsal_percent:requested,decisions:keys.map((key:string)=>({cohort_key:key,...selectRoute(key,requested)})),safety:{synthetic_only:true,upstream_prod_chat_called:false,route_state_mutated:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0}});
    }
    if(req.method==='POST'&&route.path==='/canary/rehearsal'){
      let body:any;try{body=await req.json();}catch{return json(400,{ok:false,status:400,error:'INVALID_JSON'});}
      if(typeof body?.user_message!=='string'||!body?.upstream||typeof body.upstream!=='object')return json(400,{ok:false,status:400,error:'INVALID_REHEARSAL_PAYLOAD'});
      try{
        const result=applyOverlay({user_message:String(body.user_message).slice(0,2000),upstream:body.upstream,history:Array.isArray(body.history)?body.history.slice(-10):[]});
        return json(200,{ok:true,status:200,service:SLUG,environment:ENVIRONMENT,live_canary_percent:LIVE_CANARY_PERCENT,result,safety:{synthetic_only:true,upstream_prod_chat_called:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0}});
      }catch{
        return json(200,{ok:true,status:200,service:SLUG,environment:ENVIRONMENT,live_canary_percent:LIVE_CANARY_PERCENT,result:{response:body.upstream,overlay:{applied:false,reason:'OVERLAY_FAIL_SAFE',authoritative_preserved:true,questions_added:0}},safety:{synthetic_only:true,upstream_prod_chat_called:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0}});
      }
    }
    return json(405,{ok:false,status:405,error:'METHOD_NOT_ALLOWED'});
  }

  const routing=selectRoute(cohortKeyFromRequest(req),LIVE_CANARY_PERCENT);
  const target=`${UPSTREAM}${route.path}${route.search}`;
  const headers=forwardedHeaders(req);
  let requestBody:ArrayBuffer|undefined;
  let parsedChatBody:any=null;
  if(!['GET','HEAD'].includes(req.method)){
    requestBody=await req.arrayBuffer();
    if(req.method==='POST'&&route.path==='/chat')try{parsedChatBody=JSON.parse(new TextDecoder().decode(requestBody));}catch{parsedChatBody=null;}
  }
  const upstream=await fetch(target,{method:req.method,headers,body:requestBody});
  const raw=await upstream.arrayBuffer();
  if(routing.route==='OLD'){
    const out=responseHeaders(upstream,'OLD');out.set('x-cerebro-human-overlay','pass-through');
    auditRoute('OLD',upstream.status,false,routing.reason);
    return new Response(raw,{status:upstream.status,headers:out});
  }
  if(req.method!=='POST'||route.path!=='/chat'||!upstream.ok||!parsedChatBody){auditRoute('NEW',upstream.status,false,'NON_CHAT_OR_UPSTREAM_NOT_OK');return new Response(raw,{status:upstream.status,headers:responseHeaders(upstream,'NEW')});}
  let data:any;try{data=JSON.parse(new TextDecoder().decode(raw));}catch{auditRoute('NEW',upstream.status,false,'UPSTREAM_JSON_FAIL_SAFE');return new Response(raw,{status:upstream.status,headers:responseHeaders(upstream,'NEW')});}
  let overlaid;
  try{overlaid=applyOverlay({user_message:String(parsedChatBody?.message??''),upstream:data,history:Array.isArray(parsedChatBody?.conversation_context)?parsedChatBody.conversation_context:[]});}
  catch{const out=responseHeaders(upstream,'OLD');out.set('x-cerebro-human-overlay','fail-safe-old');auditRoute('OLD',upstream.status,false,'OVERLAY_FAIL_SAFE');return new Response(raw,{status:upstream.status,headers:out});}
  const outHeaders=rewrittenResponseHeaders(upstream);outHeaders.set('x-cerebro-human-overlay',overlaid.overlay.applied?'applied':'pass-through');
  auditRoute('NEW',upstream.status,overlaid.overlay.applied,overlaid.overlay.reason);
  return new Response(JSON.stringify(overlaid.response),{status:upstream.status,headers:outHeaders});
});
