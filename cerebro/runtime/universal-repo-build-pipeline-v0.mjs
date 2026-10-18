import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm} from 'node:fs/promises';
import path from 'node:path';
import {
  executeUniversalRepoSandbox,
  materializePinnedPublicGitHubRepository
} from './universal-repo-sandbox-executor-v0.mjs';

const PREPROD='PREPROD';
const SANDBOX_USER='65532:65532';
const MAX_OUTPUT_BYTES=1024*1024;
const PINNED_IMAGE_RE=/^[a-z0-9][a-z0-9._\/-]*(?::[a-z0-9._-]+)?@sha256:[a-f0-9]{64}$/i;
const EXACT_SEMVER_RE=/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DEFAULT_NPM_HOST='registry.npmjs.org';

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');}
function clean(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const s=v.trim();if(s.length>max||s.includes('\0'))throw new Error(`${label} invalid`);return s;}
function immutableImage(v,label='image_ref'){const s=clean(v,label,512);if(!PINNED_IMAGE_RE.test(s))throw new Error(`${label} must be immutable digest`);return s;}
function exactSha(v){const s=clean(v,'pinned_sha',64).toLowerCase();if(!/^[a-f0-9]{40}$/.test(s))throw new Error('40-char immutable git sha required');return s;}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,host_code_execution_authorized:false,host_dependency_install_authorized:false,customer_data_used:false,trading_access:false,paid_fallback:false,spend_authorized:false,additional_cost_eur:0});}
function safeSubdir(v='.'){const s=String(v??'.').replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/$/,'')||'.';if(s.startsWith('/')||s.split('/').includes('..')||s.includes('\0'))throw new Error('unsafe source_subdir');return s;}
function safeHost(v){const s=clean(v,'network host',255).toLowerCase();if(!/^[a-z0-9.-]+$/.test(s)||s.startsWith('.')||s.endsWith('.')||s.includes('..'))throw new Error(`unsafe network host:${s}`);return s;}
function safeContainerName(v){const s=clean(v,'container_name',63).toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]*$/.test(s))throw new Error('unsafe container name');return s;}
function within(root,target){const r=path.resolve(root);const t=path.resolve(target);return t===r||t.startsWith(`${r}${path.sep}`);}

