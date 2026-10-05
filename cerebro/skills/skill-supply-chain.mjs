import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = path.join(HERE, 'skill-supply-chain.v0.json');
const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

const FORBIDDEN = new Set(['captcha_bypass', 'credential_extraction', 'fingerprint_spoofing', 'anti_detect']);
const CLASSES = new Set(CONTRACT.skill_classes);
const TRUST = new Set(CONTRACT.trust_tiers);

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  return value.trim();
}

function scoreNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be 0..100`);
  }
  return value;
}

function requiredBoolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function human(reason, candidateId) {
  return Object.freeze({status: 'HUMAN_REQUIRED', reason, candidate_id: candidateId ?? null, executed: false});
}

function rejected(reason, candidateId, mode = 'REJECTED') {
  return Object.freeze({status: mode, reason, candidate_id: candidateId ?? null, executed: false});
}

export function validateSkillSupplyChainContract(contract = CONTRACT) {
  if (contract.owner_engine_id !== 'FACT-001') throw new Error('FACT-001 must own the capability contract');
  if (contract.new_engine_id !== false) throw new Error('V0 must not create a new engine id');
  if (contract.execution_mode !== 'READ_ONLY_DISCOVERY') throw new Error('V0 must be read only');
  if (contract.additional_cost_target_eur !== 0) throw new Error('V0 additional cost target must be zero');
  if (contract.prod_writes !== false || contract.autonomous_prod !== false || contract.trading_access !== false) {
    throw new Error('unsafe V0 defaults');
  }
  if (!Array.isArray(contract.engine_bindings) || !contract.engine_bindings.includes('FACT-001') || !contract.engine_bindings.includes('SUP-001')) {
    throw new Error('transversal bindings missing');
  }
  return Object.freeze({valid: true, capability_id: contract.capability_id, bindings: contract.engine_bindings.length});
}

export function assessSkillCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('candidate object required');
  for (const field of CONTRACT.required_candidate_fields) {
    if (!(field in candidate)) throw new Error(`candidate.${field} required`);
  }

  const id = requiredString(candidate.candidate_id, 'candidate.candidate_id');
  requiredString(candidate.name, 'candidate.name');
  requiredString(candidate.source_id, 'candidate.source_id');
  requiredString(candidate.source_ref, 'candidate.source_ref');
  const upstream = requiredString(candidate.upstream_ref, 'candidate.upstream_ref');
  requiredString(candidate.upstream_commit, 'candidate.upstream_commit');
  requiredString(candidate.license_id, 'candidate.license_id');
  requiredString(candidate.version_ref, 'candidate.version_ref');
  requiredString(candidate.observed_at, 'candidate.observed_at');

  if (!CLASSES.has(candidate.skill_class)) throw new Error('candidate.skill_class invalid');
  if (!TRUST.has(candidate.trust_tier)) throw new Error('candidate.trust_tier invalid');
  if (candidate.trust_tier === 'REJECTED') return rejected('TRUST_REJECTED', id);

  requiredBoolean(candidate.license_compatible, 'candidate.license_compatible');
  requiredBoolean(candidate.network_access, 'candidate.network_access');
  requiredBoolean(candidate.filesystem_access, 'candidate.filesystem_access');
  requiredBoolean(candidate.credential_access, 'candidate.credential_access');
  requiredBoolean(candidate.prod_write, 'candidate.prod_write');
  requiredBoolean(candidate.trading_access, 'candidate.trading_access');

  if (!upstream.startsWith('https://')) return rejected('UPSTREAM_UNRESOLVED', id);
  if (!candidate.license_compatible) return rejected('LICENSE_INCOMPATIBLE', id, 'REFERENCE_ONLY');
  if (candidate.prod_write) return human('HIGH_RISK', id);
  if (candidate.trading_access) return human('POLICY_CONFLICT', id);
  if (typeof candidate.cost_eur_month !== 'number' || candidate.cost_eur_month < 0 || !Number.isFinite(candidate.cost_eur_month)) {
    throw new Error('candidate.cost_eur_month invalid');
  }
  if (candidate.cost_eur_month > 0) return human('MONEY_LIMIT', id);

  if (!Array.isArray(candidate.forbidden_behaviors)) throw new Error('candidate.forbidden_behaviors must be array');
  for (const behavior of candidate.forbidden_behaviors) {
    if (FORBIDDEN.has(String(behavior))) return rejected(`FORBIDDEN_BEHAVIOR:${behavior}`, id);
  }

  const security = scoreNumber(candidate.security, 'candidate.security');
  const fit = scoreNumber(candidate.fit, 'candidate.fit');
  const maintainability = scoreNumber(candidate.maintainability, 'candidate.maintainability');
  const interoperability = scoreNumber(candidate.interoperability, 'candidate.interoperability');
  const reversibility = scoreNumber(candidate.reversibility, 'candidate.reversibility');
  const reuseValue = scoreNumber(candidate.reuse_value ?? 0, 'candidate.reuse_value');
  if (security < 70) return rejected('SECURITY_SCORE_TOO_LOW', id);

  const licenseScore = 100;
  const zeroCost = 100;
  const weights = CONTRACT.score_weights;
  const score = (
    security * weights.security +
    fit * weights.fit +
    licenseScore * weights.license +
    reuseValue * weights.reuse_value +
    interoperability * weights.interoperability +
    zeroCost * weights.zero_cost +
    maintainability * weights.maintainability +
    reversibility * weights.reversibility
  ) / 100;

  const recommendation = score >= 85 ? 'LAB_CANDIDATE' : score >= 70 ? 'QUARANTINE_REVIEW' : 'REJECT';
  return Object.freeze({
    status: 'SCORED',
    candidate_id: id,
    score: Number(score.toFixed(2)),
    recommendation,
    skill_class: candidate.skill_class,
    trust_tier: candidate.trust_tier,
    executed: false,
    prod_writes: false,
    additional_cost_target_eur: 0
  });
}

export function classifyRecheck({last_checked_at, now = new Date(), cadence_days = 7}) {
  const last = new Date(last_checked_at);
  if (Number.isNaN(last.getTime())) throw new Error('last_checked_at invalid');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('now invalid');
  if (!Number.isInteger(cadence_days) || cadence_days < 1) throw new Error('cadence_days invalid');
  const ageMs = now.getTime() - last.getTime();
  return ageMs >= cadence_days * 86400000 ? 'RECHECK_DUE' : 'CURRENT';
}

export function continuousImprovementPlan() {
  return Object.freeze(structuredClone(CONTRACT.continuous_improvement));
}

validateSkillSupplyChainContract();
