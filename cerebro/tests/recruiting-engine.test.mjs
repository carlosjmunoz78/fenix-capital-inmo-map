import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreCandidates} from '../hr/recruiting-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-002',environment:'PREPROD',version:'0.1.0'};
test('scores only job-relevant requirements',()=>{const r=scoreCandidates({context,authorized:true,confidence:.95,source_refs:['job:1'],requirements:[{field:'mortgage_experience',expected:true,weight:2},{field:'crm_skill',expected:true,weight:1}],candidates:[{id:'a',facts:{mortgage_experience:true,crm_skill:false}},{id:'b',facts:{mortgage_experience:true,crm_skill:true}}]});assert.equal(r.shortlist[0].candidate_id,'b');assert.equal(r.final_hiring_decision,false);assert.equal(r.human_approval_required,true);});
test('protected trait requirement is blocked',()=>{const r=scoreCandidates({context,authorized:true,confidence:.95,source_refs:['job:2'],requirements:[{field:'age',expected:30}],candidates:[]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');});
test('low confidence escalates',()=>{const r=scoreCandidates({context,authorized:true,confidence:.4,source_refs:['job:3'],requirements:[{field:'skill',expected:true}],candidates:[]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LOW_CONFIDENCE');});
