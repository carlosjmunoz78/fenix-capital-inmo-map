/**
 * SEO-001 owner approval verification (no Work credits). GitHub provider-authenticated
 * issue comments on PR #22 are a proposal/review inbox, NOT publishing authority.
 * Tokens used only in backend, never exposed to browser/logs. PREPROD control plane.
 */
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const PR=22;
const OWNER_USER_ID=130542695;
const PLAN_BLOB='1c0e4897ca9bd44efd1b1965e7ad60af76207bef';
const SHA1=/^[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
const fail=code=>{throw Error('SEO_APPROVAL_'+code)};
export const APPROVAL_CONTRACT_V0=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
 repo:REPO,review_pr_number:PR,owner_github_numeric_id:OWNER_USER_ID,
 strategy_plan_git_blob_sha:PLAN_BLOB,publish_authorized:false,
 wordpress_write_authorized:false,consent_or_marketing_grant:false
});
export function parseOwnerApproval(text){
 if(typeof text!=='string'||text.length>220||text.includes('\n'))fail('INVALID_BODY');
 const strategy=/^CEREBRO_SEO_APPROVE STRATEGY fenix ([0-9a-f]{40})$/.exec(text);
 if(strategy){
  if(!SHA1.test(strategy[1])||strategy[1]!==PLAN_BLOB)fail('STRATEGY_VERSION_MISMATCH');
  return Object.freeze({kind:'STRATEGY',company_id:'fenix',plan_blob_sha:strategy[1],
    grant:'PREPARE_BRIEFS_AND_DRAFTS_ONLY',can_publish:false});
 }
 const editorial=/^CEREBRO_SEO_APPROVE EDITORIAL fenix (SEO001-FENIX-B2C-EDITORIAL-001|SEO001-FENIX-B2B-EDITORIAL-002) ([0-9a-f]{64})$/.exec(text);
 if(editorial){
  if(!SHA256.test(editorial[2]))fail('INVALID_EDITORIAL_DIGEST');
  return Object.freeze({kind:'EDITORIAL',company_id:'fenix',work_id:editorial[1],
   source_sha256:editorial[2],grant:'EDITORIAL_CONTENT_REVIEW_ONLY',
   can_publish:false,wordpress_write_authorized:false});
 }
 const draft=/^CEREBRO_SEO_APPROVE DRAFT fenix ([1-9][0-9]{0,9}) ([0-9a-f]{64})$/.exec(text);
 if(draft){
  if(!SHA256.test(draft[2]))fail('INVALID_DRAFT_DIGEST');
  return Object.freeze({kind:'DRAFT',company_id:'fenix',post_id:Number(draft[1]),
   draft_sha256:draft[2],grant:'PROPOSE_TO_RELEASE_TRIBUNAL_ONLY',can_publish:false});
 }
 fail('UNKNOWN_ACTION');
}
/** Fetch comment from GitHub REST rather than trusting a submitted user ID or URL. */
export async function verifyOwnerApprovalFromGitHub({
 comment_id, github_token, fetch_impl=fetch
}={}){
 if(!Number.isSafeInteger(comment_id)||comment_id<=0)fail('COMMENT_ID_REQUIRED');
 if(typeof github_token!=='string'||github_token.length<15)fail('SERVER_TOKEN_REQUIRED');
 if(typeof fetch_impl!=='function')fail('SERVER_FETCH_REQUIRED');
 const url='https://api.github.com/repos/'+REPO+'/issues/comments/'+comment_id;
 const res=await fetch_impl(url,{
  method:'GET',redirect:'error',
  headers:{authorization:'Bearer '+github_token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28'}
 });
 if(res.status!==200)fail('PROVIDER_READ_FAILED');
 const x=await res.json();
 if(x?.id!==comment_id || x?.issue_url!=='https://api.github.com/repos/'+REPO+'/issues/'+PR ||
   x?.user?.id!==OWNER_USER_ID || x?.user?.login!=='carlosjmunoz78' ||
   x?.created_at!==x?.updated_at)fail('PROVIDER_OWNER_OR_SCOPE_INVALID');
 const p=parseOwnerApproval(x.body);
 return Object.freeze({
  status:'GITHUB_OWNER_COMMENT_VERIFIED_PREPROD_NOT_PUBLISHED',
  provider:'GITHUB_REST',provider_comment_id:x.id,provider_owner_id:x.user.id,
  provider_created_at:x.created_at,company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',...p,owner_approval_verified:true,can_publish:false,
  wordpress_write_authorized:false,release_gate_status:'NOT_EXECUTED'
 });
}

/** Bind a fresh provider-authorized editorial comment to a verified immutable draft.
 * Both inputs must be independently verified by GitHub API / locked repository content.
 * This is NOT an executor and never opens WordPress permissions.
 */
export function matchEditorialApprovalToReviewedDraft({provider_receipt,work_item}={}){
 if(provider_receipt?.status!=='GITHUB_OWNER_COMMENT_VERIFIED_PREPROD_NOT_PUBLISHED'||
    provider_receipt?.owner_approval_verified!==true||provider_receipt?.provider!=='GITHUB_REST'||
    provider_receipt?.kind!=='EDITORIAL'||provider_receipt?.company_id!=='fenix'||
    provider_receipt?.work_id!==work_item?.work_id||
    provider_receipt?.source_sha256!==work_item?.digest||
    provider_receipt?.wordpress_write_authorized!==false||
    work_item?.company_id!=='fenix'||work_item?.environment!=='PREPROD'||
    !SHA256.test(work_item?.digest??'')||!SHA1.test(work_item?.blob??''))fail('EDITORIAL_SOURCE_MISMATCH');
 return Object.freeze({status:'EDITORIAL_OWNER_CONTENT_ACCEPTED_NEXT_QA_ONLY',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  work_id:work_item.work_id,source_sha256:work_item.digest,
  github_comment_id:provider_receipt.provider_comment_id,
  owner_verified:true,professional_qa_verified:false,
  wordpress_write_authorized:false,can_publish:false,release_authorized:false});
}
