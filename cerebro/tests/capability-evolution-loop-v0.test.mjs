import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  loadCapabilityEvolutionRegistry,
  normalizeCapabilityManifest,
  registerCapability,
  capabilitiesForCompany,
  chooseZeroCostRoute,
  analyzeCapabilityImpact,
  buildCapabilityTrialPlan,
  evaluateCapabilityTrial,
  buildCapabilityLearningReport,
  activatePreprodBinding,
  rollbackCapabilityBinding,
  capabilityEvolutionStatus,
  CAPABILITY_EVOLUTION_LOOP_V0_CONTRACT
} from '../runtime/capability-evolution-loop.mjs';
import {loadDomainPolicyRegistry} from '../runtime/rsi-domain-policy-registry.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ENGINE_REGISTRY_PATH=path.resolve(HERE,'../registry/engine-registry.seed.json');
const engines=JSON.parse(fs.readFileSync(ENGINE_REGISTRY_PATH,'utf8'));
const policies=loadDomainPolicyRegistry();

function manifest(overrides={}){
  return {
    capability_id:'skill.test.analysis',version:'1.0.0',source_type:'SKILL',source_ref:'skills://test/analysis/skill.md',environment:'LAB',
    company_scope:['fenix'],capability_tags:['analysis-test'],capabilities_provided:['structured_analysis'],compatible_engine_ids:['LRN-001'],compatible_domain_ids:[],
    risk_class:'LOW',confidence:0.95,evidence_refs:['git:test-fixture'],rollback_ref:'git:rollback-test-fixture',rebuild_ref:'runbook:rebuild-test-fixture',
    permissions:{read_scopes:['preprod:evidence'],write_scopes:['preprod:candidate'],prod_write:false,trading_access:false,permission_elevation:false},
    execution_options:[
      {route_id:'paid-route',kind:'API',cost_eur:1,deterministic:false,existing_tool:false,priority:1},
      {route_id:'free-existing',kind:'LOCAL',cost_eur:0,deterministic:true,existing_tool:true,priority:10},
      {route_id:'free-nondeterministic',kind:'LOCAL',cost_eur:0,deterministic:false,existing_tool:true,priority:1}
    ],...overrides
  };
}

function autoTarget(engine_id='LRN-001'){
  const p=policies.policies.find(x=>x.engine_id===engine_id);
  assert.ok(p,`policy missing for ${engine_id}`);
  return {company_id:'fenix',engine_id:p.engine_id,domain_id:p.domain_id,route:'EXTEND_EXISTING',policy_mode:p.autonomy_mode,policy_id:p.policy_id,min_confidence:p.min_confidence,allowed_risk_classes:p.allowed_risk_classes,automatic_rollback_allowed:p.automatic_rollback_allowed,kill_switch_enabled:p.kill_switch_enabled};
}

function metrics(overrides={}){return {quality_score:0.80,cost_eur:0,latency_ms:100,error_rate:0.05,safety_score:1,...overrides};}

test('duplicate capability registration is idempotent and immutable',()=>{
  const seed=loadCapabilityEvolutionRegistry();
  const first=registerCapability(seed,manifest());
  assert.equal(first.decision,'REGISTERED');
  const second=registerCapability(first.registry,manifest());
  assert.equal(second.decision,'DUPLICATE_NOOP');
  assert.equal(second.registry.records.length,1);
  const conflict=registerCapability(first.registry,manifest({source_ref:'skills://test/changed/skill.md'}));
  assert.equal(conflict.decision,'HOLD_VERSION_IMMUTABILITY_CONFLICT');
  assert.equal(conflict.human_required,'POLICY_CONFLICT');
});

test('company scopes are isolated in the registry',()=>{
  const seed=loadCapabilityEvolutionRegistry();
  const a=registerCapability(seed,manifest({company_scope:['company-a'],compatible_engine_ids:['APP-001']}));
  assert.equal(capabilitiesForCompany(a.registry,'company-a').length,1);
  assert.equal(capabilitiesForCompany(a.registry,'company-b').length,0);
  const denied=analyzeCapabilityImpact(a.manifest,{company_id:'company-b',policy_registry:policies});
  assert.equal(denied.decision,'HOLD_COMPANY_SCOPE');
});