async function runProcess(bin,args,{cwd,timeoutMs=120_000,maxOutputBytes=MAX_OUTPUT_BYTES,signal}={}){
  return await new Promise((resolve,reject)=>{
    let stdout='';let stderr='';let timedOut=false;let settled=false;
    const child=spawn(bin,args,{cwd,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
    const append=(key,chunk)=>{const s=chunk.toString('utf8');if(key==='out')stdout=(stdout+s).slice(-maxOutputBytes);else stderr=(stderr+s).slice(-maxOutputBytes);};
    child.stdout.on('data',c=>append('out',c));child.stderr.on('data',c=>append('err',c));
    const stop=()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGTERM');};
    const timer=setTimeout(()=>{timedOut=true;stop();setTimeout(()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');},1500).unref();},Math.max(100,timeoutMs));
    if(signal){if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});}
    child.once('error',err=>{if(!settled){settled=true;clearTimeout(timer);reject(err);}});
    child.once('close',(code,terminationSignal)=>{if(settled)return;settled=true;clearTimeout(timer);resolve({exit_code:typeof code==='number'?code:124,signal:terminationSignal??null,timed_out:timedOut,stdout,stderr});});
  });
}

function parseJson(text,label){try{return JSON.parse(text);}catch{throw new Error(`${label} invalid JSON`);}}
function packageSpecs(pkg){return Object.entries({...pkg.dependencies,...pkg.optionalDependencies,...pkg.devDependencies});}
function lifecycleScripts(pkg){const scripts=pkg?.scripts??{};return ['preinstall','install','postinstall'].filter(k=>typeof scripts[k]==='string'&&scripts[k].trim());}
function hostFromResolved(value){try{return new URL(value).hostname.toLowerCase();}catch{return null;}}

export function inspectNodeBuildContract({package_json_text,package_lock_text=null,network_allowlist=[DEFAULT_NPM_HOST]}={}){
  const pkg=parseJson(clean(package_json_text,'package_json_text',2_000_000),'package.json');
  const allowlist=Object.freeze([...new Set(network_allowlist.map(safeHost))].sort());
  const lifecycle=lifecycleScripts(pkg);
  if(lifecycle.length)return Object.freeze({status:'BUILD_ADAPTER_REQUIRED',reason:'ROOT_INSTALL_LIFECYCLE_SCRIPTS_PRESENT',lifecycle_scripts:Object.freeze(lifecycle),allowlist,...authority()});
  if(package_lock_text){
    const lock=parseJson(clean(package_lock_text,'package_lock_text',20_000_000),'package-lock.json');
    const hosts=[...new Set(Object.values(lock.packages??{}).map(x=>hostFromResolved(x?.resolved)).filter(Boolean))].sort();
    const denied=hosts.filter(h=>!allowlist.includes(h));
    if(denied.length)return Object.freeze({status:'NETWORK_ALLOWLIST_EXPANSION_REQUIRED',reason:'LOCKFILE_RESOLVED_HOST_NOT_ALLOWLISTED',resolved_hosts:Object.freeze(hosts),denied_hosts:Object.freeze(denied),allowlist,...authority()});
    return Object.freeze({status:'NODE_BUILD_CONTRACT_READY',lock_mode:'ENFORCE_EXISTING_LOCK',package_manager:'npm',install_args:Object.freeze(['ci','--ignore-scripts','--no-audit','--no-fund']),resolved_hosts:Object.freeze(hosts),allowlist,...authority()});
  }
  const unsafe=packageSpecs(pkg).filter(([,spec])=>!EXACT_SEMVER_RE.test(String(spec))).map(([name,spec])=>({name,spec:String(spec)}));
  if(unsafe.length)return Object.freeze({status:'BUILD_PLAN_BLOCKED_UNPINNED_DEPENDENCIES',reason:'LOCK_BOOTSTRAP_REQUIRES_EXACT_DIRECT_VERSIONS',unsafe:Object.freeze(unsafe),allowlist,...authority()});
  return Object.freeze({status:'NODE_BUILD_CONTRACT_READY',lock_mode:'BOOTSTRAP_LOCK_FROM_EXACT_DIRECT_VERSIONS',package_manager:'npm',install_args:Object.freeze(['install','--ignore-scripts','--no-audit','--no-fund','--save-exact','--package-lock=true']),resolved_hosts:Object.freeze([]),allowlist,...authority()});
}

export function createUniversalRepoBuildPlan({company_id='fenix',engine_id='FACT-001',repository_url,pinned_sha,source_subdir='.',package_json_text,package_lock_text=null,build_image_ref,proxy_image_ref=build_image_ref,network_allowlist=[DEFAULT_NPM_HOST],capability_probe={}}={}){
  const node=inspectNodeBuildContract({package_json_text,package_lock_text,network_allowlist});
  const base={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_BUILD_PLAN_V0',company_id:clean(company_id,'company_id',120),engine_id:clean(engine_id,'engine_id',120),environment:PREPROD,repository_url:clean(repository_url,'repository_url',512),pinned_sha:exactSha(pinned_sha),source_subdir:safeSubdir(source_subdir),build_image_ref:immutableImage(build_image_ref,'build_image_ref'),proxy_image_ref:immutableImage(proxy_image_ref,'proxy_image_ref'),node_build_contract:node,network_policy:Object.freeze({mode:'ISOLATED_INTERNAL_NETWORK_VIA_ALLOWLIST_PROXY',allowlist:node.allowlist??Object.freeze([]),direct_egress:'DENY',runtime_network:'DENY'}),dependency_policy:Object.freeze({host_install:false,sandbox_install:true,lifecycle_scripts:'DENY_V0',lock_required_after_build:true,mutable_dependency_specs:'DENY_WITHOUT_LOCK'}),capability_probe:Object.freeze({command:Array.isArray(capability_probe.command)?capability_probe.command.map((v,i)=>clean(String(v),`capability_probe.command[${i}]`,8192)):[],expected_stdout_prefix:capability_probe.expected_stdout_prefix?clean(capability_probe.expected_stdout_prefix,'expected_stdout_prefix',240):null}),...authority()};
  const ready=node.status==='NODE_BUILD_CONTRACT_READY'&&base.capability_probe.command.length>0&&base.capability_probe.expected_stdout_prefix;
  const plan={...base,status:ready?'BUILD_PLAN_READY':'BUILD_PLAN_BLOCKED',blocked_reason:ready?null:(node.status!=='NODE_BUILD_CONTRACT_READY'?node.status:'CAPABILITY_PROBE_REQUIRED')};
  return Object.freeze({...plan,plan_hash:hash(plan)});
}

function proxySource(){return String.raw`
const http=require('node:http');const net=require('node:net');const {URL}=require('node:url');
const allowed=new Set(JSON.parse(process.env.CEREBRO_PROXY_ALLOWLIST||'[]').map(x=>String(x).toLowerCase()));
const ok=h=>allowed.has(String(h||'').toLowerCase());
const server=http.createServer((req,res)=>{let u;try{u=new URL(req.url);}catch{res.writeHead(400);return res.end('bad url');}if(!ok(u.hostname)){res.writeHead(403);return res.end('denied');}const lib=u.protocol==='https:'?require('node:https'):http;const up=lib.request(u,{method:req.method,headers:{...req.headers,host:u.host}},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);});up.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('upstream error');});req.pipe(up);});
server.on('connect',(req,client,head)=>{const raw=String(req.url||'');const idx=raw.lastIndexOf(':');const host=idx>0?raw.slice(0,idx):raw;const port=idx>0?Number(raw.slice(idx+1)):443;if(!ok(host)||!Number.isInteger(port)||port<1||port>65535){client.write('HTTP/1.1 403 Forbidden\r\n\r\n');return client.destroy();}const upstream=net.connect(port,host,()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head?.length)upstream.write(head);upstream.pipe(client);client.pipe(upstream);});upstream.on('error',()=>client.destroy());});
server.listen(3128,'0.0.0.0',()=>console.log('CEREBRO_ALLOWLIST_PROXY_READY'));
`;
}

export function buildAllowlistProxyDockerArgs({container_name,internal_network,proxy_image_ref,allowlist}={}){
  const name=safeContainerName(container_name);safeContainerName(internal_network);const image=immutableImage(proxy_image_ref,'proxy_image_ref');const hosts=Object.freeze([...new Set((allowlist??[]).map(safeHost))].sort());if(!hosts.length)throw new Error('proxy allowlist required');
  return Object.freeze(['run','-d','--rm','--name',name,'--network','bridge','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','32','--memory','128m','--cpus','0.50','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777','--user',SANDBOX_USER,'--env',`CEREBRO_PROXY_ALLOWLIST=${JSON.stringify(hosts)}`,image,'node','-e',proxySource()]);
}

export function buildDependencyInstallerDockerArgs({container_name,internal_network,build_image_ref,workspace_path,source_subdir='.',install_args,proxy_name}={}){
  const name=safeContainerName(container_name);const net=safeContainerName(internal_network);const image=immutableImage(build_image_ref,'build_image_ref');const workspace=clean(workspace_path,'workspace_path',4096);if(!path.isAbsolute(workspace))throw new Error('workspace_path must be absolute');const sub=safeSubdir(source_subdir);const proxy=safeContainerName(proxy_name);if(!Array.isArray(install_args)||!install_args.length)throw new Error('install_args required');
  return Object.freeze(['run','--rm','--name',name,'--network',net,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','64','--memory','1024m','--cpus','1.0','--tmpfs','/tmp:rw,nosuid,nodev,size=256m,mode=1777','--mount',`type=bind,src=${workspace},dst=/workspace`,'--workdir',sub==='.'?'/workspace':`/workspace/${sub}`,'--user',SANDBOX_USER,'--env','HOME=/tmp/home','--env','NPM_CONFIG_CACHE=/tmp/npm-cache','--env','NPM_CONFIG_REGISTRY=https://registry.npmjs.org/','--env',`HTTPS_PROXY=http://${proxy}:3128`,'--env',`HTTP_PROXY=http://${proxy}:3128`,'--env',`https_proxy=http://${proxy}:3128`,'--env',`http_proxy=http://${proxy}:3128`,'--env','NO_PROXY=','--env','no_proxy=',image,'npm',...install_args]);
}

async function makeWritableTree(root){await chmod(root,0o777);for(const entry of await readdir(root,{withFileTypes:true})){const p=path.join(root,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory()){await makeWritableTree(p);continue;}const s=await lstat(p);await chmod(p,(s.mode&0o111)?0o777:0o666);}}
async function buildSbom(buildRoot,subdir){const dir=subdir==='.'?buildRoot:path.join(buildRoot,subdir);const lockText=await readFile(path.join(dir,'package-lock.json'),'utf8');const lock=parseJson(lockText,'package-lock.json');const components=[];for(const [key,row] of Object.entries(lock.packages??{})){if(!key.startsWith('node_modules/')||!row?.version)continue;const pkgPath=path.join(dir,key,'package.json');let license=null;try{license=parseJson(await readFile(pkgPath,'utf8'),pkgPath).license??null;}catch{}components.push({name:key.replace(/^node_modules\//,''),version:String(row.version),resolved:row.resolved??null,integrity:row.integrity??null,license});}components.sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));return Object.freeze({format:'CEREBRO_DEPENDENCY_SBOM_V0',ecosystem:'npm',lock_sha256:hash(lockText),components:Object.freeze(components),all_licenses_declared:components.every(c=>typeof c.license==='string'&&c.license.trim().length>0)});}
function runtimePlan(plan){return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0',status:'SANDBOX_PLAN_READY',company_id:plan.company_id,engine_id:plan.engine_id,environment:PREPROD,version:'0.1.0',repository:plan.repository_url,pinned_sha:plan.pinned_sha,isolation:{mode:'EPHEMERAL_SANDBOX',network:'DENY',network_allowlist:[],customer_data:false,trading:false,prod:false},dependency_policy:{host_install:false,install_scope:'EPHEMERAL_SANDBOX_ONLY'},required_secrets:[],resource_limits:{memory_mb:512,processes:32,wall_seconds:120}});}

export async function executeUniversalRepoBuildPipeline({plan,materialized_workspace,workspace_root,docker_bin='docker',signal}={}){
  if(!plan||plan.state_type!=='CEREBRO_UNIVERSAL_REPO_BUILD_PLAN_V0'||plan.status!=='BUILD_PLAN_READY')throw new Error('BUILD_PLAN_READY required');
  const trusted=await realpath(clean(workspace_root,'workspace_root'));const source=await realpath(clean(materialized_workspace,'materialized_workspace'));if(!within(trusted,source))throw new Error('materialized workspace escapes trusted root');
  const sourceSub=plan.source_subdir==='.'?source:path.join(source,plan.source_subdir);if(!within(source,sourceSub))throw new Error('source_subdir escapes materialized workspace');await realpath(sourceSub);
  const buildRoot=await mkdtemp(path.join(trusted,'cerebro-build-'));const buildSub=plan.source_subdir==='.'?buildRoot:path.join(buildRoot,plan.source_subdir);
  const suffix=hash(`${plan.plan_hash}:${Date.now()}:${process.pid}`).slice(0,16);const net=`cerebro-net-${suffix}`;const proxy=`cerebro-proxy-${suffix}`;const builder=`cerebro-build-${suffix}`;
  const cleanup=async()=>{await runProcess(docker_bin,['rm','-f',builder],{timeoutMs:10_000}).catch(()=>null);await runProcess(docker_bin,['rm','-f',proxy],{timeoutMs:10_000}).catch(()=>null);await runProcess(docker_bin,['network','rm',net],{timeoutMs:10_000}).catch(()=>null);await rm(buildRoot,{recursive:true,force:true});};
  try{
    if(plan.source_subdir!=='.')await mkdir(path.dirname(buildSub),{recursive:true});
    await cp(sourceSub,buildSub,{recursive:true,force:true});await makeWritableTree(buildRoot);
    const created=await runProcess(docker_bin,['network','create','--internal','--driver','bridge',net],{timeoutMs:20_000,signal});if(created.exit_code!==0)throw new Error(`internal network create failed:${created.stderr.slice(-500)}`);
    const proxyRun=await runProcess(docker_bin,buildAllowlistProxyDockerArgs({container_name:proxy,internal_network:net,proxy_image_ref:plan.proxy_image_ref,allowlist:plan.network_policy.allowlist}),{timeoutMs:30_000,signal});if(proxyRun.exit_code!==0)throw new Error(`allowlist proxy start failed:${proxyRun.stderr.slice(-500)}`);
    const connect=await runProcess(docker_bin,['network','connect',net,proxy],{timeoutMs:15_000,signal});if(connect.exit_code!==0)throw new Error(`proxy internal network attach failed:${connect.stderr.slice(-500)}`);
    const directProbe=await runProcess(docker_bin,['run','--rm','--network',net,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','16','--memory','128m','--cpus','0.25','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777','--user',SANDBOX_USER,plan.build_image_ref,'node','-e',"fetch('https://example.com',{signal:AbortSignal.timeout(2500)}).then(()=>process.exit(42)).catch(()=>process.exit(0))"],{timeoutMs:15_000,signal});if(directProbe.exit_code!==0)throw new Error('internal builder network allowed direct egress');
    const installerArgs=buildDependencyInstallerDockerArgs({container_name:builder,internal_network:net,build_image_ref:plan.build_image_ref,workspace_path:buildRoot,source_subdir:plan.source_subdir,install_args:plan.node_build_contract.install_args,proxy_name:proxy});
    const install=await runProcess(docker_bin,installerArgs,{timeoutMs:300_000,signal});if(install.exit_code!==0)throw new Error(`sandbox dependency install failed:${install.stderr.slice(-1000)}`);
    const sbom=await buildSbom(buildRoot,plan.source_subdir);if(!sbom.components.length)throw new Error('dependency SBOM empty after build');
    const runtime=await executeUniversalRepoSandbox({plan:runtimePlan(plan),workspace_path:buildRoot,trusted_workspace_root:trusted,image_ref:plan.build_image_ref,command:plan.capability_probe.command,docker_bin,signal});
    const probeGreen=runtime.health_green===true&&runtime.stdout.includes(plan.capability_probe.expected_stdout_prefix);
    const accepted=probeGreen&&sbom.all_licenses_declared;
    const attestation={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_BUILD_ATTESTATION_V0',status:accepted?'PREPROD_BUILD_ACCEPTED':'PREPROD_BUILD_REJECTED',company_id:plan.company_id,engine_id:plan.engine_id,environment:PREPROD,repository_url:plan.repository_url,pinned_sha:plan.pinned_sha,source_subdir:plan.source_subdir,plan_hash:plan.plan_hash,build:{package_manager:'npm',lock_mode:plan.node_build_contract.lock_mode,network:'ISOLATED_INTERNAL_VIA_ALLOWLIST_PROXY',network_allowlist:plan.network_policy.allowlist,direct_egress_blocked:true,lifecycle_scripts:'DISABLED',host_dependency_install:false,host_code_execution:false,image_ref:plan.build_image_ref},sbom,runtime:{status:runtime.status,network:'DENY',probe_green:probeGreen,stdout:runtime.stdout,stderr:runtime.stderr},adapter:Object.freeze({status:probeGreen?'CAPABILITY_ADAPTER_READY':'CAPABILITY_ADAPTER_BLOCKED',execution_kind:'CLI',command:Object.freeze([...plan.capability_probe.command]),expected_stdout_prefix:plan.capability_probe.expected_stdout_prefix}),tribunal:Object.freeze({status:accepted?'PREPROD_ACCEPT':'HOLD',prod_approval:false,cve_scan:'REQUIRED_BEFORE_PROD',rollback:'EPHEMERAL_CLEANUP',rebuild:'SOURCE_SHA_PLUS_LOCK_PLUS_IMAGE_DIGEST',cost_eur:0}),...authority()};
    return Object.freeze({...attestation,attestation_hash:hash(attestation)});
  }finally{await cleanup();}
}

export async function executePinnedPublicRepositoryBuildPipeline({plan,workspace_root,docker_bin='docker',git_bin='git',signal}={}){
  const materialized=await materializePinnedPublicGitHubRepository({repository_url:plan.repository_url,pinned_sha:plan.pinned_sha,workspace_root,git_bin,signal});
  try{return await executeUniversalRepoBuildPipeline({plan,materialized_workspace:materialized.workspace_path,workspace_root,docker_bin,signal});}
  finally{await rm(materialized.workspace_path,{recursive:true,force:true});}
}

export const UNIVERSAL_REPO_BUILD_PIPELINE_V0_CONTRACT=Object.freeze({capability:'FACT-001/universal-repo-build-pipeline-v0',environment:PREPROD,stack_v0:'node/npm',build_phase:'EPHEMERAL_SANDBOX',build_network:'ISOLATED_INTERNAL_NETWORK_VIA_ALLOWLIST_PROXY',direct_egress:'DENY',runtime_network:'DENY',host_dependency_install:false,host_external_code_execution:false,root_install_lifecycle_scripts:'DENY_V0',lock_policy:'ENFORCE_OR_BOOTSTRAP_FROM_EXACT_DIRECT_VERSIONS',sbom:'CEREBRO_DEPENDENCY_SBOM_V0',adapter_generation:'PROBE_GATED',tribunal:'PREPROD_ONLY',prod:false,customer_data:false,trading:false,additional_cost_target_eur:0});
