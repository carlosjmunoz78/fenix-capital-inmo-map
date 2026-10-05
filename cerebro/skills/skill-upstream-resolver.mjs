import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_REPOS = 24;

function unique(values) {
  return [...new Set(values)];
}

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
  const refs = [];
  for (const source of discoveryReport.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      for (const hint of candidate.upstream_hints ?? []) refs.push(hint);
    }
  }
  const repos = [];
  const seen = new Set();
  for (const ref of refs) {
    const parsed = parseGithubRepoUrl(ref);
    if (!parsed) continue;
    const key = parsed.full_name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    repos.push(parsed);
    if (repos.length >= maxRepos) break;
  }
  return repos;
}

async function githubJson(url, {token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'CEREBRO-OS-SkillScout/0.1 (+read-only)'
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
      ...normalizeRepositoryMetadata(repo, commit),
      commit_error,
      error: null
    };
  } catch (err) {
    return {
      status: err?.status === 404 ? 'NOT_FOUND' : 'RESOLUTION_FAILED',
      upstream_ref: parsed.html_url,
      full_name: parsed.full_name,
      executed: false,
      error: String(err?.message ?? err)
    };
  }
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
  const results = [];
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const resolved = await Promise.all(batch.map((repo) => resolveGithubRepo(repo, {token, timeoutMs, fetchImpl})));
    results.push(...resolved);
  }
  return Object.freeze({
    schema_version: '0.1.0',
    execution_mode: 'READ_ONLY_UPSTREAM_RESOLUTION',
    observed_at: observedAt,
    repos_requested: repos.length,
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
    repos_requested: report.repos_requested,
    repos_resolved: report.repos_resolved,
    repos_failed: report.repos_failed,
    code_executed: report.code_executed
  }));
  if (report.repos_requested > 0 && report.repos_resolved === 0) process.exitCode = 2;
}
