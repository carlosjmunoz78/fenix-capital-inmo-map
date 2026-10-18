import test from 'node:test';
import assert from 'node:assert/strict';
import {detectRepositoryRuntime,buildUniversalRepoSandboxPlan,createUniversalRepoWorkerHandler} from '../runtime/universal-repo-runtime-v0.mjs';
import {resolveBlockedCapability,runSelfExtendingCapabilityLoop} from '../runtime/self-extending-capability-resolver-v0.mjs';
import {upgradeActivationReportToSelfExtending} from '../runtime/universal-self-extending-github-intake-v0.mjs';

test('detects common stacks and creates PREPROD sandbox-only plan',()=>{
  const files=[{path:'package.json',bytes:120},{path:'package-lock.json',bytes:400},{path:'src/index.js',bytes:80}];
  const detected=detectRepositoryRuntime({files});assert.equal(detected.status,'RUNTIME_DETECTED');assert.deepEqual(detected.stacks,['node']);
  const plan=buildUniversalRepoSandboxPlan({repository:'owner/repo',pinned_sha:'a'.repeat(40),files,execution_kind:'WORKER'});
  assert.equal(plan.status,'SANDBOX_PLAN_READY');assert.equal(plan.environment,'PREPROD');assert.equal(plan.isolation.mode,'EPHEMERAL_SANDBOX');assert.equal(plan.isolation.network,'DENY');assert.equal(plan.dependency_policy.host_install,false);assert.equal(plan.host_code_execution_authorized,false);assert.equal(plan.sandbox_external_code_execution_authorized,true);assert.equal(plan.prod_authorized,false);assert.equal(plan.trading_access,false);
});

test('sandbox worker requires attestation and rejects host/prod boundary violation',async()=>{
  const plan=buildUniversalRepoSandboxPlan({repository:'owner/repo',pinned_sha:'b'.repeat(40),files:[{path:'requirements.txt',bytes:50},{path:'main.py',bytes:100}]});
  const checkpoints=[];
  const handler=createUniversalRepoWorkerHandler({sandbox_executor:async()=>({isolation:'EPHEMERAL_SANDBOX',exit_code:0,health_green:true,host_mutated:false,prod_touched:false,customer_data_used:false,trading_touched:false})});
  const out=await handler({payload:{sandbox_plan:plan},checkpoint:x=>checkpoints.push(x)});assert.equal(out.status,'SANDBOX_EXECUTION_GREEN');assert.equal(checkpoints.at(-1).stage,'SANDBOX_GREEN');
  const bad=createUniversalRepoWorkerHandler({sandbox_executor:async()=>({isolation:'EPHEMERAL_SANDBOX',exit_code:0,health_green:true,host_mutated:true})});await assert.rejects(()=>bad({payload:{sandbox_plan:plan}}),/SANDBOX_BOUNDARY_VIOLATION/);
});

test('useful blocked dependency becomes nonterminal engineering/search work, never rejection',()=>{
  const r=resolveBlockedCapability({candidate_id:'repo:1',capability_id:'cap:1',reason:'BLOCKED_EXTERNAL',useful:true,dependency:{kind:'SYSTEM_BINARY',name:'ffmpeg'}});
  assert.equal(r.status,'DEPENDENCY_RESOLUTION_REQUIRED');assert.equal(r.terminal,false);assert.equal(r.work_items[0].owner_engine_id,'TECH_SCOUT');assert.equal(r.work_items[1].owner_engine_id,'FACT-001');assert.equal(r.resume_policy.resume_original_skill,true);assert.equal(r.paid_fallback,false);
});

test('credential/device dependency asks exact human gate and resumes later',()=>{
  const r=resolveBlockedCapability({candidate_id:'repo:2',capability_id:'cap:2',reason:'BLOCKED_EXTERNAL',dependency:{kind:'OAUTH_REQUIRED',name:'provider'}});
  assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.human_required,'POLICY_CONFLICT');assert.equal(r.terminal,false);assert.equal(r.human_action.resume_automatically,true);
});

test('genuine redundant/unsafe candidate may still be rejected',()=>{
  const redundant=resolveBlockedCapability({candidate_id:'repo:3',capability_id:'cap:3',reason:'REDUNDANT_CAPABILITY',useful:true});assert.equal(redundant.status,'REJECTED');assert.equal(redundant.terminal,true);
});

test('loop searches more then FACT-001 builds and resumes original skill',async()=>{
  const resolution=resolveBlockedCapability({candidate_id:'repo:4',capability_id:'cap:4',dependency:{kind:'PACKAGE',name:'missing-lib'}});
  let scoutCalls=0;let buildCalls=0;
  const out=await runSelfExtendingCapabilityLoop({resolution,reuse_internal:async()=>({status:'MISS'}),wrap_existing:async()=>({status:'MISS'}),tech_scout:async()=>{scoutCalls++;return {status:'MISS'};},fact_build:async()=>{buildCalls++;return {status:'GREEN',evidence_ref:'fact://built'};},verify_and_resume:async()=>({status:'FULL_SAFE_PREPROD'})});
  assert.equal(out.status,'RESUMED_GREEN');assert.ok(scoutCalls>=1);assert.equal(buildCalls,1);assert.equal(out.selected.strategy,'FACT001_BUILD_MINIMAL_SUBSTITUTE');
});

test('GitHub intake BLOCKED_EXTERNAL is upgraded to nonterminal dependency resolution',()=>{
  const legacy={status:'BLOCKED_EXTERNAL',full_safe_preprod:false,activation:{candidate_id:'repo:blocked',auto_engineering:{fulfillment:{blocked_external:[{capability_id:'cap:blocked',domain_id:'multimedia',engine_id:'FACT-001',decision:{reason:'SYSTEM_BINARY',dependency_name:'ffmpeg'}}]}}}};
  const upgraded=upgradeActivationReportToSelfExtending(legacy,{company_id:'fenix'});
  assert.equal(upgraded.status,'DEPENDENCY_RESOLUTION_REQUIRED');assert.equal(upgraded.legacy_status,'BLOCKED_EXTERNAL');assert.equal(upgraded.terminal_state,null);assert.equal(upgraded.resolutions[0].status,'DEPENDENCY_RESOLUTION_REQUIRED');assert.equal(upgraded.resolutions[0].dependency_kind,'SYSTEM_BINARY');
});

test('GitHub intake preserves already-green and genuine terminal rejection semantics',()=>{
  const green=upgradeActivationReportToSelfExtending({status:'FULL_SAFE_PREPROD',full_safe_preprod:true});assert.equal(green.self_extension.status,'NOT_REQUIRED');
  const rejected=upgradeActivationReportToSelfExtending({status:'REJECTED',reason:'LICENSE_INCOMPATIBLE_OR_UNVERIFIED'});assert.equal(rejected.status,'REJECTED');assert.equal(rejected.self_extension.reason,'TERMINAL_REJECTION_RETAINED');
});
