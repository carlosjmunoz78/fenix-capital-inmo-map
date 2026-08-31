import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
function keyFromJson(raw:string){try{const x=JSON.parse(raw||'{}');return String((x as any)?.default??Object.values(x??{})[0]??'')}catch{return ''}}
function config(){const URL=Deno.env.get('SUPABASE_URL')??'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||keyFromJson(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keyFromJson(Deno.env.get('SUPABASE_SECRET_KEYS')??'');return{URL,ANON,SERVICE}}
function cors(req:Request){const o=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization, apikey, content-type, idempotency-key','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function json(req:Request){try{return await req.json()}catch{return {}}}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=='POST')return out(req,{ok:false,status:405,error:'method_not_allowed'},405);
 const c=config();if(!c.URL||!c.ANON||!c.SERVICE)return out(req,{ok:false,status:503,error:'server_config_missing'},503);
 const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return out(req,{ok:false,status:401,error:'unauthorized'},401);
 const auth=createClient(c.URL,c.ANON,{auth:{persistSession:false,autoRefreshToken:false}});
 const svc=createClient(c.URL,c.SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:u,error:ue}=await auth.auth.getUser(h.slice(7));if(ue||!u.user)return out(req,{ok:false,status:401,error:'unauthorized'},401);
 const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:u.user.id});if(ce||!ctx?.ok)return out(req,{ok:false,status:401,error:'identity_not_linked'},401);
 const b:any=await json(req);
 const due=b.fecha_limite?new Date(String(b.fecha_limite)).toISOString():null;
 const {data:r,error}=await svc.rpc('fenix_prod_task_create_server',{p_actor_code:ctx.actor_code,p_tarea:String(b.tarea||''),p_target_actor_code:String(b.id_trabajador_operativo||ctx.actor_code||''),p_criticidad:b.criticidad||null,p_fecha_limite:due,p_idempotency_key:req.headers.get('idempotency-key')||b.idempotency_key||null});
 if(error){console.error(error);return out(req,{ok:false,status:500,error:'task_create_failed'},500)}
 return out(req,r,Number(r?.status)||200);
});
