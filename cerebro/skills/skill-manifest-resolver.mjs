import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_MANIFEST_BYTES = 256 * 1024;

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function candidateSkillSlug(candidate, repo) {
  let slug = '';
  try { slug = new URL(candidate.source_ref).pathname.split('/').filter(Boolean).at(-1) ?? ''; } catch {}
  slug = normalize(slug);
  if (!repo?.full_name) return slug;
  const [owner, name] = repo.full_name.split('/').map(normalize);
  const prefix = `${owner}-${name}-`;
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
}

export function selectSkillManifestPath(candidate, repo, treeEntries) {
  const manifests = (treeEntries ?? []).filter((item) => item?.type === 'blob' && /(^|\/)skill\.md$/i.test(item.path ?? ''));
  if (!manifests.length) return {status: 'SKILL_MD_NOT_FOUND', path: null, confidence: 0, candidates: []};
  const target = candidateSkillSlug(candidate, repo);
  const scored = manifests.map((item) => {
    const parts = item.path.split('/');
    const parent = normalize(parts.at(-2) ?? '');
    const whole = normalize(item.path.replace(/\/skill\.md$/i, ''));
    let score = 0;
    if (target && parent === target) score = 100;
    else if (target && whole.endsWith(`-${target}`)) score = 90;
    else if (target && whole.includes(target)) score = 70;
    else if (manifests.length === 1) score = 50;
    return {path: item.path, score};
  }).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const best = scored[0];
  if (!best || best.score === 0) return {status: 'SKILL_MD_AMBIGUOUS', path: null, confidence: 0, candidates: scored.slice(0, 10)};
  if (scored[1]?.score === best.score && best.score < 100) return {status: 'SKILL_MD_AMBIGUOUS', path: null, confidence: best.score, candidates: scored.slice(0, 10)};
  return {status: 'SKILL_MD_SELECTED', path: best.path, confidence: best.score, candidates: scored.slice(0, 10)};
}

function parseFrontmatterField(header, name) {
  const lines = String(header ?? '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(new RegExp(`^${name}\\s*:\\s*(.*)$`, 'i'));
    if (!match) continue;
    const raw = match[1].trim();
    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-' || raw === '>+' || raw === '|+') {
      const parts = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^\S[^:]*:\s*/.test(lines[j])) break;
        const continuation = lines[j].match(/^\s+(.+)$/);
        if (!continuation) {
          if (parts.length) break;
          continue;
        }
        parts.push(continuation[1].trim());
      }
      return parts.join(' ').replace(/\s+/g, ' ').trim() || null;
    }
    return raw.replace(/^['"]|['"]$/g, '').trim() || null;
  }
  return null;
}

