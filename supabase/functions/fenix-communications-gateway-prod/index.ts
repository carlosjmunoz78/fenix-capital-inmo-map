import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const U=Deno.env.get('SUPABASE_URL')??'',A=Deno.env.get('SUPABASE_ANON_KEY')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
function headers(req:Request){const o=req.headers.get('origin')||'';return{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-fenix-env':'PROD','Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}}
function out(req:Request,data:any,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
function clean(v:any,max=5000){return typeof v==='string'?v.trim().slice(0,max):''}
Deno.serve(async(req:Request)=>{try{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(!['GET','POST'].includes(req.method))return out(req,{ok:false,error:'method_not_allowed'},405);
 const auth=req.headers.get('authorization')??'';if(!auth.toLowerCase().startsWith('bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 if(!U||!A||!S)return out(req,{ok:false,error:'server_config_missing'},503);
 const user=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const c=await user.rpc('fenix_prod_session_context');if(c.error||!c.data?.actor_code)return out(req,{ok:false,error:'identity_not_linked'},403);
 const actor=String(c.data.actor_code),role=String(c.data.role||'');if(role!=='Direccion')return out(req,{ok:false,error:'forbidden'},403);
 const url=new URL(req.url),path=url.pathname.replace(/^\/fenix-communications-gateway/,'').replace(/\/+$/,'')||'/';
 if(req.method==='GET'&&path==='/comunicaciones'){
   const r=await svc.rpc('fenix_prod_communications_list_server',{p_actor_code:actor});if(r.error)return out(req,{ok:false,error:'communications_read_failed'},500);return out(req,r.data,Number(r.data?.status)||200);
 }
 const body=await req.json().catch(()=>null);if(!body)return out(req,{ok:false,error:'invalid_json'},400);
 if(req.method==='POST'&&path==='/comunicaciones/prepare'){
   const r=await svc.rpc('fenix_prod_communications_prepare_server',{p_actor_code:actor,p_scope_type:clean(body.scope_type,40),p_scope_code:clean(body.scope_code,160),p_canal:clean(body.canal,30),p_recipient_alias:clean(body.recipient_alias,320),p_asunto:clean(body.asunto,500)||null,p_cuerpo:clean(body.cuerpo,10000),p_consentimiento_requerido:Boolean(body.consentimiento_requerido),p_consentimiento_valido:Boolean(body.consentimiento_valido),p_no_contactar:Boolean(body.no_contactar),p_idempotency_key:clean(body.idempotency_key,240)});if(r.error)return out(req,{ok:false,error:'communication_prepare_failed'},500);return out(req,r.data,Number(r.data?.status)||200);
 }
 const m=path.match(/^\/comunicaciones\/([^/]+)\/(authorize|send)$/);if(req.method==='POST'&&m){const code=decodeURIComponent(m[1]);if(m[2]==='authorize'){
   const r=await svc.rpc('fenix_prod_communications_authorize_server',{p_actor_code:actor,p_communication_code:code,p_expected_version:Number(body.expectedVersion),p_payload_hash:clean(body.payload_hash,200)});if(r.error)return out(req,{ok:false,error:'communication_authorize_failed'},500);return out(req,r.data,Number(r.data?.status)||200);
 } const mode=clean(body.mode,30)||'SIMULATED';if(mode!=='SIMULATED')return out(req,{ok:false,error:'external_transport_not_configured'},409);
   const r=await svc.rpc('fenix_prod_communications_simulate_server',{p_actor_code:actor,p_communication_code:code,p_expected_version:Number(body.expectedVersion),p_payload_hash:clean(body.payload_hash,200),p_idempotency_key:clean(body.idempotency_key,240)});if(r.error)return out(req,{ok:false,error:'communication_simulate_failed'},500);return out(req,r.data,Number(r.data?.status)||200);
 }
 return out(req,{ok:false,error:'not_found'},404);
}catch(e){console.error('fenix-communications-gateway',e);return out(req,{ok:false,error:'communications_exception'},500)}});
