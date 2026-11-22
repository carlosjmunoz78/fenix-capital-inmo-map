/** Offline competency dispatch through existing durable JOB-001. NOT autonomous role execution. */
import fs from 'node:fs';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {listSeoDepartments,getSeoDepartmentKnowledge,compileSeoSpecialistMission} from './seo-specialist-workforce-v2.mjs';
const ctx=Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0'});
export function runSeoKnowledgeOrientation({file_path,now_ms=1793904000000,execute=true}={}){
 if(typeof file_path!=='string'||!file_path||!Number.isSafeInteger(now_ms)||now_ms<1)throw Error('JOURNAL_FILE_REQUIRED');
 const journal=new DurableJobRuntimeV1({file_path});
 const roster=listSeoDepartments();
 let created=0,duplicates=0;
 for(const d of roster){
  const p=getSeoDepartmentKnowledge(d.department_id);
  for(const role of p.workforce.subagents){
   const m=compileSeoSpecialistMission({company_id:'fenix',environment:'LAB',
    department_id:d.department_id,subagent_role_id:role.role_id,
    request_id:'LAB_ORIENTATION_'+d.department_id.replace('-','_')+'_'+role.role_id.split(':').at(-1),
    objective:'Reconocer el contrato de la competencia y preparar la ficha de entrega con evidencias',
    source_refs:['cerebro/seo-enterprise/v2/seo-specialist-training-and-commands-v1.json'],
    allow_writes:false,allow_paid_ai:false,budget_eur:0});
   const queued=journal.enqueue({context:ctx,name:'SEO_SPECIALIST_ORIENTATION_CONTRACT_ONLY',
    idempotency_key:'seo-workforce-v2-'+role.role_id,now_ms,max_attempts:1,timeout_ms:15000,priority:90,
    payload:{department_id:d.department_id,role_id:role.role_id,competency:role.competency,
      knowledge_pack:'knowledge/'+d.department_id+'.json',documented_actions:m.allowed_actions,
      task_state:'CONTRACT_ORIENTATION_NO_SOURCE_EXECUTION',external_write:false,prod_permission:false}});
   if(queued.accepted)created++;else duplicates++;
  }
 }
 let completed=0;
 if(execute){
  for(let i=0;i<141;i++){
   const job=journal.claim({context:ctx,worker_id:'SEO_DETERMINISTIC_ORIENTATION_V2',now_ms:now_ms+i*5,lease_ms:30000});
   if(!job)break;
   const p=getSeoDepartmentKnowledge(job.payload.department_id);
   const role=p.workforce.subagents.find(a=>a.role_id===job.payload.role_id);
   if(!role||role.competency!==job.payload.competency||p.knowledge.operational_directives.length<6){
    journal.fail({job_id:job.job_id,worker_id:'SEO_DETERMINISTIC_ORIENTATION_V2',error:'KNOWLEDGE_CONTRACT_INVALID',now_ms:now_ms+i*5+1});
    continue;
   }
   journal.complete({job_id:job.job_id,worker_id:'SEO_DETERMINISTIC_ORIENTATION_V2',now_ms:now_ms+i*5+1,
    result:{role_id:role.role_id,competency:role.competency,department_id:p.department_id,
      knowledge_rules_loaded:p.knowledge.operational_directives.length,
      required_outputs:p.knowledge.required_outputs,
      scorecard:p.training.evaluation.rubric,
      state:'ROLE_PACK_CAN_BE_ROUTED_ACTOR_NOT_TRAINED',
      evidence_source:'VERSIONED_REPO_KNOWLEDGE_PACK',source_content_evaluation_performed:false,
      independent_qa_performed:false,iam_verified:false,training_certified:false,
      external_writes:0,new_cost_eur:0}});
   completed++;
  }
 }
 const jobs=journal.listForContext(ctx);
 const states=jobs.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a},{});
 return {schema_version:'2.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'LAB_SIMULATED_OVER_JOB001_PREPROD_JOURNAL',
  role_templates:141,departments:32,newly_enqueued:created,deduplicated:duplicates,
  processed_in_this_call:completed,job_count:jobs.length,job_states:states,
  work_type:'KNOWLEDGE_CONTRACT_DISPATCH_NOT_PRODUCTION_EXECUTION',
  actual_iam_agents:0,independent_qa_actors_proven:0,training_certifications:0,external_actions:0,
  additional_eur:0,prod_activated:false,passed_contract_orientation:jobs.length===141&&states.SUCCEEDED===141};
}
export function verifySeoKnowledgeOrientation({file_path}={}){
 if(typeof file_path!=='string'||!file_path)throw Error('JOURNAL_FILE_REQUIRED');
 const journal=new DurableJobRuntimeV1({file_path});
 const jobs=journal.listForContext(ctx);
 const roles=new Set(jobs.map(j=>j.payload.role_id));
 const invalid=jobs.filter(j=>j.status!=='SUCCEEDED'||j.name!=='SEO_SPECIALIST_ORIENTATION_CONTRACT_ONLY'||
  j.payload.external_write!==false||j.payload.prod_permission!==false||
  j.result?.training_certified!==false||j.result?.iam_verified!==false||j.result?.external_writes!==0);
 return {status:jobs.length===141&&roles.size===141&&invalid.length===0?'LAB_CONTRACT_ORIENTATION_VERIFIED':'BLOCKED',
  journal_jobs:jobs.length,unique_role_templates:roles.size,invalid:invalid.map(x=>x.job_id),
  real_agents_certified:0,prod_permissions_granted:0};
}
if(process.argv[1]?.endsWith('seo-workforce-orientation-v2.mjs')){
 const cmd=process.argv[2],file=process.argv[3],out=process.argv[4];
 try{
  if(!['run','verify'].includes(cmd)||!file||!out)throw Error('USAGE: run|verify journal-path result-json');
  const r=cmd==='run'?runSeoKnowledgeOrientation({file_path:file}):verifySeoKnowledgeOrientation({file_path:file});
  fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'w'});
  process.stdout.write(JSON.stringify(r)+'\n');
  if(cmd==='run'&&!r.passed_contract_orientation)process.exitCode=1;
  if(cmd==='verify'&&r.status==='BLOCKED')process.exitCode=1;
 }catch(e){process.stderr.write(String(e.message)+'\n');process.exitCode=1}
}
