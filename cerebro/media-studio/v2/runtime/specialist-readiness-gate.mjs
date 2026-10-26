function reason(code, detail) {
  return { code, detail };
}

/**
 * A role existing in RoleRegistry is only structural evidence.
 * This gate prevents CEREBRO from reporting that a specialist is operational
 * until knowledge, tools, benchmark and physical execution are all evidenced.
 */
export function evaluateSpecialistOperationalReadiness(input = {}) {
  const reasons = [];
  const profile = input.profile || null;

  if (!profile?.id) {
    reasons.push(reason('ROLE_PROFILE_MISSING', 'No registered role profile was supplied.'));
  }

  const knowledge = input.knowledge_evidence || {};
  if (knowledge.status !== 'PASS_WITH_EVIDENCE' || !knowledge.evidence_ref) {
    reasons.push(reason(
      'KNOWLEDGE_BOOTSTRAP_NOT_PROVEN',
      'Registered role does not have immutable professional knowledge/bootstrap evidence.',
    ));
  }

  const bindings = Array.isArray(input.tool_bindings) ? input.tool_bindings : [];
  const usableBindings = bindings.filter((binding) =>
    binding?.state === 'BOUND_AND_TESTED' &&
    binding?.license_status === 'PASS' &&
    binding?.security_status === 'PASS' &&
    binding?.cost_status === 'KNOWN' &&
    binding?.rollback_defined === true,
  );
  if (usableBindings.length === 0) {
    reasons.push(reason(
      'NO_OPERATIONAL_TOOL_BINDING',
      'No tool/model binding is proven bound, tested, licensed, secure, cost-known and reversible.',
    ));
  }

  const benchmark = input.benchmark_evidence || {};
  if (benchmark.state !== 'PASS_WITH_EVIDENCE' || !benchmark.evidence_ref) {
    reasons.push(reason(
      'ROLE_BENCHMARK_NOT_PROVEN',
      'No immutable role/craft benchmark evidence is attached to this specialist.',
    ));
  }

  const execution = input.execution_evidence || {};
  if (execution.physical_execution !== true || !execution.artifact_ref) {
    reasons.push(reason(
      'PHYSICAL_EXECUTION_NOT_PROVEN',
      'The specialist has not yet produced a traceable physical artifact through the governed UMS path.',
    ));
  }

  const operational = reasons.length === 0;
  return {
    role_id: profile?.id || null,
    operational,
    state: operational ? 'OPERATIONAL_PREPROD' : profile?.id ? 'REGISTERED_NOT_OPERATIONAL' : 'NOT_REGISTERED',
    reasons,
    usable_tool_bindings: usableBindings.map((binding) => binding.id).filter(Boolean),
    rule: 'REGISTERED_ROLE_NEVER_IMPLIES_OPERATIONAL_SPECIALIST',
  };
}

export function summarizeSpecialistFleet(readinessResults = []) {
  const results = Array.isArray(readinessResults) ? readinessResults : [];
  const operational = results.filter((item) => item?.operational === true);
  const registeredOnly = results.filter((item) => item?.state === 'REGISTERED_NOT_OPERATIONAL');
  return {
    total_evaluated: results.length,
    operational_preprod: operational.length,
    registered_not_operational: registeredOnly.length,
    fleet_operational: results.length > 0 && operational.length === results.length,
  };
}
