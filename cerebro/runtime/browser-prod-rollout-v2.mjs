import { pathToFileURL } from 'node:url';
import { runOneBrowserJobV2 } from './browser-job-runner-v2.mjs';

const ENDPOINT=process.env.CEREBRO_BROWSER_DISPATCH_URL||'';
const AUDIENCE=process.env.CEREBRO_BROWSER_OIDC_AUDIENCE||'cerebro-browser-worker-v1';

async function oidcToken(){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('OIDC_REQUEST_CONTEXT_MISSING');
  const u=new URL(requestUrl);u.searchParams.set('audience',AUDIENCE);
  const r=await fetch(u,{headers:{authorization:`Bearer ${requestToken}`},redirect:'error'});
  if(!r.ok)throw new Error(`OIDC_TOKEN_FAILED:${r.status}`);
  const body=await r.json();
  if(!body?.value)throw new Error('OIDC_TOKEN_MISSING');
  return body.value;
}

async function call(route,token,body={}){
  const r=await fetch(`${ENDPOINT.replace(/\/$/,'')}/${route}`,{
    method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok||data?.ok!==true)throw new Error(`${route}:${r.status}:${data?.error||'UNKNOWN'}`);
  return data;
}

async function runStage(stage,token){
  await call('promotion-config-v2',token,{action:'STAGE',stage_concurrency:stage});
  for(let slot=1;slot<=stage;slot++)await call('phase2-canary-seed',token,{worker_slot:slot,stage_concurrency:stage});
  const results=await Promise.all(Array.from({length:stage},(_,i)=>runOneBrowserJobV2({
    endpoint:ENDPOINT,worker_slot:i+1,stage_concurrency:stage,seed_canary:false,token,run_id:process.env.GITHUB_RUN_ID||`prod-${Date.now()}`
  })));
  for(const result of results){
    if(result?.ok!==true||result?.status!=='SUCCEEDED')throw new Error(`PROD_STAGE_${stage}_WORKER_NOT_GREEN:${result?.worker_slot}:${result?.status}`);
  }
  const status=await call('status-v2',token,{});
  if(Number(status.active_profiles||0)!==0)throw new Error(`PROD_STAGE_${stage}_LEASE_LEAK:${status.active_profiles}`);
  console.log(JSON.stringify({stage,green:true,workers:results.length,active_profiles:0,incremental_cost_eur:0,secret_material_logged:false}));
}

export async function runProdRolloutV2(){
  if(!ENDPOINT.includes('cluhljgonannaafpmblx.supabase.co'))throw new Error('PROD_ENDPOINT_REQUIRED');
  const token=await oidcToken();
  try{
    for(const stage of [1,2,4,8])await runStage(stage,token);
    const finalConfig=await call('promotion-config-v2',token,{action:'FINALIZE'});
    const status=await call('status-v2',token,{});
    if(status.enabled!==true||Number(status.global_max_concurrent)!==8||Number(status.default_company_max_concurrent)!==4||Number(status.default_department_max_concurrent)!==2||Number(status.active_profiles||0)!==0){
      throw new Error('PROD_FINAL_CONFIG_NOT_8_4_2_GREEN');
    }
    return {ok:true,status:'PROD_GREEN',final_config:finalConfig.config,active_profiles:0,incremental_cost_eur:0,secret_material_logged:false};
  }catch(error){
    await call('promotion-config-v2',token,{action:'DISABLE'}).catch(()=>null);
    throw error;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await runProdRolloutV2();
  console.log(JSON.stringify(result));
}
