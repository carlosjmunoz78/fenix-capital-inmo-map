/**
 * SEO-001 V6: SHA-pinned deterministic B2B repair, zero model/provider calls.
 * V5 rejection reason was not logged: do not invent it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bodyParagraphs,mergeOnlyFourParagraphs,auditSurgicalText} from './seo-surgical-v5-one-batch-lab.mjs';
import {rankDraftForRepair} from './seo-d13-quality-self-repair-v0.mjs';
const sha=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
const fail=x=>{throw Error('SEO001_V6_'+x)};
export const BATCH='SEO001-SURGICAL-DETERMINISTIC-20261108-V6';
export const MANIFEST='cerebro/seo-enterprise/v2/registry/seo001-surgical-deterministic-v6-2026-11-08.json';
const V5='cerebro/seo-enterprise/v2/registry/seo001-surgical-patch-v5-2026-11-08.json';
const R5='cerebro/seo-enterprise/v2/registry/seo001-surgical-v5-real-result-2026-11-08.json';
export const countWords=s=>s.replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length;
export function verify(root=process.cwd()){
 const m=JSON.parse(fs.readFileSync(path.resolve(root,MANIFEST),'utf8'));
 const v5=JSON.parse(fs.readFileSync(path.resolve(root,V5),'utf8'));
 const r5=JSON.parse(fs.readFileSync(path.resolve(root,R5),'utf8'));
 if(m.batch_id!==BATCH||m.status!=='PREPARED_OFFLINE_HARD_HOLD'||
  m.company_id!=='fenix'||m.engine_id!=='SEO-001'||m.environment!=='LAB'||
  m.persona!=='INMOBILIARIAS'||m.work_id!=='SEO001-FENIX-AR20261108V6-B2B-002'||
  m.source?.artifact_id!==13603278337||m.source?.run_id!==42446075036||
  m.source?.html_sha256!=='4a4ebb9895e260cd2e6e50be624a8525c5798fcb657c9e83ff8f70ce469da965'||
  m.source?.work_id!=='SEO001-FENIX-AR20261108V5-B2B-002'||m.launch!=='PR22_ONE_OFFLINE_QA_CHECK')
   fail('INVALID_MANIFEST_SCOPE');
 const l=m.limits;
 if(!l||l.max_runs!==1||l.max_model_calls!==0||l.max_paid_calls!==0||l.max_cost_eur!==0||
  Object.entries(l).some(([k,v])=>k.startsWith('allow_')&&v!==false))fail('BUDGET_OR_WRITES_DENIED');
 if(v5.batch_id!==m.source.batch_id||v5.status!=='COMPLETED_PARTIAL_HOLD'||
  v5.workflow_trigger_nonce!==m.source.nonce||v5.model_calls_consumed!==2||
  r5.batch_id!==v5.batch_id||r5.artifact_id!==m.source.artifact_id||
  r5.model_calls!==2||r5.safety?.published!==0||r5.safety?.wordpress_writes!==0||
  r5.two_articles?.[1]?.selected!=='SOURCE_V4')fail('SEALED_PREVIOUS_V5_REQUIRED');
 if(!Array.isArray(m.targets)||m.targets.length!==2||
  JSON.stringify(m.targets.map(r=>[r.section,r.paragraph]))!=='[[2,1],[4,1]]'||
  m.targets.some(r=>!Array.isArray(r.rewrite_pairs)||r.rewrite_pairs.length<1||
    r.rewrite_pairs.length>3||r.after_words!==85))fail('BAD_PATCH_CONTRACT');
 return {m,v5};
}
export function rewriteParagraph(raw,rule){
 if(typeof raw!=='string'||sha(raw)!==rule.before_sha256||
  raw!==rule.original_text||countWords(raw)!==rule.before_words||/<[^>]*>/.test(raw))
   fail('SOURCE_PARAGRAPH_HASH_DRIFT');
 let fixed=raw;
 for(const pair of rule.rewrite_pairs){
  if(!Array.isArray(pair)||pair.length!==2||pair.some(x=>typeof x!=='string'||x.length<4||
   x.length>250||/[<>]/.test(x))||fixed.split(pair[0]).length!==2)
    fail('REWRITE_NON_UNIQUE_OR_UNSAFE');
  fixed=fixed.replace(pair[0],pair[1]);
 }
 if(fixed===raw||countWords(fixed)!==rule.after_words||
  countWords(fixed)<60||countWords(fixed)>85)fail('REWRITE_RANGE');
 return fixed;
}
export function repairParagraphs(html,targets){
 if(!Array.isArray(targets)||targets.length!==2||
  JSON.stringify(targets.map(x=>[x.section,x.paragraph]))!=='[[2,1],[4,1]]')
   fail('UNAUTHORIZED_INDICES');
 const ps=bodyParagraphs(html);
 const changes=targets.map(r=>{
  const p=ps.find(x=>x.section===r.section&&x.paragraph===r.paragraph);
  if(!p||p.full!=='<p>'+p.inner+'</p>')fail('PARAGRAPH_MARKUP_CHANGED');
  return {p,after:rewriteParagraph(p.inner,r)};
 }).sort((a,b)=>b.p.offset-a.p.offset);
 let proposed=html;
 for(const {p,after} of changes){
  if(proposed.slice(p.offset,p.offset+p.full.length)!==p.full)fail('OFFSET_MISMATCH');
  proposed=proposed.slice(0,p.offset)+'<p>'+after+'</p>'+proposed.slice(p.offset+p.full.length);
 }
 let merged;
 try{merged=mergeOnlyFourParagraphs({original:html,proposed,targets:[[2,1],[4,1]]});}
 catch{fail('MERGE_REJECTED');}
 if(merged.html!==proposed||merged.changes.length!==2)fail('NON_TARGET_DIFF');
 return {html:merged.html,sha256:sha(merged.html),changes:changes.map(({p,after})=>({
  section:p.section,paragraph:p.paragraph,before_words:p.words,after_words:countWords(after)}))};
}
export function execute({source_dir,root=process.cwd()}={}){
 const {m,v5}=verify(root);
 if(typeof source_dir!=='string'||!path.isAbsolute(source_dir))fail('SOURCE_DIR_REQUIRED');
 const receipt=JSON.parse(fs.readFileSync(path.join(source_dir,'manifest.json'),'utf8'));
 const agencyQa=JSON.parse(fs.readFileSync(path.join(source_dir,'agency-qa.json'),'utf8'));
 const old=fs.readFileSync(path.join(source_dir,'agency-UNAPPROVED.html'),'utf8');
 if(receipt.batch_id!==m.source.batch_id||receipt.status!=='INCOMPLETE_HOLD'||
   receipt.model_calls!==2||receipt.published!==0||receipt.wordpress_writes!==0||
   receipt.automatic_next_batch!==false||receipt.works?.[1]?.selected!=='SOURCE_V4'||
   receipt.works?.[1]?.changed?.length!==0||
   agencyQa.brief?.work_id!==m.source.work_id||agencyQa.selected!=='SOURCE_V4'||
   agencyQa.review?.publish_allowed!==false||sha(old)!==m.source.html_sha256)
    fail('SOURCE_ARTIFACT_HASH_OR_RECEIPT');
 const brief={...v5.briefs[1],work_id:m.work_id};
 const oldQa=auditSurgicalText(old,brief),oldPenalty=rankDraftForRepair(oldQa);
 if(oldPenalty!==m.quality.required_old_penalty)fail('SOURCE_QA_CHANGED');
 const patch=repairParagraphs(old,m.targets);
 const qa=auditSurgicalText(patch.html,brief),newPenalty=rankDraftForRepair(qa);
 if(qa.technical_copy_precheck!=='PASS'||qa.publish_allowed!==false||
   qa.full_quality_certified!==false||qa.copy_issues?.length!==0||
   qa.style_issues?.length!==0||qa.voice_issues?.length!==0||
   qa.content_depth_issues?.length!==0||newPenalty!==m.quality.required_new_penalty||
   newPenalty>=oldPenalty)fail('INDEPENDENT_QA_REJECT');
 return {batch_id:BATCH,status:'COPY_PRECHECK_PASS_PHYSICAL_HOLD',company_id:'fenix',
  source_sha256:sha(old),patched_sha256:patch.sha256,source_artifact_id:m.source.artifact_id,
  work_id:m.work_id,changed:patch.changes,relative_penalty_before:oldPenalty,
  relative_penalty_after:newPenalty,original_v5_rejection:'CAUSE_NOT_OBSERVED_IN_V5',
  diagnostic_code:'V6_DETERMINISTIC_PATCH_ACCEPTED',
  model_calls:0,paid_calls:0,published:0,wordpress_writes:0,crm_writes:0,
  media_calls:0,publish_allowed:false,auto_next_batch_allowed:false,
  legal_approved:false,physical_visual_approved:false,real_b2b_crm_e2e:false,
  content:patch.html,qa};
}
export function persist(result,dest){
 if(result?.batch_id!==BATCH||result.model_calls!==0||result.published!==0||
  result.wordpress_writes!==0||result.publish_allowed!==false||
  !dest||!path.isAbsolute(dest)||dest.includes('..')||
  ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(x=>
    path.resolve(dest).startsWith(path.resolve(x)+path.sep))||fs.existsSync(dest))
   fail('WRITE_SCOPE');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const {content,qa,...summary}=result;
 fs.writeFileSync(path.join(dest,'agency-UNAPPROVED.html'),content,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'agency-qa.json'),JSON.stringify(qa,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==4)fail('ARGS');
 try{
  const r=execute({source_dir:path.resolve(process.argv[2])});
  const s=persist(r,path.resolve(process.argv[3]));
  process.stdout.write(JSON.stringify({status:s.status,model_calls:0,changed:s.changed,
   before:s.relative_penalty_before,after:s.relative_penalty_after,published:0})+'\n');
 }catch(e){
  const diagnostic=String(e?.message||'').match(/^SEO001_V6_[A-Z_]+$/)?.[0]||'SEO001_V6_INTERNAL_HOLD';
  process.stderr.write(JSON.stringify({status:'HOLD',diagnostic,model_calls:0,published:0})+'\n');
  process.exitCode=1;
 }
}
