/** SEO-001: owner-ordered STAGING suspension; pure input gate. NO network or hosting calls. */
import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync(new URL('../seo-staging-suspension-v1.json',import.meta.url),'utf8'));
const HOST='staging.fenixcapital.es';
const matchesStage=value=>{
 if(typeof value!=='string')return false;
 // Blocks literal host, ports, URL forms, mixed-case and nested stage subdomains.
 return /(?:^|[^a-z0-9_-])(?:[a-z0-9_-]+\\.)*staging\\.fenixcapital\\.es(?:\\.|(?=$|[^a-z0-9_.-]))/i.test(value);
};
function configValid(){
 return config.company_id==='fenix'&&config.engine_id==='SEO-001'&&
   config.host===HOST&&config.staging_off===true&&
   config.allow_staging_requests===false&&config.allow_staging_jobs===false&&
   config.allow_staging_schedulers===false&&config.owner_reactivation_required===true;
}
export function requireSeoStagingOff(order={}){
 if(!configValid())throw Error('SEO_STAGING_SUSPENSION_POLICY_INVALID');
 if(!order||typeof order!=='object'||Array.isArray(order))throw Error('SEO_STAGING_SUSPENSION_INVALID_ORDER');
 const fields=['source_url','target_url','web_source','site_url','base_url','endpoint',
  'domain','hostname','operational_source','webhook_url','crawl_url'];
 const sources=Array.isArray(order.source_refs)?order.source_refs:[];
 if(fields.some(k=>matchesStage(order[k]))||sources.some(matchesStage)||
  /^(?:STAGING|WEB_STAGING)$/i.test(String(order.target_environment||''))||
  /^(?:STAGING|WEB_STAGING)$/i.test(String(order.environment||'')))
  throw Error('SEO_STAGING_SUSPENDED_UNTIL_OWNER_ORDER');
 return true;
}
export function seoStagingSuspensionStatus(){
 if(!configValid())throw Error('SEO_STAGING_SUSPENSION_POLICY_INVALID');
 return {company_id:'fenix',engine_id:'SEO-001',host:HOST,
  staging_off:true,allow_staging_requests:false,allow_staging_jobs:false,
  owner_reactivation_required:true,network_calls_by_this_module:0,
  hostinger_resource_consumption_verified:false};
}
