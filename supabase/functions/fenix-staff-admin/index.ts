import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED=new Set(['https://app.fenixcapital.es']);
const ROLE_TO_DB:Record<string,{role:string;profile_kind:string}>={
  Director:{role:'Direccion',profile_kind:'Director'},
  Financiero:{role:'Financiero',profile_kind:'Financiero'},
  Visitador:{role:'Visitador',profile_kind:'Visitador'},
};

function config(){return{url:Deno.env.get('SUPABASE_URL')??'',anon:Deno.env.get('SUPABASE_ANON_KEY')??'',service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''};}
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Vary':'Origin','content-type':'application/json; charset=utf-8','cache-control':'no-store','x-fenix-env':'PROD'};}
function out(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors(req)});}
function actorCode(kind:string){const prefix=kind==='Director'?'DIR':kind==='Financiero'?'FIN':'VIS';return `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
async function identity(req:Request){
  const c=config(),h=req.headers.get('authorization')||'';
  if(!c.url||!c.anon||!c.service||!h.startsWith('Bearer '))return null;
  const auth=createClient(c.url,c.anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const svc=createClient(c.url,c.service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.getUser(h.slice(7));
  if(error||!data.user)return null;
  const {data:ctx,error:ctxError}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});
  if(ctxError||!ctx?.ok||!['CARLOS-ADMIN','BELEN-DIR'].includes(String(ctx.actor_code)))return null;
  return{svc,user:data.user,actor:String(ctx.actor_code),role:String(ctx.role||'Direccion')};
}
function allowedRoles(actor:string){return actor==='CARLOS-ADMIN'?new Set(['Director','Financiero','Visitador']):new Set(['Financiero','Visitador']);}
async function audit(me:any,action:'INSERT'|'UPDATE',subjectCode:string|null,changedFields:Record<string,unknown>={}){
  await me.svc.schema('fenix_prod').from('activity_log').insert({
    actor_code:me.actor,
    actor_role:me.role,
    entity_type:'staff_account',
    entity_code:subjectCode,
    action,
    changed_fields:changedFields,
    source:'fenix-staff-admin',
    source_ref:subjectCode,
    occurred_at:new Date().toISOString(),
  });
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
  const me=await identity(req);
  if(!me)return out(req,{ok:false,status:403,error:'forbidden'},403);
  const raw=new URL(req.url).pathname.replace(/^\/(?:functions\/v1\/)?fenix-staff-admin/,'')||'/';

  if(req.method==='GET'&&raw==='/users'){
    const {data,error}=await me.svc.schema('fenix_prod').from('actors').select('actor_code,auth_user_id,role,profile_kind,display_name,active,created_at').eq('created_by_auth_user_id',me.user.id).order('created_at',{ascending:false});
    if(error)return out(req,{ok:false,status:500,error:'staff_list_failed'},500);
    return out(req,{ok:true,status:200,items:data??[]});
  }

  let body:any={};
  try{body=await req.json();}catch{return out(req,{ok:false,status:400,error:'invalid_json'},400);}

  if(req.method==='POST'&&raw==='/users'){
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    const fullName=String(body.full_name||'').trim();
    const requested=String(body.role||'').trim();
    const mapped=ROLE_TO_DB[requested];
    if(!email.includes('@')||fullName.length<2||password.length<8||!mapped)return out(req,{ok:false,status:400,error:'invalid_payload'},400);
    if(!allowedRoles(me.actor).has(requested))return out(req,{ok:false,status:403,error:'role_not_allowed'},403);
    const {data:created,error:createError}=await me.svc.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,fenix_profile_kind:mapped.profile_kind}});
    if(createError||!created.user)return out(req,{ok:false,status:409,error:'account_create_failed'},409);
    const code=actorCode(requested);
    const {error:actorError}=await me.svc.schema('fenix_prod').from('actors').insert({actor_code:code,auth_user_id:created.user.id,role:mapped.role,profile_kind:mapped.profile_kind,display_name:fullName,active:true,created_by_auth_user_id:me.user.id,created_by_actor_code:me.actor});
    if(actorError){await me.svc.auth.admin.deleteUser(created.user.id);return out(req,{ok:false,status:500,error:'identity_link_failed'},500);}
    await audit(me,'INSERT',code,{created_role:mapped.profile_kind,created_by:me.actor});
    return out(req,{ok:true,status:201,actor_code:code,user_id:created.user.id,role:mapped.profile_kind},201);
  }

  const passwordMatch=raw.match(/^\/users\/([0-9a-f-]{36})\/password$/i);
  if(req.method==='PATCH'&&passwordMatch){
    const targetId=passwordMatch[1];
    const password=String(body.password||'');
    if(password.length<8)return out(req,{ok:false,status:400,error:'invalid_password'},400);
    const {data:target,error:targetError}=await me.svc.schema('fenix_prod').from('actors').select('actor_code,created_by_auth_user_id,active').eq('auth_user_id',targetId).maybeSingle();
    if(targetError||!target)return out(req,{ok:false,status:404,error:'staff_not_found'},404);
    if(target.created_by_auth_user_id!==me.user.id)return out(req,{ok:false,status:403,error:'not_creator'},403);
    const {error:updateError}=await me.svc.auth.admin.updateUserById(targetId,{password});
    if(updateError)return out(req,{ok:false,status:500,error:'password_update_failed'},500);
    await audit(me,'UPDATE',String(target.actor_code),{password_changed:true});
    return out(req,{ok:true,status:200,actor_code:target.actor_code});
  }

  return out(req,{ok:false,status:404,error:'not_found'},404);
});
