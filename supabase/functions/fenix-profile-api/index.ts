import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED=new Set(['https://app.fenixcapital.es']);
function keyFromJson(raw:string){try{const x=JSON.parse(raw||'{}');return String(x?.default??Object.values(x??{})[0]??'')}catch{return ''}}
function config(){const URL=Deno.env.get('SUPABASE_URL')??'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||keyFromJson(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keyFromJson(Deno.env.get('SUPABASE_SECRET_KEYS')??'');return{URL,ANON,SERVICE}}
function cors(req:Request){const o=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET,PATCH,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function statusOf(v:any){const n=Number(v?.status);return Number.isFinite(n)&&n>=100&&n<=599?n:200}

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
 if(req.method==='GET'){const{data,error}=await svc.rpc('fenix_prod_profile_get_server',{p_actor_code:actorCode});if(error)return out(req,{ok:false,error:'profile_read_failed'},500);return out(req,data,statusOf(data));}
 let body:any={};try{body=await req.json()}catch{return out(req,{ok:false,error:'invalid_json'},400)}
 const{data,error}=await svc.rpc('fenix_prod_profile_update_server',{p_actor_code:actorCode,p_display_name:typeof body.display_name==='string'?body.display_name:'',p_zone_code:typeof body.zone_code==='string'?body.zone_code:null});
 if(error)return out(req,{ok:false,error:'profile_update_failed'},500);
 return out(req,data,statusOf(data));
});
