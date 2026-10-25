import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir=path.resolve(process.env.BM11_OUT??'ums-bm11-thousand-shot');
const simulationPath=path.join(outDir,'bm11-simulation.json');
const sim=JSON.parse(fs.readFileSync(simulationPath,'utf8'));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const eventsPath=path.join(outDir,sim.artifacts.events.path);
const finalStatePath=path.join(outDir,sim.artifacts.final_state.path);
const phase1Path=path.join(outDir,sim.resume.phase1_state_path);
const events=fs.readFileSync(eventsPath,'utf8').trim().split(/\n/).filter(Boolean).map(JSON.parse);
const finalState=JSON.parse(fs.readFileSync(finalStatePath,'utf8'));
const phase1=JSON.parse(fs.readFileSync(phase1Path,'utf8'));
const shots=sim.outputs;
const completedEvents=events.filter(e=>e.type==='SHOT_COMPLETED');
const failedEvents=events.filter(e=>e.type==='SHOT_FAILED_RETRYABLE');
const resumes=events.filter(e=>e.type==='RESUME_FROM_CHECKPOINT');
const completedByShot=new Map(); for(const e of completedEvents) completedByShot.set(e.shot_id,(completedByShot.get(e.shot_id)||0)+1);
const expectedFailureIds=Array.from({length:Math.floor(1000/37)},(_,i)=>`SHT-${String((i+1)*37).padStart(4,'0')}`);
const actualFailureIds=[...new Set(failedEvents.map(e=>e.shot_id))].sort();
const deterministicOutputs=shots.every(s=>s.output_hash===sha(JSON.stringify({shot_id:s.shot_id,payload_hash:s.payload_hash,render_contract:'BM11_SIMULATED_RENDER_V1'})));
const checks={
  contract:sim.state_type==='CEREBRO_UMS_BM11_THOUSAND_SHOT_SIMULATION_V1'&&sim.benchmark_id==='BM-11',
  thousand_shots:sim.plan.shots===1000&&shots.length===1000&&new Set(shots.map(s=>s.shot_id)).size===1000,
  hierarchy:sim.plan.sequences===10&&sim.plan.scenes===100&&sim.plan.frames_per_shot===24,
  worker_pool:sim.plan.workers===12&&new Set(shots.map(s=>s.worker_id)).size===12,
  phase1_boundary:phase1.completed_count===420&&sim.resume.completed_before_resume===420&&sim.resume.phase1_target===420,
  phase1_hash:sha(fs.readFileSync(phase1Path))===sim.resume.phase1_state_sha256,
  resume_event:resumes.length===1&&resumes[0].completed_before_resume===420&&resumes[0].phase1_state_sha256===sim.resume.phase1_state_sha256,
  all_done:sim.results.completed_count===1000&&sim.results.all_done===true&&shots.every(s=>s.status==='DONE'),
  exactly_once:sim.results.exactly_once===true&&completedEvents.length===1000&&shots.every(s=>s.completion_count===1)&&[...completedByShot.values()].every(n=>n===1),
  retry_injection:sim.results.retryable_failures===27&&sim.results.shots_with_retry===27&&actualFailureIds.length===27&&expectedFailureIds.every(x=>actualFailureIds.includes(x)),
  retry_recovered:expectedFailureIds.every(id=>{const s=shots.find(x=>x.shot_id===id);return s&&s.attempts===2&&s.status==='DONE';}),
  nonfailed_single_attempt:shots.filter(s=>!expectedFailureIds.includes(s.shot_id)).every(s=>s.attempts===1),
  deterministic_output_hashes:deterministicOutputs&&sim.results.unique_output_hashes===1000,
  checkpoints:sim.results.checkpoint_count>=10&&finalState.checkpoints.length===sim.results.checkpoint_count,
  events_hash:sha(fs.readFileSync(eventsPath))===sim.artifacts.events.sha256,
  final_state_hash:sha(fs.readFileSync(finalStatePath))===sim.artifacts.final_state.sha256,
  cost_telemetry:sim.telemetry.total_cost_eur===0&&sim.telemetry.per_shot_cost_eur===0&&shots.every(s=>s.cost_eur===0),
  no_external_effects:sim.telemetry.paid_api_calls===0&&sim.telemetry.external_side_effects===false,
  no_prod_authority:sim.authority.prod_authorized===false&&sim.authority.spend_authorized===false&&sim.authority.additional_cost_eur===0,
};
const passed=Object.values(checks).every(Boolean);
const proof={schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM11_THOUSAND_SHOT_PROOF_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',benchmark_id:'BM-11',proof_type:'THOUSAND_SHOT_RESUMABLE_SCHEDULING_AND_COST_TELEMETRY_PROOF',status:passed?'PASS_WITH_EVIDENCE':'FAIL_CLOSED',benchmark_credit:passed,checks,metrics:{shots:shots.length,completed_events:completedEvents.length,retryable_failures:failedEvents.length,checkpoints:sim.results.checkpoint_count,workers:new Set(shots.map(s=>s.worker_id)).size,unique_output_hashes:sim.results.unique_output_hashes,completed_before_resume:sim.resume.completed_before_resume,total_cost_eur:sim.telemetry.total_cost_eur,logical_steps:sim.telemetry.logical_steps,wall_clock_ms:sim.telemetry.wall_clock_ms},simulation_sha256:sha(fs.readFileSync(simulationPath)),github_run_id:process.env.GITHUB_RUN_ID??null,github_sha:process.env.GITHUB_SHA??null,readiness_mutation_authorized:false,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0};
fs.writeFileSync(path.join(outDir,'bm11-pass-with-evidence.json'),JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof,null,2));
if(!passed) process.exit(14);