test('direct PROD capability mutation is denied before trial',()=>{
  const plan=buildCapabilityTrialPlan(manifest(),{company_id:'fenix',requested_environment:'PROD',policy_registry:policies});
  assert.equal(plan.ok,false);
  assert.equal(plan.decision,'HOLD_DIRECT_PROD_DENIED');
  assert.equal(plan.prod_authorized,false);
  assert.equal(plan.human_required,null);
});

test('zero-cost deterministic existing route wins over paid and weaker free routes',()=>{
  const m=normalizeCapabilityManifest(manifest());
  const route=chooseZeroCostRoute(m);
  assert.equal(route.ok,true);
  assert.equal(route.route.route_id,'free-existing');
  assert.equal(route.route.cost_eur,0);
});

test('high risk and low confidence map only to canonical HUMAN_REQUIRED reasons',()=>{
  const hi=buildCapabilityTrialPlan(manifest({risk_class:'HIGH'}),{company_id:'fenix',policy_registry:policies});
  assert.equal(hi.human_required,'HIGH_RISK');
  const low=buildCapabilityTrialPlan(manifest({confidence:0.40}),{company_id:'fenix',policy_registry:policies});
  assert.equal(low.human_required,'LOW_CONFIDENCE');
});

test('measured regression fails closed to rollback/HOLD',()=>{
  const m=normalizeCapabilityManifest(manifest());
  const e=evaluateCapabilityTrial({manifest:m,target:autoTarget(),baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.70,latency_ms:130}),evidence_refs:['trial:regression'],observed_at:'2026-10-09T12:00:00Z'});
  assert.equal(e.decision,'ROLLBACK_HOLD');
  assert.equal(e.ok,false);
  assert.ok(e.regressions.includes('QUALITY_REGRESSION'));
  assert.equal(e.next_gate,'ROLLBACK_PREVIOUS_BINDING');
});

test('measured improvement becomes PREPROD candidate only in autonomous domain',()=>{
  const m=normalizeCapabilityManifest(manifest());
  const target=autoTarget('LRN-001');
  assert.equal(target.policy_mode,'PREPROD_AUTONOMOUS');
  const e=evaluateCapabilityTrial({manifest:m,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90,latency_ms:80,error_rate:0.02}),evidence_refs:['trial:improved'],observed_at:'2026-10-09T12:01:00Z'});
  assert.equal(e.decision,'PREPROD_CANDIDATE_PROMOTION');
  assert.equal(e.ok,true);
  assert.equal(e.prod_binding_authorized,false);
});

test('capability impacting a canonical engine extends existing before factory creation',()=>{
  const m=normalizeCapabilityManifest(manifest({compatible_engine_ids:['MKT-001'],capability_tags:['creative-test']}));
  const impact=analyzeCapabilityImpact(m,{company_id:'fenix',policy_registry:policies});
  assert.equal(impact.decision,'EXTEND_EXISTING');
  assert.equal(impact.impacts.some(x=>x.engine_id==='MKT-001'),true);
  assert.equal(impact.fact001_gap_candidate,null);
});

test('no compatible existing engine emits FACT-001 gap candidate without creating an engine',()=>{
  const m=normalizeCapabilityManifest(manifest({compatible_engine_ids:[],compatible_domain_ids:[],capability_tags:['totally-unique-capability-xyz']}));
  const impact=analyzeCapabilityImpact(m,{company_id:'fenix',policy_registry:policies});
  assert.equal(impact.decision,'FACT001_GAP_CANDIDATE');
  assert.equal(impact.fact001_gap_candidate.engine_creation_authorized,false);
  assert.equal(impact.fact001_gap_candidate.registry_mutation_authorized,false);
  assert.equal(impact.human_required,null);
});

