import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED=new Set(['https://app.fenixcapital.es']);
function keyFromJson(raw:string){try{const x=JSON.parse(raw||'{}');return String(x?.default??Object.values(x??{})[0]??'')}catch{return ''}}
function config(){const URL=Deno.env.get('SUPABASE_URL')??'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||keyFromJson(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keyFromJson(Deno.env.get('SUPABASE_SECRET_KEYS')??'');return{URL,ANON,SERVICE}}
function cors(req:Request){const o=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET,PATCH,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(v:unknown,max:number){return typeof v==='string'?v.trim().slice(0,max):''}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=='GET'&&req.method!=='PATCH')return out(req,{ok:false,error:'method_not_allowed'},405);
 const c=config();if(!c.URL||!c.ANON||!c.SERVICE)return out(req,{ok:false,error:'server_config_missing'},503);
 const bearer=req.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 const auth=createClient(c.URL,c.ANON,{auth:{persistSession:false,autoRefreshToken:false}});
 const svc=createClient(c.URL,c.SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:ud,error:ue}=await auth.auth.getUser(bearer.slice(7));if(ue||!ud.user)return out(req,{ok:false,error:'unauthorized'},401);
 const{data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:ud.user.id});if(ce||!ctx?.ok)return out(req,{ok:false,error:'identity_not_linked'},403);
 const actorCode=String(ctx.actor_code||'');
 const read=async()=>{const{data,error}=await svc.schema('fenix_prod').from('actors').select('actor_code,display_name,role,zone_code,active').eq('actor_code',actorCode).eq('active',true).maybeSingle();if(error||!data)return null;return{...data,email:ud.user.email??''}};
 if(req.method==='GET'){const profile=await read();return profile?out(req,{ok:true,status:200,profile}):out(req,{ok:false,error:'profile_not_found'},404)}
 let body:any={};try{body=await req.json()}catch{return out(req,{ok:false,error:'invalid_json'},400)}
 const displayName=clean(body.display_name,120),zoneCode=clean(body.zone_code,80);
 if(displayName.length<2)return out(req,{ok:false,error:'invalid_display_name'},400);
 const before=await read();if(!before)return out(req,{ok:false,error:'profile_not_found'},404);
 const{error:updateError}=await svc.schema('fenix_prod').from('actors').update({display_name:displayName,zone_code:zoneCode||null}).eq('actor_code',actorCode).eq('active',true);
 if(updateError)return out(req,{ok:false,error:'profile_update_failed'},500);
 const changed:any={};if(before.display_name!==displayName)changed.display_name={from:before.display_name??null,to:displayName};if((before.zone_code??'')!==zoneCode)changed.zone_code={from:before.zone_code??null,to:zoneCode||null};
 if(Object.keys(changed).length){await svc.schema('fenix_prod').from('activity_log').insert({actor_code:actorCode,actor_role:String(ctx.role||''),entity_type:'profile',entity_code:actorCode,action:'profile.updated',changed_fields:changed,source:'fenix-profile-api',source_ref:ud.user.id,occurred_at:new Date().toISOString()});}
 const profile=await read();return out(req,{ok:true,status:200,profile});
});
