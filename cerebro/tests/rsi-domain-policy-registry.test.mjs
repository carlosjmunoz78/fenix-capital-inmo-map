import test from 'node:test';
import assert from 'node:assert/strict';
import {createPromotionPlan} from '../runtime/promotion-pipeline.mjs';
import {
  loadDomainPolicyRegistry,resolveDomainAutonomyPolicy,evaluateRegisteredDomainAdoption,
  runRegisteredDomainPreprodLoop,domainPolicyCoverage,RSI_DOMAIN_POLICY_REGISTRY_CONTRACT
} from '../runtime/rsi-domain-policy-registry.mjs';

function candidate(engine_id='LRN-001',overrides={}){
  return {
    candidate_id:`cand:${engine_id}:v2`,company_id:'fenix',engine_id,environment:'PREPROD',candidate_version:'0.6.0',
    risk_class:'LOW',confidence:0.95,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
    ...overrides
  };
}
function promotion(engine_id='LRN-001',overrides={}){
  return {
    ...createPromotionPlan({
      company_id:'fenix',engine_id,environment:'PREPROD',version:'0.6.0',baseline_version:'0.5.0',candidate_version:'0.6.0',
      judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:`rollback:${engine_id}:0.5.0`,rebuild_ref:`rebuild:${engine_id}:0.6.0`,
      post_metrics:{quality_score:{min:80}},canary_percent:5
    }),
    ...overrides
  };
}

test('registry loads explicit Fenix real-domain policies and remains fail-closed',()=>{
  const registry=loadDomainPolicyRegistry();
  assert.equal(registry.company_id,'fenix');
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.policy_count,10);
  assert.equal(registry.autonomous_count,2);
  assert.equal(registry.assisted_count,8);
  assert.equal(registry.prod_authorized,false);
  assert.equal(registry.prod_write_authorized,false);
  assert.equal(registry.trading_access,false);
  assert.equal(registry.additional_cost_eur,0);
  assert.equal(registry.multicompany_continuation,false);
});

test('coverage exposes only certified learning and bounded AUTO-001 control plane as PREPROD autonomous',()=>{
  const coverage=domainPolicyCoverage();
  assert.deepEqual(coverage.autonomous_domains,['cerebro.learning.continuous_evolution','fenix.automation']);
  assert.equal(coverage.assisted_domains.includes('fenix.app'),true);
  assert.equal(coverage.assisted_domains.includes('fenix.crm'),true);
  assert.equal(coverage.assisted_domains.includes('fenix.seo'),true);
  assert.equal(coverage.assisted_domains.includes('fenix.web.wordpress'),true);
  assert.equal(coverage.assisted_domains.includes('fenix.training'),true);
  assert.equal(coverage.default_unregistered_domain_decision,'HOLD');
  assert.equal(coverage.multicompany_continuation,false);
});

test('unregistered domain cannot enter the autonomous loop',()=>{
  const result=resolveDomainAutonomyPolicy({company_id:'fenix',engine_id:'LEAD-001',domain_id:'fenix.leads'});
  assert.equal(result.ok,false);
  assert.equal(result.decision,'HOLD');
  assert.equal(result.reasons[0],'EXPLICIT_DOMAIN_POLICY_REQUIRED');
  assert.equal(result.next_gate,'REGISTER_DOMAIN_POLICY_FAIL_CLOSED');
  assert.equal(result.prod_authorized,false);
});

test('SEO remains ASSISTED and cannot start B4 or bypass its separate Core Guard gate',()=>{
  const engine_id='SEO-001';
  const result=runRegisteredDomainPreprodLoop({
    company_id:'fenix',engine_id,domain_id:'fenix.seo',candidate:candidate(engine_id),promotion_plan:promotion(engine_id),
    shadow_evidence:{pass:true,evidence_refs:['seo:shadow'],additional_cost_eur:0},
    canary_evidence:{pass:true,evidence_refs:['seo:canary'],additional_cost_eur:0},
    observed_metrics:{quality_score:90},observed_at:'2026-10-09T06:00:00Z',evidence_refs:['seo:test']
  });
  assert.equal(result.decision,'HOLD');
  assert.equal(result.reasons[0],'DOMAIN_AUTONOMY_NOT_PREPROD_AUTONOMOUS');
  assert.equal(result.loop_started,false);
  assert.equal(result.prod_authorized,false);
});

