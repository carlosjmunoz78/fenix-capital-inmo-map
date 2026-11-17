/** SEO official WordPress: public read -> protected draft -> owner approval -> scoped autonomy.
 * Decision-only, no HTTP requests, no tokens, no WordPress writes and no PROD rollout.
 */
import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync(new URL('../seo-prod-draft-autopublish-policy-v0.json',import.meta.url),'utf8'));
const category=x=>Object.hasOwn(policy.content_classes,x);
const positive=x=>Number.isSafeInteger(x)&&x>=0;
const denied=(reason)=>({status:'BLOCKED',reason,can_publish:false,can_create_draft:false,autopublish:false,production_write_executed:false});
export function assessSeoOfficialPublishing(input={}){
 const {company_id,site_origin,content_class,operation='CREATE_NEW_URL',content_safety={},
  prerequisites={},history={},authorization={}}=input;
 if(company_id!==policy.company_id||site_origin!==policy.site.official_origin) return denied('TENANT_OR_OFFICIAL_SITE_MISMATCH');
 if(operation==='PUBLIC_READ')return {status:'OFFICIAL_PUBLIC_READ_ALLOWED',can_create_draft:false,can_publish:false,
  autopublish:false,production_write_executed:false,origin:policy.site.official_origin};
 if(operation!=='CREATE_NEW_URL')return denied('EXISTING_PAGES_PROTECTED');
 if(!category(content_class)||content_class==='OTHER')return denied('CONTENT_SCOPE_UNDEFINED');
 if(!prerequisites.inventory_checked||!prerequisites.unique_slug_verified||
   !prerequisites.site_access_scope_verified||!prerequisites.backup_restorable||
   !prerequisites.rollback_tested||!prerequisites.wp_draft_api_credential_scoped)
   return denied('PHYSICAL_WRITE_GATES_INCOMPLETE');
 if(!content_safety.independent_qa_passed||!content_safety.sources_verified||
   !content_safety.legal_policy_passed||content_safety.incident_found||
   content_safety.owner_requested_human_review)
   return denied('EDITORIAL_OR_SAFETY_GATE');
 if(content_class==='FINANCIAL_MORTGAGE'&&
   (!content_safety.independent_factcheck_passed||!content_safety.financial_claims_proven||
    !content_safety.legal_review_when_required_passed))
   return denied('HIGH_RISK_FACT_CHECK_INCOMPLETE');
 const base={operation:'CREATE_NEW_URL',site_origin,content_class,
  desired_wordpress_status:'draft',production_write_executed:false,
  existing_urls_mutated:false,autopublish:false};
 if(authorization.owner_approved_this_draft===true&&
   authorization.owner_approval_gateway_verified===true&&
   authorization.approval_content_digest_matches===true){
  return {...base,status:'OWNER_APPROVED_PUBLICATION_ELIGIBLE',desired_wordpress_status:'publish',
   can_create_draft:true,can_publish:true,autopublish:false,
   requires_last_mile_wordpress_preflight:true};
 }
 const approved=history.independent_owner_approvals_verified,reviewed=history.independent_qa_successes_verified,
  scores=history.merit_recent_approved_scores;
 const graduated=positive(approved)&&approved>=policy.graduation.minimum_individually_owner_approved_successful_publications&&
  positive(reviewed)&&reviewed>=approved&&Array.isArray(scores)&&scores.length>=3&&
  scores.slice(-3).every(x=>x&&x.score>=policy.graduation.merit_policy_minimum_score&&
    x.quality>=policy.graduation.quality_floor&&x.safety>=policy.graduation.safety_floor);
 const scoped=authorization.owner_autopublish_grant_gateway_verified===true&&
   authorization.agent_iam_verified===true&&authorization.evaluator_iam_verified===true&&
   authorization.grant_company_id===company_id&&
   authorization.grant_content_class===content_class&&
   authorization.grant_active===true&&authorization.grant_revoked!==true;
 const releaseGates=prerequisites.production_publish_api_scoped===true&&
  prerequisites.publication_monitoring_active===true&&prerequisites.rollback_tested===true;
 if(graduated&&scoped&&releaseGates)
  return {...base,status:'SCOPED_AUTOPUBLISH_ELIGIBLE',desired_wordpress_status:'publish',
   can_create_draft:true,can_publish:true,autopublish:true,
   requires_last_mile_wordpress_preflight:true};
 return {...base,status:'DRAFT_ONLY_PENDING_OWNER_APPROVAL',
  can_create_draft:true,can_publish:false,autopublish:false,
  owner_approval_required:true,
  eligible_for_autopublish_graduation:graduated,
  missing_iam_or_owner_grant:graduated&&!scoped};
}
export const SEO_OFFICIAL_PUBLICATION_POLICY_V0=Object.freeze({
 id:policy.policy_id,origin:policy.site.official_origin,
 default_new_url_status:'draft',minimum_successful_owner_approvals:3,
 live_wordpress_enforcement:false,automatic_privilege_granted:false,
 changes_existing_pages:false,additional_subscriptions_eur:0
});
