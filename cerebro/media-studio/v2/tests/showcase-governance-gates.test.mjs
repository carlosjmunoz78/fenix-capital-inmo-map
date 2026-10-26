import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateSpecialistOperationalReadiness,
  summarizeSpecialistFleet,
} from '../runtime/specialist-readiness-gate.mjs';
import {
  buildPremiumShowcaseProductionPlan,
  PREMIUM_SHOWCASE_POD_TYPES,
} from '../runtime/premium-showcase-orchestrator.mjs';

test('registered role without knowledge/tools/benchmark/execution is not operational', () => {
  const result = evaluateSpecialistOperationalReadiness({
    profile: {
      id: 'ROLE-DEMO',
      status: 'REGISTERED_KNOWLEDGE_BOOTSTRAP_REQUIRED',
    },
  });

  assert.equal(result.operational, false);
  assert.equal(result.state, 'REGISTERED_NOT_OPERATIONAL');
  const codes = new Set(result.reasons.map((item) => item.code));
  assert.ok(codes.has('KNOWLEDGE_BOOTSTRAP_NOT_PROVEN'));
  assert.ok(codes.has('NO_OPERATIONAL_TOOL_BINDING'));
  assert.ok(codes.has('ROLE_BENCHMARK_NOT_PROVEN'));
  assert.ok(codes.has('PHYSICAL_EXECUTION_NOT_PROVEN'));
});

test('specialist becomes PREPROD operational only with complete evidence', () => {
  const result = evaluateSpecialistOperationalReadiness({
    profile: { id: 'ROLE-DEMO' },
    knowledge_evidence: {
      status: 'PASS_WITH_EVIDENCE',
      evidence_ref: 'git:knowledge-proof',
    },
    tool_bindings: [{
      id: 'TOOL-DEMO',
      state: 'BOUND_AND_TESTED',
      license_status: 'PASS',
      security_status: 'PASS',
      cost_status: 'KNOWN',
      rollback_defined: true,
    }],
    benchmark_evidence: {
      state: 'PASS_WITH_EVIDENCE',
      evidence_ref: 'git:benchmark-proof',
    },
    execution_evidence: {
      physical_execution: true,
      artifact_ref: 'sha256:artifact',
    },
  });

  assert.equal(result.operational, true);
  assert.equal(result.state, 'OPERATIONAL_PREPROD');
});

test('fleet summary cannot call registered-only roles operational', () => {
  const summary = summarizeSpecialistFleet([
    { operational: true, state: 'OPERATIONAL_PREPROD' },
    { operational: false, state: 'REGISTERED_NOT_OPERATIONAL' },
  ]);
  assert.equal(summary.total_evaluated, 2);
  assert.equal(summary.operational_preprod, 1);
  assert.equal(summary.registered_not_operational, 1);
  assert.equal(summary.fleet_operational, false);
});

test('premium showcase plan uses specialist pod factory and forbids direct procedural renderer as primary', () => {
  const plan = buildPremiumShowcaseProductionPlan({
    company_id: 'fenix',
    production_id: 'SHOWCASE-QUALITY-REGRESSION',
    environment: 'PREPROD',
    objective: 'Presentar de forma espectacular todo lo que puede hacer la Productora',
  });

  assert.equal(plan.status, 'PLANNED_NOT_EXECUTED');
  assert.equal(plan.execution_entrypoint, 'UMS_POD_FACTORY');
  assert.equal(plan.direct_procedural_renderer_allowed_as_primary, false);
  assert.equal(plan.delivery_contract.final_gate, 'production-quality-gate.mjs');
  assert.equal(plan.delivery_contract.fail_closed, true);
  assert.deepEqual(plan.pods.map((pod) => pod.pod_type), [...PREMIUM_SHOWCASE_POD_TYPES]);
  assert.ok(plan.pods.every((pod) => pod.environment === 'PREPROD'));
  assert.ok(plan.pods.every((pod) => Array.isArray(pod.roles) && pod.roles.length > 1));
  assert.ok(plan.pods.every((pod) => pod.review && pod.review.tribunals.length > 0));
  assert.equal(plan.authority.prod_authorized, false);
  assert.equal(plan.authority.spend_authorized, false);
});

test('premium showcase orchestrator cannot be used to jump directly into PROD', () => {
  assert.throws(
    () => buildPremiumShowcaseProductionPlan({
      company_id: 'fenix',
      production_id: 'SHOWCASE-PROD-BLOCK',
      environment: 'PROD',
      objective: 'Premium showcase',
    }),
    /PREMIUM_SHOWCASE_ORCHESTRATOR_PREPROD_ONLY/,
  );
});
