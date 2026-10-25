import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDailySpecialistLearningPlan} from '../learning/daily-specialist-learning-plan-v1.mjs';

test('all 192 enriched specialists issue one learning request each day',()=>{
  const plan=buildDailySpecialistLearningPlan({date:'2026-10-25'});
  assert.equal(plan.specialists,192);
  assert.equal(plan.role_request_count,192);
  assert.equal(new Set(plan.role_requests.map(x=>x.role_id)).size,192);
  assert.equal(plan.all_roles_request_learning_daily,true);
  assert.ok(plan.role_requests.every(x=>x.questions.length>=4));
});

test('central scout deduplicates role requests into fewer governed research jobs',()=>{
  const plan=buildDailySpecialistLearningPlan({date:'2026-10-25'});
  assert.ok(plan.deduplicated_job_count>0);
  assert.ok(plan.deduplicated_job_count<plan.role_request_count);
  assert.ok(plan.deduplicated_research_jobs.every(x=>x.consumer_role_ids.length>0));
  assert.ok(plan.deduplicated_research_jobs.every(x=>x.required_pipeline.includes('OLD_vs_NEW')&&x.required_pipeline.includes('tribunal')));
});

test('daily rotation changes specialist focus while preserving governance',()=>{
  const a=buildDailySpecialistLearningPlan({date:'2026-10-25'});
  const b=buildDailySpecialistLearningPlan({date:'2026-10-26'});
  assert.notEqual(a.plan_hash,b.plan_hash);
  assert.ok(a.role_requests.some((x,i)=>x.primary_section!==b.role_requests[i].primary_section));
  for(const plan of [a,b]){
    assert.equal(plan.knowledge_auto_promotion,false);
    assert.equal(plan.prod_write_authorized,false);
    assert.equal(plan.spend_authorized,false);
    assert.equal(plan.additional_cost_eur,0);
    assert.ok(plan.role_requests.every(x=>x.auto_promote===false&&x.tool_execution_authorized===false));
  }
});

test('12-day rotation exposes every deep knowledge section for each role',()=>{
  const seen=new Map();
  for(let day=25;day<=36;day++){
    const date=new Date(Date.UTC(2026,9,day)).toISOString().slice(0,10);
    const plan=buildDailySpecialistLearningPlan({date});
    for(const req of plan.role_requests){const s=seen.get(req.role_id)??new Set();s.add(req.primary_section);seen.set(req.role_id,s);}
  }
  assert.equal(seen.size,192);
  assert.ok([...seen.values()].every(s=>s.size===12));
});
