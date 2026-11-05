import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { PC001_HEALTH_CANARY_V0, validateLivePc001Device, buildOwnerHealthCanaryRow, REQUEST_ID_RE } from './core.mjs';

// Isolated PREPROD candidate. This endpoint MUST NOT be deployed unless the
// corresponding SQL transaction, independent review and rollback are verified.
const ORIGIN = 'https://app.fenixcapital.es';
const H = { 'Access-Control-Allow-Origin':ORIGIN,
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-cerebro-owner-intent',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin',
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff' };
const reply=(status:number,code:string,extra:Record<string,unknown>={})=>
  new Response(JSON.stringify({ok:status<300,code,...extra,environment:'PREPROD',prod_allowed:false,
    remote_desktop_control:false}),{status,headers:H});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

Deno.serve(async(req:Request)=>{
 try {
  if(req.method==='OPTIONS')return new Response('',{status:204,headers:H});
  if(req.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(req.headers.get('Origin')!==ORIGIN)return reply(403,'ORIGIN_DENIED');
  const intent=req.headers.get('x-cerebro-owner-intent');
  if(!['PC001_READ_HEALTH_GRANT_V1','PC001_OWNER_GRANT_CREATE_V1','PC001_OWNER_GRANT_REVOKE_V1'].includes(intent??''))return reply(400,'INTENT_REQUIRED');
  const auth=req.headers.get('authorization')??'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(token.length<20||token.length>8192)return reply(401,'SESSION_REQUIRED');
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!serviceKey)return reply(503,'BACKEND_CONFIGURATION_MISSING');
  const authClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:session,error:authError}=await authClient.auth.getUser(token);
  if(authError||!session?.user)return reply(401,'SESSION_INVALID');
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:actor,error:actorError}=await db.rpc('preprod_test_actor_context_by_auth_server',{p_auth_user_id:session.user.id});
  if(actorError||!actor?.ok||actor.actor_code!=='CARLOS-ADMIN'||actor.role!=='Direccion'||actor.active!==true)return reply(403,'OWNER_NOT_VERIFIED');
  const bodyText=await req.text();if(bodyText.length>1024)return reply(413,'REQUEST_TOO_LARGE');
  let body:unknown;try{body=JSON.parse(bodyText)}catch{return reply(400,'INVALID_JSON')}
  if(!plain(body))return reply(400,'REQUEST_SHAPE_DENIED');
  if(intent==='PC001_OWNER_GRANT_CREATE_V1'){
   if(Object.keys(body).length!==2||!Object.hasOwn(body,'decision_request_id')||!Object.hasOwn(body,'mode')
     ||!uuid.test(String(body.decision_request_id))||!['ONE_TIME','ALL_SIMILAR','EXCEPTION_ONLY'].includes(String(body.mode)))return reply(400,'GRANT_REQUEST_DENIED');
   const {data:created,error}=await db.rpc('pc001_owner_health_authorize_v1',{
      p_owner_auth_id:session.user.id,p_decision_request_id:body.decision_request_id,p_mode:body.mode});
   if(error)return reply(503,'GRANT_PROVIDER_UNAVAILABLE');
   if(!created?.ok)return reply(409,created?.code||'GRANT_REJECTED');
   return reply(201,'GRANT_CREATED',{grant_id:created.grant_id,mode:created.mode,expires_at:created.expires_at??null,
     duplicate:created.duplicate===true,created_by_authenticated_owner:true});
  }
  if(intent==='PC001_OWNER_GRANT_REVOKE_V1'){
   if(Object.keys(body).length!==1||!uuid.test(String(body.grant_id)))return reply(400,'REVOKE_SCOPE_DENIED');
   const {data:revoked,error}=await db.rpc('pc001_owner_health_revoke_v1',{
    p_owner_auth_id:session.user.id,p_grant_id:body.grant_id});
   if(error)return reply(503,'REVOCATION_PROVIDER_UNAVAILABLE');
   return reply(revoked?.ok?200:409,revoked?.code||'REVOCATION_HOLD',{
    revoked:revoked?.ok===true,already_dispatched_command_unaffected:true});
  }
  if(Object.keys(body).length!==4||Object.keys(body).some(k=>!['request_id','grant_id','device_id','action'].includes(k)))return reply(400,'REQUEST_SHAPE_DENIED');
  if(!REQUEST_ID_RE.test(String(body.request_id))||!uuid.test(String(body.grant_id))||body.device_id!==PC001_HEALTH_CANARY_V0.device_id||body.action!=='READ_HEALTH')return reply(400,'REQUEST_SCOPE_DENIED');
  const {data:device,error:deviceError}=await db.from('cerebro_device_agents_preprod')
   .select('device_id,company_id,environment,version,status,revoked_at,last_seen_at')
   .eq('device_id',PC001_HEALTH_CANARY_V0.device_id).maybeSingle();
  if(deviceError||!validateLivePc001Device(device,new Date()).ok)return reply(409,'DEVICE_NOT_READY');
  const row=await buildOwnerHealthCanaryRow({request_id:String(body.request_id),auth_user_id:session.user.id,now:new Date()});
  // One privileged RPC performs grant consumption, queue exclusivity and
  // insertion atomically. A separate SELECT then INSERT is forbidden.
  const {data:result,error:rpcError}=await db.rpc('pc001_owner_health_enqueue_v1',{
    p_owner_auth_id:session.user.id,p_grant_id:body.grant_id,p_request_id:body.request_id,p_row:row
  });
  if(rpcError)return reply(503,'ATOMIC_ISSUER_UNAVAILABLE');
  if(!result?.ok)return reply(result?.code==='RATE_LIMIT'?429:409,result?.code||'ISSUER_HOLD');
  return reply(result?.duplicate?200:202,result?.duplicate?'IDEMPOTENT_EXISTING':'QUEUED',{
    command_id:result.command_id,command_state:result.state,
    executed:false,requires_semantic_receipt:true,additional_cost_eur:0
  });
 }catch{return reply(500,'ISSUER_ERROR')}
});