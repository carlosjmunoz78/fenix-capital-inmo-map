import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_MANIFEST_BYTES=256*1024;

const CASE_TERM_GROUPS=Object.freeze({
  'repo-understanding': [['repo','repository'],['github','cli','api'],['issue','pull request','release','workflow']],
  'ci-diagnosis': [['ci','check','workflow'],['log','run','failed','failure'],['github','gh']],
  'safe-pr-plan': [['pull request','pr'],['review','test','check'],['release','merge','rollback']],
  'read-only-navigation': [['navigate','open','browser'],['extract','screenshot','snapshot'],['selector','page','url']],
  'form-dry-run': [['form','fill'],['click','input','field'],['submit','credential','login']],
  'e2e-evidence': [['test','qa','e2e'],['screenshot','snapshot'],['assert','evidence','failure']],
  'query-review': [['query','sql'],['index','explain'],['slow','performance','timeout']],
  'rls-review': [['rls','row level security'],['tenant','user','role'],['policy','security']],
  'migration-plan': [['migration','schema'],['alter','change','column','table'],['restore','dump','backup','rollback']],
  'capability-routing': [['route','routing'],['capability','tool'],['workflow','agent']],
  'instruction-conflict': [['instruction','policy'],['conflict','override'],['safety','permission']],
  'context-budget': [['context','token'],['metadata','progressive'],['lazy','load','materialize']],
  'knowledge-read-search': [['note','notes','markdown','vault'],['read','search'],['file','path','query']],
  'knowledge-link-analysis': [['link','links','backlink','backlinks','unresolved'],['tag','tags','property','properties'],['note','notes','vault']],
  'knowledge-change-safety': [['create','append','prepend','move','delete','edit','modify'],['file','path','note','vault'],['rollback','backup','reversible','dry-run','dry run']]
});

const HARD_BLOCK_PATTERNS=Object.freeze([
  ['CAPTCHA_BYPASS',/captcha.{0,40}(?:bypass|solve|evad)/i],
  ['ANTI_DETECT',/anti[- ]?detect|fingerprint.{0,30}(?:spoof|evad)/i],
  ['CREDENTIAL_EXTRACTION',/(?:extract|dump|steal).{0,40}(?:credential|password|token|secret)/i]
]);
const SAFETY_OVERRIDE_PATTERN=/(?:ignore|bypass|disable).{0,40}(?:safety|policy|permission|guardrail)/gi;
const SAFETY_PROHIBITION_CUE=/(?:\bdo not\b|\bdon't\b|\bnever\b|\bmust not\b|\bshould not\b|\bshall not\b|\bcannot\b|\bcan't\b)/gi;
const CLAUSE_BOUNDARY=/[.!?;\n\r]/;

function byCandidate(report){
  const map=new Map();
  for(const item of report?.results??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function normalizeText(value){return String(value??'').toLowerCase();}
function sha256(text){return createHash('sha256').update(text).digest('hex');}
function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,n));}

function groupHit(text,terms){return terms.some((term)=>text.includes(term));}

function clauseStartBefore(text,index){
  for(let i=index-1;i>=0;i-=1) if(CLAUSE_BOUNDARY.test(text[i])) return i+1;
  return 0;
}

function isExplicitlyProhibitedSafetyOverride(text,matchIndex){
  const prefix=text.slice(clauseStartBefore(text,matchIndex),matchIndex);
  SAFETY_PROHIBITION_CUE.lastIndex=0;
  let cue=null,current;
  while((current=SAFETY_PROHIBITION_CUE.exec(prefix))!==null) cue=current;
  if(!cue) return false;
  const distance=prefix.length-(cue.index+cue[0].length);
  return distance<=48;
}

function hasUnprohibitedSafetyOverride(text){
  SAFETY_OVERRIDE_PATTERN.lastIndex=0;
  let match;
  while((match=SAFETY_OVERRIDE_PATTERN.exec(text))!==null){
    if(!isExplicitlyProhibitedSafetyOverride(text,match.index)) return true;
  }
  return false;
}

