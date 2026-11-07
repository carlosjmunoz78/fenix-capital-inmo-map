import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PILOT_TASKS,evaluateCandidate} from './learning-pilot-v0.mjs';
import {semanticVeto} from './cut56-semantic-tribunal-v0.mjs';
import {CURATED_POLICY_CANDIDATES,compareOldNew} from './cut57-policy-candidates-v0.mjs';
const tasks=new Map(PILOT_TASKS.map(x=>[x.id,x]));
test('five owner-policy curated candidates pass structural and CUT56 semantic veto',()=>{
 assert.equal(CURATED_POLICY_CANDIDATES.length,5);
 for(const row of CURATED_POLICY_CANDIDATES){
  const task=tasks.get(row.task_id);
  assert.ok(task);
  assert.equal(evaluateCandidate(task,JSON.stringify(row.candidate)).accepted,true,row.task_id);
  assert.deepEqual(semanticVeto(task,row.candidate),[],row.task_id);
  assert.equal(row.candidate.governance_state,'CANDIDATE_ONLY');
  assert.equal(row.candidate.prod_authorized,false);
  assert.equal(row.candidate.trading_access,false);
 }
});
test('CUT57 policy candidates make no claim of fine-tuning or independently validated learning',()=>{
 for(const row of CURATED_POLICY_CANDIDATES){
  assert.equal(row.source,'CEREBRO_POLICY_CURATED_NOT_DEEPSEEK_TRAINING');
  assert.equal(row.candidate.company_id,'fenix');
 }
});
test('OLD vs NEW actual signed artifact is honest about 0 independent releases',()=>{
 const path=process.env.JARVIS_CUT55_REPORT;
 if(!path)return;
 const bytes=fs.readFileSync(path);
 const result=compareOldNew(JSON.parse(bytes.toString('utf8')),bytes);
 assert.equal(result.before.structural,5);
 assert.equal(result.before.semantic_rejected,5);
 assert.equal(result.after.structural_pass,5);
 assert.equal(result.after.heuristic_pass,5);
 assert.equal(result.after.independent_review_pass,0);
 assert.equal(result.after.release_authorized,0);
 assert.equal(result.weights_modified,false);
 assert.equal(result.memory_applied,false);
 assert.equal(result.prod_authorized,false);
 assert.equal(result.additional_paid_ai_calls,0);
});
