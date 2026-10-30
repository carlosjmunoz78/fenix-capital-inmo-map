import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const PREPROD = 'PREPROD';
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE = path.resolve(MODULE_DIR, '../data/neuronal-superparallel-v1.json.gz.b64');
const OUT_ROOT = path.resolve(process.env.CEREBRO_NEURONAL_OUT_DIR || 'artifacts/neuronal-superparallel-v1');
const EXPECTED_REQUIREMENTS = 493;
const EXPECTED_SUBMISSIONS = 6449;

export const NEURONAL_PHASES_V1 = Object.freeze([
  ['A_AUDIT','audit','research'],
  ['B_CONTRACT','contract','contracts'],
  ['C_DATA','data_model','contracts'],
  ['D_UX','ux_spec','design'],
  ['E_VISUAL','visual_spec','design'],
  ['F_BUILD','implementation','code'],
  ['G_UNIT','unit_contract_tests','tests'],
  ['H_INTEGRATION','integration_tests','tests'],
  ['I_PERF_A11Y','perf_accessibility','tests'],
  ['J_ADVERSARIAL','safety_redteam','security'],
  ['K_EVIDENCE','evidence_docs','docs'],
  ['L_EVAL','eval_tribunal','evaluation'],
  ['M_PROMOTION','promotion_candidate','merge'],
]);

const PHASE_MODEL = Object.freeze({
  A_AUDIT:'ENTERPRISE_OR_DEEPSEEK_REVIEW',
  B_CONTRACT:'ENTERPRISE_PRIMARY_DEEPSEEK_CHALLENGER',
  C_DATA:'ENTERPRISE_PRIMARY_DEEPSEEK_CHALLENGER',
  D_UX:'ENTERPRISE_PRIMARY',
  E_VISUAL:'ENTERPRISE_PRIMARY',
  F_BUILD:'DETERMINISTIC_TOOLS_PLUS_DEEPSEEK_OR_ENTERPRISE',
  G_UNIT:'DEEPSEEK_ALLOWED_INDEPENDENT_VALIDATION_REQUIRED',
  H_INTEGRATION:'DETERMINISTIC_TESTS_ENTERPRISE_DIAGNOSIS',
  I_PERF_A11Y:'DETERMINISTIC_MEASUREMENT_ENTERPRISE_ANALYSIS',
  J_ADVERSARIAL:'ENTERPRISE_PLUS_DEEPSEEK_INDEPENDENT_REVIEW',
  K_EVIDENCE:'DETERMINISTIC_CAPTURE_ENTERPRISE_SUMMARY',
  L_EVAL:'MULTI_JUDGE_NO_SINGLE_MODEL_AUTHORITY',
  M_PROMOTION:'DETERMINISTIC_GATES_ONLY',
});

const DEEPSEEK_PHASES = new Set(['A_AUDIT','B_CONTRACT','C_DATA','F_BUILD','G_UNIT','J_ADVERSARIAL']);
const PRIORITY_SCORE = Object.freeze({P0:0,P1:1,P2:2});
const HORIZON_SCORE = Object.freeze({NOW:0,NEXT:1,FUTURE:2});

function safeText(value, label, max = 20000) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const text = value.trim();
  if (text.length > max) throw new TypeError(`${label} too long`);
  return text;
}

