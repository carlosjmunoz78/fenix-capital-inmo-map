import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INDEX = path.join(HERE, 'internal-capability-signals.v0.json');
const GENERIC_KEYWORDS = new Set(['agent','agents','skill','skills','tool','tools','data','web','business','company','companies','content','page','pages','model','models','user','users']);

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/[_/.-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(text) {
  return new Set(normalizeText(text).split(/[^a-z0-9áéíóúüñ+#]+/i).filter((item) => item.length >= 2));
}

function phraseMatches(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedPhrase.includes(' ')) return normalizeText(text).includes(normalizedPhrase);
  return tokenSet(text).has(normalizedPhrase);
}

function keywordSpecificity(keyword) {
  const k = normalizeText(keyword);
  if (GENERIC_KEYWORDS.has(k)) return 0.2;
  if (k.includes(' ')) return 2.2;
  if (k.length >= 10) return 1.7;
  if (k.length >= 6) return 1.35;
  return 1;
}

function candidateSlug(candidate) {
  try {
    const url = new URL(candidate?.source_ref ?? '');
    return url.pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    return '';
  }
}

export function buildCandidateSignals(candidate, upstream = null, manifest = null) {
  return [
    {source: 'manifest_name', text: normalizeText(manifest?.declared_name), weight: 9},
    {source: 'manifest_description', text: normalizeText(manifest?.declared_description), weight: 8},
    {source: 'candidate_slug', text: normalizeText(candidateSlug(candidate)), weight: 7},
    {source: 'upstream_topics', text: normalizeText((upstream?.topics ?? []).join(' ')), weight: 2.5},
    {source: 'upstream_description', text: normalizeText(upstream?.description), weight: 2},
    {source: 'upstream_name', text: normalizeText([upstream?.full_name, upstream?.name].filter(Boolean).join(' ')), weight: 1},
    {source: 'language', text: normalizeText(upstream?.language), weight: 0.25}
  ].filter((item) => item.text);
}

export function buildCandidateText(candidate, upstream = null, manifest = null) {
  return buildCandidateSignals(candidate, upstream, manifest).map((item) => item.text).join(' ');
}

export function scoreDomains(input, index) {
  if (!index?.domains || !Array.isArray(index.domains)) throw new Error('capability index domains required');
  const signals = Array.isArray(input) ? input : [{source: 'legacy', text: normalizeText(input), weight: 1}];
  const scores = [];
  for (const domain of index.domains) {
    let weightedScore = 0;
    const evidence = [];
    const uniqueKeywords = new Set();
    for (const keyword of domain.keywords ?? []) {
      for (const signal of signals) {
        if (!phraseMatches(signal.text, keyword)) continue;
        const contribution = signal.weight * keywordSpecificity(keyword);
        weightedScore += contribution;
        uniqueKeywords.add(keyword);
        evidence.push({keyword, source: signal.source, contribution: Number(contribution.toFixed(2))});
      }
    }
    if (weightedScore <= 0) continue;
    scores.push({
      domain_id: domain.domain_id,
      score: Number(weightedScore.toFixed(2)),
      match_count: uniqueKeywords.size,
      matched_keywords: [...uniqueKeywords],
      evidence: evidence.sort((a,b) => b.contribution-a.contribution).slice(0,12),
      engine_bindings: [...(domain.engine_bindings ?? [])]
    });
  }
  return scores.sort((a, b) => b.score - a.score || b.match_count - a.match_count || a.domain_id.localeCompare(b.domain_id));
}

function findUpstreamForCandidate(candidate, upstreamReport) {
  for (const repo of upstreamReport?.results ?? []) {
    if ((repo.discovery_candidate_ids ?? []).includes(candidate.candidate_id)) return repo;
  }
  return null;
}

function findManifestForCandidate(candidate, manifestReport) {
  return (manifestReport?.results ?? []).find((item) => item.candidate_id === candidate.candidate_id) ?? null;
}

function knownUpstreamState(upstream, index) {
  if (!upstream?.full_name) return false;
  const target = upstream.full_name.toLowerCase();
  return (index.known_upstreams ?? []).some((item) => String(item).toLowerCase() === target);
}

export function analyzeCandidateOverlap(candidate, upstream, index, manifest = null) {
  const signals = buildCandidateSignals(candidate, upstream, manifest);
  const domains = scoreDomains(signals, index);
  const topScore = domains[0]?.score ?? 0;
  let overlap_state = 'CAPABILITY_GAP_CANDIDATE';
  if (knownUpstreamState(upstream, index)) overlap_state = 'EXACT_KNOWN_UPSTREAM';
  else if (topScore >= 4) overlap_state = 'EXISTING_DOMAIN_OVERLAP';

  const quality_flags = [];
  if (!upstream) quality_flags.push('UPSTREAM_NOT_RESOLVED');
  if (upstream?.archived) quality_flags.push('UPSTREAM_ARCHIVED');
  if (upstream?.disabled) quality_flags.push('UPSTREAM_DISABLED');
  if (!upstream?.license_spdx || upstream?.license_spdx === 'NOASSERTION') quality_flags.push('LICENSE_METADATA_INCOMPLETE');
  if (!upstream?.head_commit) quality_flags.push('HEAD_COMMIT_UNRESOLVED');
  if (!manifest || manifest.status !== 'MANIFEST_RESOLVED_STATIC_ONLY') quality_flags.push('MANIFEST_SEMANTICS_UNAVAILABLE');

  const primaryDomain = domains[0] ?? null;

  return {
    candidate_id: candidate.candidate_id,
    source_ref: candidate.source_ref,
    primary_upstream_hint: candidate.primary_upstream_hint ?? null,
    upstream_full_name: upstream?.full_name ?? null,
    upstream_head_commit: upstream?.head_commit ?? null,
    manifest_path: manifest?.manifest_path ?? null,
    manifest_name: manifest?.declared_name ?? null,
    overlap_state,
    overlap_confidence_score: Number(topScore.toFixed(2)),
    top_domains: domains.slice(0, 4),
    binding_domain_id: primaryDomain?.domain_id ?? null,
    suggested_engine_bindings: [...new Set(primaryDomain?.engine_bindings ?? [])],
    quality_flags,
    disposition: overlap_state === 'EXACT_KNOWN_UPSTREAM'
      ? 'DEDUP_REUSE_EXISTING'
      : overlap_state === 'EXISTING_DOMAIN_OVERLAP'
        ? 'WRAP_OR_EXTEND_EXISTING_DOMAIN'
        : 'GAP_REVIEW_REQUIRED',
    executed: false
  };
}

export function analyzeDiscoveryOverlap(discoveryReport, upstreamReport, index, manifestReport = null) {
  const candidates = [];
  for (const source of discoveryReport?.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      const upstream = findUpstreamForCandidate(candidate, upstreamReport);
      const manifest = findManifestForCandidate(candidate, manifestReport);
      candidates.push(analyzeCandidateOverlap(candidate, upstream, index, manifest));
    }
  }
  const counts = {};
  const domainCounts = {};
  for (const item of candidates) {
    counts[item.overlap_state] = (counts[item.overlap_state] ?? 0) + 1;
    const domain = item.binding_domain_id;
    if (domain) domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
  }
  return Object.freeze({
    schema_version: '0.2.1',
    execution_mode: 'ANALYZE_ONLY',
    candidates_total: candidates.length,
    overlap_counts: counts,
    top_domain_counts: domainCounts,
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
  const manifestPath = argValue('--manifests');
  const indexPath = argValue('--index') ?? DEFAULT_INDEX;
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-overlap.json';
  const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
  const upstreams = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'));
  const manifests = manifestPath ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const report = analyzeDiscoveryOverlap(discovery, upstreams, index, manifests);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output, candidates_total: report.candidates_total, overlap_counts: report.overlap_counts, top_domain_counts: report.top_domain_counts, code_executed: false}));
}
