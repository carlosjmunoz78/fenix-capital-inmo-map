#!/usr/bin/env node
/** JARVIS CUT37 - autonomous governed LAB loop.
 * Each job reserves its maximum possible spending BEFORE DeepSeek requests.
 * Git commit+push is the durable budget checkpoint (fail closed on conflict).
 * The workflow, not this module, self-dispatches only after a successful settle.
 */
import {readFileSync,writeFileSync,renameSync,mkdirSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {executeStudy} from './jarvis-deepseek-study-lab.mjs';
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const ledgerPath='zeus/jarvis/state/jarvis-deepseek-autonomy-ledger-v1.json';
const absoluteLedger=join(root,ledgerPath);
const branch='cerebro/jarvis-deepseek-weekend-lab-20261106';
const cap=40,cycleEnvelope=0.15;
const runId=process.env.GITHUB_RUN_ID;
const dir=resolve(process.env.JARVIS_LAB_STUDY_OUTPUT_DIR||'/tmp/jarvis-lab-dialogue');
const planPath=join(dir,'cut37-run-plan.json');
const round=x=>Math.round(x*1e9)/1e9;
function requireEnvironment(){
 const e=process.env;
 if(e.JARVIS_LAB_AUTONOMY_ENABLE!=='YES'||
  e.GITHUB_REF!=='refs/heads/'+branch||
  e.GITHUB_REPOSITORY!=='carlosjmunoz78/fenix-capital-inmo-map'||
  !['push','workflow_dispatch'].includes(e.GITHUB_EVENT_NAME)||
  e.GITHUB_RUN_ATTEMPT!=='1'||!/^[0-9]{6,20}$/.test(String(runId))||
  !e.DEEPSEEK_API_KEY||e.DEEPSEEK_API_KEY.length<16)
  throw Error('AUTONOMY_BRANCH_OR_SECRET_GATE');
}
function readLedger(){
 const s=JSON.parse(readFileSync(absoluteLedger,'utf8'));
 if(s.schema!=='jarvis.deepseek.autonomy.ledger.v1'||s.environment!=='LAB'||
  s.company_id!=='fenix'||s.engine_id!=='JARVIS'||
  s.owner_permission_eur!==50||s.lifetime_guard_usd!==40||
  s.model!=='deepseek-flash'||s.synthetic_only!==true||
  s.production_mutation!==false||s.auto_recharge!==false||s.auto_promote!==false||
  !Number.isFinite(s.spent_estimate_usd)||s.spent_estimate_usd<0||s.spent_estimate_usd>40||
  !Number.isSafeInteger(s.cycle_cursor)||s.cycle_cursor<0||
  !Number.isSafeInteger(s.calls_completed)||s.calls_completed<0)
   throw Error('LEDGER_INVALID_FAIL_CLOSED');
 return s;
}
function persist(s){
 const tmp=absoluteLedger+'.pending';
 writeFileSync(tmp,JSON.stringify(s,null,2)+'\n',{mode:0o600});
 renameSync(tmp,absoluteLedger);
}
function gitSave(message){
 const opts={cwd:root,stdio:'pipe',encoding:'utf8',timeout:30000};
 execFileSync('git',['config','user.name','JARVIS LAB Ledger'],opts);
 execFileSync('git',['config','user.email','jarvis-lab-ledger@users.noreply.github.com'],opts);
 execFileSync('git',['add','--',ledgerPath],opts);
 execFileSync('git',['commit','-m',message,'--',ledgerPath],opts);
 execFileSync('git',['push','origin','HEAD:refs/heads/'+branch],opts);
}
function savePlan(plan){mkdirSync(dir,{recursive:true,mode:0o700});writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n',{mode:0o600})}
function loadPlan(){
 const p=JSON.parse(readFileSync(planPath,'utf8'));
 if(p.run_id!==runId||p.environment!=='LAB')throw Error('PLAN_RUN_ID_MISMATCH');
 return p;
}
function chooseCycles(s){
 // A PAUSED / RESERVED / failed-state ledger must never advertise runnable cycles.
 if(s.status!=='ACTIVE')return 0;
 const remain=round(cap-s.spent_estimate_usd);
 if(remain<cycleEnvelope)return 0;
 const ramp=s.completed_batches===0?1:s.completed_batches<4?3:12;
 return Math.min(ramp,Math.floor((remain+1e-10)/cycleEnvelope));
}
function prepare(){
 requireEnvironment();
 const s=readLedger();
 if(s.pending)throw Error('PENDING_BUDGET_RESERVATION_NEEDS_RECONCILIATION');
 if(s.status==='LIMIT_REACHED'||s.status==='PAUSED'){
  savePlan({run_id:runId,environment:'LAB',cycles:0,reserved_usd:0,cursor:s.cycle_cursor});
  console.log('JARVIS_CONTINUOUS_STOP '+s.status);return;
 }
 if(s.status!=='ACTIVE')throw Error('AUTONOMY_STATUS_NOT_ACTIVE');
 const cycles=chooseCycles(s);
 if(cycles===0){
  s.status='LIMIT_REACHED';s.halt_reason='MONEY_LIMIT';
  persist(s);gitSave('chore(jarvis): CUT37 cumulative budget reached - stop autonomous LAB');
  savePlan({run_id:runId,environment:'LAB',cycles:0,reserved_usd:0,cursor:s.cycle_cursor});
  return;
 }
 const reserve=round(cycles*cycleEnvelope);
 if(s.spent_estimate_usd+reserve>cap+1e-8)throw Error('CUMULATIVE_RESERVATION_LIMIT');
 s.status='RESERVED';
 s.pending={run_id:runId,cursor:s.cycle_cursor,cycles,reserved_usd:reserve,
  reason:'PREPAID_ENVELOPE_NO_REFUND_ON_FAILURE'};
 persist(s);
 // No paid request may happen before this commit and push succeed.
 gitSave('chore(jarvis): CUT37 reserve LAB DeepSeek budget for run '+runId);
 savePlan({run_id:runId,environment:'LAB',cycles,reserved_usd:reserve,cursor:s.cycle_cursor});
 console.log('JARVIS_BUDGET_RESERVED '+JSON.stringify({cycles,reserve_usd:reserve,cumulative_cap_usd:cap}));
}
async function execute(){
 requireEnvironment();
 const plan=loadPlan();
 if(plan.cycles===0)return console.log('JARVIS_STUDY_NOOP_LIMIT_REACHED');
 const s=readLedger();
 if(s.status!=='RESERVED'||s.pending?.run_id!==runId||
  s.pending.reserved_usd!==plan.reserved_usd||
  s.pending.cursor!==plan.cursor)throw Error('NO_DURABLE_RESERVATION');
 for(let i=0;i<plan.cycles;i++){
  const cycle=plan.cursor+i;
  const reportId=String(runId)+String(i).padStart(2,'0');
  const env={...process.env,JARVIS_LAB_CONTINUOUS_MODE:'YES',
   JARVIS_LAB_STUDY_APPROVED:'YES',
   JARVIS_LAB_STUDY_CYCLE:String(cycle),
   JARVIS_LAB_STUDY_REPORT_ID:reportId,
   JARVIS_LAB_STUDY_OUTPUT_DIR:dir};
  const out=await executeStudy({env});
  if(out.status!=='STUDY_CANDIDATES_ONLY'||out.scenarios!==6||out.calls!==12||
   out.usd_peak_estimate>cycleEnvelope)throw Error('STUDY_INCOMPLETE_STOP');
  console.log('JARVIS_AUTONOMY_CYCLE '+JSON.stringify({cycle,
   cases:out.scenarios,calls:out.calls,estimate_usd:out.usd_peak_estimate}));
 }
}
function settle(){
 requireEnvironment();
 const p=loadPlan();if(p.cycles===0)return writeDecision(false,'LIMIT_REACHED');
 const s=readLedger();
 if(s.status!=='RESERVED'||s.pending?.run_id!==runId)throw Error('SETTLE_RESERVATION_MISSING');
 let spent=0,valid=0,count=0,calls=0;
 for(let i=0;i<p.cycles;i++){
  const reportId=String(runId)+String(i).padStart(2,'0');
  const report=JSON.parse(readFileSync(join(dir,'jarvis-study-'+reportId+'.json'),'utf8'));
  if(report.environment!=='LAB'||report.model!=='deepseek-flash'||
    report.cases_attempted!==6||report.calls!==12||
    report.auto_promote!==false||report.prod_authorized!==false||
    !Number.isFinite(report.usd_peak_estimate)||report.usd_peak_estimate<0||
    report.usd_peak_estimate>cycleEnvelope)throw Error('REPORT_INVALID');
  spent+=report.usd_peak_estimate;calls+=report.calls;
  for(const row of report.rows){count++;if(row.structurally_valid===true)valid++}
 }
 if(count!==p.cycles*6||calls!==p.cycles*12||
   spent>p.reserved_usd+1e-8)throw Error('SPEND_OR_COMPLETENESS_MISMATCH');
 s.spent_estimate_usd=round(s.spent_estimate_usd+spent);
 s.cycle_cursor+=p.cycles;s.completed_batches++;
 s.calls_completed+=calls;s.scenarios_completed+=count;
 s.last_completed_run_id=String(runId);s.last_run_estimate_usd=round(spent);
 s.last_run_structural_pass_rate=round(valid/count);
 s.pending=null;
 s.status=s.last_run_structural_pass_rate<0.50?'QUALITY_HALT':
   cap-s.spent_estimate_usd<cycleEnvelope?'LIMIT_REACHED':'ACTIVE';
 s.halt_reason=s.status==='QUALITY_HALT'?'LESS_THAN_HALF_VALID':
   s.status==='LIMIT_REACHED'?'MONEY_LIMIT':null;
 persist(s);
 gitSave('chore(jarvis): CUT37 settle verified LAB spending for run '+runId);
 console.log('JARVIS_CUMULATIVE_LEDGER '+JSON.stringify({estimated_spent_usd:s.spent_estimate_usd,
  cap_usd:cap,cycles:s.cycle_cursor,calls:s.calls_completed,
  structural_pass_rate:s.last_run_structural_pass_rate,state:s.status}));
 writeDecision(s.status==='ACTIVE',s.status);
}
function writeDecision(yes,status){
 if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,
  'continue_next='+String(yes)+'\n',{flag:'a'});
 console.log('JARVIS_CHAIN_DECISION '+JSON.stringify({continue_next:yes,status}));
}
const mode=process.argv[2]||'--dry-run';
if(mode==='--dry-run')console.log('JARVIS_AUTONOMY_DRY_RUN '+JSON.stringify({
 state:readLedger().status,cycles_next:chooseCycles(readLedger()),
 cap_usd:cap,owner_permission_eur:50,only_lab:true}));
else if(mode==='--reserve')prepare();
else if(mode==='--execute')await execute();
else if(mode==='--settle')settle();
else throw Error('UNKNOWN_COMMAND');
