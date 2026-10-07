import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const TEXT_EXTENSIONS = new Set(['.md','.txt','.json','.yaml','.yml','.toml','.ini','.cfg','.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.sh','.bash','.zsh','.ps1','.rb','.go','.rs','.php','.sql']);
const CODE_EXTENSIONS = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.sh','.bash','.zsh','.ps1','.rb','.go','.rs','.php']);
const DEPENDENCY_FILES = new Set(['package.json','requirements.txt','pyproject.toml','poetry.lock','uv.lock','pipfile','pipfile.lock','gemfile','gemfile.lock','go.mod','go.sum','cargo.toml','cargo.lock','composer.json','composer.lock']);
const LICENSE_RE = /^(?:license|licence|copying|notice)(?:\.[a-z0-9._-]+)?$/i;
const MAX_FILES_PER_SKILL = 120;
const MAX_FETCH_FILES_PER_SKILL = 12;
const MAX_TEXT_BYTES = 96 * 1024;

function dirname(file) {
  const parts = String(file ?? '').split('/');
  parts.pop();
  return parts.join('/');
}

function basename(file) {
  return String(file ?? '').split('/').at(-1) ?? '';
}

function extname(file) {
  return path.posix.extname(String(file ?? '')).toLowerCase();
}

function underRoot(file, root) {
  return !root || file === root || file.startsWith(`${root}/`);
}

function relativeToRoot(file, root) {
  return root && file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file;
}

export function selectBundleFiles(tree, manifestPath) {
  const root = dirname(manifestPath);
  const blobs = (tree ?? []).filter((item) => item?.type === 'blob' && underRoot(item.path, root));
  const files = blobs.slice(0, MAX_FILES_PER_SKILL).map((item) => {
    const relative = relativeToRoot(item.path, root);
    const base = basename(item.path);
    const ext = extname(item.path);
    const isLicense = LICENSE_RE.test(base);
    const isDependency = DEPENDENCY_FILES.has(base.toLowerCase());
    const isCode = CODE_EXTENSIONS.has(ext);
    const isText = TEXT_EXTENSIONS.has(ext) || isLicense || isDependency || base.toLowerCase() === 'dockerfile';
    return {
      path: item.path,
      relative_path: relative,
      size: Number.isFinite(item.size) ? item.size : null,
      sha: item.sha ?? null,
      is_code: isCode,
      is_dependency_manifest: isDependency,
      is_license_evidence: isLicense,
      text_candidate: isText
    };
  });
  return {root, truncated: blobs.length > MAX_FILES_PER_SKILL, total_files_in_root: blobs.length, files};
}

