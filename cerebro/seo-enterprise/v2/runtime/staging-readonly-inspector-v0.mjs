/** Read-only HTTP snapshot inspector for STAGING home; NO live I/O here. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const attr=(tag,name)=>tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*([\"\\x27])([\\s\\S]*?)\\1','i'))?.[2]||'';
function htmlTags(html,tag){return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','ig'))].map(x=>x[0]);}
export function inspectStagingSnapshot({url,status,html,headers=''}) {
 if(url!=='https://staging.fenixcapital.es/')throw Error('STAGING_URL_NOT_ALLOWLISTED');
 if(typeof html!=='string'||html.length>2500000)throw Error('BODY_INVALID');
 const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim()||null;
 const h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/ig)].map(x=>x[1].replace(/<[^>]*>/g,'').trim());
 const robots=htmlTags(html,'meta').filter(t=>attr(t,'name').toLowerCase()==='robots').map(t=>attr(t,'content')).join(' | ');
 const xrobots=String(headers).match(/^x-robots-tag:\s*(.*)$/im)?.[1]||'';
 const links=htmlTags(html,'link');
 const canonical=links.find(t=>attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 const canonical_href=canonical?attr(canonical,'href'):null;
 const siteSignature=/f[eé]nix\s+capital/i.test(html);
 const noindex=/\bnoindex\b/i.test(robots+' '+xrobots);
 const findings=[];
 if(status!==200)findings.push('HTTP_NOT_200');
 if(!siteSignature)findings.push('SITE_IDENTITY_NOT_CONFIRMED');
 if(!noindex)findings.push('STAGING_NOINDEX_NOT_CONFIRMED');
 if(!title) findings.push('TITLE_MISSING');
 if(h1s.length!==1)findings.push('H1_COUNT_REVIEW');
 if(canonical_href&&canonical_href.startsWith('https://staging.fenixcapital.es'))findings.push('STAGING_CANONICAL_EXPOSURE_REVIEW');
 return {schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'STAGING_READONLY',version:'0.1.0',source_url:url,http_status:status,html_sha256:createHash('sha256').update(html).digest('hex'),title_present:!!title,h1_count:h1s.length,robots_meta:robots||null,x_robots_header:xrobots||null,canonical_host:canonical_href?new URL(canonical_href,url).hostname:null,noindex_confirmed:noindex,site_identity_confirmed:siteSignature,findings,staging_readonly_probe_passed:status===200&&siteSignature&&noindex,prod_authorized:false,staging_write_authorized:false,additional_cost_eur:0,external_mutations:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [bodyPath,headersPath,statusRaw]=process.argv.slice(2);
  const html=readFileSync(bodyPath,'utf8'),headers=readFileSync(headersPath,'utf8');
  const report=inspectStagingSnapshot({url:'https://staging.fenixcapital.es/',html,headers,status:Number(statusRaw)});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.staging_readonly_probe_passed)process.exitCode=2;
 }catch(err){process.stderr.write(JSON.stringify({state:'BLOCKED',reason:String(err.message).slice(0,100),writes:0})+'\n');process.exitCode=2;}
}
