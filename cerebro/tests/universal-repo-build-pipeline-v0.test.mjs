import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  inspectNodeBuildContract,
  createUniversalRepoBuildPlan,
  buildAllowlistProxyDockerArgs,
  buildDependencyInstallerDockerArgs,
  executePinnedPublicRepositoryBuildPipeline,
  UNIVERSAL_REPO_BUILD_PIPELINE_V0_CONTRACT
} from '../runtime/universal-repo-build-pipeline-v0.mjs';

const IMAGE='node@sha256:'+'a'.repeat(64);
const REPO_URL='https://github.com/carlosjmunoz78/fenix-capital-inmo-map.git';
const FIXTURE_SUBDIR='cerebro/tests/fixtures/universal-repo-build-node';
const PACKAGE_JSON=JSON.stringify({name:'fixture',private:true,version:'1.0.0',type:'module',dependencies:{'is-number':'7.0.0'}});

test('exact direct npm versions can bootstrap a lock inside sandbox',()=>{
  const out=inspectNodeBuildContract({package_json_text:PACKAGE_JSON});
  assert.equal(out.status,'NODE_BUILD_CONTRACT_READY');
  assert.equal(out.lock_mode,'BOOTSTRAP_LOCK_FROM_EXACT_DIRECT_VERSIONS');
  assert.equal(out.allowlist.includes('registry.npmjs.org'),true);
});

test('unlocked mutable dependency specs are fail-closed',()=>{
  const pkg=JSON.stringify({name:'fixture',version:'1.0.0',dependencies:{foo:'^1.2.3'}});
  const out=inspectNodeBuildContract({package_json_text:pkg});
  assert.equal(out.status,'BUILD_PLAN_BLOCKED_UNPINNED_DEPENDENCIES');
  assert.equal(out.unsafe[0].name,'foo');
});

test('root install lifecycle scripts require an adapter instead of arbitrary execution',()=>{
  const pkg=JSON.stringify({name:'fixture',version:'1.0.0',dependencies:{foo:'1.2.3'},scripts:{postinstall:'node pwn.js'}});
  const out=inspectNodeBuildContract({package_json_text:pkg});
  assert.equal(out.status,'BUILD_ADAPTER_REQUIRED');
  assert.deepEqual(out.lifecycle_scripts,['postinstall']);
});

test('existing lock cannot silently expand network allowlist',()=>{
  const lock=JSON.stringify({lockfileVersion:3,packages:{'node_modules/foo':{version:'1.0.0',resolved:'https://evil.example/foo.tgz'}}});
  const out=inspectNodeBuildContract({package_json_text:PACKAGE_JSON,package_lock_text:lock});
  assert.equal(out.status,'NETWORK_ALLOWLIST_EXPANSION_REQUIRED');
  assert.deepEqual(out.denied_hosts,['evil.example']);
});

test('build plan pins images, denies host installs and requires capability probe',()=>{
  const plan=createUniversalRepoBuildPlan({repository_url:REPO_URL,pinned_sha:'b'.repeat(40),source_subdir:FIXTURE_SUBDIR,package_json_text:PACKAGE_JSON,build_image_ref:IMAGE,capability_probe:{command:['node',`${FIXTURE_SUBDIR}/index.mjs`],expected_stdout_prefix:'CEREBRO_CAPABILITY_PROBE='}});
  assert.equal(plan.status,'BUILD_PLAN_READY');
  assert.equal(plan.environment,'PREPROD');
  assert.equal(plan.dependency_policy.host_install,false);
  assert.equal(plan.network_policy.direct_egress,'DENY');
  assert.equal(plan.prod_authorized,false);
  assert.equal(plan.additional_cost_eur,0);
  assert.throws(()=>createUniversalRepoBuildPlan({repository_url:REPO_URL,pinned_sha:'b'.repeat(40),package_json_text:PACKAGE_JSON,build_image_ref:'node:22-alpine',capability_probe:{command:['node','x.mjs'],expected_stdout_prefix:'x'}}),/immutable digest/);
});

