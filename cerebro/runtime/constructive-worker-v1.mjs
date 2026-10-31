import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PREPROD='PREPROD';
const ROOT=process.cwd();
const OUT=path.resolve(process.env.CEREBRO_CONSTRUCTIVE_OUT_DIR||'artifacts/constructive-worker-v1');

function safeInt(raw,label,min,max){const n=Number(raw);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`${label} must be ${min}..${max}`);return n;}
function run(cmd,args,opts={}){const r=spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',timeout:opts.timeout||120000,maxBuffer:2000000});return {ok:r.status===0,status:r.status,stdout:String(r.stdout||'').slice(-5000),stderr:String(r.stderr||'').slice(-5000)};}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

const TARGETS=[
  {id:'tests',label:'Repair failing Node tests',command:()=>run(process.execPath,['--test'],{timeout:240000})},
  {id:'lint',label:'Validate package scripts and syntax',command:()=>run('npm',['test','--','--runInBand'],{timeout:240000})},
  {id:'contracts',label:'Run CEREBRO contract tests',command:()=>run(process.execPath,['--test','cerebro/tests'],{timeout:240000})},
  {id:'factory',label:'Validate Engine Factory tests',command:()=>run(process.execPath,['--test','cerebro/tests'],{timeout:240000})}
];

export function executeConstructiveUnit({lane,cycle,slot=0}){
  if((process.env.CEREBRO_SUPERVISOR_ENV||PREPROD)!==PREPROD)throw new Error('PREPROD only');
  if(process.env.CEREBRO_ALLOW_PAID_FANOUT==='YES')throw new Error('paid fanout forbidden');
  if(process.env.CEREBRO_PROD_WRITE==='true')throw new Error('PROD write forbidden');
  if(process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('Trading forbidden');
  const l=safeInt(lane,'lane',0,63), c=safeInt(cycle,'cycle',0,999999), s=safeInt(slot,'slot',0,3);
  const target=TARGETS[(l+c+s)%TARGETS.length];
  const result=target.command();
  const report={schema_version:'1.0',generated_at:new Date().toISOString(),company_id:'fenix',engine_id:'FACT-001',environment:PREPROD,version:'constructive-worker-v1',lane:l,cycle:c,slot:s,target:target.id,target_label:target.label,passed:result.ok,exit_code:result.status,stdout_tail:result.stdout,stderr_tail:result.stderr,constructive_mode:true,implementation_claim:false,prod_write:false,trading:false,additional_cost_eur:0};
  const file=path.join(OUT,`lane-${String(l).padStart(2,'0')}`,`slot-${s}.json`);writeJson(file,report);return report;
}

async function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,v='true']=a.replace(/^--/,'').split('=');return[k,v]}));const r=executeConstructiveUnit({lane:args.lane,cycle:args.cycle,slot:args.slot??0});console.log(JSON.stringify({ok:r.passed,lane:r.lane,cycle:r.cycle,slot:r.slot,target:r.target,exit_code:r.exit_code,prod_write:false,trading:false}));if(!r.passed)process.exitCode=1;}
const self=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname);if(self)main().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1});