export function scoreCaseCoverage(content,testCase){
  const text=normalizeText(content);
  const groups=CASE_TERM_GROUPS[testCase?.case_id]??[];
  if(!groups.length) return {case_id:testCase?.case_id??'unknown',groups_total:0,groups_hit:0,score:50,status:'GENERIC_UNSCORABLE'};
  const hits=groups.filter((terms)=>groupHit(text,terms)).length;
  return {case_id:testCase.case_id,groups_total:groups.length,groups_hit:hits,score:Number(((hits/groups.length)*100).toFixed(2)),status:hits===groups.length?'COVERED':hits===0?'NOT_COVERED':'PARTIAL'};
}

export function analyzeStaticLabContent(content,{manifestFlags=[]}={}){
  const text=String(content??'');
  const hardBlocks=[];
  for(const [id,re] of HARD_BLOCK_PATTERNS) if(re.test(text)) hardBlocks.push(id);
  if(hasUnprohibitedSafetyOverride(text)) hardBlocks.push('SAFETY_OVERRIDE');
  let policyScore=100;
  const flags=new Set(manifestFlags??[]);
  if(flags.has('ROUTER_PRECEDENCE_CLAIM')) policyScore-=12;
  if(flags.has('SECRET_ACCESS_MENTION')) policyScore-=20;
  if(flags.has('SHELL_PIPE_EXEC')) policyScore-=40;
  if(flags.has('NETWORK_DOWNLOAD_COMMAND')) policyScore-=15;
  if(/prefer .{0,80} over (?:any|all|the) .{0,40}(?:built-in|builtin|native)/i.test(text)) policyScore-=8;
  if(/(?:submit|send|publish|delete|purchase|pay|deploy to prod|production write)/i.test(text)) policyScore-=5;
  if(hardBlocks.length) policyScore=0;
  return Object.freeze({hard_blocks:hardBlocks,policy_alignment_score:clamp(policyScore),bytes:Buffer.byteLength(text,'utf8'),sha256:sha256(text),executed:false,instructions_followed:false});
}

