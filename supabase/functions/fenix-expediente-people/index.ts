import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const ALLOWED=new Set(['https://app.fenixcapital.es']);let svc:any=null;
function keyFromJson(raw:string){try{const x=JSON.parse(raw||'{}');return String(x?.default??Object.values(x??{})[0]??'')}catch{return ''}}
function config(){const URL=Deno.env.get('SUPABASE_URL')??'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||keyFromJson(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??''),SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keyFromJson(Deno.env.get('SUPABASE_SECRET_KEYS')??'');return{URL,ANON,SERVICE}}
function service(){const c=config();if(!c.URL||!c.SERVICE)return null;if(!svc)svc=createClient(c.URL,c.SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});return svc}
function cors(req:Request){const o=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','x-fenix-env':'PROD'}}
function out(req:Request,body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function rpc(name:string,args:any={}){const s=service();if(!s)throw new Error('server_config_missing');const {data,error}=await s.rpc(name,args);if(error)throw new Error(`${name}: ${error.message}`);return data}
async function actor(req:Request){const c=config();if(!c.URL||!c.ANON||!service())return null;const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return null;const auth=createClient(c.URL,c.ANON,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await auth.auth.getUser(h.slice(7));if(error||!data.user)return null;const ctx=await rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});return ctx?.ok?String(ctx.actor_code):null}
async function jsonBody(req:Request){try{return await req.json()}catch{return {}}}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});let a;try{a=await actor(req)}catch(e){console.error(e);return out(req,{ok:false,status:500,error:'identity_resolution_failed'},500)}if(!a)return out(req,{ok:false,status:401,error:'identity_not_linked'},401);const u=new URL(req.url);try{
 if(req.method==='GET'&&u.searchParams.get('expediente')){const r=await rpc('fenix_prod_exp_people_server',{p_actor_code:a,p_exp_code:u.searchParams.get('expediente')});return out(req,r,Number(r?.status)||200)}
 if(req.method==='GET'&&u.searchParams.get('contact')){const id=u.searchParams.get('contact');const r=await rpc('fenix_prod_contact_get_server',{p_actor_code:a,p_id:id});if(!r?.ok)return out(req,r,Number(r?.status)||200);const lists=await rpc('fenix_prod_contact_lists_server',{p_actor_code:a,p_client_code:id});return out(req,{...r,lists:lists?.items||[]},200)}
 if(req.method==='POST'){const b=await jsonBody(req);
  if(b.action==='create'){const r=await rpc('fenix_prod_exp_person_create_server',{p_actor_code:a,p_exp_code:b.expediente_code,p_payload:b.payload||{}});return out(req,r,Number(r?.status)||200)}
  if(b.action==='update'){const r=await rpc('fenix_prod_exp_person_update_server',{p_actor_code:a,p_client_code:b.client_code,p_exp_code:b.expediente_code??null,p_changes:b.changes||{}});return out(req,r,Number(r?.status)||200)}
  if(b.action==='list_assign'){const r=await rpc('fenix_prod_contact_list_assign_server',{p_actor_code:a,p_client_code:b.client_code,p_list_name:b.list_name,p_selected:Boolean(b.selected)});return out(req,r,Number(r?.status)||200)}
 }
 return out(req,{ok:false,status:404,error:'route_not_found'},404)
}catch(e){console.error(e);return out(req,{ok:false,status:500,error:'server_error'},500)}});
