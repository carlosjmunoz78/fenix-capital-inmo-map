// FACT-001 Supabase Edge LAB exact metadata readback; candidate only, NOT deployed.
// One fixed GET, no request-controlled URL/method/payload. Credential server/Vault only.
import {SUPABASE_MGMT_LAB,assertServicePrincipal} from './supabase-mgmt-edge-policy.mjs';

const URL='https://api.supabase.com/v1/projects/'+SUPABASE_MGMT_LAB.project_ref+
 '/functions/'+SUPABASE_MGMT_LAB.resource_slug;
const HEX=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
const safe=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const vHash=x=>typeof x==='string'&&HEX.test(x);
export const SUPABASE_EDGE_METADATA_READ_CONTRACT=Object.freeze({
  url_scope:'fixed_supabase_management_edge_function',
  method:'GET',credential_origin:'backend_vault_only',
  project_ref:SUPABASE_MGMT_LAB.project_ref,
  resource_slug:SUPABASE_MGMT_LAB.resource_slug,
  writes_enabled:false,body_download_enabled:false
});

export async function probeSupabaseOwnedEdge({principal,token,http=fetch,now=Date.now}={}) {
 assertServicePrincipal(principal);
 if(typeof token!=='string'||token.length<24||token.length>8192||
  /\s/.test(token))fail('SB_EDGE_READ_TOKEN_DENIED');
 if(typeof http!=='function'||typeof now!=='function')fail('SB_EDGE_READ_ADAPTER_DENIED');
 const checked_at=now();
 if(!Number.isSafeInteger(checked_at)||checked_at<1)fail('SB_EDGE_READ_CLOCK_DENIED');
 let response;
 try {
  response=await http(URL,{method:'GET',headers:{Authorization:'Bearer '+token,
   Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
 } catch {fail('SB_EDGE_READ_NETWORK_UNAVAILABLE');}
 if(!response||!Number.isSafeInteger(response.status))fail('SB_EDGE_READ_UPSTREAM_UNVERIFIED');
 // A verified 404 is acceptable only for the single hardcoded synthetic slug.
 if(response.status===404) return Object.freeze({verified:true,exists:false,
  project_ref:SUPABASE_MGMT_LAB.project_ref,resource_slug:SUPABASE_MGMT_LAB.resource_slug,
  sha256:null,checked_at,metadata_only:true,mutations:0});
 if(response.status===401||response.status===403)fail('SB_EDGE_READ_AUTH_'+response.status);
 if(response.status===429)fail('SB_EDGE_READ_RATE_LIMIT');
 if(response.status!==200)fail('SB_EDGE_READ_HTTP_UNVERIFIED');
 let x;
 try{x=await response.json();}catch{fail('SB_EDGE_READ_NOT_JSON');}
 if(!safe(x)||x.slug!==SUPABASE_MGMT_LAB.resource_slug||
   typeof x.id!=='string'||x.id.length<1||x.id.length>128||
   !Number.isSafeInteger(x.version)||x.version<0||x.version>10000000||
   !['ACTIVE','INACTIVE'].includes(x.status)||!vHash(x.ezbr_sha256))
   fail('SB_EDGE_READ_SHAPE_DENIED');
 // This digest represents the function bundle, not a verified restore artifact.
 return Object.freeze({verified:true,exists:true,
  project_ref:SUPABASE_MGMT_LAB.project_ref,resource_slug:SUPABASE_MGMT_LAB.resource_slug,
  sha256:x.ezbr_sha256,version:x.version,status:x.status,
  checked_at,metadata_only:true,mutations:0});
}
