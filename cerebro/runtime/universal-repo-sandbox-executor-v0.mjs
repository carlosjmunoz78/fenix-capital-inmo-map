import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {chmod, mkdtemp, readdir, lstat, realpath, rm} from 'node:fs/promises';
import path from 'node:path';

const PREPROD='PREPROD';
const MAX_OUTPUT_BYTES=1024*1024;
const MAX_FILES=20_000;
const MAX_BYTES=512*1024*1024;
const SANDBOX_USER='65532:65532';
const GITHUB_HTTPS_RE=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/;
const PINNED_IMAGE_RE=/^[a-z0-9][a-z0-9._\/-]*(?::[a-z0-9._-]+)?@sha256:[a-f0-9]{64}$/i;

function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');}
function clean(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const s=v.trim();if(s.length>max||s.includes('\0'))throw new Error(`${label} invalid`);return s;}
function assertSha(v){const s=clean(v,'pinned_sha',64).toLowerCase();if(!/^[a-f0-9]{40}$/.test(s))throw new Error('40-char immutable git sha required');return s;}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,host_code_execution_authorized:false,host_dependency_install_authorized:false,customer_data_used:false,trading_access:false,paid_fallback:false,spend_authorized:false,additional_cost_eur:0});}

function validatePlan(plan){
  if(!plan||plan.state_type!=='CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0'||plan.status!=='SANDBOX_PLAN_READY')throw new Error('SANDBOX_PLAN_READY required');
  if(plan.environment!==PREPROD)throw new Error('PREPROD only');
  if(plan.isolation?.mode!=='EPHEMERAL_SANDBOX'||plan.isolation?.network!=='DENY'||(plan.isolation?.network_allowlist?.length??0)!==0)throw new Error('V0 requires EPHEMERAL_SANDBOX with network DENY');
  if(plan.dependency_policy?.host_install!==false)throw new Error('host dependency install must be denied');
  if((plan.required_secrets?.length??0)!==0)throw new Error('V0 physical executor does not bind secrets');
  assertSha(plan.pinned_sha);
  return plan;
}

function validateImageRef(imageRef){const ref=clean(imageRef,'image_ref',512);if(!PINNED_IMAGE_RE.test(ref))throw new Error('immutable image digest required');return ref;}
function validateCommand(command){if(!Array.isArray(command)||command.length===0||command.length>64)throw new Error('command array required');return Object.freeze(command.map((v,i)=>clean(v,`command[${i}]`,8192)));}
function safeName(plan){return `cerebro-${hash(`${plan.company_id}:${plan.engine_id}:${plan.pinned_sha}:${Date.now()}:${process.pid}`).slice(0,20)}`;}
function lexicalWithin(root,target){const r=path.resolve(root);const t=path.resolve(target);return t===r||t.startsWith(`${r}${path.sep}`);}

