import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {getJobRuntimeV1} from './job001-runtime-v1.mjs';
import {JarvisMissionJob001SourceV1,jarvisMissionJob001ContextV1} from './jarvis-mission-job001-adapter-v1.mjs';
import {buildJarvisDag} from './jarvis-mission-dag-v2.mjs';

const PREPROD='PREPROD';
const OUT=process.env.JARVIS_EXEC_OUT||'artifacts/jarvis-mission-001-exec';
const LEDGER=process.env.CEREBRO_JOB001_LEDGER_FILE||'cerebro/jarvis/mission-001/runtime/job001-ledger.v1.json';
const worker=process.env.JARVIS_WORKER_ID||`gha-${process.env.GITHUB_RUN_ID||'local'}-${process.env.GITHUB_RUN_ATTEMPT||'0'}`;
function write(name,value){fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');}
function exists(p){return fs.existsSync(path.resolve(p));}
function runTest(file){try{execFileSync(process.execPath,['--test',file],{stdio:'pipe',timeout:120000});return{ok:true,file};}catch(e){return{ok:false,file,error:String(e.stderr||e.message).slice(0,2000)};}}
function evidenceFor(unit){const files=[];const add=p=>{if(exists(p))files.push(p);};add('cerebro/jarvis/mission-001/mission-manifest.v1.json');add('cerebro/jarvis/mission-001/JARVIS_MASTER_V1_RC2_2026-10-30.md.gz.b64');
 const tests=[];const id=unit.work_unit_id;
 if(/IDENTITY|CONSTITUTION|AUTHORITY|CONTEXT_COMPILER|IFC_SECURITY|VERIFIER_EVALUATION/.test(id)){add('cerebro/jarvis/core-v1/core-v1.mjs');tests.push(runTest('cerebro/tests/jarvis-core-v1.test.mjs'));}
 if(/WORLD_MEMORY_ACCESS/.test(id)){add('cerebro/jarvis/core-v1/memory-v1.mjs');add('cerebro/jarvis/core-v1/world-model-access-v1.mjs');tests.push(runTest('cerebro/tests/jarvis-state-fabric-v1.test.mjs'));}
 if(/ORCHESTRATOR|EVENT_EXECUTION_JOURNAL/.test(id)){add('cerebro/runtime/job001-runtime-v1.mjs');add('cerebro/runtime/jarvis-mission-job001-adapter-v1.mjs');tests.push(runTest('cerebro/tests/job001-runtime-v1.test.mjs'));tests.push(runTest('cerebro/tests/jarvis-mission-job001-adapter-v1.test.mjs'));}
 if(/CAPABILITY_FABRIC/.test(id)){add('cerebro/jarvis/core-v1/core-v1.mjs');add('cerebro/jarvis/mission-001/state.v1.json');}
 const testOk=tests.every(t=>t.ok);
 return{schema_version:'1.0',mission_id:'MISSION-JARVIS-001',work_unit_id:id,wave:unit.wave,phase:unit.phase||unit.kind,generated_at:new Date().toISOString(),files,test_results:tests,verified:testOk&&files.length>0,prod_write:false,trading:false};}

export function executeCycle({wave=0,maxUnits=8}={}){if((process.env.CEREBRO_SUPERVISOR_ENV||PREPROD)!==PREPROD)throw new Error('PREPROD_ONLY');if(process.env.CEREBRO_PROD_WRITE==='true')throw new Error('PROD_WRITE_DENIED');if(process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('TRADING_DENIED');const dag=buildJarvisDag();const runtime=getJobRuntimeV1({ledgerFile:LEDGER});const context=jarvisMissionJob001ContextV1();const source=new JarvisMissionJob001SourceV1({job_runtime:runtime,context,wave,target_active:Math.min(8,maxUnits),max_enqueue_per_reconcile:Math.min(8,maxUnits),dag});const before=source.reconcile();let completed=0,blocked=0;for(let i=0;i<maxUnits;i++){const job=runtime.leaseJob({workerId:worker,companyId:context.company_id,engineId:context.engine_id,environment:context.environment,version:context.version,leaseSeconds:420});if(!job)break;if(job.payload.wave!==wave){runtime.failJob({jobId:job.job_id,workerId:worker,error:'WAVE_MISMATCH',terminal:false});break;}const unit=dag.units.find(u=>u.work_unit_id===job.payload.work_unit_id);if(!unit){runtime.failJob({jobId:job.job_id,workerId:worker,error:'WORK_UNIT_NOT_FOUND',terminal:true});blocked++;continue;}
   if(unit.kind==='task' && Number(unit.wave)>=24){runtime.failJob({jobId:job.job_id,workerId:worker,error:'WAITING_SPECIALIZED_BUILD_EXECUTOR',terminal:false});blocked++;break;}
   const ev=evidenceFor(unit);const file=`${unit.work_unit_id.replace(/[^a-zA-Z0-9_-]+/g,'_')}.json`;write(file,ev);if(!ev.verified){runtime.failJob({jobId:job.job_id,workerId:worker,error:'EVIDENCE_NOT_VERIFIED',terminal:false});blocked++;break;}runtime.completeJob({jobId:job.job_id,workerId:worker,result:{status:'SUCCEEDED',evidence:[`${OUT}/${file}`],prod_write:false,trading:false}});completed++;}
 const after=source.snapshot();const all=runtime.listForContext(context).filter(j=>j.payload?.mission_id==='MISSION-JARVIS-001'&&j.payload?.wave===wave);const waveDone=all.length===after.total_units_in_wave&&all.every(j=>j.status==='SUCCEEDED');const nextWave=waveDone?[...new Set(dag.units.map(u=>u.wave))].sort((a,b)=>a-b).find(w=>w>wave)??null:wave;const summary={ok:true,mission_id:'MISSION-JARVIS-001',environment:PREPROD,wave,completed,blocked,wave_done:waveDone,next_wave:nextWave,job001:runtime.summary(),source_before:before,source_after:after,human_required:false,prod_write:false,trading:false};write('summary.json',summary);console.log(JSON.stringify(summary));return summary;}
if(import.meta.url===`file://${process.argv[1]}`){const args=Object.fromEntries(process.argv.slice(2).map(x=>{const[k,v='true']=x.replace(/^--/,'').split('=');return[k,v];}));executeCycle({wave:Number(args.wave||0),maxUnits:Math.max(1,Math.min(8,Number(args.max_units||8)))});}
