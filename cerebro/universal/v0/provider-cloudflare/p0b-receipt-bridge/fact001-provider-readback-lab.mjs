/** LAB-only provider readback for FACT-001 completed job.
 * GET-only Cloudflare API. No resources are created, modified or deleted here.
 * Every provider field must be established from the actual response; no inferred zeros.
 */
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const ZONE='a00ec81375b4acb02f9bd6e0fd64942f';
const API='https://api.cloudflare.com/client/v4';
const SAFE=/^cerebro-fact001-managed-lab-[a-z0-9]{4,20}$/;
const OPS=new Set(['worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private']);
const deny=reason=>({status:'NOT_CERTIFIED',reason,provider:null,readback:null,prod_promotion_allowed:false});
export async function observeFact001CloudflareWorkerLabV0({token,name,operation,fetchImpl=fetch,clock=Date.now}={}){
 if(typeof token!=='string'||token.length<24||!SAFE.test(name||'')||
    !OPS.has(operation)||typeof fetchImpl!=='function'||typeof clock!=='function')
  return deny('OBSERVATION_SCOPE_INVALID');
 const request=async(path,allow404=false)=>{
  const res=await fetchImpl(API+path,{method:'GET',
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(allow404&&res?.status===404)return {status:404,body:null};
  if(res?.status!==200)throw Error('PROVIDER_HTTP_UNAVAILABLE');
  let body;try{body=await res.json()}catch{throw Error('PROVIDER_JSON_INVALID')}
  if(body?.success!==true)throw Error('PROVIDER_RESPONSE_INVALID');
  return {status:200,body};
 };
 const url='/accounts/'+ACCOUNT+'/workers/scripts';
 try{
  const scripts=await request(url+'?per_page=100');
  const routes=await request('/zones/'+ZONE+'/workers/routes');
  const domains=await request('/accounts/'+ACCOUNT+'/workers/domains');
  const scriptRows=scripts.body.result,routeRows=routes.body.result,domainRows=domains.body.result;
  if(!Array.isArray(scriptRows)||!Array.isArray(routeRows)||!Array.isArray(domainRows)||
    scripts.body.result_info?.total_pages>1||
    domains.body.result_info?.total_pages>1)return deny('PROVIDER_INVENTORY_INCOMPLETE');
  if(scriptRows.some(s=>!s||typeof s.id!=='string')||
    routeRows.some(r=>!r||typeof r.script!=='string')||
    domainRows.some(d=>!d||typeof d.service!=='string'))
   return deny('PROVIDER_INVENTORY_SHAPE_INVALID');
  const inList=scriptRows.some(s=>s.id===name);
  const routesCount=routeRows.filter(r=>r.script===name).length;
  const domainsCount=domainRows.filter(d=>d.service===name).length;
  if(routesCount!==0||domainsCount!==0)return deny('PROVIDER_HAS_PUBLIC_ROUTES');
  const deleted=operation==='worker.delete_private';
  if(deleted){
   if(inList)return deny('WORKER_STILL_PRESENT');
   const script=await fetchImpl(API+url+'/'+name,{method:'GET',headers:{Authorization:'Bearer '+token},
    redirect:'manual',signal:AbortSignal.timeout(12000)});
   if(script?.status!==404)return deny('DELETED_SCRIPT_404_NOT_CONFIRMED');
   const observed=clock();
   if(!Number.isSafeInteger(observed)||observed<=0)return deny('OBSERVATION_TIME_INVALID');
   return {status:'PROVIDER_READBACK',provider:{
    name,account_id:ACCOUNT,exists:false,api_read_success:true,
    list_read_success:true,script_get_http_status:404,workers_dev_enabled:false,
    preview_urls_enabled:false,bindings_count:0,crons_count:0,
    routes_count:0,domains_count:0,version_id:null
   },readback:{source:'CLOUDFLARE_PROVIDER_API',name,exists:false,version_id:null,
    observed_at_ms:observed},observed_at_ms:observed,prod_promotion_allowed:false};
  }
  if(!inList)return deny('WORKER_NOT_IN_ACCOUNT_INVENTORY');
  const scriptStatus=await fetchImpl(API+url+'/'+name,{method:'GET',
   headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(scriptStatus?.status!==200)return deny('WORKER_GET_NOT_CONFIRMED');
  const [sub,schedules,settings,deps]=await Promise.all([
   request(url+'/'+name+'/subdomain'),request(url+'/'+name+'/schedules'),
   request(url+'/'+name+'/settings'),request(url+'/'+name+'/deployments')
  ]);
  const flags=sub.body.result,cron=schedules.body.result,bindings=settings.body.result?.bindings;
  const deployments=deps.body.result?.deployments||deps.body.result;
  const version=Array.isArray(deployments)?deployments[0]?.versions?.[0]?.version_id:null;
  if(!flags||flags.enabled!==false||flags.previews_enabled!==false||
     !cron||!Array.isArray(cron.schedules)||cron.schedules.length!==0||
     !Array.isArray(bindings)||bindings.length!==0||
     typeof version!=='string'||!/^[0-9a-f-]{36}$/i.test(version))
   return deny('PRIVATE_CONFIG_OR_DEPLOYMENT_NOT_VERIFIED');
  const observed=clock();
  if(!Number.isSafeInteger(observed)||observed<=0)return deny('OBSERVATION_TIME_INVALID');
  return {status:'PROVIDER_READBACK',provider:{
   name,account_id:ACCOUNT,exists:true,api_read_success:true,
   workers_dev_enabled:false,preview_urls_enabled:false,
   bindings_count:0,crons_count:0,routes_count:0,domains_count:0,
   version_id:version
  },readback:{source:'CLOUDFLARE_PROVIDER_API',name,exists:true,
   version_id:version,observed_at_ms:observed},observed_at_ms:observ,
   prod_promotion_allowed:false};
 }catch{return deny('PROVIDER_GET_OR_PERMISSION_FAILURE');}
}