test('certified learning control plane resolves policy and can run bounded PREPROD B4 to relearning',()=>{
  const engine_id='LRN-001';
  const policyDecision=evaluateRegisteredDomainAdoption({
    company_id:'fenix',engine_id,domain_id:'cerebro.learning.continuous_evolution',candidate:candidate(engine_id),promotion_plan:promotion(engine_id)
  });
  assert.equal(policyDecision.decision,'ALLOW_PREPROD_CANARY');
  const result=runRegisteredDomainPreprodLoop({
    company_id:'fenix',engine_id,domain_id:'cerebro.learning.continuous_evolution',candidate:candidate(engine_id),promotion_plan:promotion(engine_id),
    shadow_evidence:{pass:true,evidence_refs:['lrn:shadow'],additional_cost_eur:0},
    canary_evidence:{pass:true,evidence_refs:['lrn:canary'],additional_cost_eur:0},
    observed_metrics:{quality_score:90},observed_at:'2026-10-09T06:00:00Z',evidence_refs:['lrn:registry-wiring']
  });
  assert.equal(result.loop_started,true);
  assert.equal(result.decision,'KEEP_NONPROD_AND_RELEARN');
  assert.equal(result.next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
  assert.equal(result.domain_autonomy_mode,'PREPROD_AUTONOMOUS');
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('AUTO-001 resolves policy and can run bounded PREPROD B4 while staying non-business/non-PROD',()=>{
  const engine_id='AUTO-001';
  const policyDecision=evaluateRegisteredDomainAdoption({
    company_id:'fenix',engine_id,domain_id:'fenix.automation',candidate:candidate(engine_id,{confidence:0.90}),promotion_plan:promotion(engine_id)
  });
  assert.equal(policyDecision.decision,'ALLOW_PREPROD_CANARY');
  const result=runRegisteredDomainPreprodLoop({
    company_id:'fenix',engine_id,domain_id:'fenix.automation',candidate:candidate(engine_id,{confidence:0.90}),promotion_plan:promotion(engine_id),
    shadow_evidence:{pass:true,evidence_refs:['auto:shadow'],additional_cost_eur:0},
    canary_evidence:{pass:true,evidence_refs:['auto:canary'],additional_cost_eur:0},
    observed_metrics:{quality_score:90},observed_at:'2026-10-09T07:30:00Z',evidence_refs:['auto:first-real-domain']
  });
  assert.equal(result.loop_started,true);
  assert.equal(result.decision,'KEEP_NONPROD_AND_RELEARN');
  assert.equal(result.domain_autonomy_mode,'PREPROD_AUTONOMOUS');
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('registered policy still maps risk, confidence and money boundary to canonical decisions',()=>{
  const high=evaluateRegisteredDomainAdoption({
    company_id:'fenix',engine_id:'AUTO-001',domain_id:'fenix.automation',candidate:candidate('AUTO-001',{risk_class:'HIGH'}),promotion_plan:promotion('AUTO-001')
  });
  assert.equal(high.human_required,'HIGH_RISK');
  const low=evaluateRegisteredDomainAdoption({
    company_id:'fenix',engine_id:'AUTO-001',domain_id:'fenix.automation',candidate:candidate('AUTO-001',{confidence:0.5}),promotion_plan:promotion('AUTO-001')
  });
  assert.equal(low.human_required,'LOW_CONFIDENCE');
  const money=evaluateRegisteredDomainAdoption({
    company_id:'fenix',engine_id:'AUTO-001',domain_id:'fenix.automation',candidate:candidate('AUTO-001'),promotion_plan:{...promotion('AUTO-001'),additional_cost_budget_eur:1}
  });
  assert.equal(money.human_required,'MONEY_LIMIT');
});

test('exact autonomous set is LRN-001 plus AUTO-001 only',()=>{
  const registry=loadDomainPolicyRegistry();
  const ids=registry.policies.filter(x=>x.autonomy_mode==='PREPROD_AUTONOMOUS').map(x=>x.engine_id).sort();
  assert.deepEqual(ids,['AUTO-001','LRN-001']);
  assert.equal(registry.policies.find(x=>x.engine_id==='SEO-001').autonomy_mode,'ASSISTED');
  assert.equal(registry.policies.find(x=>x.engine_id==='APP-001').autonomy_mode,'ASSISTED');
  assert.equal(registry.policies.find(x=>x.engine_id==='CRM-001').autonomy_mode,'ASSISTED');
  assert.equal(registry.policies.find(x=>x.engine_id==='DATA-001').autonomy_mode,'ASSISTED');
});

test('registry contract never grants PROD, Trading or MULTIEMPRESA authority',()=>{
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.environment,'PREPROD');
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.prod_authorized,false);
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.prod_write_authorized,false);
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.trading_access,false);
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.multicompany_continuation,false);
  assert.equal(RSI_DOMAIN_POLICY_REGISTRY_CONTRACT.additional_cost_target_eur,0);
});
