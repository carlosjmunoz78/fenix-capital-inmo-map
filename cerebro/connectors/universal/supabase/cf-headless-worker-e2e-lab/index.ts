// Independent signed CEREBRO Cloudflare LAB Worker one-shot, fail closed.
// Never accepts caller-chosen Cloudflare path, code, token, Worker or SQL.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,SCOPE,verifyGitHubOidc,assertOrder,TARGET,ISSUER,ISSUER_ID,
 CHILD_NAME,CLAIM,DONE,TOKEN_VAULT,TOKEN_ID_VAULT,exactGroup,assertChild} from './policy.mjs';
const API='https://api.cloudflare.com/client/v4';
const HS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(n,data)=>new Response(JSON.stringify(data),{status:n,headers:HS});
const bearer=req=>{const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):'';};
const account='/accounts/'+ACCOUNT_ID,worker=account+'/workers/scripts/'+TARGET;
async function cf(token,method,path,body){
 const headers={Authorization:'Bearer '+token,Accept:'application/json'};
 if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const res=await fetch(API+path,{method,headers,
  ...(body!==undefined?{body:body instanceof FormData?body:JSON.stringify(body)}:{}),
  redirect:'error',signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw Error('CF_'+method+'_HTTP_'+res.status);
 if(method==='DELETE')return {success:true};
 const result=await res.json();
 if(result?.success!==true)throw Error('CF_'+method+'_UNTRUSTED');
 return result;
}
function form(tag){
 const source="export default {async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store','X-FACT001-LAB':'"+tag+"'}})}};";
 const f=new FormData();
 f.append('metadata',new Blob([JSON.stringify({main_module:'worker.mjs',compatibility_date:'2026-11-11',bindings:[]})],{type:'application/json'}));
 f.append('worker.mjs',new Blob([source],{type:'application/javascript+module'}),'worker.mjs');
 return f;
}
async function version(token){const q=await cf(token,'GET',worker+'/versions');return (q.result?.items||q.result||[])[0]?.id;}
async function secure(token,versionId){
 const [sub,cron,settings,ds]=await Promise.all([
  cf(token,'GET',worker+'/subdomain'),cf(token,'GET',worker+'/schedules'),
  cf(token,'GET',worker+'/settings'),cf(token,'GET',worker+'/deployments')]);
 const d=(ds.result?.deployments||ds.result||[])[0];
 if(sub.result?.enabled!==false||sub.result?.previews_enabled!==false||
  cron.result?.schedules?.length!==0||settings.result?.bindings?.length!==0||
  d?.versions?.length!==1||d.versions[0].version_id!==versionId||d.versions[0].percentage!==100)
  throw Error('WORKER_SECURITY_GATE_FAILED');
}
async function absent(token){
 const list=(await cf(token,'GET',account+'/workers/scripts')).result;
 if(!Array.isArray(list)||list.some(x=>x.id===TARGET))throw Error('TARGET_RESIDUAL');
}
async function run(){
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)throw Error('VAULT_DATABASE_UNAVAILABLE');
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 const query=(statement,params=[])=>sql.unsafe(statement,params);
 let parent='',child='',childId='',made=false,revoked=false,err='',outcome=null,finished=false;
 try{
  const pre=await query('select name from vault.secrets where name in ($1,$2,$3,$4)',[CLAIM,DONE,TOKEN_VAULT,TOKEN_ID_VAULT]);
  if(pre.some(x=>x.name===DONE))return {status:'ALREADY_COMPLETED',scope:SCOPE,provider_writes:0};
  if(pre.length)throw Error('CLAIM_OR_CREDENTIAL_NEEDS_RECONCILIATION');
  const a=await query('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[ISSUER]);
  if(a.length!==1||typeof a[0].decrypted_secret!=='string')throw Error('ISSUER_V2_MISSING');
  parent=a[0].decrypted_secret;
  const [tokens,groups]=await Promise.all([
   cf(parent,'GET',account+'/tokens'),cf(parent,'GET',account+'/tokens/permission_groups')]);
  const issuer=(tokens.result||[]).filter(t=>t.id===ISSUER_ID&&t.name===ISSUER);
  if(issuer.length!==1||issuer[0].status!=='active'||issuer[0].policies?.length!==1||
   issuer[0].policies[0].permission_groups?.length!==1||
   issuer[0].policies[0].permission_groups[0].id!=='5bc3f8b21c554832afc660159ab75fa4')
   throw Error('PARENT_SCOPE_NOT_MINIMAL');
  if(tokens.result.some(t=>t.name===CHILD_NAME))throw Error('CHILD_PREEXISTING');
  const group=exactGroup(groups.result,'Workers Scripts Write');
  await query('select vault.create_secret($1,$2,$3)',[
   'CLAIMED',CLAIM,'FACT001 one-shot signed owner-run: persistent replay guard']);
  const created=await cf(parent,'POST',account+'/tokens',{
   name:CHILD_NAME,expires_on:new Date(Date.now()+12*60000).toISOString(),
   policies:[{effect:'allow',resources:{['com.cloudflare.api.account.'+ACCOUNT_ID]:'*'},permission_groups:[{id:group}]}]});
  child=created.result?.value||'';childId=created.result?.id||'';
  if(!/^[a-f0-9]{32}$/.test(childId)||typeof child!=='string'||child.length<24)throw Error('CHILD_INVALID_RESPONSE');
  const detail=await cf(parent,'GET',account+'/tokens/'+childId);
  assertChild(detail.result,childId,group);
  await query('select vault.create_secret($1,$2,$3)',[
   child,TOKEN_VAULT,'FACT001 Worker Scripts Write transient LAB child, must revoke']);
  await query('select vault.create_secret($1,$2,$3)',[
   childId,TOKEN_ID_VAULT,'FACT001 child ID retained for revoke if interrupted']);
  await absent(child);
  await cf(child,'PUT',worker,form('V1'));made=true;
  await cf(child,'POST',worker+'/subdomain',{enabled:false,previews_enabled:false});
  await cf(child,'PUT',worker+'/schedules',[]);
  const v1=await version(child);
  if(!v1)throw Error('V1_ABSENT');
  await secure(child,v1);
  await cf(child,'PUT',worker,form('V2'));
  const v2=await version(child);
  if(!v2||v1===v2)throw Error('V2_ABSENT');
  await secure(child,v2);
  await cf(child,'POST',worker+'/deployments',{
    strategy:'percentage',versions:[{version_id:v1,percentage:100}],
    annotations:{'workers/message':'FACT001 isolated physical V1 restore'}});
  await secure(child,v1);
  await cf(child,'DELETE',worker);made=false;await absent(child);
  await cf(child,'PUT',worker,form('V1'));made=true;
  await cf(child,'POST',worker+'/subdomain',{enabled:false,previews_enabled:false});
  await cf(child,'PUT',worker+'/schedules',[]);
  const rebuild=await version(child);
  if(!rebuild||rebuild===v1)throw Error('REBUILD_FAILED');
  await secure(child,rebuild);
  await cf(child,'DELETE',worker);made=false;await absent(child);
  outcome={status:'HEADLESS_CEREBRO_WORKER_LIFECYCLE_VERIFIED',scope:SCOPE,
   worker_name:TARGET,created:true,updated:true,rolled_back:true,deleted:true,
   rebuilt:true,v1_id:v1,v2_id:v2,rebuild_id:rebuild,public_routes:0,crons:0,
   bindings:0,extra_cost_eur:0,credential_exposed:false};
 }catch(e){err=e instanceof Error?e.message:'UNKNOWN';}
 finally{
  if(made&&child){
   try{await cf(child,'DELETE',worker);await absent(child);made=false;}
   catch{err='WORKER_RESIDUAL_RECONCILE_REQUIRED';}
  }
  if(childId&&parent){
   try{await cf(parent,'DELETE',account+'/tokens/'+childId);
    const a=await cf(parent,'GET',account+'/tokens');
    revoked=Array.isArray(a.result)&&!a.result.some(t=>t.id===childId);
    if(!revoked)err='CHILD_REVOKE_NOT_VERIFIED';
   }catch{err='CHILD_REVOKE_FAILED';}
  }else revoked=true;
  if(revoked){
   try{await query('delete from vault.secrets where name in ($1,$2)',[TOKEN_VAULT,TOKEN_ID_VAULT]);}
   catch{err='VAULT_CLEANUP_FAILED';}
  }
  if(outcome&&revoked&&!made&&!err){
   try{await query('select vault.create_secret($1,$2,$3)',[
     'VERIFIED',DONE,'FACT001 headless E2E finished and credentials revoked']);finished=true;}
   catch{err='DONE_MARKER_MISSING';}
  }
  parent='';child='';childId='';
  await sql.end({timeout:2}).catch(()=>{});
 }
 if(outcome&&finished&&!err)return {...outcome,child_revoked:true,durable_replay_guard:true};
 return {status:'BLOCKED_RECONCILE',code:/^[A-Z0-9_]{3,90}$/.test(err)?err:'LAB_EXECUTION_FAILED',
  child_revoked:revoked,worker_cleanup:!made,credential_exposed:false};
}
Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','execute-once'].includes(route))return reply(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(route==='health'&&req.method==='GET')return reply(200,{status:'SIGNED_LAB_READY',scope:SCOPE,worker:TARGET});
 if(route==='execute-once'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>1800)return reply(413,{status:'TOO_LARGE'});
  try{assertOrder(await req.json());}catch{return reply(403,{status:'ORDER_DENIED'});}
  const data=await run();
  return reply(['HEADLESS_CEREBRO_WORKER_LIFECYCLE_VERIFIED','ALREADY_COMPLETED'].includes(data.status)?200:503,data);
 }
 return reply(405,{status:'METHOD_DENIED'});
});
