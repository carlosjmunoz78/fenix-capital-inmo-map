import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'';
const A=Deno.env.get('SUPABASE_ANON_KEY')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const PROD_REF='cluhljgonannaafpmblx';
const PREPROD_REF='hnqlnvakzaywtafeiybt';
const ENV=U.includes(PROD_REF)?'PROD':U.includes(PREPROD_REF)?'PREPROD':'UNKNOWN';
const COMPANY='fenix',ENGINE='CONSOLE-001',VERSION='v0';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const SAFE_BRANCH='cerebro/jarvis-work-codex-complete-20261102';
const WORK_GATEWAY=ENV==='PROD'?'jarvis-work-gateway-v1':'jarvis-work-gateway-v1-preprod';
const GIT_GATEWAY=ENV==='PROD'?'jarvis-git-gateway-v1':'jarvis-git-gateway-v1-preprod';
const BROWSER_GATEWAY=ENV==='PROD'?'cerebro-browser-work-total-owner-v1-prod':null;
const ORIGINS=new Set(['https://app.fenixcapital.es','https://www.app.fenixcapital.es']);
const HUMAN_REQUIRED_REASONS=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'] as const;
const INTENTS=new Set([
  'PROJECTS_LIST','REPO_HEAD','REPO_LIST','REPO_FILE','SEARCH_CODE','RUN_READONLY_CHECK',
  'WORK_STATUS','WORK_CANCEL','GIT_STATUS','GIT_DIFF','GIT_COMPARE','SAVE_FILE','ROLLBACK_COMMIT',
  'BROWSER_STATUS','BROWSER_PROFILES','BROWSER_HANDOFF'
]);
const MUTATING_INTENTS=new Set(['SAVE_FILE','ROLLBACK_COMMIT','WORK_CANCEL']);
const MAX_CONTENT_BYTES=2_000_000;

