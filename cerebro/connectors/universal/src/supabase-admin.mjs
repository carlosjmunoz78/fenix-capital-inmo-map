// Supabase Management API adapter. Backend injects a trusted HTTPS client whose
// access token remains in Vault / GitHub Actions secret; no token in model data or logs.
// Only exact disposable function may be deleted. Prod App/CRM functions are excluded.
import {SUPABASE_PROJECT_REF,DISPOSABLE_FUNCTION,DISPOSABLE_FUNCTION_ID,DISPOSABLE_FUNCTION_SHA} from './supabase-admin-catalog.mjs';
const PREFIX='/v1/projects/'+SUPABASE_PROJECT_REF+'/functions';
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const fixedRead=x=>x?.result??x;
export function createSupabaseAdminAdapter({request}={}){
 if(typeof request!=='function')throw Error('TRUSTED_SUPABASE_MANAGEMENT_TRANSPORT_REQUIRED');
 async function call(method,path){
  if(!['GET','DELETE'].includes(method)||!([PREFIX,PREFIX+'/'+DISPOSABLE_FUNCTION].includes(path)))throw Error('API_PATH_DENIED');
  const output=await request({method,path});
  if(!plain(output)&&!Array.isArray(output))throw Error('API_RESPONSE_UNVERIFIED');
  return fixedRead(output);
 }
 return {
  async perform({action,scope,input={}}={}){
   if(scope?.company_id!=='fenix-capital'||scope?.engine_id!=='FACT-001'||scope.environment!=='LAB'||!plain(input))throw Error('SCOPE_DENIED');
   if(action?.id==='supabase-admin.edge-functions.list'){
    if(Object.keys(input).length!==0)throw Error('INPUT_DENIED');
    const result=await call('GET',PREFIX);
    if(!Array.isArray(result))throw Error('FUNCTIONS_LIST_UNVERIFIED');
    return {status:'COMPLETED',data:{functions:result.map(f=>({slug:f.slug,status:f.status,version:f.version}))}};
   }
   if(action?.id==='supabase-admin.edge-functions.get'){
    if(input.slug!==DISPOSABLE_FUNCTION||Object.keys(input).length!==1)throw Error('FUNCTION_SCOPE_DENIED');
    const f=await call('GET',PREFIX+'/'+DISPOSABLE_FUNCTION);
    if(f?.notFound===true)return {status:'COMPLETED',data:{exists:false}};
    if(f?.id!==DISPOSABLE_FUNCTION_ID||f.slug!==DISPOSABLE_FUNCTION)throw Error('FUNCTION_ID_MISMATCH');
    return {status:'COMPLETED',data:{exists:true,slug:f.slug,id:f.id,version:f.version,verify_jwt:f.verify_jwt}};
   }
   if(action?.id==='supabase-admin.edge-functions.delete-test-tombstone'){
    if(input.slug!==DISPOSABLE_FUNCTION||input.project_ref!==SUPABASE_PROJECT_REF||input.expected_function_id!==DISPOSABLE_FUNCTION_ID||input.confirm_disposable!==true||Object.keys(input).sort().join(',')!=='confirm_disposable,expected_function_id,project_ref,slug')throw Error('DELETE_SCOPE_DENIED');
    const f=await call('GET',PREFIX+'/'+DISPOSABLE_FUNCTION);
    if(f?.notFound===true)return {status:'COMPLETED',deleted:false,verified_absent:true,slug:DISPOSABLE_FUNCTION};
    // Must be the v4+ retired test endpoint, not the former live credentials-consuming worker.
    if(f?.id!==DISPOSABLE_FUNCTION_ID||f.slug!==DISPOSABLE_FUNCTION||f.version!==4||f.ezbr_sha256!==DISPOSABLE_FUNCTION_SHA||f.verify_jwt!==true||f.status!=='ACTIVE')throw Error('FUNCTION_NOT_VERIFIED_AS_RETIRED');
    const removed=await call('DELETE',PREFIX+'/'+DISPOSABLE_FUNCTION);
    if(removed?.deleted!==true)throw Error('DELETE_RESPONSE_NOT_ACKNOWLEDGED');
    const after=await call('GET',PREFIX+'/'+DISPOSABLE_FUNCTION);
    if(after?.notFound!==true)throw Error('DELETE_NOT_VERIFIED');
    return {status:'COMPLETED',deleted:true,slug:DISPOSABLE_FUNCTION,verification:'GET_404',other_functions_deleted:0};
   }
   throw Error('SUPABASE_CAPABILITY_NOT_ENABLED');
  }
 };
}
