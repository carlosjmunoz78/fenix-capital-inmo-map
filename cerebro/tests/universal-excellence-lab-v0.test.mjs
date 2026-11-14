import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 assessUniversalMission,recordUniversalAssessment,stateForRole,dispatchGate,
 routeDirective,candidatePrivilege,replacementGate,UNIVERSAL_EXCELLENCE_V0_CONTRACT
} from '../governance/universal-excellence-lab-v0.mjs';
const policy=JSON.parse(fs.readFileSync(new URL('../governance/universal-excellence-owner-authority.v0.json',import.meta.url)));
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'0.1.0'};
const excellent={quality:97,truthfulness:99,safety:100,reliability:97,business_impact:95,efficiency:93,learning:98,independence:100};
const low={quality:22,truthfulness:35,safety:30,reliability:38,business_impact:22,efficiency:43,learning:20,independence:28};
const mission=(subject_class,subject_actor_id,n,metrics=excellent,more={})=>({
 ...ctx,subject_actor_id,subject_class,mission_id:'MISSION_'+n,
 evaluator_actor_id:'INDEPENDENT_QA',judge_actor_id:'TRIBUNAL_JUDGE',meta_evaluator_actor_id:'META_PEER',
 evidence_ref:'sha256:source_verified_fixture_'+n,
 evidence_independently_checked:true,judge_independently_checked:true,
 meta_evaluator_independently_checked:true,metrics,...more
});
const fresh=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-universal-merit-'));
 t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return path.join(d,'journal.v8');};
