// FACT-001 · Five CEREBRO providers, one signed read-only runner; no ChatGPT OAuth.
// The GitHub Actions runner has its OWN repository-scoped token. Cloudflare, Vercel,
// Supabase and Notion are accessed through the existing OIDC+Vault CEREBRO broker.
// No arbitrary provider URL, SQL, token, body or write action accepted in orders.
export const SCOPED_READ_ORDER=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'providers.five.inventory.read',provider_set:'cloudflare,vercel,supabase,notion,github',max_cost_eur:0});
const BROKER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-headless-provider-lab';
const GH='https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/contents/cerebro/connectors/universal/src/headless.mjs?ref=cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109';
const VALID=/^FACT001-FIVE-READ-20261112-[A-Z0-9-]{3,24}$/;
const stop=code=>{throw Error(code)};
export function assertFiveReadOrder(order){
 if(!order||typeof order!=='object'||Array.isArray(order)||Object.keys(order).sort().join(',')!==[...Object.keys(SCOPED_READ_ORDER),'request_id'].sort().join(',')||Object.entries(SCOPED_READ_ORDER).some(([k,v])=>order[k]!==v)||!VALID.test(order.request_id))stop('FIVE_READ_ORDER_DENIED');
 return Object.freeze({...order});
}
export async function runFiveProviderRead({order,fetchImpl=fetch,sign,githubToken}={}){
 const o=assertFiveReadOrder(order);
 if(typeof sign!=='function'||typeof fetchImpl!=='function'||typeof githubToken!=='string'||githubToken.length<20||githubToken.length>8192||/\s/.test(githubToken))stop('FIVE_READ_SERVICE_IDENTITY_REQUIRED');
 const brokerOrder={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'provider.inventory.read',request_id:'FACT001-HEADLESS-PROVIDER-READ-20261110'};
 const receipts=[];
 const safeResponse=async(r,label)=>{
  if(!r||!Number.isSafeInteger(r.status))stop('FIVE_READ_RESPONSE_INVALID_'+label);
  let data;try{data=await r.json()}catch{stop('FIVE_READ_RESPONSE_JSON_'+label)}
  return {http:r.status,data};
 };
 const call=async(path,token,body)=>{
  let response;
  try{response=await fetchImpl(BROKER+'/'+path,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)})}
  catch{stop('FIVE_READ_BROKER_NETWORK_'+path.toUpperCase())}
  return safeResponse(response,path);
 };
 // OIDC assertion happens in existing running backend, independently re-sign each request.
 for(const provider of ['cloudflare','vercel','supabase']){
  const jwt=await sign('cerebro-fact001-provider-headless-lab-v1');
  const r=await call('verify',jwt,{...brokerOrder,provider});
  if(r.http!==200||r.data?.provider!==provider||r.data?.status!=='VERIFIED_READ'||r.data?.credentials_exposed!==false||r.data?.writes!==0||!Number.isSafeInteger(r.data.object_count))stop('FIVE_READ_PROVIDER_'+provider.toUpperCase()+'_DENIED');
  receipts.push({provider,result:'VERIFIED_READ',object_count:r.data.object_count,provider_writes:0});
 }
 const notion=await call('notion-workspace',await sign('cerebro-fact001-provider-headless-lab-v1'),{...brokerOrder,operation:'notion.workspace.read',request_id:'FACT001-NOTION-WORKSPACE-20261110'});
 if(notion.http!==200||notion.data?.status!=='NOTION_INDEPENDENT_WORKSPACE_READ'||notion.data?.provider!=='notion'||notion.data?.content_returned!==false||notion.data?.credentials_exposed!==false||notion.data?.write_operations!==0)stop('FIVE_READ_NOTION_DENIED');
 receipts.push({provider:'notion',result:'VERIFIED_READ',object_count:notion.data.accessible_objects_returned,provider_writes:0});
 let gh;
 try{gh=await fetchImpl(GH,{method:'GET',headers:{Authorization:'Bearer '+githubToken,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(12000)})}
 catch{stop('FIVE_READ_GITHUB_NETWORK')}
 const git=await safeResponse(gh,'github');
 if(git.http!==200||git.data?.type!=='file'||git.data?.name!=='headless.mjs'||typeof git.data?.sha!=='string'||!/^[a-f0-9]{40}$/.test(git.data.sha))stop('FIVE_READ_GITHUB_DENIED');
 receipts.push({provider:'github',result:'VERIFIED_READ',repository_scoped:true,provider_writes:0});
 if(receipts.length!==5||new Set(receipts.map(r=>r.provider)).size!==5)stop('FIVE_READ_INCOMPLETE');
 return {status:'FIVE_CEREBRO_PROVIDER_READ_VERIFIED_LAB',request_id:o.request_id,scope:'fenix-capital/FACT-001/LAB/1.0.0',providers:receipts,cost_eur_contract:0,credentials_exposed:false,provider_writes:0,persistent_autonomy_ready:false};
}
