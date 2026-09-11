import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
const ADMIN_ACTORS=new Set(['CARLOS-ADMIN','BELEN-DIR']);
function key(raw:string){try{const x=JSON.parse(raw||'{}');return String((x as any)?.default??Object.values(x??{})[0]??'')}catch{return''}}
function cfg(){const URL=Deno.env.get('SUPABASE_URL')||'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||key(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||key(Deno.env.get('SUPABASE_SECRET_KEYS')||'');return{URL,ANON,SERVICE}}
function cors(req:Request){const o=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function validPassword(v:string){return typeof v==='string'&&v.length>=12&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/[0-9]/.test(v)&&/[^A-Za-z0-9]/.test(v)}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(!['GET','POST'].includes(req.method))return out(req,{ok:false,error:'method_not_allowed'},405);
 const c=cfg();if(!c.URL||!c.ANON||!c.SERVICE)return out(req,{ok:false,error:'server_config_missing'},503);
 const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 const auth=createClient(c.URL,c.ANON,{auth:{persistSession:false,autoRefreshToken:false}}),svc=createClient(c.URL,c.SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:u,error:ue}=await auth.auth.getUser(h.slice(7));if(ue||!u.user)return out(req,{ok:false,error:'unauthorized'},401);
 const{data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:u.user.id});if(ce||!ctx?.ok)return out(req,{ok:false,error:'identity_not_linked'},401);
 if(ctx.role!=='Direccion'||!ADMIN_ACTORS.has(String(ctx.actor_code||'')))return out(req,{ok:false,error:'forbidden'},403);
 if(req.method==='GET'){
  const{data,error}=await svc.rpc('fenix_prod_user_admin_list_server',{p_actor_code:ctx.actor_code});
  if(error)return out(req,{ok:false,error:'list_failed'},500);return out(req,data,Number(data?.status)||200);
 }
 let body:any={};try{body=await req.json()}catch{return out(req,{ok:false,error:'invalid_json'},400)}
 const action=String(body?.action||'');
 if(action==='create_user'){
  const email=String(body?.email||'').trim().toLowerCase(),displayName=String(body?.display_name||'').trim(),role=String(body?.role||''),password=String(body?.password||'');
  if(!/^\S+@\S+\.\S+$/.test(email)||!displayName||!['Direccion','Financiero','Visitador'].includes(role)||!validPassword(password))return out(req,{ok:false,error:'invalid_input'},400);
  if(role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN')return out(req,{ok:false,error:'director_creation_forbidden'},403);
  const created=await svc.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:displayName,role,created_by_actor:ctx.actor_code}});
  if(created.error||!created.data.user)return out(req,{ok:false,error:created.error?.message==='A user with this email address has already been registered'?'email_exists':'create_auth_failed'},created.error?.status||400);
  const reg=await svc.rpc('fenix_prod_user_admin_register_server',{p_actor_code:ctx.actor_code,p_auth_user_id:created.data.user.id,p_email:email,p_display_name:displayName,p_role:role});
  if(reg.error||!reg.data?.ok){await svc.auth.admin.deleteUser(created.data.user.id);return out(req,{ok:false,error:'actor_link_failed'},500)}
  return out(req,{ok:true,status:201,actor_code:reg.data.actor_code,role},201);
 }
 if(action==='reset_password'){
  const target=String(body?.actor_code||''),password=String(body?.password||'');if(!target||!validPassword(password))return out(req,{ok:false,error:'invalid_input'},400);
  const allowed=await svc.rpc('fenix_prod_user_admin_target_server',{p_actor_code:ctx.actor_code,p_target_actor_code:target});
  if(allowed.error||!allowed.data?.ok)return out(req,allowed.data||{ok:false,error:'target_check_failed'},Number(allowed.data?.status)||500);
  const changed=await svc.auth.admin.updateUserById(String(allowed.data.auth_user_id),{password});if(changed.error)return out(req,{ok:false,error:'password_update_failed'},500);
  await svc.rpc('fenix_prod_user_admin_audit_reset_server',{p_actor_code:ctx.actor_code,p_target_actor_code:target});
  return out(req,{ok:true,status:200},200);
 }
 return out(req,{ok:false,error:'unknown_action'},400);
});