function integer(value, label, min, max) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be integer ${min}..${max}`);
  return n;
}

function loadSource(file = process.env.CEREBRO_NEURONAL_SOURCE_FILE || DEFAULT_SOURCE) {
  const encoded = fs.readFileSync(file, 'utf8').trim();
  const decoded = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const raw = JSON.parse(decoded);
  if (raw?.campaign_id !== 'NEURONAL-SUPERPARALLEL-V1') throw new Error('NEURONAL_CAMPAIGN_MISMATCH');
  if (raw?.environment !== PREPROD) throw new Error('NEURONAL_PREPROD_ONLY');
  if (raw?.safeguards?.prod_write_allowed !== false || raw?.safeguards?.trading_access !== false) throw new Error('NEURONAL_AUTHORITY_EXPANSION_DENIED');
  if (!Array.isArray(raw.foundation) || !Array.isArray(raw.requirements)) throw new Error('NEURONAL_SOURCE_ARRAYS_REQUIRED');
  if (raw.requirements.length !== EXPECTED_REQUIREMENTS) throw new Error(`NEURONAL_REQUIREMENT_COUNT_MISMATCH:${raw.requirements.length}`);
  return raw;
}

function reqTask(req, phaseCode, phase, lane) {
  const id = `${req.requirement_id}-${phaseCode}`;
  return Object.freeze({
    submission_id:id,
    requirement_id:req.requirement_id,
    domain:req.domain,
    phase,
    phase_code:phaseCode,
    lane,
    title:`${req.title} · ${phaseCode}`,
    priority:req.priority,
    horizon:req.horizon,
    required_skills:Object.freeze([...(req.required_skills || [])]),
    model_policy:PHASE_MODEL[phaseCode],
    deepseek_allowed:DEEPSEEK_PHASES.has(phaseCode),
    company_id:'fenix',
    engine_id:'CONSOLE-001',
    environment:PREPROD,
    version:'neuronal-superparallel-v1',
    prod_write_allowed:false,
    trading_access:false,
  });
}

function dependenciesFor(reqId, phaseCode) {
  const id = code => `${reqId}-${code}`;
  switch (phaseCode) {
    case 'A_AUDIT': return ['FND-001','FND-002','FND-034'];
    case 'B_CONTRACT': return [id('A_AUDIT'),'FND-010','FND-011','FND-035'];
    case 'C_DATA': return [id('B_CONTRACT')];
    case 'D_UX':
    case 'E_VISUAL': return [id('B_CONTRACT')];
    case 'F_BUILD': return [id('C_DATA'),id('D_UX'),id('E_VISUAL'),'FND-025','FND-027'];
    case 'G_UNIT': return [id('F_BUILD')];
    case 'H_INTEGRATION': return [id('F_BUILD'),'FND-005'];
    case 'I_PERF_A11Y': return [id('F_BUILD'),'FND-018','FND-019'];
    case 'J_ADVERSARIAL': return [id('F_BUILD'),'FND-016','FND-017'];
    case 'K_EVIDENCE': return [id('G_UNIT'),id('H_INTEGRATION'),id('I_PERF_A11Y'),id('J_ADVERSARIAL'),'FND-030'];
    case 'L_EVAL': return [id('K_EVIDENCE'),'FND-022','FND-039'];
    case 'M_PROMOTION': return [id('L_EVAL'),'FND-020','FND-040'];
    default: throw new Error(`UNKNOWN_NEURONAL_PHASE:${phaseCode}`);
  }
}

export function buildNeuronalSubmissionsV1(source = loadSource()) {
  const submissions = [];
  for (const foundation of source.foundation) {
    submissions.push(Object.freeze({
      ...foundation,
      dependencies:Object.freeze([...(foundation.dependencies || [])]),
      required_skills:Object.freeze([...(foundation.required_skills || [])]),
      company_id:'fenix', engine_id:'CONSOLE-001', environment:PREPROD, version:'neuronal-superparallel-v1',
      prod_write_allowed:false, trading_access:false,
    }));
  }
  for (const req of source.requirements) {
    for (const [phaseCode, phase, lane] of NEURONAL_PHASES_V1) {
      submissions.push(Object.freeze({
        ...reqTask(req, phaseCode, phase, lane),
        dependencies:Object.freeze(dependenciesFor(req.requirement_id, phaseCode)),
      }));
    }
  }
  if (submissions.length !== EXPECTED_SUBMISSIONS) throw new Error(`NEURONAL_SUBMISSION_COUNT_MISMATCH:${submissions.length}`);
  validateNeuronalDagV1(submissions);
  return Object.freeze(submissions);
}

export function validateNeuronalDagV1(submissions) {
  const byId = new Map();
  for (const sub of submissions) {
    if (byId.has(sub.submission_id)) throw new Error(`DUPLICATE_NEURONAL_SUBMISSION:${sub.submission_id}`);
    if (sub.environment !== PREPROD || sub.prod_write_allowed !== false || sub.trading_access !== false) throw new Error(`NEURONAL_AUTHORITY_INVALID:${sub.submission_id}`);
    byId.set(sub.submission_id, sub);
  }
  for (const sub of submissions) for (const dep of sub.dependencies || []) if (!byId.has(dep)) throw new Error(`BROKEN_NEURONAL_DEP:${sub.submission_id}:${dep}`);
  const visiting = new Set();
  const visited = new Set();
  const visit = id => {
    if (visiting.has(id)) throw new Error(`NEURONAL_DAG_CYCLE:${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependencies || []) visit(dep);
    visiting.delete(id); visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
  return Object.freeze({submission_count:submissions.length,unique_ids:byId.size,acyclic:true,broken_dependencies:0});
}

