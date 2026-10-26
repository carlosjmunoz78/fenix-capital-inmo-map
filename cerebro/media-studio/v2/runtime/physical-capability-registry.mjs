function upper(value) { return String(value ?? '').trim().toUpperCase(); }
function text(value) { return String(value ?? '').trim(); }
function arr(value) { return Array.isArray(value) ? value : []; }

export function evaluateExecutableBinding(binding = {}) {
  const reasons = [];
  if (upper(binding.status || binding.state) !== 'BOUND_AND_TESTED') reasons.push('BINDING_NOT_BOUND_AND_TESTED');
  if (upper(binding.license_status) !== 'PASS' && binding.rights_verified !== true) reasons.push('LICENSE_OR_RIGHTS_NOT_PASS');
  if (upper(binding.security_status) !== 'PASS') reasons.push('SECURITY_NOT_PASS');
  if (!['KNOWN', 'ZERO', 'PASS'].includes(upper(binding.cost_status))) reasons.push('COST_NOT_KNOWN');
  if (binding.rollback_defined !== true && upper(binding.rollback_status) !== 'PASS') reasons.push('ROLLBACK_NOT_PROVEN');
  if (upper(binding.physical_probe_status || binding.probe_status) !== 'PASS') reasons.push('PHYSICAL_PROBE_NOT_PASS');
  if (binding.artifact_provenance !== true && binding.provenance_verified !== true) reasons.push('ARTIFACT_PROVENANCE_NOT_PROVEN');
  if (!text(binding.adapter_id || binding.id)) reasons.push('ADAPTER_ID_MISSING');
  return Object.freeze({ executable: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function createPhysicalCapabilityRegistry(entries = []) {
  const normalized = new Map();
  for (const raw of arr(entries)) {
    const capability = text(raw.capability || raw.capability_id);
    if (!capability) throw new Error('CAPABILITY_ID_REQUIRED');
    if (normalized.has(capability)) throw new Error(`DUPLICATE_CAPABILITY:${capability}`);
    normalized.set(capability, Object.freeze({ ...raw, capability }));
  }
  return Object.freeze({
    state_type: 'CEREBRO_UMS_PHYSICAL_CAPABILITY_REGISTRY_V1',
    environment: 'PREPROD',
    get(capability) { return normalized.get(String(capability)) || null; },
    list() { return Object.freeze([...normalized.values()]); },
  });
}

export function resolveRequiredCapabilities(requiredCapabilities = [], registry) {
  const missing = [];
  const resolved = [];
  for (const capability of arr(requiredCapabilities)) {
    const binding = registry?.get?.(capability) || null;
    if (!binding) { missing.push({ capability, reasons: ['CAPABILITY_NOT_REGISTERED'] }); continue; }
    const evaluated = evaluateExecutableBinding(binding);
    if (!evaluated.executable) { missing.push({ capability, reasons: evaluated.reasons }); continue; }
    resolved.push(binding);
  }
  return Object.freeze({ ready: missing.length === 0, resolved: Object.freeze(resolved), missing: Object.freeze(missing) });
}
