/**
 * SEO001 isolated, owner-gated REAL self-repair LAB pilot, 2026-11-08.
 * Executes one new batch (2 drafts, max 3 writer attempts each), no publication
 * or CRM/media writes. Provider may be called ONLY with free-tier project key.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeGeminiFreeRepairGenerator,runSelfRepairBatch} from './seo-d13-quality-self-repair-v0.mjs';
import {validateSeoV4Brief} from './seo-d13-free-project-one-shot-canary-v0.mjs';
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const fail=c=>{throw Error('SEO001_AUTOREPAIR_V1_'+c)};
export const PATH='cerebro/seo-enterprise/v2/registry/seo001-autorepair-one-batch-2026-11-08.json';
export const BATCH_ID='SEO001-AUTOREPAIR-PILOT-20261108-V1';
const OLD='cerebro/seo-enterprise/v2/registry/seo001-learned-one-batch-pilot-2026-11-08.json';
const RESULT='cerebro/seo-enterprise/v2/registry/seo001-one-batch-pilot-result-2026-11-08.json';
export function verifyAutoRepairPilot({root=process.cwd()}={}){
 const p=JSON.parse(fs.readFileSync(path.resolve(root,PATH),'utf8'));
 const old=JSON.parse(fs.readFileSync(path.resolve(root,OLD),'utf8'));
 const result=JSON.parse(fs.readFileSync(path.resolve(root,RESULT),'utf8'));
 if(p.batch_id!==BATCH_ID||p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.environment!=='LAB'||
    p.status!=='PREPARED_NOT_EXECUTED'||
    p.workflow_trigger_nonce!=='TRIGGER_ONCE_20261108_AUTOREPAIR_V1'||
    p.max_batch_runs!==1||p.max_real_model_calls!==6||p.max_calls_per_item!==3||
    p.allow_retries!==true||p.auto_retry_if_provider_error!==false||
    p.allow_paid_fallback!==false||p.allow_new_subscriptions!==false||
    p.owner_cost_ceiling_eur!==0||p.allow_wordpress_writes!==false||
    p.allow_wordpress_publication!==false||p.allow_supabase_crm_writes!==false||
    p.allow_image_api_calls!==false||p.actual_release_authorized!==false||
    p.model_provider!=='EXISTING_GEMINI_FREE_PROJECT_OWNER_ATTESTED_2026-11-06'||
    p.model!=='gemini-3.5-flash-lite')fail('MANIFEST_RELEASE_OR_COST_GUARD');
 if(old.batch_id!=='SEO001-AUTONOMY-PILOT-20261108-ONE'||
    old.status!=='COMPLETED_HOLD'||old.model_calls_consumed!==2||
    old.workflow_trigger_nonce!=='CONSUMED_SINGLE_BATCH_20261108'||
    result.result!=='NOT_PERFECT_DO_NOT_PUBLISH'||
    result.post_run_regression_2026_11_08?.verified_total_tests!==18)
    fail('OLD_BATCH_NOT_SEALED');
 if(!Array.isArray(p.briefs)||p.briefs.length!==2||
    p.briefs[0]?.work_id!=='SEO001-FENIX-AR20261108-B2C-001'||
    p.briefs[1]?.work_id!=='SEO001-FENIX-AR20261108-B2B-002'||
    p.briefs[0]?.persona!=='PARTICULARES'||p.briefs[1]?.persona!=='INMOBILIARIAS')
    fail('WORK_ID_OR_PERSONA');
 for(let i=0;i<2;i++){
  validateSeoV4Brief(p.briefs[i]);
  const cmp={...p.briefs[i],work_id:old.briefs[i].work_id};
  if(JSON.stringify(cmp)!==JSON.stringify(old.briefs[i]))
   fail('BRIEF_WAS_CHANGED_INSTEAD_OF_LEARNING');
 }
 if(!p.lessons||Object.keys(p.lessons).length!==10||
    p.learning_contract_id!=='SEO001_LEARNED_10_GATES_20261108'||
    p.previous_batch_id!==old.batch_id||p.reference_legal_file!==
    'cerebro/seo-enterprise/v2/registry/seo001-official-legal-sources-2026-11-08.json')
    fail('LEARNING_PROVENANCE');
 return Object.freeze({manifest:p,manifest_sha256:sha(JSON.stringify(p)),lessons:10,max_calls:6});
}
export async function runAutoRepairLive({root=process.cwd(),api_key=process.env.CEREBRO_GEMINI_FREE_API_KEY||null}={}){
 const v=verifyAutoRepairPilot({root});
 if(typeof api_key!=='string'||api_key.length<16){
  return {batch_id:BATCH_ID,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
   status:'HOLD_FREE_SECRET_NOT_AVAILABLE',model_calls:0,paid_fallback_calls:0,
   published:0,wordpress_writes:0,crm_writes:0,publish_allowed:false,
   next_batch_auto_allowed:false,works:[],manifest_sha256:v.manifest_sha256};
 }
 const generate=makeGeminiFreeRepairGenerator({manifest:v.manifest,api_key,
   owner_verified_free_project:true});
 const x=await runSelfRepairBatch({batch_id:v.manifest.batch_id,briefs:v.manifest.briefs,
   generate,maxRequests:v.manifest.max_real_model_calls,maxAttempts:v.manifest.max_calls_per_item});
 if(x.model_calls>6||x.published!==0||x.wordpress_writes!==0||x.crm_writes!==0||
    x.publish_allowed!==false)fail('PRODUCTION_OR_COST_BUDGET');
 return {...x,manifest_sha256:v.manifest_sha256,provider:'GOOGLE_GEMINI_FREE_PROJECT',
  model:'gemini-3.5-flash-lite',learning_gates_loaded:v.lessons,
  original_images_generated:0,real_mobile_qa_passed:false,real_crm_positive_e2e:false,
  physical_release_certified:false,real_model_iterations_completed:x.works.map(w=>w.attempts?.length||0)};
}
export function writeAutoRepairEvidence({result,output_dir}={}){
 if(!result||result.batch_id!==BATCH_ID||result.model_calls>6||
    result.published!==0||result.wordpress_writes!==0||
    result.publish_allowed!==false||typeof output_dir!=='string'||
    !path.isAbsolute(output_dir)||output_dir.includes('..'))fail('EVIDENCE_SCOPE');
 const dest=path.resolve(output_dir);
 const permitted=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!permitted.some(x=>dest.startsWith(x+path.sep))||fs.existsSync(dest))
    fail('OUTPUT_DIR_NOT_UNIQUE_OR_TEMP');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const summaries=[];
 for(let i=0;i<result.works.length;i++){
  const work=result.works[i],slug=i===0?'buyer':'agency';
  if(work.content)fs.writeFileSync(path.join(dest,slug+'-UNAPPROVED.html'),
    work.content,{flag:'wx',mode:0o600});
  const {content,...safe}=work;
  fs.writeFileSync(path.join(dest,slug+'-qa.json'),
    JSON.stringify(safe,null,2)+'\n',{flag:'wx',mode:0o600});
  summaries.push({work_id:work.work_id,status:work.status,request_count:work.requests,
   iterations:work.attempts?.length||0,technical_copy_precheck:work.review?.technical_copy_precheck||'HOLD',
   blocking_issues:work.review?.copy_issues||[],full_quality_certified:false,publication:false});
 }
 const envelope={batch_id:result.batch_id,company_id:'fenix',engine_id:'SEO-001',
   environment:'LAB',run_status:result.status,model_calls:result.model_calls,
   provider:'GOOGLE_GEMINI_FREE_PROJECT',cost_eur_actual:'NOT_INDEPENDENTLY_AUDITED',
   wordpress_writes:0,crm_writes:0,published:0,can_publish:false,
   real_mobile_qa:false,media_original_provenance:false,real_crm_e2e:false,
   professional_legal_signoff:false,next_batch_auto_allowed:false,
   manifest_sha256:result.manifest_sha256,works:summaries};
 fs.writeFileSync(path.join(dest,'manifest.json'),
   JSON.stringify(envelope,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:result.status,model_calls:result.model_calls,work_status:summaries,
   files:fs.readdirSync(dest),published:0,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)fail('REQUIRES_EXACT_ONE_TEMP_OUTPUT_ARG');
 const result=await runAutoRepairLive();
 const receipt=writeAutoRepairEvidence({result,output_dir:path.resolve(process.argv[2])});
 // Print issue codes and counts only, never drafts, personal information or credentials.
 process.stdout.write(JSON.stringify(receipt)+'\n');
}
