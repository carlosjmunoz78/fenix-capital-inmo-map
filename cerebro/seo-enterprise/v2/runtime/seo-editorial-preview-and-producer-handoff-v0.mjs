/**
 * SEO-001 PREPROD review bundle using existing CEREBRO editorial & UMS contracts.
 * Zero CMS / paid API / external requests. Build actual HTML previews and JSON image
 * briefs; producer dispatch and publication are explicitly separate permission gates.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadVerifiedWorkItem} from './seo-editorial-qa-job001-pipeline-v0.mjs';
import {auditOwnerEditorialCopy,buildSeoProducerImageOrder,
  validateSeoProducerOrder} from './seo-owner-editorial-visual-gate-v2.mjs';

export const WORK_IDS=Object.freeze(['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002']);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=c=>{throw Error('SEO_PREVIEW_'+c)};
const htmlEsc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const CSS=[
':root{color-scheme:light;--ink:#17212c;--muted:#556170;--border:#e7e9ed;--accent:#b85320}',
'*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);background:#f6f7f9;margin:0}',
'.top{background:#222;color:white;padding:16px max(24px,calc((100vw - 1000px)/2));font-size:13px;letter-spacing:.04em}',
'.top strong{color:#ffb71b}main{max-width:1000px;margin:25px auto;padding:0 18px 50px}',
'article{background:white;border-radius:18px;padding:clamp(20px,4vw,52px);box-shadow:0 5px 35px #1b243014}',
'.eyebrow{font-weight:700;color:var(--accent);font-size:.85rem;text-transform:uppercase}',
'h1{font-size:clamp(30px,4vw,48px);line-height:1.12;letter-spacing:-.025em;margin:16px 0 28px}',
'h2{font-size:clamp(23px,2.7vw,29px);line-height:1.2;letter-spacing:-.015em;margin:36px 0 12px}',
'h3{font-size:18px;line-height:1.3;margin:0 0 7px}',
'p{font-size:17px;line-height:1.7;margin:0 0 17px;color:#273748}',
'a{color:#8c3c12;text-decoration-thickness:1px;text-underline-offset:3px}',
'.hero-slot{aspect-ratio:40/21;border:2px dashed #d1d7de;border-radius:16px;background:linear-gradient(130deg,#f7f9fa,#e8edf0);display:flex;justify-content:center;align-items:center;padding:20px;text-align:center;color:#445566;margin:0 0 27px}',
'.hero-slot p{font-size:14px;color:#445566;margin:4px}.hero-slot strong{font-size:15px}',
'.faq{border-top:2px solid var(--border);margin-top:45px;padding-top:8px}',
'.faq-item{padding:18px 0;border-bottom:1px solid var(--border)}.faq-item p{margin-bottom:0;font-size:16px}',
'.footer{max-width:1000px;margin:22px auto;padding:0 20px;color:var(--muted);font-size:13px}',
'@media(max-width:640px){main{margin:0 auto;padding:0 0 35px}article{border-radius:0;box-shadow:none}.hero-slot{border-radius:8px}}'
].join('\n');
const articleBody=s=>String(s).replace(/<!--[\s\S]*?-->/g,'').trim();
function validateContent(s){
 if(/<(?:script|iframe|form|object|embed|img|svg|style|link|base)\b/i.test(s))fail('UNREVIEWED_ACTIVE_OR_MEDIA_TAG');
 if(/\s(?:onload|onclick|onerror|onfocus|style|srcdoc)\s*=/i.test(s))fail('UNREVIEWED_HANDLER');
 const urls=[...s.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);
 if(urls.some(u=>!/^https:\/\/fenixcapital\.es\/[A-Za-z0-9/%._?=-]*$/.test(u)))fail('UNTRUSTED_LINK');
 const title=/<h1>([^<]+)<\/h1>/i.exec(s)?.[1];
 if(!title||title.length>80)fail('TITLE');
 return {title,urls};
}
export function prepareSeoReviewPackage({root=process.cwd(),ids=WORK_IDS}={}){
 if(!Array.isArray(ids)||ids.length!==2||new Set(ids).size!==2||
  !WORK_IDS.every(x=>ids.includes(x)))fail('WORK_SCOPE');
 const units=[];
 for(const work_id of WORK_IDS){
  const item=loadVerifiedWorkItem({root,work_id});
  const checked=auditOwnerEditorialCopy({html:item.html,persona:item.draft.persona,
   content_type:item.draft.content_type});
  if(!checked.deterministic_style_precheck_passed||checked.faq_count!==6)fail('COPY_QA');
  const body=articleBody(item.html),title=validateContent(body).title;
  const producer=buildSeoProducerImageOrder({
   company_id:'fenix',work_id,persona:item.draft.persona,
   source_content_sha256:item.digest,...item.draft.image
  });
  const producerPrecheck=validateSeoProducerOrder({order:producer});
  if(!producerPrecheck.metadata_complete||producerPrecheck.api_called!==false)fail('PRODUCER');
  units.push({item,checked,body,title,producer});
 }
 if(units[0].producer.brief.subject===units[1].producer.brief.subject)fail('MEDIA_CONCEPT_DUPLICATE');
 const entries=[];
 for(const {item,checked,body,title,producer} of units){
  const key=item.draft.persona==='PARTICULARES'?'compradores':'inmobiliarias';
  const filename=key+'.html';
  const page=[
   '<!doctype html><html lang="es"><head><meta charset="UTF-8">',
   '<meta name="viewport" content="width=device-width, initial-scale=1">',
   '<meta name="robots" content="noindex,nofollow,noarchive">',
   '<title>',htmlEsc(title),' | CEREBRO revisión interna</title>',
   '<style>',CSS,'</style></head><body>',
   '<header class="top"><strong>CEREBRO SEO · PREPROD</strong> &nbsp; Revisión de artículo · NO PUBLICADO</header>',
   '<main><article><div class="eyebrow">',key==='compradores'?'Particulares':'Inmobiliarias',' · Córdoba</div>',
   '<div class="hero-slot" role="img" aria-label="Espacio reservado para fotografía pendiente de la productora">',
   '<div><strong>Fotografía original pendiente de UMS-001</strong><p>El encargo visual se procesa por separado y sin textos en la imagen</p></div>',
   '</div>',body,'</article></main>',
   '<footer class="footer">Solo vista previa de estructura y copy. La imagen, los enlaces y las afirmaciones requieren revisión. No es una publicación WordPress.</footer>',
   '</body></html>'
  ].join('');
  entries.push({work_id:item.work_id,persona:item.draft.persona,
    article:filename,html:page,sha256:item.digest,git_blob_sha:item.blob,
    faq_count:checked.faq_count,
    image_order_filename:key+'-ums-image-order.json',
    producer_order:producer});
 }
 const index=[
  '<!doctype html><html lang="es"><head><meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="robots" content="noindex,nofollow,noarchive"><title>CEREBRO revisión editorial</title>',
  '<style>',CSS,'</style></head><body><header class="top"><strong>CEREBRO SEO</strong> &nbsp; Revisión interna</header>',
  '<main><article><h1>Dos artículos preparados para revisión</h1>',
  '<p>Ambos incorporan seis preguntas frecuentes. Las fotografías están pendientes y no se representa ninguna como si estuviera generada.</p>',
  entries.map(e=>'<p><a href="'+e.article+'">'+htmlEsc(e.persona==='PARTICULARES'?'Comprar vivienda en Córdoba':'Colaboración con inmobiliarias')+'</a></p>').join(''),
  '<p>Esta vista no modifica WordPress ni constituye autorización para publicar.</p>',
  '</article></main></body></html>'
 ].join('');
 return Object.freeze({schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  version:'0.1.0',index,
  entries:Object.freeze(entries),wordpress_mutations:0,image_api_calls:0,media_created:false,
  qa_professional_verified:false,production_release_authorized:false});
}
export function physicallyWriteSeoReviewPackage({package_data,output_dir}={}){
 if(package_data?.company_id!=='fenix'||package_data?.environment!=='PREPROD'||
  package_data?.entries?.length!==2||package_data.production_release_authorized!==false||
  package_data.image_api_calls!==0||package_data.wordpress_mutations!==0)fail('WRITE_SCOPE');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))fail('PATH_REQUIRED');
 const target=path.resolve(output_dir);
 const allowedBases=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!allowedBases.some(base=>target===base||target.startsWith(base+path.sep)))fail('OUTSIDE_TEMP');
 if(fs.existsSync(target))fail('OUTPUT_ALREADY_EXISTS');
 fs.mkdirSync(target,{recursive:true,mode:0o700});
 const files={'index.html':package_data.index};
 for(const e of package_data.entries){
  files[e.article]=e.html;
  files[e.image_order_filename]=JSON.stringify(e.producer_order,null,2)+'\n';
 }
 const manifest={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  article_count:2,total_faq:package_data.entries.reduce((n,x)=>n+x.faq_count,0),
  files:Object.entries(files).map(([name,value])=>({name,sha256:sha(value)})),
  content_sha256:package_data.entries.map(e=>({work_id:e.work_id,sha256:e.sha256,git_blob_sha:e.git_blob_sha})),
  wordpress_mutations:0,image_api_calls:0,media_created:false,
  independent_qa_approved:false,publish_authorized:false
 };
 files['manifest.json']=JSON.stringify(manifest,null,2)+'\n';
 for(const [name,value] of Object.entries(files)){
  if(!/^[a-z0-9][a-z0-9.-]+$/.test(name))fail('INVALID_ARTIFACT_FILENAME');
  fs.writeFileSync(path.join(target,name),value,{flag:'wx',mode:0o600});
 }
 return {status:'PREPROD_REVIEW_HTML_AND_UMS_BRIEFS_PHYSICALLY_WRITTEN',
  article_count:2,total_faq:manifest.total_faq,
  files:Object.keys(files).sort(),image_api_calls:0,wordPress_writes:0,
  image_production_status:'WAITING_FOR_PRODUCER',publish_authorized:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)fail('OUTPUT_PATH_REQUIRED');
 const receipt=physicallyWriteSeoReviewPackage({
  package_data:prepareSeoReviewPackage(),output_dir:path.resolve(process.argv[2])
 });
 process.stdout.write(JSON.stringify(receipt)+'\n');
}
