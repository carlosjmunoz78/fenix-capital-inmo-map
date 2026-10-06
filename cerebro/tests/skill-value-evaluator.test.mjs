import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateStaticSkillValue,operationalFitScore} from '../skills/skill-value-evaluator.mjs';

function fixtures({domain='software-engineering-devops',prelabState='STATIC_PRELAB_READY_INSTRUCTION_ONLY',overlapState='EXISTING_DOMAIN_OVERLAP',overlapScore=30,pushedAt='2026-10-01T00:00:00Z',name='github-ops',description='Review GitHub pull requests, CI checks, repositories and releases without direct production writes.',staticFlags=[]}={}){
  const wrappers={plans:[{
    candidate_id:'c1',wrapper_id:'skillwrap:c1',domain,engine_bindings:['FACT-001'],skill_class:'SHARED',
    provenance:{upstream_full_name:'acme/x',upstream_head_commit:'abc',manifest_sha256:'1'.repeat(64)},
    permissions:{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false},
    economics:{additional_cost_target_eur:0}
  }]};
  const prelab={results:[{candidate_id:'c1',prelab_state:prelabState}]};
  const upstreams={results:[{status:'RESOLVED',full_name:'acme/x',head_commit:'abc',head_tree_sha:'tree',pushed_at:pushedAt,archived:false,disabled:false,discovery_candidate_ids:['c1']}]};
  const overlap={candidates:[{candidate_id:'c1',overlap_state:overlapState,overlap_confidence_score:overlapScore,binding_domain_id:domain}]};
  const licenses={results:[{candidate_id:'c1',status:'EXACT_LICENSE_FILE_EVIDENCE',exact_evidence:[{fetched:true,path:'LICENSE',sha256:'a'.repeat(64)}]}]};
  const manifests={results:[{candidate_id:'c1',declared_name:name,declared_description:description,static_flags:staticFlags}]};
  return {wrappers,prelab,upstreams,overlap,licenses,manifests};
}

function evaluate(f,now=new Date('2026-10-06T00:00:00Z')){
  return evaluateStaticSkillValue(f.wrappers,f.prelab,f.upstreams,f.overlap,f.licenses,{now,manifests:f.manifests});
}

test('scores static-ready zero-cost strategic candidate without popularity',()=>{
  const f=fixtures();
  const report=evaluate(f);
  assert.equal(report.candidates_evaluated,1);
  assert.equal(report.popularity_used_in_score,false);
  assert.equal(report.external_code_executed,false);
  assert.equal(report.adoption_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.ok(report.results[0].value_score>70);
  assert.ok(report.results[0].components.operational_fit>=60);
});

test('instruction-only candidate is more portable than code-bundle candidate',()=>{
  const a=fixtures({prelabState:'STATIC_PRELAB_READY_INSTRUCTION_ONLY'});
  const b=fixtures({prelabState:'STATIC_PRELAB_READY_CODE_BUNDLE'});
  const ra=evaluate(a).results[0];
  const rb=evaluate(b).results[0];
  assert.ok(ra.components.portability>rb.components.portability);
  assert.ok(ra.value_score>rb.value_score);
});

test('strong overlap raises duplication penalty without auto-rejecting value',()=>{
  const low=fixtures({overlapScore:10});
  const high=fixtures({overlapScore:100});
  const r1=evaluate(low).results[0];
  const r2=evaluate(high).results[0];
  assert.ok(r2.penalties.duplication>r1.penalties.duplication);
  assert.ok(r2.value_score<r1.value_score);
});

test('maintenance score declines for stale repositories',()=>{
  const fresh=fixtures({pushedAt:'2026-10-01T00:00:00Z'});
  const stale=fixtures({pushedAt:'2023-01-01T00:00:00Z'});
  const r1=evaluate(fresh).results[0];
  const r2=evaluate(stale).results[0];
  assert.ok(r1.components.maintenance>r2.components.maintenance);
  assert.ok(r1.value_score>r2.value_score);
});

test('quick-reference persona/help skill cannot rank as high-value operational capability',()=>{
  const f=fixtures({
    domain:'agent-ai-orchestration',
    name:'caveman-help',
    description:'Quick-reference card for caveman voice modes and helper commands.'
  });
  const result=evaluate(f).results[0];
  assert.equal(result.components.operational_fit,15);
  assert.equal(result.recommendation,'HOLD_LOW_OPERATIONAL_FIT');
});

test('router precedence claim receives integrity penalty but is not automatically executed or adopted',()=>{
  const f=fixtures({
    domain:'browser-automation-scraping',
    name:'agent-browser',
    description:'Browser automation CLI to navigate pages, fill forms, click buttons, take screenshots, extract data and test web apps.',
    staticFlags:['ROUTER_PRECEDENCE_CLAIM']
  });
  const result=evaluate(f).results[0];
  assert.ok(result.penalties.instruction_integrity>0);
  assert.equal(result.adoption_authorized,false);
  assert.equal(result.prod_authorized,false);
});

test('operational fit rewards domain-specific actionable descriptions',()=>{
  const score=operationalFitScore({declared_name:'supabase-postgres-best-practices',declared_description:'Review Postgres schema migrations, RLS policies, indexes, SQL queries and database functions before changes.',static_flags:[]},'data-database-supabase');
  assert.ok(score>=80);
});

test('results are ranked by value but never authorize adoption',()=>{
  const f1=fixtures({domain:'software-engineering-devops'});
  const f2=fixtures({domain:'hr-people-operations',name:'hr-helper',description:'Review employee onboarding and workforce tasks with reversible recommendations.'});
  f2.wrappers.plans[0].candidate_id='c2';
  f2.wrappers.plans[0].wrapper_id='skillwrap:c2';
  f2.prelab.results[0].candidate_id='c2';
  f2.upstreams.results[0].discovery_candidate_ids=['c2'];
  f2.overlap.candidates[0].candidate_id='c2';
  f2.licenses.results[0].candidate_id='c2';
  f2.manifests.results[0].candidate_id='c2';
  const report=evaluateStaticSkillValue(
    {plans:[...f1.wrappers.plans,...f2.wrappers.plans]},
    {results:[...f1.prelab.results,...f2.prelab.results]},
    {results:[...f1.upstreams.results,...f2.upstreams.results]},
    {candidates:[...f1.overlap.candidates,...f2.overlap.candidates]},
    {results:[...f1.licenses.results,...f2.licenses.results]},
    {now:new Date('2026-10-06T00:00:00Z'),manifests:{results:[...f1.manifests.results,...f2.manifests.results]}}
  );
  assert.equal(report.results[0].candidate_id,'c1');
  assert.equal(report.results[0].adoption_authorized,false);
});