async function runProcess(bin,args,{cwd,timeoutMs=60_000,maxOutputBytes=MAX_OUTPUT_BYTES,signal}={}){
  return await new Promise((resolve,reject)=>{
    let stdout='';let stderr='';let timedOut=false;let settled=false;
    const child=spawn(bin,args,{cwd,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
    const append=(key,chunk)=>{const s=chunk.toString('utf8');if(key==='out')stdout=(stdout+s).slice(-maxOutputBytes);else stderr=(stderr+s).slice(-maxOutputBytes);};
    child.stdout.on('data',c=>append('out',c));child.stderr.on('data',c=>append('err',c));
    child.once('error',err=>{if(!settled){settled=true;clearTimeout(timer);reject(err);}});
    const stop=()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGTERM');};
    const timer=setTimeout(()=>{timedOut=true;stop();setTimeout(()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');},1500).unref();},Math.max(100,timeoutMs));
    if(signal){if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});}
    child.once('close',(code,terminationSignal)=>{if(settled)return;settled=true;clearTimeout(timer);resolve({exit_code:typeof code==='number'?code:124,signal:terminationSignal??null,timed_out:timedOut,stdout,stderr});});
  });
}

export function buildDockerSandboxArgs({plan,workspace_path,image_ref,command,container_name='cerebro-sandbox'}={}){
  validatePlan(plan);const image=validateImageRef(image_ref);const cmd=validateCommand(command);
  const workspace=clean(workspace_path,'workspace_path',4096);if(!path.isAbsolute(workspace))throw new Error('workspace_path must be absolute');
  const name=clean(container_name,'container_name',63).toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]*$/.test(name))throw new Error('unsafe container_name');
  const memory=Math.min(Math.max(Number(plan.resource_limits?.memory_mb??512),64),4096);
  const pids=Math.min(Math.max(Number(plan.resource_limits?.processes??32),1),128);
  return Object.freeze(['run','--rm','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit',String(pids),'--memory',`${memory}m`,'--cpus','1.0','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777','--mount',`type=bind,src=${workspace},dst=/workspace,readonly`,'--workdir','/workspace','--user',SANDBOX_USER,image,...cmd]);
}

export async function inspectUniversalRepoSandboxBackend({docker_bin='docker',git_bin='git'}={}){
  const [docker,git]=await Promise.all([
    runProcess(docker_bin,['version','--format','{{.Server.Version}}'],{timeoutMs:15_000}).catch(e=>({exit_code:127,stdout:'',stderr:e.message})),
    runProcess(git_bin,['--version'],{timeoutMs:10_000}).catch(e=>({exit_code:127,stdout:'',stderr:e.message}))
  ]);
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_BACKEND_V0',status:docker.exit_code===0&&git.exit_code===0?'BACKEND_READY':'BACKEND_UNAVAILABLE',backend:'DOCKER_CLI_OCI',docker_available:docker.exit_code===0,git_available:git.exit_code===0,docker_version:docker.exit_code===0?docker.stdout.trim():null,git_version:git.exit_code===0?git.stdout.trim():null,...authority()});
}

async function assertRealWorkspaceWithin(root,target){
  const [r,t]=await Promise.all([realpath(root),realpath(target)]);if(!lexicalWithin(r,t))throw new Error('workspace escapes trusted root');return t;
}

export async function executeUniversalRepoSandbox({plan,workspace_path,trusted_workspace_root,image_ref,command,docker_bin='docker',signal}={}){
  validatePlan(plan);const workspace=await assertRealWorkspaceWithin(clean(trusted_workspace_root,'trusted_workspace_root'),clean(workspace_path,'workspace_path'));
  const name=safeName(plan);const args=buildDockerSandboxArgs({plan,workspace_path:workspace,image_ref,command,container_name:name});
  const timeoutMs=Math.min(Math.max(Number(plan.resource_limits?.wall_seconds??300),1),1800)*1000;
  let run;
  try{run=await runProcess(docker_bin,args,{timeoutMs,signal});}
  finally{await runProcess(docker_bin,['rm','-f',name],{timeoutMs:10_000}).catch(()=>null);}
  const green=run.exit_code===0&&!run.timed_out;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_EXECUTION_V0',status:green?'SANDBOX_EXECUTION_GREEN':'SANDBOX_EXECUTION_FAILED',isolation:'EPHEMERAL_SANDBOX',backend:'DOCKER_CLI_OCI',image_ref:validateImageRef(image_ref),network:'DENY',filesystem:'READ_ONLY_ROOT_PLUS_TMPFS',capabilities_dropped:'ALL',no_new_privileges:true,sandbox_user:SANDBOX_USER,pids_limit:Number(plan.resource_limits?.processes??32),memory_mb:Number(plan.resource_limits?.memory_mb??512),workspace_mount:'READ_ONLY',secrets_bound:false,host_mutated:false,prod_touched:false,customer_data_used:false,trading_touched:false,exit_code:run.exit_code,timed_out:run.timed_out,health_green:green,stdout:run.stdout,stderr:run.stderr,command_hash:hash(validateCommand(command)),...authority()});
}

async function scanWorkspace(root){
  let files=0;let bytes=0;
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='.git')continue;const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else{const s=await lstat(p);files++;bytes+=s.size;if(files>MAX_FILES)throw new Error('materialized repository file limit exceeded');if(bytes>MAX_BYTES)throw new Error('materialized repository byte limit exceeded');}}}
  await walk(root);return {files,bytes};
}

