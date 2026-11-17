// FACT-001 shared read broker; fixed upstream URLs, one request per provider.
// No HTTP client URL, method, token, SQL or arbitrary provider operation may originate in command input.
export const providerSpecs=Object.freeze({
 cloudflare:Object.freeze({secret:'cerebro_fact001_cf_readonly_lab_20261109',url:'https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/d1/database?per_page=10',expected:'d1'}),
 vercel:Object.freeze({secret:'cerebro_vercel_service_token_v1',url:'https://api.vercel.com/v10/projects?teamId=team_qnh6u1Ofy2WPp0MGEKlyMA50&limit=40',expected:'projects'}),
 supabase:Object.freeze({secret:'cerebro_supabase_management_pat_v1',url:'https://api.supabase.com/v1/projects/cluhljgonannaafpmblx/functions',expected:'functions'})
});
const safe=v=>v&&typeof v==='object'&&!Array.isArray(v);
export async function readProviderInventory({provider,token,http=fetch}={}){
 const spec=providerSpecs[provider];
 if(!spec)throw Error('UNKNOWN_PROVIDER');
 if(typeof token!=='string'||token.length<20||token.length>8192)throw Error('SERVICE_TOKEN_NOT_CONFIGURED');
 const response=await http(spec.url,{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(12000)
 });
 if(!response||typeof response.status!=='number')throw Error('UPSTREAM_INVALID');
 if(response.status===401||response.status===403)throw Error('UPSTREAM_AUTH_'+response.status);
 if(response.status===429)throw Error('UPSTREAM_RATE_LIMIT');
 if(response.status!==200)throw Error('UPSTREAM_HTTP_'+response.status);
 let raw;
 try{raw=await response.json();}catch{throw Error('UPSTREAM_NOT_JSON');}
 if(!safe(raw)&&!Array.isArray(raw))throw Error('UPSTREAM_UNEXPECTED_SHAPE');
 const list=provider==='cloudflare'?raw.result:provider==='vercel'?raw.projects:raw;
 if(!Array.isArray(list))throw Error('UPSTREAM_UNVERIFIED_LIST');
 if(provider==='cloudflare'&&raw.success!==true)throw Error('CLOUDFLARE_UNSUCCESSFUL');
 // Return only aggregates and known object presence: zero personal/business details, no response headers.
 const expected=provider==='vercel'?
  ['fenix-capital-preprod','fenix-capital-preprod-app']:
  provider==='supabase'?['cerebro-fact001-cf-issuer-lab']:['cerebro-fact001-recovery-lab-eu'];
 const present=expected.map(name=>({
   name,found:list.some(x=>safe(x)&&(x.name===name||x.slug===name))
 }));
 return {status:'VERIFIED_READ',provider,object_count:list.length,known_objects:present,
  writes:0,credentials_exposed:false,backend:'shared_fact001_lab'};
}
