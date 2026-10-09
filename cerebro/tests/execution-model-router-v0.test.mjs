import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetDecision,EXECUTION_MODEL_ROUTER_V0_CONTRACT,loadRouterPolicy,rankZeroCostResources,routeWork} from '../router/execution-model-router.mjs';

const lifecycle={credential_health:{
  'credref:github-actions-token':{usable:true,status:'HEALTHY_PROVIDER_MANAGED'},
  'credref:cerebro-gemini-api-key':{usable:true,status:'PRESENT_LIFECYCLE_PARTIAL'},
  'credref:prod-supabase-publishable-key':{usable:true,status:'PRESENT_LIFECYCLE_PARTIAL'},
  'credref:cerebro-e2e-user-jwt':{usable:true,status:'HEALTHY_VALID_UNTIL'}
},disabled_credential_refs:[]};

const localPython={resource_id:'local-python',resource_class:'DETERMINISTIC_LOCAL',capabilities:['python','research'],available:true,incremental_cost_eur:0,privacy:'LOCAL',latency_ms:10,ai:false};
const localAi={resource_id:'local-ai',resource_class:'LOCAL_AI',capabilities:['research','reasoning','comparison'],available:true,incremental_cost_eur:0,privacy:'LOCAL',latency_ms:50,ai:true};
const geminiLab={resource_id:'gemini-free-lab',resource_class:'FREE_AI',capabilities:['research','reasoning','comparison'],available:true,incremental_cost_eur:0,privacy:'APPROVED_CLOUD',latency_ms:100,ai:true,connector_id:'connector:gemini-free-lab'};
const githubActions={resource_id:'github-actions',resource_class:'GITHUB_ACTIONS',capabilities:['python','typescript','research'],available:true,incremental_cost_eur:0,privacy:'APPROVED_CLOUD',latency_ms:200,ai:false,connector_id:'connector:github-actions'};
const paidAi={resource_id:'paid-ai',resource_class:'PAID_EXTERNAL',capabilities:['research','reasoning'],available:true,incremental_cost_eur:0.03,privacy:'APPROVED_CLOUD',latency_ms:40,ai:true};

function base(overrides={}){return {company_id:'fenix',environment:'LAB',task_type:'research',confidence:0.9,risk:'LOW',contains_customer_data:false,contains_secrets:false,prod_write_requested:false,trading_requested:false,available_resources:[localAi,geminiLab],lifecycle_state:lifecycle,...overrides};}

test('policy preserves legacy behaviors but adds explicit zero-cost and authority guards',()=>{
  const p=loadRouterPolicy();
  assert.equal(p.legacy_reference.branch,'cerebro-model-router-v0-20260911');
  assert.ok(p.legacy_reference.preserved_behaviors.includes('deterministic_tasks_do_not_require_ai'));
  assert.equal(p.budget.incremental_cost_hard_cap_eur,0);
  assert.equal(p.budget.automatic_paid_fallback,false);
  assert.equal(p.prod_authorized,false);
  assert.equal(p.trading_access,false);
});

test('deterministic task routes deterministic local and never wastes AI',()=>{
  const r=routeWork(base({task_type:'python',available_resources:[geminiLab,githubActions,localPython]}));
  assert.equal(r.status,'ROUTED');
  assert.equal(r.selected_resource_id,'local-python');
  assert.equal(r.ai_required,false);
  assert.equal(r.cost_target_eur,0);
  assert.equal(r.execution_authorized,false);
});

test('interpretive task prefers local AI before free cloud AI',()=>{
  const r=routeWork(base());
  assert.equal(r.status,'ROUTED');
  assert.equal(r.selected_resource_id,'local-ai');
  assert.equal(r.ai_required,true);
  assert.deepEqual(r.fallback_chain,['gemini-free-lab']);
});

test('free cloud AI can route in LAB only when IAM and lifecycle metadata are green enough',()=>{
  const r=routeWork(base({available_resources:[geminiLab]}));
  assert.equal(r.status,'ROUTED');
  assert.equal(r.selected_resource_id,'gemini-free-lab');
  assert.equal(r.estimated_incremental_cost_eur,0);
  const preprod=routeWork(base({environment:'PREPROD',available_resources:[geminiLab]}));
  assert.equal(preprod.status,'HOLD');
  assert.ok(preprod.diagnostics.some(x=>x.reason==='DENY_CONNECTOR_ENVIRONMENT_MISMATCH'));
});

test('customer data never goes to external free AI and local route remains eligible',()=>{
  const r=routeWork(base({contains_customer_data:true,available_resources:[geminiLab,localAi]}));
  assert.equal(r.status,'ROUTED');
  assert.equal(r.selected_resource_id,'local-ai');
  assert.ok(r.diagnostics.some(x=>x.reason==='SENSITIVE_DATA_EXTERNAL_ROUTE_DENIED'));
});

