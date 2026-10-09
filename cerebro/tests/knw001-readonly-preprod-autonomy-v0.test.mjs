import test from 'node:test';
import assert from 'node:assert/strict';
import {KNW001_READONLY_AUTONOMY_V0_CONTRACT,runKnwReadonlyAutonomyGate,validateKnwReadonlyEvidence} from '../runtime/knw001-readonly-preprod-autonomy-gate.mjs';

const smoke={workflow_name:'PROD Runtime Smoke',run_id:37904468995,head_sha:'9d3db73d6653db10d37530d2027f578941f60c23',head_branch:'main',conclusion:'success',observed_at:'2026-10-09T08:21:56Z'};

test('KNW live read-only evidence meets exact policy threshold',()=>{const r=validateKnwReadonlyEvidence({runtime_smoke:smoke});assert.equal(r.ok,true);assert.equal(r.capability,'READONLY_REVIEW_PREPARATION');assert.equal(r.evidence_confidence,0.85);assert.equal(r.policy_min_confidence,0.85);assert.equal(r.prod_authorized,false);});

test('KNW read-only capability passes OLD vs NEW tribunal and B4 without whole-domain autonomy',async()=>{const r=await runKnwReadonlyAutonomyGate({runtime_smoke:smoke});assert.equal(r.ok,true);assert.equal(r.status,'KNW001_READONLY_CAPABILITY_PREPROD_GREEN');assert.equal(r.b3_decision,'APPROVE_PREPROD_NEXT_STAGE');assert.equal(r.tribunal_decision,'PASS');assert.equal(r.b4_decision,'KEEP_NONPROD_AND_RELEARN');assert.equal(r.whole_domain_autonomy,false);assert.equal(r.domain_autonomy_mode,'ASSISTED');assert.equal(r.capability_autonomy_mode,'PREPROD_AUTONOMOUS');assert.equal(r.human_classification_approval_required,true);assert.equal(r.prod_authorized,false);assert.equal(r.prod_write_authorized,false);assert.equal(r.trading_access,false);assert.equal(r.additional_cost_eur,0);});

test('missing or failed runtime smoke holds silently',()=>{for(const s of [null,{...smoke,conclusion:'failure'}]){const r=validateKnwReadonlyEvidence({runtime_smoke:s});assert.equal(r.ok,false);assert.equal(r.decision,'HOLD');assert.equal(r.human_required,null);}});

test('HIGH risk and nonzero cost remain canonical human exceptions',async()=>{const high=await runKnwReadonlyAutonomyGate({runtime_smoke:smoke,risk_class:'HIGH'});assert.equal(high.decision,'HUMAN_REQUIRED');assert.equal(high.human_required,'HIGH_RISK');const money=await runKnwReadonlyAutonomyGate({runtime_smoke:smoke,additional_cost_eur:1});assert.equal(money.decision,'HUMAN_REQUIRED');assert.equal(money.human_required,'MONEY_LIMIT');});

test('contract explicitly preserves human knowledge decisions and authority boundaries',()=>{assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.whole_domain_autonomy,false);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.human_classification_approval_required,true);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.prod_authorized,false);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.prod_write_authorized,false);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.trading_access,false);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.multicompany_continuation,false);assert.equal(KNW001_READONLY_AUTONOMY_V0_CONTRACT.additional_cost_target_eur,0);});
