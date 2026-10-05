import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INDEX = path.join(HERE, 'internal-capability-signals.v0.json');

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/[_/.-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(text) {
  return new Set(normalizeText(text).split(/[^a-z0-9áéíóúüñ+#]+/i).filter((item) => item.length >= 2));
}

function phraseMatches(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedPhrase.includes(' ')) return text.includes(normalizedPhrase);
  return tokenSet(text).has(normalizedPhrase);
}

export function buildCandidateText(candidate, upstream = null) {
  const sourceRef = candidate?.source_ref ?? '';
  let slug = '';
  try {
    const url = new URL(sourceRef);
    slug = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {}
  return normalizeText([
    slug,
    upstream?.full_name,
    upstream?.name,
    upstream?.description,
    ...(upstream?.topics ?? []),
    upstream?.language
  ].filter(Boolean).join(' '));
}

export function scoreDomains(text, index) {
  if (!index?.domains || !Array.isArray(index.domains)) throw new Error('capability index domains required');
  const scores = [];
  for (const domain of index.domains) {
    const matched = [];
    for (const keyword of domain.keywords ?? []) {
      if (phraseMatches(text, keyword)) matched.push(keyword);
    }
    if (!matched.length) continue;
    scores.push({
      domain_id: domain.domain_id,
      match_count: matched.length,
      matched_keywords: matched,
      engine_bindings: [...(domain.engine_bindings ?? [])]
    });
  }
  return scores.sort((a, b) => b.match_count - a.match_count || a.domain_id.localeCompare(b.domain_id));
}

function findUpstreamForCandidate(candidate, upstreamReport) {
  for (const repo of upstreamReport?.results ?? []) {
    if ((repo.discovery_candidate_ids ?? []).includes(candidate.candidate_id)) return repo;
  }
  return null;
}

function knownUpstreamState(upstream, index) {
  if (!upstream?.full_name) return false;
  const target = upstream.full_name.toLowerCase();
  return (index.known_upstreams ?? []).some((item) => String(item).toLowerCase() === target);
}

export function analyzeCandidateOverlap(candidate, upstream, index) {
  const text = buildCandidateText(candidate, upstream);
  const domains = scoreDomains(text, index);
  let overlap_state = 'CAPABILITY_GAP_CANDIDATE';
  if (knownUpstreamState(upstream, index)) overlap_state = 'EXACT_KNOWN_UPSTREAM';
  else if (domains.length) overlap_state = 'EXISTING_DOMAIN_OVERLAP';

  const quality_flags = [];
  if (!upstream) quality_flags.push('UPSTREAM_NOT_RESOLVED');
  if (upstream?.archived) quality_flags.push('UPSTREAM_ARCHIVED');
  if (upstream?.disabled) quality_flags.push('UPSTREAM_DISABLED');
  if (!upstream?.license_spdx || upstream?.license_spdx === 'NOASSERTION') quality_flags.push('LICENSE_METADATA_INCOMPLETE');
  if (!upstream?.head_commit) quality_flags.push('HEAD_COMMIT_UNRESOLVED');

  return {
    candidate_id: candidate.candidate_id,
    source_ref: candidate.source_ref,
    primary_upstream_hint: candidate.primary_upstream_hint ?? null,
    upstream_full_name: upstream?.full_name ?? null,
    upstream_head_commit: upstream?.head_commit ?? null,
    overlap_state,
    top_domains: domains.slice(0, 4),
    suggested_engine_bindings: [...new Set(domains.slice(0, 3).flatMap((item) => item.engine_bindings))],
    quality_flags,
    disposition: overlap_state === 'EXACT_KNOWN_UPSTREAM'
      ? 'DEDUP_REUSE_EXISTING'
      : overlap_state === 'EXISTING_DOMAIN_OVERLAP'
        ? 'WRAP_OR_EXTEND_EXISTING_DOMAIN'
        : 'GAP_REVIEW_REQUIRED',
    executed: false
  };
}

export function analyzeDiscoveryOverlap(discoveryReport, upstreamReport, index) {
  const candidates = [];
  for (const source of discoveryReport?.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      const upstream = findUpstreamForCandidate(candidate, upstreamReport);
      candidates.push(analyzeCandidateOverlap(candidate, upstream, index));
    }
  }
  const counts = {};
  for (const item of candidates) counts[item.overlap_state] = (counts[item.overlap_state] ?? 0) + 1;
  return Object.freeze({
    schema_version: '0.1.0',
    execution_mode: 'ANALYZE_ONLY',
    candidates_total: candidates.length,
    overlap_counts: counts,
    code_executed: false,
    candidates
  });
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const discoveryPath = argValue('--discovery') ?? 'artifacts/cerebro-skill-discovery.json';
  const upstreamPath = argValue('--upstreams') ?? 'artifacts/cerebro-skill-upstreams.json';
  const indexPath = argValue('--index') ?? DEFAULT_INDEX;
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-overlap.json';
  const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
  const upstreams = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'));
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const report = analyzeDiscoveryOverlap(discovery, upstreams, index);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output, candidates_total: report.candidates_total, overlap_counts: report.overlap_counts, code_executed: false}));
}
