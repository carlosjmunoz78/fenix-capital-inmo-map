import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const PREPROD_PROJECT_REF='hnqlnvakzaywtafeiybt';
const SLUG='cerebro-console-human-router-zero-v1';
const OLD=`https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-v0`;
const NEW=`https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-human-v1-canary`;
const LIVE_CANARY_PERCENT=0;
const OIDC_ISSUER='https://token.actions.githubusercontent.com';
const OIDC_AUDIENCE=SLUG;
const REPOSITORY='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOW_PATH='.github/workflows/cerebro-human-intelligence-prod-router-zero-v1.yml';

type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;[key:string]:unknown};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-cerebro-human-router':'zero-v1'}});}
function b64urlBytes(value:string){const normalized=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);const raw=atob(normalized);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}
let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`,{cache:'no-store'});if(!configRes.ok)throw new Error('OIDC_CONFIG_UNAVAILABLE');const config=await configRes.json();const jwksRes=await fetch(String(config.jwks_uri),{cache:'no-store'});if(!jwksRes.ok)throw new Error('OIDC_JWKS_UNAVAILABLE');const jwks=await jwksRes.json();if(!Array.isArray(jwks?.keys))throw new Error('OIDC_JWKS_INVALID');jwksCache={at:Date.now(),keys:jwks.keys};return jwks.keys;}
async function authorizeOidc(req:Request){const bearer=req.headers.get('authorization')??'';if(!bearer.startsWith('Bearer '))return {ok:false as const,reason:'OIDC_MISSING'};const parts=bearer.slice(7).split('.');if(parts.length!==3)return {ok:false as const,reason:'OIDC_MALFORMED'};try{const header=b64urlJson<any>(parts[0]);const claims=b64urlJson<Claims>(parts[1]);if(header?.alg!=='RS256'||!header?.kid)return {ok:false as const,reason:'OIDC_ALG_OR_KID_INVALID'};const keys=await githubJwks(),jwk=keys.find((key:any)=>key?.kid===header.kid);if(!jwk)return {ok:false as const,reason:'OIDC_KID_UNKNOWN'};const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));if(!verified)return {ok:false as const,reason:'OIDC_SIGNATURE_INVALID'};const now=Math.floor(Date.now()/1000),audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:'OIDC_ISSUER_OR_AUDIENCE_INVALID'};if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:'OIDC_TIME_INVALID'};if(claims.repository!==REPOSITORY)return {ok:false as const,reason:'OIDC_REPOSITORY_INVALID'};if(!['pull_request','workflow_dispatch','schedule'].includes(String(claims.event_name??'')))return {ok:false as const,reason:'OIDC_EVENT_INVALID'};if(!String(claims.workflow_ref??'').includes(WORKFLOW_PATH))return {ok:false as const,reason:'OIDC_WORKFLOW_INVALID'};return {ok:true as const,claims};}catch(error){return {ok:false as const,reason:'OIDC_VERIFY_ERROR',detail:String(error instanceof Error?error.message:error)};}}
function suffix(req:Request){const u=new URL(req.url),marker=`/${SLUG}`,i=u.pathname.indexOf(marker);return {path:i>=0?(u.pathname.slice(i+marker.length)||'/'):u.pathname,search:u.search};}
function stableBucket(value:string){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0;}return hash%10000;}
function selectRoute(cohortKey:string,percent:number){if(!Number.isFinite(percent)||percent<0||percent>25)throw new Error('unsafe_canary_percent');if(percent===0)return {route:'OLD',bucket:null,reason:'ZERO_FAIL_CLOSED'};const key=String(cohortKey??'').trim();if(!key)return {route:'OLD',bucket:null,reason:'MISSING_STABLE_COHORT_KEY'};const bucket=stableBucket(key);return {route:bucket<Math.floor(percent*100)?'NEW':'OLD',bucket,reason:'DETERMINISTIC_COHORT'};}
function projectRef(req:Request){const host=new URL(req.url).hostname;return host.split('.')[0]||'';}
function responseHeaders(upstream:Response,route:'OLD'|'NEW'){const h=new Headers(upstream.headers);h.set('cache-control','no-store');h.set('x-cerebro-human-router','zero-v1');h.set('x-cerebro-human-route',route.toLowerCase());return h;}
function cohortKey(req:Request){const explicit=req.headers.get('x-cerebro-session-id')||req.headers.get('idempotency-key');if(explicit)return explicit.slice(0,240);const auth=req.headers.get('authorization')??'';if(auth.startsWith('Bearer ')){try{const parts=auth.slice(7).split('.');if(parts.length===3){const payload=b64urlJson<any>(parts[1]);if(typeof payload?.sub==='string'&&payload.sub)return `sub:${payload.sub}`;}}catch{/* routing only; upstream remains authority */}}return '';}

Deno.serve(async(req:Request)=>{
  const route=suffix(req),ref=projectRef(req);
  if(route.path==='/router/health'||route.path==='/router/rehearsal'){
    const auth=await authorizeOidc(req);if(!auth.ok)return json(403,{ok:false,status:403,error:auth.reason});
    if(req.method==='GET'&&route.path==='/router/health')return json(200,{ok:true,status:200,service:SLUG,project_ref:ref,environment:ref===PROD_PROJECT_REF?'PROD_ROUTER_ZERO_UNROUTED':ref===PREPROD_PROJECT_REF?'PREPROD_ROUTER_ZERO_TEST':'UNKNOWN_PROJECT',stable_authority:'cerebro-console-gateway-v0',candidate_overlay:'cerebro-console-gateway-human-v1-canary',live_canary_percent:LIVE_CANARY_PERCENT,consumer_routing_enabled:false,fail_closed_target:'OLD',live_upstream_called:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
    if(req.method==='POST'&&route.path==='/router/rehearsal'){
      let body:any;try{body=await req.json();}catch{return json(400,{ok:false,status:400,error:'INVALID_JSON'});}
      const requested=Number(body?.requested_percent??0);if(!Number.isFinite(requested)||requested<0||requested>25)return json(400,{ok:false,status:400,error:'UNSAFE_REHEARSAL_PERCENT'});
      const keys=Array.isArray(body?.cohort_keys)?body.cohort_keys.slice(0,100).map((x:unknown)=>String(x).slice(0,240)):[];
      const decisions=keys.map((key:string)=>({cohort_key:key,...selectRoute(key,requested)}));
      return json(200,{ok:true,status:200,service:SLUG,project_ref:ref,live_canary_percent:LIVE_CANARY_PERCENT,requested_rehearsal_percent:requested,decisions,safety:{synthetic_only:true,live_upstream_called:false,route_state_mutated:false,consumer_routing_enabled:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}});
    }
    return json(405,{ok:false,status:405,error:'METHOD_NOT_ALLOWED'});
  }

  if(ref!==PROD_PROJECT_REF)return json(503,{ok:false,status:503,error:'PREPROD_NORMAL_ROUTING_DISABLED',fail_closed:true,live_upstream_called:false});
  const decision=selectRoute(cohortKey(req),LIVE_CANARY_PERCENT);
  const targetBase=decision.route==='NEW'?NEW:OLD;
  const target=`${targetBase}${route.path}${route.search}`;
  const headers=new Headers(req.headers);headers.delete('host');
  const body=['GET','HEAD'].includes(req.method)?undefined:await req.arrayBuffer();
  const upstream=await fetch(target,{method:req.method,headers,body});
  const raw=await upstream.arrayBuffer();
  return new Response(raw,{status:upstream.status,headers:responseHeaders(upstream,decision.route as 'OLD'|'NEW')});
});
