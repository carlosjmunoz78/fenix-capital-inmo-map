import fs from 'node:fs';
import path from 'node:path';

const SOURCES = Object.freeze([
  {
    source_id: 'lobehub-skills',
    url: 'https://lobehub.com/es/skills?category=all&sort=stars',
    candidate_path: /^\/[^/]*\/?skills\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+|^\/skills\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+/i,
    max_candidates: 40
  },
  {
    source_id: 'mcpservers-agent-skills',
    url: 'https://mcpservers.org/es/agent-skills',
    candidate_path: /^\/es\/agent-skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+|^\/agent-skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/i,
    max_candidates: 40
  },
  {
    source_id: 'fragroger-skills',
    url: 'https://skills.fragroger.ai/es',
    candidate_path: /^\/es\/skills\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/i,
    max_candidates: 40
  }
]);

function unique(values) {
  return [...new Set(values)];
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
    resolved.hash = '';
    urls.push(resolved.toString());
  }
  return unique(urls).slice(0, source.max_candidates ?? 40);
}

export function extractGithubUpstreams(html) {
  if (typeof html !== 'string') throw new Error('html must be string');
  const out = [];
  const re = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[\/#?][^\s"'<>]*)?/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const repo = match[2].replace(/\.git$/i, '');
    if (!repo) continue;
    out.push(`https://github.com/${match[1]}/${repo}`);
  }
  return unique(out);
}

async function fetchText(url, {timeoutMs = 15000, userAgent = 'CEREBRO-OS-SkillScout/0.1 (+read-only)'} = {}) {
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
    for (const candidateUrl of candidateUrls) {
      let upstreams = [];
      let candidateStatus = 'DISCOVERED';
      let error = null;
      try {
        const detailHtml = await fetcher(candidateUrl);
        upstreams = extractGithubUpstreams(detailHtml);
        if (upstreams.length) candidateStatus = 'UPSTREAM_HINT_FOUND';
      } catch (err) {
        candidateStatus = 'DETAIL_FETCH_FAILED';
        error = String(err?.message ?? err);
      }
      result.candidates.push({
        candidate_id: `${source.source_id}:${Buffer.from(candidateUrl).toString('base64url').slice(0, 24)}`,
        source_ref: candidateUrl,
        upstream_hints: upstreams,
        status: candidateStatus,
        error
      });
    }
  } catch (err) {
    result.status = 'SOURCE_FETCH_FAILED';
    result.error = String(err?.message ?? err);
  }
  return result;
}

export async function runOnlineDiscovery({sources = SOURCES, fetcher = fetchText, observedAt = new Date().toISOString()} = {}) {
  const results = [];
  for (const source of sources) results.push(await discoverSource(source, {fetcher, observedAt}));
  const sourceOk = results.filter((item) => item.status === 'OK').length;
  const candidates = results.reduce((sum, item) => sum + item.candidates.length, 0);
  const upstreamHints = results.reduce((sum, item) => sum + item.candidates.reduce((s, c) => s + c.upstream_hints.length, 0), 0);
  return Object.freeze({
    schema_version: '0.1.0',
    execution_mode: 'READ_ONLY_DISCOVERY',
    observed_at: observedAt,
    sources_total: results.length,
    sources_ok: sourceOk,
    candidates_discovered: candidates,
    upstream_hints_found: upstreamHints,
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
    upstream_hints_found: report.upstream_hints_found
  }));
  if (report.sources_ok === 0) process.exitCode = 2;
}

export {SOURCES};