test('capability trial evidence is emitted into existing universal LRN-001 ingress',()=>{
  const m=normalizeCapabilityManifest(manifest());
  const target=autoTarget();
  const evaluation=evaluateCapabilityTrial({manifest:m,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['trial:learning'],observed_at:'2026-10-09T12:02:00Z'});
  const report=buildCapabilityLearningReport({manifest:m,target,evaluation});
  assert.equal(report.events_total,1);
  assert.equal(report.events[0].engine_id,'LRN-001');
  assert.equal(report.events[0].source_type,'TRIBUNAL_DECISION');
  assert.equal(report.events[0].payload.capability_id,m.capability_id);
  assert.equal(report.events[0].prod_authorized,false);
});

test('binding activation requires registered capability, exact evaluation identity and current domain policy',()=>{
  const seed=loadCapabilityEvolutionRegistry();
  const target=autoTarget('LRN-001');
  const raw=manifest();
  const m=normalizeCapabilityManifest(raw);
  const evaluation=evaluateCapabilityTrial({manifest:m,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['trial:binding-integrity'],observed_at:'2026-10-09T12:02:30Z'});
  const unregistered=activatePreprodBinding(seed,{manifest:m,target,evaluation,policy_registry:policies});
  assert.equal(unregistered.decision,'HOLD_CAPABILITY_NOT_REGISTERED');
  const registered=registerCapability(seed,raw);
  const mismatched=activatePreprodBinding(registered.registry,{manifest:registered.manifest,target,evaluation:{...evaluation,engine_id:'AUTO-001'},policy_registry:policies});
  assert.equal(mismatched.decision,'HOLD_EVALUATION_SCOPE_MISMATCH');
  const badId=activatePreprodBinding(registered.registry,{manifest:registered.manifest,target,evaluation:{...evaluation,evaluation_id:'capeval:000000000000000000000000'},policy_registry:policies});
  assert.equal(badId.decision,'HOLD_EVALUATION_INTEGRITY');
  assert.equal(badId.human_required,'POLICY_CONFLICT');
  const seoPolicy=autoTarget('SEO-001');
  const forgedAutoTarget={...seoPolicy,policy_mode:'PREPROD_AUTONOMOUS'};
  const seoRaw=manifest({capability_id:'skill.test.seo',compatible_engine_ids:['SEO-001']});
  const seoRegistered=registerCapability(seed,seoRaw);
  const seoEval=evaluateCapabilityTrial({manifest:seoRegistered.manifest,target:forgedAutoTarget,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['trial:seo-forged-auto'],observed_at:'2026-10-09T12:02:40Z'});
  assert.equal(seoEval.decision,'PREPROD_CANDIDATE_PROMOTION');
  const currentPolicyBlock=activatePreprodBinding(seoRegistered.registry,{manifest:seoRegistered.manifest,target:forgedAutoTarget,evaluation:seoEval,policy_registry:policies});
  assert.equal(currentPolicyBlock.decision,'HOLD_BINDING_NOT_AUTHORIZED');
});

test('repeated identical binding activation is an idempotent no-op and rollback still removes first binding',()=>{
  const target=autoTarget();
  const registered=registerCapability(loadCapabilityEvolutionRegistry(),manifest());
  const m=registered.manifest;
  const evaluation=evaluateCapabilityTrial({manifest:m,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['trial:idempotent-binding'],observed_at:'2026-10-09T12:02:50Z'});
  const first=activatePreprodBinding(registered.registry,{manifest:m,target,evaluation,policy_registry:policies});
  assert.equal(first.decision,'PREPROD_BINDING_ACTIVE');
  assert.equal(first.registry.binding_history.length,1);
  const second=activatePreprodBinding(first.registry,{manifest:m,target,evaluation,policy_registry:policies});
  assert.equal(second.decision,'DUPLICATE_NOOP');
  assert.equal(second.registry.binding_history.length,1);
  const rb=rollbackCapabilityBinding(second.registry,{company_id:'fenix',engine_id:'LRN-001',capability_id:m.capability_id});
  assert.equal(rb.decision,'ROLLBACK_RESTORED_PREVIOUS_BINDING');
  assert.equal(rb.restored_binding,null);
  assert.equal(rb.registry.bindings.length,0);
});

