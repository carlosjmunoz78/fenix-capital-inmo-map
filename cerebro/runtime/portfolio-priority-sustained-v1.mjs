import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const PREPROD='PREPROD';
const MAX_LANES=282;
const BASE_LANES=182;
const OUT_ROOT=path.resolve(process.env.CEREBRO_PORTFOLIO_SUSTAINED_OUT_DIR||'artifacts/portfolio-priority-sustained-v1');

const BLOCKS=Object.freeze({
  W00:{title:'Live-state freeze and evidence inventory',priority:'P3',terms:['inventory','state','evidence','registry']},
  W01:{title:'CEREBRO Browser primary web operating surface',priority:'P1',terms:['browser','bridge','session']},
  W02:{title:'Universal browser extension',priority:'P1',terms:['extension','chromium']},
  W03:{title:'Universal PC control plane',priority:'P1',terms:['pc','computer','device']},
  W04:{title:'Universal Mobile Jarvis',priority:'P1',terms:['mobile','android','ios']},
  W05:{title:'Notification and event fabric',priority:'P1',terms:['notification','event','outbox']},
  W06:{title:'Identity multi-account credential control',priority:'P1',terms:['iam','vault','credential','identity']},
  W07:{title:'Social Department reference architecture',priority:'P3',terms:['social','facebook']},
  W08:{title:'Clone social pattern to relevant networks',priority:'P3',terms:['instagram','linkedin','tiktok','youtube','pinterest']},
  W09:{title:'SEO department restructuring',priority:'P3',terms:['seo','search-console']},
  W10:{title:'Agent and subagent knowledge bootstrap',priority:'P0',terms:['knowledge','agent','subagent']},
  W11:{title:'Agent Skill Engine catalogue reconciliation',priority:'P0',terms:['registry','skill','engine','capability']},
  W12:{title:'App Fenix integration audit and repair',priority:'P3',terms:['app','fenix','crm']},
  W13:{title:'CEREBRO Console Jarvis interface',priority:'P0',terms:['console','jarvis','gateway','operativa']},
  W14:{title:'Jarvis identity personality voice',priority:'P1',terms:['voice','tts','stt','persona']},
  W15:{title:'Context memory knowledge continuity',priority:'P0',terms:['memory','context','knowledge']},
  W16:{title:'Model Execution Router',priority:'P0',terms:['router','model','provider']},
  W17:{title:'Learning RSI Factory closure',priority:'P3',terms:['learning','rsi','factory','tribunal']},
  W18:{title:'Cross-system Browser procedures',priority:'P1',terms:['procedure','browser']},
  W19:{title:'Security audit rollback kill switches',priority:'P1',terms:['security','rollback','kill','audit']},
  W20:{title:'E2E acceptance matrix',priority:'P1',terms:['e2e','acceptance','playwright']},
  W21:{title:'CEREBRO interface completion JARVIS View 0',priority:'P0',terms:['jarvis','console','neural','work','interface']},
  W22:{title:'APPFACT-001 autonomous app factory',priority:'P2',terms:['appfact','digital-build','factory']},
  W23:{title:'ZEUS Control Map route registry',priority:'P3',terms:['zeus','map','route','resolver']},
  W24:{title:'ZEUS Living Project',priority:'P3',terms:['zeus','living','project','timeline']},
});

function repeat(id,n){return Array.from({length:n},()=>id)}
const BASE_ASSIGNMENT=Object.freeze([
  ...repeat('W13',24),...repeat('W21',24),
  ...repeat('W10',14),...repeat('W11',14),...repeat('W15',14),...repeat('W16',14),
  ...repeat('W01',6),...repeat('W02',6),...repeat('W03',6),...repeat('W04',6),...repeat('W05',6),...repeat('W06',6),...repeat('W14',6),...repeat('W18',6),...repeat('W19',6),...repeat('W20',6),
  ...repeat('W22',8),
  'W00','W07','W08','W09','W12','W17','W23','W24','W09','W12',
]);
const LOAN_PATTERN=Object.freeze(['W13','W21','W01','W18','W10','W11','W15','W16','W22','W03']);
const FULL_ASSIGNMENT=Object.freeze([...BASE_ASSIGNMENT,...Array.from({length:100},(_,i)=>LOAN_PATTERN[i%LOAN_PATTERN.length])]);
if(BASE_ASSIGNMENT.length!==BASE_LANES||FULL_ASSIGNMENT.length!==MAX_LANES)throw new Error(`invalid lane topology ${BASE_ASSIGNMENT.length}/${FULL_ASSIGNMENT.length}`);

