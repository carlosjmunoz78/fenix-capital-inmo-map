// FACT-001 Vercel provider adapter, deliberately inert until a trusted service
// provides a Vercel API request callback with a secret stored outside prompts.
// Never accept an access token, external URL, arbitrary API path or arbitrary SQL from input.
import {VERCEL_TEAM_ID,VERCEL_LAB_PROJECT_ID,VERCEL_LAB_PROJECT_NAME} from './vercel-catalog.mjs';
const valid=v=>typeof v==='string'&&/^[a-zA-Z0-9_.:@/-]{1,128}$/.test(v);
const isPlain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const asResult=(status,data)=>({status,data});
const list=p=>Array.isArray(p?.projects)?p.projects:Array.isArray(p?.result?.projects)?p.result.projects:null;
const project=p=>p?.project||p?.result?.project||p?.result||p;
const toProject=p=>({id:p.id,name:p.name,framework:p.framework??null,updatedAt:p.updatedAt||null});
const query=(path)=>path+(path.includes('?')?'&':'?')+'teamId='+encodeURIComponent(VERCEL_TEAM_ID);
export function createVercelAdapter({request}={}){
 if(typeof request!=='function')throw Error('TRUSTED_VERCEL_TRANSPORT_REQUIRED');
 async function call(method,path,body){
  if(!path.startsWith('/')||path.includes('://')||path.includes('..')||!['GET','PATCH','POST'].includes(method))throw Error('UNTRUSTED_ENDPOINT');
  const out=await request({method,path:query(path),...(body===undefined?{}:{body})});
  if(!isPlain(out))throw Error('UNVERIFIED_VERCEL_RESPONSE');
  return out;
 }
 return {
  async perform({action,scope,input={}}={}){
   if(scope?.environment!=='LAB'||scope.company_id!=='fenix-capital'||scope.engine_id!=='FACT-001'||!valid(scope.version)||!isPlain(input))throw Object.assign(Error('SCOPE_DENIED'),{code:'SCOPE_DENIED'});
   switch(action?.id){
    case 'vercel.projects.list':{
     const r=await call('GET','/v10/projects?limit=40');
     const arr=list(r);if(!arr)throw Error('UNVERIFIED_LIST');
     return asResult('COMPLETED',{projects:arr.map(toProject)});
    }
    case 'vercel.project.get':{
     if(!valid(input.idOrName))throw Error('PROJECT_REQUIRED');
     const r=await call('GET','/v9/projects/'+encodeURIComponent(input.idOrName));
     const p=project(r);if(!p?.id||!p?.name)throw Error('UNVERIFIED_PROJECT');
     return asResult('COMPLETED',toProject(p));
    }
    case 'vercel.project.create-lab':{
     // Quota/billing policy and durable idempotency are mandatory in UniversalConnectorCore.
     // No Git integration, domains, production env or deployments may be supplied.
     if(typeof input.name!=='string'||!/^(cerebro-fact001-[a-z0-9-]{4,48}-(?:lab|lab-[0-9]{8}))$/.test(input.name)||Object.keys(input).sort().join(',')!=='name')throw Error('LAB_CREATE_DENIED');
     const inventory=await call('GET','/v10/projects?limit=100');
     const rows=list(inventory);if(!rows)throw Error('UNVERIFIED_INVENTORY');
     const found=rows.filter(x=>x.name===input.name);
     if(found.length===1)return asResult('ALREADY_EXISTS_VERIFIED',toProject(found[0]));
     if(found.length!==0)throw Error('EXISTING_PROJECT_CONFLICT');
     const response=await call('POST','/v10/projects',{name:input.name,framework:null,skipGitConnectDuringLink:true,enablePreviewFeedback:false,enableProductionFeedback:false});
     const created=project(response);
     if(typeof created?.id!=='string'||!created.id.startsWith('prj_')||created.name!==input.name)throw Error('POSTWRITE_RECONCILE');
     return asResult('COMPLETED',toProject(created));
    }
    case 'vercel.project.update-lab':{
     if(input.idOrName!==VERCEL_LAB_PROJECT_ID||typeof input.enablePreviewFeedback!=='boolean'||Object.keys(input).sort().join(',')!=='enablePreviewFeedback,idOrName')throw Error('LAB_UPDATE_DENIED');
     const prior=project(await call('GET','/v9/projects/'+VERCEL_LAB_PROJECT_ID));
     if(prior?.id!==VERCEL_LAB_PROJECT_ID||prior?.name!==VERCEL_LAB_PROJECT_NAME)throw Error('LAB_IDENTITY_CONFLICT');
     const value=await call('PATCH','/v9/projects/'+VERCEL_LAB_PROJECT_ID,{enablePreviewFeedback:input.enablePreviewFeedback});
     const next=project(value);
     if(next?.id!==VERCEL_LAB_PROJECT_ID)throw Error('POSTWRITE_RECONCILE');
     return asResult('COMPLETED',{id:next.id,name:next.name});
    }
    case 'vercel.deployments.list':{
     if(input.projectId!==VERCEL_LAB_PROJECT_ID)throw Error('LAB_READ_PROJECT_ONLY');
     const response=await call('GET','/v6/deployments?projectId='+encodeURIComponent(VERCEL_LAB_PROJECT_ID)+'&limit=20');
     const dep=response.deployments||response.result?.deployments||[];
     if(!Array.isArray(dep))throw Error('UNVERIFIED_DEPLOYMENT_LIST');
     return asResult('COMPLETED',{deployments:dep.map(d=>({id:d.id||d.uid,name:d.name,target:d.target,state:d.state||d.readyState}))});
    }
    case 'vercel.deployment.get':{
     if(!valid(input.deploymentId))throw Error('DEPLOYMENT_ID_REQUIRED');
     const response=await call('GET','/v13/deployments/'+encodeURIComponent(input.deploymentId));
     const d=response.deployment||response.result?.deployment||response.result||response;
     if(!d?.id||d.project?.id!==VERCEL_LAB_PROJECT_ID)throw Error('LAB_DEPLOYMENT_SCOPE_DENIED');
     return asResult('COMPLETED',{id:d.id,projectId:d.project.id,state:d.state||d.readyState,target:d.target||null});
    }
    default:throw Error('VERCEL_CAPABILITY_DENIED');
   }
  }
 };
}
