// FACT001 private OIDC Vercel command entry. JWT GitHub signature, scoped D1 queue only.
import postgres from 'npm:postgres@3.4.7';
import {executeOrder} from './vercel-operator.mjs';
import {SCOPE,CF_ACCOUNT,CF_RECOVERY_DB,VAULT_D1,verifyGitHubOidc,assertCommand} from './policy.mjs';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const answer=(status,data)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const auth=(req)=>{const value=req.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7):'';};
async function queryD1(sql,params){
 const pgurl=Deno.env.get('SUPABASE_DB_URL');if(!pgurl)throw Error('VAULT_DATABASE_NOT_READY');
 const pg=postgres(pgurl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let token='';
 try{
  const rows=await pg.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[VAULT_D1]);
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<24)throw Error('D1_TOKEN_MISSING');
  token=rows[0].decrypted_secret;
  const resp=await fetch('https://api.cloudflare.com/client/v4/accounts/'+CF_ACCOUNT+'/d1/database/'+CF_RECOVERY_DB+'/query',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({sql,params}),redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(resp.status!==200)throw Error('D1_HTTP_'+resp.status);
  const data=await resp.json();
  if(data?.success!==true||data.result?.[0]?.success!==true||!Array.isArray(data.result[0].results))throw Error('D1_RESPONSE_UNVERIFIED');
  return data.result[0].results;
 }finally{token='';await pg.end({timeout:2}).catch(()=>{});}
}
const INSERT="INSERT INTO fact001_vercel_jobs_v1(id,company_id,engine_id,environment,version,provider,team_id,project_id,project_name,operation,max_cost_eur,request_id,idempotency_key,submitted_by,state,phase,attempts,created_at_ms) VALUES(?1,?2,?3,?4,?5,'vercel',?6,?7,?8,?9,0,?10,?11,'CEREBRO_SIGNED_OIDC','QUEUED','PENDING',0,?12) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id,request_id,operation,state";
const CHECK="SELECT id,request_id,idempotency_key,company_id,engine_id,environment,version,team_id,project_id,project_name,operation,state,attempts FROM fact001_vercel_jobs_v1 WHERE idempotency_key=?1 LIMIT 2";
const STATUS="SELECT id,request_id,operation,state,attempts,phase,error_code FROM fact001_vercel_jobs_v1 WHERE request_id=?1 LIMIT 2";

const VERCEL_TOKEN_NAME='cerebro_vercel_service_token_v1';
async function withVercelServiceToken(perform){
 const pgurl=Deno.env.get('SUPABASE_DB_URL');
 if(!pgurl)throw Error('VAULT_DATABASE_NOT_READY');
 const pg=postgres(pgurl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let token='';
 try{
  const rows=await pg.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[VERCEL_TOKEN_NAME]);
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<24)
   throw Error('VERCEL_SERVICE_TOKEN_MISSING');
  token=rows[0].decrypted_secret;
  return await perform(token);
 }finally{token='';await pg.end({timeout:2}).catch(()=>{});}
}
const CLAIM_EXECUTE="UPDATE fact001_vercel_jobs_v1 SET state='RUNNING',attempts=attempts+1,updated_at_ms=?3 WHERE id=?1 AND request_id=?2 AND state='QUEUED' AND attempts=0 RETURNING id,company_id,engine_id,environment,version,provider,team_id,project_id,project_name,operation,max_cost_eur,request_id,idempotency_key,state,attempts";
const DONE_EXECUTE="UPDATE fact001_vercel_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id,state,attempts";
function safeVercelFailure(e){
 const msg=e instanceof Error?e.message:'';
 if(/^VERCEL_HTTP_(400|401|403|404|408|409|429|500|502|503|504)$/.test(msg))return msg;
 if(['VERCEL_LAB_SCOPE_DENIED','VERCEL_LAB_EXTRA_FIELDS_DENIED','VERCEL_SSO_NO_DEPLOYMENT_GATE','VERCEL_PROJECT_IDENTITY_DRIFT','VERCEL_UNEXPECTED_LIVE_DEPLOYMENT','VERCEL_POSTWRITE_MISMATCH','VERCEL_BASELINE_WRONG','VERCEL_SERVICE_TOKEN_MISSING'].includes(msg))return msg;
 return 'VERCEL_SERVICE_EXECUTION_RECONCILE';
}
async function executeQueuedVercelCommand(cmd){
 const pre=await queryD1(CHECK,[cmd.idempotency_key]);
 if(pre.length!==1||pre[0].id!==cmd.job_id||pre[0].request_id!==cmd.request_id||
 pre[0].state!=='QUEUED'||pre[0].attempts!==0||pre[0].operation!==cmd.operation||
 pre[0].project_id!==cmd.project_id||pre[0].team_id!==cmd.team_id||pre[0].project_name!==cmd.project_name)
 return{status:'CLAIM_PRECONDITION_DENIED'};
 const time=Date.now(),rows=await queryD1(CLAIM_EXECUTE,[cmd.job_id,cmd.request_id,time]);
 if(rows.length!==1||rows[0].id!==cmd.job_id)return{status:'ALREADY_CLAIMED_OR_DRIFT'};
 const job=rows[0];
 let resultStatus='RECONCILE',phase='UNVERIFIED',error=null;
 try{
  if(job.state!=='RUNNING'||job.attempts!==1)throw Error('VERCEL_LAB_SCOPE_DENIED');
  const order=Object.fromEntries(['company_id','engine_id','environment','version','provider','team_id','project_id','project_name','operation','max_cost_eur','request_id','idempotency_key'].map(k=>[k,job[k]]));
  const result=await withVercelServiceToken(token=>executeOrder(order,token));
  if(!['VERIFIED','COMPLETED','VERIFIED_EMPTY_LAB_DEPLOYMENTS'].includes(result.status))
   throw Error('VERCEL_POSTWRITE_MISMATCH');
  resultStatus='COMPLETED';phase=result.status;
 }catch(e){error=safeVercelFailure(e);}
 const updated=await queryD1(DONE_EXECUTE,[job.id,resultStatus,phase,error,Date.now()]);
 if(updated.length!==1||updated[0].id!==job.id)throw Error('VERCEL_EXECUTION_AUDIT_FAILED');
 try{
  await queryD1("INSERT INTO fact001_vercel_events_v1(job_id,state,phase,error_code,recorded_at_ms) VALUES(?1,?2,?3,?4,?5) RETURNING event_id",[job.id,resultStatus,phase,error,Date.now()]);
 }catch{throw Error('VERCEL_EVENT_AUDIT_RECONCILE');}
 return{status:updated[0].state,request_id:cmd.request_id,attempts:updated[0].attempts,
  phase,error_code:error,credentials_exposed:false,provider_project_id:cmd.project_id};
}