async function githubContent(repoFullName,commit,filePath,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=8000}={}){
  const [owner,repo]=String(repoFullName??'').split('/');
  if(!owner||!repo) throw new Error('invalid upstream_full_name');
  const encodedPath=String(filePath??'').split('/').map(encodeURIComponent).join('/');
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(commit)}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers={accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-StaticLab/0.1 (+read-only)'};
  if(token) headers.authorization=`Bearer ${token}`;
  try{
    const response=await fetchImpl(url,{headers,signal:controller.signal,redirect:'follow'});
    if(!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const file=await response.json();
    if(file.encoding!=='base64'||typeof file.content!=='string') throw new Error('unsupported GitHub content encoding');
    const bytes=Buffer.from(file.content.replace(/\n/g,''),'base64');
    if(bytes.length>MAX_MANIFEST_BYTES) throw new Error('manifest exceeds static LAB cap');
    return bytes.toString('utf8');
  } finally {clearTimeout(timer);}
}

export async function runStaticLabBenchmark(plansReport,manifestsReport,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=8000,observedAt=new Date().toISOString()}={}){
  const manifestMap=byCandidate(manifestsReport);
  const results=[];
  for(const plan of plansReport?.plans??[]){
    const manifest=manifestMap.get(plan.candidate_id)??null;
    if(!manifest||manifest.status!=='MANIFEST_RESOLVED_STATIC_ONLY'){
      results.push({candidate_id:plan.candidate_id,lab_eval_id:plan.lab_eval_id,status:'BLOCKED_MANIFEST_EVIDENCE_MISSING',external_code_executed:false,prod_authorized:false});
      continue;
    }
    if(plan.external_code_execution_authorized!==false||plan.prod_authorized!==false){
      results.push({candidate_id:plan.candidate_id,lab_eval_id:plan.lab_eval_id,status:'BLOCKED_UNSAFE_PLAN',external_code_executed:false,prod_authorized:false});
      continue;
    }
    try{
      const content=await githubContent(plan.evidence_refs?.upstream_full_name,plan.evidence_refs?.upstream_head_commit,manifest.manifest_path,{token,fetchImpl,timeoutMs});
      const analysis=analyzeStaticLabContent(content,{manifestFlags:manifest.static_flags});
      if(analysis.sha256!==manifest.sha256){
        results.push({candidate_id:plan.candidate_id,lab_eval_id:plan.lab_eval_id,status:'BLOCKED_PROVENANCE_HASH_MISMATCH',expected_sha256:manifest.sha256,observed_sha256:analysis.sha256,external_code_executed:false,prod_authorized:false});
        continue;
      }
      const cases=(plan.test_cases??[]).map((testCase)=>scoreCaseCoverage(content,testCase));
      const coverageScore=cases.length?Number((cases.reduce((sum,item)=>sum+item.score,0)/cases.length).toFixed(2)):0;
      let status='STATIC_LAB_HOLD';
      if(analysis.hard_blocks.length) status='STATIC_LAB_BLOCKED_SECURITY';
      else if(analysis.policy_alignment_score>=90&&coverageScore>=65) status='STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL';
      else if(coverageScore<40) status='STATIC_LAB_REJECT_LOW_COVERAGE';
      results.push({
        candidate_id:plan.candidate_id,
        lab_eval_id:plan.lab_eval_id,
        wrapper_id:plan.wrapper_id,
        domain:plan.domain,
        declared_name:manifest.declared_name??null,
        upstream_full_name:plan.evidence_refs?.upstream_full_name??null,
        upstream_head_commit:plan.evidence_refs?.upstream_head_commit??null,
        manifest_path:manifest.manifest_path,
        manifest_sha256:manifest.sha256,
        status,
        coverage_score:coverageScore,
        policy_alignment_score:analysis.policy_alignment_score,
        hard_blocks:analysis.hard_blocks,
        case_results:cases,
        comparison_status:'BEHAVIORAL_OLD_VS_NEW_NOT_YET_EXECUTED',
        next_action:status==='STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL'?'BEHAVIORAL_LAB_ON_SYNTHETIC_FIXTURES':'HOLD_OR_REVIEW',
        external_code_executed:false,
        instructions_followed:false,
        install_authorized:false,
        prod_authorized:false
      });
    } catch(err){
      results.push({candidate_id:plan.candidate_id,lab_eval_id:plan.lab_eval_id,status:'STATIC_LAB_FETCH_FAILED',error:String(err?.message??err),external_code_executed:false,prod_authorized:false});
    }
  }
  const statusCounts={};
  for(const item of results) statusCounts[item.status]=(statusCounts[item.status]??0)+1;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'STATIC_LAB_INERT_TEXT_ONLY',
    observed_at:observedAt,
    candidates_total:results.length,
    status_counts:statusCounts,
    behavioral_eval_authorized:false,
    external_code_executed:false,
    instructions_followed:false,
    install_authorized:false,
    prod_authorized:false,
    results
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const plans=JSON.parse(fs.readFileSync(argValue('--plans')??'artifacts/cerebro-skill-lab-eval-plans-p0.json','utf8'));
  const manifests=JSON.parse(fs.readFileSync(argValue('--manifests')??'artifacts/cerebro-skill-manifests.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-static-lab-p0.json';
  const report=await runStaticLabBenchmark(plans,manifests);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,candidates_total:report.candidates_total,status_counts:report.status_counts,results:report.results.map((x)=>({candidate_id:x.candidate_id,name:x.declared_name,status:x.status,coverage_score:x.coverage_score,policy_alignment_score:x.policy_alignment_score})),external_code_executed:false,prod_authorized:false}));
}
