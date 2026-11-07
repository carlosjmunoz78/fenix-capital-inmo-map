/**
 * CUT51 · Anonymous remote smoke against exact, pre-existing LAB Workers.
 * NO cookies, Access identity, secrets, API tokens, writes, deployment,
 * redirects followed, or Cloudflare administrative mutations.
 * Status "NO_GO" is immutable until separate authenticated and anonymous
 * physical E2E, owner B2 device enrollment, and B3/Gateway gates succeed.
 */
export const WORKER_ENDPOINTS=Object.freeze([
 Object.freeze({id:'CUT30_ORIGINAL',
  url:'https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev/__jarvis/owner-check'}),
 Object.freeze({id:'CUT32_PARALLEL',
  url:'https://cerebro-jarvis-cut32-lab-eu.carlosj-munozcabeza.workers.dev/__jarvis/owner-check'})
]);
export function classifyAnonymousAccess(status,location=''){
 if(!Number.isInteger(status)||status<100||status>599)
  return Object.freeze({classification:'NO_HTTP_EVIDENCE',public_exposure:false,access_proven:false});
 if(status>=200&&status<300)
  return Object.freeze({classification:'PUBLIC_2XX_SECURITY_BLOCKER',public_exposure:true,access_proven:false});
 if(status>=300&&status<400){
  let access=false;
  try{
   const link=new URL(location);
   access=link.protocol==='https:'&&
    link.hostname.endsWith('.cloudflareaccess.com')&&
    link.pathname.startsWith('/cdn-cgi/access/');
  }catch{}
  return Object.freeze({classification:access?'ACCESS_CHALLENGE_OBSERVED':'REDIRECT_UNVERIFIED',
   public_exposure:false,access_proven:access});
 }
 if(status===401||status===403)
  return Object.freeze({classification:'ANONYMOUS_DENIAL_OBSERVED_SOURCE_UNVERIFIED',
   public_exposure:false,access_proven:false});
 if(status===404||status===530)
  return Object.freeze({classification:'OFF_OR_UNAVAILABLE_NOT_ACCESS_PROOF',
   public_exposure:false,access_proven:false});
 return Object.freeze({classification:'HTTP_STATUS_INCONCLUSIVE',
  public_exposure:false,access_proven:false});
}
export async function checkAnonymousAccess({fetchImpl=fetch,timeoutMs=10000}={}){
 const results=[];
 for(const target of WORKER_ENDPOINTS){
  let response;
  try{
   response=await fetchImpl(target.url,{method:'GET',redirect:'manual',
    headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
  }catch{
   results.push(Object.freeze({id:target.id,http_status:null,
    ...classifyAnonymousAccess(null)}));
   continue;
  }
  results.push(Object.freeze({id:target.id,http_status:response.status,
    ...classifyAnonymousAccess(response.status,response.headers.get('location')??'')}));
 }
 const publicExposure=results.some(r=>r.public_exposure);
 return Object.freeze({environment:'LAB',check:'ANONYMOUS_NETWORK_NEGATIVE_ONLY',
  production_authorized:false,access_runtime_certified:false,
  physical_owner_mission_certified:false,
  release_gate:'NO_GO',public_exposure_detected:publicExposure,results});
}
if(process.argv.includes('--probe')){
 const result=await checkAnonymousAccess();
 // Intentionally never print response body, redirect, cookies, user data or tokens.
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(result.public_exposure_detected)process.exitCode=1;
}
