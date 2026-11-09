import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);
const ENV='PROD',COMPANY='fenix',ENGINE='CONSOLE-001',VERSION='v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const BRANCH='cerebro/jarvis-core-prod-candidate-20261103';
const POLICY_VERSION='1.2.1';
const MAX_CONTENT_BYTES=2_000_000;
const INSPECT_OPS=new Set(['STATUS','DIFF','CI_READ','COMPARE']);
// DIR-TEST cannot enqueue even Git read requests; Git worker testing uses separate bounded GitHub OIDC.

function cors(origin:string|null){const h:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'origin'};if(origin&&ORIGINS.has(origin))h['access-control-allow-origin']=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get('origin'))});}
function clean(value:unknown,label:string,max=4000){if(typeof value!=='string'||!value.trim())throw new Error(`${label}_REQUIRED`);const s=value.trim();if(s.length>max||s.includes('\0'))throw new Error(`${label}_INVALID`);return s;}
function safePath(value:unknown){const p=clean(value,'PATH',500).replace(/\\/g,'/').replace(/^\.\//,'');if(p.startsWith('/')||p.split('/').includes('..')||p.startsWith('.git/')||p==='.git')throw new Error('UNSAFE_REPOSITORY_PATH');return p;}
function sha(value:unknown,label='SHA'){const s=clean(value,label,64).toLowerCase();if(!/^[a-f0-9]{40}$/.test(s))throw new Error(`${label}_INVALID`);return s;}
function db(){const U=Deno.env.get('SUPABASE_URL')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';if(!U||!S)throw new Error('SERVER_CONFIG_MISSING');return createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});}
async function owner(req:Request){const U=Deno.env.get('SUPABASE_URL')??'',A=Deno.env.get('SUPABASE_ANON_KEY')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',h=req.headers.get('authorization')??'';if(!U||!A||!S||!h.toLowerCase().startsWith('bearer '))return{ok:false,actor:''};const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}}),svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await auth.auth.getUser(h.slice(7));if(error||!data.user)return{ok:false,actor:''};const{data:ctx,error:e}=await svc.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});if(e||!ctx?.ok)return{ok:false,actor:''};const actor=String(ctx.actor_code||'');return{ok:actor==='CARLOS-ADMIN'||actor==='DIR-TEST',actor};}
async function enqueue(actor:string,actions:unknown[],kind:string){const row={company_id:COMPANY,engine_id:ENGINE,environment:ENV,version:VERSION,name:'git.safe.v1',payload:{actions,requested_by:actor,kind},status:'QUEUED',priority:1,max_attempts:1,timeout_ms:600000,idempotency_key:`git-${kind}-${crypto.randomUUID()}`,correlation_id:`corr-git-${crypto.randomUUID()}`};const{data,error}=await db().from('jarvis_work_job_v1').insert(row).select('job_id,name,status,attempts,max_attempts,checkpoint,result_summary,error_code,error_detail,cancel_reason,created_at,started_at,completed_at,updated_at').single();if(error)throw error;return data;}
function base(operation:string,expected_head_sha:string){return{company_id:COMPANY,engine_id:ENGINE,environment:ENV,version:POLICY_VERSION,operation,repo:REPO,target_branch:BRANCH,expected_head_sha,rollback_ready:true};}

Deno.serve(async req=>{const origin=req.headers.get('origin');if(req.method==='OPTIONS'){if(!origin||!ORIGINS.has(origin))return new Response(null,{status:403});return new Response(null,{status:204,headers:{...cors(origin),'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type','access-control-max-age':'600'}});}const authz=await owner(req);if(!authz.ok)return out(req,403,{status:'FORBIDDEN',reason:'OWNER_ONLY'});if(authz.actor==='DIR-TEST')return out(req,403,{status:'FORBIDDEN',reason:'TEST_ACTOR_GIT_DENIED'});const parts=new URL(req.url).pathname.split('/').filter(Boolean),i=parts.lastIndexOf('jarvis-git-gateway-v1'),route=i>=0?parts.slice(i+1):[];try{
 if(req.method==='GET'&&(route.length===0||route[0]==='health'))return out(req,200,{status:'ok',service:'jarvis-git-gateway-v1',environment:ENV,repository:REPO,branch:BRANCH,save:true,rollback:true,inspect:['STATUS','DIFF','CI_READ','COMPARE'],prod_authorized:false,prod_mutation_enabled:false,trading_access:false,additional_cost_target_eur:0});
 if(req.method==='POST'&&route[0]==='inspect'){
  const body:any=await req.json();const operation=clean(body.operation,'OPERATION',32).toUpperCase();if(!INSPECT_OPS.has(operation))throw new Error('INSPECT_OPERATION_DENIED');const expected=sha(body.expected_head_sha,'EXPECTED_HEAD_SHA');let action:any=base(operation,expected);
  if(operation==='DIFF')action={...action,payload:{staged:body.staged===true}};
  if(operation==='COMPARE'){const compareBase=clean(body.base||'main','COMPARE_BASE',220),compareHead=clean(body.head||BRANCH,'COMPARE_HEAD',220);action={...action,payload:{base:compareBase,head:compareHead}};}
  return out(req,202,{status:'QUEUED',job:await enqueue(authz.actor,[action],`inspect-${operation.toLowerCase()}`),repository:REPO,branch:BRANCH,operation});
 }
 if(req.method==='POST'&&route[0]==='save'){
  const body:any=await req.json();const path=safePath(body.path),content=String(body.content??'');if(!content.length)throw new Error('CONTENT_REQUIRED');if(new TextEncoder().encode(content).byteLength>MAX_CONTENT_BYTES)throw new Error('CONTENT_TOO_LARGE');const expected=sha(body.expected_head_sha,'EXPECTED_HEAD_SHA');const message=typeof body.message==='string'&&body.message.trim()?clean(body.message,'MESSAGE',240):`chore(jarvis): update ${path}`;
  const actions=[{...base('COMMIT_FILE',expected),path,paths:[path],payload:{content,message}},{...base('PUSH','$CURRENT_HEAD')}];
  return out(req,202,{status:'QUEUED',job:await enqueue(authz.actor,actions,'save'),repository:REPO,branch:BRANCH,path});
 }
 if(req.method==='POST'&&route[0]==='rollback'){
  const body:any=await req.json();const expected=sha(body.expected_head_sha,'EXPECTED_HEAD_SHA'),commit=sha(body.commit_sha,'COMMIT_SHA');const actions=[{...base('ROLLBACK_REVERT',expected),revert_of_sha:commit},{...base('PUSH','$CURRENT_HEAD')}];
  return out(req,202,{status:'QUEUED',job:await enqueue(authz.actor,actions,'rollback'),repository:REPO,branch:BRANCH,revert_of_sha:commit});
 }
 return out(req,404,{status:'CLOSED',reason:'ROUTE_NOT_AVAILABLE'});
 }catch(error){return out(req,400,{status:'ERROR',reason:error instanceof Error?error.message:String(error)});}});
