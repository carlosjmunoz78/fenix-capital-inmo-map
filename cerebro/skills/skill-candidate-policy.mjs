import fs from 'node:fs';
import path from 'node:path';

const PERMISSIVE_METADATA = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'CC0-1.0']);
const CRITICAL_FLAGS = new Set(['CAPTCHA_BYPASS_TERMS', 'ANTI_DETECT_TERMS', 'CREDENTIAL_EXTRACTION_TERMS']);
const HIGH_REVIEW_FLAGS = new Set(['SHELL_PIPE_EXEC', 'DESTRUCTIVE_FS', 'SUDO_COMMAND', 'EVAL_EXECUTION']);
const PERMISSION_REVIEW_FLAGS = new Set(['SECRET_ACCESS_MENTION', 'NETWORK_DOWNLOAD_COMMAND']);

function byCandidate(report) {
  const map = new Map();
  for (const item of report?.results ?? report?.candidates ?? []) {
    if (item?.candidate_id) map.set(item.candidate_id, item);
  }
  return map;
}

function sourcePolicy(sourceId) {
  if (sourceId === 'fragroger-skills') return 'REFERENCE_ONLY';
  return 'DISCOVERY_ONLY';
}

function priorityFor(overlap) {
  const domain = overlap?.top_domains?.[0]?.domain_id ?? null;
  const p0 = new Set(['agent-ai-orchestration', 'software-engineering-devops', 'security-identity-privacy', 'observability-quality-resilience', 'browser-automation-scraping', 'data-database-supabase']);
  const p1 = new Set(['web-wordpress-frontend', 'seo-search-content', 'knowledge-research-training', 'documents-office-pdf', 'multi-company-business-bootstrap']);
  if (p0.has(domain)) return 'P0';
  if (p1.has(domain)) return 'P1';
  return 'P2';
}

function decide({sourceId, candidate, upstream, overlap, manifest}) {
  const evidence = [];
  const reasons = [];
  const policy = sourcePolicy(sourceId);

  if (policy === 'REFERENCE_ONLY') {
    return {disposition: 'REFERENCE_ONLY', gate: 'SOURCE_LICENSE_POLICY', priority: 'P2', reasons: ['SOURCE_REFERENCE_ONLY_BY_CONTRACT'], evidence};
  }
  if (!candidate?.primary_upstream_hint || !upstream) {
    return {disposition: 'QUARANTINE', gate: 'UPSTREAM_GATE', priority: 'P2', reasons: ['UPSTREAM_NOT_RESOLVED'], evidence};
  }
  evidence.push(`upstream:${upstream.full_name ?? candidate.primary_upstream_hint}`);
  if (upstream.archived === true) {
    return {disposition: 'QUARANTINE_ARCHIVED', gate: 'MAINTENANCE_GATE', priority: 'P2', reasons: ['UPSTREAM_ARCHIVED'], evidence};
  }
  if (upstream.disabled === true) {
    return {disposition: 'REJECTED', gate: 'MAINTENANCE_GATE', priority: 'P2', reasons: ['UPSTREAM_DISABLED'], evidence};
  }
  if (!manifest || manifest.status !== 'MANIFEST_RESOLVED_STATIC_ONLY') {
    return {disposition: 'QUARANTINE', gate: 'MANIFEST_GATE', priority: priorityFor(overlap), reasons: [manifest?.status ?? 'MANIFEST_NOT_RESOLVED'], evidence};
  }
  evidence.push(`manifest:${manifest.manifest_path}@${manifest.upstream_head_commit}`);

  const flags = new Set(manifest.static_flags ?? []);
  const critical = [...flags].filter((flag) => CRITICAL_FLAGS.has(flag));
  if (critical.length) {
    return {disposition: 'REJECTED_SECURITY_POLICY', gate: 'SECURITY_GATE', priority: 'P2', reasons: critical, evidence};
  }
  const highReview = [...flags].filter((flag) => HIGH_REVIEW_FLAGS.has(flag));
  if (highReview.length) {
    return {disposition: 'QUARANTINE_SECURITY_REVIEW', gate: 'SECURITY_GATE', priority: priorityFor(overlap), reasons: highReview, evidence};
  }

  const spdx = upstream.license_spdx;
  if (!spdx || spdx === 'NOASSERTION' || !PERMISSIVE_METADATA.has(spdx)) {
    reasons.push(!spdx || spdx === 'NOASSERTION' ? 'LICENSE_METADATA_INCOMPLETE' : `LICENSE_REVIEW_REQUIRED:${spdx}`);
    return {disposition: 'LICENSE_REVIEW_REQUIRED', gate: 'LICENSE_GATE', priority: priorityFor(overlap), reasons, evidence};
  }
  evidence.push(`repo_license_metadata:${spdx}`);

  const permissionReview = [...flags].filter((flag) => PERMISSION_REVIEW_FLAGS.has(flag));
  if (permissionReview.length) {
    return {disposition: 'PERMISSION_REVIEW_REQUIRED', gate: 'PERMISSION_GATE', priority: priorityFor(overlap), reasons: permissionReview, evidence};
  }

  if (overlap?.overlap_state === 'CAPABILITY_GAP_CANDIDATE') {
    return {disposition: 'GAP_REVIEW_REQUIRED', gate: 'OVERLAP_GATE', priority: priorityFor(overlap), reasons: ['NO_EXISTING_DOMAIN_MATCH_CONFIRMED'], evidence};
  }
  if (overlap?.overlap_state === 'EXACT_KNOWN_UPSTREAM') {
    return {disposition: 'REUSE_EXISTING', gate: 'DEDUP_GATE', priority: priorityFor(overlap), reasons: ['EXACT_KNOWN_UPSTREAM'], evidence};
  }
  return {disposition: 'LAB_REVIEW_CANDIDATE', gate: 'LAB_GATE', priority: priorityFor(overlap), reasons: ['STATIC_PREFLIGHT_CLEAR', 'PERMISSIVE_REPO_LICENSE_METADATA_PRESENT', 'EXISTING_DOMAIN_OVERLAP'], evidence};
}

