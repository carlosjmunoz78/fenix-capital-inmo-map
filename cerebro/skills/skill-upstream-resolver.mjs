import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_REPOS = 24;

export function parseGithubRepoUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  if (!owner || !repo) return null;
  if (['owner/repo', 'user/repo', 'org/repo'].includes(`${owner}/${repo}`.toLowerCase())) return null;
  return {owner, repo, full_name: `${owner}/${repo}`, html_url: `https://github.com/${owner}/${repo}`};
}

export function collectUpstreamRepos(discoveryReport, {maxRepos = DEFAULT_MAX_REPOS} = {}) {
  if (!discoveryReport || typeof discoveryReport !== 'object') throw new Error('discovery report required');
  if (!Number.isInteger(maxRepos) || maxRepos < 1 || maxRepos > 100) throw new Error('maxRepos invalid');
  const byInputRepo = new Map();
  for (const source of discoveryReport.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      const parsed = parseGithubRepoUrl(candidate.primary_upstream_hint);
      if (!parsed) continue;
      const key = parsed.full_name.toLowerCase();
      const current = byInputRepo.get(key) ?? {...parsed, discovery_candidate_ids: [], discovery_source_refs: []};
      if (candidate.candidate_id && !current.discovery_candidate_ids.includes(candidate.candidate_id)) current.discovery_candidate_ids.push(candidate.candidate_id);
      if (candidate.source_ref && !current.discovery_source_refs.includes(candidate.source_ref)) current.discovery_source_refs.push(candidate.source_ref);
      byInputRepo.set(key, current);
    }
  }
  return [...byInputRepo.values()].slice(0, maxRepos);
}

function headerValue(headers, name) {
  try { return headers?.get?.(name) ?? null; } catch { return null; }
}

export function classifyGithubHttpFailure({status, body = '', headers = null} = {}) {
  const text = String(body ?? '').toLowerCase();
  const remaining = headerValue(headers, 'x-ratelimit-remaining');
  const retryAfter = headerValue(headers, 'retry-after');
  const reset = headerValue(headers, 'x-ratelimit-reset');
  const rateLimited = status === 429 || (status === 403 && (remaining === '0' || /rate limit|secondary rate|abuse detection/.test(text)));
  if (rateLimited) {
    return {
      kind: 'RATE_LIMIT',
      retry_after_seconds: retryAfter ? Number.parseInt(retryAfter, 10) || null : null,
      rate_limit_reset_epoch: reset ? Number.parseInt(reset, 10) || null : null
    };
  }
  if (status === 404) return {kind: 'NOT_FOUND', retry_after_seconds: null, rate_limit_reset_epoch: null};
  return {kind: 'HTTP_FAILURE', retry_after_seconds: null, rate_limit_reset_epoch: null};
}

async function githubJson(url, {token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'CEREBRO-OS-SkillScout/0.3 (+read-only)'};
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetchImpl(url, {headers, signal: controller.signal, redirect: 'follow'});
    const raw = await response.text();
    if (!response.ok) {
      const classified = classifyGithubHttpFailure({status: response.status, body: raw, headers: response.headers});
      const error = new Error(classified.kind === 'RATE_LIMIT' ? 'GitHub API rate limit deferred' : `GitHub HTTP ${response.status}`);
      error.status = response.status;
      error.failure_kind = classified.kind;
      error.retry_after_seconds = classified.retry_after_seconds;
      error.rate_limit_reset_epoch = classified.rate_limit_reset_epoch;
      throw error;
    }
    return raw ? JSON.parse(raw) : {};
  } finally { clearTimeout(timer); }
}

export function normalizeRepositoryMetadata(repo, commit = null) {
  if (!repo || typeof repo !== 'object') throw new Error('repo metadata required');
  const license = repo.license && typeof repo.license === 'object' ? repo.license : null;
  return {
    upstream_ref: repo.html_url,
    full_name: repo.full_name,
    owner: repo.owner?.login ?? null,
    name: repo.name ?? null,
    description: repo.description ?? null,
    default_branch: repo.default_branch ?? null,
    head_commit: commit?.sha ?? null,
    head_tree_sha: commit?.commit?.tree?.sha ?? null,
    head_commit_date: commit?.commit?.committer?.date ?? commit?.commit?.author?.date ?? null,
    license_spdx: license?.spdx_id ?? null,
    license_name: license?.name ?? null,
    license_compatibility: 'UNASSESSED',
    archived: repo.archived === true,
    disabled: repo.disabled === true,
    fork: repo.fork === true,
    visibility: repo.visibility ?? null,
    language: repo.language ?? null,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    pushed_at: repo.pushed_at ?? null,
    updated_at: repo.updated_at ?? null,
    stargazers_count: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : null,
    open_issues_count: Number.isFinite(repo.open_issues_count) ? repo.open_issues_count : null,
    evidence_level: commit?.sha ? 'REPO_AND_HEAD_RESOLVED' : 'REPO_RESOLVED',
    executed: false
  };
}

