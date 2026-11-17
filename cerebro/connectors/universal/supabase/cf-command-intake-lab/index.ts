// FACT001 independent signed command intake. OIDC GitHub, Vault-backed D1 Write only, no provider Worker writes.
import postgres from 'npm:postgres@3.4.7';
import {SCOPE,CF_ACCOUNT,CF_RECOVERY_DB,VAULT_D1,
 verifyGitHubOidc,assertCommand} from './policy.mjs';
const HS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(code,body)=>new Response(JSON.stringify(body),{status:code,headers:HS});
const auth=req=>{const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):'';};
async function requestD1(sql,params){
 const db=Deno.env.get('SUPABASE_DB_URL');if(!db)throw Error('VAULT_DATABASE_MISSING');
 const pg=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let token='';
 try{
  const q=await pg.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[VAULT_D1]);
  if(q.length!==1||typeof q[0].decrypted_secret!=='string'||q[0].decrypted_secret.length<24)
   throw Error('D1_SERVICE_TOKEN_MISSING');
  token=q[0].decrypted_secret;
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+CF_ACCOUNT+
    '/d1/database/'+CF_RECOVERY_DB+'/query',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({sql,params}),redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(response.status!==200)throw Error('D1_HTTP_'+response.status);
  const data=await response.json();
  if(data?.success!==true||data.result?.[0]?.success!==true||!Array.isArray(data.result[0].results))
   throw Error('D1_UNVERIFIED_RESPONSE');
  return data.result[0].results;
 }finally{token='';await pg.end({timeout:2}).catch(()=>{});}
}
const SQL_INSERT="INSERT INTO fact001_cf_command_jobs_v1(id,company_id,engine_id,environment,version,operation,resource_name,request_id,idempotency_key,max_cost_eur,submitted_by,state,phase,attempts,created_at_ms) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,0,'CEREBRO_SIGNED_OIDC','QUEUED','PENDING',0,?10) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id,request_id,operation,resource_name,state,attempts";
const SQL_READ="SELECT id,request_id,operation,resource_name,company_id,engine_id,environment,version,state,attempts FROM fact001_cf_command_jobs_v1 WHERE idempotency_key=?1 LIMIT 2";
const SQL_STATUS="SELECT id,request_id,operation,resource_name,state,phase,error_code,attempts FROM fact001_cf_command_jobs_v1 WHERE request_id=?1 LIMIT 2";
async function submit(order){
 const row=await requestD1(SQL_INSERT,[order.job_id,order.company_id,order.engine_id,order.environment,order.version,
  order.operation,order.resource_name,order.request_id,order.idempotency_key,String(Date.now())]);
 const now=await requestD1(SQL_READ,[order.idempotency_key]);
 if(now.length!==1||now[0].id!==order.job_id||now[0].request_id!==order.request_id||
 now[0].operation!==order.operation||now[0].resource_name!==order.resource_name||
 now[0].company_id!==order.company_id||now[0].engine_id!==order.engine_id||
 now[0].environment!==order.environment||now[0].version!==order.version)
  return {status:'CONFLICT_OR_UNVERIFIED'};
 return {status:row.length===1?'QUEUED_VERIFIED':'IDEMPOTENT_EXISTING',
  job_id:now[0].id,request_id:now[0].request_id,state:now[0].state,attempts:now[0].attempts};
}
Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','submit','status'].includes(route))return reply(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(auth(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(route==='health'&&req.method==='GET')
  return reply(200,{status:'SIGNED_COMMAND_INTAKE_READY',scope:SCOPE,provider:'cloudflare',writes_to_provider:'D1_QUEUED_ONLY',worker_script_writes:false});
 if(!['submit','status'].includes(route)||req.method!=='POST')return reply(405,{status:'METHOD_DENIED'});
 if(Number(req.headers.get('content-length')||0)>2200)return reply(413,{status:'PAYLOAD_LIMIT'});
 let data;try{data=await req.json();}catch{return reply(400,{status:'INVALID_JSON'});}
 if(route==='submit'){
  try{assertCommand(data);}catch{return reply(403,{status:'ORDER_POLICY_DENIED'});}
  try{
   const r=await submit(data);
   return reply(r.status==='CONFLICT_OR_UNVERIFIED'?409:200,{...r,token_exposed:false});
  }catch(e){const reason=e instanceof Error?e.message:'';
   return reply(503,{status:'BACKEND_UNAVAILABLE',code:/^D1_HTTP_(400|401|403|404|429|500|502|503|504)$/.test(reason)?reason:'SAFE_BACKEND_ERROR',token_exposed:false});}
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||
 Object.keys(data).sort().join(',')!=='company_id,engine_id,environment,request_id,version'||
 Object.entries(SCOPE).some(([k,v])=>data[k]!==v)||
 !/^[A-Z0-9-]{10,80}$/.test(data.request_id))return reply(403,{status:'STATUS_SCOPE_DENIED'});
 try{const rows=await requestD1(SQL_STATUS,[data.request_id]);
  return reply(rows.length===1?200:404,rows.length===1?{status:'FOUND',job:rows[0]}:{status:'NOT_FOUND'});}
 catch{return reply(503,{status:'BACKEND_UNAVAILABLE'});}
});
