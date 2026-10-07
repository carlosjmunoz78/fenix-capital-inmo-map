import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_MANIFEST_BYTES = 256 * 1024;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function scoreCase(text, testCase) {
  const groups = testCase.term_groups ?? [];
  if (!groups.length) return {case_id:testCase.case_id, groups_total:0, groups_hit:0, score:0, status:'BLOCKED_EMPTY_CASE'};
  const hits = groups.filter((group) => includesAny(text, group)).length;
  const score = Number(((hits / groups.length) * 100).toFixed(2));
  return {
    case_id:testCase.case_id,
    groups_total:groups.length,
    groups_hit:hits,
    score,
    status:hits === groups.length ? 'COVERED' : hits === 0 ? 'NOT_COVERED' : 'PARTIAL'
  };
}

function validateProfile(profile) {
  const blockers=[];
  if (!profile?.candidate_id) blockers.push('CANDIDATE_ID_MISSING');
  if (!profile?.upstream_full_name) blockers.push('UPSTREAM_MISSING');
  if (!profile?.upstream_head_commit) blockers.push('UPSTREAM_COMMIT_MISSING');
  if (!profile?.manifest_path) blockers.push('MANIFEST_PATH_MISSING');
  if (!/^[a-f0-9]{64}$/.test(profile?.manifest_sha256 ?? '')) blockers.push('MANIFEST_SHA256_INVALID');
  if (!Array.isArray(profile?.test_cases) || !profile.test_cases.length) blockers.push('TEST_CASES_MISSING');
  if (profile?.external_code_execution_authorized !== false) blockers.push('EXTERNAL_CODE_EXECUTION_MUST_BE_FALSE');
  if (profile?.sandbox_authorized !== false) blockers.push('SANDBOX_MUST_BE_FALSE');
  if (profile?.install_authorized !== false) blockers.push('INSTALL_MUST_BE_FALSE');
  if (profile?.prod_authorized !== false) blockers.push('PROD_MUST_BE_FALSE');
  if (profile?.prod_write_authorized !== false) blockers.push('PROD_WRITE_MUST_BE_FALSE');
  if (profile?.trading_access !== false) blockers.push('TRADING_MUST_BE_FALSE');
  return blockers;
}

async function githubContent(profile,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=8000}={}) {
  const [owner,repo] = String(profile.upstream_full_name).split('/');
  if (!owner || !repo) throw new Error('invalid upstream_full_name');
  const encodedPath = String(profile.manifest_path).split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(profile.upstream_head_commit)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers={
    accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'CEREBRO-OS-SelectedSkillStaticLab/0.1 (+read-only)'
  };
  if (token) headers.authorization=`Bearer ${token}`;
  try {
    const response = await fetchImpl(url,{headers,signal:controller.signal,redirect:'follow'});
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const file = await response.json();
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('unsupported GitHub content encoding');
    const bytes = Buffer.from(file.content.replace(/\n/g,''),'base64');
    if (bytes.length > MAX_MANIFEST_BYTES) throw new Error('manifest exceeds static LAB cap');
    return bytes.toString('utf8');
  } finally {
    clearTimeout(timer);
  }
}

