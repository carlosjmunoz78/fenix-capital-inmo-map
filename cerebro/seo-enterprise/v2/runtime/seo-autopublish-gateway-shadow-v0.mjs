/**
 * SEO001 scoped autopublishing decision adapter for EXISTING ACTGW-001 PREPROD.
 * This is a read-only SHADOW of the future publishing gate. No WP imports,
 * credential persistence, private backups, paid APIs or actual publication.
 * All attestations must come from server-supplied verifier callbacks, never
 * from the requesting actor. Tests use SYNTHETIC fixtures, NOT real approvals.
 */
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs';
const CAPABILITY='seo001.autopublish.shadow.v0';
const SHA=/^[a-f0-9]{64}$/;
const WORK=/^SEO001-FENIX-[A-Z0-9-]{6,95}$/;
const ID=/^[a-zA-Z0-9_-]{5,90}$/;
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HUMAN=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE',
 'HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const POLICY=JSON.parse(fs.readFileSync(new URL('../seo-prod-draft-autopublish-policy-v0.json',import.meta.url),'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function block(reason,code){
 if(!HUMAN.has(reason))throw Error('SEO_SHADOW_INVALID_EXCEPTION');
 return {status:'HUMAN_REQUIRED',reason,code,executed:false,
  wordpress_writes:0,production_publish_authorized:false,
  simulated_only:true,additional_cost_eur:0};
}
function ready(stage,request,successfulCount){
 return {status:stage,work_id:request.work_id,content_sha256:request.content_sha256,
  company_id:request.company_id,content_class:request.content_class,slug:request.slug,
  verified_prior_publication_count:successfulCount,
  owner_approval_required_for_current_item:stage==='SHADOW_SUPERVISED_APPROVAL_PRESENT',
  actual_cms_actor_grant_verified:false,
  production_publish_authorized:false,production_writer_connected:false,
  execute_wordpress_operation:false,wordpress_writes:0,
  simulated_only:true,additional_cost_eur:0};
}
function scopedRequest(r){
 return r&&r.company_id==='fenix'&&r.engine_id==='SEO-001'&&
  r.environment==='PREPROD'&&r.version==='0.1.0'&&
  r.site_origin==='https://fenixcapital.es'&&
  WORK.test(r.work_id||'')&&SHA.test(r.content_sha256||'')&&
  SLUG.test(r.slug||'')&&
  ['STANDARD_BLOG','STANDARD_LOCAL_LANDING','FINANCIAL_MORTGAGE'].includes(r.content_class);
}
function vettedRelease(x,r,now_ms){
 return x&&x.company_id===r.company_id&&x.engine_id==='SEO-001'&&
  x.site_origin===r.site_origin&&x.content_class===r.content_class&&
  x.status==='PUBLISHED_VERIFIED'&&x.owner_exact_sha_approved===true&&
  x.owner_approval_assurance==='SERVER_VERIFIED'&&
  x.independent_qa_approved===true&&x.physical_release_audited===true&&
  ID.test(x.release_id||'')&&SHA.test(x.content_sha256||'')&&SLUG.test(x.slug||'')&&
  Number.isSafeInteger(x.published_at_ms)&&x.published_at_ms>0&&x.published_at_ms<=now_ms;
}
function priorPublicationCount(state,r,now_ms){
 if(!Array.isArray(state?.successful_new_url_publications)||
  state.successful_new_url_publications.length>10000)return null;
 const uniq=new Set(),slugs=new Set();
 for(const x of state.successful_new_url_publications){
  if(!vettedRelease(x,r,now_ms))return null; // fail closed on corrupt private ledger
  if(uniq.has(x.release_id)||slugs.has(x.slug))return null;
  uniq.add(x.release_id);slugs.add(x.slug);
 }
 return uniq.size;
}
function validOwnerGrant(g,r,now_ms){
 return g?.verified===true&&g.assurance==='SERVER_VERIFIED'&&
  g.signature_verified===true&&g.revoked===false&&
  g.company_id===r.company_id&&g.engine_id==='SEO-001'&&
  g.site_origin===r.site_origin&&g.content_class===r.content_class&&
  ID.test(g.grant_id||'')&&
  typeof g.allowed_slug_prefix==='string'&&
  /^[a-z0-9]+(?:-[a-z0-9]+)*-?$/.test(g.allowed_slug_prefix)&&
  r.slug.startsWith(g.allowed_slug_prefix)&&
  Number.isSafeInteger(g.issued_at_ms)&&Number.isSafeInteger(g.expires_at_ms)&&
  g.issued_at_ms<=now_ms&&g.expires_at_ms>now_ms&&g.expires_at_ms>g.issued_at_ms;
}
function validItem(item,r,now_ms){
 return item?.company_id===r.company_id&&
  item.work_id===r.work_id&&item.content_sha256===r.content_sha256&&
  item.content_class===r.content_class&&item.slug===r.slug&&
  item.independent_editorial_qa_approved===true&&
  item.original_media_license_verified===true&&
  item.global_media_duplicate_check_passed===true&&
  item.live_slug_collision_free===true&&
  item.source_citations_checked===true&&
  ID.test(item.author_principal_id||'')&&ID.test(item.reviewer_principal_id||'')&&
  item.author_principal_id!==item.reviewer_principal_id&&
  Number.isSafeInteger(item.slug_verified_at_ms)&&item.slug_verified_at_ms<=now_ms&&
  item.slug_verified_at_ms>=now_ms-10*60*1000;
}
export function evaluateSeoAutopublishShadow({request,actor,evidence,now_ms}={}){
 if(!Number.isSafeInteger(now_ms)||now_ms<0||!scopedRequest(request))
  return block('POLICY_CONFLICT','REQUEST_SCOPE_INVALID');
 if(POLICY.state!=='DEFINED_NOT_LIVE_CONNECTED'||
   POLICY.environment!=='POLICY_LAB_NOT_ENFORCED'||
   POLICY.lifecycle?.current_scoped_autopublish_grant_present!==false||
   POLICY.physical_state?.real_auto_publish_enabled!==false)
  return block('POLICY_CONFLICT','POLICY_NOT_LAB_SHADOW');
 if(actor?.verified!==true||actor.assurance!=='SERVER_VERIFIED'||
   actor.company_id!==request.company_id||actor.role!=='SEO_PUBLISHER_SHADOW'||
   !ID.test(actor.principal_id||''))
  return block('POLICY_CONFLICT','ACTOR_IAM_NOT_VERIFIED');
 if(evidence?.assurance!=='SERVER_VERIFIED'||evidence.company_id!==request.company_id||
   evidence.engine_id!=='SEO-001'||evidence.environment!=='PREPROD_SHADOW'||
   evidence.version!=='0.1.0'||evidence.source_kind!=='TRUSTED_PRIVATE_LEDGER_READER')
  return block('POLICY_CONFLICT','TRUSTED_EVIDENCE_MISSING');
 if(evidence.security_incident===true)return block('SECURITY_INCIDENT','KILL_SWITCH_SECURITY_INCIDENT');
 if(evidence.kill_switch_enabled===false||evidence.grants_revoked===true)
  return block('POLICY_CONFLICT','KILL_SWITCH_OR_GRANT_REVOKED');
 const safety=evidence.safety;
 if(!safety||safety.real_hostinger_backup_isolated_restore_verified!==true||
  safety.physical_rollback_verified!==true)
  return block('HIGH_RISK','PHYSICAL_BACKUP_RESTORE_REQUIRED');
 if(safety.least_privilege_iam_verified!==true||safety.gateway_binding_verified!==true||
  safety.independent_tribunal_verified!==true||
  safety.observability_idempotency_budget_verified!==true)
  return block('POLICY_CONFLICT','SAFETY_GATE_INCOMPLETE');
 const item=evidence.current_item;
 if(!validItem(item,request,now_ms))
  return block('HIGH_RISK','INDIVIDUAL_CONTENT_QA_OR_SLUG_INVALID');
 if(actor.principal_id===item.author_principal_id||actor.principal_id===item.reviewer_principal_id)
  return block('POLICY_CONFLICT','AUTHOR_QA_PUBLISHER_NOT_SEPARATED');
 if(request.content_class==='FINANCIAL_MORTGAGE'&&
  item.independent_legal_ymyl_qa_approved!==true)
  return block('LEGAL_REQUIRED','MORTGAGE_LEGAL_QA_REQUIRED');
 const count=priorPublicationCount(evidence,request,now_ms);
 if(count===null)return block('SECURITY_INCIDENT','PUBLICATION_LEDGER_INVALID');
 if(count<POLICY.graduation.minimum_individually_owner_approved_successful_publications){
  if(item.owner_exact_digest_approved!==true||
   item.owner_approval_assurance!=='SERVER_VERIFIED')
   return block('SIGNATURE_REQUIRED','SUPERVISED_PUBLICATION_OWNER_APPROVAL_REQUIRED');
  return ready('SHADOW_SUPERVISED_APPROVAL_PRESENT',request,count);
 }
 if(!validOwnerGrant(evidence.owner_scope_grant,request,now_ms))
  return block('SIGNATURE_REQUIRED','SCOPED_OWNER_GRANT_REQUIRED_OR_EXPIRED');
 return ready('SHADOW_AUTONOMOUS_SCOPE_ELIGIBLE',request,count);
}
export function installSeoAutopublishGatewayShadow({
 actionGateway,verifyTrustedActor,readTrustedPromotionEvidence,clock=()=>Date.now()
}={}){
 if(typeof actionGateway?.registerCapability!=='function'||
   typeof actionGateway?.execute!=='function'||
   actionGateway.contract?.().environment!=='PREPROD'||
   actionGateway.contract?.().prod_writes!==false)
  throw Error('SEO_SHADOW_PREPROD_ACTGW_REQUIRED');
 if(typeof verifyTrustedActor!=='function'||
  typeof readTrustedPromotionEvidence!=='function'||typeof clock!=='function')
  throw Error('SEO_SHADOW_TRUSTED_CALLBACKS_REQUIRED');
 const tickets=new Map();
 actionGateway.registerCapability(CAPABILITY,async({context,payload})=>{
  const t=tickets.get(payload.ticket);
  if(!t||t.request_digest!==payload.request_digest||context.company_id!==t.request.company_id||
    context.engine_id!=='ACTGW-001'||context.environment!=='PREPROD')
   return block('POLICY_CONFLICT','UNTRUSTED_DIRECT_CAPABILITY_CALL');
  tickets.delete(payload.ticket);
  return evaluateSeoAutopublishShadow(t);
 });
 const fixedContext={company_id:'fenix',engine_id:'ACTGW-001',
  environment:'PREPROD',version:'0.1.0'};
 return Object.freeze({
  capability:CAPABILITY,environment:'PREPROD',
  real_wordpress_connector_installed:false,production_publishing_authorized:false,
  async request({session_ref,request_id,work_id,content_sha256,slug,content_class,
   company_id='fenix'}={}){
   const request={company_id,engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
    site_origin:'https://fenixcapital.es',work_id,content_sha256,slug,content_class};
   if(!ID.test(request_id||'')||typeof session_ref!=='string'||session_ref.length<12||
    !scopedRequest(request))return block('POLICY_CONFLICT','REQUEST_OR_SESSION_INVALID');
   let actor,evidence;
   try{
    actor=await verifyTrustedActor({session_ref,company_id,required_role:'SEO_PUBLISHER_SHADOW'});
    evidence=await readTrustedPromotionEvidence({company_id,work_id,content_sha256,slug,
     content_class,site_origin:request.site_origin});
   }catch{return block('POLICY_CONFLICT','TRUSTED_EVIDENCE_PROVIDER_UNAVAILABLE')}
   const ticket=randomUUID(),request_digest=hash(request);
   tickets.set(ticket,{request,actor,evidence,now_ms:clock(),request_digest});
   try{
    return await actionGateway.execute({context:fixedContext,authorized:true,
     capability:CAPABILITY,idempotency_key:'seo-shadow-'+request_id,
     payload:{ticket,request_digest},risk:'LOW',
     requires_prod_write:false,autonomous_prod:false,trading_access:false,
     estimated_additional_cost_eur:0});
   }finally{tickets.delete(ticket);}
  },
  limits:Object.freeze({preprod_only:true,no_wordpress_calls:true,no_api_credentials:true,
   no_production_authorization:true,no_external_writes:true,
   synthetic_test_evidence_is_not_a_real_attestation:true})
 });
}
