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
      const current = byInputRepo.get(key) ?? {
        ...parsed,
        discovery_candidate_ids: [],
        discovery_source_refs: []
      };
      if (candidate.candidate_id && !current.discovery_candidate_ids.includes(candidate.candidate_id)) {
        current.discovery_candidate_ids.push(candidate.candidate_id);
      }
      if (candidate.source_ref && !current.discovery_source_refs.includes(candidate.source_ref)) {
        current.discovery_source_refs.push(candidate.source_ref);
      }
      byInputRepo.set(key, current);
    }
  }
  return [...byInputRepo.values()].slice(0, maxRepos);
}

async function githubJson(url, {token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'CEREBRO-OS-SkillScout/0.2 (+read-only)'
  };
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetchImpl(url, {headers, signal: controller.signal, redirect: 'follow'});
    if (!response.ok) {
      const error = new Error(`GitHub HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
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
    if (repo.default_branch) {
      try {
        commit = await githubJson(`${apiBase}/commits/${encodeURIComponent(repo.default_branch)}`, options);
      } catch (err) {
        commit_error = String(err?.message ?? err);
      }
    }
    return {
      status: 'RESOLVED',
      input_upstream_ref: parsed.html_url,
      discovery_candidate_ids: [...(parsed.discovery_candidate_ids ?? [])],
      discovery_source_refs: [...(parsed.discovery_source_refs ?? [])],
      ...normalizeRepositoryMetadata(repo, commit),
      commit_error,
      error: null
    };
  } catch (err) {
    return {
      status: err?.status === 404 ? 'NOT_FOUND' : 'RESOLUTION_FAILED',
      input_upstream_ref: parsed.html_url,
      upstream_ref: parsed.html_url,
      full_name: parsed.full_name,
      discovery_candidate_ids: [...(parsed.discovery_candidate_ids ?? [])],
      discovery_source_refs: [...(parsed.discovery_source_refs ?? [])],
      executed: false,
      error: String(err?.message ?? err)
    };
  }
}

function mergeUnique(target, values) {
  for (const value of values ?? []) if (value && !target.includes(value)) target.push(value);
}

export function canonicalDedupeResolved(results) {
  const output = [];
  const byCanonical = new Map();
  for (const item of results) {
    if (item.status !== 'RESOLVED' || !item.full_name) {
      output.push(item);
      continue;
    }
    const key = item.full_name.toLowerCase();
    const existing = byCanonical.get(key);
    if (!existing) {
      const copy = structuredClone(item);
      copy.input_aliases = [item.input_upstream_ref].filter(Boolean);
      byCanonical.set(key, copy);
      output.push(copy);
      continue;
    }
    mergeUnique(existing.discovery_candidate_ids, item.discovery_candidate_ids);
    mergeUnique(existing.discovery_source_refs, item.discovery_source_refs);
    mergeUnique(existing.input_aliases, [item.input_upstream_ref]);
  }
  return output;
}

export async function resolveDiscoveryUpstreams(discoveryReport, {
  maxRepos = DEFAULT_MAX_REPOS,
  token = process.env.GITHUB_TOKEN,
  timeoutMs = 8000,
  fetchImpl = fetch,
  observedAt = new Date().toISOString(),
  concurrency = 6
} = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) throw new Error('concurrency invalid');
  const repos = collectUpstreamRepos(discoveryReport, {maxRepos});
  const rawResults = [];
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const resolved = await Promise.all(batch.map((repo) => resolveGithubRepo(repo, {token, timeoutMs, fetchImpl})));
    rawResults.push(...resolved);
  }
  const results = canonicalDedupeResolved(rawResults);
  return Object.freeze({
    schema_version: '0.2.0',
    execution_mode: 'READ_ONLY_UPSTREAM_RESOLUTION',
    observed_at: observedAt,
    input_repos_requested: repos.length,
    canonical_repos: results.length,
    repos_resolved: results.filter((item) => item.status === 'RESOLVED').length,
    repos_failed: results.filter((item) => item.status !== 'RESOLVED').length,
    code_executed: false,
    results
  });
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = argValue('--input') ?? 'artifacts/cerebro-skill-discovery.json';
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-upstreams.json';
  const maxReposRaw = argValue('--max-repos') ?? process.env.CEREBRO_UPSTREAM_MAX_REPOS ?? String(DEFAULT_MAX_REPOS);
  const maxRepos = Number.parseInt(maxReposRaw, 10);
  const discovery = JSON.parse(fs.readFileSync(input, 'utf8'));
  const report = await resolveDiscoveryUpstreams(discovery, {maxRepos});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output,
    execution_mode: report.execution_mode,
    input_repos_requested: report.input_repos_requested,
    canonical_repos: report.canonical_repos,
    repos_resolved: report.repos_resolved,
    repos_failed: report.repos_failed,
    code_executed: report.code_executed
  }));
  if (report.input_repos_requested > 0 && report.repos_resolved === 0) process.exitCode = 2;
}
