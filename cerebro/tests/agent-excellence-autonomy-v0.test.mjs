import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSelfInitiatedWorkV0,evaluateAgentExcellenceV0,AGENT_EXCELLENCE_V0} from './agent-excellence-autonomy-v0.mjs';
const NOW='2026-11-05T10:00:00Z';
const agent = {agent_id:'SEO-DRAFT-01',supervisor_id:'CEREBRO-SUP-01',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',enabled:true};
const supervisor={supervisor_id:'CEREBRO-SUP-01',role:'CEREBRO_SUPERVISOR',active:true,attested_by_runtime:true,company_id:'fenix'};
const context={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'};
const task={origin:'AGENT_SELF_INITIATED',task_id:'seo-fix-1000',reason:'Broken draft link detected',evidence_refs:['sha256:proof1'],risk:'LOW',confidence:0.97,estimated_additional_cost_eur:0,capability:'DRAFT_INTERNAL_CONTENT',idempotency_key:'seo-fix-1000-once',rollback_ref:'runbook:rollback-1',verification_plan_ref:'qa:readback-1'};
const grant={issuer:'OWNER_APPROVED_POLICY',owner_principal:'OWNER_ONLY',owner_approved:true,verified_by_gateway:true,policy_ref:'policy:seo-draft-only',agent_id:agent.agent_id,supervisor_id:supervisor.supervisor_id,company_id:context.company_id,engine_id:context.engine_id,environment:context.environment,version:context.version,allowed_capabilities:['DRAFT_INTERNAL_CONTENT'],max_additional_cost_eur:0,expires_at:'2026-11-06T12:00:00Z'};
const input={agent,supervisor,context,task,grant,now:NOW};
const decision=(changes={})=>evaluateSelfInitiatedWorkV0({...input,...changes});
const observed=(changes={})=>evaluateAgentExcellenceV0({agent,supervisor,review:{judge_id:'INDEPENDENT-JUDGE-1',company_id:'fenix',approved_evidence:true,evidence_attested_by_runtime:true,evidence_bundle_hash:'sha256:independent-evidence',independent_tribunal_pass:true},evidence:{verified_samples:100,verified_successes:99,quality_score:0.98,security_incidents:0,policy_violations:0,real_world_regressions:0,failed_rollback:0},...changes});

test('legitimate low-risk agent-initiated draft routes, does not execute',()=>{
 const v=decision();assert.equal(v.decision,'ROUTE_TO_EXISTING_GOVERNED_EXECUTOR');assert.equal(v.executor_authorized,false);assert.equal(v.prod_authorized,false);assert.equal(v.owner_policy_ref,grant.policy_ref);
});
for (const [name,mutate,expected] of [
 ['no original authorization',{grant:{...grant,owner_approved:false}},'HOLD'],
 ['unverified owner approval',{grant:{...grant,verified_by_gateway:false}},'HOLD'],
 ['unverified supervisor',{supervisor:{...supervisor,attested_by_runtime:false}},'HOLD'],
 ['wrong owner principal',{grant:{...grant,owner_principal:'THIRD_PARTY'}},'HOLD'],
 ['cross tenant',{context:{...context,company_id:'other'}},'HOLD'],
 ['unattested supervisor',{supervisor:{...supervisor,active:false}},'HOLD'],
 ['revoked agent',{agent:{...agent,revoked:true}},'HOLD'],
 ['tripped kill switch',{supervisor:{...supervisor,kill_switch_active:true}},'HOLD'],
 ['no evidence',{task:{...task,evidence_refs:[]}},'HOLD'],
 ['wrong intent origin',{task:{...task,origin:'MODEL_TEXT'}},'HOLD'],
 ['remote pc side effects',{task:{...task,pc_remote_control:true}},'HOLD'],
 ['external publish',{task:{...task,external_write:true}},'HOLD'],
 ['arbitrary shell capability',{task:{...task,capability:'SHELL_EXECUTE'}},'HOLD'],
 ['unknown cost',{task:{...task,estimated_additional_cost_eur:NaN}},'HOLD'],
 ['non zero budget grant',{grant:{...grant,max_additional_cost_eur:1}},'HOLD'],
 ['expired grant',{grant:{...grant,expires_at:'2026-11-04T00:00:00Z'}},'HOLD'],
 ['missing semantic readback plan',{task:{...task,verification_plan_ref:null}},'HOLD'],
 ['trading engine',{context:{...context,engine_id:'TRAD-001'},agent:{...agent,engine_id:'TRAD-001'},grant:{...grant,engine_id:'TRAD-001'}},'HOLD'],
 ['prod environment',{context:{...context,environment:'PROD'},agent:{...agent,environment:'PROD'},grant:{...grant,environment:'PROD'}},'HOLD'],
 ['cost positive',{task:{...task,estimated_additional_cost_eur:1}},'HUMAN_REQUIRED'],
 ['low confidence',{task:{...task,confidence:0.5}},'HUMAN_REQUIRED'],
 ['high risk',{task:{...task,risk:'HIGH'}},'HUMAN_REQUIRED'],
 ['signature',{task:{...task,signature_required:true}},'HUMAN_REQUIRED'],
 ['human request',{task:{...task,customer_human_request:true}},'HUMAN_REQUIRED'],
 ['legal advice trigger',{task:{...task,legal_required:true}},'HUMAN_REQUIRED'],
 ['security incident',{task:{...task,security_incident:true}},'HUMAN_REQUIRED'],
 ['policy conflict',{task:{...task,policy_conflict:true}},'HUMAN_REQUIRED']
]) test(`self-initiative: ${name}`,()=>{const v=decision(mutate);assert.equal(v.decision,expected);assert.equal(v.executor_authorized,false)});

test('excellent agent is eligible for bounded reward proposals but receives no privileges',()=>{
 const v=observed();assert.equal(v.decision,'RECOMMEND_REWARD_CANDIDATES');assert.equal(v.privilege_change_applied,false);assert.equal(v.self_grant_authorized,false);assert.ok(v.reward_candidates.includes('ROLE_SPECIFIC_TRAINING'));
});
test('any security incident prevents excellence promotion',()=>{
 const v=observed({evidence:{verified_samples:100,verified_successes:100,quality_score:1,security_incidents:1,policy_violations:0,real_world_regressions:0,failed_rollback:0}});assert.equal(v.decision,'SUSPEND_CAPABILITY_AND_REVIEW');
});
test('policy violation prevents promotion',()=>{
 const v=observed({evidence:{verified_samples:100,verified_successes:100,quality_score:1,security_incidents:0,policy_violations:1,real_world_regressions:0,failed_rollback:0}});assert.equal(v.decision,'SUSPEND_CAPABILITY_AND_REVIEW');
});
test('low reliability recommends reversible replacement review, not an uninstall',()=>{
 const v=observed({evidence:{verified_samples:100,verified_successes:62,quality_score:0.8,security_incidents:0,policy_violations:0,real_world_regressions:0,failed_rollback:0}});assert.equal(v.decision,'RECOMMEND_REPLACEMENT_REVIEW');assert.ok(v.safe_replacement_stages.includes('OLD_VS_NEW'));assert.equal(v.privilege_change_applied,false);
});
test('unverified metrics insufficient for rewards',()=>{
 const v=observed({evidence:{verified_samples:2,verified_successes:2,quality_score:1,security_incidents:0,policy_violations:0,real_world_regressions:0,failed_rollback:0}});assert.equal(v.decision,'GATHER_MORE_EVIDENCE');
});
test('gaming with implausible successes fails closed',()=>{
 const v=observed({evidence:{verified_samples:30,verified_successes:31,quality_score:1,security_incidents:0,policy_violations:0,real_world_regressions:0,failed_rollback:0}});assert.equal(v.decision,'HOLD');
});
test('candidate never evaluates itself',()=>{
 const v=observed({review:{judge_id:agent.agent_id,company_id:'fenix',approved_evidence:true,evidence_attested_by_runtime:true,evidence_bundle_hash:'sha256:independent-evidence',independent_tribunal_pass:true}});assert.equal(v.decision,'HOLD');
});
test('regression despite good scores prevents reward',()=>{
 const v=observed({evidence:{verified_samples:100,verified_successes:100,quality_score:1,security_incidents:0,policy_violations:0,real_world_regressions:1,failed_rollback:0}});assert.equal(v.decision,'RETRAIN_AND_REEVALUATE');
});
test('no tribunal pass means no promotion',()=>{
 const v=observed({review:{judge_id:'INDEPENDENT-JUDGE-1',company_id:'fenix',approved_evidence:true,evidence_attested_by_runtime:true,evidence_bundle_hash:'sha256:independent-evidence',independent_tribunal_pass:false}});assert.notEqual(v.decision,'RECOMMEND_REWARD_CANDIDATES');
});
test('unknown or malformed inputs fail closed and immutable',()=>{
 for(const v of [null,undefined,{},[],123,'str']) {
  const r=evaluateSelfInitiatedWorkV0(v);assert.equal(r.decision,'HOLD');assert.equal(r.prod_authorized,false);
 }
 assert.equal(AGENT_EXCELLENCE_V0.principal,'OWNER_ONLY');assert.equal(AGENT_EXCELLENCE_V0.max_additional_cost_eur,0);
});

test('revoked agent cannot receive rewards',()=>{assert.equal(observed({agent:{...agent,revoked:true}}).decision,'HOLD');});
test('agent cannot submit its own merit proof',()=>{assert.equal(observed({review:{judge_id:'INDEPENDENT-JUDGE-1',company_id:'fenix',approved_evidence:true,evidence_attested_by_runtime:false,evidence_bundle_hash:'sha256:x',independent_tribunal_pass:true}}).decision,'HOLD');});