Deno.serve(async(req)=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','submit','status','execute'].includes(route))return answer(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(auth(req));}
 catch{return answer(401,{status:'UNAUTHORIZED'});}
 if(route==='health')return req.method==='GET'?answer(200,{status:'VERCEL_LAB_SIGNED_INTAKE_READY',provider:'vercel',scope:SCOPE,writes_to:'D1_QUEUE_ONLY',vercel_api_writes:'SIGNED_OWNED_LAB_ONLY'}):answer(405,{status:'METHOD_DENIED'});
 if(req.method!=='POST')return answer(405,{status:'METHOD_DENIED'});
 let data;
 try{
  const payload=await req.text();
  if(payload.length>2200)return answer(413,{status:'PAYLOAD_TOO_LARGE'});
  data=JSON.parse(payload);
 }catch{return answer(400,{status:'BAD_JSON'});}
 if(route==='submit'){
  try{assertCommand(data);}catch{return answer(403,{status:'ORDER_DENIED'});}
  try{
   const params=[data.job_id,data.company_id,data.engine_id,data.environment,data.version,data.team_id,
      data.project_id,data.project_name,data.operation,data.request_id,data.idempotency_key,Date.now()];
   const added=await queryD1(INSERT,params);
   const prior=await queryD1(CHECK,[data.idempotency_key]);
   if(prior.length!==1||prior[0].id!==data.job_id||prior[0].request_id!==data.request_id||
     prior[0].operation!==data.operation||prior[0].team_id!==data.team_id||prior[0].project_id!==data.project_id||
     prior[0].project_name!==data.project_name||prior[0].company_id!==data.company_id||
     prior[0].engine_id!==data.engine_id||prior[0].environment!==data.environment||prior[0].version!==data.version)
     return answer(409,{status:'CONFLICT_OR_DRIFT',token_exposed:false});
   return answer(200,{status:added.length===1?'QUEUED_VERIFIED':'IDEMPOTENT_EXISTING',job_id:prior[0].id,request_id:prior[0].request_id,state:prior[0].state,attempts:prior[0].attempts,token_exposed:false});
  }catch(e){
   const m=e instanceof Error?e.message:'';
   return answer(503,{status:'BACKEND_UNAVAILABLE',code:/^D1_HTTP_(400|401|403|404|429|500|502|503|504)$/.test(m)?m:'SAFE_BACKEND_ERROR',token_exposed:false});
  }
 }
 if(route==='execute'){
  try{assertCommand(data);}catch{return answer(403,{status:'ORDER_DENIED'});}
  try{
   const result=await executeQueuedVercelCommand(data);
   const status=result.status==='COMPLETED'?200:result.status==='RECONCILE'?503:409;
   return answer(status,result);
  }catch{return answer(503,{status:'EXECUTION_UNAVAILABLE',credentials_exposed:false});}
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||
 JSON.stringify(Object.keys(data).sort())!==JSON.stringify(Object.keys({...SCOPE,request_id:''}).sort())||
 Object.entries(SCOPE).some(([k,v])=>data[k]!==v)||!/^[A-Z0-9-]{10,80}$/.test(data.request_id||''))return answer(403,{status:'STATUS_SCOPE_DENIED'});
 try{
  const rows=await queryD1(STATUS,[data.request_id]);
  return rows.length===1?answer(200,{status:'FOUND',job:rows[0]}):answer(404,{status:'NOT_FOUND'});
 }catch{return answer(503,{status:'BACKEND_UNAVAILABLE'});}
});
