/** Server-only Supabase Auth /user owner verifier; READ ONLY. Does not run unless called
 * by a trusted host that provides private owner user UUID and existing publishable key.
 * A successful Auth /user fetch validates the bearer token; NEVER inspect user_metadata for authorization.
 */
const fail=reason=>({verified:false,reason,role:null,session_active:false,assurance:'UNVERIFIED'});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const project=/^[a-z0-9]{16,40}$/;
const jwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export function createSupabaseOwnerSessionVerifierLab({company_id,project_ref,expected_owner_user_id,
 publishable_key,fetchImpl=globalThis.fetch}={}){
 if(typeof company_id!=='string'||!/^[A-Za-z0-9_-]{2,64}$/.test(company_id)||
  typeof project_ref!=='string'||!project.test(project_ref)||
  typeof expected_owner_user_id!=='string'||!uuid.test(expected_owner_user_id)||
  typeof publishable_key!=='string'||!publishable_key.startsWith('sb_publishable_')||
  publishable_key.length<28||typeof fetchImpl!=='function')throw Error('OWNER_AUTH_PRIVATE_SERVER_CONFIG_REQUIRED');
 const target='https://'+project_ref+'.supabase.co/auth/v1/user';
 return async function verifyTrustedOwnerSession({session_ref,company_id:requested_company,required_role}={}){
  if(requested_company!==company_id||required_role!=='OWNER')return fail('OWNER_TENANT_OR_ROLE_MISMATCH');
  if(typeof session_ref!=='string'||session_ref.length<40||session_ref.length>8000||
    !jwt.test(session_ref))return fail('OWNER_ACCESS_TOKEN_INVALID_FORMAT');
  let res;
  try{
   res=await fetchImpl(target,{method:'GET',redirect:'error',headers:{
    apikey:publishable_key,Authorization:'Bearer '+session_ref,
    Accept:'application/json'},signal:AbortSignal.timeout(6500)});
  }catch{return fail('OWNER_AUTH_SERVER_UNAVAILABLE')}
  if(res?.status!==200||res.ok!==true)return fail('OWNER_AUTH_SERVER_REJECTED');
  let u;
  try{u=await res.json()}catch{return fail('OWNER_AUTH_RESPONSE_INVALID')}
  if(!u||typeof u!=='object'||Array.isArray(u))return fail('OWNER_AUTH_RESPONSE_INVALID');
  if(u.id!==expected_owner_user_id||u.role!=='authenticated'||u.is_anonymous===true||
   (!u.confirmed_at&&!u.email_confirmed_at&&!u.phone_confirmed_at))
   return fail('OWNER_USER_NOT_ALLOWLISTED_OR_UNCONFIRMED');
  return Object.freeze({
   verified:true,company_id,role:'OWNER',session_active:true,
   assurance:'SERVER_VERIFIED',provider:'SUPABASE_AUTH_USER_ENDPOINT_READONLY',
   owner_id_matches_private_allowlist:true,user_metadata_used_for_permissions:false,
   session_revocation_independently_verified:false,prod_authorized:false,
   api_secret_issued:false,external_writes:0
  });
 };
}
