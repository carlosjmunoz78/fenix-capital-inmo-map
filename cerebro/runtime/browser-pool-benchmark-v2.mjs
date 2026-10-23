import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runOneBrowserJobV2 } from './browser-job-runner-v2.mjs';

const DEFAULT_AUDIENCE='cerebro-browser-worker-v1';
const ALLOWED_STAGES=new Set([2,4,8,16]);
const CGROUP_MEMORY_CURRENT='/sys/fs/cgroup/memory.current';
const CGROUP_MEMORY_PEAK='/sys/fs/cgroup/memory.peak';
const CGROUP_MEMORY_MAX='/sys/fs/cgroup/memory.max';

async function readCgroupNumber(path){
  try{
    const raw=(await fs.readFile(path,'utf8')).trim();
    if(!raw||raw==='max')return null;
    const value=Number(raw);
    return Number.isFinite(value)&&value>=0?value:null;
  }catch{return null;}
}

async function cgroupSnapshot(){
  const [current,peak,max]=await Promise.all([
    readCgroupNumber(CGROUP_MEMORY_CURRENT),
    readCgroupNumber(CGROUP_MEMORY_PEAK),
    readCgroupNumber(CGROUP_MEMORY_MAX)
  ]);
  return Object.freeze({current_bytes:current,peak_bytes:peak,max_bytes:max});
}

async function oidcToken({audience=process.env.CEREBRO_BROWSER_OIDC_AUDIENCE||DEFAULT_AUDIENCE,fetch_impl=fetch}={}){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('OIDC_REQUEST_CONTEXT_MISSING');
  const u=new URL(requestUrl);u.searchParams.set('audience',audience);
  const r=await fetch_impl(u,{headers:{authorization:`Bearer ${requestToken}`},redirect:'error'});
  if(!r.ok)throw new Error(`OIDC_TOKEN_FAILED:${r.status}`);
  const body=await r.json();if(!body?.value)throw new Error('OIDC_TOKEN_MISSING');
  return body.value;
}

async function dispatch(endpoint,route,token,body,fetch_impl=fetch){
  const r=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
  const data=await r.json().catch(()=>null);
  if(!r.ok||data?.ok!==true)throw new Error(`${route}:${r.status}:${JSON.stringify(data)}`);
  return data;
}

export async function runBrowserPoolBenchmarkV2({
  endpoint=process.env.CEREBRO_BROWSER_DISPATCH_URL,
  stage_concurrency=Number(process.env.CEREBRO_BROWSER_STAGE_CONCURRENCY||4),
  run_id=process.env.GITHUB_RUN_ID||`local-${Date.now()}`,
  fetch_impl=fetch
}={}){
  if(!endpoint)throw new Error('CEREBRO_BROWSER_DISPATCH_URL_REQUIRED');
  if(!ALLOWED_STAGES.has(stage_concurrency))throw new Error('INVALID_STAGE_CONCURRENCY');
  const token=await oidcToken({fetch_impl});
  const start=Date.now();
  const memStart=process.memoryUsage();
  const cgroupStart=await cgroupSnapshot();
  let peakRss=memStart.rss;
  let peakHeap=memStart.heapUsed;
  let observedContainerPeak=cgroupStart.current_bytes||0;
  let sampling=false;
  const sampler=setInterval(async()=>{
    if(sampling)return;
    sampling=true;
    try{
      const m=process.memoryUsage();
      peakRss=Math.max(peakRss,m.rss);
      peakHeap=Math.max(peakHeap,m.heapUsed);
      const current=await readCgroupNumber(CGROUP_MEMORY_CURRENT);
      if(current!==null)observedContainerPeak=Math.max(observedContainerPeak,current);
    }finally{sampling=false;}
  },100);
  sampler.unref?.();
  try{
    const seeded=[];
    for(let slot=1;slot<=stage_concurrency;slot++){
      seeded.push(await dispatch(endpoint,'phase2-canary-seed',token,{worker_slot:slot,stage_concurrency},fetch_impl));
    }
    const executions=await Promise.allSettled(Array.from({length:stage_concurrency},(_,i)=>runOneBrowserJobV2({
      endpoint,
      worker_slot:i+1,
      stage_concurrency,
      seed_canary:false,
      fetch_impl,
      token,
      run_id
    })));
    while(sampling)await new Promise(resolve=>setTimeout(resolve,10));
    const fulfilled=executions.filter(x=>x.status==='fulfilled').map(x=>x.value);
    const rejected=executions.filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||x.reason));
    const successful=fulfilled.filter(x=>x.ok===true&&x.status==='SUCCEEDED').length;
    const noJob=fulfilled.filter(x=>x.status==='NO_JOB').length;
    const memEnd=process.memoryUsage();
    const cgroupEnd=await cgroupSnapshot();
    const containerPeak=Math.max(observedContainerPeak,cgroupEnd.peak_bytes||0,cgroupEnd.current_bytes||0);
    const memoryLimit=cgroupEnd.max_bytes??cgroupStart.max_bytes;
    const peakUtilization=memoryLimit&&containerPeak?Number((containerPeak/memoryLimit).toFixed(4)):null;
    const summary={
      ok:successful===stage_concurrency&&rejected.length===0,
      run_id,stage_concurrency,seeded:seeded.length,successful,no_job:noJob,rejected,
      duration_ms:Date.now()-start,
      rss_start_bytes:memStart.rss,rss_end_bytes:memEnd.rss,peak_rss_bytes:peakRss,
      heap_start_bytes:memStart.heapUsed,heap_end_bytes:memEnd.heapUsed,peak_heap_bytes:peakHeap,
      container_memory_start_bytes:cgroupStart.current_bytes,
      container_memory_end_bytes:cgroupEnd.current_bytes,
      container_memory_peak_bytes:containerPeak||null,
      container_memory_limit_bytes:memoryLimit,
      container_memory_peak_utilization:peakUtilization,
      container_memory_source:'CGROUP_V2',
      incremental_cost_eur:0,secret_material_logged:false,serial_v1_rollback_preserved:true
    };
    console.log(JSON.stringify(summary));
    return Object.freeze(summary);
  }finally{clearInterval(sampler);}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await runBrowserPoolBenchmarkV2();
  if(!result.ok)process.exitCode=1;
}
