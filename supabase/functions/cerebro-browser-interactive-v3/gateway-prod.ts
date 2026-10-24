import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'';
const A=Deno.env.get('SUPABASE_ANON_KEY')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const UPSTREAM='cerebro-browser-interactive-v3';
const COMPANY_ID='fenix';
const ALLOWED_ORIGINS=new Set(['https://app.fenixcapital.es','https://www.app.fenixcapital.es']);
const OWNER_ROUTES=new Set(['/owner/companies','/owner/start','/owner/status','/owner/key','/owner/takeover','/owner/handback','/owner/input','/owner/stop']);
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});

function cors(origin:string|null){const h:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'origin'};if(origin&&ALLOWED_ORIGINS.has(origin))h['access-control-allow-origin']=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get('origin'))});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function routeOf(req:Request){const parts=new URL(req.url).pathname.split('/').filter(Boolean);const fn=parts.lastIndexOf('cerebro-browser-gateway-v1');return fn>=0?`/${parts.slice(fn+1).join('/')}`:`/${parts.slice(-2).join('/')}`;}
async function owner(req:Request){
 if(!U.includes(PROD_PROJECT_REF))return{ok:false,error:'PROD_PROJECT_REF_MISMATCH'} as const;
 const token=bearer(req);if(!token)return{ok:false,error:'OWNER_TOKEN_REQUIRED'} as const;
 const {data,error}=await auth.auth.getUser(token);if(error||!data.user)return{ok:false,error:'OWNER_TOKEN_INVALID'} as const;
 const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});
 if(ce||ctx?.ok!==true||String(ctx?.actor_code??'')!=='CARLOS-ADMIN')return{ok:false,error:'OWNER_REQUIRED'} as const;
 return{ok:true,actor:'CARLOS-ADMIN',user_id:data.user.id} as const;
}
function validateCompany(body:any){return String(body?.company_id||'')===COMPANY_ID;}
function companies(){return{ok:true,companies:[{company_id:COMPANY_ID,environment:'PROD',version:'v3',state:'ACTIVE',tenant_boundary:'DENY_CROSS_COMPANY',prod_authorized:true,prod_write_authorized:true,trading_access:false,additional_cost_eur:0}],source:'STATIC_CANARY_SCOPE_PENDING_PROD_REGISTRY'};}
async function assertSessionScope(sessionId:string){
 if(!sessionId)throw new Error('SESSION_ID_REQUIRED');
 const r=await svc.from('cerebro_browser_session_v3').select('session_id,company_id,environment').eq('session_id',sessionId).maybeSingle();
 if(r.error)throw r.error;
 if(!r.data||r.data.company_id!==COMPANY_ID||r.data.environment!=='PROD')throw new Error('SESSION_SCOPE_DENIED');
}
async function ownerStatus(body:any){
 const base='session_id,job_id,company_id,department_id,environment,version,identity_id,account_id,browser_profile_id,state,control_owner,worker_alive,emergency_stop,current_url,current_title,tabs,active_tab_index,viewport_width,viewport_height,frame_ciphertext,frame_iv,frame_seq,frame_mime,frame_captured_at,human_lease_id,human_lease_expires_at,human_required,last_heartbeat_at,opened_at,expires_at,closed_at,updated_at';
 if(body?.list===true){
  const r=await svc.from('cerebro_browser_session_v3').select('session_id,state,control_owner,worker_alive,current_url,current_title,opened_at,last_heartbeat_at,closed_at,updated_at').eq('company_id',COMPANY_ID).eq('environment','PROD').order('updated_at',{ascending:false}).limit(12);
  if(r.error)throw r.error;return{ok:true,sessions:r.data??[]};
 }
 let q=svc.from('cerebro_browser_session_v3').select(base).eq('company_id',COMPANY_ID).eq('environment','PROD');
 if(body?.session_id)q=q.eq('session_id',String(body.session_id));else q=q.order('updated_at',{ascending:false});
 const r=await q.limit(1).maybeSingle();if(r.error)throw r.error;return{ok:true,session:r.data??null};
}
async function proxy(req:Request,path:string,body:any){
 const headers:Record<string,string>={'content-type':'application/json'};
 const authorization=req.headers.get('authorization');const apikey=req.headers.get('apikey');
 if(authorization)headers.authorization=authorization;if(apikey)headers.apikey=apikey;
 const r=await fetch(`${U}/functions/v1/${UPSTREAM}${path}`,{method:'POST',headers,body:JSON.stringify(body),redirect:'error'});
 const text=await r.text();let payload:unknown=null;try{payload=JSON.parse(text);}catch{payload={ok:false,error:'UPSTREAM_NON_JSON'};}
 return{status:r.status,payload};
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS'){
  if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{...cors(origin),'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,apikey','access-control-max-age':'600'}});
 }
 const route=routeOf(req);
 if(req.method==='GET'&&route==='/health')return out(req,200,{ok:true,service:'cerebro-browser-gateway-v1',environment:'PROD',company_scope:'fenix',company_registry_source:'STATIC_CANARY_SCOPE_PENDING_PROD_REGISTRY',owner_routes_only:true,worker_routes_exposed:false,direct_browser_runtime_access:false,upstream:UPSTREAM,prod_write_path:true,trading_access:false,incremental_cost_eur:0});
 if(req.method!=='POST'||!OWNER_ROUTES.has(route))return out(req,404,{ok:false,error:'OWNER_GATEWAY_ROUTE_NOT_AVAILABLE'});
 const o=await owner(req);if(!o.ok)return out(req,403,o);
 let body:any={};try{body=await req.json();}catch{}
 if(route==='/owner/companies')return out(req,200,companies());
 if(!validateCompany(body))return out(req,403,{ok:false,error:'COMPANY_SCOPE_DENIED'});
 try{
  if(route==='/owner/status')return out(req,200,await ownerStatus(body));
  if(route!=='/owner/start')await assertSessionScope(String(body?.session_id||''));
  const upstream=await proxy(req,route,body);return out(req,upstream.status,upstream.payload);
 }catch(e){return out(req,400,{ok:false,error:'BROWSER_GATEWAY_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});