function staticCodeScan(content) {
  const flags = [];
  const checks = [
    ['PROCESS_EXEC', /(?:child_process|execFile|spawn\s*\(|exec\s*\(|subprocess\.|os\.system\s*\(|shell\s*=\s*true)/i],
    ['DYNAMIC_EVAL', /\beval\s*\(|\bnew\s+Function\s*\(/i],
    ['DESTRUCTIVE_FS', /\brm\s+-rf\b|fs\.rm\s*\([^\n]{0,200}recursive\s*:\s*true|shutil\.rmtree\s*\(/i],
    ['SECRET_ENV_ACCESS', /process\.env|os\.environ|getenv\s*\(|\$env:|secret|api[_-]?key|access[_-]?token/i],
    ['NETWORK_CLIENT', /\bfetch\s*\(|axios\.|requests\.|urllib\.|https?\.request|curl\s+https?:\/\/|wget\s+https?:\/\//i],
    ['PACKAGE_INSTALL', /\b(?:npm|pnpm|yarn|pip|pipx|uv|brew|apt(?:-get)?|dnf|yum)\s+(?:install|add)\b/i],
    ['PERMISSION_CHANGE', /\bchmod\b|fs\.chmod\s*\(/i],
    ['BASE64_OR_OBFUSCATION', /fromCharCode|atob\s*\(|base64\.b64decode|Buffer\.from\([^\n]{0,200}base64/i],
    ['CAPTCHA_EVASION', /captcha.{0,50}(?:bypass|solve|evad)/i],
    ['ANTI_DETECT', /anti[- ]?detect|fingerprint.{0,40}(?:spoof|evad)/i],
    ['CREDENTIAL_EXTRACTION', /(?:extract|dump|steal).{0,50}(?:credential|password|token|secret)/i]
  ];
  for (const [flag, re] of checks) if (re.test(content)) flags.push(flag);
  return flags;
}

async function githubJson(url, {token = process.env.GITHUB_TOKEN, timeoutMs = 8000, fetchImpl = fetch} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-SkillBundleScanner/0.1 (+read-only)'};
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetchImpl(url, {headers, signal: controller.signal, redirect:'follow'});
    if (!response.ok) { const error = new Error(`GitHub HTTP ${response.status}`); error.status = response.status; throw error; }
    return await response.json();
  } finally { clearTimeout(timer); }
}

function repoParts(repo) {
  const [owner,name] = String(repo?.full_name ?? '').split('/');
  return owner && name ? {owner,name} : null;
}

function candidateRepo(candidateId, upstreams) {
  return (upstreams?.results ?? []).find((repo) => repo.status === 'RESOLVED' && (repo.discovery_candidate_ids ?? []).includes(candidateId)) ?? null;
}

function manifestFor(candidateId, manifests) {
  return (manifests?.results ?? []).find((item) => item.candidate_id === candidateId) ?? null;
}

async function fetchTextBlob(parts, filePath, ref, options) {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const file = await githubJson(`https://api.github.com/repos/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.name)}/contents/${encoded}?ref=${encodeURIComponent(ref)}`, options);
  if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('unsupported content encoding');
  const bytes = Buffer.from(file.content.replace(/\n/g,''), 'base64');
  if (bytes.length > MAX_TEXT_BYTES) throw new Error('text file exceeds scan cap');
  return bytes.toString('utf8');
}

function fetchPriority(file) {
  if (file.is_license_evidence) return 0;
  if (file.is_dependency_manifest) return 1;
  if (file.is_code) return 2;
  if (/readme|instructions|reference/i.test(file.relative_path)) return 3;
  return 9;
}

export async function scanSkillBundles(shortlist, upstreams, manifests, {priority='P0', token=process.env.GITHUB_TOKEN, fetchImpl=fetch, timeoutMs=8000, observedAt=new Date().toISOString()} = {}) {
  const candidates = (shortlist?.results ?? []).filter((item) => item.priority === priority && !['REFERENCE_ONLY','QUARANTINE_ARCHIVED','REJECTED','REJECTED_SECURITY_POLICY'].includes(item.disposition));
  const treeCache = new Map();
  const results = [];
  for (const item of candidates) {
    const repo = candidateRepo(item.candidate_id, upstreams);
    const manifest = manifestFor(item.candidate_id, manifests);
    if (!repo || !repo.head_tree_sha || !manifest?.manifest_path) {
      results.push({candidate_id:item.candidate_id,status:'BUNDLE_NOT_SCANNABLE',reason:'MISSING_REPO_TREE_OR_MANIFEST',executed:false});
      continue;
    }
    const parts = repoParts(repo);
    const key = `${repo.full_name}@${repo.head_tree_sha}`;
    let tree = treeCache.get(key);
    try {
      if (!tree) {
        tree = await githubJson(`https://api.github.com/repos/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.name)}/git/trees/${encodeURIComponent(repo.head_tree_sha)}?recursive=1`, {token,fetchImpl,timeoutMs});
        treeCache.set(key,tree);
      }
      if (tree.truncated) {
        results.push({candidate_id:item.candidate_id,status:'BUNDLE_TREE_TRUNCATED',upstream_full_name:repo.full_name,executed:false});
        continue;
      }
      const inventory = selectBundleFiles(tree.tree ?? [], manifest.manifest_path);
      const fetchable = inventory.files.filter((f) => f.text_candidate && f.path !== manifest.manifest_path).sort((a,b) => fetchPriority(a)-fetchPriority(b) || a.path.localeCompare(b.path)).slice(0,MAX_FETCH_FILES_PER_SKILL);
      const fileScans = [];
      for (const file of fetchable) {
        try {
          const content = await fetchTextBlob(parts,file.path,repo.head_commit,{token,fetchImpl,timeoutMs});
          fileScans.push({path:file.path,sha256:createHash('sha256').update(content).digest('hex'),bytes:Buffer.byteLength(content,'utf8'),flags:staticCodeScan(content),fetched:true});
        } catch (err) {
          fileScans.push({path:file.path,fetched:false,error:String(err?.message ?? err),flags:[]});
        }
      }
      const flags = [...new Set(fileScans.flatMap((f) => f.flags))];
      const licensePaths = inventory.files.filter((f) => f.is_license_evidence).map((f) => f.path);
      const dependencyFiles = inventory.files.filter((f) => f.is_dependency_manifest).map((f) => f.path);
      const codeFiles = inventory.files.filter((f) => f.is_code).map((f) => f.path);
      results.push({
        candidate_id:item.candidate_id,
        status:'BUNDLE_STATIC_SCAN_COMPLETE',
        priority:item.priority,
        disposition_before_bundle_scan:item.disposition,
        upstream_full_name:repo.full_name,
        upstream_head_commit:repo.head_commit,
        manifest_path:manifest.manifest_path,
        skill_root:inventory.root,
        total_files_in_root:inventory.total_files_in_root,
        inventory_truncated:inventory.truncated,
        code_files_count:codeFiles.length,
        code_files:codeFiles.slice(0,50),
        dependency_files:dependencyFiles,
        license_evidence_paths:licensePaths,
        fetched_text_files:fileScans,
        bundle_static_flags:flags,
        executed:false,
        instructions_interpreted:false
      });
    } catch (err) {
      results.push({candidate_id:item.candidate_id,status:'BUNDLE_SCAN_FAILED',upstream_full_name:repo.full_name,error:String(err?.message ?? err),executed:false});
    }
  }
  const status_counts = {};
  const flag_counts = {};
  for (const item of results) {
    status_counts[item.status]=(status_counts[item.status]??0)+1;
    for (const flag of item.bundle_static_flags??[]) flag_counts[flag]=(flag_counts[flag]??0)+1;
  }
  return Object.freeze({schema_version:'0.1.0',execution_mode:'STATIC_READ_ONLY_BUNDLE_SCAN',observed_at:observedAt,priority_scope:priority,candidates_scanned:results.length,status_counts,flag_counts,code_executed:false,instructions_interpreted:false,results});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const shortlist=JSON.parse(fs.readFileSync(argValue('--shortlist')??'artifacts/cerebro-skill-shortlist.json','utf8'));
  const upstreams=JSON.parse(fs.readFileSync(argValue('--upstreams')??'artifacts/cerebro-skill-upstreams.json','utf8'));
  const manifests=JSON.parse(fs.readFileSync(argValue('--manifests')??'artifacts/cerebro-skill-manifests.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-bundles.json';
  const report=await scanSkillBundles(shortlist,upstreams,manifests,{priority:argValue('--priority')??'P0'});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,priority_scope:report.priority_scope,candidates_scanned:report.candidates_scanned,status_counts:report.status_counts,flag_counts:report.flag_counts,code_executed:false}));
}
