/**
 * V4 real cloud pilot, reuses D13 Free canary and existing D32/circuit.
 * Exactly one generation per work, no retries, stop on 429/5xx,
 * review-only LAB artifact. Not a permanent scheduler or WordPress writer.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runOneShotFreeCanary,validateSeoV4Brief} from './seo-d13-free-project-one-shot-canary-v0.mjs';
import {inspectCandidateSeoHandoff} from './seo-circuit-readiness-orchestrator-v0.mjs';

const REF='cerebro/seo-enterprise/v2/registry/seo001-v4-free-lab-generation-briefs-v0.json';
const IDS=Object.freeze(['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002']);
const sum=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const bad=s=>{throw Error('SEO_D13_V4_BATCH_'+s)};
export function readSeoV4Briefs({root=process.cwd()}={}){
 const full=path.resolve(root,REF);
 const registry=JSON.parse(fs.readFileSync(full,'utf8'));
 if(registry.company_id!=='fenix'||registry.engine_id!=='SEO-001'||
  registry.environment!=='LAB'||registry.version!=='V4-CANDIDATE'||
  registry.max_provider_calls_per_work_id!==1||registry.allow_retries!==false||
  registry.allow_paid_fallback!==false||registry.allow_wordpress_writes!==false||
  !Array.isArray(registry.briefs)||registry.briefs.length!==2)bad('POLICY');
 const ids=registry.briefs.map(b=>b.work_id);
 if(IDS.some(id=>!ids.includes(id))||new Set(ids).size!==2)bad('BRIEF_IDS');
 for(const b of registry.briefs)validateSeoV4Brief(b);
 return Object.freeze(IDS.map(id=>registry.briefs.find(b=>b.work_id===id)));
}
const briefOnly=r=>{
 const {html,...other}=r;
 return other;
};
export async function executeSeoV4FreeBatch({
 root=process.cwd(),api_key=null,fetch_impl=globalThis.fetch,
 owner_verified_free_project=true,simulation=false
}={}){
 const briefs=readSeoV4Briefs({root});
 const items=[];
 let attempted=0,stop=false;
 for(const brief of briefs){
  if(stop){
   items.push({work_id:brief.work_id,status:'SKIPPED_PROVIDER_BLOCK',reason:'PREVIOUS_PROVIDER_ERROR_NO_RETRY',
    request_count:0,html:null,candidate_handoff:null});
   continue;
  }
  const out=await runOneShotFreeCanary({brief_override:brief,api_key,fetch_impl,
   owner_verified_free_project});
  attempted+=out.request_count||0;
  if(attempted>2)bad('TWO_REQUEST_MAX');
  let handoff=null;
  if(typeof out.html==='string'){
   // Existing D32 checks original source SHA, depth, voice, FAQ and generates
   // photo/WP plans only for passing V4 candidates. Does not grant publishing.
   handoff=inspectCandidateSeoHandoff({
    root,work_id:brief.work_id,receipt:out,html:out.html
   });
  }
  items.push({work_id:brief.work_id,status:out.status,
   reason:out.reason||null,request_count:out.request_count||0,
   http_status:out.http_status||null,receipt:briefOnly(out),
   candidate_handoff:handoff,html:out.html||null});
  if(out.status==='HOLD'){
   // We refuse automatic retries or moving to another provider.
   stop=true;
  }
 }
 return Object.freeze({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'LAB',version:'V4-CANDIDATE',
  status:items.every(x=>x.status==='REAL_CLOUD_DRAFT_REVIEW_ONLY')?
   'TWO_REAL_DRAFTS_READY_FOR_INDEPENDENT_QA_RELEASE_HOLD':
   'BATCH_INCOMPLETE_OR_EDITORIAL_HOLD',
  provider:'GEMINI_3_5_FLASH_LITE_FREE_PROJECT',simulation,
  items,provider_call_count:attempted,max_provider_calls:2,
  auto_retry_count:0,paid_api_calls:0,wordpress_writes:0,
  image_api_calls:0,actual_published_items:0,
  authorized_for_prod:false,automatic_scheduler_enabled:false
 });
}
export function persistSeoV4BatchReview({batch,output_dir}={}){
 if(batch?.company_id!=='fenix'||batch.engine_id!=='SEO-001'||
  batch.environment!=='LAB'||batch.authorized_for_prod!==false||
  batch.paid_api_calls!==0||batch.wordpress_writes!==0||
  batch.provider_call_count>2||batch.auto_retry_count!==0||
  batch.items?.length!==2)bad('PERSIST_SCOPE');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))
  bad('PATH');
 const target=path.resolve(output_dir);
 const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!roots.some(x=>target.startsWith(x+path.sep)))bad('OUTPUT_OUTSIDE_TEMP');
 if(fs.existsSync(target))bad('OUTPUT_ALREADY_EXISTS');
 fs.mkdirSync(target,{mode:0o700,recursive:true});
 const files={};
 const items=batch.items.map((item,i)=>{
  const key=(i===0?'b2c':'b2b');
  if(item.html)files[key+'-v4-unapproved.html']=item.html;
  files[key+'-receipt.json']=JSON.stringify({
   ...item,html:undefined,producer_asset_generated:false,
   wordpress_dryrun_performed:false,wordpress_published:false
  },null,2)+'\n';
  return {work_id:item.work_id,provider_http:item.http_status,
   state:item.status,model_calls:item.request_count,
   content_sha256:item.receipt?.source_sha256||null,
   faq_count:item.receipt?.faq_count||null,
   total_words:item.receipt?.word_count||null,
   body_words:item.receipt?.main_content_words_excluding_faq||null,
   depth_passed:item.receipt?.content_depth_precheck_passed||false,
   d32_code:item.candidate_handoff?.d32?.code||null,
   images_generated:false,wordpress_writes:0};
 });
 files['manifest.json']=JSON.stringify({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'LAB',version:'V4-CANDIDATE',
  simulation:batch.simulation,batch_status:batch.status,items,
  files:Object.entries(files).map(([name,body])=>({name,sha256:sum(body)})),
  provider_call_count:batch.provider_call_count,auto_retry_count:0,
  paid_api_calls:0,image_api_calls:0,wordpress_writes:0,
  owner_approved:false,independent_professional_qa:false,publish_authorized:false
 },null,2)+'\n';
 for(const [name,body] of Object.entries(files)){
  if(!/^[a-z0-9][a-z0-9.-]+$/.test(name))bad('FILE_NAME');
  fs.writeFileSync(path.join(target,name),body,{flag:'wx',mode:0o600});
 }
 return {status:batch.status,files:Object.keys(files),
  model_calls:batch.provider_call_count,paid_calls:0,
  wordpress_writes:0,items};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)bad('OUTPUT_REQUIRED');
 const batch=await executeSeoV4FreeBatch({
  api_key:process.env.CEREBRO_GEMINI_FREE_API_KEY||null,
  owner_verified_free_project:true
 });
 const written=persistSeoV4BatchReview({batch,output_dir:path.resolve(process.argv[2])});
 // Logs contain NO HTML, secrets or raw content, only states & counts.
 process.stdout.write(JSON.stringify({...written,
  publication_authorized:false,producer_real_generation:false})+'\n');
 if(batch.provider_call_count===0)process.exitCode=2;
}