function score(sub) {
  const p = PRIORITY_SCORE[sub.priority] ?? 9;
  const h = HORIZON_SCORE[sub.horizon] ?? 9;
  const phase = sub.phase_code === 'A_AUDIT' ? 0 : sub.domain === '00_FOUNDATION' ? 1 : 5;
  return p*100 + h*10 + phase;
}

export function discoveryCandidatesV1(submissions = buildNeuronalSubmissionsV1()) {
  return Object.freeze([...submissions].sort((a,b)=>score(a)-score(b) || a.submission_id.localeCompare(b.submission_id)));
}

export function planNeuronalFanoutV1({requested_units=147, offset=0} = {}) {
  const requested = integer(requested_units,'requested_units',1,180);
  const start = integer(offset,'offset',0,EXPECTED_SUBMISSIONS-1);
  const candidates = discoveryCandidatesV1();
  const slice = candidates.slice(start, Math.min(start + requested, candidates.length));
  return Object.freeze({
    schema_version:'1.0.0', state_type:'CEREBRO_NEURONAL_ENTERPRISE_FANOUT_PLAN_V1', campaign_id:'NEURONAL-SUPERPARALLEL-V1',
    environment:PREPROD, requested_units:requested, offset:start, planned_units:slice.length, total_submissions:EXPECTED_SUBMISSIONS,
    matrix:Object.freeze(slice.map((sub,index)=>Object.freeze({slot:start+index,submission_id:sub.submission_id,requirement_id:sub.requirement_id || '',phase:sub.phase,domain:sub.domain}))),
    discovery_only:true, completion_authority:false, prod_authorized:false, prod_write_authorized:false, trading_access:false,
  });
}

function termsFor(sub) {
  const raw = [sub.domain, sub.title, ...(sub.required_skills || [])].join(' ')
    .normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  return [...new Set(raw.split(/[^a-z0-9_-]+/).filter(x=>x.length>=4))].slice(0,24);
}

function filesystemFiles(root = process.cwd()) {
  const roots = ['cerebro','src','docs','.github'].filter(name => fs.existsSync(path.join(root,name)));
  const files = [];
  const walk = (absolute, relative) => {
    for (const entry of fs.readdirSync(absolute,{withFileTypes:true})) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'artifacts') continue;
      const abs = path.join(absolute,entry.name);
      const rel = path.join(relative,entry.name).replace(/\\/g,'/');
      if (entry.isDirectory()) walk(abs,rel);
      else if (entry.isFile()) files.push(rel);
    }
  };
  for (const name of roots) walk(path.join(root,name),name);
  return files.sort();
}

