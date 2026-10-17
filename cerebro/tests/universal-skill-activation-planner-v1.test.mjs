import test from 'node:test';
import assert from 'node:assert/strict';
import {loadActivationRouting,classifyCapability,buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';

const readyBase={
  company_id:'fenix',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,
  provenance_license_green:true,additional_cost_eur:0
};

test('routing source is signals-only and every routed engine is canonical',()=>{
  const routing=loadActivationRouting();
  assert.equal(routing.signals.status,'ROUTING_SIGNALS_ONLY_NOT_IMPLEMENTATION_CLAIMS');
  assert.equal(routing.signals.owner_engine_id,'FACT-001');
  assert.equal(routing.engines.state_type,'CEREBRO_ENGINE_REGISTRY_V1');
  const known=new Set(routing.engines.engine_ids);
  for(const domain of routing.signals.domains)for(const id of domain.engine_bindings)assert.ok(known.has(id),`${domain.domain_id}:${id}`);
});

test('browser capability maps to governed browser domain without skill-specific runtime table',()=>{
  const routing=loadActivationRouting();
  const c=classifyCapability({capability_id:'cap:browser',technical_name:'agent-browser',description:'browser automation cli for Playwright screenshots and fill forms',terms:['web automation','scraping']},routing);
  assert.equal(c.status,'CLASSIFIED');
  assert.ok(c.domains.some((d)=>d.domain_id==='browser-automation-scraping'));
  for(const id of ['AUTO-001','AUTBOOT-001','QA-001','WEB-001','SCAN-001'])assert.ok(c.target_engine_bindings.includes(id));
});

test('Supabase/Postgres capability maps to data domain from governed routing signals',()=>{
  const plan=buildUniversalActivationPlan({
    ...readyBase,candidate_id:'candidate:supabase',technical_name:'supabase-postgres-best-practices',
    description:'Postgres query optimization, RLS, database schema and Supabase best practices',
    terms:['postgresql','query optimization','row level security'],source_refs:['repo://supabase-skill']
  });
  assert.equal(plan.status,'ACTIVATION_PLAN_READY');
  assert.ok(plan.domain_ids.includes('data-database-supabase'));
  for(const id of ['DATA-001','DBOFF-001','STOROFF-001','API-001','CRM-001'])assert.ok(plan.target_engine_bindings.includes(id));
  assert.equal(plan.engineering_task.status,'FACT_ENGINEERING_READY');
});

test('repository can expose multiple capabilities and aggregate relevant bindings',()=>{
  const plan=buildUniversalActivationPlan({
    ...readyBase,candidate_id:'repo:multi',technical_name:'multi-capability-repo',source_refs:['github://owner/repo'],
    capabilities:[
      {capability_id:'repo:multi:web',technical_name:'wordpress-frontend-tools',description:'WordPress frontend HTML CSS UI responsive website'},
      {capability_id:'repo:multi:seo',technical_name:'seo-toolkit',description:'SEO keyword research SERP sitemap canonical local seo'}
    ]
  });
  assert.equal(plan.status,'ACTIVATION_PLAN_READY');
  assert.equal(plan.capabilities.length,2);
  assert.ok(plan.domain_ids.includes('web-wordpress-frontend'));
  assert.ok(plan.domain_ids.includes('seo-search-content'));
  assert.ok(plan.target_engine_bindings.includes('WEB-001'));
  assert.ok(plan.target_engine_bindings.includes('SEO-001'));
});

test('explicit governed domain evidence can classify capabilities with weak names',()=>{
  const routing=loadActivationRouting();
  const c=classifyCapability({
    capability_id:'cap:opaque',technical_name:'x1',declared_domains:['software-engineering-devops'],
    domain_evidence:{'software-engineering-devops':['manifest:capabilities/code-editing']}
  },routing);
  assert.equal(c.status,'CLASSIFIED');
  assert.equal(c.confidence,'HIGH');
  assert.ok(c.target_engine_bindings.includes('FACT-001'));
  assert.ok(c.target_engine_bindings.includes('QA-001'));
});

test('low-confidence complete profile fails closed with canonical LOW_CONFIDENCE',()=>{
  const plan=buildUniversalActivationPlan({
    ...readyBase,candidate_id:'candidate:opaque',technical_name:'zxq-opaque',description:'unmapped capability',terms:['zxq']
  });
  assert.equal(plan.status,'HUMAN_REQUIRED');
  assert.deepEqual(plan.human_required,['LOW_CONFIDENCE']);
  assert.equal(plan.binding_count,0);
  assert.equal(plan.prod_authorized,false);
});

test('missing provenance/license does not pretend activation is ready',()=>{
  const plan=buildUniversalActivationPlan({
    ...readyBase,provenance_license_green:false,candidate_id:'candidate:no-license',technical_name:'seo-tool',description:'SEO keyword research'
  });
  assert.equal(plan.status,'HOLD');
  assert.ok(plan.blockers.includes('provenance_license_green_required'));
  assert.equal(plan.next_gate,'PROVENANCE_AND_LICENSE_GREEN');
});

test('evidence-backed reuse can terminate as ABSORBED without unnecessary bindings',()=>{
  const plan=buildUniversalActivationPlan({
    ...readyBase,candidate_id:'candidate:duplicate',technical_name:'duplicate-tool',
    reuse_assessment:{decision:'ABSORB',evidence_refs:['registry:existing-capability','benchmark:existing-better']}
  });
  assert.equal(plan.status,'TERMINAL');
  assert.equal(plan.terminal_state,'ABSORBED');
  assert.equal(plan.binding_count,0);
  assert.equal(plan.next_gate,'NONE_TERMINAL');
});

test('activation plan identity is deterministic for the same candidate evidence',()=>{
  const input={...readyBase,candidate_id:'candidate:stable-plan',technical_name:'github-automation',description:'github git pull request ci testing developer',source_refs:['github://stable/repo']};
  const a=buildUniversalActivationPlan(input),b=buildUniversalActivationPlan(input);
  assert.equal(a.plan_id,b.plan_id);
  assert.deepEqual(a.target_engine_bindings,b.target_engine_bindings);
});
