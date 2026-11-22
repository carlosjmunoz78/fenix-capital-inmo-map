/** SEO-001 official WP draft read ingress through ACTGW-001 and JOB-001 (LAB only).
 * Existing trusted WordPress connector must be injected by host. This module never
 * makes HTTP requests, stores secrets, deploys WP code, grants approval or publishes.
 */
import {randomUUID} from 'node:crypto';
import {buildSeoDraftReviewPacket,queueSeoDraftReviewLab} from './seo-draft-review-queue-v0.mjs';

const CAPABILITY='seo.wp-official.readonly-draft-review.v0';
const ORIGIN='https://fenixcapital.es';
const DENY=reason=>({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',
 detail:reason,executed:false,prod_authorized:false,wordpress_write:false});
const validPostId=x=>Number.isSafeInteger(x)&&x>=1;
const ctx={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'};
const verifiedSource=v=>v?.verified===true&&v.company_id==='fenix'&&
 v.site_origin===ORIGIN&&v.access==='READ_ONLY'&&v.provider==='CONNECTED_WORDPRESS'&&
 v.assurance==='SERVER_VERIFIED'&&v.session_active===true;
export function attachSeoOfficialDraftReadIngressLab({
 actionGateway,verifyTrustedWordPressConnector,readPost,readYoast,job_journal_path
}={}){
 if(actionGateway?.contract?.().environment!=='PREPROD'||
   typeof actionGateway?.registerCapability!=='function'||
   typeof actionGateway?.execute!=='function')throw Error('SEO_WP_TRUSTED_PREPROD_GATEWAY_REQUIRED');
 if([verifyTrustedWordPressConnector,readPost,readYoast].some(x=>typeof x!=='function')||
    typeof job_journal_path!=='string'||job_journal_path.length===0)
  throw Error('SEO_WP_TRUSTED_READ_PROVIDER_REQUIRED');
 const tickets=new Map();
 actionGateway.registerCapability(CAPABILITY,async ({context,payload})=>{
  const token=payload?.ticket;
  const ticket=tickets.get(token);
  if(!ticket||ticket.used||ticket.post_id!==payload.post_id||
    context.company_id!=='fenix'||context.environment!=='PREPROD'||
    context.engine_id!=='ACTGW-001')return DENY('NO_TRUSTED_READ_EVENT_TICKET');
  ticket.used=true;tickets.delete(token);
  if(!ticket.provider_verified)return DENY('WP_PROVIDER_NOT_VERIFIED');
  try{
   const post=await readPost({post_id:ticket.post_id,company_id:'fenix',
     site_origin:ORIGIN,purpose:'READ_POST_DRAFT'});
   const seo=await readYoast({post_id:ticket.post_id,company_id:'fenix',
     site_origin:ORIGIN,purpose:'READ_YOAST_META'});
   // Always re-read canonical post and SEO from trusted provider; never trust webhook
   // caller supplied content, status, owner flags, or permissions.
   const record=Array.isArray(seo)?seo.find(x=>x.post_id===ticket.post_id):seo;
   if(post?.ID!==ticket.post_id||record?.post_id!==ticket.post_id)
    return DENY('WORDPRESS_POST_ID_REBINDING_DENIED');
   const packet=buildSeoDraftReviewPacket({post,yoast:record,company_id:'fenix'});
   if(!packet.seo_metadata_present)return DENY('WORDPRESS_DRAFT_SEO_NOT_READY');
   const queued=queueSeoDraftReviewLab({file_path:job_journal_path,packet});
   if(queued.status!=='QUEUED_FOR_REVIEW_LAB_NOT_PUBLISHING')
    return DENY('JOB001_DRAFT_REVIEW_QUEUE_REJECTED');
   return {status:'WP_OFFICIAL_DRAFT_REVIEW_RECEIVED_LAB',
    post_id:ticket.post_id,post_status:'draft',
    job_id:queued.job_id,duplicate:queued.duplicate,
    version_digest:packet.content_sha256,
    wordpress_read_verified:true,owner_approved:false,
    publication_counted_for_autonomy:0,job_environment:'PREPROD',
    wordpress_write:false,publish_authorized:false,prod_authorized:false,
    independent_visual_qa_verified:false,additional_subscription_eur:0};
  }catch{return {status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',
   detail:'WP_DRAFT_OR_SEO_PROVIDER_READ_FAILED_CLOSED',
   executed:false,wordpress_write:false,prod_authorized:false};}
 });
 return Object.freeze({
  capability:CAPABILITY,environment:'PREPROD',
  async observe({company_id='fenix',site_origin=ORIGIN,post_id,event_kind='DRAFT_OBSERVED'}={}){
   if(company_id!=='fenix'||site_origin!==ORIGIN||!validPostId(post_id)||
      event_kind!=='DRAFT_OBSERVED')return DENY('EVENT_SCOPE_INVALID');
   let verification;
   try{
    verification=await verifyTrustedWordPressConnector({
     company_id:'fenix',site_origin:ORIGIN,required_access:'READ_ONLY'});
   }catch{return DENY('CONNECTED_WORDPRESS_AUTH_UNAVAILABLE');}
   if(!verifiedSource(verification))return DENY('CONNECTED_WORDPRESS_READ_IDENTITY_UNVERIFIED');
   const ticket=randomUUID();
   tickets.set(ticket,{post_id,provider_verified:true,used:false});
   try{
    return await actionGateway.execute({context:ctx,capability:CAPABILITY,
     idempotency_key:'wp-draft-observation-'+ticket,
     authorized:true,risk:'LOW',requires_prod_write:false,
     estimated_additional_cost_eur:0,
     payload:{ticket,post_id}});
   }finally{tickets.delete(ticket);}
  },
  facts:Object.freeze({
   company_id:'fenix',site_origin:ORIGIN,live_wp_connector_mount_verified:false,
   existing_wp_hooks_changed:false,production_publisher_connected:false,
   cron_schedule_enabled:false,uses_shared_job001:true,
   automatic_owner_approval:false,extra_eur:0
  })
 });
}
