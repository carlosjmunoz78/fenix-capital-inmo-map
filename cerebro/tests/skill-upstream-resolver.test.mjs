import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectUpstreamRepos,
  normalizeRepositoryMetadata,
  parseGithubRepoUrl,
  resolveDiscoveryUpstreams
} from '../skills/skill-upstream-resolver.mjs';

test('parseGithubRepoUrl accepts canonical GitHub repo refs only', () => {
  assert.deepEqual(parseGithubRepoUrl('https://github.com/acme/skill-one/tree/main'), {
    owner: 'acme', repo: 'skill-one', full_name: 'acme/skill-one', html_url: 'https://github.com/acme/skill-one'
  });
  assert.equal(parseGithubRepoUrl('https://evil.test/acme/skill-one'), null);
  assert.equal(parseGithubRepoUrl('https://github.com/owner/repo'), null);
});

test('collectUpstreamRepos deduplicates case-insensitively and obeys cap', () => {
  const discovery = {results: [{candidates: [
    {upstream_hints: ['https://github.com/Acme/One', 'https://github.com/acme/one']},
    {upstream_hints: ['https://github.com/acme/two']}
  ]}]};
  const repos = collectUpstreamRepos(discovery, {maxRepos: 1});
  assert.equal(repos.length, 1);
  assert.equal(repos[0].full_name, 'Acme/One');
});

test('normalizeRepositoryMetadata is evidence-only and never executes code', () => {
  const repo = {
    html_url: 'https://github.com/acme/one', full_name: 'acme/one', name: 'one',
    owner: {login: 'acme'}, default_branch: 'main', archived: false, disabled: false,
    fork: false, visibility: 'public', language: 'TypeScript', topics: ['agents'],
    pushed_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z',
    stargazers_count: 10, open_issues_count: 1, license: {spdx_id: 'MIT', name: 'MIT License'}
  };
  const commit = {sha: 'abc123', commit: {committer: {date: '2026-10-02T00:00:00Z'}}};
  const result = normalizeRepositoryMetadata(repo, commit);
  assert.equal(result.license_spdx, 'MIT');
  assert.equal(result.head_commit, 'abc123');
  assert.equal(result.executed, false);
  assert.equal(result.evidence_level, 'REPO_AND_HEAD_RESOLVED');
});

test('resolveDiscoveryUpstreams resolves metadata and head with mocked GitHub API', async () => {
  const discovery = {results: [{candidates: [{upstream_hints: ['https://github.com/acme/one']}]}]};
  const fetchImpl = async (url) => {
    if (url === 'https://api.github.com/repos/acme/one') {
      return new Response(JSON.stringify({
        html_url: 'https://github.com/acme/one', full_name: 'acme/one', name: 'one',
        owner: {login: 'acme'}, default_branch: 'main', archived: false, disabled: false,
        fork: false, visibility: 'public', language: 'JavaScript', topics: [],
        pushed_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
        stargazers_count: 1, open_issues_count: 0, license: {spdx_id: 'Apache-2.0', name: 'Apache License 2.0'}
      }), {status: 200, headers: {'content-type': 'application/json'}});
    }
    if (url === 'https://api.github.com/repos/acme/one/commits/main') {
      return new Response(JSON.stringify({sha: 'deadbeef', commit: {committer: {date: '2026-10-01T00:00:00Z'}}}), {status: 200});
    }
    return new Response('{}', {status: 404});
  };
  const report = await resolveDiscoveryUpstreams(discovery, {
    maxRepos: 4, token: 'test', fetchImpl, observedAt: '2026-10-06T00:00:00Z', concurrency: 2
  });
  assert.equal(report.execution_mode, 'READ_ONLY_UPSTREAM_RESOLUTION');
  assert.equal(report.repos_requested, 1);
  assert.equal(report.repos_resolved, 1);
  assert.equal(report.repos_failed, 0);
  assert.equal(report.code_executed, false);
  assert.equal(report.results[0].head_commit, 'deadbeef');
  assert.equal(report.results[0].license_spdx, 'Apache-2.0');
});

test('resolver tolerates unavailable repository as evidence, not execution failure', async () => {
  const discovery = {results: [{candidates: [{upstream_hints: ['https://github.com/acme/missing']}]}]};
  const fetchImpl = async () => new Response('{}', {status: 404});
  const report = await resolveDiscoveryUpstreams(discovery, {fetchImpl, token: 'test'});
  assert.equal(report.repos_resolved, 0);
  assert.equal(report.repos_failed, 1);
  assert.equal(report.results[0].status, 'NOT_FOUND');
  assert.equal(report.results[0].executed, false);
});