test('registered API route requires registered connector and lifecycle evidence',()=>{
  const api={resource_id:'supabase-readonly-e2e',resource_class:'REGISTERED_API',capabilities:['api'],available:true,incremental_cost_eur:0,privacy:'REGISTERED_EXISTING_PATH',latency_ms:20,ai:false,connector_id:'connector:supabase-prod-readonly-e2e'};
  const ok=routeWork(base({environment:'PROD_READONLY_E2E',task_type:'api',available_resources:[api]}));
  assert.equal(ok.status,'ROUTED');
  assert.equal(ok.selected_resource_id,'supabase-readonly-e2e');
  const noLifecycle=routeWork(base({environment:'PROD_READONLY_E2E',task_type:'api',available_resources:[api],lifecycle_state:null}));
  assert.equal(noLifecycle.status,'HOLD');
  assert.ok(noLifecycle.diagnostics.some(x=>x.reason==='HOLD_NO_LIFECYCLE_EVIDENCE'));
});

test('paid route is never automatic and becomes canonical MONEY_LIMIT human exception',()=>{
  const r=routeWork(base({available_resources:[paidAi],estimated_paid_cost_eur:0.03,paid_route_requested:true}));
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'MONEY_LIMIT');
  assert.equal(r.execution_authorized,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(budgetDecision({estimated_incremental_cost_eur:1}).human_required,'MONEY_LIMIT');
});

test('high risk and low confidence use only canonical human exceptions',()=>{
  const high=routeWork(base({risk:'HIGH'}));
  assert.equal(high.status,'HUMAN_REQUIRED');assert.equal(high.human_required,'HIGH_RISK');
  const low=routeWork(base({confidence:0.59}));
  assert.equal(low.status,'HUMAN_REQUIRED');assert.equal(low.human_required,'LOW_CONFIDENCE');
  const unknown=routeWork(base({task_type:'unknown-new-task'}));
  assert.equal(unknown.status,'HUMAN_REQUIRED');assert.equal(unknown.human_required,'LOW_CONFIDENCE');
});

test('PROD write and Trading are blocked rather than silently routed',()=>{
  assert.equal(routeWork(base({prod_write_requested:true})).reason,'PROD_WRITE_NOT_AUTHORIZED_BY_ROUTER');
  assert.equal(routeWork(base({trading_requested:true})).reason,'TRADING_ISOLATION_DENIED');
});

test('browser/computer-use stays fallback and fail-closed while IAM real binding is not evidenced',()=>{
  const browser={resource_id:'agent-browser',resource_class:'BROWSER_COMPUTER_USE',capabilities:['research'],available:true,incremental_cost_eur:0,privacy:'BROWSER',latency_ms:500,ai:false,connector_id:'connector:agent-browser-candidate'};
  const noBinding=routeWork(base({environment:'PREPROD',available_resources:[browser],browser_binding_status:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT'}));
  assert.equal(noBinding.status,'HOLD');
  assert.ok(noBinding.diagnostics.some(x=>x.reason==='HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT'));
  const claimedBinding=routeWork(base({environment:'PREPROD',available_resources:[browser],browser_binding_status:'BROWSER_SESSION_BINDING_HEALTHY'}));
  assert.equal(claimedBinding.status,'HOLD');
  assert.ok(claimedBinding.diagnostics.some(x=>x.reason==='HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT'));
});

test('zero-cost exhaustion without paid candidate is HOLD, not fake success or noisy HUMAN_REQUIRED',()=>{
  const r=routeWork(base({available_resources:[]}));
  assert.equal(r.status,'HOLD');
  assert.equal(r.reason,'HOLD_NO_ZERO_COST_ROUTE');
  assert.equal(r.human_required,null);
});

test('raw secret-like payloads are rejected before ranking',()=>{
  assert.throws(()=>routeWork(base({access_token:'eyJAAAAAAAAAAAA.BBBBBBBBBBBB.CCCCCCCCCC'})),/raw secret material forbidden/);
});

test('ranking is deterministic by policy priority then latency and never includes paid resource',()=>{
  const slower={...localPython,resource_id:'local-python-slow',latency_ms:100};
  const faster={...localPython,resource_id:'local-python-fast',latency_ms:5};
  const r=rankZeroCostResources(base({task_type:'python',available_resources:[paidAi,slower,faster,githubActions]}));
  assert.deepEqual(r.eligible.map(x=>x.resource_id),['local-python-fast','local-python-slow','github-actions']);
  assert.ok(r.diagnostics.some(x=>x.reason==='NON_ZERO_COST'));
});

test('router contract never grants execution, PROD, Trading or MULTIEMPRESA authority',()=>{
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.prod_authorized,false);
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.prod_write_authorized,false);
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.execution_authorized,false);
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.trading_access,false);
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.multicompany_continuation,false);
  assert.equal(EXECUTION_MODEL_ROUTER_V0_CONTRACT.additional_cost_target_eur,0);
});
