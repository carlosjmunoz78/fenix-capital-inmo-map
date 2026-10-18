import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,mkdir,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildDockerSandboxArgs,
  inspectUniversalRepoSandboxBackend,
  materializePinnedPublicGitHubRepository,
  executePinnedPublicRepositorySandbox,
  UNIVERSAL_REPO_SANDBOX_EXECUTOR_V0_CONTRACT
} from '../runtime/universal-repo-sandbox-executor-v0.mjs';

const SAMPLE_SHA='2e8a56bd8b2863be09d4fc85283c0e465131a6d3';
const SAMPLE_REPO='sindresorhus/slash';
const SAMPLE_URL='https://github.com/sindresorhus/slash.git';
function plan(overrides={}){return {
  schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0',status:'SANDBOX_PLAN_READY',
  company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0',repository:SAMPLE_REPO,pinned_sha:SAMPLE_SHA,
  isolation:{mode:'EPHEMERAL_SANDBOX',network:'DENY',network_allowlist:[],customer_data:false,trading:false,prod:false},
  dependency_policy:{host_install:false,install_scope:'EPHEMERAL_SANDBOX_ONLY'},required_secrets:[],resource_limits:{memory_mb:256,processes:32,wall_seconds:45},...overrides};}

test('docker argv is fixed fail-closed isolation and never exposes host authority',()=>{
  const args=buildDockerSandboxArgs({plan:plan(),workspace_path:'/tmp/cerebro/work',image_ref:'node@sha256:'+'a'.repeat(64),command:['node','index.js'],container_name:'cerebro-test'});
  const joined=args.join(' ');
  for(const required of ['--network none','--read-only','--cap-drop ALL','no-new-privileges:true','--pids-limit 32','--memory 256m','--tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777','dst=/workspace,readonly','--user 65532:65532'])assert.ok(joined.includes(required),`missing ${required}`);
  for(const forbidden of ['--privileged','--network host','/var/run/docker.sock','--pid host','--user 0:0'])assert.equal(joined.includes(forbidden),false);
  assert.equal(UNIVERSAL_REPO_SANDBOX_EXECUTOR_V0_CONTRACT.host_installs,false);
  assert.equal(UNIVERSAL_REPO_SANDBOX_EXECUTOR_V0_CONTRACT.host_code_execution,false);
  assert.equal(UNIVERSAL_REPO_SANDBOX_EXECUTOR_V0_CONTRACT.sandbox_user,'65532:65532');
});

test('executor refuses mutable image, secrets, network allowlist and PROD',()=>{
  assert.throws(()=>buildDockerSandboxArgs({plan:plan(),workspace_path:'/tmp/x',image_ref:'node:22-alpine',command:['node','x.js']}),/immutable image digest/);
  assert.throws(()=>buildDockerSandboxArgs({plan:plan({required_secrets:['TOKEN']}),workspace_path:'/tmp/x',image_ref:'node@sha256:'+'b'.repeat(64),command:['node','x.js']}),/does not bind secrets/);
  assert.throws(()=>buildDockerSandboxArgs({plan:plan({isolation:{mode:'EPHEMERAL_SANDBOX',network:'ALLOWLIST',network_allowlist:['example.com']}}),workspace_path:'/tmp/x',image_ref:'node@sha256:'+'b'.repeat(64),command:['node','x.js']}),/network DENY/);
  assert.throws(()=>buildDockerSandboxArgs({plan:plan({environment:'PROD'}),workspace_path:'/tmp/x',image_ref:'node@sha256:'+'b'.repeat(64),command:['node','x.js']}),/PREPROD only/);
});

test('public materializer rejects non-GitHub source before process execution',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'cerebro-materializer-unit-'));
  try{await assert.rejects(()=>materializePinnedPublicGitHubRepository({repository_url:'file:///etc',pinned_sha:SAMPLE_SHA,workspace_root:root}),/public GitHub HTTPS/);}
  finally{await rm(root,{recursive:true,force:true});}
});

test('backend inspection is fail-closed when backend is absent',async()=>{
  const out=await inspectUniversalRepoSandboxBackend({docker_bin:'definitely-not-a-docker-binary',git_bin:'git'});
  assert.equal(out.status,'BACKEND_UNAVAILABLE');assert.equal(out.docker_available,false);assert.equal(out.prod_authorized,false);assert.equal(out.additional_cost_eur,0);
});

