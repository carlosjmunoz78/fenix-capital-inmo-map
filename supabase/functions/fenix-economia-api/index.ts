import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const U=Deno.env.get('SUPABASE_URL')??'',A=Deno.env.get('SUPABASE_ANON_KEY')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const O='https://app.fenixcapital.es';
function H(){return {'access-control-allow-origin':O,'access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','cache-control':'no-store','vary':'Origin'};}
function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{...H(),'content-type':'application/json; charset=utf-8','x-fenix-env':'PROD'}})}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:H()});
 if(req.method!=='GET')return J({ok:false,error:'method_not_allowed'},405);
 const h=req.headers.get('authorization')??'';
 if(!h.toLowerCase().startsWith('bearer '))return J({ok:false,error:'unauthorized'},401);
 const token=h.slice(7).trim(),auth=createClient(U,A,{auth:{persistSession:false}}),svc=createClient(U,S,{auth:{persistSession:false}});
 const {data:u,error:e}=await auth.auth.getUser(token);if(e||!u.user)return J({ok:false,error:'unauthorized'},401);
 const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:u.user.id});if(ce||!ctx?.ok)return J({ok:false,error:'identity_not_linked'},403);
 const path=new URL(req.url).pathname.replace(/^\/(?:functions\/v1\/)?fenix-economia-api/,'')||'/';if(path!=='/economia')return J({ok:false,error:'not_found'},404);
 const {data,error}=await svc.rpc('fenix_prod_economia_server',{p_actor_code:ctx.actor_code});if(error)return J({ok:false,error:'backend_error'},500);
 return J(data??{ok:false,error:'empty'},Number(data?.status??200));
});
