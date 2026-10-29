import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildMissionDag, defaultMissionRoots } from './mission-recursive-decomposer-v1.mjs';
import { executeContinuousWork } from './continuous-useful-work-factory-v0.mjs';

const PREPROD='PREPROD';
const OUT_ROOT=path.resolve(process.env.CEREBRO_MISSION_WORK_OUT_DIR||'artifacts/mission-derived-work-v1');
const SCOPE_HYDRATION_BLOCKED=new Set(['design','implement','accept','promote_gate']);
const PERMUTATION_MULTIPLIER=85;

function boundedInteger(raw,label,min,max){const n=Number(raw);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`${label} must be an integer ${min}..${max}`);return n;}
function digest(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function gitFiles(){return execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);}
function safeRead(file,max=350000){try{const s=fs.statSync(file);if(!s.isFile()||s.size>max)return '';return fs.readFileSync(file,'utf8');}catch{return '';}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function phaseOf(unit){return unit.work_unit_id.split('.')[1]||'root';}
function atomOf(unit){return unit.work_unit_id.split('.')[2]||null;}

export function selectMissionUnit(laneRaw,cycleRaw){
  const lane=boundedInteger(laneRaw,'lane',0,67);
  const cycle=boundedInteger(cycleRaw,'cycle',0,999999);
  const graph=buildMissionDag(defaultMissionRoots(),{environment:PREPROD,generated_at:'1970-01-01T00:00:00.000Z'});
  const atomic=graph.units.filter(u=>u.kind==='atomic_work_unit'||u.kind==='capability_work_unit');
  const linear=(cycle*68+lane)%atomic.length;
  const index=(linear*PERMUTATION_MULTIPLIER)%atomic.length;
  return {lane,cycle,linear,index,unit:atomic[index],graph_fingerprint:graph.graph_fingerprint,atomic_count:atomic.length,permutation_multiplier:PERMUTATION_MULTIPLIER};
}

function evidenceTerms(unit){
  const phase=phaseOf(unit);const atom=atomOf(unit)||'';
  const map={scope:['scope','acceptance','objective','constraint'],inventory:['inventory','registry','manifest'],dependencies:['dependency','route','depends'],contracts:['contract','schema','policy'],capabilities:['skill','capability','factory','registry'],design:['design','architecture','adr'],implement:['runtime','worker','implementation'],test:['test','e2e','contract'],evaluate:['evaluation','tribunal','quality'],observe:['observability','metric','log','health'],resilience:['rollback','backup','rebuild','restore'],accept:['acceptance','evidence','old','new'],document:['runbook','changelog','registry','contract'],promote_gate:['preprod','promotion','gate','policy']};
  return [...new Set([...(map[phase]||[]),...atom.split('_').filter(Boolean),unit.mission_id.toLowerCase()])];
}

function inspectRepo(unit){
  const files=gitFiles();const terms=evidenceTerms(unit);const scored=[];
  for(const file of files){
    const lowerPath=file.toLowerCase();let score=terms.filter(t=>lowerPath.includes(t)).length*3;
    let text='';if(score||/cerebro\/(registry|skills|runtime|docs|tests)/.test(file)){text=safeRead(file);const low=text.toLowerCase();score+=terms.filter(t=>low.includes(t)).length;}
    if(score>0)scored.push({path:file,score,bytes:fs.statSync(file).size});
  }
  scored.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  return {repository_file_count:files.length,terms,top_evidence:scored.slice(0,30),evidence_hits:scored.length};
}

function capabilityAudit(unit,repo){
  const atom=atomOf(unit)||'';
  const capability=(unit.capability_required||[])[0]||atom.replace(/^capability_/,'');
  const skillHits=repo.top_evidence.filter(x=>x.path.startsWith('cerebro/skills/'));
  const registryHits=repo.top_evidence.filter(x=>x.path.includes('registry'));
  const state=skillHits.length>=2?'EXISTING_OR_PARTIAL':skillHits.length===1||registryHits.length?'PARTIAL':'MISSING_EVIDENCE';
  const action=atom==='capability_ensure'?(state==='MISSING_EVIDENCE'?'ROUTE_TO_FACTORY':'REUSE_EXISTING'):atom==='capability_unblock'?(state==='MISSING_EVIDENCE'?'WAIT_FOR_FACTORY':'ELIGIBLE_TO_UNBLOCK'):'AUDIT_ONLY';
  return {capability,state,action,skill_hits:skillHits.slice(0,10),registry_hits:registryHits.slice(0,10),additional_cost_eur:0,paid_ai:false};
}

function maybeRunTest(unit){
  const phase=phaseOf(unit);if(phase!=='test')return null;
  const files=gitFiles().filter(f=>/\.test\.mjs$/.test(f));if(!files.length)return {ran:false,reason:'NO_TEST_FILES'};
  const target=files[Number.parseInt(digest(unit.work_unit_id).slice(0,8),16)%files.length];
  const r=spawnSync(process.execPath,['--test',target],{encoding:'utf8',timeout:120000,maxBuffer:1500000});
  return {ran:true,target,passed:r.status===0,exit_code:r.status,stdout_tail:String(r.stdout||'').slice(-2500),stderr_tail:String(r.stderr||'').slice(-2500)};
}

export function executeMissionDerivedWork({lane,cycle,fallback=true}){
  if((process.env.CEREBRO_SUPERVISOR_ENV||PREPROD)!==PREPROD)throw new Error('mission-derived worker is PREPROD-only');
  if(process.env.CEREBRO_ALLOW_PAID_FANOUT==='YES')throw new Error('paid AI is not permitted');
  if(process.env.CEREBRO_PROD_WRITE==='true')throw new Error('PROD writes are not permitted');
  if(process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('Trading access is not permitted');
  const selected=selectMissionUnit(lane,cycle);const unit=selected.unit;const phase=phaseOf(unit);const repo=inspectRepo(unit);
  const hydrationBlocked=SCOPE_HYDRATION_BLOCKED.has(phase)&&String(unit.source_status||'').includes('NOT_EMBEDDED');
  const capability=unit.kind==='capability_work_unit'?capabilityAudit(unit,repo):null;
  const test=hydrationBlocked?null:maybeRunTest(unit);
  const state=hydrationBlocked?'SCOPE_HYDRATION_REQUIRED':(test?.ran&&test.passed===false?'FAILED_TEST':'EVIDENCE_COLLECTED');
  const report={schema_version:'1.0',generated_at:new Date().toISOString(),company_id:unit.company_id,engine_id:'JOB-001',environment:PREPROD,version:'mission-derived-useful-work-v1',lane:selected.lane,cycle:selected.cycle,linear:selected.linear,selection_index:selected.index,selection_permutation:selected.permutation_multiplier,source:'MISSION_DAG_V1',graph_fingerprint:selected.graph_fingerprint,atomic_count:selected.atomic_count,work_unit:unit,phase,atom:atomOf(unit),execution_state:state,repo_evidence:repo,capability,test_result:test,idempotency_key:unit.idempotency_key,source_fingerprint:unit.source_fingerprint,useful_work:true,scope_hydration_required:hydrationBlocked,paid_ai_used:false,additional_subscription_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  const out=path.join(OUT_ROOT,`lane-${String(selected.lane).padStart(2,'0')}`,`cycle-${String(selected.cycle).padStart(6,'0')}-${unit.work_unit_id.replaceAll('.','_')}.json`);writeJson(out,report);
  if(fallback&&state==='SCOPE_HYDRATION_REQUIRED'){
    const legacy=executeContinuousWork({lane:selected.lane,cycle:selected.cycle});
    report.fallback={used:true,source:'continuous-useful-work-factory-v0',task_key:legacy.task.task_key,selected_file_count:legacy.selected_file_count};writeJson(out,report);
  }else report.fallback={used:false};
  return report;
}

async function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,v='true']=a.replace(/^--/,'').split('=');return[k,v];}));const r=executeMissionDerivedWork({lane:args.lane,cycle:args.cycle,fallback:args.fallback!=='false'});console.log(JSON.stringify({ok:true,lane:r.lane,cycle:r.cycle,work_unit_id:r.work_unit.work_unit_id,mission_id:r.work_unit.mission_id,phase:r.phase,state:r.execution_state,capability_action:r.capability?.action||null,fallback:r.fallback?.used||false,paid_ai_used:false,prod_write_authorized:false,trading_access:false}));}
const self=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);if(self)main().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1;});