export function evaluateSelectedManifest(profile, content, {observedAt=new Date().toISOString()}={}) {
  const profileBlockers = validateProfile(profile);
  const observedSha256 = sha256(content);
  const text = String(content ?? '').toLowerCase();
  const blockers=[...profileBlockers];
  if (observedSha256 !== profile.manifest_sha256) blockers.push('PROVENANCE_HASH_MISMATCH');

  const forbiddenHits=[];
  for (const entry of profile.forbidden_text_patterns ?? []) {
    const re = new RegExp(entry.pattern, entry.flags ?? 'i');
    if (re.test(content)) forbiddenHits.push(entry.id);
  }
  if (forbiddenHits.length) blockers.push('FORBIDDEN_TEXT_PRESENT');

  const requiredSafeguards=[];
  for (const safeguard of profile.required_safeguards ?? []) {
    const hit=includesAny(text, safeguard.any_of ?? []);
    requiredSafeguards.push({id:safeguard.id,hit});
    if (!hit) blockers.push(`SAFEGUARD_MISSING:${safeguard.id}`);
  }

  const caseResults=(profile.test_cases ?? []).map((testCase)=>scoreCase(text,testCase));
  const coverageScore=caseResults.length
    ? Number((caseResults.reduce((sum,item)=>sum+item.score,0)/caseResults.length).toFixed(2))
    : 0;
  const minimumCoverage=Number(profile.minimum_coverage_score ?? 90);
  if (coverageScore < minimumCoverage) blockers.push('COVERAGE_BELOW_THRESHOLD');
  if (caseResults.some((x)=>x.score < Number(profile.minimum_case_score ?? 75))) blockers.push('CASE_BELOW_THRESHOLD');

  const status=blockers.length===0
    ? 'STATIC_LAB_GREEN_FOR_NORMALIZED_WRAPPER_DESIGN'
    : 'STATIC_LAB_HOLD';

  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'SELECTED_CANDIDATE_STATIC_LAB_INERT_TEXT_ONLY',
    observed_at:observedAt,
    candidate_id:profile.candidate_id,
    declared_name:profile.declared_name ?? null,
    upstream_full_name:profile.upstream_full_name,
    upstream_head_commit:profile.upstream_head_commit,
    manifest_path:profile.manifest_path,
    expected_manifest_sha256:profile.manifest_sha256,
    observed_manifest_sha256:observedSha256,
    provenance_exact:observedSha256===profile.manifest_sha256,
    prelab_state:profile.prelab_state ?? null,
    test_only_review_status:profile.test_only_review_status ?? null,
    value_score:profile.value_score ?? null,
    status,
    blockers,
    forbidden_hits:forbiddenHits,
    required_safeguards:requiredSafeguards,
    coverage_score:coverageScore,
    minimum_coverage_score:minimumCoverage,
    case_results:caseResults,
    next_action:status==='STATIC_LAB_GREEN_FOR_NORMALIZED_WRAPPER_DESIGN'
      ? 'BUILD_NORMALIZED_CEREBRO_SKILL_CREATOR_WRAPPER_WITH_EXTERNAL_CODE_DISABLED'
      : 'HOLD_AND_REVIEW_STATIC_EVIDENCE',
    external_code_executed:false,
    test_code_executed:false,
    external_code_execution_authorized:false,
    sandbox_authorized:false,
    install_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    customer_data_used:false,
    prod_data_used:false,
    trading_access:false,
    additional_cost_eur:0
  });
}

export async function runSelectedCandidateStaticLab(profile, options={}) {
  const profileBlockers=validateProfile(profile);
  if (profileBlockers.length) return evaluateSelectedManifest(profile,'',{observedAt:options.observedAt});
  const content=await githubContent(profile,options);
  return evaluateSelectedManifest(profile,content,{observedAt:options.observedAt});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if (import.meta.url===`file://${process.argv[1]}`) {
  const profilePath=argValue('--profile') ?? 'cerebro/skills/skill-creator-static-lab.v0.json';
  const output=argValue('--output') ?? 'artifacts/cerebro-skill-creator-static-lab.json';
  const profile=JSON.parse(fs.readFileSync(profilePath,'utf8'));
  try {
    const report=await runSelectedCandidateStaticLab(profile);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({output,status:report.status,candidate_id:report.candidate_id,coverage_score:report.coverage_score,blockers:report.blockers,external_code_executed:false,prod_authorized:false,additional_cost_eur:0}));
    if (report.status!=='STATIC_LAB_GREEN_FOR_NORMALIZED_WRAPPER_DESIGN') process.exitCode=2;
  } catch (error) {
    const report={
      schema_version:'0.1.0',execution_mode:'SELECTED_CANDIDATE_STATIC_LAB_INERT_TEXT_ONLY',status:'STATIC_LAB_FETCH_FAILED',
      candidate_id:profile.candidate_id??null,error:String(error?.message??error),external_code_executed:false,test_code_executed:false,
      external_code_execution_authorized:false,sandbox_authorized:false,install_authorized:false,prod_authorized:false,prod_write_authorized:false,
      customer_data_used:false,prod_data_used:false,trading_access:false,additional_cost_eur:0
    };
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.error(JSON.stringify(report));
    process.exitCode=3;
  }
}
