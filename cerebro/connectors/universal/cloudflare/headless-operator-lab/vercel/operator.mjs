import {TEAM_ID,PROJECT_ID,PROJECT_NAME,validateOrder} from './policy.mjs';
// The controller does not host an HTTP endpoint. Its service identity stays in a Worker SECRET.
export const BASE='https://api.vercel.com';
export function createClient(credential,http=fetch){
 if(typeof credential!=='string'||credential.length<24||/\s/.test(credential))throw Error('VERCEL_SECRET_NOT_CONFIGURED');
 async function call(method,path,body){
  const resp=await http(BASE+path,{method,headers:{Authorization:'Bearer '+credential,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(16000)});
  if(!resp||resp.status<200||resp.status>=300)throw Error('VERCEL_HTTP_'+(resp?.status||503));
  return resp.json();
 }
 const projectPath='/v9/projects/'+encodeURIComponent(PROJECT_ID)+'?teamId='+encodeURIComponent(TEAM_ID);
 async function checkedProject(){
  const v=await call('GET',projectPath);
  if(v.id!==PROJECT_ID||v.name!==PROJECT_NAME||v.accountId!==TEAM_ID)throw Error('VERCEL_PROJECT_IDENTITY_DRIFT');
  if(v.latestDeployment!=null||v.live===true||(v.domains||[]).length>0||v.ssoProtection?.enabled===false||v.ssoProtection?.deploymentType!=='all')throw Error('VERCEL_SSO_NO_DEPLOYMENT_GATE');
  return v;
 }
 return{call,checkedProject,projectPath};
}
export async function executeOrder(order,secret,http=fetch){
 validateOrder(order);
 const client=createClient(secret,http);
 const before=await client.checkedProject();
 if(order.operation==='vercel.project.read_lab')return{status:'VERIFIED',operation:order.operation,framework:before.framework||null};
 if(order.operation==='vercel.deployment.list_lab'){
  const payload=await client.call('GET','/v6/deployments?teamId='+encodeURIComponent(TEAM_ID)+'&projectId='+encodeURIComponent(PROJECT_ID)+'&limit=10');
  if(!Array.isArray(payload.deployments)||payload.deployments.length)throw Error('VERCEL_UNEXPECTED_LIVE_DEPLOYMENT');
  return{status:'VERIFIED_EMPTY_LAB_DEPLOYMENTS',count:0};
 }
 const rollback=order.operation==='vercel.project.rollback_framework_null_lab';
 if(rollback&&before.framework!=='vite')throw Error('VERCEL_BASELINE_WRONG');
 if(!rollback&&before.framework!=null)throw Error('VERCEL_BASELINE_WRONG');
 const target=rollback?null:'vite';
 await client.call('PATCH',client.projectPath,{framework:target});
 const after=await client.checkedProject();
 if((after.framework||null)!==target)throw Error('VERCEL_POSTWRITE_MISMATCH');
 return{status:'COMPLETED',operation:order.operation,from:before.framework||null,to:target,protected:true,live:false};
}
