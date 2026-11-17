import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const registryPath=path.resolve(HERE,'../registry/seo001-professional-source-registry-v0.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export async function checkOfficialSeoFeed({fetchImpl=fetch,priorDigest=null,signal}={}){
 const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 if(registry.policy.no_prod_writes!==true||registry.policy.no_paid_api!==true||registry.policy.no_new_cron!==true)throw Error('POLICY_DRIFT');
 const src=registry.sources.find(s=>s.source_id==='GSC-RSS');
 if(!src||src.url!=='https://developers.google.com/search/updates/search_docs_updates.rss'||src.fetch_allowed!==true)throw Error('SOURCE_NOT_ALLOWLISTED');
 if(priorDigest!==null&&!/^[a-f0-9]{64}$/.test(priorDigest))throw Error('INVALID_PREVIOUS_DIGEST');
 const response=await fetchImpl(src.url,{method:'GET',headers:{'Accept':'application/rss+xml, application/xml;q=0.9'},signal});
 if(!response.ok)throw Error('SOURCE_HTTP_'+response.status);
 const body=await response.text();
 if(body.length>1048576||!/<(?:rss|feed)\b/.test(body)||!/<(?:item|entry)\b/.test(body))throw Error('SOURCE_INVALID_XML_OR_SIZE');
 const digest=sha(body);
 const item=body.match(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/i)?.[1]||'';
 const capture=tag=>item.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,250)||null;
 const report={schema_version:'1.0.0',company_id:registry.company_id,engine_id:'SEO-001',department_id:'SEO-D09',source_id:src.source_id,environment:'LAB',version:'0.1.0',source_url:src.url,content_sha256:digest,previous_sha256:priorDigest,delta_state:priorDigest===null?'BASELINE_ONLY':priorDigest===digest?'UNCHANGED':'CHANGED',latest_item_title:capture('title'),latest_item_date:capture('pubDate')||capture('updated'),independent_qa:'SEO-D31_PENDING',learning:'SEO-D32_CANDIDATE_NOT_TRAINED',prod_publication_allowed:false,prod_departments_certified:0,new_subscription_cost_eur:0,rollback:'DISABLE_READONLY_JOB_AND_REVERT_SOURCE_REGISTRY_COMMIT'};
 return {...report,receipt_sha256:sha(JSON.stringify(report))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=process.argv[2];
 if(!out||!path.isAbsolute(out)||fs.existsSync(out))throw Error('NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{const report=await checkOfficialSeoFeed({signal:controller.signal,priorDigest:process.argv[3]||null});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});process.stdout.write(JSON.stringify({state:report.delta_state,source:report.source_id,sha256:report.content_sha256})+'\n')}
 finally{clearTimeout(timeout)}
}