test('rollback restores previous capability binding',()=>{
  let registry=loadCapabilityEvolutionRegistry();
  const target=autoTarget();
  const reg1=registerCapability(registry,manifest({version:'1.0.0'}));registry=reg1.registry;const m1=reg1.manifest;
  const e1=evaluateCapabilityTrial({manifest:m1,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['trial:v1'],observed_at:'2026-10-09T12:03:00Z'});
  const a1=activatePreprodBinding(registry,{manifest:m1,target,evaluation:e1,policy_registry:policies});
  assert.equal(a1.decision,'PREPROD_BINDING_ACTIVE');registry=a1.registry;
  const reg2=registerCapability(registry,manifest({version:'1.1.0',source_ref:'skills://test/analysis/v1.1/skill.md'}));registry=reg2.registry;const m2=reg2.manifest;
  const e2=evaluateCapabilityTrial({manifest:m2,target,baseline_metrics:metrics({quality_score:0.90}),candidate_metrics:metrics({quality_score:0.95}),evidence_refs:['trial:v2'],observed_at:'2026-10-09T12:04:00Z'});
  const a2=activatePreprodBinding(registry,{manifest:m2,target,evaluation:e2,policy_registry:policies});registry=a2.registry;
  assert.equal(registry.bindings[0].capability_version,'1.1.0');
  const rb=rollbackCapabilityBinding(registry,{company_id:'fenix',engine_id:'LRN-001',capability_id:m1.capability_id});
  assert.equal(rb.decision,'ROLLBACK_RESTORED_PREVIOUS_BINDING');
  assert.equal(rb.restored_binding.capability_version,'1.0.0');
  assert.equal(rb.registry.bindings[0].capability_version,'1.0.0');
});

test('same manifest and evidence produce deterministic fingerprints, impact and evaluation IDs',()=>{
  const a=normalizeCapabilityManifest(manifest()),b=normalizeCapabilityManifest(manifest());
  assert.equal(a.manifest_fingerprint,b.manifest_fingerprint);
  const ia=analyzeCapabilityImpact(a,{company_id:'fenix',policy_registry:policies});
  const ib=analyzeCapabilityImpact(b,{company_id:'fenix',policy_registry:policies});
  assert.deepEqual(ia,ib);
  const target=autoTarget();
  const ea=evaluateCapabilityTrial({manifest:a,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['same'],observed_at:'2026-10-09T12:05:00Z'});
  const eb=evaluateCapabilityTrial({manifest:b,target,baseline_metrics:metrics(),candidate_metrics:metrics({quality_score:0.90}),evidence_refs:['same'],observed_at:'2026-10-09T12:05:00Z'});
  assert.equal(ea.evaluation_id,eb.evaluation_id);
});

test('every canonical engine can be an explicit capability target while unregistered domains remain fail-closed',()=>{
  const m=normalizeCapabilityManifest(manifest({compatible_engine_ids:[...engines.engine_ids],capability_tags:['universal-explicit-target']}));
  const impact=analyzeCapabilityImpact(m,{company_id:'fenix',policy_registry:policies});
  assert.equal(impact.decision,'EXTEND_EXISTING');
  assert.equal(impact.impacts.length,engines.engine_ids.length);
  assert.equal(impact.impacts.some(x=>x.policy_mode==='UNREGISTERED_FAIL_CLOSED'),true);
  assert.equal(CAPABILITY_EVOLUTION_LOOP_V0_CONTRACT.any_canonical_engine_can_be_target,true);
  assert.equal(CAPABILITY_EVOLUTION_LOOP_V0_CONTRACT.new_engine_id_created,false);
});

test('status certificate preserves zero-cost, no-PROD, no-new-engine boundaries',()=>{
  const s=capabilityEvolutionStatus(loadCapabilityEvolutionRegistry());
  assert.equal(s.status,'CAPABILITY_EVOLUTION_LOOP_V0_READY');
  assert.equal(s.direct_prod_binding_allowed,false);
  assert.equal(s.engine_creation_directly_authorized,false);
  assert.equal(s.additional_cost_eur,0);
  assert.equal(s.multi_company_ready,true);
  assert.equal(s.multicompany_runtime_activation,false);
});
