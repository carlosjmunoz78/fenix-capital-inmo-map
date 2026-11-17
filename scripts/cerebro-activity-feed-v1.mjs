import {writeFile} from 'node:fs/promises';

const REPOSITORY='carlosjmunoz78/fenix-capital-inmo-map';
const API='https://api.github.com/repos/'+REPOSITORY+'/actions/runs';
const MAX_ACTIVE_PAGES=4;
const MAX_HISTORY=24;

export function isCerebroRun(run){
 const title=(String(run.name??'')+' '+String(run.path??'')).toUpperCase();
 return title.includes('CEREBRO')||title.includes('PROD LIVE DEPLOY')||title.includes('ENGINE FACTORY');
}

export function sanitizeRun(run){
 if(!Number.isSafeInteger(run?.id)||run.id<=0)return null;
 const url=String(run.html_url??'');
 if(!url.startsWith('https://github.com/'+REPOSITORY+'/actions/runs/'))return null;
 return {
  id:run.id,
  name:String(run.name??'').slice(0,200),
  path:String(run.path??'').slice(0,250),
  status:String(run.status??'unknown').slice(0,24),
  conclusion:run.conclusion==null?null:String(run.conclusion).slice(0,30),
  event:String(run.event??'').slice(0,35),
  html_url:url,
  created_at:String(run.created_at??'').slice(0,35),
  run_started_at:run.run_started_at==null?null:String(run.run_started_at).slice(0,35),
  updated_at:String(run.updated_at??'').slice(0,35),
  head_sha:String(run.head_sha??'').slice(0,40)
 };
}
function safeJobs(jobs){
 return (Array.isArray(jobs)?jobs:[]).slice(0,100).map(job=>({
  name:String(job.name??'').slice(0,180),
  status:String(job.status??'').slice(0,30),
  conclusion:job.conclusion==null?null:String(job.conclusion).slice(0,30),
  steps:(Array.isArray(job.steps)?job.steps:[]).slice(0,90).map(step=>({
   name:String(step.name??'').slice(0,160),
   status:String(step.status??'').slice(0,30),
   conclusion:step.conclusion==null?null:String(step.conclusion).slice(0,30)
  }))
 }));
}
export function buildSnapshot({running,queued,recent,details={}},when=new Date().toISOString()){
 const clean=(arr)=>arr.filter(isCerebroRun).map(sanitizeRun).filter(Boolean);
 const activeRunning=clean(running.workflow_runs??[]);
 const activeQueued=clean(queued.workflow_runs??[]);
 const seen=new Set([...activeRunning,...activeQueued].map(x=>x.id));
 const history=clean(recent.workflow_runs??[]).filter(x=>x.status==='completed'&&!seen.has(x.id)).slice(0,MAX_HISTORY);
 const compactDetails={};
 for(const run of [...activeRunning,...activeQueued].slice(0,4)){
  const jobs=details[String(run.id)];
  if(Array.isArray(jobs))compactDetails[String(run.id)]=safeJobs(jobs);
 }
 return {
  schema:'cerebro-actions-feed-v1',
  repository:REPOSITORY,
  generated_at:when,
  method:'AUTHENTICATED_GITHUB_ACTIONS',
  in_progress:{total_count:Math.max(0,Number(running.total_count)||0),workflow_runs:activeRunning},
  queued:{total_count:Math.max(0,Number(queued.total_count)||0),workflow_runs:activeQueued},
  history:{workflow_runs:history},
  details:compactDetails
 };
}

async function githubGet(path,token){
 const url=path.startsWith('https://')?path:'https://api.github.com'+path;
 const response=await fetch(url,{headers:{
  authorization:'Bearer '+token,
  accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  'user-agent':'cerebro-activity-feed-v1'
 },signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw new Error('GITHUB_FEED_HTTP_'+response.status);
 return response.json();
}

async function getRuns(query,token,allPages){
 const first=await githubGet('/repos/'+REPOSITORY+'/actions/runs?'+query+'&per_page=100&page=1',token);
 const runs=[...(first.workflow_runs??[])];
 if(allPages){
  const count=Math.min(MAX_ACTIVE_PAGES,Math.ceil(Math.min(Number(first.total_count)||0,400)/100));
  for(let page=2;page<=count;page++){
   const next=await githubGet('/repos/'+REPOSITORY+'/actions/runs?'+query+'&per_page=100&page='+page,token);
   runs.push(...(next.workflow_runs??[]));
  }
 }
 return {total_count:first.total_count,workflow_runs:runs};
}

export async function collectSnapshot(token){
 if(!token||token.length<15)throw new Error('GITHUB_WORKFLOW_TOKEN_MISSING');
 const [running,queued,recent]=await Promise.all([
  getRuns('status=in_progress',token,true),
  getRuns('status=queued',token,true),
  getRuns('sort=created&direction=desc',token,false)
 ]);
 const active=[...(running.workflow_runs??[]),...(queued.workflow_runs??[])].filter(isCerebroRun).slice(0,4);
 const detailEntries=await Promise.all(active.map(async run=>{
  const response=await githubGet('/repos/'+REPOSITORY+'/actions/runs/'+run.id+'/jobs?per_page=100',token);
  return [String(run.id),response.jobs??[]];
 }));
 return buildSnapshot({running,queued,recent,details:Object.fromEntries(detailEntries)});
}

if(process.argv.includes('--publish')){
 if(process.env.GITHUB_REPOSITORY!==REPOSITORY)throw new Error('WRONG_REPOSITORY');
 const snapshot=await collectSnapshot(process.env.GITHUB_TOKEN??'');
 const target=process.env.RUNNER_TEMP+'/cerebro-activity-feed-v1.json';
 await writeFile(target,JSON.stringify(snapshot,null,2)+'\n',{encoding:'utf8',flag:'w'});
 console.log('FEED_VERIFIED repo='+REPOSITORY+' active='+snapshot.in_progress.workflow_runs.length+' queued='+snapshot.queued.workflow_runs.length+' history='+snapshot.history.workflow_runs.length+' generated_at='+snapshot.generated_at);
}
