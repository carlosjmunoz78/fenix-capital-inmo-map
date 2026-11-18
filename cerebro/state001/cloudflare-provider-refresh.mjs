/** STATE-001 · Cloudflare discovery refresh, one GET, scrub resource names before GitHub write.
 * Read-only provider API. Only refreshes non-sensitive snapshot on dedicated data branch.
 * No App/CRM/Supabase/Auth/DNS/Worker changes, never infers runtime health.
 */
import fs from 'node:fs/promises';
const repo='carlosjmunoz78/fenix-capital-inmo-map';
const branch='cerebro/state001-provider-feed-20261118';
const path='cerebro/state001/provider-discovery.v1.json';
const accountId='e39a57e1ac42650ca5a6d5307cf0ac8e';
const ghToken=process.env.GITHUB_TOKEN;
const cfToken=process.env.CEREBRO_CLOUDFLARE_API_TOKEN;
if(!ghToken||!cfToken||process.env.GITHUB_REPOSITORY!==repo)throw Error('MISSING_ALLOWED_CREDENTIAL_OR_REPO');
const ghHeaders={authorization:'Bearer '+ghToken,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'};
async function get(url,headers){
 const response=await fetch(url,{method:'GET',headers,signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store'});
 if(!response.ok)throw Error('READ_FAILED_HTTP_'+response.status);
 return response.json();
}
const catalog=JSON.parse(await fs.readFile('cerebro/registry/engine-registry.v1.json','utf8'));
if(catalog.count!==179||catalog.engine_ids?.length!==179||new Set(catalog.engine_ids).size!==179)throw Error('CANONICAL_ENGINE_DRIFT');
const url='https://api.github.com/repos/'+repo+'/contents/'+path+'?ref='+branch;
const current=await get(url,ghHeaders);
const baseline=JSON.parse(Buffer.from(current.content,'base64').toString('utf8'));
if(current.sha===undefined||baseline.schema!=='CEREBRO_PROVIDER_DISCOVERY_V1'||baseline.company_id!=='fenix'||baseline.canonical_engines!==179)
 throw Error('PROVIDER_SNAPSHOT_CONTRACT_DRIFT');
const cf=await get('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/scripts',{
 authorization:'Bearer '+cfToken,'content-type':'application/json'});
if(cf.success!==true||!Array.isArray(cf.result)||cf.result.length>1000)throw Error('CLOUDFLARE_READ_UNAVAILABLE');
const workers=cf.result.map(x=>String(x.id??''));
if(workers.some(n=>!n||n.length>255)||new Set(workers).size!==workers.length)throw Error('INVALID_CLOUDFLARE_SCRIPT_NAMES');
const strict=(id)=>new RegExp('(?:^|[^A-Z0-9])'+id.replace(/-/g,'-?')+'(?=[^A-Z0-9]|$)','i');
const existing=new Map((baseline.engine_candidates||[]).map(x=>[x.engine_id,Number(x.supabase_function_count||0)]));
const counts=catalog.engine_ids.map(engine_id=>({engine_id,cloudflare_worker_count:workers.filter(n=>strict(engine_id).test(n)).length,
 supabase_function_count:existing.get(engine_id)||0})).filter(x=>x.cloudflare_worker_count||x.supabase_function_count);
const now=new Date().toISOString();
const snapshot={
 ...baseline,generated_at:now,canonical_engines:179,engine_candidates:counts,engine_candidates_count:counts.length,
 providers:{
  ...baseline.providers,
  cloudflare:{metadata_observed:true,worker_scripts_total:workers.length,
   lab_named:workers.filter(n=>/lab|canary|staging|preprod/i.test(n)).length,
   observed_at:now,source:'CLOUDFLARE_WORKERS_LIST_API'},
  supabase:{...baseline.providers.supabase,observed_at:baseline.providers.supabase.observed_at||baseline.generated_at}
 },
 unmatched_resources:{
  ...baseline.unmatched_resources,
  cloudflare_workers:workers.filter(n=>!catalog.engine_ids.some(id=>strict(id).test(n))).length
 },
 update_mode:'HOURLY_CLOUDFLARE_ONLY_SUPABASE_REQUIRES_MGMT_CREDENTIAL',
 semantic_limits:'Metadata only. Worker/function existence is not execution or a profile runtime proof.',
 field_security:'Aggregate provider totals and existing canonical engine IDs only; zero names/keys/logs/customer data'
};
if(snapshot.providers.cloudflare.worker_scripts_total<0||snapshot.providers.supabase.edge_functions_total<0||
 snapshot.unmatched_resources.cloudflare_workers>workers.length)throw Error('COUNT_DRIFT');
const content=Buffer.from(JSON.stringify(snapshot,null,2)+'\n').toString('base64');
const response=await fetch('https://api.github.com/repos/'+repo+'/contents/'+path,{
 method:'PUT',headers:ghHeaders,signal:AbortSignal.timeout(15000),redirect:'error',
 body:JSON.stringify({message:'data(state001): hourly Cloudflare provider inventory refresh, sanitized',content,sha:current.sha,branch})
});
if(!response.ok)throw Error('GITHUB_FEED_UPDATE_FAILED_HTTP_'+response.status);
const report={status:'UPDATED',provider:'CLOUDFLARE',workers:workers.length,
 candidates:counts.filter(x=>x.cloudflare_worker_count>0).length,public_names_written:0,
 supabase_refresh:'NOT_AUTHORIZED_MGMT_TOKEN',money_eur:0};
console.log(JSON.stringify(report));
