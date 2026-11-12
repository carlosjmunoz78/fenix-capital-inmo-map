// FACT-001 P5 READ ONLY: registered automation ticket atomically claimed in LAB D1.
// Service credentials stay inside Supabase Vault; ticket is one-time 256-bit random.
// No App/CRM, Auth/DB/Storage, DNS, arbitrary provider mutations, keys in response or PROD.
import postgres from 'npm:postgres@3.4.7';
const PROJECT='cluhljgonannaafpmblx';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const D1='1305f791-7c44-47f9-946b-f330a09c88aa';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/d1/database/'+D1+'/query';
const NAMES={d1:'cerebro_cf_gateway_recovery_d1_write_lab_20261111',cloudflare:'cerebro_fact001_cf_readonly_lab_20261109',vercel:'cerebro_vercel_service_token_v1',supabase:'cerebro_supabase_management_pat_v1',notion:'cerebro_notion_service_token_v1'};
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const EXPECTED={...SCOPE,source:'registered_automation',operation:'providers.five.inventory.read',provider_set:'cloudflare,vercel,supabase,notion,github',max_cost_eur:0};
const HEX=/^[a-f0-9]{64}$/;
const REQUEST=/^(?:FACT001-P5-[0-9]{8}|FACT001-P5-20261112-A1)$/;
const stop=code=>{throw Error(code)};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function sha(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('');}
function assertOrder(body){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!==[...Object.keys(EXPECTED),'request_id'].sort().join(',')||Object.entries(EXPECTED).some(([k,v])=>body[k]!==v)||!REQUEST.test(body.request_id))stop('P5_SCOPE_DENIED');return body;}
async function withVault(callback){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)stop('P5_VAULT_UNAVAILABLE');
 const db=postgres(url,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let tokens={};
 try{
  const names=Object.values(NAMES);
  const rs=await db.unsafe('SELECT name,decrypted_secret FROM vault.decrypted_secrets WHERE name=ANY($1) LIMIT 10',[names]);
  if(rs.length!==5)stop('P5_VAULT_INCOMPLETE');
  for(const [key,name] of Object.entries(NAMES)){
   const items=rs.filter(x=>x.name===name);
   if(items.length!==1||typeof items[0].decrypted_secret!=='string'||items[0].decrypted_secret.length<24||/\s/.test(items[0].decrypted_secret))stop('P5_VAULT_SECRET_MISSING');
   tokens[key]=items[0].decrypted_secret;
  }
  return await callback(tokens);
 }finally{tokens={};await db.end({timeout:2}).catch(()=>{});}
}
async function d1(sql,params,tokens){
 const res=await fetch(API,{method:'POST',headers:{Authorization:'Bearer '+tokens.d1,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sql,params}),redirect:'error',signal:AbortSignal.timeout(14000)});
 if(res.status!==200)stop('P5_D1_HTTP_'+res.status);
 let out;try{out=await res.json()}catch{stop('P5_D1_INVALID_JSON');}
 if(out?.success!==true||out?.result?.[0]?.success!==true||!Array.isArray(out.result[0].results))stop('P5_D1_QUERY_FAILED');
 return out.result[0].results;
}
async function vendor(url,secret,{method='GET',body=null,extra={}}={}){
 const resp=await fetch(url,{method,headers:{Authorization:'Bearer '+secret,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(17000)});
 if(resp.status!==200)stop('P5_VENDOR_HTTP_'+resp.status);
 let json;try{json=await resp.json()}catch{stop('P5_VENDOR_JSON_DENIED');}
 return json;
}
async function readAll(t){
 const cf=await vendor('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/d1/database?per_page=10',t.cloudflare);
 if(cf?.success!==true||!Array.isArray(cf.result))stop('P5_CF_SHAPE');
 const ve=await vendor('https://api.vercel.com/v10/projects?teamId=team_qnh6u1Ofy2WPp0MGEKlyMA50&limit=40',t.vercel);
 if(!Array.isArray(ve?.projects))stop('P5_VERCEL_SHAPE');
 const su=await vendor('https://api.supabase.com/v1/projects/'+PROJECT+'/functions',t.supabase);
 if(!Array.isArray(su))stop('P5_SUPABASE_SHAPE');
 const no=await vendor('https://api.notion.com/v1/search',t.notion,{method:'POST',body:{page_size:1},extra:{'Notion-Version':'2026-03-11'}});
 if(!Array.isArray(no?.results)||typeof no.has_more!=='boolean')stop('P5_NOTION_SHAPE');
 const gh=await fetch('https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/contents/cerebro/connectors/universal/src/headless.mjs?ref=cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109',{method:'GET',headers:{Accept:'application/vnd.github+json','User-Agent':'CEREBRO-FACT001-P5-LAB'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(gh.status!==200)stop('P5_GITHUB_HTTP_'+gh.status);
 const obj=await gh.json();if(obj?.type!=='file'||obj?.name!=='headless.mjs'||typeof obj?.sha!=='string')stop('P5_GITHUB_SHAPE');
 return {cloudflare:cf.result.length,vercel:ve.projects.length,supabase:su.length,notion:no.results.length,github:1};
}
Deno.serve(async req=>{
 if(req.method!=='POST'||new URL(req.url).pathname!=='/cerebro-fact001-p5-dispatch-lab/dispatch')return reply(404,{status:'NOT_FOUND'});
 let order,ticket;
 try{
  const authorization=req.headers.get('authorization')||'';
  ticket=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!HEX.test(ticket))return reply(401,{status:'UNAUTHORIZED'});
  const raw=await req.text();if(raw.length>900)return reply(403,{status:'ORDER_DENIED'});
  order=assertOrder(JSON.parse(raw));
 }catch{return reply(403,{status:'ORDER_DENIED'});}
 return await withVault(async tokens=>{
  let claimed=false;
  try{
   const now=Date.now(),digest=await sha(ticket);
   const claim=await d1("UPDATE fact001_p5_jobs_v1 SET state='RUNNING',attempts=1,claimed_at_ms=?3 WHERE request_id=?1 AND ticket_sha256=?2 AND state='QUEUED' AND attempts=0 AND expires_at_ms>?3 AND automation_id='FACT001_P5_DAILY_READ_V1' AND (request_id!='FACT001-P5-20261112-A1' OR day_key='ACCEPT01') AND EXISTS(SELECT 1 FROM fact001_p5_automation_registry_v1 WHERE automation_id='FACT001_P5_DAILY_READ_V1' AND enabled=1) RETURNING request_id,state,attempts",[order.request_id,digest,now],tokens);
   if(claim.length!==1||claim[0].request_id!==order.request_id||claim[0].state!=='RUNNING'||claim[0].attempts!==1)return reply(409,{status:'DENIED_OR_ALREADY_CLAIMED'});
   claimed=true;
   const report=await readAll(tokens);
   const result=await d1("UPDATE fact001_p5_jobs_v1 SET state='COMPLETED',result_json=?2,completed_at_ms=?3 WHERE request_id=?1 AND state='RUNNING' AND attempts=1 RETURNING request_id,state",[order.request_id,JSON.stringify(report),Date.now()],tokens);
   if(result.length!==1||result[0].state!=='COMPLETED')stop('P5_FINAL_ACK_DENIED');
   return reply(200,{status:'COMPLETED',request_id:order.request_id,provider_count:5,provider_writes:0,credentials_exposed:false});
  }catch(error){
   const message=error instanceof Error?error.message:'';
   const code=/^P5_[A-Z0-9_]+$/.test(message)?message:'P5_UNVERIFIED';
   if(claimed)try{await d1("UPDATE fact001_p5_jobs_v1 SET state='RECONCILE',error_code=?2,completed_at_ms=?3 WHERE request_id=?1 AND state='RUNNING' AND attempts=1 RETURNING request_id",[order.request_id,code,Date.now()],tokens);}catch{}
   console.warn('FACT001_P5='+code);
   return reply(503,{status:'RECONCILE',code,provider_writes:0,retry_automatic:false});
  }finally{ticket='';}
 }).catch(()=>reply(503,{status:'BLOCKED',code:'P5_VAULT_UNAVAILABLE',retry_automatic:false}));
});
