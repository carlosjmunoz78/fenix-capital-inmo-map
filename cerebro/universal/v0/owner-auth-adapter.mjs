const ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const SCOPES=Object.freeze(['cerebro:universal:read','cerebro:factory:inspect','cerebro:invoke:read','cerebro:command:dryrun','cerebro:jobs:read','cerebro:audit:read']);
export function createFenixOwnerContextResolverV0({apiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof apiKey!=='string'||apiKey.length<12)throw Error('SERVER_PUBLISHABLE_KEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 return async function verify(session_token){
  if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('AUTH_DENIED');
  let response;
  try{response=await fetchImpl(ENDPOINT,{method:'GET',headers:{authorization:'Bearer '+session_token,apikey:apiKey,accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});}
  catch{throw Error('AUTH_UPSTREAM_UNAVAILABLE');}
  if(response?.status!==200)throw Error('AUTH_DENIED');
  let raw;try{raw=await response.json();}catch{throw Error('AUTH_DENIED');}
  const context=raw?.context??raw;
  if(!context||typeof context!=='object'||context.actor_code!=='CARLOS-ADMIN'||raw?.ok===false)throw Error('AUTH_DENIED');
  // Company grant remains Fenix only, from pre-existing owner identity. Other companies require separate membership proof.
  return Object.freeze({actor_id:'CARLOS-ADMIN',company_ids:Object.freeze(['fenix']),scopes:SCOPES,auth_source:'SERVER_VERIFIED_FENIX_CONTEXT'});
 };
}
export const OWNER_AUTH_V0=Object.freeze({environment:'LAB',upstream_method:'GET',upstream_path:'fenix-app-gateway/session/context',actor:'CARLOS-ADMIN',companies:['fenix'],prod_mutations:false,additional_cost_eur:0});
