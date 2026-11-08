/**
 * SEO001 V10: operational gate attached to existing V8/V9 and autopublish shadow.
 * Exactly ZERO CMS, CRM, API and provider calls. No invented attestations.
 * Intended to be run on each future editorial branch update, with the existing
 * daily SEO automation reading the same physical evidence.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT='cerebro/seo-enterprise/v2/';
const SHA=/^[a-f0-9]{64}$/;
const fail=c=>{throw Error('SEO001_V10_'+c)};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const load=(root,relative)=>JSON.parse(fs.readFileSync(path.resolve(root,relative),'utf8'));
const files=Object.freeze({
 v7:ROOT+'registry/seo001-semantic-v7-review-only-2026-11-08.json',
 v9:ROOT+'registry/seo001-v9-media-physical-result-2026-11-08.json',
 v9Contract:ROOT+'registry/seo001-v9-media-live-gate-2026-11-08.json',
 policy:ROOT+'seo-prod-draft-autopublish-policy-v0.json'
});
const work=Object.freeze([
 {persona:'B2C',file:ROOT+'drafts/v7-semantic-review-only/compradores-V7-REVIEW-ONLY.html'},
 {persona:'B2B',file:ROOT+'drafts/v7-semantic-review-only/inmobiliarias-V7-REVIEW-ONLY.html'}
]);
const expectedDocs=[52713,52714,52715,52716],expectedImages=[52718,52719,52720,52721];
export function evaluateV10({root=process.cwd(),provided}={}){
 const {v7,v9,v9Contract,policy}=provided||{
  v7:load(root,files.v7),v9:load(root,files.v9),
  v9Contract:load(root,files.v9Contract),policy:load(root,files.policy)};
 if(v7?.company_id!=='fenix'||v7.engine_id!=='SEO-001'||v7.environment!=='LAB'||
   v7.status!=='SEMANTIC_REVIEW_ONLY_HOLD'||v7.limits?.allow_publish!==false||
   v9?.company_id!=='fenix'||v9.engine_id!=='SEO-001'||v9.environment!=='LAB'||
   v9.status!=='PHYSICAL_IMAGES_DISTINCT_RELEASE_HOLD'||
   v9.source?.conclusion!=='success'||v9.source?.run_id!==42455494395||
   v9.possible_near_duplicate_pairs!==0||
   v9Contract?.batch_id!=='SEO001-V9-LIVE-MEDIA-READONLY-20261108'||
   v9Contract.status!=='PREPARED_READONLY'||
   Object.values(v9Contract.permissions||{}).some(x=>x!==false)||
   policy?.company_id!=='fenix'||policy.engine_id!=='SEO-001'||
   policy.state!=='DEFINED_NOT_LIVE_CONNECTED'||policy.environment!=='POLICY_LAB_NOT_ENFORCED'||
   policy.physical_state?.real_auto_publish_enabled!==false||
   policy.lifecycle?.current_scoped_autopublish_grant_present!==false||
   policy.lifecycle?.supervised_initial_publications!==3)
   fail('CONTRACT_OR_RELEASE_DRIFT');
 if(!Array.isArray(v9.images)||v9.images.length!==4||
   !Array.isArray(v9Contract.images)||v9Contract.images.length!==4)
   fail('MEDIA_COUNT');
 const imageHashes=new Set();
 for(let i=0;i<4;i++){
  const r=v9.images[i],m=v9Contract.images[i];
  if(r.post_id!==expectedDocs[i]||r.media_id!==expectedImages[i]||
    m.post_id!==expectedDocs[i]||m.media_id!==expectedImages[i]||
    r.width!==1536||r.height!==1024||
    !SHA.test(r.sha256||'')||!SHA.test(r.sha256||'')||
    !/^[a-f0-9]{16}$/.test(r.dhash64||'')||
    imageHashes.has(r.sha256)||
    m.independent_provider_receipt!==false||m.rights_review_approved!==false)
    fail('MEDIA_SOURCE_OR_ATTESTATION');
  imageHashes.add(r.sha256);
 }
 if(Object.values(v9.unverified||{}).length!==8||
    Object.values(v9.unverified).some(x=>x!==false)||
    Object.values(v9.safety||{}).some((x)=>{
      if(typeof x==='boolean')return x!==false;
      if(typeof x==='number')return x!==0;
      return false;
    })||v9.safety?.autopublish_allowed!==false||
    v9.safety?.release_authorized!==false)fail('TRUSTED_PROOFS_NOT_PRESENT');
 if(Object.entries(v7.limits||{}).some(([k,v])=>k.startsWith('allow_')&&v!==false))
   fail('V7_PRIVILEGE_DRIFT');
 const source=[];
 for(const x of work){
  const html=fs.readFileSync(path.resolve(root,x.file),'utf8');
  if(!SHA.test(v7.reviews?.[x.persona]?.sha256||'')||
     hash(html)!==v7.reviews[x.persona].sha256||
     (html.match(/<h1\b/gi)||[]).length!==1||
     (html.match(/class=["']faq-item["']/gi)||[]).length!==6)
    fail('EDITORIAL_CONTENT_OR_SHA_DRIFT');
  source.push({persona:x.persona,sha256:hash(html)});
 }
 const phases=[
  {code:'V7_COPY_QA',state:'EVIDENCE_AVAILABLE',automatable:true},
  {code:'V8_LOCAL_RESPONSIVE',state:'EVIDENCE_AVAILABLE_NOT_REAL_WP',automatable:true},
  {code:'V9_PHYSICAL_MEDIA_BYTES',state:'EVIDENCE_AVAILABLE_NO_RIGHTS',automatable:true},
  {code:'SOURCE_RIGHTS_RECEIPTS',state:'UNVERIFIED',automatable:true},
  {code:'WORDPRESS_REAL_MOBILE_VISUAL',state:'UNVERIFIED',automatable:true},
  {code:'SAFE_B2B_CRM_E2E',state:'UNVERIFIED',automatable:true},
  {code:'WORDPRESS_PRIVATE_RESTORE_AND_ROLLBACK',state:'UNVERIFIED',automatable:true},
  {code:'INDEPENDENT_YMYL_LEGAL_REVIEW',state:'UNVERIFIED',automatable:false,human_exception:'LEGAL_REQUIRED'},
  {code:'THREE_OWNER_SIGNED_PUBLISHES',state:'UNVERIFIED',automatable:false,human_exception:'SIGNATURE_REQUIRED'},
  {code:'SCOPED_GATEWAY_PUBLISHER_IAM',state:'UNVERIFIED',automatable:true}
 ];
 const key=hash(JSON.stringify({source,images:v9.images.map(x=>x.sha256),
  policy_state:policy.state,phase:phases.map(p=>p.state)}));
 return {
  schema_version:'1.0.0',batch_id:'SEO001-V10-CONTINUOUS-READINESS-LAB',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  status:'AUTOMATIC_QA_READINESS_PASS_PUBLICATION_HOLD',
  execution_mode:'REUSE_EXISTING_SEO_DAILY_AUTOMATION_AND_GATEWAY_SHADOW',
  idempotency_fingerprint:key,
  current_article_sources:source,media_sources:expectedImages,
  historical_wordpress_drafts:[52660,52661,52662,52663,52713,52714,52715,52716],
  phases,
  first_three_owner_signed_publication_receipts_verified:0,
  publish_allowed:false,autopublish_allowed:false,production_integrated:false,
  wordpress_writes:0,crm_writes:0,supabase_writes:0,model_calls:0,paid_calls:0,
  next_automatable_task:'SOURCE_RIGHTS_RECEIPTS',
  owner_approval_not_requested_until_release_gates_verified:true,
  no_claim_about_live_mobile_or_crm_e2e:true
 };
}
export function saveV10({result,dest}){
 if(result?.publish_allowed!==false||result.autopublish_allowed!==false||
    result.wordpress_writes!==0||result.crm_writes!==0||result.paid_calls!==0||
    !dest||!path.isAbsolute(dest)||dest.includes('..')||
    ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(x=>
      path.resolve(dest).startsWith(path.resolve(x)+path.sep))||
    fs.existsSync(dest))fail('OUTPUT_NOT_ISOLATED');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(dest,'readiness.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:result.status,release:false,pending:result.phases.filter(x=>x.state==='UNVERIFIED').length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)fail('ARGS');
 const r=saveV10({result:evaluateV10(),dest:path.resolve(process.argv[2])});
 process.stdout.write(JSON.stringify(r)+'\n');
}
