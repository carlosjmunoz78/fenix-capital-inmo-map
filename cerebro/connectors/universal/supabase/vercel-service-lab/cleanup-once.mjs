// USER-REQUESTED LAB RESOURCE CLEANUP. Single fixed project, single fixed deployment.
// No parameters control target, method, API root or team. Disable function immediately after use.
import {TEAM_ID,LAB_PROJECT_ID,LAB_PROJECT_NAME} from './policy.mjs';
const BASE='https://api.vercel.com';
const PRJ='/v9/projects/'+LAB_PROJECT_ID;
const qs='?teamId='+encodeURIComponent(TEAM_ID);
const EXPECTED_DEPLOYMENT='dpl_Ff2mSexUe9KdQ8vLphtYp4zDXbGD';
const EXPECTED_DOMAIN='cerebro-fact001-vercel-connector-la.vercel.app';
export async function deleteSoleVercelTestProject({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<20||token.length>1024)throw Error('INVALID_SERVICE_SECRET');
 async function call(path,method='GET'){
   if(![PRJ+qs,PRJ+'/domains'+qs,'/v6/deployments'+qs+'&projectId='+LAB_PROJECT_ID+'&limit=25'].includes(path))throw Error('PATH_DENIED');
   const resp=await http(BASE+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
   if(resp.status===404 && method==='GET' && path===PRJ+qs)return {notFound:true};
   if(method==='DELETE' && resp.status===204)return {deleted:true};
   if(!resp.ok)throw Error('VERCEL_HTTP_'+resp.status);
   if(method==='DELETE')throw Error('DELETE_RESPONSE_UNEXPECTED_'+resp.status);
   const obj=await resp.json();
   if(!obj||typeof obj!=='object')throw Error('RESPONSE_INVALID');
   return obj;
 }
 const project=await call(PRJ+qs);
 if(project.notFound)return {status:'ALREADY_ABSENT',deleted:false,project_id:LAB_PROJECT_ID,credential_exposed:false};
 if(project.id!==LAB_PROJECT_ID||project.name!==LAB_PROJECT_NAME||project.accountId!==TEAM_ID||project.framework!==null||project.link)throw Error('LAB_PROJECT_MISMATCH');
 const domainResult=await call(PRJ+'/domains'+qs);
 const domains=domainResult.domains;
 if(!Array.isArray(domains)||domains.length!==1||domains[0]?.name!==EXPECTED_DOMAIN)throw Error('UNEXPECTED_DOMAINS');
 const deployments=await call('/v6/deployments'+qs+'&projectId='+LAB_PROJECT_ID+'&limit=25');
 if(!Array.isArray(deployments.deployments)||deployments.deployments.length!==1||deployments.deployments[0]?.uid!==EXPECTED_DEPLOYMENT && deployments.deployments[0]?.id!==EXPECTED_DEPLOYMENT)throw Error('UNEXPECTED_DEPLOYMENTS');
 const result=await call(PRJ+qs,'DELETE');
 if(result.deleted!==true)throw Error('DELETE_NOT_ACKNOWLEDGED');
 const after=await call(PRJ+qs);
 if(after.notFound!==true)throw Error('POST_DELETE_NOT_VERIFIED');
 return {status:'VERCEL_TEST_PROJECT_DELETED',deleted:true,project_id:LAB_PROJECT_ID,scope:'LAB_ONLY',credential_exposed:false,other_projects_deleted:0};
}
