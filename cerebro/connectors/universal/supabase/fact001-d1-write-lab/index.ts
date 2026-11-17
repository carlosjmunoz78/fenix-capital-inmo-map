// New isolated CEREBRO FACT-001 Edge Function. No App/CRM changes, no generic API proxy.
// Authentication: strictly verified short-lived GitHub OIDC signed assertion, exact repo+branch+workflow.
// Only exact LAB EU D1 create, fixed SQL, read, delete and rollback. Temporary signed OIDC and existing encrypted Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,VAULT_NAME,SCOPE,verifyGitHubOidc,D1_OPERATION,D1_BASELINE,assertD1Order,d1NameFor,assertD1Snapshot} from './logic.mjs';
const SERVICE='cerebro-fact001-cloudflare-d1-write-lab';
const NAME='cerebro-fact001-cloudflare-d1-write-lab';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:HEADERS});}
function credential(req:Request){const value=req.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7):'';}
function safeBody(req:Request){const len=Number(req.headers.get('content-length')||0);if(len>3000)throw Error('REQUEST_TOO_LARGE');return req.json();}
async function withDb<T>(fn:(sql:any)=>Promise<T>):Promise<T>{
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_CONNECTION_MISSING');
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 try{return await fn(sql);}finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function getToken():Promise<string>{
 return await withDb(async sql=>{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string')throw Error('VAULT_SECRET_ABSENT');
  return rows[0].decrypted_secret;
 });
}


const CF_BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT_ID+'/d1/database';
async function cf(path:string,method:'GET'|'POST'|'DELETE',token:string,input?:unknown):Promise<any>{
 const list=path===CF_BASE+'?per_page=100&page=1'&&method==='GET';
 const create=path===CF_BASE&&method==='POST';
 const detail=/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[a-f0-9]{32}\/d1\/database\/[a-f0-9-]{36}$/.test(path)&&['GET','DELETE'].includes(method);
 const sql=/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[a-f0-9]{32}\/d1\/database\/[a-f0-9-]{36}\/query$/.test(path)&&method==='POST';
 if(!list&&!create&&!detail&&!sql||!path.startsWith(CF_BASE))throw Error('CF_PATH_DENIED');
 const response=await fetch(path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('CLOUDFLARE_HTTP_'+response.status);
 const result=await response.json();if(result?.success!==true)throw Error('CLOUDFLARE_REPLY_INVALID');
 return result;
}
async function perform(id:string){
 const name=d1NameFor(id),token=await getToken(),list=CF_BASE+'?per_page=100&page=1';
 const prior=await cf(list,'GET',token);assertD1Snapshot(prior,name);
 const baseline=new Set(D1_BASELINE);
 let newId:string|null=null,created=false,table=false,inserted=false,read_verified=false,deleted=false,restored=false;
 try{
  const make=await cf(CF_BASE,'POST',token,{name,jurisdiction:'eu'});
  if(make?.result?.name!==name||make?.result?.jurisdiction!=='eu'||typeof make.result.uuid!=='string'||baseline.has(make.result.uuid))throw Error('D1_CREATE_MISMATCH');
  newId=make.result.uuid;created=true;
  const path=CF_BASE+'/'+newId;
  const info=await cf(path,'GET',token);
  if(info.result?.uuid!==newId||info.result?.name!==name||info.result?.jurisdiction!=='eu')throw Error('D1_NEW_OWNER_MISMATCH');
  const query=async(sql:string)=>cf(path+'/query','POST',token,{sql});
  await query('CREATE TABLE fact001_e2e(id INTEGER PRIMARY KEY, marker TEXT NOT NULL)');table=true;
  await query("INSERT INTO fact001_e2e(id,marker) VALUES(1,'CEREBRO_FACT001_D1_OK')");inserted=true;
  const got=await query('SELECT marker FROM fact001_e2e WHERE id=1');
  const rows=Array.isArray(got.result)?got.result.flatMap((x:any)=>x?.results||[]):got.result?.results||[];
  read_verified=rows.some((x:any)=>x.marker==='CEREBRO_FACT001_D1_OK');
  if(!read_verified)throw Error('D1_SQL_READ_MISMATCH');
 }finally{
  const existing=await cf(list,'GET',token).catch(()=>null);
  const matches=(existing?.result||[]).filter((x:any)=>x.name===name&&!baseline.has(x.uuid));
  if(matches.length===1&&(!newId||matches[0].uuid===newId)){
   const victim=matches[0].uuid;
   try{
    const check=await cf(CF_BASE+'/'+victim,'GET',token);
    if(check.result?.name===name&&check.result?.uuid===victim&&check.result?.jurisdiction==='eu'){
      await cf(CF_BASE+'/'+victim,'DELETE',token);deleted=true;
    }
   }catch{}
  }
  const after=await cf(list,'GET',token).catch(()=>null);
  restored=after?.result?.length===8&&D1_BASELINE.every(x=>after.result.some((r:any)=>r.uuid===x))&&!after.result.some((x:any)=>x.name===name);
 }
 if(!created||!table||!inserted||!read_verified||!deleted||!restored)throw Error('D1_E2E_ROLLBACK_UNVERIFIED');
 return {status:'COMPLETED',...SCOPE,request_id:id,created,table_created:table,inserted,read_verified,deleted,all_original_databases_intact:restored,existing_resources_modified:0,production_mutations:0,secret_exposed:false};
}
Deno.serve(async(req:Request)=>{
 const action=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
 if(!['health','test'].includes(action||''))return reply(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(credential(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(action==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',...SCOPE,operation:D1_OPERATION});
 if(action==='test'&&req.method==='POST'){
  const raw=await req.text();if(raw.length>2048)return reply(400,{status:'BAD_REQUEST'});
  let order;try{order=assertD1Order(JSON.parse(raw));}catch{return reply(400,{status:'CONTRACT_REJECTED'});}
  try{return reply(200,await perform(order));}catch{return reply(503,{status:'BLOCKED',reason:'D1_E2E_NOT_CONFIRMED'});}
 }
 return reply(405,{status:'METHOD_NOT_ALLOWED'});
});
