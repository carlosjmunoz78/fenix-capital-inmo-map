import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

export function certifyStep6DomainPromotionClosure() {
  const closure = readJson('cerebro/registry/step6-domain-promotion-dispositions.v0.json');
  const policies = readJson('cerebro/registry/rsi-domain-autonomy-policies.v0.json');
  const evidence = readJson('cerebro/registry/rsi-domain-evidence-sources.v0.json');
  const engines = readJson('cerebro/registry/engine-registry.seed.json');

  const expected = ['APP-001','AUTO-001','CRM-001','DATA-001','KNW-001','LRN-001','MKT-001','SEO-001','TRN-001','WEB-001'].sort();
  const dispositions = [...closure.dispositions].sort((a,b)=>a.engine_id.localeCompare(b.engine_id));
  const ids = dispositions.map(x=>x.engine_id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error(`Step6 domain set drift:${ids.join(',')}`);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate domain disposition');
  if (closure.summary?.canonical_domains_total !== 10 || closure.summary?.unclassified !== 0) throw new Error('Step6 is not fully classified');

  for (const x of [closure, policies, evidence]) {
    if (x.company_id !== 'fenix' || x.environment !== 'PREPROD') throw new Error('scope drift');
    if (x.prod_authorized !== false || x.prod_write_authorized !== false || x.trading_access !== false) throw new Error('authority drift');
    if (x.additional_cost_eur !== 0 || x.multicompany_continuation !== false) throw new Error('cost or MULTIEMPRESA drift');
  }
  if (closure.business_execution_authorized !== false || closure.paid_fallback !== false) throw new Error('execution/cost guard drift');

  const canonical = new Set(engines.engine_ids);
  const policyByEngine = new Map(policies.policies.map(x=>[x.engine_id,x]));
  const evidenceByEngine = new Map(evidence.bindings.map(x=>[x.engine_id,x]));
  for (const d of dispositions) {
    if (!canonical.has(d.engine_id)) throw new Error(`non-canonical engine:${d.engine_id}`);
    const p = policyByEngine.get(d.engine_id);
    const e = evidenceByEngine.get(d.engine_id);
    if (!p || !e) throw new Error(`missing policy/evidence:${d.engine_id}`);
    if (p.domain_id !== d.domain_id || e.domain_id !== d.domain_id) throw new Error(`domain binding drift:${d.engine_id}`);
    if (p.autonomy_mode !== d.policy_mode) throw new Error(`policy/disposition drift:${d.engine_id}`);
    if (p.kill_switch_enabled !== true || p.automatic_rollback_allowed !== true || p.additional_cost_limit_eur !== 0) throw new Error(`unsafe policy:${d.engine_id}`);
    if (d.prod_authority !== false) throw new Error(`unexpected PROD authority:${d.engine_id}`);
    if (d.policy_mode === 'ASSISTED' && !String(d.decision).startsWith('HOLD_')) throw new Error(`assisted domain lacks explicit HOLD:${d.engine_id}`);
  }

  const autonomous = dispositions.filter(x=>x.policy_mode==='PREPROD_AUTONOMOUS').map(x=>x.engine_id).sort();
  if (JSON.stringify(autonomous) !== JSON.stringify(['AUTO-001','LRN-001'])) throw new Error(`autonomous set drift:${autonomous}`);
  if (closure.summary.preprod_autonomous_postmerge_certified !== 2 || closure.summary.assisted_or_hold !== 8) throw new Error('summary counts drift');

  const lrn = policyByEngine.get('LRN-001');
  const auto = policyByEngine.get('AUTO-001');
  if (lrn.evidence_state !== 'POST_MERGE_CERTIFIED') throw new Error('LRN-001 postmerge certification missing');
  if (auto.evidence_state !== 'FIRST_REAL_DOMAIN_POST_MERGE_CERTIFIED') throw new Error('AUTO-001 postmerge certification missing');

  const seo = dispositions.find(x=>x.engine_id==='SEO-001');
  if (seo.decision !== 'HOLD_CORE_GUARD_CANONICAL_RECONCILIATION') throw new Error('SEO physical Core Guard gate bypassed');
  if (!seo.remaining_blocker.includes('CORE_GUARD_CANONICAL_RECONCILIATION_BEFORE_PROD_PROMOTION')) throw new Error('SEO blocker detail missing');

  return {
    ok: true,
    status: 'STEP6_DOMAIN_PROMOTION_CLOSED_SAFE',
    macro_step: '6/6',
    classified_domains: 10,
    autonomous_preprod: autonomous,
    assisted_or_hold: 8,
    prod_authorized: false,
    prod_write_authorized: false,
    business_execution_authorized: false,
    trading_access: false,
    multicompany_continuation: false,
    additional_cost_eur: 0,
    browser_binding_is_separate_step4_gate: true
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(certifyStep6DomainPromotionClosure(), null, 2));
}
