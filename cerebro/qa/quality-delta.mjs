#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function readJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fp(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

function flattenReport(report) {
  const tests = [];
  const walk = (suite, parents = []) => {
    const suitePath = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = (test.results ?? []).at(-1) ?? {};
        const status = test.status ?? result.status ?? 'unknown';
        tests.push({
          title: [...suitePath, spec.title].filter(Boolean).join(' › '),
          project: test.projectName ?? test.projectId ?? 'unknown',
          status,
          result_status: result.status ?? status,
          duration_ms: Number(result.duration ?? 0),
          errors: (result.errors ?? []).map(x => String(x?.message ?? x)).filter(Boolean)
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, suitePath);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return tests;
}

function kindFromTitle(title) {
  if (/\[APP\]/i.test(title)) return 'APP';
  if (/\[WEB\]/i.test(title)) return 'WEB';
  if (/\[PRODUCT\]/i.test(title)) return 'PRODUCT';
  return 'OTHER';
}

function ownerFor(kind, title) {
  if (/seo/i.test(title)) return 'SEO-001';
  if (/api/i.test(title)) return 'API-001';
  if (/ux|friction|responsive|visual/i.test(title)) return 'HCI-001';
  if (kind === 'APP') return 'APP-001';
  if (kind === 'WEB') return 'WEB-001';
  if (kind === 'PRODUCT') return 'QAB-001';
  return 'QA-001';
}

function isFailure(test) {
  return ['unexpected', 'failed', 'timedOut', 'interrupted'].includes(test.status) || ['failed', 'timedOut', 'interrupted'].includes(test.result_status);
}

function summarizeTarget(kind, tests) {
  const matching = tests.filter(t => kindFromTitle(t.title) === kind);
  if (!matching.length) return {status: 'POR_AUDITAR', executed: 0, failed: 0, passed: 0};
  const failed = matching.filter(isFailure).length;
  const passed = matching.filter(t => !isFailure(t) && t.status !== 'skipped').length;
  return {status: failed ? 'RED' : 'GREEN', executed: matching.length, failed, passed};
}

function summarizeExplicitTests(tests) {
  const executed = tests.filter(t => t.status !== 'skipped');
  const failed = executed.filter(isFailure);
  return {
    status: executed.length ? (failed.length ? 'RED' : 'GREEN') : 'POR_AUDITAR',
    executed: executed.length,
    failed: failed.length,
    passed: executed.length - failed.length
  };
}

export function buildQualityState({report = {}, authenticatedReport = {}, previous = {}, now = new Date().toISOString(), targetsRegistry = {}} = {}) {
  const publicTests = flattenReport(report);
  const authenticatedTests = flattenReport(authenticatedReport).map(test => ({
    ...test,
    title: `[APP] [AUTH_SYNTHETIC_LOCAL] ${test.title}`,
    surface: 'APP_AUTH_SYNTHETIC_LOCAL'
  }));
  const tests = [...publicTests, ...authenticatedTests];
  const executed = tests.filter(t => t.status !== 'skipped');
  const failed = executed.filter(isFailure);
  const issues = failed.map(test => {
    const kind = kindFromTitle(test.title);
    const fingerprint = fp([kind, test.project, test.title]);
    return {
      fingerprint,
      severity: /500|unavailable|pageerror|crash|timedout/i.test(`${test.title} ${test.errors.join(' ')}`) ? 'HIGH' : 'MEDIUM',
      kind,
      title: test.title,
      project: test.project,
      owner_engine: ownerFor(kind, test.title),
      evidence: test.errors.slice(0, 3),
      next_action: 'REPRODUCE_AND_FIX_OR_ROUTE',
      auto_fix_eligible: false
    };
  });
  const current = new Set(issues.map(x => x.fingerprint));
  const prev = new Set(previous.issue_fingerprints ?? []);
  const newIds = [...current].filter(x => !prev.has(x));
  const resolvedIds = [...prev].filter(x => !current.has(x));
  const recurringIds = [...current].filter(x => prev.has(x));
  const high = issues.filter(x => x.severity === 'HIGH').length;
  const score = executed.length ? Math.max(0, 100 - failed.length * 12 - high * 8) : null;
  const previousScore = Number.isFinite(previous.quality_score) ? previous.quality_score : null;
  const enabledProducts = (targetsRegistry.targets ?? []).some(t => t.kind === 'PRODUCT' && t.enabled);
  const productTarget = summarizeTarget('PRODUCT', tests);
  if (!enabledProducts && productTarget.executed === 0) productTarget.status = 'POR_AUDITAR';
  const authenticatedTarget = summarizeExplicitTests(authenticatedTests);
  return {
    schema_version: '0.2.0',
    state_type: 'CEREBRO_CONTINUOUS_HUMAN_QA_STATE_V0',
    company_id: 'fenix',
    engine_id: 'QA-001',
    environment: 'CONTROL_PLANE',
    version: '0.2.0',
    status: executed.length ? (failed.length ? 'FINDINGS_OPEN' : 'GREEN') : 'NO_MEASUREMENT',
    updated_at: now,
    quality_score: score,
    previous_quality_score: previousScore,
    quality_delta: score !== null && previousScore !== null ? score - previousScore : null,
    tests: {executed: executed.length, passed: executed.length - failed.length, failed: failed.length},
    targets: {
      APP: summarizeTarget('APP', tests),
      APP_AUTH_SYNTHETIC_LOCAL: authenticatedTarget,
      WEB: summarizeTarget('WEB', tests),
      PRODUCT: productTarget
    },
    issues,
    issue_fingerprints: [...current],
    new_issue_fingerprints: newIds,
    resolved_issue_fingerprints: resolvedIds,
    recurring_issue_fingerprints: recurringIds,
    new_issues: issues.filter(x => newIds.includes(x.fingerprint)),
    dispatch_queue: issues.filter(x => newIds.includes(x.fingerprint)).map(x => ({fingerprint: x.fingerprint, owner_engine: x.owner_engine, action: x.next_action})),
    learned_regression_tests: Number(previous.learned_regression_tests ?? 0),
    recurring_issues: recurringIds.length,
    human_required: [],
    coverage: {
      prod: 'READ_ONLY_PUBLIC_SURFACES',
      app_authenticated: authenticatedTarget.executed ? 'LOCAL_ISOLATED_SYNTHETIC_NO_CUSTOMER_DATA' : 'POR_AUDITAR_PREPROD_HARNESS',
      app_authenticated_deployed_preprod: 'POR_AUDITAR_CANONICAL_PREPROD_TARGET',
      products: enabledProducts ? 'ENABLED_SYNTHETIC_PREPROD' : 'POR_AUDITAR_CANONICAL_PREPROD_TARGET'
    },
    safety: {prod_write: false, customer_data: false, trading: false, paid_fallback: false, additional_subscription_eur: 0}
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = arg('--report');
  const authenticatedReportPath = arg('--authenticated-report');
  const previousPath = arg('--previous');
  const targetsPath = arg('--targets');
  const outPath = arg('--out');
  if (!reportPath || !outPath) throw new Error('usage: quality-delta.mjs --report <json> [--authenticated-report <json>] [--previous <json>] [--targets <json>] --out <json>');
  const state = buildQualityState({
    report: readJson(reportPath, {}),
    authenticatedReport: readJson(authenticatedReportPath, {}),
    previous: readJson(previousPath, {}),
    targetsRegistry: readJson(targetsPath, {})
  });
  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2) + '\n');
  console.log(JSON.stringify({status: state.status, score: state.quality_score, tests: state.tests, authenticated: state.targets.APP_AUTH_SYNTHETIC_LOCAL, new_issues: state.new_issue_fingerprints.length, resolved: state.resolved_issue_fingerprints.length}));
}