function gitFiles() {
  if (process.env.CEREBRO_NEURONAL_FORCE_FS_INVENTORY !== 'YES') {
    try {
      return execFileSync('git',['ls-files'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split(/\r?\n/).filter(Boolean);
    } catch { }
  }
  return filesystemFiles();
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, `${JSON.stringify(value,null,2)}\n`, 'utf8');
}

export function evidenceForNeuronalSubmissionV1(submissionId, submissions = buildNeuronalSubmissionsV1()) {
  const sub = submissions.find(x=>x.submission_id===submissionId);
  if (!sub) throw new Error(`UNKNOWN_NEURONAL_SUBMISSION:${submissionId}`);
  const terms = termsFor(sub);
  const matches = gitFiles().map(file=>({file,score:terms.filter(t=>file.toLowerCase().includes(t)).length}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.file.localeCompare(b.file)).slice(0,80);
  return Object.freeze({
    schema_version:'1.0.0', state_type:'CEREBRO_NEURONAL_DISCOVERY_EVIDENCE_V1', campaign_id:'NEURONAL-SUPERPARALLEL-V1',
    generated_at:new Date().toISOString(), git_sha:process.env.GITHUB_SHA || null,
    submission:sub, keyword_terms:terms, matching_paths:matches, matching_path_count:matches.length,
    execution_state:'DISCOVERY_EVIDENCE_COLLECTED', submission_completed:false, dependencies_enforced_at_completion:true,
    useful_work:true, additional_cost_eur:0, paid_ai_used:false, prod_authorized:false, prod_write_authorized:false, trading_access:false,
  });
}

export function runNeuronalEvidenceV1(submissionId) {
  const packet = evidenceForNeuronalSubmissionV1(submissionId);
  writeJson(path.join(OUT_ROOT,'evidence',`${submissionId}.json`), packet);
  return packet;
}

export function materializeNeuronalCampaignV1() {
  const submissions = buildNeuronalSubmissionsV1();
  fs.mkdirSync(OUT_ROOT, {recursive:true});
  const jsonl = submissions.map(sub => JSON.stringify({...sub, campaign_state:'QUEUED', completion_evidence:null})).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT_ROOT,'submissions.jsonl'), jsonl, 'utf8');
  const summary = {schema_version:'1.0.0',state_type:'CEREBRO_NEURONAL_CAMPAIGN_MATERIALIZED_V1',campaign_id:'NEURONAL-SUPERPARALLEL-V1',requirements:EXPECTED_REQUIREMENTS,submissions:submissions.length,environment:PREPROD,queue_state:'MATERIALIZED_FOR_CEREBRO_FANOUT',prod_authorized:false,prod_write_authorized:false,trading_access:false};
  writeJson(path.join(OUT_ROOT,'summary.json'), summary);
  return Object.freeze(summary);
}

export function deepSeekCandidatesV1({limit=32} = {}) {
  const n = integer(limit,'limit',1,64);
  return Object.freeze(discoveryCandidatesV1().filter(s=>s.deepseek_allowed && s.priority==='P0' && s.horizon==='NOW').slice(0,n));
}

export const NEURONAL_SUPERPARALLEL_SOURCE_V1_CONTRACT = Object.freeze({
  capability:'CONSOLE-001/NEURONAL/SUPERPARALLEL-SOURCE-V1',
  campaign_id:'NEURONAL-SUPERPARALLEL-V1', environment:PREPROD,
  approved_requirements:EXPECTED_REQUIREMENTS, submissions:EXPECTED_SUBMISSIONS,
  enterprise_discovery_parallel_target:147, deepseek_parallel_max:8,
  discovery_does_not_complete_submissions:true,
  dependencies_required_for_completion:true,
  factory_skill_gap_policy:'REUSE_OR_EXTEND_THEN_FACT001_BUILD_IN_LAB',
  second_queue:false, second_scheduler:false, second_daemon:false,
  new_subscription_eur:0, prod_authorized:false, prod_write_authorized:false, trading_access:false,
});

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg=>{const [k,v='true']=arg.replace(/^--/,'').split('='); return [k,v];}));
  if (args.mode === 'validate') {
    const subs = buildNeuronalSubmissionsV1();
    console.log(JSON.stringify({ok:true,...validateNeuronalDagV1(subs),requirements:EXPECTED_REQUIREMENTS,contract:NEURONAL_SUPERPARALLEL_SOURCE_V1_CONTRACT}));
  } else if (args.mode === 'materialize') {
    console.log(JSON.stringify({ok:true,...materializeNeuronalCampaignV1()}));
  } else if (args.mode === 'plan') {
    console.log(JSON.stringify(planNeuronalFanoutV1({requested_units:Number(args.units || 147),offset:Number(args.offset || 0)})));
  } else if (args.mode === 'evidence') {
    const result=runNeuronalEvidenceV1(safeText(args.submission,'submission',128));
    console.log(JSON.stringify({ok:true,submission_id:result.submission.submission_id,state:result.execution_state,completed:false}));
  } else throw new Error('use --mode=validate | --mode=materialize | --mode=plan --units=N --offset=N | --mode=evidence --submission=ID');
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) main().catch(error=>{console.error(String(error?.stack || error)); process.exitCode=1;});