const MODES=Object.freeze(['COVERAGE','DEBT','TEST','DEPENDENCY','CONTRACT','DOCS','QUALITY','E2E']);
function bounded(raw,label,min,max){const n=Number(raw);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`${label} must be ${min}..${max}`);return n}
function hashMod(text,mod){const d=crypto.createHash('sha256').update(String(text)).digest();return d.readUInt32BE(0)%mod}
function gitFiles(){return execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean)}
function safeRead(file,max=500000){try{const s=fs.statSync(file);if(!s.isFile()||s.size>max)return '';return fs.readFileSync(file,'utf8')}catch{return ''}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8')}

export function laneDescriptor(laneRaw,cycleRaw){
  const lane=bounded(laneRaw,'lane',0,MAX_LANES-1);const cycle=bounded(cycleRaw,'cycle',0,999999);
  const block_id=FULL_ASSIGNMENT[lane];const block=BLOCKS[block_id];
  const blockLanes=FULL_ASSIGNMENT.map((x,i)=>x===block_id?i:null).filter(x=>x!==null);
  const block_ordinal=blockLanes.indexOf(lane);const block_lane_count=blockLanes.length;
  const mode=MODES[(cycle+block_ordinal)%MODES.length];
  return Object.freeze({lane,cycle,block_id,block_title:block.title,priority:block.priority,terms:[...block.terms],block_ordinal,block_lane_count,loan_lane:lane>=BASE_LANES,mode});
}

function selectFiles(files,d){
  const hits=files.filter(f=>d.terms.some(t=>f.toLowerCase().includes(t.toLowerCase())));
  const sharded=hits.filter((_,i)=>i%d.block_lane_count===d.block_ordinal);
  if(sharded.length)return sharded.slice(0,100);
  return files.filter(f=>hashMod(f,MAX_LANES)===d.lane).slice(0,80);
}
function inspect(selected,d){
  let debt=0,matched=0,docs=0,tests=0;const findings=[];
  for(const file of selected){const text=safeRead(file);const lower=text.toLowerCase();const terms=d.terms.filter(t=>lower.includes(t.toLowerCase())||file.toLowerCase().includes(t.toLowerCase()));const marks=text.match(/\b(TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED|PENDING)\b/gi)||[];debt+=marks.length;if(terms.length)matched++;if(/(?:readme|runbook|changelog|contract|manifest)/i.test(file))docs++;if(/\.test\.[cm]?[jt]sx?$/.test(file))tests++;findings.push({path:file,matched_terms:[...new Set(terms)],debt_markers:marks.length});}
  return {debt,matched,docs,tests,findings};
}
function runTest(files,d){
  if(d.mode!=='TEST'&&d.mode!=='E2E')return null;
  const all=files.filter(f=>/\.test\.mjs$/.test(f));if(!all.length)return null;
  const owned=all.filter(f=>hashMod(f,MAX_LANES)===d.lane);const pool=owned.length?owned:all;
  const target=pool[(d.cycle+d.block_ordinal)%pool.length];
  const r=spawnSync(process.execPath,['--test',target],{encoding:'utf8',timeout:120000,maxBuffer:1500000});
  return {target,passed:r.status===0,exit_code:r.status,signal:r.signal||null,stdout_tail:String(r.stdout||'').slice(-2000),stderr_tail:String(r.stderr||'').slice(-2000)};
}

export function executePortfolioPriorityUnit({lane,cycle,slot=0}){
  if((process.env.CEREBRO_SUPERVISOR_ENV||PREPROD)!==PREPROD)throw new Error('PREPROD only');
  if(process.env.CEREBRO_ALLOW_PAID_FANOUT==='YES')throw new Error('paid AI forbidden');
  if(process.env.CEREBRO_PROD_WRITE==='true')throw new Error('PROD writes forbidden');
  if(process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('Trading forbidden');
  const execution_slot=bounded(slot,'slot',0,3);
  const evidence_write_mode=process.env.CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE||'cycle';
  if(!['cycle','rolling'].includes(evidence_write_mode))throw new Error('CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE must be cycle or rolling');
  const task=laneDescriptor(lane,cycle);const files=gitFiles();const selected=selectFiles(files,task);const scan=inspect(selected,task);const test_result=runTest(files,task);
  const report=Object.freeze({schema_version:'1.1',generated_at:new Date().toISOString(),company_id:'fenix',engine_id:'JOB-001',environment:PREPROD,version:'portfolio-priority-sustained-v1',execution_slot,evidence_write_mode,task,repository_file_count:files.length,selected_file_count:selected.length,matched_file_count:scan.matched,debt_marker_count:scan.debt,doc_file_count:scan.docs,test_file_count:scan.tests,findings:scan.findings,test_result,useful_work:true,implementation_claim:false,paid_ai_used:false,additional_subscription_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,next_cycle:task.cycle===999999?0:task.cycle+1});
  const laneDir=path.join(OUT_ROOT,`lane-${String(task.lane).padStart(3,'0')}`);
  const out=evidence_write_mode==='rolling'?path.join(laneDir,`slot-${execution_slot}.json`):path.join(laneDir,`cycle-${String(task.cycle).padStart(6,'0')}.json`);
  writeJson(out,report);return report;
}

async function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,v='true']=a.replace(/^--/,'').split('=');return[k,v]}));const r=executePortfolioPriorityUnit({lane:args.lane,cycle:args.cycle,slot:args.slot??0});console.log(JSON.stringify({ok:true,lane:r.task.lane,cycle:r.task.cycle,slot:r.execution_slot,block:r.task.block_id,priority:r.task.priority,mode:r.task.mode,loan_lane:r.task.loan_lane,selected:r.selected_file_count,debt:r.debt_marker_count,test_passed:r.test_result?.passed??null,next_cycle:r.next_cycle,evidence_write_mode:r.evidence_write_mode,implementation_claim:false}))}
const self=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);if(self)main().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1});
