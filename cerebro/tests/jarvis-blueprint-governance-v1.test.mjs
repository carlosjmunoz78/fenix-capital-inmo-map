import test from 'node:test';
import assert from 'node:assert/strict';
import {governBlueprintRecord,CANONICAL_HUMAN_REQUIRED} from '../runtime/jarvis-blueprint-governance-v1.mjs';

test('free-form model approval requests are advisory, not active HUMAN_REQUIRED',()=>{const r=governBlueprintRecord({program_id:'P01',phase:'DESIGN',blueprint:{existing_to_reuse:[],human_required:['approve prod promotion','sign off thresholds']}});assert.equal(r.active_human_required,null);assert.equal(r.blueprint.human_required,null);assert.deepEqual(r.model_advisory_approvals,['approve prod promotion','sign off thresholds']);assert.deepEqual(r.model_canonical_human_required_candidates,[]);});

test('even canonical model suggestion is candidate only until deterministic policy raises it',()=>{const r=governBlueprintRecord({program_id:'P04',phase:'DESIGN',blueprint:{security:[],human_required:'HIGH_RISK'}});assert.equal(r.active_human_required,null);assert.deepEqual(r.model_canonical_human_required_candidates,['HIGH_RISK']);assert.equal(r.governance_rule,'MODEL_CANNOT_SELF_DECLARE_HUMAN_REQUIRED');});

test('canonical HUMAN_REQUIRED vocabulary remains exact',()=>{assert.deepEqual(CANONICAL_HUMAN_REQUIRED,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);});