export function buildCandidatePolicyReport(discovery, upstreams, overlapReport, manifestReport) {
  const upstreamMap = new Map();
  for (const repo of upstreams?.results ?? []) {
    for (const candidateId of repo.discovery_candidate_ids ?? []) upstreamMap.set(candidateId, repo);
  }
  const overlapMap = byCandidate(overlapReport);
  const manifestMap = byCandidate(manifestReport);
  const results = [];
  for (const source of discovery?.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      const upstream = upstreamMap.get(candidate.candidate_id) ?? null;
      const overlap = overlapMap.get(candidate.candidate_id) ?? null;
      const manifest = manifestMap.get(candidate.candidate_id) ?? null;
      const decision = decide({sourceId: source.source_id, candidate, upstream, overlap, manifest});
      results.push({
        candidate_id: candidate.candidate_id,
        source_id: source.source_id,
        source_ref: candidate.source_ref,
        upstream_full_name: upstream?.full_name ?? null,
        upstream_head_commit: upstream?.head_commit ?? null,
        manifest_path: manifest?.manifest_path ?? null,
        manifest_sha256: manifest?.sha256 ?? null,
        top_domain: overlap?.top_domains?.[0]?.domain_id ?? null,
        suggested_engine_bindings: overlap?.suggested_engine_bindings ?? [],
        overlap_state: overlap?.overlap_state ?? null,
        repo_license_spdx: upstream?.license_spdx ?? null,
        license_compatibility: 'NOT_FINAL_LEGAL_DETERMINATION',
        static_flags: manifest?.static_flags ?? [],
        ...decision,
        executable: false,
        install_authorized: false,
        prod_authorized: false
      });
    }
  }
  const disposition_counts = {};
  const priority_counts = {};
  for (const item of results) {
    disposition_counts[item.disposition] = (disposition_counts[item.disposition] ?? 0) + 1;
    priority_counts[item.priority] = (priority_counts[item.priority] ?? 0) + 1;
  }
  const shortlist = results.filter((item) => item.disposition === 'LAB_REVIEW_CANDIDATE');
  return Object.freeze({
    schema_version: '0.1.0',
    execution_mode: 'POLICY_AND_SHORTLIST_ONLY',
    disposition_counts,
    priority_counts,
    lab_review_candidates: shortlist.length,
    install_authorized: false,
    prod_authorized: false,
    results
  });
}

function argValue(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const discovery = JSON.parse(fs.readFileSync(argValue('--discovery') ?? 'artifacts/cerebro-skill-discovery.json', 'utf8'));
  const upstreams = JSON.parse(fs.readFileSync(argValue('--upstreams') ?? 'artifacts/cerebro-skill-upstreams.json', 'utf8'));
  const overlap = JSON.parse(fs.readFileSync(argValue('--overlap') ?? 'artifacts/cerebro-skill-overlap.json', 'utf8'));
  const manifests = JSON.parse(fs.readFileSync(argValue('--manifests') ?? 'artifacts/cerebro-skill-manifests.json', 'utf8'));
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-shortlist.json';
  const report = buildCandidatePolicyReport(discovery, upstreams, overlap, manifests);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output, disposition_counts: report.disposition_counts, priority_counts: report.priority_counts, lab_review_candidates: report.lab_review_candidates, install_authorized: false, prod_authorized: false}));
}
