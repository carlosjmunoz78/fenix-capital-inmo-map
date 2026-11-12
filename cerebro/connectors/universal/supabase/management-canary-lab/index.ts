// FACT-001 · CEREBRO-owned Supabase management LAB canary lifecycle.
// Only a single synthetic function is allowed: NO SQL, no App, CRM, Auth, Storage, DNS,
// other functions, projects, arbitrary URLs, tokens, or uncontrolled provider commands.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc,SCOPE} from './policy.mjs';
export const PROJECT='cluhljgonannaafpmblx';
export const CANARY='cerebro-fact001-sb-mgmt-canary-lab';
const VAULT_NAME='cerebro_supabase_management_pat_v1';
const REST='https://api.supabase.com/v1/projects/'+PROJECT+'/functions';
const ROUTE='/cerebro-fact001-sb-mgmt-owner-lab/once';
const HEADERS={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const response=(status,x)=>new Response(JSON.stringify(x),{status,headers:HEADERS});
const HEX=/^[a-f0-9]{64}$/;
const BASE={...SCOPE,client_id:'cerebro',source:'owner_order',target_project:PROJECT,target_function:CANARY,max_cost_eur:0,request_id:'FACT001-SBMGT-CANARY-20261112'};
const STEPS=['preflight','create','update','restore','delete','verify_absent'];
// Canary is inert, only returns 404 for all requests, with JWT verification ON.
export const V1="// FACT001 synthetic isolated v1: always 404; no network, DB, auth or data.\nDeno.serve(() => new Response(null,{status:404,headers:{'cache-control':'no-store','x-fact001-canary':'v1'}}));\n";
export const V2="// FACT001 synthetic isolated v2: always 404; no network, DB, auth or data.\nDeno.serve(() => new Response(null,{status:404,headers:{'cache-control':'no-store','x-fact001-canary':'v2'}}));\n";
const deny=code=>{throw Error(code)};
function assertCommand(x){
 if(!x||typeof x!=='object'||Array.isArray(x))deny('SBMGT_ORDER_DENIED');
 const keys=[...Object.keys(BASE),'step','expected_sha256','expected_version'];
 if(JSON.stringify(Object.keys(x).sort())!==JSON.stringify(keys.sort())||Object.entries(BASE).some(([k,v])=>x[k]!==v)||!STEPS.includes(x.step))deny('SBMGT_ORDER_DENIED');
 const expectAbsent=['preflight','create','verify_absent'].includes(x.step);
 if(expectAbsent?(x.expected_sha256!==null||x.expected_version!==null):(!HEX.test(x.expected_sha256)||!Number.isSafeInteger(x.expected_version)||x.expected_version<1))deny('SBMGT_EXPECTATION_DENIED');
 return x;
}
async function withPAT(callback){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)deny('VAULT_CONNECTION_NOT_READY');
 const db=postgres(url,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let pat='';
 try{
  const rs=await db.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[VAULT_NAME]);
  if(rs.length!==1||typeof rs[0].decrypted_secret!=='string'||rs[0].decrypted_secret.length<24)deny('VAULT_TOKEN_NOT_READY');
  pat=rs[0].decrypted_secret;
  return await callback(pat);
 }finally{pat='';await db.end({timeout:2}).catch(()=>{})}
}
function cleanMetadata(x){
 if(!x||x.slug!==CANARY||x.status!=='ACTIVE'||!Number.isSafeInteger(x.version)||x.version<1||!HEX.test(x.ezbr_sha256)||x.verify_jwt!==true)deny('SBMGT_PROVIDER_IDENTITY_DENIED');
 return {exists:true,sha256:x.ezbr_sha256,version:x.version,jwt_on:true};
}
async function providerRequest(method,url,pat,body){
 const h={Authorization:'Bearer '+pat,Accept:'application/json'};
 let r;
 try{r=await fetch(url,{method,headers:h,...(body?{body}:{}),redirect:'error',signal:AbortSignal.timeout(method==='POST'?90000:18000)})}
 catch{deny('SBMGT_NETWORK_UNVERIFIED')}
 if(r.status===401||r.status===403)deny('SBMGT_PROVIDER_AUTH_'+r.status);
 if(r.status===429)deny('SBMGT_RATE_LIMIT');
 return r;
}
async function read(pat){
 const r=await providerRequest('GET',REST+'/'+CANARY,pat);
 if(r.status===404)return {exists:false};
 if(r.status!==200)deny('SBMGT_READ_HTTP_'+r.status);
 let x;try{x=await r.json()}catch{deny('SBMGT_READ_JSON_DENIED')}
 return cleanMetadata(x);
}
async function deploy(pat,body){
 const multi=new FormData();
 multi.append('metadata',JSON.stringify({name:CANARY,entrypoint_path:'index.ts',verify_jwt:true}));
 multi.append('file',new Blob([body],{type:'application/typescript'}),'index.ts');
 const r=await providerRequest('POST',REST+'/deploy?slug='+CANARY,pat,multi);
 if(r.status!==200&&r.status!==201)deny('SBMGT_DEPLOY_HTTP_'+r.status);
 let x;try{x=await r.json()}catch{deny('SBMGT_DEPLOY_JSON_DENIED')}
 cleanMetadata(x);
 return read(pat);
}
async function perform(x,pat){
 const before=await read(pat);
 if(x.step==='preflight'||x.step==='verify_absent'){
  if(before.exists)deny('SBMGT_CANARY_NOT_ABSENT');
  return {step:x.step,status:'ABSENT_VERIFIED',exists:false};
 }
 if(x.step==='create'){
  if(before.exists)deny('SBMGT_CREATE_ALREADY_EXISTS');
  const after=await deploy(pat,V1);
  if(!after.exists)deny('SBMGT_CREATE_READBACK_DENIED');
  return {step:x.step,status:'CREATE_VERIFIED',sha256:after.sha256,version:after.version};
 }
 if(!before.exists||before.sha256!==x.expected_sha256||before.version!==x.expected_version)deny('SBMGT_CONCURRENT_OR_FOREIGN_RESOURCE');
 if(x.step==='delete'){
  const r=await providerRequest('DELETE',REST+'/'+CANARY,pat);
  if(r.status!==200&&r.status!==204)deny('SBMGT_DELETE_HTTP_'+r.status);
  const after=await read(pat);if(after.exists)deny('SBMGT_DELETE_READBACK_DENIED');
  return {step:x.step,status:'DELETE_VERIFIED',exists:false};
 }
 const after=await deploy(pat,x.step==='update'?V2:V1);
 if(!after.exists||after.version<=before.version||after.sha256===before.sha256)deny('SBMGT_UPDATE_READBACK_DENIED');
 return {step:x.step,status:x.step==='update'?'UPDATE_VERIFIED':'RESTORE_SOURCE_DEPLOYED',before_sha256:before.sha256,sha256:after.sha256,version:after.version};
}
Deno.serve(async req=>{
 const path=new URL(req.url).pathname;
 if(path!==ROUTE||req.method!=='POST')return response(404,{status:'NOT_FOUND'});
 const header=req.headers.get('authorization')||'';
 try{if(!header.startsWith('Bearer '))deny('AUTH_DENIED');await verifyGitHubOidc(header.slice(7));}
 catch{return response(401,{status:'UNAUTHORIZED'});}
 let data;
 try{const raw=await req.text();if(raw.length>1300)deny('LARGE');data=assertCommand(JSON.parse(raw));}
 catch{return response(403,{status:'SIGNED_ORDER_SCOPE_DENIED'});}
 try{
  const result=await withPAT(pat=>perform(data,pat));
  return response(200,{status:'COMPLETED',scope:SCOPE,target:CANARY,credentials_exposed:false,customer_changes:0,additional_cost_eur:0,...result});
 }catch(e){
  const msg=e instanceof Error?e.message:'';
  const safe=/^(SBMGT_(?:[A-Z0-9_]+)|VAULT_(?:[A-Z0-9_]+))$/.test(msg)?msg:'SBMGT_UNVERIFIED';
  console.warn('FACT001_SBMGMT_LAB='+safe);
  return response(503,{status:'RECONCILE',code:safe,credentials_exposed:false,customer_changes:0,retry_automatic:false});
 }
});
