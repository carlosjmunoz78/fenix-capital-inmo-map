
/**
 * SEO-001 isolated real filesystem writer, bound to verified Github Actions job.
 * Writes only unpublished editorial proposals to temp files, never WordPress PROD.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {loadFrozenSeoCorpus,expectedSeoRoleEvidence} from './seo-corpus-job001-work-v1.mjs';
import {independentlyReviewSeoWorkProducts} from './seo-specialist-work-product-v1.mjs';
import {verifyPriorSeoJob} from './seo-gh-oidc-workload-v1.mjs';
import {buildSeoOwnerIntentFunnel} from './seo-owner-intent-funnel-v1.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const NAME='seo-editorial-draft-bundle-v1';
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[{}\[\]$]/g,' ').replace(/\s+/g,' ').trim();
function limitedHost(h){
 if(h?.status!=='GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED'||h.role!=='SEO_SANDBOX_DRAFT_WRITER'||
 h.workload_oidc_verified!==true||h.provider_job_verified!==true||h.can_write_prod!==false||
 h.individual_agent_iam_verified!==false||h.company_id!=='fenix'||h.engine_id!=='SEO-001'||
 !Number.isSafeInteger(h.github_job_id))throw Error('SEO_DRAFT_WRITER_IAM_DENY');
}
export function createSeoEditorialWriteBundle({corpus,work_products}={}){
 if(corpus?.documents?.length!==200||work_products?.role_products?.length!==141||
 work_products?.url_action_queue?.length!==200||
 work_products.source_snapshot_digest!==corpus.corpus_digest||
 work_products.all_are_readonly_proposals!==true)throw Error('SEO_DRAFT_CORPUS_SCOPE');
 const owner=buildSeoOwnerIntentFunnel({corpus});
 const byId=new Map(corpus.documents.map(x=>[x.post_id,x]));
 const byOwnerId=new Map(owner.url_ownership.map(x=>[x.post_id,x]));
 // Never draft from exact keyword collisions before an independent ownership decision.
 const collisionUrls=new Set(owner.keyword_overlap_candidates.flatMap(x=>x.candidate_existing_urls.map(y=>y.url)));
 const candidates=work_products.url_action_queue.filter(x=>
   !collisionUrls.has(x.url)&&byOwnerId.get(x.post_id)?.family!=='INSTITUTIONAL' &&
   byOwnerId.get(x.post_id)?.family!=='GENERAL').slice(0,20);
 const drafts=[];
 for(const c of candidates){
  const d=byId.get(c.post_id);
  if(!d||c.copy_sha256!==sha(d.copy_text)||c.url!==d.url||
  !d.url.startsWith('https://fenixcapital.es/'))throw Error('SEO_DRAFT_SOURCE_CONFLICT');
  const ownership=byOwnerId.get(c.post_id);
  if(!ownership||ownership.url!==d.url||ownership.page_mutation_authorized||
    ownership.form_implemented_verified||ownership.tracking_ga4_verified)
    throw Error('SEO_DRAFT_OWNER_INTENT_QA_DENIED');
  const topic=(plain(d.title)||'tu operación inmobiliaria').slice(0,116);
  const candidate=topic+'. Revisa los puntos clave y solicita orientación con Fénix Capital.';
  const proposedMeta=candidate.length<=155?candidate:candidate.slice(0,152).replace(/\s+\S*$/,'')+'...';
  drafts.push({schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
   environment:'LAB',status:'UNPUBLISHED_EDITORIAL_PROPOSAL',
   existing_post_id:d.post_id,existing_url:d.url,existing_title:topic,
   source_copy_sha256:sha(d.copy_text),source_snapshot_digest:corpus.corpus_digest,
   original_meta_description:plain(d.yoast?.description||'')||null,
   proposed_meta_description:proposedMeta,
   suggested_cta:'Solicita una revisión inicial de tu caso con Fénix Capital.',
   suggested_passage:'Antes de decidir, conviene revisar la documentación, los costes y las condiciones que correspondan a tu situación. Consulta las opciones aplicables y resuelve tus dudas con asesoramiento personalizado.',
   existing_internal_links:d.internal_links.slice(0,3),
   source_images:d.images.slice(0,3).map(x=>({src:x.src,alt:x.alt||null})),
   source_keyword:d.yoast?.focus_keyword||null,
   strategic_owner:{persona:ownership.persona,family:ownership.family,
    funnel_stage:ownership.funnel_stage,conversion_goal:ownership.conversion_goal,
    proposed_cta_contract:ownership.proposed_cta,
    required_form_contract:ownership.form_contract,
    lead_magnet_contract:ownership.downloadable,
    newsletter_line:ownership.newsletter_line,
    forms_and_magnet_not_proven_connected:true,
    google_cannibalization_has_not_been_proven:true},
   keyword_exact_collision_blocked:true,
   future_new_image_provider:'CREATIVE-PROGRAMMATIC-RENDER-V1',
   image_import_requires_verified_asset_qa:true,
   media_queue_could_still_be_pending:true,
   review_required:['SEO-D13:EDITORIAL','SEO-D16:YMYL','SEO-D26:IMAGE_RIGHTS',
    'SEO-D31:INDEPENDENT_QA','TRIBUNAL','BACKUP_OLD_VS_NEW_ROLLBACK'],
   can_change_existing_url:false,can_publish:false,can_spend:false,
   source_rendered_checked:false,image_rights_checked:false,
   status_detail:'DRAFT_REQUIRES_REVIEW_NOT_YET_APPLIED'});
 }
 if(drafts.length!==20||new Set(drafts.map(x=>x.existing_post_id)).size!==20)
  throw Error('SEO_DRAFT_INCOMPLETE');
 return {schema_version:'1.0.0',status:'TWENTY_EDITORIAL_DRAFTS_READY_FOR_SANDBOX_WRITE',
  source_snapshot_digest:corpus.corpus_digest,source_documents:200,
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  draft_count:20,drafts,originals_unmodified:true,
  keyword_overlap_candidates_held:owner.exact_keyword_duplicate_count,
  funnel_blueprints_defined:owner.funnel_contracts.length,
  existing_urls_preserved:true,
  wordpress_write_permission:false,external_write_permission:false,
  requires_independent_editorial_signoff:true};
}
function tempDir(root){
 if(typeof root!=='string'||!path.isAbsolute(root)||root.includes('..')||
  root.includes('\0'))throw Error('SEO_SANDBOX_PATH_DENIED');
 const dir=path.resolve(root),temp=path.resolve(process.env.RUNNER_TEMP||os.tmpdir());
 if(!(dir===temp||dir.startsWith(temp+path.sep)))throw Error('SEO_OUTSIDE_TEMP');
 fs.mkdirSync(dir,{recursive:true});
 if(fs.lstatSync(dir).isSymbolicLink())throw Error('SEO_SYMLINK_DENIED');
 return dir;
}
export function physicallyWriteSeoDrafts({output_root,bundle}={}){
 if(bundle?.status!=='TWENTY_EDITORIAL_DRAFTS_READY_FOR_SANDBOX_WRITE'||
 bundle.drafts?.length!==20||bundle.wordpress_write_permission!==false||
 bundle.originals_unmodified!==true)throw Error('SEO_DRAFT_SCOPE_DENIED');
 const root=tempDir(output_root),dest=path.join(root,NAME);
 const files=bundle.drafts.map(x=>({name:'draft-'+x.existing_post_id+'.json',
  content:JSON.stringify(x,null,2)+'\n'}));
 if(new Set(files.map(f=>f.name)).size!==20)throw Error('SEO_DRAFT_DUPLICATE');
 const manifest={schema_version:'1.0.0',status:'REAL_SANDBOX_FILES',
  source_snapshot_digest:bundle.source_snapshot_digest,
  files:files.map(f=>({name:f.name,sha256:sha(f.content)})),
  wordpress_writes:0,prod_approval:false};
 const serialized=JSON.stringify(manifest,null,2)+'\n';
 if(fs.existsSync(dest)){
  if(!fs.lstatSync(dest).isDirectory()||fs.lstatSync(dest).isSymbolicLink())
   throw Error('SEO_EXISTING_DIR_DENIED');
  if(fs.readFileSync(path.join(dest,'manifest.json'),'utf8')!==serialized)
   throw Error('SEO_IDEMPOTENCY_MANIFEST_CONFLICT');
  for(const f of files)if(fs.readFileSync(path.join(dest,f.name),'utf8')!==f.content)
   throw Error('SEO_IDEMPOTENCY_CONTENT_CONFLICT');
  return {state:'ALREADY_WRITTEN_IDEMPOTENT',directory:dest,file_count:21,
   manifest_sha256:sha(serialized),production_writes:0};
 }
 const stage=fs.mkdtempSync(path.join(root,'.seo-stage-'));
 try{
  for(const f of files)fs.writeFileSync(path.join(stage,f.name),f.content,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(stage,'manifest.json'),serialized,{flag:'wx',mode:0o600});
  fs.renameSync(stage,dest);
 }catch(e){fs.rmSync(stage,{recursive:true,force:true});throw e}
 return {state:'SANDBOX_FILES_WRITTEN',directory:dest,file_count:21,
  manifest_sha256:sha(serialized),production_writes:0};
}
export function proveSeoDraftRollback({output_root}={}){
 const dir=tempDir(output_root),stage=fs.mkdtempSync(path.join(dir,'.seo-rollback-'));
 const witness=path.join(stage,'canary.json'),safe=path.join(dir,'preexisting-preserve-canary');
 if(fs.existsSync(safe))throw Error('SEO_ROLLBACK_CONFLICT');
 const content='PRESERVE-'+sha(dir);
 try{
  fs.writeFileSync(safe,content,{flag:'wx'});
  fs.writeFileSync(witness,JSON.stringify({kind:'LAB_ROLLBACK_TEST'}),{flag:'wx'});
  if(!fs.existsSync(witness))throw Error('SEO_CANARY_NOT_WRITTEN');
  fs.rmSync(stage,{recursive:true});
  if(fs.existsSync(stage)||fs.readFileSync(safe,'utf8')!==content)
   throw Error('SEO_ROLLBACK_UNSAFE');
  return {status:'LAB_ROLLBACK_PHYSICALLY_VERIFIED',
   created_file_removed:true,preexisting_file_preserved:true,
   production_rollback_tested:false};
 }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true});
  if(fs.existsSync(safe))fs.unlinkSync(safe)}
}
export async function executeSeoSandboxWrite({worker,qa,tribunal,identity,output_root}={}){
 limitedHost(identity);
 if(worker?.status!=='READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED'||
 qa?.status!=='SEPARATE_GITHUB_QA_RECOMPUTED_141_CORPUS_TASKS'||
 tribunal?.status!=='CORPUS_REAL_WORK_VERIFIED_NO_PROD_PROMOTION'||
 tribunal.decision!=='ACCEPT_SNAPSHOT_BASED_WORK_EVIDENCE_HOLD_PROD'||
 tribunal.specialist_work_products_verified!==141||
 qa.specialist_work_products_independently_verified!==141||
 !Array.isArray(tribunal.github_independent_host_job_names)||
 new Set([identity.github_job_name,...tribunal.github_independent_host_job_names]).size!==4||
 worker.prod_authorized!==false||worker.web_mutations!==0)
  throw Error('SEO_DRAFT_QA_TRIBUNAL_DENIED');
 const corpus=loadFrozenSeoCorpus(),evidence=expectedSeoRoleEvidence(corpus);
 independentlyReviewSeoWorkProducts({work_products:worker.work_products,corpus,evidence});
 const bundle=createSeoEditorialWriteBundle({corpus,work_products:worker.work_products});
 const gateway=new ActionGatewayV1({environment:'PREPROD'});
 gateway.registerCapability('SEO_WRITE_EDITORIAL_DRAFT_FILES_LAB',async ({context,payload})=>{
  if(context.company_id!=='fenix'||payload?.source_digest!==corpus.corpus_digest||
    payload?.allow_prod!==false||payload?.draft_count!==20)
   throw Error('SEO_DRAFT_CAPABILITY_SCOPE');
  return {write:physicallyWriteSeoDrafts({output_root,bundle}),
   rollback:proveSeoDraftRollback({output_root})};
 });
 const result=await gateway.execute({
  context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'2.3.0'},
  capability:'SEO_WRITE_EDITORIAL_DRAFT_FILES_LAB',authorized:true,risk:'LOW',
  requires_prod_write:false,autonomous_prod:false,trading_access:false,
  estimated_additional_cost_eur:0,
  idempotency_key:'seo-lab-write-'+corpus.corpus_digest,
  payload:{source_digest:corpus.corpus_digest,allow_prod:false,draft_count:20}});
 if(result.status!=='ACTION_EXECUTED'||result.result?.write?.file_count!==21||
  result.result?.rollback?.status!=='LAB_ROLLBACK_PHYSICALLY_VERIFIED')
  throw Error('SEO_DRAFT_WRITE_NOT_COMPLETED');
 return {status:'REAL_SANDBOX_DRAFT_WRITE_COMPLETED',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  gateway:'ACTGW-001',writer_job_id:identity.github_job_id,
  output_directory:result.result.write.directory,
  file_count:21,editorial_drafts:20,
  idempotency_state:result.result.write.state,
  rollback_canary_verified:true,
  wordpress_writes:0,github_repo_commits_by_workflow:0,
  production_rollback_tested:false,prod_authorized:false,
  new_subscriptions_eur:0};
}
async function main(){
 const [cmd,workerFile,qaFile,tribunalFile,workerId,qaId,tribId,writerId,outDir,receipt]=process.argv.slice(2);
 if(cmd!=='write'||!outDir||!receipt)throw Error('SEO_DRAFT_USAGE');
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
 for(const previous of [workerId,qaId,tribId])await verifyPriorSeoJob({prior:read(previous),env:process.env});
 const x=await executeSeoSandboxWrite({worker:read(workerFile),qa:read(qaFile),
  tribunal:read(tribunalFile),identity:read(writerId),output_root:outDir});
 fs.writeFileSync(receipt,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:x.status,drafts:20,
  lab_rollback_verified:true,wordpress_writes:0})+'\n');
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(String(e.message||'BLOCKED')+'\n');process.exitCode=1});
