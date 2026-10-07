import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalDedupeResolved,
  classifyGithubHttpFailure,
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

test('collectUpstreamRepos uses primary hints, deduplicates and preserves candidate attribution', () => {
  const discovery = {results: [{candidates: [
    {candidate_id: 'a', source_ref: 'https://directory/a', primary_upstream_hint: 'https://github.com/Acme/One', upstream_hints: ['https://github.com/noise/x']},
    {candidate_id: 'b', source_ref: 'https://directory/b', primary_upstream_hint: 'https://github.com/acme/one'},
    {candidate_id: 'c', source_ref: 'https://directory/c', primary_upstream_hint: 'https://github.com/acme/two'}
  ]}]};
  const repos = collectUpstreamRepos(discovery, {maxRepos: 1});
  assert.equal(repos.length, 1);
  assert.equal(repos[0].full_name, 'Acme/One');
  assert.deepEqual(repos[0].discovery_candidate_ids, ['a', 'b']);
  assert.deepEqual(repos[0].discovery_source_refs, ['https://directory/a', 'https://directory/b']);
});

test('classifyGithubHttpFailure recognizes primary and secondary rate limits', () => {
  const primary = classifyGithubHttpFailure({status: 403, body: '{"message":"API rate limit exceeded"}', headers: new Headers({'x-ratelimit-remaining':'0','x-ratelimit-reset':'123'})});
  assert.equal(primary.kind, 'RATE_LIMIT');
  assert.equal(primary.rate_limit_reset_epoch, 123);
  const secondary = classifyGithubHttpFailure({status: 429, body: 'secondary rate limit', headers: new Headers({'retry-after':'30'})});
  assert.equal(secondary.kind, 'RATE_LIMIT');
  assert.equal(secondary.retry_after_seconds, 30);
  assert.equal(classifyGithubHttpFailure({status:404,body:'{}',headers:new Headers()}).kind,'NOT_FOUND');
});

test('normalizeRepositoryMetadata is evidence-only and leaves license compatibility unassessed', () => {
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
  assert.equal(result.license_compatibility, 'UNASSESSED');
  assert.equal(result.head_commit, 'abc123');
  assert.equal(result.executed, false);
  assert.equal(result.evidence_level, 'REPO_AND_HEAD_RESOLVED');
});

test('canonicalDedupeResolved merges redirected aliases into one repository', () => {
  const result = canonicalDedupeResolved([
    {status: 'RESOLVED', full_name: 'acme/one', input_upstream_ref: 'https://github.com/acme/old-one', discovery_candidate_ids: ['a'], discovery_source_refs: ['x']},
    {status: 'RESOLVED', full_name: 'acme/one', input_upstream_ref: 'https://github.com/acme/one', discovery_candidate_ids: ['b'], discovery_source_refs: ['y']}
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].discovery_candidate_ids, ['a', 'b']);
  assert.deepEqual(result[0].input_aliases, ['https://github.com/acme/old-one', 'https://github.com/acme/one']);
});

test('resolveDiscoveryUpstreams resolves metadata and head with mocked GitHub API', async () => {
  const discovery = {results: [{candidates: [{
    candidate_id: 'a', source_ref: 'https://directory/a', primary_upstream_hint: 'https://github.com/acme/one'
  }]}]};
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
  assert.equal(report.status, 'READY');
  assert.equal(report.input_repos_requested, 1);
  assert.equal(report.canonical_repos, 1);
  assert.equal(report.repos_resolved, 1);
  assert.equal(report.repos_failed, 0);
  assert.equal(report.repos_rate_limited, 0);
  assert.equal(report.code_executed, false);
  assert.equal(report.results[0].head_commit, 'deadbeef');
  assert.equal(report.results[0].license_spdx, 'Apache-2.0');
  assert.deepEqual(report.results[0].discovery_candidate_ids, ['a']);
});

test('resolver tolerates unavailable repository as evidence, not execution failure', async () => {
  const discovery = {results: [{candidates: [{
    candidate_id: 'x', source_ref: 'https://directory/x', primary_upstream_hint: 'https://github.com/acme/missing'
  }]}]};
  const fetchImpl = async () => new Response('{}', {status: 404});
  const report = await resolveDiscoveryUpstreams(discovery, {fetchImpl, token: 'test'});
  assert.equal(report.repos_resolved, 0);
  assert.equal(report.repos_failed, 1);
  assert.equal(report.repos_hard_failed, 1);
  assert.equal(report.deferred, false);
  assert.equal(report.results[0].status, 'NOT_FOUND');
  assert.equal(report.results[0].executed, false);
});

test('all-rate-limited upstream resolution becomes safe transient deferral, not hard failure', async () => {
  const discovery = {results: [{candidates: [
    {candidate_id:'a',source_ref:'https://directory/a',primary_upstream_hint:'https://github.com/acme/one'},
    {candidate_id:'b',source_ref:'https://directory/b',primary_upstream_hint:'https://github.com/acme/two'},
    {candidate_id:'c',source_ref:'https://directory/c',primary_upstream_hint:'https://github.com/acme/three'}
  ]}]};
  let calls=0;
  const fetchImpl=async()=>{calls+=1;return new Response('{"message":"API rate limit exceeded for installation"}',{status:403,headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':'999'}});};
  const report=await resolveDiscoveryUpstreams(discovery,{fetchImpl,token:'test',concurrency:2});
  assert.equal(report.status,'DEFERRED_TRANSIENT_RATE_LIMIT');
  assert.equal(report.deferred,true);
  assert.equal(report.repos_resolved,0);
  assert.equal(report.repos_rate_limited,3);
  assert.equal(report.repos_hard_failed,0);
  assert.ok(calls<=2);
  assert.ok(report.results.every(x=>x.status==='DEFERRED_RATE_LIMIT'));
});

test('partial rate limit preserves resolved evidence and marks partial status', async () => {
  const discovery={results:[{candidates:[
    {candidate_id:'a',source_ref:'https://directory/a',primary_upstream_hint:'https://github.com/acme/one'},
    {candidate_id:'b',source_ref:'https://directory/b',primary_upstream_hint:'https://github.com/acme/two'}
  ]}]};
  const fetchImpl=async(url)=>{
    if(url==='https://api.github.com/repos/acme/one') return new Response(JSON.stringify({html_url:'https://github.com/acme/one',full_name:'acme/one',name:'one',owner:{login:'acme'},default_branch:null,archived:false,disabled:false,fork:false,visibility:'public',topics:[]}),{status:200});
    return new Response('{"message":"rate limit exceeded"}',{status:403,headers:{'x-ratelimit-remaining':'0'}});
  };
  const report=await resolveDiscoveryUpstreams(discovery,{fetchImpl,token:'test',concurrency:2});
  assert.equal(report.status,'PARTIAL_RATE_LIMIT');
  assert.equal(report.partial_rate_limit,true);
  assert.equal(report.repos_resolved,1);
  assert.equal(report.repos_rate_limited,1);
  assert.equal(report.deferred,false);
});