function headers(origin:string|null){const h:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'origin'};if(origin&&ORIGINS.has(origin))h['access-control-allow-origin']=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:headers(req.headers.get('origin'))});}
function clean(v:unknown,label:string,max=4000){if(typeof v!=='string'||!v.trim())throw new Error(`${label}_REQUIRED`);const s=v.trim();if(s.length>max||s.includes('\0'))throw new Error(`${label}_INVALID`);return s;}
function fileContent(v:unknown){if(typeof v!=='string'||v.length===0)throw new Error('CONTENT_REQUIRED');if(v.includes('\0')||new TextEncoder().encode(v).byteLength>MAX_CONTENT_BYTES)throw new Error('CONTENT_INVALID');return v;}
function safePath(v:unknown){const p=clean(v,'PATH',500).replace(/\\/g,'/').replace(/^\.\//,'');if(p.startsWith('/')||p.split('/').includes('..')||p.startsWith('.git/')||p==='.git')throw new Error('UNSAFE_REPOSITORY_PATH');return p;}
function sha(v:unknown,label='SHA'){const s=clean(v,label,64).toLowerCase();if(!/^[a-f0-9]{40}$/.test(s))throw new Error(`${label}_INVALID`);return s;}
function authHeader(req:Request){const h=req.headers.get('authorization')??'';if(!h.toLowerCase().startsWith('bearer '))throw new Error('OWNER_TOKEN_REQUIRED');return h;}
function actorClient(){if(!U||!A||!S)throw new Error('SERVER_CONFIG_MISSING');return{auth:createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}}),svc:createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}})};}
async function owner(req:Request){if(ENV==='UNKNOWN')return{ok:false,actor:'',reason:'ENVIRONMENT_UNKNOWN'};let h='';try{h=authHeader(req);}catch{return{ok:false,actor:'',reason:'OWNER_TOKEN_REQUIRED'};}const {auth,svc}=actorClient();const {data,error}=await auth.auth.getUser(h.slice(7));if(error||!data.user)return{ok:false,actor:'',reason:'OWNER_TOKEN_INVALID'};const {data:ctx,error:e}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});if(e||ctx?.ok!==true)return{ok:false,actor:'',reason:'OWNER_CONTEXT_DENIED'};const actor=String(ctx.actor_code||'');return{ok:actor==='CARLOS-ADMIN'||actor==='DIR-TEST',actor,reason:'OWNER_ONLY'};}
function enforceScope(intent:string,args:any){if(args?.company_id&&String(args.company_id)!==COMPANY)throw new Error('COMPANY_SCOPE_DENIED');if(args?.environment&&String(args.environment)!==ENV)throw new Error('ENVIRONMENT_SCOPE_DENIED');if(args?.repo&&String(args.repo)!==REPO)throw new Error('REPOSITORY_SCOPE_DENIED');for(const key of ['branch','target_branch']){if(args?.[key]&&String(args[key])!==SAFE_BRANCH)throw new Error('PROTECTED_BRANCH_DENIED');}if(intent==='GIT_COMPARE'&&args?.head&&String(args.head)!==SAFE_BRANCH)throw new Error('COMPARE_HEAD_DENIED');if(MUTATING_INTENTS.has(intent)&&args?.base)throw new Error('MUTATION_BASE_OVERRIDE_DENIED');if('money' in (args||{})||'amount' in (args||{})||'payment' in (args||{}))throw new Error('MONEY_OPERATION_DENIED');if('trading' in (args||{})||'order' in (args||{})||'ticker' in (args||{}))throw new Error('TRADING_SCOPE_DENIED');}
async function upstream(slug:string,path:string,method:'GET'|'POST',req:Request,body?:unknown,query?:URLSearchParams){const auth=authHeader(req);const url=new URL(`${U}/functions/v1/${slug}${path}`);if(query)for(const [k,v] of query)url.searchParams.set(k,v);const r=await fetch(url,{method,headers:{authorization:auth,apikey:A,'content-type':'application/json'},body:method==='POST'?JSON.stringify(body??{}):undefined,redirect:'error'});const text=await r.text();let parsed:any=null;try{parsed=text?JSON.parse(text):null;}catch{parsed={raw:text.slice(0,4000)}}return{ok:r.ok,status:r.status,body:parsed};}
function evidence(intent:string,delegated_to:string,correlation_id:string,upstream_status:number|null){return{correlation_id,intent,delegated_to,upstream_status,company_id:COMPANY,engine_id:ENGINE,environment:ENV,version:VERSION,repo:REPO,branch:SAFE_BRANCH,prod_branch_mutation:false,trading_access:false,additional_cost_eur:0};}

Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS'){
    if(!origin||!ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{...headers(origin),'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type','access-control-max-age':'600'}});
  }
  const last=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
  if(req.method==='GET'&&(last==='jarvis-orchestrator-v0'||last==='jarvis-orchestrator-v0-preprod'||last==='health')){
    return out(req,200,{ok:ENV!=='UNKNOWN',service:'jarvis-orchestrator-v0',environment:ENV,company_id:COMPANY,engine_id:ENGINE,version:VERSION,mode:'DETERMINISTIC',model_router:'PLANIFICADO',natural_language_planning:false,intents:[...INTENTS],safe_branch:SAFE_BRANCH,protected_branches:['main','emergency-pages'],browser_mutation:false,prod_branch_mutation:false,trading_access:false,additional_cost_eur:0,human_required_reasons:HUMAN_REQUIRED_REASONS});
  }
  if(req.method!=='POST'||last!=='execute')return out(req,404,{status:'CLOSED',reason:'ROUTE_NOT_AVAILABLE'});
  const authz=await owner(req);if(!authz.ok)return out(req,403,{status:'FORBIDDEN',reason:authz.reason});
  let body:any={};try{body=await req.json();}catch{return out(req,400,{status:'ERROR',reason:'JSON_REQUIRED'});}
  const correlation_id=typeof body?.correlation_id==='string'&&body.correlation_id.trim()?body.correlation_id.trim().slice(0,240):`jarvis-orch-${crypto.randomUUID()}`;
  try{
    const intent=clean(body?.intent,'INTENT',64).toUpperCase();
    if(!INTENTS.has(intent))return out(req,400,{status:'UNSUPPORTED',reason:'INTENT_NOT_AVAILABLE',intent,correlation_id});
    const args=body?.args&&typeof body.args==='object'&&!Array.isArray(body.args)?body.args:{};
    enforceScope(intent,args);
    let r:{ok:boolean,status:number,body:any}|null=null,delegated='NONE';
    if(intent==='PROJECTS_LIST'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,'/projects','GET',req);}
    else if(intent==='REPO_HEAD'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,'/repo/head','GET',req);}
    else if(intent==='REPO_LIST'){delegated=WORK_GATEWAY;const q=new URLSearchParams();if(args.path)q.set('path',String(args.path));r=await upstream(WORK_GATEWAY,'/repo/list','GET',req,undefined,q);}
    else if(intent==='REPO_FILE'){delegated=WORK_GATEWAY;const q=new URLSearchParams({path:safePath(args.path)});r=await upstream(WORK_GATEWAY,'/repo/file','GET',req,undefined,q);}
    else if(intent==='SEARCH_CODE'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,'/repo/search','POST',req,{query:clean(args.query,'SEARCH_QUERY',160)});}
    else if(intent==='RUN_READONLY_CHECK'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,'/terminal','POST',req,{command:clean(args.command,'COMMAND',2000)});}
    else if(intent==='WORK_STATUS'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,`/work/${encodeURIComponent(clean(args.job_id,'JOB_ID',160))}`,'GET',req);}
    else if(intent==='WORK_CANCEL'){delegated=WORK_GATEWAY;r=await upstream(WORK_GATEWAY,`/work/${encodeURIComponent(clean(args.job_id,'JOB_ID',160))}/cancel`,'POST',req,{});}
    else if(intent==='GIT_STATUS'){delegated=GIT_GATEWAY;r=await upstream(GIT_GATEWAY,'/inspect','POST',req,{operation:'STATUS',expected_head_sha:sha(args.expected_head_sha,'EXPECTED_HEAD_SHA')});}
    else if(intent==='GIT_DIFF'){delegated=GIT_GATEWAY;r=await upstream(GIT_GATEWAY,'/inspect','POST',req,{operation:'DIFF',expected_head_sha:sha(args.expected_head_sha,'EXPECTED_HEAD_SHA'),staged:args.staged===true});}
    else if(intent==='GIT_COMPARE'){delegated=GIT_GATEWAY;r=await upstream(GIT_GATEWAY,'/inspect','POST',req,{operation:'COMPARE',expected_head_sha:sha(args.expected_head_sha,'EXPECTED_HEAD_SHA'),base:typeof args.base==='string'?args.base:'main',head:SAFE_BRANCH});}
    else if(intent==='SAVE_FILE'){delegated=GIT_GATEWAY;r=await upstream(GIT_GATEWAY,'/save','POST',req,{path:safePath(args.path),content:fileContent(args.content),message:typeof args.message==='string'?args.message.slice(0,240):undefined,expected_head_sha:sha(args.expected_head_sha,'EXPECTED_HEAD_SHA')});}
    else if(intent==='ROLLBACK_COMMIT'){delegated=GIT_GATEWAY;r=await upstream(GIT_GATEWAY,'/rollback','POST',req,{commit_sha:sha(args.commit_sha,'COMMIT_SHA'),expected_head_sha:sha(args.expected_head_sha,'EXPECTED_HEAD_SHA')});}
    else if(intent==='BROWSER_HANDOFF')return out(req,200,{status:'OK',result:{route:'/cerebro?section=browser&from=jarvis-work',execution:false},evidence:evidence(intent,'UI_HANDOFF',correlation_id,null),human_required:null});
    else if(intent==='BROWSER_STATUS'){
      if(!BROWSER_GATEWAY)return out(req,200,{status:'NOT_APPLICABLE',reason:'BROWSER_OWNER_GATEWAY_IS_PROD_ONLY',evidence:evidence(intent,'NONE',correlation_id,null),human_required:null});
      delegated=BROWSER_GATEWAY;r=await upstream(BROWSER_GATEWAY,'/status','POST',req,{company_id:COMPANY,session_id:args.session_id||undefined,browser_profile_id:args.browser_profile_id||undefined,list:args.list===true});
    }
    else if(intent==='BROWSER_PROFILES'){
      if(!BROWSER_GATEWAY)return out(req,200,{status:'NOT_APPLICABLE',reason:'BROWSER_OWNER_GATEWAY_IS_PROD_ONLY',evidence:evidence(intent,'NONE',correlation_id,null),human_required:null});
      delegated=BROWSER_GATEWAY;r=await upstream(BROWSER_GATEWAY,'/profiles','POST',req,{company_id:COMPANY});
    }
    if(!r)throw new Error('INTENT_ROUTING_BUG');
    return out(req,r.status,{status:r.ok?(r.status===202?'QUEUED':'OK'):'UPSTREAM_ERROR',result:r.body,evidence:evidence(intent,delegated,correlation_id,r.status),human_required:null});
  }catch(error){
    const reason=error instanceof Error?error.message:String(error);
    const denied=reason.includes('DENIED')||reason.includes('SCOPE');
    return out(req,denied?403:400,{status:denied?'DENIED':'ERROR',reason,correlation_id,company_id:COMPANY,engine_id:ENGINE,environment:ENV,version:VERSION,human_required:null,prod_branch_mutation:false,trading_access:false,additional_cost_eur:0});
  }
});
