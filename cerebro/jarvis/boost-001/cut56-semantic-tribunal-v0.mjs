/**
 * CUT56 · JARVIS candidate semantic tribunal (offline / no paid inference).
 *
 * This is a conservative, reproducible veto; it is not an independent AI judge
 * nor a release certification. It cannot change memory, grants or PROD.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PILOT_TASKS, evaluateCandidate } from './learning-pilot-v0.mjs';

export const CUT56 = Object.freeze({
  version: 'CUT56-v0.1.0',
  run_id: '42381208836',
  expected_sha256: '5f63205f18134bc8e7da6812664da6e321bff5c9bca6d4381c454911f885e39c',
  company_id: 'fenix',
  environment: 'LAB',
  allowed_status: 'PILOT_COMPLETE_CANDIDATES_ONLY',
  promotion: false,
  actual_cost_reconciled: false
});
const normalize = x => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const badHuman = /human_required|aprobacion humana|validacion humana|confirmacion del propietario|checkpoint humano|operador humano|revision humana|escalar a humano/i;
const exampleCases = new Map(PILOT_TASKS.map(t => [t.id,t]));
const expectedScopes = new Set(['conversation','determinism','executive','personality','memory']);
const compact = x => Object.freeze([...new Set(x)]);
export function semanticVeto(task, candidate) {
  const rule = candidate?.reusable_rule || {};
  const all = [candidate?.summary_es,rule.when,rule.then,rule.guard].join(' ');
  const n = normalize(all);
  const reasons = [];
  const needsHuman = badHuman.test(n) || candidate?.action === 'HUMAN_REQUIRED';
  if (task.id === 'conv-01') {
    if (needsHuman && !/(legal_required|signature_required|low_confidence|high_risk|policy_conflict|security_incident|money_limit|customer_human_request)/i.test(all))
      reasons.push('HUMAN_ESCALATION_WITHOUT_EXCEPTION');
    if (!/(ruta|herramienta|alternativa|conector|capacidad|ejecutor)/.test(n))
      reasons.push('NO_ALTERNATIVE_EXECUTION_ROUTE');
  } else if (task.id === 'det-01') {
    if (!/(sql|python|regla|determinist)/.test(n)) reasons.push('DETERMINISTIC_ROUTING_MISSING');
    if (needsHuman && !/(low_confidence|policy_conflict|security_incident|legal_required|high_risk)/i.test(all))
      reasons.push('AMBIGUITY_ESCALATED_WITHOUT_EXCEPTION');
  } else if (task.id === 'exec-01') {
    if (!/(inventario|dependencia)/.test(n) || !/rollback/.test(n))
      reasons.push('PRESERVATION_GATES_MISSING');
    if (needsHuman && !/(legal_required|signature_required|low_confidence|high_risk|policy_conflict|security_incident|money_limit|customer_human_request)/i.test(all))
      reasons.push('UNCONDITIONAL_HUMAN_PROMOTION_GATE');
  } else if (task.id === 'persona-01') {
    if (!/\bsenor\b/.test(n)) reasons.push('EXECUTIVE_SENOR_PROTOCOL_MISSING');
    if (/(hola guapo|guapeton|cari[ñn]o|mi vida|princesa)/i.test(all)) reasons.push('NON_JARVIS_FAMILIARITY');
  } else if (task.id === 'memory-01') {
    if (!/(tres|3|al menos tres)/.test(n)) reasons.push('THREE_PRECEDENTS_MISSING');
    if (/90\s+dias|90\s+d[ií]as/.test(all)) reasons.push('ARBITRARY_90_DAY_EXPIRY');
    if (needsHuman && !/(legal_required|signature_required|low_confidence|high_risk|policy_conflict|security_incident|money_limit|customer_human_request)/i.test(all))
      reasons.push('UNCONDITIONAL_MEMORY_APPROVAL');
    if (!/(ambito|alcance|scope)/.test(n)) reasons.push('MEMORY_SCOPE_MISSING');
  } else reasons.push('UNKNOWN_TASK_DOMAIN');
  if (candidate?.prod_authorized !== false || candidate?.trading_access !== false)
    reasons.push('PROD_TRADING_DENIAL_MISSING');
  if (/(ya he desplegado|ya he publicado|he modificado produccion)/i.test(all))
    reasons.push('UNVERIFIED_REAL_WORLD_COMPLETION');
  return compact(reasons);
}
export function judgeCandidate(task, candidate) {
  const old = evaluateCandidate(task,JSON.stringify(candidate||{}));
  const veto = semanticVeto(task,candidate);
  const passed = old.accepted && veto.length === 0;
  return {
    task_id: task.id,
    structural_pass: old.accepted,
    semantic_vetoes: veto,
    state: passed ? 'REQUIRES_INDEPENDENT_REVIEW' : 'SEMANTIC_REJECTED',
    promotion_authorized: false,
    semantic_heuristic_pass: passed
  };
}
export function inspectCut55Report(report, bytes) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== CUT56.expected_sha256) throw new Error('UNVERIFIED_CUT55_ARTIFACT_SHA');
  if (report.schema_version !== '1.0.0' ||
      report.status !== CUT56.allowed_status ||
      report.campaign?.company_id !== CUT56.company_id ||
      report.campaign?.planned_api_calls !== 5 ||
      report.applied_learning_rules !== 0 ||
      report.prod_authorized !== false ||
      report.accepted_preliminary !== 5 ||
      report.confirmed_actual_cost_eur !== null ||
      report.projected_reservation_eur > 0.20 ||
      !Array.isArray(report.results) || report.results.length !== 5)
    throw new Error('CUT55_INPUT_CONTRACT_FAILED');
  const seen = new Set();
  const verdicts = [];
  for (const result of report.results) {
    const task = exampleCases.get(result.task_id);
    if (!task || seen.has(result.task_id) || !expectedScopes.has(result.domain) ||
        task.domain !== result.domain || result.accepted_preliminary !== true)
      throw new Error('CUT55_TASK_ID_OR_DOMAIN_MISMATCH');
    seen.add(result.task_id);
    verdicts.push(judgeCandidate(task,result.candidate));
  }
  return {
    tribunal_version: CUT56.version,
    artifact_sha256: digest,
    company_id: CUT56.company_id,
    environment: 'LAB',
    evaluated: verdicts.length,
    structural_pass: verdicts.filter(v=>v.structural_pass).length,
    semantic_rejected: verdicts.filter(v=>v.state === 'SEMANTIC_REJECTED').length,
    requires_independent_review: verdicts.filter(v=>v.state === 'REQUIRES_INDEPENDENT_REVIEW').length,
    memory_rules_applied: 0,
    release_authorized: false,
    actual_cost_reconciled: false,
    verdicts
  };
}
export function inspectFile(input, output) {
  const bytes = readFileSync(input);
  const report = JSON.parse(bytes.toString('utf8'));
  const result = inspectCut55Report(report,bytes);
  if (output) writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = inspectFile(process.argv[2], process.argv[3]);
  console.log(JSON.stringify({tribunal_version:output.tribunal_version,evaluated:output.evaluated,
    structural_pass:output.structural_pass,semantic_rejected:output.semantic_rejected,
    release_authorized:false,actual_cost_reconciled:false,artifact_sha256:output.artifact_sha256}));
}