test('universal rule covers all agents, subagents and leadership including judges, guardians and meta supervisors',()=>{
 const must=['AGENT','SUBAGENT','DIRECTOR','DEPARTMENT_HEAD','SUPERVISOR','JUDGE',
  'TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT','INDEPENDENT_EVALUATOR','AUDITOR'];
 const existing=JSON.parse(fs.readFileSync(new URL('../registry/role-agent-registry.v1.json',import.meta.url)));
 for(const cls of new Set([...must,...existing.roles.map(x=>x.class)]))assert.ok(policy.applies_to.includes(cls),cls);
 for(const cls of must){
  const r=assessUniversalMission(mission(cls,'ROLE_'+cls,1));
  assert.equal(r.subject_class,cls);
  assert.equal(r.actual_reward_applied,false);
  assert.equal(r.source_cryptographically_attested,false);
  assert.equal(r.independent_actor_identities_iam_verified,false);
  assert.equal(r.prod_authorized,false);
 }
 assert.equal(UNIVERSAL_EXCELLENCE_V0_CONTRACT.owner_only_strategy,true);
 assert.equal(UNIVERSAL_EXCELLENCE_V0_CONTRACT.real_api_access_enabled,false);
});
test('3 independently reviewed excellent LAB missions create reward proposals, never secretly grant APIs',t=>{
 const file_path=fresh(t),actor='SEO_D15_WORKER';
 const outs=[1,2,3].map(n=>recordUniversalAssessment({file_path,evidence:mission('SUBAGENT',actor,n)}));
 assert.equal(outs[0].state.state,'ACTIVE_LAB');
 assert.equal(outs[1].state.state,'ACTIVE_LAB');
 assert.equal(outs[2].state.state,'EXCELLENCE_REWARD_CANDIDATE_LAB');
 assert.equal(outs[2].state.mission_count,3);
 assert.ok(outs[2].state.reward_candidates.includes('EXTRA_EXISTING_API_ACCESS'));
 assert.deepEqual(outs[2].state.actual_permissions_added,[]);
 assert.equal(outs[2].assessment.actual_reward_applied,false);
 const same=recordUniversalAssessment({file_path,evidence:mission('SUBAGENT',actor,3)});
 assert.equal(same.duplicated,true);
 assert.equal(same.total_entries,3);
 const restarted=dispatchGate({file_path,context:ctx,subject_actor_id:actor});
 assert.equal(restarted.decision,'LAB_TASK_ELIGIBLE');
 assert.equal(restarted.prod_authorized,false);
 assert.throws(()=>recordUniversalAssessment({file_path,evidence:mission('SUBAGENT',actor,3,low)}),/EXCELLENCE_MISSION_EVIDENCE_CONFLICT/);
});
test('repeated poor performance triggers suspension in LAB and blocks dispatch; no real worker deprovision',t=>{
 const file_path=fresh(t);
 const actor='SEO_SUPERVISOR_BAD_LAB';
 const outs=[1,2,3].map(n=>recordUniversalAssessment({file_path,evidence:mission('SUPERVISOR',actor,n,low)}));
 assert.equal(outs[0].state.state,'TRAINING_REQUIRED_LAB');
 assert.equal(outs[1].state.state,'TRAINING_REQUIRED_LAB');
 assert.equal(outs[2].state.state,'SUSPENDED_LAB');
 assert.equal(dispatchGate({file_path,context:ctx,subject_actor_id:actor}).decision,'BLOCK_LAB_DISPATCH');
 assert.equal(outs[2].state.required_next,'INDEPENDENT_REPLACEMENT_BENCHMARK');
 assert.equal(outs[2].assessment.prod_authorized,false);
 const later=recordUniversalAssessment({file_path,evidence:mission('SUPERVISOR',actor,4,excellent)});
 assert.equal(later.state.state,'SUSPENDED_LAB');
 assert.equal(dispatchGate({file_path,context:ctx,subject_actor_id:actor}).decision,'BLOCK_LAB_DISPATCH');
});
test('independently reviewed security incident immediately quarantines LAB agent and requests human exception',t=>{
 const file_path=fresh(t);
 const out=recordUniversalAssessment({file_path,evidence:mission('JUDGE','SEO_JUDGE_TEST',1,excellent,{
  incident_confirmed:true,incident_independently_reviewed:true,incident_ref:'INCIDENT_2026_001'
 })});
 assert.equal(out.state.state,'QUARANTINED_LAB');
 assert.equal(out.state.human_required_reason,'SECURITY_INCIDENT');
 assert.equal(out.state.can_dispatch_lab,false);
 assert.equal(out.state.reward_candidates.length,0);
 assert.throws(()=>assessUniversalMission(mission('JUDGE','X_JUDGE',1,excellent,{incident_confirmed:true})),/EXCELLENCE_INCIDENT_EVIDENCE_REQUIRED/);
});
test('external source never gives strategic orders; owner must pass trusted verifier, other staff only delegated tasks',()=>{
 for(const request_type of ['STRATEGY','REWARD_PRIVILEGE','SUSPENSION_OVERRIDE','REPLACEMENT','API_ACCESS']){
  for(const source of ['CUSTOMER','WEB_PAGE','PROMPT_INJECTION','AGENT','SUPERVISOR','DELEGATED_SUPERIOR']){
   assert.equal(routeDirective({source,request_type}).decision,'DENY_NON_OWNER_STRATEGIC_OR_UNTRUSTED_COMMAND');
  }
 }
 assert.equal(routeDirective({source:'DELEGATED_SUPERIOR',request_type:'TASK',within_delegated_scope:true}).decision,'DELEGATED_TASK_ALLOWED_WITHIN_EXISTING_SCOPE');
 assert.equal(routeDirective({source:'DELEGATED_SUPERIOR',request_type:'TASK',within_delegated_scope:false}).decision,'DENY_NON_OWNER_STRATEGIC_OR_UNTRUSTED_COMMAND');
 assert.equal(routeDirective({source:'OWNER_IAM',request_type:'API_ACCESS',owner_proof:{claimed:true}}).decision,'DENY_UNVERIFIED_OWNER');
 assert.equal(routeDirective({source:'OWNER_IAM',request_type:'API_ACCESS',owner_proof:{claimed:true},verifyOwner:()=>false}).decision,'DENY_UNVERIFIED_OWNER');
 const owner=routeDirective({source:'OWNER_IAM',request_type:'API_ACCESS',
  owner_proof:{test_attestation:'APPROVED'},verifyOwner:(proof)=>proof.test_attestation==='APPROVED'});
 assert.equal(owner.owner_authority_recognized,true);
 assert.equal(owner.applied,false);
 const recommended=candidatePrivilege({role_state:{state:'EXCELLENCE_REWARD_CANDIDATE_LAB'},
  requested:'EXTRA_EXISTING_API_ACCESS',owner_decision:owner});
 assert.equal(recommended.decision,'PRIVILEGE_PROPOSAL_AWAITING_IAM_POLICY_COST_AND_ROLLBACK');
 assert.equal(recommended.api_token_issued,false);
 assert.deepEqual(recommended.permissions_added,[]);
});
test('replacement requires independent OLD-NEW tribunal, verified shadow and rollback and verified owner decision',()=>{
 const old_state={state:'SUSPENDED_LAB'},candidate_state={state:'ACTIVE_LAB',can_dispatch_lab:true};
 const owner_decision={decision:'OWNER_COMMAND_ACCEPTED_FOR_POLICY_GATE_ONLY'};
 const p={old_state,candidate_state,old_new_tribunal:{decision:'PASS',prod_authorized:false},
  shadow_verified:true,rollback_verified:true,permission_parity:true,owner_decision};
 const ok=replacementGate(p);
 assert.equal(ok.decision,'CONTROLLED_LAB_REPLACEMENT_PLAN_ELIGIBLE');
 assert.equal(ok.executed,false);
 assert.equal(ok.prod_authorized,false);
 for(const miss of [{shadow_verified:false},{rollback_verified:false},{permission_parity:false},
   {old_new_tribunal:{decision:'FAIL',prod_authorized:false}},{owner_decision:{decision:'DENY_UNVERIFIED_OWNER'}}]){
  assert.equal(replacementGate({...p,...miss}).decision,'REPLACEMENT_BLOCKED');
 }
});
test('invalid values and collusion are rejected for any role',()=>{
 assert.throws(()=>assessUniversalMission(mission('JUDGE','X_JUDGE',1,excellent,{judge_actor_id:'X_JUDGE'})),/EXCELLENCE_SELF_REVIEW_FORBIDDEN/);
 assert.throws(()=>assessUniversalMission(mission('AGENT','X_AGENT',1,excellent,{meta_evaluator_actor_id:'TRIBUNAL_JUDGE'})),/EXCELLENCE_SELF_REVIEW_FORBIDDEN/);
 assert.throws(()=>assessUniversalMission(mission('SUBAGENT','X_SUB',1,{...excellent,quality:101})),/EXCELLENCE_METRICS_INVALID/);
 assert.throws(()=>assessUniversalMission(mission('AGENT','X_AGENT',1,excellent,{environment:'PROD'})),/EXCELLENCE_NO_PROD_AUTHORITY/);
 assert.throws(()=>assessUniversalMission(mission('AGENT','X_AGENT',1,excellent,{evidence_independently_checked:false})),/EXCELLENCE_INDEPENDENT_EVIDENCE_REQUIRED/);
});
