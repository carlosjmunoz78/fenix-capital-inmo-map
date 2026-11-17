// FACT-001 independent CEREBRO Vercel LAB: read 3 projects, reversible LAB-only framework change.
// Trust boundary: signed GitHub OIDC from exact repo/branch/workflow, NOT ChatGPT session.
// No arbitrary paths, billing, credential export, user-auth or App/CRM writes. No production project mutation.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc,assertOrder,assertWriteOrder,assertCleanupOrder,TEAM_ID,VAULT_NAME,LAB_PROJECT_ID,LAB_PROJECT_NAME,SCOPE} from './policy.mjs';
import {updateAndRollbackLab} from './lab-write.mjs';
import {deleteSoleVercelTestProject} from './cleanup-once.mjs';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const bearer=(req:Request)=>{
 const s=req.headers.get('authorization')||'';
 return s.startsWith('Bearer ')?s.slice(7):'';
};
async function verifyVaultAndReadVercel(){
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)throw Error('DB_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 let token='';
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<20)throw Error('VAULT_SECRET_INVALID');
  token=rows[0].decrypted_secret;
 } finally {await sql.end({timeout:2}).catch(()=>{});}
 // Use bearer ONLY as an in-memory header on the fixed Vercel API hostname.
 const url='https://api.vercel.com/v10/projects?teamId='+encodeURIComponent(TEAM_ID)+'&limit=40';
 let response;
 try{response=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});}
 finally{token='';}
 if(response.status===401||response.status===403)throw Error('VERCEL_PERMISSION_'+response.status);
 if(!response.ok)throw Error('VERCEL_REQUEST_'+response.status);
 let data;
 try{data=await response.json()}catch{throw Error('VERCEL_RESPONSE_INVALID');}
 if(!Array.isArray(data?.projects))throw Error('VERCEL_RESULT_INVALID');
 const known=[
  ['fenix-capital-preprod','prj_4ElVl8e2KzrHS7r5yvBGBban1DXV'],
  ['fenix-capital-preprod-app','prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc'],
  [LAB_PROJECT_NAME,LAB_PROJECT_ID]
 ];
 const statuses=known.map(([name,id])=>({project:name,authorized:data.projects.some((p:any)=>p?.id===id&&p?.name===name)}));
 return {status:statuses.every(x=>x.authorized)?'VERCEL_SERVICE_READ_VERIFIED':'VERCEL_SERVICE_READ_PARTIAL',scope:SCOPE,team_verified:true,lab_project_verified:statuses.at(-1)?.authorized===true,authorized_projects:statuses.filter(x=>x.authorized).length,expected_projects:known.length,project_permissions:statuses,credential_exposed:false,api_method:'GET',vercel_writes:0};
}
async function reversibleLabWrite(){
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)throw Error('DB_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 let token='';
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<20)throw Error('VAULT_SECRET_INVALID');
  token=rows[0].decrypted_secret;
 }finally{await sql.end({timeout:2}).catch(()=>{});}
 try{return await updateAndRollbackLab({token});}
 finally{token='';}
}
async function cleanupTestVercelProject(){
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)throw Error('DB_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 let token='';
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<20)throw Error('VAULT_SECRET_INVALID');
  token=rows[0].decrypted_secret;
 }finally{await sql.end({timeout:2}).catch(()=>{});}
 try{return await deleteSoleVercelTestProject({token});}
 finally{token='';}
}
Deno.serve(async req=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
  if(!['health','verify-projects','verify-reversible-update','cleanup-vercel-lab'].includes(route))return reply(404,{status:'NOT_FOUND'});
  try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',client_id:'cerebro',scope:SCOPE,vercel_writes:0});
  if(route==='verify-projects'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>2000)return reply(413,{status:'TOO_LARGE'});
   let order;
   try{order=await req.json();assertOrder(order)}catch{return reply(400,{status:'ORDER_DENIED'});}
   const check=await verifyVaultAndReadVercel();
   return reply(check.status==='VERCEL_SERVICE_READ_VERIFIED'?200:409,check);
  }
  if(route==='verify-reversible-update'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>2000)return reply(413,{status:'TOO_LARGE'});
   try{assertWriteOrder(await req.json());}catch{return reply(400,{status:'ORDER_DENIED'});}
   const verified=await reversibleLabWrite();
   return reply(verified.rollback_verified?200:409,verified);
  }
  if(route==='cleanup-vercel-lab'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>2000)return reply(413,{status:'TOO_LARGE'});
   try{assertCleanupOrder(await req.json());}catch{return reply(400,{status:'ORDER_DENIED'});}
   const result=await cleanupTestVercelProject();
   return reply(result.status==='VERCEL_TEST_PROJECT_DELETED'||result.status==='ALREADY_ABSENT'?200:409,result);
  }
  return reply(405,{status:'METHOD_DENIED'});
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const code=/^VERCEL_PERMISSION_(401|403)$/.test(raw)||/^VERCEL_REQUEST_(400|404|429|500|502|503)$/.test(raw)||['VAULT_SECRET_INVALID','DB_UNAVAILABLE','VERCEL_RESULT_INVALID','VERCEL_RESPONSE_INVALID'].includes(raw)?raw:'BACKEND_FAILED';
  // Never log request headers, tokens, query parameters, secrets or Vercel raw response.
  console.warn('FACT001_VERCEL_LAB_PROBE='+code);
  return reply(503,{status:'BLOCKED',code,credential_exposed:false});
 }
});
