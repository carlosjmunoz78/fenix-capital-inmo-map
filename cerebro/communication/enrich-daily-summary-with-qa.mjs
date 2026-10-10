#!/usr/bin/env node
import fs from 'node:fs';

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

export function enrichDailySummary(summary, qa) {
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
  const outPath = arg('--out') ?? summaryPath;
  if (!summaryPath || !qaPath || !outPath) throw new Error('usage: enrich-daily-summary-with-qa.mjs --summary <json> --quality-state <json> [--out <json>]');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  fs.writeFileSync(outPath, JSON.stringify(enrichDailySummary(summary, qa), null, 2) + '\n');
}
