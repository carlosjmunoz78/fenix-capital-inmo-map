// FACT-001 Vercel independent service: narrow reversible isolated LAB proof.
// The calling Edge function MUST verify GitHub OIDC first and get bearer from Vault.
// No tokens are returned. No Github, build, deploy, domains, App, CRM or PROD access.
import {TEAM_ID,LAB_PROJECT_ID,LAB_PROJECT_NAME} from './policy.mjs';
const apiUrl='https://api.vercel.com/v9/projects/'+encodeURIComponent(LAB_PROJECT_ID)+'?teamId='+encodeURIComponent(TEAM_ID);
export async function updateAndRollbackLab({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<20||token.length>1024)throw Error('SERVICE_SECRET_INVALID');
 let patchAttempted=false,rollbackVerified=false;
 async function call(method,body){
  const response=await http(apiUrl,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('VERCEL_HTTP_'+response.status);
  let data;try{data=await response.json()}catch{throw Error('VERCEL_JSON_INVALID');}
  if(!data||data.id!==LAB_PROJECT_ID||data.name!==LAB_PROJECT_NAME)throw Error('PROJECT_IDENTITY_MISMATCH');
  return data;
 }
 const initial=await call('GET');
 // Fail closed when the previous state is not already known and repeatable.
 if(initial.framework!==null)throw Error('BASELINE_NOT_NULL');
 let updated=false;
 try{
  patchAttempted=true;
  await call('PATCH',{framework:'vite'});
  const changed=await call('GET');
  if(changed.framework!=='vite')throw Error('WRITE_NOT_CONFIRMED');
  updated=true;
 } finally{
  if(patchAttempted){
   // Even an ambiguous PATCH response requires an attempt to restore the known baseline.
   await call('PATCH',{framework:null});
   const after=await call('GET');
   rollbackVerified=after.framework===null;
   if(!rollbackVerified)throw Error('ROLLBACK_NOT_VERIFIED');
  }
 }
 if(!updated||!rollbackVerified)throw Error('WRITE_NOT_VERIFIED');
 return {status:'VERCEL_LAB_WRITE_AND_ROLLBACK_VERIFIED',project_id:LAB_PROJECT_ID,read_verified:true,write_verified:updated,rollback_verified:rollbackVerified,project_framework_after:null,credential_exposed:false,billing_writes:0,deployments_created:0};
}
