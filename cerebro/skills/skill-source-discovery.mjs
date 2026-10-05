import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const SOURCES = Object.freeze([
  {
    source_id: 'lobehub-skills',
    url: 'https://lobehub.com/es/skills?category=all&sort=stars',
    candidate_path: /^\/(?:es\/)?skills\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+/i,
    exclude_path: /\/skills\/skill\.md$/i,
    generic_upstreams: ['https://github.com/lobehub/lobehub', 'https://github.com/lobehub/lobe-chat'],
    max_candidates: 12
  },
  {
    source_id: 'mcpservers-agent-skills',
    url: 'https://mcpservers.org/es/agent-skills',
    candidate_path: /^\/(?:es\/)?agent-skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/i,
    exclude_path: /\/(?:es\/)?agent-skills\/(?:official(?:\/|$)|author\/|category\/)/i,
    generic_upstreams: [],
    max_candidates: 12
  },
  {
    source_id: 'fragroger-skills',
    url: 'https://skills.fragroger.ai/es',
    candidate_path: /^\/es\/skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/i,
    generic_upstreams: [],
    max_candidates: 12
  }
]);

function unique(values) {
  return [...new Set(values)];
}

function stableId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 20);
}

export function extractHrefs(html) {
  if (typeof html !== 'string') throw new Error('html must be string');
  const hrefs = [];
  const re = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = re.exec(html)) !== null) hrefs.push(match[1] ?? match[2] ?? match[3]);
  return unique(hrefs.filter(Boolean));
}

export function discoverCandidateUrls({html, source}) {
  if (!source?.url || !(source.candidate_path instanceof RegExp)) throw new Error('source config invalid');
  const base = new URL(source.url);
  const urls = [];
  for (const href of extractHrefs(html)) {
    let resolved;
    try { resolved = new URL(href, base); } catch { continue; }
    if (resolved.origin !== base.origin) continue;
    if (!source.candidate_path.test(resolved.pathname)) continue;
    if (source.exclude_path instanceof RegExp && source.exclude_path.test(resolved.pathname)) continue;
    resolved.hash = '';
    urls.push(resolved.toString());
  }
  return unique(urls).slice(0, source.max_candidates ?? 12);
}

function isPlaceholderRepo(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  return new Set(['owner/repo', 'user/repo', 'org/repo']).has(key);
}

export function extractGithubUpstreams(html) {
  if (typeof html !== 'string') throw new Error('html must be string');
  const out = [];
  const re = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[\/#?][^\s"'<>]*)?/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const owner = match[1];
    const repo = match[2].replace(/\.git$/i, '');
    if (!repo || isPlaceholderRepo(owner, repo)) continue;
    out.push(`https://github.com/${owner}/${repo}`);
  }
  return unique(out);
}

function normalizeRepoKey(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean).slice(0, 2);
    return parts.length === 2 ? parts.join('/').toLowerCase() : null;
  } catch {
    return null;
  }
}

export function selectPrimaryUpstream({candidateUrl, source, upstreams}) {
  if (!Array.isArray(upstreams) || upstreams.length === 0) return null;
  const generic = new Set((source?.generic_upstreams ?? []).map(normalizeRepoKey).filter(Boolean));
  const usable = upstreams.filter((item) => !generic.has(normalizeRepoKey(item)));
  if (!usable.length) return null;

  const candidate = new URL(candidateUrl);
  const pathParts = candidate.pathname.split('/').filter(Boolean);
  const slug = pathParts.at(-1)?.toLowerCase() ?? '';

  if (source?.source_id === 'lobehub-skills') {
    for (const item of usable) {
      const key = normalizeRepoKey(item);
      if (!key) continue;
      const [owner, repo] = key.split('/');
      if (slug.startsWith(`${owner}-${repo}-`) || slug === `${owner}-${repo}`) return item;
    }
  }

  if (source?.source_id === 'mcpservers-agent-skills') {
    const marker = pathParts.lastIndexOf('agent-skills');
    const directoryAuthor = marker >= 0 ? pathParts[marker + 1]?.toLowerCase() : null;
    if (directoryAuthor) {
      const ownerMatch = usable.find((item) => {
        const key = normalizeRepoKey(item);
        if (!key) return false;
        const owner = key.split('/')[0];
        return owner === directoryAuthor || owner.startsWith(`${directoryAuthor}-`) || directoryAuthor.startsWith(owner);
      });
      if (ownerMatch) return ownerMatch;
    }
  }

  return usable[0];
}

