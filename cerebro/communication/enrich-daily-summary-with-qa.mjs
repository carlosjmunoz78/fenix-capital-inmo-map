#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function scoreLabel(value) {
  return Number.isFinite(value) ? String(value) : 'SIN MEDICIÓN';
}

function deltaLabel(value) {
  if (!Number.isFinite(value)) return 'sin comparativa previa';
  return value > 0 ? `+${value}` : String(value);
}

function targetLine(label, target, coverage) {
  if (!target || target.status === 'POR_AUDITAR') return `QA ${label}: POR AUDITAR${coverage ? ` · ${coverage}` : ''}`;
  return `QA ${label}: ${target.status} · ${target.executed ?? 0} comprobaciones · ${target.failed ?? 0} fallos`;
}

function repairLine(autoState) {
  if (!autoState || autoState.state_type !== 'CEREBRO_AUTO001_REPAIR_AUTONOMY_STATE_V0') return null;
  const patch = autoState.preprod_patch_validated === true ? 'PATCH VALIDADO' : 'PATCH NO VALIDADO';
  const tribunal = autoState.tribunal_approved === true ? 'Tribunal GREEN' : 'Tribunal PENDIENTE/RED';
  const pr = autoState.pr_handoff_status ?? 'SIN PR';
  const promotion = autoState.promotion_readiness?.status ?? 'POR AUDITAR';
  const reason = autoState.promotion_readiness?.human_required?.reason;
  return `REPARACIÓN AUTÓNOMA · ${patch} · ${tribunal} · PR ${pr} · Promoción ${promotion}${reason ? `/${reason}` : ''}`;
}

function loadAutoState(autoPath) {
  if (autoPath && fs.existsSync(autoPath)) return JSON.parse(fs.readFileSync(autoPath, 'utf8'));
  const branch = process.env.QA_STATE_BRANCH || 'cerebro/qa-state-v0';
  const statePath = process.env.AUTO_REPAIR_STATE_PATH || 'cerebro/runtime/auto001-repair-autonomy-state.v0.json';
  try {
    const raw = execFileSync('git', ['show', `refs/remotes/origin/${branch}:${statePath}`], {encoding:'utf8', stdio:['ignore','pipe','ignore']});
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function enrichDailySummary(summary, qa, autoState = null) {
  const out = structuredClone(summary ?? {});
  out.human = Array.isArray(out.human) ? out.human : [];
  out.app_crm = Array.isArray(out.app_crm) ? out.app_crm : [];
  out.seo_web = Array.isArray(out.seo_web) ? out.seo_web : [];
  out.failures = Array.isArray(out.failures) ? out.failures : [];
  out.next_safe_work = Array.isArray(out.next_safe_work) ? out.next_safe_work : [];

  if (!qa || qa.state_type !== 'CEREBRO_CONTINUOUS_HUMAN_QA_STATE_V0') {
    out.human.unshift('CALIDAD DIARIA · QA-001 aún sin estado verificable');
    return out;
  }

  const totalNew = qa.new_issue_fingerprints?.length ?? 0;
  const totalResolved = qa.resolved_issue_fingerprints?.length ?? 0;
  out.human.unshift(
    `CALIDAD DIARIA · ${scoreLabel(qa.previous_quality_score)} → ${scoreLabel(qa.quality_score)} · ${deltaLabel(qa.quality_delta)} · ${totalNew} fallos nuevos · ${totalResolved} resueltos · ${qa.recurring_issues ?? 0} reincidentes`
  );

  const autoLine = repairLine(autoState);
  if (autoLine) out.human.splice(1, 0, autoLine);

  out.app_crm.unshift(targetLine('App', qa.targets?.APP, qa.coverage?.app_authenticated));
  out.seo_web.unshift(targetLine('Web', qa.targets?.WEB));
  out.app_crm.push(targetLine('Productos', qa.targets?.PRODUCT, qa.coverage?.products));
  out.app_crm.push(`QA aprendizaje: ${qa.learned_regression_tests ?? 0} tests de regresión acumulados`);

  const improvements = qa.improvement_scout?.candidates_total ?? 0;
  const preprodCandidates = qa.remediation?.candidate_packages_total ?? 0;
  const routedCases = qa.remediation?.open_cases ?? 0;
  const humanHolds = qa.remediation?.human_required?.length ?? 0;
  if (qa.improvement_scout || qa.remediation) {
    out.human.push(`MEJORA CONTINUA · ${improvements} oportunidades medidas · ${routedCases} casos enrutados · ${preprodCandidates} candidatas PREPROD · ${humanHolds} HUMAN_REQUIRED`);
  }

  if (autoState?.promotion_readiness?.status === 'HUMAN_REQUIRED') {
    const hold = autoState.promotion_readiness.human_required;
    out.failures.push(`PROMOCIÓN HUMAN_REQUIRED · ${hold?.reason ?? 'POLICY_CONFLICT'} · ${(hold?.blockers ?? []).join(', ')}`);
    out.next_safe_work.push('AUTO-001 → mantener parche validado en PREPROD hasta resolver política de promoción; no tocar PROD');
  }

  for (const issue of qa.new_issues ?? []) {
    out.failures.push(`QA NUEVO · ${issue.kind} · ${issue.severity} · ${issue.owner_engine} · ${issue.title}`);
  }
  for (const item of qa.dispatch_queue ?? []) {
    out.next_safe_work.push(`QA → ${item.owner_engine}: reproducir, corregir o enrutar ${item.fingerprint}`);
  }
  for (const item of qa.improvement_scout?.top_candidates ?? []) {
    out.next_safe_work.push(`MEJORA → ${item.engine_id}: ${item.title} · ${item.next_gate}`);
  }
  for (const hold of qa.remediation?.human_required ?? []) {
    out.failures.push(`QA HUMAN_REQUIRED · ${hold.reason} · ${hold.owner_engine} · ${hold.case_id}`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summaryPath = arg('--summary');
  const qaPath = arg('--quality-state');
  const autoPath = arg('--auto-state');
  const outPath = arg('--out') ?? summaryPath;
  if (!summaryPath || !qaPath || !outPath) throw new Error('usage: enrich-daily-summary-with-qa.mjs --summary <json> --quality-state <json> [--auto-state <json>] [--out <json>]');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  const autoState = loadAutoState(autoPath);
  fs.writeFileSync(outPath, JSON.stringify(enrichDailySummary(summary, qa, autoState), null, 2) + '\n');
}