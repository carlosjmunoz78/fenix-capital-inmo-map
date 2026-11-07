/** Additive read-only D05/D08 keyword-URL assignment audit; NO live GSC claims. */
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.normalize('NFKC').trim().toLocaleLowerCase('es');
export function auditKeywordAssignments({company_id,environment,version,source_kind,source_ref,rows=[],analyst_id,qa_actor_id}={}){
 if(!/^[a-z0-9_-]{2,70}$/i.test(company_id||''))throw Error('COMPANY_SCOPE_REQUIRED');
 if(!['LAB','PREPROD'].includes(environment))throw Error('ENVIRONMENT_DENIED');
 if(!/^[0-9a-z_.-]{2,32}$/i.test(version||''))throw Error('VERSION_REQUIRED');
 if(!['GSC_EXPORT','LAB_FIXTURE'].includes(source_kind)||typeof source_ref!=='string'||!source_ref.trim())throw Error('PROVENANCE_REQUIRED');
 if(!analyst_id||!qa_actor_id||analyst_id===qa_actor_id)throw Error('INDEPENDENT_QA_REQUIRED');
 if(!Array.isArray(rows)||rows.length>20000)throw Error('ROWS_LIMIT_DENIED');
 const urlAllowed=u=>{try{const p=new URL(u);return ['http:','https:'].includes(p.protocol)&&(p.hostname==='fenixcapital.es'||p.hostname.endsWith('.fenixcapital.es'))}catch{return false}};
 // This first adapter is Fénix-specific and must not silently accept another company's URLs.
 if(company_id!=='fenix')throw Error('TENANT_ADAPTER_NOT_CONFIGURED');
 const clean=rows.map((r,i)=>{
  if(typeof r.keyword!=='string'||!r.keyword.trim()||!urlAllowed(r.url))throw Error('ROW_INVALID_'+i);
  for(const k of ['clicks','impressions'])if(!Number.isInteger(r[k])||r[k]<0)throw Error('METRIC_INVALID_'+i);
  if(r.clicks>r.impressions)throw Error('METRIC_CONFLICT_'+i);
  return {keyword:normalize(r.keyword),url:new URL(r.url).href,clicks:r.clicks,impressions:r.impressions};
 });
 const byKeyword=new Map();
 for(const r of clean){const b=byKeyword.get(r.keyword)||new Map();const x=b.get(r.url)||{url:r.url,clicks:0,impressions:0};x.clicks+=r.clicks;x.impressions+=r.impressions;b.set(r.url,x);byKeyword.set(r.keyword,b);}
 const cannibalization_candidates=[...byKeyword].flatMap(([keyword,urls])=>urls.size<2?[]:[{keyword,assigned_urls:[...urls.values()].sort((a,b)=>b.impressions-a.impressions),decision:'HUMAN_SEO_REVIEW_BEFORE_ANY_REDIRECT',not_confirmed_cannibalization:true}]);
 const report={company_id,engine_id:'SEO-001',environment,version,source_kind,source_ref,input_sha256:sha(JSON.stringify(rows)),d05_unique_keywords:byKeyword.size,d08_cannibalization_candidates:cannibalization_candidates,qa_actor_id,analyst_id,qa_independent_logical_only:true,identity_proof_verified:false,source_freshness_verified:false,route_mutations_allowed:false,prod_authorized:false,additional_eur:0,paid_ai_calls:0};
 return Object.freeze({status:'LAB_READONLY_ANALYSIS_NOT_DEPARTMENT_READY',report});
}
