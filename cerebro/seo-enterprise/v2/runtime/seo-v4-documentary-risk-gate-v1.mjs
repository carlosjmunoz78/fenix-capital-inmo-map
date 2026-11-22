/**
 * SEO-D31 source-backed YMYL risk gate, additive PREPROD only.
 * Inputs MUST be actual HTML bytes and SHA; an existing technical-green receipt
 * never implies factual correctness. No provider/WordPress calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const FILE='cerebro/seo-enterprise/v2/registry/seo001-v4-documentary-risk-ledger-v1.json';
const sha=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
const no=x=>{throw Error('SEO_YMYL_'+x)};
const visible=x=>x.replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|quot);/gi,' ')
 .replace(/\s+/g,' ').trim();
function validateLedger(ledger){
 if(ledger.company_id!=='fenix'||ledger.engine_id!=='SEO-001'||
  ledger.environment!=='PREPROD'||ledger.publication_authorized!==false||
  ledger.independent_professional_legal_signoff!==false||
  !Array.isArray(ledger.articles)||ledger.articles.length!==2)no('LEDGER_SCOPE');
 for(const a of ledger.articles){
  if(!/^SEO001-FENIX-B2[BC]-EDITORIAL-00[12]$/.test(a.work_id)||
   !/^[a-f0-9]{64}$/.test(a.sha256)||a.issues.length<3)no('WORK_SCOPE');
  for(const risk of a.issues){
   if(!/^[A-Z0-9_]{8,100}$/.test(risk.code)||typeof risk.needle!=='string'||
    risk.needle.length<24||!['HIGH','MEDIUM'].includes(risk.severity)||
    !['REWRITE_AND_LEGAL_QA','REWRITE_AND_YMYL_QA','REWRITE_FOR_ACCURACY',
      'REWRITE_OR_SOURCE_PROOF','PROFESSIONAL_SCOPE_CHECK'].includes(risk.action)||
    (risk.source_url!==null&&!/^https:\/\/(?:www\.)?(?:boe\.es|registradores\.org|sede\.registradores\.org|bde\.es)\/.+/.test(risk.source_url)))
    no('RISK_CONTRACT');
  }
 }
 return ledger;
}
export function loadDocumentaryRiskLedger({root=process.cwd()}={}){
 return validateLedger(JSON.parse(fs.readFileSync(path.resolve(root,FILE),'utf8')));
}
export function auditSeoV4DocumentaryRisk({work_id,html,ledger=null,root=process.cwd()}={}){
 const source=ledger?validateLedger(ledger):loadDocumentaryRiskLedger({root});
 const item=source.articles.find(x=>x.work_id===work_id);
 if(!item||typeof html!=='string'||html.length<500)no('EXACT_ARTICLE_REQUIRED');
 const digest=sha(html);
 if(digest!==item.sha256)return Object.freeze({
  status:'HOLD_NEW_SHA_REQUIRES_NEW_DOCUMENTARY_QA',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  work_id,expected_sha256:item.sha256,observed_sha256:digest,
  risk_count:null,independent_professional_legal_signoff:false,
  wordpress_writes:0,publish_authorized:false
 });
 const text=visible(html);
 const observed=item.issues.map(x=>({
  code:x.code,severity:x.severity,
  observed:text.includes(x.needle),
  authoritative_source_url:x.source_url,
  action:x.action,source_url_is_fact_check_receipt:false
 }));
 if(observed.some(x=>!x.observed))no('LEDGER_STALE_OR_CONTENT_DRIFT');
 return Object.freeze({
  status:'DOCUMENTARY_HIGH_RISK_RELEASE_HOLD',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',
  work_id,source_sha256:digest,
  owner_source_review:'PUBLIC_OFFICIAL_DOCUMENTARY_RESEARCH_DONE_PARTIAL',
  risk_count:observed.length,high_risk_count:observed.filter(x=>x.severity==='HIGH').length,
  findings:observed,
  facts_independently_professionally_verified:false,
  no_legal_overclaims_verified:false,
  rewrite_and_new_content_sha_required:true,
  photo_generation_authorized:false,wordpress_writes:0,publish_authorized:false
 });
}
export function writeDocumentaryRiskReport({results,output_dir}={}){
 if(!Array.isArray(results)||results.length!==2||results.some(x=>x.company_id!=='fenix'||x.publish_authorized!==false))
  no('REPORT');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))
  no('OUTPUT_PATH');
 const dest=path.resolve(output_dir);
 const valid=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!valid.some(x=>dest.startsWith(x+path.sep))||fs.existsSync(dest))no('OUTPUT_NOT_ISOLATED');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(dest,'ymyl-source-audit.json'),JSON.stringify({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',
  status:'PUBLIC_OFFICIAL_SOURCE_RESEARCH_ONLY_INDEPENDENT_LEGAL_REVIEW_PENDING',
  items:results,provider_calls:0,image_calls:0,
  wordpress_writes:0,publish_authorized:false
 },null,2)+'\n',{mode:0o600,flag:'wx'});
 return {status:'DOCUMENTARY_QA_EVIDENCE_WRITTEN_RELEASE_HOLD',
  items:results.map(x=>({work_id:x.work_id,risk_count:x.risk_count,high_risk_count:x.high_risk_count})),
  provider_calls:0,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output)no('CLI_INPUT_OUTPUT');
 const cases=[
  {work_id:'SEO001-FENIX-B2C-EDITORIAL-001',filename:'b2c-v4-review-only.html'},
  {work_id:'SEO001-FENIX-B2B-EDITORIAL-002',filename:'b2b-v4-review-only.html'}
 ];
 const results=cases.map(x=>auditSeoV4DocumentaryRisk({
  work_id:x.work_id,html:fs.readFileSync(path.join(input,x.filename),'utf8')
 }));
 const out=writeDocumentaryRiskReport({results,output_dir:path.resolve(output)});
 process.stdout.write(JSON.stringify(out)+'\n');
}
