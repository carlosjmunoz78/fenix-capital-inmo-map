/** SEO official WordPress draft inventory -> vetted ACTGW-001 review ingress.
 * LAB-only, read-only at WordPress, bounded. The existing WP connector is injected.
 * Does NOT create a live scheduler, alter WordPress hooks or grant publish access.
 */
const SITE='https://fenixcapital.es';
const MAX=20;
const deny=reason=>({state:'BLOCKED',reason,wordpress_writes:0,publications:0,prod_bridge_activated:false});
export async function scanSeoOfficialDraftsLab({
 company_id='fenix',site_origin=SITE,listDrafts,ingress,max_items=MAX,
}={}){
 if(company_id!=='fenix'||site_origin!==SITE)return deny('SCOPE_MISMATCH');
 if(typeof listDrafts!=='function'||typeof ingress?.observe!=='function')return deny('TRUSTED_READER_UNBOUND');
 if(!Number.isSafeInteger(max_items)||max_items<1||max_items>MAX)return deny('LIMIT_INVALID');
 let results;
 try{
  results=await listDrafts({company_id,site_origin,post_type:'post',status:'draft',
   orderby:'modified',order:'DESC',per_page:max_items,page:1,purpose:'SEO_REVIEW_READ_ONLY'});
 }catch{return deny('WP_DRAFT_READ_FAILURE');}
 if(!results||!Array.isArray(results.posts)||!Number.isSafeInteger(results.total)||
    results.total<0||results.posts.length>max_items)return deny('WP_DRAFT_INVENTORY_INVALID');
 const ids=new Set();
 for(const item of results.posts){
  if(!item||!Number.isSafeInteger(item.ID)||item.ID<1||
   ids.has(item.ID)||item.type!=='post'||item.status!=='draft'||
   typeof item.slug!=='string'||!/^[a-z0-9-]{5,150}$/.test(item.slug)){
    return deny('WP_DRAFT_INVENTORY_UNTRUSTED');
  }
  ids.add(item.ID);
 }
 const seen=new Set(),review=[],skipped=[],failed=[];
 for(const item of results.posts){
  seen.add(item.ID);
  if(/(?:^|[-_])(?:archive|archived|legacy)(?:$|[-_])/.test(item.slug)){
   skipped.push({post_id:item.ID,reason:'HISTORIC_DRAFT_HELD'});
   continue;
  }
  let outcome;
  try{outcome=await ingress.observe({company_id,site_origin,post_id:item.ID,event_kind:'DRAFT_OBSERVED'});}
  catch{outcome={status:'BLOCKED',reason:'READ_INGRESS_EXCEPTION'};}
  if(outcome?.status==='ACTION_EXECUTED'&&
   outcome?.result?.status==='WP_OFFICIAL_DRAFT_REVIEW_RECEIVED_LAB'&&
   outcome.result.post_id===item.ID&&outcome.result.wordpress_write===false&&
   outcome.result.publish_authorized===false){
   review.push({post_id:item.ID,job_id:outcome.result.job_id,
    duplicate:outcome.result.duplicate,review_version:outcome.result.version_digest});
  }else failed.push({post_id:item.ID,reason:'READ_GATE_REJECTED'});
 }
 return {state:'LAB_READONLY_DRAFT_INVENTORY_SCANNED',
  company_id,site_origin,scanned:seen.size,review_jobs:review,
  historical_held:skipped,rejected:failed,total_wordpress_drafts:results.total,
  truncated:results.total>results.posts.length,
  posts_reviewed_new:review.filter(x=>x.duplicate===false).length,
  posts_reviewed_duplicate:review.filter(x=>x.duplicate===true).length,
  pages_not_processed:true,wordpress_writes:0,publications:0,
  prod_bridge_activated:false,scheduler_enabled:false,
  additional_subscriptions_eur:0};
}
