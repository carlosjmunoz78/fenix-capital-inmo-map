import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const environment=String(process.env.CEREBRO_ENVIRONMENT??'PREPROD').toUpperCase();
if(environment!=='PREPROD') throw new Error('BM11_PREPROD_ONLY');
const outDir=path.resolve(process.env.BM11_OUT??'ums-bm11-thousand-shot');
fs.mkdirSync(outDir,{recursive:true});
const SHOTS=1000, WORKERS=12, PHASE1_TARGET=420, CHECKPOINT_EVERY=100;
const seed='CEREBRO-UMS-BM11-20261025-V1';
const sha=(v)=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const now=Date.now();

function buildPlan(){
  return Array.from({length:SHOTS},(_,i)=>{
    const n=i+1, sequence=Math.floor(i/100)+1, scene=Math.floor((i%100)/10)+1;
    const input={shot_id:`SHT-${String(n).padStart(4,'0')}`,sequence_id:`SEQ-${String(sequence).padStart(2,'0')}`,scene_id:`SCN-${String(sequence).padStart(2,'0')}-${String(scene).padStart(2,'0')}`,frame_start:(n-1)*24+1,frame_end:n*24,render_profile:n%5===0?'VFX_HEAVY':'STANDARD',seed:`${seed}:${n}`};
    return {...input,payload_hash:sha(input)};
  });
}

const plan=buildPlan();
const state={schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM11_SCHEDULER_STATE_V1',benchmark_id:'BM-11',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',seed,worker_count:WORKERS,shots:Object.fromEntries(plan.map(s=>[s.shot_id,{...s,status:'QUEUED',attempts:0,completion_count:0,cost_eur:0,worker_id:null,output_hash:null,completed_step:null}])),completed_count:0,failure_events:0,event_count:0,checkpoints:[],logical_step:0,total_cost_eur:0,external_side_effects:false,paid_api_calls:0,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0};
const events=[];
function event(type,shot,extra={}){ state.event_count++; events.push({seq:state.event_count,type,shot_id:shot?.shot_id??null,logical_step:state.logical_step,...extra}); }
function checkpoint(label){
  const snap={label,completed_count:state.completed_count,failure_events:state.failure_events,event_count:state.event_count,logical_step:state.logical_step,shot_status_sha256:sha(Object.values(state.shots).map(s=>[s.shot_id,s.status,s.attempts,s.completion_count,s.output_hash]))};
  const p=path.join(outDir,`checkpoint-${label}.json`); fs.writeFileSync(p,JSON.stringify(snap,null,2)); snap.path=path.basename(p); snap.sha256=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); state.checkpoints.push(snap); event('CHECKPOINT',null,{label,completed_count:state.completed_count,checkpoint_sha256:snap.sha256});
}
function processUntil(target){
  const queue=Object.values(state.shots).filter(s=>s.status!=='DONE'); let cursor=0;
  while(state.completed_count<target){
    const s=queue[cursor%queue.length]; cursor++;
    if(s.status==='DONE') continue;
    state.logical_step++; s.attempts++; s.worker_id=`WRK-${String((state.logical_step-1)%WORKERS+1).padStart(2,'0')}`; s.status='RUNNING'; event('SHOT_STARTED',s,{attempt:s.attempts,worker_id:s.worker_id});
    const numeric=Number(s.shot_id.slice(4));
    if(numeric%37===0 && s.attempts===1){ s.status='RETRY_QUEUED'; state.failure_events++; event('SHOT_FAILED_RETRYABLE',s,{attempt:s.attempts,error_code:'SIMULATED_WORKER_INTERRUPT'}); continue; }
    const outputHash=sha({shot_id:s.shot_id,payload_hash:s.payload_hash,render_contract:'BM11_SIMULATED_RENDER_V1'});
    if(s.completion_count!==0) throw new Error(`EXACTLY_ONCE_VIOLATION:${s.shot_id}`);
    s.status='DONE'; s.completion_count=1; s.output_hash=outputHash; s.completed_step=state.logical_step; state.completed_count++; event('SHOT_COMPLETED',s,{attempt:s.attempts,worker_id:s.worker_id,output_hash:outputHash,cost_eur:0});
    if(state.completed_count%CHECKPOINT_EVERY===0) checkpoint(`auto-${String(state.completed_count).padStart(4,'0')}`);
  }
}

processUntil(PHASE1_TARGET);
checkpoint('phase1-stop');
const phase1Path=path.join(outDir,'bm11-phase1-state.json'); fs.writeFileSync(phase1Path,JSON.stringify(state,null,2));
const phase1Sha=crypto.createHash('sha256').update(fs.readFileSync(phase1Path)).digest('hex');
const phase1Completed=state.completed_count;
// Physical resume boundary: serialize, release object graph, then restore from bytes.
const restored=JSON.parse(fs.readFileSync(phase1Path,'utf8'));
Object.assign(state,restored); event('RESUME_FROM_CHECKPOINT',null,{phase1_state_sha256:phase1Sha,completed_before_resume:phase1Completed});
processUntil(SHOTS);
checkpoint('final-1000');
const finalPath=path.join(outDir,'bm11-final-state.json'); fs.writeFileSync(finalPath,JSON.stringify(state,null,2));
const eventsPath=path.join(outDir,'bm11-events.ndjson'); fs.writeFileSync(eventsPath,events.map(x=>JSON.stringify(x)).join('\n')+'\n');
const outputs=Object.values(state.shots).map(s=>({shot_id:s.shot_id,payload_hash:s.payload_hash,attempts:s.attempts,completion_count:s.completion_count,worker_id:s.worker_id,output_hash:s.output_hash,cost_eur:s.cost_eur,status:s.status}));
const manifest={
  schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM11_THOUSAND_SHOT_SIMULATION_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',benchmark_id:'BM-11',status:'THOUSAND_SHOT_SIMULATION_COMPLETED',seed,
  plan:{shots:SHOTS,sequences:10,scenes:100,frames_per_shot:24,workers:WORKERS},
  resume:{phase1_target:PHASE1_TARGET,completed_before_resume:phase1Completed,phase1_state_path:path.basename(phase1Path),phase1_state_sha256:phase1Sha,resume_event_present:events.some(e=>e.type==='RESUME_FROM_CHECKPOINT')},
  results:{completed_count:state.completed_count,retryable_failures:state.failure_events,total_events:events.length,checkpoint_count:state.checkpoints.length,unique_output_hashes:new Set(outputs.map(x=>x.output_hash)).size,exactly_once:outputs.every(x=>x.completion_count===1),all_done:outputs.every(x=>x.status==='DONE'),shots_with_retry:outputs.filter(x=>x.attempts>1).length},
  telemetry:{total_cost_eur:0,per_shot_cost_eur:0,paid_api_calls:0,external_side_effects:false,logical_steps:state.logical_step,wall_clock_ms:Date.now()-now},
  artifacts:{final_state:{path:path.basename(finalPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex'),bytes:fs.statSync(finalPath).size},events:{path:path.basename(eventsPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(eventsPath)).digest('hex'),bytes:fs.statSync(eventsPath).size}},
  outputs,
  authority:{readiness_mutation_authorized:false,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0}
};
fs.writeFileSync(path.join(outDir,'bm11-simulation.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({...manifest,outputs:`${outputs.length} shot records`},null,2));