test('docker build argv isolates builder behind internal network and proxy',()=>{
  const proxyArgs=buildAllowlistProxyDockerArgs({container_name:'cerebro-proxy-test',internal_network:'cerebro-net-test',proxy_image_ref:IMAGE,allowlist:['registry.npmjs.org']});
  const builderArgs=buildDependencyInstallerDockerArgs({container_name:'cerebro-build-test',internal_network:'cerebro-net-test',build_image_ref:IMAGE,workspace_path:'/tmp/cerebro-build',source_subdir:FIXTURE_SUBDIR,install_args:['install','--ignore-scripts'],proxy_name:'cerebro-proxy-test'});
  const p=proxyArgs.join(' ');const b=builderArgs.join(' ');
  for(const required of ['--network bridge','--read-only','--cap-drop ALL','no-new-privileges:true','--user 65532:65532'])assert.ok(p.includes(required),`proxy missing ${required}`);
  for(const required of ['--network cerebro-net-test','--read-only','--cap-drop ALL','no-new-privileges:true','HTTPS_PROXY=http://cerebro-proxy-test:3128','NPM_CONFIG_REGISTRY=https://registry.npmjs.org/'])assert.ok(b.includes(required),`builder missing ${required}`);
  for(const forbidden of ['--privileged','--network host','/var/run/docker.sock','--pid host','--user 0:0']){assert.equal(p.includes(forbidden),false);assert.equal(b.includes(forbidden),false);}
  assert.equal(UNIVERSAL_REPO_BUILD_PIPELINE_V0_CONTRACT.host_dependency_install,false);
  assert.equal(UNIVERSAL_REPO_BUILD_PIPELINE_V0_CONTRACT.prod,false);
});

const physical=process.env.CEREBRO_PHYSICAL_BUILD_E2E==='1';
test('physical exact-SHA -> allowlisted sandbox build -> frozen lock/SBOM -> offline runtime probe -> PREPROD tribunal',{skip:!physical,timeout:420_000},async()=>{
  const sha=process.env.CEREBRO_BUILD_SOURCE_SHA;const image=process.env.CEREBRO_BUILD_IMAGE;
  assert.match(sha??'',/^[a-f0-9]{40}$/);assert.match(image??'',/@sha256:[a-f0-9]{64}$/);
  const packageJson=await readFile(path.join(process.cwd(),FIXTURE_SUBDIR,'package.json'),'utf8');
  const plan=createUniversalRepoBuildPlan({repository_url:REPO_URL,pinned_sha:sha,source_subdir:FIXTURE_SUBDIR,package_json_text:packageJson,build_image_ref:image,capability_probe:{command:['node',`${FIXTURE_SUBDIR}/index.mjs`],expected_stdout_prefix:'CEREBRO_CAPABILITY_PROBE='}});
  assert.equal(plan.status,'BUILD_PLAN_READY');
  const root=await mkdtemp(path.join(os.tmpdir(),'cerebro-build-pipeline-e2e-'));
  try{
    const out=await executePinnedPublicRepositoryBuildPipeline({plan,workspace_root:root});
    assert.equal(out.status,'PREPROD_BUILD_ACCEPTED',JSON.stringify(out,null,2));
    assert.equal(out.build.direct_egress_blocked,true);
    assert.deepEqual(out.build.network_allowlist,['registry.npmjs.org']);
    assert.equal(out.build.lifecycle_scripts,'DISABLED');
    assert.equal(out.build.host_dependency_install,false);
    assert.equal(out.runtime.network,'DENY');
    assert.equal(out.runtime.probe_green,true);
    assert.equal(out.adapter.status,'CAPABILITY_ADAPTER_READY');
    assert.equal(out.tribunal.status,'PREPROD_ACCEPT');
    assert.equal(out.tribunal.prod_approval,false);
    assert.equal(out.tribunal.cve_scan,'REQUIRED_BEFORE_PROD');
    assert.equal(out.additional_cost_eur,0);
    const dep=out.sbom.components.find(x=>x.name==='is-number');assert.ok(dep);assert.equal(dep.version,'7.0.0');assert.ok(dep.integrity);assert.ok(dep.license);
    const artifactPath=process.env.CEREBRO_BUILD_ARTIFACT;if(artifactPath){await mkdir(path.dirname(artifactPath),{recursive:true});await writeFile(artifactPath,JSON.stringify(out,null,2)+'\n');}
  }finally{await rm(root,{recursive:true,force:true});}
});
