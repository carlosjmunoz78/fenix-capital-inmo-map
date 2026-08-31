import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'';
const A=Deno.env.get('SUPABASE_ANON_KEY')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const origins=new Set(['https://app.fenixcapital.es']);

function cors(req:Request){
  const o=req.headers.get('origin')??'';
  return {
    'access-control-allow-origin':origins.has(o)?o:'https://app.fenixcapital.es',
    'access-control-allow-methods':'GET,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
    'vary':'Origin',
    'cache-control':'no-store'
  };
}
function J(req:Request,d:any,s=200){
  return new Response(JSON.stringify(d),{status:s,headers:{...cors(req),'content-type':'application/json; charset=utf-8','x-fenix-env':'PROD'}});
}

Deno.serve(async(req)=>{
  try{
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
    if(req.method!=='GET')return J(req,{ok:false,error:'method_not_allowed'},405);
    const h=req.headers.get('authorization')??'';
    if(!h.toLowerCase().startsWith('bearer '))return J(req,{ok:false,error:'unauthorized'},401);
    const token=h.slice(7).trim();
    const auth=createClient(U,A,{auth:{persistSession:false}});
    const svc=createClient(U,S,{auth:{persistSession:false}});
    const {data:u,error:e}=await auth.auth.getUser(token);
    if(e||!u.user)return J(req,{ok:false,error:'unauthorized'},401);
    const {data:ctx,error:ce}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:u.user.id});
    if(ce||!ctx?.ok)return J(req,{ok:false,error:'identity_not_linked'},403);
    const actor=ctx.actor_code;
    const path=new URL(req.url).pathname.replace(/^\/(?:functions\/v1\/)?fenix-directory-api/,'')||'/';

    let rpcName='';
    let args:any={p_actor_code:actor};
    if(path==='/notarias')rpcName='fenix_prod_notarias_server';
    else if(path==='/registros-propiedad')rpcName='fenix_prod_registros_server';
    else if(path==='/personal-directorio')rpcName='fenix_prod_directory_personal_server';
    else {
      const nm=path.match(/^\/notarias\/([^/]+)$/);
      const rm=path.match(/^\/registros-propiedad\/([^/]+)$/);
      if(nm){
        rpcName='fenix_prod_notaria_detail_server';
        args={p_actor_code:actor,p_id:decodeURIComponent(nm[1])};
      }else if(rm){
        rpcName='fenix_prod_registro_detail_server';
        args={p_actor_code:actor,p_id:decodeURIComponent(rm[1])};
      }else return J(req,{ok:false,error:'not_found'},404);
    }
    const {data,error}=await svc.rpc(rpcName,args);
    if(error)return J(req,{ok:false,error:'backend_error'},500);
    return J(req,data??{ok:false,error:'empty'},Number(data?.status??200));
  }catch{
    return J(req,{ok:false,error:'exception'},500);
  }
});