async function normalizePublicWorkspaceForSandbox(root){
  await chmod(root,0o755);
  async function walk(dir){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      const p=path.join(dir,entry.name);
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){await chmod(p,0o755);await walk(p);continue;}
      const s=await lstat(p);await chmod(p,(s.mode&0o111)?0o555:0o444);
    }
  }
  await walk(root);
}

export async function materializePinnedPublicGitHubRepository({repository_url,pinned_sha,workspace_root,git_bin='git',signal}={}){
  const url=clean(repository_url,'repository_url',512);if(!GITHUB_HTTPS_RE.test(url))throw new Error('V0 materializer accepts public GitHub HTTPS repositories only');
  const sha=assertSha(pinned_sha);const root=await realpath(clean(workspace_root,'workspace_root'));const target=await mkdtemp(path.join(root,'cerebro-repo-'));
  try{
    for(const [args,timeoutMs] of [[['init','--quiet',target],15_000],[['-C',target,'remote','add','origin',url],10_000],[['-C',target,'fetch','--quiet','--depth','1','--no-tags','origin',sha],120_000],[['-C',target,'checkout','--quiet','--detach','FETCH_HEAD'],30_000]]){
      const r=await runProcess(git_bin,args,{timeoutMs,signal});if(r.exit_code!==0)throw new Error(`git materialization failed:${r.stderr.slice(-500)}`);
    }
    const rev=await runProcess(git_bin,['-C',target,'rev-parse','HEAD'],{timeoutMs:10_000,signal});if(rev.exit_code!==0||rev.stdout.trim().toLowerCase()!==sha)throw new Error('materialized sha mismatch');
    const scanned=await scanWorkspace(target);
    await rm(path.join(target,'.git'),{recursive:true,force:true});
    await normalizePublicWorkspaceForSandbox(target);
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_PINNED_REPOSITORY_MATERIALIZATION_V0',status:'MATERIALIZED_EXACT_SHA',repository_url:url,pinned_sha:sha,workspace_path:target,file_count:scanned.files,total_bytes:scanned.bytes,git_metadata_removed:true,public_readonly_projection:true,submodules_fetched:false,lfs_fetched:false,cleanup_required:true,...authority()});
  }catch(error){await rm(target,{recursive:true,force:true});throw error;}
}

export async function executePinnedPublicRepositorySandbox({plan,repository_url,workspace_root,image_ref,command,docker_bin='docker',git_bin='git',signal}={}){
  validatePlan(plan);const materialized=await materializePinnedPublicGitHubRepository({repository_url,pinned_sha:plan.pinned_sha,workspace_root,git_bin,signal});
  try{
    const execution=await executeUniversalRepoSandbox({plan,workspace_path:materialized.workspace_path,trusted_workspace_root:workspace_root,image_ref,command,docker_bin,signal});
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_PINNED_REPOSITORY_SANDBOX_E2E_V0',status:execution.health_green?'PHYSICAL_PREPROD_GREEN':'PHYSICAL_PREPROD_FAILED',company_id:plan.company_id,engine_id:plan.engine_id,environment:PREPROD,repository_url,pinned_sha:plan.pinned_sha,materialization:Object.freeze({status:materialized.status,file_count:materialized.file_count,total_bytes:materialized.total_bytes,git_metadata_removed:materialized.git_metadata_removed,public_readonly_projection:materialized.public_readonly_projection,submodules_fetched:false,lfs_fetched:false}),execution,...authority()});
  }finally{await rm(materialized.workspace_path,{recursive:true,force:true});}
}

export const UNIVERSAL_REPO_SANDBOX_EXECUTOR_V0_CONTRACT=Object.freeze({capability:'FACT-001/universal-repo-sandbox-executor-v0',backend:'DOCKER_CLI_OCI',environment:PREPROD,source:'PUBLIC_GITHUB_EXACT_SHA',image:'IMMUTABLE_DIGEST_REQUIRED',network_default:'DENY',filesystem_root:'READ_ONLY',workspace:'READ_ONLY_BIND',sandbox_user:SANDBOX_USER,tmp:'BOUNDED_TMPFS',capabilities:'DROP_ALL',no_new_privileges:true,secrets_default:'DENY',host_installs:false,host_code_execution:false,cleanup_required:true,worker_contract:'JOB-001/durable-worker-runner-v1',additional_cost_target_eur:0});
