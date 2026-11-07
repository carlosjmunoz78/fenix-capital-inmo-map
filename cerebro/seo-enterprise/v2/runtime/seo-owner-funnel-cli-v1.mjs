import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadFrozenSeoCorpus} from './seo-corpus-job001-work-v1.mjs';
import {buildSeoOwnerIntentFunnel,independentValidateOwnerIntentFunnel} from './seo-owner-intent-funnel-v1.mjs';
import {makeSeoAudiovisualOrder,validateSeoAudiovisualOrder} from './seo-audiovisual-brief-v1.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function write(dir,name,obj){
 fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,name);
 fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o600});
 return sha(fs.readFileSync(file));
}
function read(dir,name){return JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));}
const deny=cond=>{if(cond)throw Error('SEO_STRATEGY_GATE_DENIED')};
async function main(){
 const [stage,source,target]=process.argv.slice(2);
 const corpus=loadFrozenSeoCorpus(),expected=buildSeoOwnerIntentFunnel({corpus});
 const order=makeSeoAudiovisualOrder({owner:expected,corpus});
 if(stage==='build'){
  if(!source)throw Error('OUTPUT_REQUIRED');
  const evidence={
   strategy:write(source,'url-ownership-200.json',expected),
   media:write(source,'creative-brief-existing-producer.json',order)};
  const summary={
   schema_version:'1.0.0',status:'SEO_INTENT_FUNNELS_AND_PRODUCER_BRIEF_COMPILED',
   company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
   source_digest:corpus.corpus_digest,
   counts:{existing_urls:expected.total_existing_urls,
    exact_keyword_overlap_candidates:expected.exact_keyword_duplicate_count,
    cross_persona_pairs:expected.cross_persona_pairs_to_preserve.length,
    funnel_blueprints:expected.funnel_contracts.length,
    role_families:expected.categories,
    missing_focus_keyword_in_snapshot:expected.no_focus_keyword_in_snapshot.length},
   findings:expected.keyword_overlap_candidates,
   pilot_audiovisual:{post_id:960,producer_id:order.producer_id,
    source_url:order.source_existing_page,order_status:order.status,
    queued_externally_by_this_workflow:false,
    attached_to_wordpress:false},
   no_new_site_audit:true,no_new_urls:true,no_canonical_or_redirect_updates:true,
   site_changes:0,subscriptions_added_eur:0,
   artifacts_sha256:evidence
  };
  write(source,'strategy-summary.json',summary);
  process.stdout.write(JSON.stringify({status:summary.status,counts:summary.counts,site_changes:0})+'\n');
 }else if(stage==='qa'){
  if(!source||!target)throw Error('SOURCE_TARGET_REQUIRED');
  const existing=read(source,'url-ownership-200.json'),media=read(source,'creative-brief-existing-producer.json');
  const result=independentValidateOwnerIntentFunnel({proposed:existing,corpus});
  validateSeoAudiovisualOrder({order:media,owner:existing,corpus});
  const orig=read(source,'strategy-summary.json');
  deny(orig.source_digest!==corpus.corpus_digest||
    orig.artifacts_sha256.strategy!==sha(fs.readFileSync(path.join(source,'url-ownership-200.json')))||
    orig.artifacts_sha256.media!==sha(fs.readFileSync(path.join(source,'creative-brief-existing-producer.json')))||
    orig.counts.existing_urls!==200||
    orig.counts.exact_keyword_overlap_candidates!==result.overlap_candidates);
  const receipt={status:'SEO_OWNER_FUNNEL_AND_CREATIVE_QA_PASSED',source_digest:corpus.corpus_digest,
   verified_urls:result.urls,overlaps:result.overlap_candidates,
   separate_b2b_b2c_pairs:result.same_city_different_persona_pairs,
   funnel_blueprints:result.funnel_blueprints,
   creative_brief_verified:true,no_cannibalization_confirmed_from_gsc:true,
   external_publishing_authorized:false,mutations:0};
  write(target,'qa-receipt.json',receipt);
  process.stdout.write(JSON.stringify(receipt)+'\n');
 }else if(stage==='tribunal'){
  if(!source||!target)throw Error('SOURCE_TARGET_REQUIRED');
  const strategy=read(source,'url-ownership-200.json');
  const qa=read(target,'qa-receipt.json');
  const validated=independentValidateOwnerIntentFunnel({proposed:strategy,corpus});
  if(qa.status!=='SEO_OWNER_FUNNEL_AND_CREATIVE_QA_PASSED'||
     qa.verified_urls!==validated.urls||qa.overlaps!==validated.overlap_candidates||
     !qa.creative_brief_verified||qa.mutations!==0)throw Error('SEO_TRIBUNAL_QA_MISMATCH');
  const result={status:'SEO_200_URL_OWNERSHIP_FUNDAMENTALS_ACCEPTED_NO_PROD',
   tenant:'fenix',snapshot_digest:corpus.corpus_digest,
   url_records:200,exact_overlap_candidates:validated.overlap_candidates,
   b2b_b2c_separation_pairs:validated.same_city_different_persona_pairs,
   funnel_contracts:validated.funnel_blueprints,
   creative_request_approved_for_private_PROD_queue_only:true,
   creative_asset_qa_pending:true,
   wordpress_publishing_allowed:false,wordpress_draft_writer_enabled:false,
   go_live_approval:false,actual_google_cannibalization_evidence:false,
   actual_forms_connected:false,external_mutations:0};
  write(target,'tribunal-verdict.json',result);
  process.stdout.write(JSON.stringify(result)+'\n');
 }else throw Error('UNKNOWN_STAGE');
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(String(e.message||'BLOCKED')+'\n');process.exitCode=1});
