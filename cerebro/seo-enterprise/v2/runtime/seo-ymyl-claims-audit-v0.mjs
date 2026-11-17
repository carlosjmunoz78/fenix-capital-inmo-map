/** D16 evidence request queue for potentially material financial copy claims on public STAGING.
 * A detection is never a conclusion of false advertising or legal advice.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStagingSnapshot} from './staging-readonly-inspector-v0.mjs';
import {extractTextForSeoQa} from './staging-transversal-readonly-v0.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const rules=[
 {code:'LTV_100_PERCENT',regex:/(?:\bhipotec\w*\b.{0,45}\b100\s*%|\b100\s*%.{0,45}\bhipotec\w*\b)/gi,need:'BANK_PRODUCT_LTV_ELIGIBILITY_EVIDENCE'},
 {code:'SERVICE_SLA_24H',regex:/(?:\b(?:preestudio|pre-estudio|pretasaci[oó]n|pre-tasaci[oó]n|respuesta)\b.{0,45}\b24\s*(?:h|horas)\b|\b24\s*(?:h|horas)\b.{0,45}\b(?:preestudio|pretasaci[oó]n)\b)/gi,need:'INTERNAL_SERVICE_SLA_EVIDENCE'},
 {code:'APPROVAL_GUARANTEE',regex:/(?:\b(?:garantizamos|aprobamos|conseguimos)\b.{0,80}\b(?:hipoteca|financiaci[oó]n)\b|\bhipoteca.{0,55}\bgarantizad[ao]s?\b)/gi,need:'LEGAL_BANK_POLICY_VERIFICATION'},
 {code:'FINANCING_WITHOUT_SAVINGS',regex:/(?:\bhipotec\w*.{0,50}\bsin ahorros\b|\bsin ahorros\b.{0,50}\bhipotec\w*)/gi,need:'BANK_PRODUCT_AND_ELIGIBILITY_EVIDENCE'},
 {code:'RATE_CLAIM',regex:/\b\d+(?:[.,]\d{1,3})?\s*%\s*(?:de\s+)?(?:TAE|TIN|inter[eé]s)\b/gi,need:'LENDER_RATE_DATE_AND_TERMS'}
];
export function inspectYMYLStaging({html,headers='',status=200,url='https://staging.fenixcapital.es/'}){
 const stage=inspectStagingSnapshot({html,headers,status,url});
 if(!stage.staging_readonly_probe_passed)throw Error('YMYL_PUBLIC_STAGING_ONLY');
 const text=extractTextForSeoQa(html),text_sha=sha(text);
 const claims=rules.flatMap(rule=>[...text.matchAll(rule.regex)].slice(0,200).map(m=>({
   claim_id:sha(rule.code+':'+m.index+':'+text_sha).slice(0,20),
   code:rule.code,plain_text_offset:m.index,match_length:m[0].length,
   claim_text_not_stored:true,
   evidence_required:rule.need,
   source_evidence_provided:false,
   factual_verdict:'NOT_FACT_CHECKED',
   status:'EDITORIAL_EVIDENCE_REQUIRED'
 })));
 const unique=new Map(claims.map(c=>[c.claim_id,c]));
 return {schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'STAGING_READONLY',
  version:'0.1.0',department_id:'SEO-D16',source_url:url,source_html_sha256:stage.html_sha256,
  content_sha256:text_sha,source_http_status:status,claims_detected:unique.size,
  risk_codes:[...new Set([...unique.values()].map(x=>x.code))].sort(),
  findings:[...unique.values()].slice(0,120),
  note:'These are review candidates, not proven falsehoods, and no live third-party evidence was fetched.',
  fact_check_completed:false,independent_financial_reviewer_verified:false,
  independent_legal_reviewer_verified:false,review_required_for_pub:true,
  content_edits:0,external_writes:0,ready:false,prod_authorized:false,additional_cost_eur:0};
}
async function main(){
 const [htmlFile,headersFile,statusRaw,reportFile]=process.argv.slice(2);
 if(![htmlFile,headersFile,statusRaw].every(Boolean))throw Error('ARGS_REQUIRED');
 const report=inspectYMYLStaging({html:fs.readFileSync(htmlFile,'utf8'),
  headers:fs.readFileSync(headersFile,'utf8'),status:Number(statusRaw)});
 const serialized=JSON.stringify(report,null,2)+'\n';
 if(reportFile)fs.writeFileSync(reportFile,serialized,'utf8');
 process.stdout.write(serialized);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({state:'BLOCKED',reason:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;});
