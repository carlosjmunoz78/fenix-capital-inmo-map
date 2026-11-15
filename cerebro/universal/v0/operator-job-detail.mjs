/** Bounded public GitHub Actions job metadata, no logs, secrets, writes or agent inference. */
const ALLOWED_REPOS=new Set(['carlosjmunoz78/fenix-capital-inmo-map','carlosjmunoz78/capital-mapa-pro']);
const clean=text=>typeof text==='string'?text.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,100).trim():'';
const goodId=id=>Number.isSafeInteger(id)&&id>0;
export function summarizeFailedJob(raw,{repo,run_id}={}){
 if(!ALLOWED_REPOS.has(repo)||!goodId(run_id)||!raw||!Array.isArray(raw.jobs)||raw.jobs.length>20)return null;
 const matches=[];
 for(const job of raw.jobs){
  if(!job||!goodId(job.id)||job.run_id!==run_id||job.status!=='completed'||
   !['failure','timed_out'].includes(job.conclusion))continue;
  const link='https://github.com/'+repo+'/actions/runs/'+run_id+'/job/'+job.id;
  if(job.html_url!==link||!Array.isArray(job.steps)||job.steps.length>80)continue;
  const failures=job.steps.filter(s=>s&&s.status==='completed'&&s.conclusion==='failure'&&
   Number.isSafeInteger(s.number)&&s.number>0&&s.number<=1000&&clean(s.name));
  const failed=failures[0]||null;
  matches.push({status:failed?'FAILED_STEP_VERIFIED':'FAILED_JOB_STEP_UNKNOWN',
   source:'GITHUB_ACTIONS_PUBLIC_JOB_METADATA',repo,run_id,job_id:job.id,
   job_name:clean(job.name)||'Job sin título',
   failed_step_number:failed?failed.number:null,failed_step_name:failed?clean(failed.name):null,
   evidence_url:link,engine_id:null,agent_id:null,subagent_id:null,executed:false,
   runtime_failure_verified:false});
 }
 // A provider may return several failed jobs; a confirmed step has precedence.
 matches.sort((a,b)=>Number(b.status==='FAILED_STEP_VERIFIED')-Number(a.status==='FAILED_STEP_VERIFIED')||a.job_id-b.job_id);
 return matches[0]||null;
}