export function staticManifestScan(content) {
  if (typeof content !== 'string') throw new Error('manifest content must be string');
  const flags = [];
  const checks = [
    ['SHELL_PIPE_EXEC', /\b(?:curl|wget)\b[^\n|]{0,300}\|\s*(?:sh|bash|zsh)\b/i],
    ['DESTRUCTIVE_FS', /\brm\s+-rf\b|\bdel\s+\/s\b/i],
    ['SUDO_COMMAND', /\bsudo\s+/i],
    ['EVAL_EXECUTION', /\beval\s*\(/i],
    ['CAPTCHA_BYPASS_TERMS', /captcha.{0,40}(?:bypass|solve|evad)/i],
    ['ANTI_DETECT_TERMS', /anti[- ]?detect|fingerprint.{0,30}(?:spoof|evad)/i],
    ['CREDENTIAL_EXTRACTION_TERMS', /(?:extract|dump|steal).{0,40}(?:credential|password|token|secret)/i],
    ['SECRET_ACCESS_MENTION', /(?:process\.env|\$[A-Z][A-Z0-9_]{3,}|secret|api[_ -]?key|access[_ -]?token)/i],
    ['NETWORK_DOWNLOAD_COMMAND', /\b(?:curl|wget)\s+https?:\/\//i],
    ['ROUTER_PRECEDENCE_CLAIM', /\bprefer\b[^\n.]{0,160}\bover\b[^\n.]{0,100}\b(?:built[- ]?in|existing|other)\b/i],
    ['INSTRUCTION_OVERRIDE_TERMS', /\bignore\b[^\n.]{0,80}\b(?:previous|prior|system|developer)\b[^\n.]{0,80}\binstruction/i]
  ];
  for (const [flag, regex] of checks) if (regex.test(content)) flags.push(flag);
  const frontmatter = content.match(/^---\s*\n([\s\S]{0,12000}?)\n---\s*(?:\n|$)/);
  const header = frontmatter?.[1] ?? '';
  return {
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: Buffer.byteLength(content, 'utf8'),
    lines: content.split(/\r?\n/).length,
    has_frontmatter: Boolean(frontmatter),
    declared_name: parseFrontmatterField(header, 'name'),
    declared_description: parseFrontmatterField(header, 'description'),
    static_flags: flags,
    executed: false,
    instructions_interpreted: false
  };
}

async function githubJson(url, {token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'CEREBRO-OS-SkillManifestScout/0.2 (+read-only)'};
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetchImpl(url, {headers, signal: controller.signal, redirect: 'follow'});
    if (!response.ok) { const error = new Error(`GitHub HTTP ${response.status}`); error.status = response.status; throw error; }
    return await response.json();
  } finally { clearTimeout(timer); }
}

function repoForCandidate(candidateId, upstreamReport) {
  return (upstreamReport.results ?? []).find((repo) => repo.status === 'RESOLVED' && (repo.discovery_candidate_ids ?? []).includes(candidateId)) ?? null;
}

function githubParts(repo) {
  const [owner, name] = String(repo.full_name ?? '').split('/');
  return owner && name ? {owner, name} : null;
}

export async function resolveSkillManifests(discoveryReport, upstreamReport, {token = process.env.GITHUB_TOKEN, fetchImpl = fetch, timeoutMs = 8000, observedAt = new Date().toISOString()} = {}) {
  const treeCache = new Map();
  const results = [];
  for (const source of discoveryReport.results ?? []) {
    for (const candidate of source.candidates ?? []) {
      const repo = repoForCandidate(candidate.candidate_id, upstreamReport);
      if (!repo) {
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, status: 'UPSTREAM_NOT_RESOLVED', executed: false});
        continue;
      }
      if (!repo.head_tree_sha || !repo.head_commit) {
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, status: 'TREE_NOT_RESOLVED', executed: false});
        continue;
      }
      const parts = githubParts(repo);
      if (!parts) continue;
      const cacheKey = `${repo.full_name}@${repo.head_tree_sha}`;
      let tree = treeCache.get(cacheKey);
      if (!tree) {
        try {
          tree = await githubJson(`https://api.github.com/repos/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.name)}/git/trees/${encodeURIComponent(repo.head_tree_sha)}?recursive=1`, {token, timeoutMs, fetchImpl});
          treeCache.set(cacheKey, tree);
        } catch (err) {
          results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, status: 'TREE_FETCH_FAILED', error: String(err?.message ?? err), executed: false});
          continue;
        }
      }
      if (tree.truncated === true) {
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, status: 'TREE_TRUNCATED_REVIEW_REQUIRED', executed: false});
        continue;
      }
      const selection = selectSkillManifestPath(candidate, repo, tree.tree ?? []);
      if (selection.status !== 'SKILL_MD_SELECTED') {
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, status: selection.status, selection, executed: false});
        continue;
      }
      try {
        const encodedPath = selection.path.split('/').map(encodeURIComponent).join('/');
        const file = await githubJson(`https://api.github.com/repos/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.name)}/contents/${encodedPath}?ref=${encodeURIComponent(repo.head_commit)}`, {token, timeoutMs, fetchImpl});
        if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('unsupported GitHub content encoding');
        const bytes = Buffer.from(file.content.replace(/\n/g, ''), 'base64');
        if (bytes.length > MAX_MANIFEST_BYTES) throw new Error('manifest exceeds static scan size cap');
        const content = bytes.toString('utf8');
        const scan = staticManifestScan(content);
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, upstream_head_commit: repo.head_commit, manifest_path: selection.path, selection_confidence: selection.confidence, status: 'MANIFEST_RESOLVED_STATIC_ONLY', ...scan});
      } catch (err) {
        results.push({candidate_id: candidate.candidate_id, source_ref: candidate.source_ref, upstream_full_name: repo.full_name, manifest_path: selection.path, status: 'MANIFEST_FETCH_FAILED', error: String(err?.message ?? err), executed: false});
      }
    }
  }
  const counts = {};
  for (const item of results) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return Object.freeze({schema_version: '0.2.0', execution_mode: 'STATIC_READ_ONLY_MANIFEST_SCAN', observed_at: observedAt, candidates_total: results.length, status_counts: counts, code_executed: false, instructions_interpreted: false, results});
}

function argValue(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const discoveryPath = argValue('--discovery') ?? 'artifacts/cerebro-skill-discovery.json';
  const upstreamPath = argValue('--upstreams') ?? 'artifacts/cerebro-skill-upstreams.json';
  const output = argValue('--output') ?? 'artifacts/cerebro-skill-manifests.json';
  const report = await resolveSkillManifests(JSON.parse(fs.readFileSync(discoveryPath, 'utf8')), JSON.parse(fs.readFileSync(upstreamPath, 'utf8')));
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({output, candidates_total: report.candidates_total, status_counts: report.status_counts, code_executed: false, instructions_interpreted: false}));
}