async function fetchText(url, {timeoutMs = 8000, userAgent = 'CEREBRO-OS-SkillScout/0.1 (+read-only)'} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {'user-agent': userAgent, accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function inspectCandidate(candidateUrl, source, fetcher) {
  let upstreams = [];
  let primaryUpstream = null;
  let candidateStatus = 'DISCOVERED';
  let error = null;
  try {
    const detailHtml = await fetcher(candidateUrl);
    upstreams = extractGithubUpstreams(detailHtml);
    primaryUpstream = selectPrimaryUpstream({candidateUrl, source, upstreams});
    if (primaryUpstream) candidateStatus = 'PRIMARY_UPSTREAM_HINT_FOUND';
    else if (upstreams.length) candidateStatus = 'UPSTREAM_HINTS_UNRESOLVED';
  } catch (err) {
    candidateStatus = 'DETAIL_FETCH_FAILED';
    error = String(err?.message ?? err);
  }
  return {
    candidate_id: `${source.source_id}:${stableId(candidateUrl)}`,
    source_ref: candidateUrl,
    primary_upstream_hint: primaryUpstream,
    upstream_hints: upstreams,
    status: candidateStatus,
    error,
    executed: false
  };
}

export async function discoverSource(source, {fetcher = fetchText, observedAt = new Date().toISOString()} = {}) {
  const result = {
    source_id: source.source_id,
    source_url: source.url,
    observed_at: observedAt,
    status: 'OK',
    candidates: [],
    error: null
  };
  try {
    const indexHtml = await fetcher(source.url);
    const candidateUrls = discoverCandidateUrls({html: indexHtml, source});
    result.candidates = await Promise.all(candidateUrls.map((url) => inspectCandidate(url, source, fetcher)));
  } catch (err) {
    result.status = 'SOURCE_FETCH_FAILED';
    result.error = String(err?.message ?? err);
  }
  return result;
}

export async function runOnlineDiscovery({sources = SOURCES, fetcher = fetchText, observedAt = new Date().toISOString()} = {}) {
  const results = await Promise.all(sources.map((source) => discoverSource(source, {fetcher, observedAt})));
  const sourceOk = results.filter((item) => item.status === 'OK').length;
  const candidates = results.reduce((sum, item) => sum + item.candidates.length, 0);
  const upstreamHints = results.reduce((sum, item) => sum + item.candidates.reduce((s, c) => s + c.upstream_hints.length, 0), 0);
  const primaryUpstreams = results.reduce((sum, item) => sum + item.candidates.filter((c) => c.primary_upstream_hint).length, 0);
  return Object.freeze({
    schema_version: '0.2.0',
    execution_mode: 'READ_ONLY_DISCOVERY',
    observed_at: observedAt,
    sources_total: results.length,
    sources_ok: sourceOk,
    candidates_discovered: candidates,
    upstream_hints_found: upstreamHints,
    primary_upstreams_found: primaryUpstreams,
    results
  });
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = argValue('--output') ?? process.env.CEREBRO_DISCOVERY_OUTPUT ?? 'artifacts/cerebro-skill-discovery.json';
  const report = await runOnlineDiscovery();
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output,
    execution_mode: report.execution_mode,
    sources_total: report.sources_total,
    sources_ok: report.sources_ok,
    candidates_discovered: report.candidates_discovered,
    upstream_hints_found: report.upstream_hints_found,
    primary_upstreams_found: report.primary_upstreams_found
  }));
  if (report.sources_ok === 0) process.exitCode = 2;
}

export {SOURCES};