const physical=process.env.CEREBRO_PHYSICAL_SANDBOX_E2E==='1';
test('physical public repo exact-SHA -> OCI sandbox -> boundary probes -> cleanup',{skip:!physical,timeout:180_000},async()=>{
  const image=process.env.CEREBRO_SANDBOX_IMAGE;assert.match(image??'',/@sha256:[a-f0-9]{64}$/);
  const root=await mkdtemp(path.join(os.tmpdir(),'cerebro-physical-e2e-'));
  try{
    const backend=await inspectUniversalRepoSandboxBackend();assert.equal(backend.status,'BACKEND_READY');
    const probe=`
      const fs=require('node:fs');
      const out={repo_read:false,root_write_blocked:false,workspace_write_blocked:false,tmp_write:false,network_blocked:false,secrets_absent:false,unprivileged:false};
      out.repo_read=fs.readFileSync('/workspace/package.json','utf8').includes('"name": "slash"');
      try{fs.writeFileSync('/cerebro-should-be-blocked','x');}catch{out.root_write_blocked=true;}
      try{fs.writeFileSync('/workspace/cerebro-should-be-blocked','x');}catch{out.workspace_write_blocked=true;}
      fs.writeFileSync('/tmp/cerebro-ok','ok');out.tmp_write=fs.readFileSync('/tmp/cerebro-ok','utf8')==='ok';
      out.secrets_absent=!process.env.GITHUB_TOKEN&&!process.env.SUPABASE_SERVICE_ROLE_KEY&&!process.env.OPENAI_API_KEY;
      out.unprivileged=typeof process.getuid==='function'&&process.getuid()===65532;
      (async()=>{try{await fetch('https://example.com',{signal:AbortSignal.timeout(1500)});}catch{out.network_blocked=true;}
      console.log('CEREBRO_SANDBOX_PROBE='+JSON.stringify(out));if(!Object.values(out).every(Boolean))process.exit(41);})();`;
    const result=await executePinnedPublicRepositorySandbox({plan:plan(),repository_url:SAMPLE_URL,workspace_root:root,image_ref:image,command:['node','-e',probe]});
    assert.equal(result.status,'PHYSICAL_PREPROD_GREEN',`sandbox stderr=${result.execution.stderr} stdout=${result.execution.stdout}`);assert.equal(result.materialization.status,'MATERIALIZED_EXACT_SHA');assert.equal(result.materialization.git_metadata_removed,true);assert.equal(result.materialization.public_readonly_projection,true);assert.equal(result.execution.network,'DENY');assert.equal(result.execution.workspace_mount,'READ_ONLY');assert.equal(result.execution.sandbox_user,'65532:65532');assert.equal(result.execution.secrets_bound,false);assert.match(result.execution.stdout,/CEREBRO_SANDBOX_PROBE=/);
    const marker=result.execution.stdout.match(/CEREBRO_SANDBOX_PROBE=(\{[^\n]+\})/);assert.ok(marker);const observed=JSON.parse(marker[1]);assert.deepEqual(observed,{repo_read:true,root_write_blocked:true,workspace_write_blocked:true,tmp_write:true,network_blocked:true,secrets_absent:true,unprivileged:true});
    assert.deepEqual(await readdir(root),[]);
    const artifact={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_REPO_SANDBOX_PHYSICAL_E2E_V0',status:'GREEN_PHYSICAL_PREPROD',observed_at:new Date().toISOString(),source:{repository:SAMPLE_REPO,pinned_sha:SAMPLE_SHA,license:'MIT'},backend:{type:backend.backend,docker_version:backend.docker_version,git_version:backend.git_version},image_ref:image,boundaries:observed,execution:{network:'DENY',filesystem:'READ_ONLY_ROOT_PLUS_TMPFS',workspace:'READ_ONLY',sandbox_user:result.execution.sandbox_user,caps:'DROP_ALL',no_new_privileges:true,secrets_bound:false,exit_code:result.execution.exit_code},authority:{prod:false,customer_data:false,trading:false,host_installs:false,host_code_execution:false,paid:false,additional_cost_eur:0}};
    const artifactPath=process.env.CEREBRO_SANDBOX_ARTIFACT;if(artifactPath){await mkdir(path.dirname(artifactPath),{recursive:true});await writeFile(artifactPath,JSON.stringify(artifact,null,2)+'\n');assert.equal(JSON.parse(await readFile(artifactPath,'utf8')).status,'GREEN_PHYSICAL_PREPROD');}
  }finally{await rm(root,{recursive:true,force:true});}
});
