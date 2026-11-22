/** Real STAGING public HTML -> D09 inspect -> D15 copy QA -> D31 logical QA -> audit envelope. No writes. */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {inspectStagingSnapshot} from './staging-readonly-inspector-v0.mjs';
import {runSeoEditorialMission} from './seo-workforce-lab-v0.mjs';
export function extractTextForSeoQa(html){
 if(typeof html!=='string'||html.length>2500000)throw Error('HTML_TOO_LARGE');
 return html.replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
 .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
 .replace(/&#39;|&apos;/gi,"'").replace(/&ntilde;/gi,'ñ').replace(/&oacute;/gi,'ó')
 .replace(/\s+/g,' ').trim().slice(0,150000);
}
export function runStagingReadonlyMission({html,headers,status}){
 const technical=inspectStagingSnapshot({url:'https://staging.fenixcapital.es/',html,headers,status});
 if(!technical.staging_readonly_probe_passed)throw Error('STAGING_TECHNICAL_GATE_FAILED');
 const copy=extractTextForSeoQa(html);
 if(copy.length<8)throw Error('STAGING_VISIBLE_TEXT_EMPTY');
 const editorial=runSeoEditorialMission({
  mission_id:'SEO_STAGING_PUBLIC_READONLY_V0',company_id:'fenix',environment:'LAB',version:'0_1_0',
  author_actor_id:'SEO_D15_WORKER',reviewer_actor_id:'SEO_D31_QA',judge_actor_id:'SEO_JUDGE_A',
  sources:['https://staging.fenixcapital.es/'],text:copy,budget_eur:0,allow_writes:false,allow_paid_ai:false
 });
 return {schema_version:'0.1.0',status:'PHYSICAL_STAGING_READONLY_CROSS_DEPARTMENT_NOT_FULL_READY',
  departments_exercised:['SEO-D09','SEO-D15','SEO-D31'],technical,
  editorial:{source_text_sha256:editorial.evidence.source_sha256,
   findings:editorial.evidence.observations.slice(0,30),
   risk_flags:editorial.evidence.risk_flags.slice(0,30),
   reviewer:editorial.reviewer,verdict:editorial.verdict,merit:editorial.merit},
  runtime_identity_verified:false,independent_processes_verified:false,
  crm_form_e2e_verified:false,backup_and_restore_tested:false,rollback_physical_tested:false,
  full_department_ready:false,publish_allowed:false,prod_authorized:false,external_writes:0,additional_eur:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [htmlFile,headersFile,statusRaw]=process.argv.slice(2);
  const report=runStagingReadonlyMission({html:readFileSync(htmlFile,'utf8'),headers:readFileSync(headersFile,'utf8'),status:Number(statusRaw)});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
 }catch(err){process.stderr.write(JSON.stringify({status:'BLOCKED',error:String(err.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;}
}
