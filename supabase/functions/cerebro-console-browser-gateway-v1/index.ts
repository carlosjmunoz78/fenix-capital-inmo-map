import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'';
const A=Deno.env.get('SUPABASE_ANON_KEY')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const RUNTIME_ENV=U.includes(PROD_PROJECT_REF)?'PROD':'PREPROD';
const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ALLOWED_ORIGINS=new Set(['https://app.fenixcapital.es','https://www.app.fenixcapital.es','https://fenix-capital-preprod.vercel.app']);
const BROWSER_EDGE='cerebro-browser-interactive-v3';
const OWNER_ROUTES=new Set(['owner/start','owner/status','owner/key','owner/takeover','owner/handback','owner/input','owner/stop']);
const CONTRACT=Object.freeze({service:'cerebro-console-browser-gateway-v1',schema_version:'1.0.1',gateway_required:true,direct_browser_edge_access:false,owner_only:true,company_scope:'fenix',environment:RUNTIME_ENV,version:'v3',incremental_cost_eur:0});

function headers(origin:string|null=null){const h:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'origin'};if(origin&&ALLOWED_ORIGINS.has(origin))h['access-control-allow-origin']=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:headers(req.headers.get('origin'))});}
function bearer(req:Request){const v=req.headers.get('authorization')??'';return v.toLowerCase().startsWith('bearer ')?v.slice(7).trim():'';}
async function owner(req:Request){const token=bearer(req);if(!token)return{ok:false,error:'OWNER_TOKEN_REQUIRED'} as const;const {data,error}=await auth.auth.getUser(token);if(error||!data.user)return{ok:false,error:'OWNER_TOKEN_INVALID'} as const;const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});if(ce||ctx?.ok!==true||String(ctx?.actor_code??'')!=='CARLOS-ADMIN')return{ok:false,error:'OWNER_REQUIRED'} as const;return{ok:true,actor:'CARLOS-ADMIN',token} as const;}
function scope(body:any){const company=String(body?.company_id||'fenix');const environment=String(body?.environment||RUNTIME_ENV);const version=String(body?.version||'v3');const engine=String(body?.engine_id||'CONSOLE-001');if(company!=='fenix')return{ok:false,error:'COMPANY_SCOPE_DENIED'} as const;if(environment!==RUNTIME_ENV)return{ok:false,error:'ENVIRONMENT_SCOPE_DENIED'} as const;if(version!=='v3')return{ok:false,error:'VERSION_SCOPE_DENIED'} as const;if(engine!=='CONSOLE-001')return{ok:false,error:'ENGINE_SCOPE_DENIED'} as const;return{ok:true,company_id:company,environment,version,engine_id:engine} as const;}
async function forward(route:string,token:string,body:any){const response=await fetch(`${U}/functions/v1/${BROWSER_EDGE}/${route}`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,apikey:A},body:JSON.stringify(body),redirect:'error'});const text=await response.text();let data:unknown=null;try{data=text?JSON.parse(text):null}catch{data={ok:false,error:'BROWSER_GATEWAY_INVALID_JSON'}}return{status:response.status,data};}

Deno.serve(async req=>{const origin=req.headers.get('origin');if(req.method==='OPTIONS'){if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});return new Response(null,{status:204,headers:{...headers(origin),'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,apikey','access-control-max-age':'600'}});}const route=new URL(req.url).pathname.split('/').filter(Boolean).slice(-2).join('/');if(req.method==='GET'&&route.endsWith('health'))return out(req,200,{ok:true,...CONTRACT});if(req.method!=='POST')return out(req,404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});if(!OWNER_ROUTES.has(route))return out(req,404,{ok:false,error:'BROWSER_GATEWAY_ROUTE_DENIED'});const o=await owner(req);if(!o.ok)return out(req,403,o);let body:any={};try{body=await req.json();}catch{}const scoped=scope(body);if(!scoped.ok)return out(req,403,scoped);const forwarded={...body,company_id:scoped.company_id,environment:scoped.environment,version:scoped.version,engine_id:scoped.engine_id};try{const result=await forward(route,o.token,forwarded);return out(req,result.status,result.data);}catch(e){return out(req,502,{ok:false,error:'BROWSER_GATEWAY_FORWARD_FAILED',detail:e instanceof Error?e.message:String(e)});}});
