import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
function keyFromJson(raw:string){try{const x=JSON.parse(raw||'{}');return String((x as any)?.default??Object.values(x??{})[0]??'')}catch{return ''}}
function config(){const URL=Deno.env.get('SUPABASE_URL')??'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||keyFromJson(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keyFromJson(Deno.env.get('SUPABASE_SECRET_KEYS')??'');return{URL,ANON,SERVICE}}
function cors(req:Request){const o=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization, apikey, content-type, idempotency-key','Access-Control-Allow-Methods':'GET,PATCH,POST,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function json(req:Request){try{return await req.json()}catch{return {}}}
function taskCodeFromUrl(req:Request){const u=new URL(req.url);const marker='/fenix-task-api/';const i=u.pathname.indexOf(marker);if(i<0)return '';return decodeURIComponent(u.pathname.slice(i+marker.length)).trim()}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(!['GET','PATCH','POST'].includes(req.method))return out(req,{ok:false,status:405,error:'method_not_allowed'},405);
 const c=config();if(!c.URL||!c.ANON||!c.SERVICE)return out(req,{ok:false,status:503,error:'server_config_missing'},503);
 const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return out(req,{ok:false,status:401,error:'unauthorized'},401);
 const auth=createClient(c.URL,c.ANON,{auth:{persistSession:false,autoRefreshToken:false}});
 const svc=createClient(c.URL,c.SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:u,error:ue}=await auth.auth.getUser(h.slice(7));if(ue||!u.user)return out(req,{ok:false,status:401,error:'unauthorized'},401);
 const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:u.user.id});if(ce||!ctx?.ok)return out(req,{ok:false,status:401,error:'identity_not_linked'},401);
 const taskCode=taskCodeFromUrl(req);
 if(req.method==='GET'){
  if(!taskCode)return out(req,{ok:false,status:400,error:'task_code_required'},400);
  const {data:r,error}=await svc.rpc('fenix_prod_task_get_server',{p_actor_code:ctx.actor_code,p_task_code:taskCode});
  if(error){console.error(error);return out(req,{ok:false,status:500,error:'task_get_failed'},500)}
  return out(req,r,Number(r?.status)||200);
 }
 if(req.method==='PATCH'){
  if(!taskCode)return out(req,{ok:false,status:400,error:'task_code_required'},400);
  const b:any=await json(req);
  let due:string|null=null;
  if(b.fecha_objetivo||b.fecha_limite){const parsed=new Date(String(b.fecha_objetivo||b.fecha_limite));if(Number.isNaN(parsed.getTime()))return out(req,{ok:false,status:400,error:'invalid_due_date'},400);due=parsed.toISOString();}
  let expected=b.expected_version===null||b.expected_version===undefined?null:Number(b.expected_version);
  if(expected!==null&&!Number.isInteger(expected))return out(req,{ok:false,status:400,error:'invalid_expected_version'},400);
  if(b.id_trabajador_operativo){
   const {data:rr,error:re}=await svc.rpc('fenix_prod_reassign_task_server',{p_actor_code:ctx.actor_code,p_task_code:taskCode,p_new_actor_code:String(b.id_trabajador_operativo),p_expected_version:expected});
   if(re){console.error(re);return out(req,{ok:false,status:500,error:'task_reassign_failed'},500)}
   if(Number(rr?.status)!==200)return out(req,rr,Number(rr?.status)||400);
   expected=Number(rr?.task?.version??rr?.version??(expected!==null?expected+1:0))||null;
  }
  const hasUpdate=['estado','criticidad','fecha_objetivo','fecha_limite','completada'].some(k=>Object.prototype.hasOwnProperty.call(b,k));
  if(!hasUpdate)return out(req,{ok:true,status:200,version:expected,task_code:taskCode},200);
  const {data:r,error}=await svc.rpc('fenix_prod_task_update_server',{
   p_actor_code:ctx.actor_code,
   p_task_code:taskCode,
   p_expected_version:expected,
   p_estado:b.estado??null,
   p_criticidad:b.criticidad??null,
   p_fecha_limite:due,
   p_completada:typeof b.completada==='boolean'?b.completada:null
  });
  if(error){console.error(error);return out(req,{ok:false,status:500,error:'task_update_failed'},500)}
  return out(req,r,Number(r?.status)||200);
 }
 const b:any=await json(req);
 let due:string|null=null;
 if(b.fecha_limite){const parsed=new Date(String(b.fecha_limite));if(Number.isNaN(parsed.getTime()))return out(req,{ok:false,status:400,error:'invalid_due_date'},400);due=parsed.toISOString();}
 const {data:r,error}=await svc.rpc('fenix_prod_task_create_server',{
  p_actor_code:ctx.actor_code,
  p_tarea:String(b.tarea||''),
  p_target_actor_code:String(b.id_trabajador_operativo||ctx.actor_code||''),
  p_criticidad:b.criticidad||null,
  p_fecha_limite:due,
  p_idempotency_key:req.headers.get('idempotency-key')||b.idempotency_key||null,
  p_origin_type:b.origin_type||null,
  p_origin_code:b.origin_code||null,
  p_action_channel:b.action_channel||null,
  p_happened:b.happened||null,
  p_planned_action:b.planned_action||null,
  p_ana_draft:b.ana_draft||null,
  p_user_correction:b.user_correction||null
 });
 if(error){console.error(error);return out(req,{ok:false,status:500,error:'task_create_failed'},500)}
 return out(req,r,Number(r?.status)||200);
});