export async function resolveGithubRepo(parsed, options = {}) {
  if (!parsed?.owner || !parsed?.repo) throw new Error('parsed repo required');
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  try {
    const repo = await githubJson(apiBase, options);
    let commit = null;
    let commit_error = null;
    let commit_error_kind = null;
    if (repo.default_branch) {
      try { commit = await githubJson(`${apiBase}/commits/${encodeURIComponent(repo.default_branch)}`, options); }
      catch (err) {
        commit_error = String(err?.message ?? err);
        commit_error_kind = err?.failure_kind ?? 'UNKNOWN';
      }
    }
    return {
      status: 'RESOLVED', input_upstream_ref: parsed.html_url,
      discovery_candidate_ids: [...(parsed.discovery_candidate_ids ?? [])],
      discovery_source_refs: [...(parsed.discovery_source_refs ?? [])],
      ...normalizeRepositoryMetadata(repo, commit), commit_error, commit_error_kind, error: null
    };
  } catch (err) {
    const rateLimited = err?.failure_kind === 'RATE_LIMIT';
    return {
      status: rateLimited ? 'DEFERRED_RATE_LIMIT' : err?.status === 404 ? 'NOT_FOUND' : 'RESOLUTION_FAILED',
      input_upstream_ref: parsed.html_url,
      upstream_ref: parsed.html_url,
      full_name: parsed.full_name,
      discovery_candidate_ids: [...(parsed.discovery_candidate_ids ?? [])],
      discovery_source_refs: [...(parsed.discovery_source_refs ?? [])],
      executed: false,
      error: String(err?.message ?? err),
      failure_kind: err?.failure_kind ?? null,
      retry_after_seconds: err?.retry_after_seconds ?? null,
      rate_limit_reset_epoch: err?.rate_limit_reset_epoch ?? null
    };
  }
}

function mergeUnique(target, values) { for (const value of values ?? []) if (value && !target.includes(value)) target.push(value); }

export function canonicalDedupeResolved(results) {
  const output = [];
  const byCanonical = new Map();
  for (const item of results) {
    if (item.status !== 'RESOLVED' || !item.full_name) { output.push(item); continue; }
    const key = item.full_name.toLowerCase();
    const existing = byCanonical.get(key);
    if (!existing) {
      const copy = structuredClone(item); copy.input_aliases = [item.input_upstream_ref].filter(Boolean);
      byCanonical.set(key, copy); output.push(copy); continue;
    }
    mergeUnique(existing.discovery_candidate_ids, item.discovery_candidate_ids);
    mergeUnique(existing.discovery_source_refs, item.discovery_source_refs);
    mergeUnique(existing.input_aliases, [item.input_upstream_ref]);
  }
  return output;
}

export async function resolveDiscoveryUpstreams(discoveryReport, {maxRepos = DEFAULT_MAX_REPOS, token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch, observedAt = new Date().toISOString(), concurrency = 4} = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) throw new Error('concurrency invalid');
  const repos = collectUpstreamRepos(discoveryReport, {maxRepos});
  const rawResults = [];
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    rawResults.push(...await Promise.all(batch.map((repo) => resolveGithubRepo(repo, {token, timeoutMs, fetchImpl}))));
    if (rawResults.some((item) => item.status === 'DEFERRED_RATE_LIMIT')) {
      for (const pending of repos.slice(i + batch.length)) {
        rawResults.push({
          status: 'DEFERRED_RATE_LIMIT', input_upstream_ref: pending.html_url, upstream_ref: pending.html_url,
          full_name: pending.full_name, discovery_candidate_ids: [...(pending.discovery_candidate_ids ?? [])],
          discovery_source_refs: [...(pending.discovery_source_refs ?? [])], executed: false,
          error: 'Skipped after GitHub API rate limit was observed in the same run', failure_kind: 'RATE_LIMIT',
          retry_after_seconds: null, rate_limit_reset_epoch: null
        });
      }
      break;
    }
  }
  const results = canonicalDedupeResolved(rawResults);
  const reposResolved = results.filter((item) => item.status === 'RESOLVED').length;
  const rateLimited = results.filter((item) => item.status === 'DEFERRED_RATE_LIMIT').length;
  const hardFailed = results.filter((item) => !['RESOLVED', 'DEFERRED_RATE_LIMIT'].includes(item.status)).length;
  const deferred = repos.length > 0 && reposResolved === 0 && rateLimited > 0 && hardFailed === 0;
  const partialRateLimit = reposResolved > 0 && rateLimited > 0;
  return Object.freeze({
    schema_version: '0.3.0', execution_mode: 'READ_ONLY_UPSTREAM_RESOLUTION', observed_at: observedAt,
    input_repos_requested: repos.length, canonical_repos: results.length, repos_resolved: reposResolved,
    repos_rate_limited: rateLimited, repos_hard_failed: hardFailed,
    repos_failed: results.filter((item) => item.status !== 'RESOLVED').length,
    status: deferred ? 'DEFERRED_TRANSIENT_RATE_LIMIT' : partialRateLimit ? 'PARTIAL_RATE_LIMIT' : hardFailed > 0 ? 'PARTIAL_OR_FAILED' : 'READY',
    deferred, partial_rate_limit: partialRateLimit, code_executed: false, results
  });
}

function argValue(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = argValue('--input') ?? 'artifacts/cerebro-skill-discovery.json';
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-upstreams.json';
  const maxRepos = Number.parseInt(argValue('--max-repos') ?? process.env.CEREBRO_UPSTREAM_MAX_REPOS ?? String(DEFAULT_MAX_REPOS), 10);
  const report = await resolveDiscoveryUpstreams(JSON.parse(fs.readFileSync(input, 'utf8')), {maxRepos});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output, execution_mode: report.execution_mode, status: report.status, deferred: report.deferred, input_repos_requested: report.input_repos_requested, canonical_repos: report.canonical_repos, repos_resolved: report.repos_resolved, repos_rate_limited: report.repos_rate_limited, repos_hard_failed: report.repos_hard_failed, repos_failed: report.repos_failed, code_executed: report.code_executed}));
  if (report.input_repos_requested > 0 && report.repos_resolved === 0 && !report.deferred) process.exitCode = 2;
}
