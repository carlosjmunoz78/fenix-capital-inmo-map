import crypto from 'node:crypto';
import path from 'node:path';

const PREPROD = 'PREPROD';
const VERSION = '0.1.0';
const MAX_FILES = 20_000;
const MAX_BYTES = 512 * 1024 * 1024;
const EXECUTION_KINDS = new Set(['LIBRARY','CLI','WORKER','HTTP_SERVICE','MCP','SCHEDULED_JOB']);

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function nonEmpty(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const out=v.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,host_code_execution_authorized:false,host_dependency_install_authorized:false,sandbox_external_code_execution_authorized:true,sandbox_dependency_install_authorized:true,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function normalizeFile(row){const filePath=nonEmpty(row?.path,'file.path',4096).replace(/\\/g,'/').replace(/^\.\//,'');if(filePath.startsWith('/')||filePath.split('/').includes('..'))throw new Error(`unsafe repository path:${filePath}`);const bytes=Number(row?.bytes??0);if(!Number.isFinite(bytes)||bytes<0)throw new Error(`invalid file bytes:${filePath}`);return Object.freeze({path:filePath,bytes});}
function byName(files,name){return files.some(f=>f.path===name||f.path.endsWith(`/${name}`));}
function anyMatch(files,re){return files.some(f=>re.test(f.path));}

export function detectRepositoryRuntime({files}={}){
  if(!Array.isArray(files)||files.length===0)throw new Error('repository files required');
  if(files.length>MAX_FILES)throw new Error('repository file limit exceeded');
  const normalized=Object.freeze(files.map(normalizeFile));
  const total_bytes=normalized.reduce((sum,f)=>sum+f.bytes,0);if(total_bytes>MAX_BYTES)throw new Error('repository byte limit exceeded');
  const stacks=[];const package_managers=[];const manifests=[];const system_hints=[];
  const add=(arr,v)=>{if(!arr.includes(v))arr.push(v);};
  if(byName(normalized,'package.json')){add(stacks,'node');add(manifests,'package.json');if(byName(normalized,'pnpm-lock.yaml'))add(package_managers,'pnpm');else if(byName(normalized,'yarn.lock'))add(package_managers,'yarn');else add(package_managers,'npm');}
  if(byName(normalized,'pyproject.toml')||byName(normalized,'requirements.txt')||byName(normalized,'Pipfile')){add(stacks,'python');if(byName(normalized,'pyproject.toml'))add(manifests,'pyproject.toml');if(byName(normalized,'requirements.txt'))add(manifests,'requirements.txt');if(byName(normalized,'uv.lock'))add(package_managers,'uv');else if(byName(normalized,'poetry.lock'))add(package_managers,'poetry');else add(package_managers,'pip');}
  if(byName(normalized,'composer.json')){add(stacks,'php');add(package_managers,'composer');add(manifests,'composer.json');}
  if(byName(normalized,'go.mod')){add(stacks,'go');add(package_managers,'go-mod');add(manifests,'go.mod');}
  if(byName(normalized,'Cargo.toml')){add(stacks,'rust');add(package_managers,'cargo');add(manifests,'Cargo.toml');}
  if(byName(normalized,'pom.xml')||byName(normalized,'build.gradle')||byName(normalized,'build.gradle.kts')){add(stacks,'java');add(package_managers,byName(normalized,'pom.xml')?'maven':'gradle');add(manifests,byName(normalized,'pom.xml')?'pom.xml':'gradle');}
  if(byName(normalized,'Dockerfile')||anyMatch(normalized,/(^|\/)Dockerfile\.[^/]+$/)){add(stacks,'container');add(manifests,'Dockerfile');}
  if(byName(normalized,'deno.json')||byName(normalized,'deno.jsonc')){add(stacks,'deno');add(package_managers,'deno');add(manifests,'deno.json');}
  if(anyMatch(normalized,/(^|\/)(mcp\.json|server\.json)$/i)||anyMatch(normalized,/mcp/i))add(system_hints,'MCP_CANDIDATE');
  if(anyMatch(normalized,/(^|\/)(ffmpeg|imagemagick|sox|chromium|playwright)/i))add(system_hints,'SYSTEM_BINARY_OR_BROWSER_DEPENDENCY_POSSIBLE');
  const detected=stacks.length>0;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_REPOSITORY_RUNTIME_DETECTION_V0',status:detected?'RUNTIME_DETECTED':'RUNTIME_UNRESOLVED',stacks:Object.freeze(stacks.sort()),package_managers:Object.freeze(package_managers.sort()),manifests:Object.freeze(manifests.sort()),system_hints:Object.freeze(system_hints.sort()),file_count:normalized.length,total_bytes,...authority()});
}

export function buildUniversalRepoSandboxPlan({company_id='fenix',engine_id='FACT-001',environment=PREPROD,version=VERSION,repository,pinned_sha,files,execution_kind='WORKER',entrypoint=null,network_allowlist=[],required_secrets=[],resource_limits={}}={}){
  if(environment!==PREPROD)throw new Error('universal repo runtime V0 is PREPROD only');
  const company=nonEmpty(company_id,'company_id',120);const engine=nonEmpty(engine_id,'engine_id',120);const repo=nonEmpty(repository,'repository',300);const sha=nonEmpty(pinned_sha,'pinned_sha',80).toLowerCase();
  if(!/^[a-f0-9]{40,64}$/.test(sha))throw new Error('repository must be pinned by immutable sha/digest');
  if(!EXECUTION_KINDS.has(execution_kind))throw new Error(`unsupported execution_kind:${execution_kind}`);
  const detection=detectRepositoryRuntime({files});if(detection.status!=='RUNTIME_DETECTED')return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0',status:'DEPENDENCY_RESOLUTION_REQUIRED',reason:'RUNTIME_UNRESOLVED',company_id:company,engine_id:engine,environment,version,repository:repo,pinned_sha:sha,detection,...authority()});
  const allowlist=Object.freeze([...new Set((network_allowlist??[]).map(x=>nonEmpty(x,'network_allowlist item',255).toLowerCase()))].sort());
  const secrets=Object.freeze([...new Set((required_secrets??[]).map(x=>nonEmpty(x,'required_secret',160)))].sort());
  const limits=Object.freeze({cpu_seconds:Math.min(Math.max(Number(resource_limits.cpu_seconds??120),1),900),memory_mb:Math.min(Math.max(Number(resource_limits.memory_mb??512),64),4096),disk_mb:Math.min(Math.max(Number(resource_limits.disk_mb??1024),128),8192),wall_seconds:Math.min(Math.max(Number(resource_limits.wall_seconds??300),1),1800),processes:Math.min(Math.max(Number(resource_limits.processes??32),1),128)});
  const plan={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0',status:secrets.length?'BIND_REQUIRED':'SANDBOX_PLAN_READY',company_id:company,engine_id:engine,environment,version,repository:repo,pinned_sha:sha,execution_kind,entrypoint:entrypoint?nonEmpty(entrypoint,'entrypoint',1000):null,detection,dependency_policy:Object.freeze({install_scope:'EPHEMERAL_SANDBOX_ONLY',host_install:false,lockfile_preferred:true,no_global_packages:true,cache_persistence:'CONTENT_HASHED_ONLY'}),isolation:Object.freeze({mode:'EPHEMERAL_SANDBOX',filesystem:'COPY_ON_WRITE',network:allowlist.length?'ALLOWLIST':'DENY',network_allowlist:allowlist,customer_data:false,trading:false,prod:false}),required_secrets:secrets,resource_limits:limits,health_contract:Object.freeze({required:true,timeout_seconds:Math.min(60,limits.wall_seconds),must_exit_cleanly:execution_kind!=='HTTP_SERVICE'&&execution_kind!=='MCP'}),promotion:Object.freeze({lab_to_preprod:true,old_vs_new_required:true,tribunal_required:true,backup_rollback_rebuild_required:true,prod_requires_separate_gate:true}),...authority()};
  return Object.freeze({...plan,plan_hash:hash(plan)});
}

export function createUniversalRepoWorkerHandler({sandbox_executor}={}){
  if(typeof sandbox_executor!=='function')throw new Error('sandbox_executor required');
  return async function universalRepoWorker({payload,signal,checkpoint}){
    const plan=payload?.sandbox_plan;if(!plan||plan.state_type!=='CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0'||plan.status!=='SANDBOX_PLAN_READY')throw new Error('SANDBOX_PLAN_READY required');
    if(plan.environment!==PREPROD||plan.isolation?.mode!=='EPHEMERAL_SANDBOX'||plan.dependency_policy?.host_install!==false)throw new Error('UNSAFE_SANDBOX_PLAN');
    checkpoint?.({stage:'SANDBOX_START',plan_hash:plan.plan_hash});
    const result=await sandbox_executor({plan,signal});
    if(!result||result.isolation!=='EPHEMERAL_SANDBOX')throw new Error('SANDBOX_EXECUTOR_ATTESTATION_REQUIRED');
    if(result.host_mutated===true||result.prod_touched===true||result.customer_data_used===true||result.trading_touched===true)throw new Error('SANDBOX_BOUNDARY_VIOLATION');
    if(result.exit_code!==0||result.health_green!==true)throw new Error(`SANDBOX_EXECUTION_FAILED:${result.exit_code}`);
    checkpoint?.({stage:'SANDBOX_GREEN',result_hash:hash(result)});
    return Object.freeze({status:'SANDBOX_EXECUTION_GREEN',company_id:plan.company_id,engine_id:plan.engine_id,environment:PREPROD,repository:plan.repository,pinned_sha:plan.pinned_sha,plan_hash:plan.plan_hash,result_hash:hash(result),attestation:Object.freeze({isolation:result.isolation,host_mutated:false,prod_touched:false,customer_data_used:false,trading_touched:false,health_green:true}),...authority()});
  };
}

export const UNIVERSAL_REPO_RUNTIME_V0_CONTRACT=Object.freeze({capability:'FACT-001/universal-repo-runtime-v0',worker_runtime:'JOB-001/durable-worker-runner-v1',environment:PREPROD,pinned_source_required:true,ephemeral_sandbox_required:true,dependency_install_scope:'sandbox-only',host_dependency_install:false,host_external_code_execution:false,network_default:'DENY',resource_limits_required:true,license_provenance_required_upstream:true,prod:false,customer_data:false,trading:false,additional_cost_target_eur:0,promotion:'LAB->PREPROD->OLD_vs_NEW->tribunal->gradual_prod'});
