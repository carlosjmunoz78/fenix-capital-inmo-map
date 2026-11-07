/** SEO-001 staging public homepage: multi-department observational probes, no live writes. */
import {inspectStagingSnapshot} from './staging-readonly-inspector-v0.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
function tags(html,name){return [...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','ig'))].map(m=>m[0]);}
function attr(tag,k){return tag.match(new RegExp('(?:^|\\s)'+k+'\\s*=\\s*([\"\\x27])([\\s\\S]*?)\\1','i'))?.[2]??null;}
function safeUrl(href,base){try{const u=new URL(href,base);return ['http:','https:'].includes(u.protocol)?u:null}catch{return null}}
const assessment=(department_id,indicators,limits)=>({department_id,observation_state:'PARTIAL_READONLY_PAGE_OBSERVATION',indicators,not_proven:limits});
export function inspectCrossDepartmentPage({html,headers='',status,url='https://staging.fenixcapital.es/'}){
 const upstream=inspectStagingSnapshot({html,headers,status,url});
 if(!upstream.staging_readonly_probe_passed)throw Error('STAGING_PRECHECK_FAILED');
 const as=tags(html,'a'),imgs=tags(html,'img'),forms=tags(html,'form');
 const links=as.map(t=>safeUrl(attr(t,'href')||'',url)).filter(Boolean);
 const internal=links.filter(u=>u.hostname==='fenixcapital.es'||u.hostname.endsWith('.fenixcapital.es'));
 const missingAlt=imgs.filter(t=>attr(t,'alt')===null).length;
 const emptyAlt=imgs.filter(t=>attr(t,'alt')==='').length;
 const jsonLd=[...html.matchAll(/<script\b([^>]*?)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(x=>/application\/ld\+json/i.test(attr('<script '+x[1]+'>','type')||''));
 let parsed=0,invalid=0;const schemaTypes=[];
 for(const b of jsonLd){try{const obj=JSON.parse(b[2].trim());parsed++;const vals=Array.isArray(obj)?obj:[obj];for(const value of vals)if(value&&typeof value==='object'&&value['@type'])schemaTypes.push(value['@type']);}catch{invalid++}}
 const h2s=[...html.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2\s*>/gi)].length;
 const hasCordoba=/c[oó]rdoba/i.test(html),telLink=/href\s*=\s*([\"'])tel:/i.test(html);
 const faqText=/preguntas frecuentes|frequently asked questions/i.test(html);
 const observations=[
 assessment('SEO-D11',{home_internal_links:internal.length,home_total_links:links.length,h2_count:h2s},['NO_FULL_SITE_CRAWL','NO_ORPHAN_URL_PROOF']),
 assessment('SEO-D12',{jsonld_blocks:jsonLd.length,jsonld_parsed:parsed,jsonld_invalid:invalid,schema_types:schemaTypes.slice(0,20)},['NO_RICH_RESULTS_VALIDATION','NO_GOOGLE_RESULT_PROOF']),
 assessment('SEO-D17',{mentions_cordoba:hasCordoba,has_tel_link:telLink},['NO_GBP_ACCESS','NO_NAP_CONSISTENCY_PROOF']),
 assessment('SEO-D21',{h1_count:upstream.h1_count,h2_count:h2s},['NO_MOBILE_OR_USER_TEST']),
 assessment('SEO-D23',{html_size_bytes:Buffer.byteLength(html),image_count:imgs.length},['NO_REAL_CWV_FIELD_METRICS','NO_SECURITY_CERTIFICATION']),
 assessment('SEO-D24',{form_count:forms.length,form_methods:forms.map(f=>(attr(f,'method')||'GET').toUpperCase()).slice(0,20)},['NO_CONSENT_CRM_E2E','NO_LEADS_PROOF']),
 assessment('SEO-D25',{faq_copy_observed:faqText,jsonld_blocks:jsonLd.length},['NO_AI_ENGINE_VISIBILITY_MEASUREMENT']),
 assessment('SEO-D26',{images:imgs.length,missing_alt_attribute:missingAlt,empty_alt_attribute:emptyAlt},['NO_VISUAL_ASSET_REVIEW','NO_YOUTUBE_AUDIT'])];
 return {schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'STAGING_READONLY',version:'0.1.0',source:url,source_sha256:createHash('sha256').update(html).digest('hex'),technical_gate:upstream.staging_readonly_probe_passed,observations,independent_agent_verification:false,full_department_ready:false,cost_added_eur:0,external_writes:0,prod_authorized:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [body,headers,statusRaw]=process.argv.slice(2);
  const r=inspectCrossDepartmentPage({html:readFileSync(body,'utf8'),headers:readFileSync(headers,'utf8'),status:Number(statusRaw)});
  process.stdout.write(JSON.stringify(r,null,2)+'\n');
 }catch(e){process.stderr.write(JSON.stringify({state:'BLOCKED',reason:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2}
}
