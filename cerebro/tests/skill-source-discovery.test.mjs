import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverCandidateUrls,
  discoverSource,
  extractGithubUpstreams,
  extractHrefs,
  runOnlineDiscovery
} from '../skills/skill-source-discovery.mjs';

const source = {
  source_id: 'fixture',
  url: 'https://example.test/es/skills',
  candidate_path: /^\/es\/skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/i,
  max_candidates: 10
};

test('extractHrefs handles quoted hrefs and deduplicates', () => {
  const html = '<a href="/es/skills/a">A</a><a href=\'/es/skills/a\'>A2</a><a href="/x">X</a>';
  assert.deepEqual(extractHrefs(html), ['/es/skills/a', '/x']);
});

test('discoverCandidateUrls remains same-origin and pattern-scoped', () => {
  const html = '<a href="/es/skills/a">A</a><a href="https://evil.test/es/skills/b">B</a><a href="/other">O</a>';
  assert.deepEqual(discoverCandidateUrls({html, source}), ['https://example.test/es/skills/a']);
});

test('extractGithubUpstreams returns canonical repository roots and drops placeholders', () => {
  const html = 'Install https://github.com/acme/skill-one.git and see https://github.com/acme/skill-one/tree/main/docs plus https://github.com/org/repo and https://github.com/acme/repo-two';
  assert.deepEqual(extractGithubUpstreams(html), ['https://github.com/acme/skill-one', 'https://github.com/acme/repo-two']);
});

test('discoverSource never executes candidates and only records upstream hints', async () => {
  const pages = new Map([
    ['https://example.test/es/skills', '<a href="/es/skills/a">A</a>'],
    ['https://example.test/es/skills/a', 'npx skills add https://github.com/acme/skill-a']
  ]);
  const fetcher = async (url) => {
    if (!pages.has(url)) throw new Error('unexpected url');
    return pages.get(url);
  };
  const result = await discoverSource(source, {fetcher, observedAt: '2026-10-06T00:00:00Z'});
  assert.equal(result.status, 'OK');
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].status, 'UPSTREAM_HINT_FOUND');
  assert.deepEqual(result.candidates[0].upstream_hints, ['https://github.com/acme/skill-a']);
  assert.equal(result.candidates[0].executed, false);
  assert.match(result.candidates[0].candidate_id, /^fixture:[a-f0-9]{20}$/);
});

test('runOnlineDiscovery tolerates one source failure and preserves evidence', async () => {
  const sources = [
    source,
    {...source, source_id: 'broken', url: 'https://broken.test/es/skills'}
  ];
  const fetcher = async (url) => {
    if (url.startsWith('https://broken.test')) throw new Error('offline');
    if (url === source.url) return '<a href="/es/skills/a">A</a>';
    if (url.endsWith('/a')) return 'https://github.com/acme/skill-a';
    throw new Error('unexpected url');
  };
  const report = await runOnlineDiscovery({sources, fetcher, observedAt: '2026-10-06T00:00:00Z'});
  assert.equal(report.execution_mode, 'READ_ONLY_DISCOVERY');
  assert.equal(report.sources_total, 2);
  assert.equal(report.sources_ok, 1);
  assert.equal(report.candidates_discovered, 1);
  assert.equal(report.upstream_hints_found, 1);
});
