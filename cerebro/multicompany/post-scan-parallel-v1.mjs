import {createHash} from 'node:crypto';

export const POST_SCAN_ENGINE_IDS=Object.freeze(['KW-001','WAUD-001','SOCAUD-001','LOCALP-001']);
export const POST_SCAN_ENVIRONMENT='PREPROD';
export const POST_SCAN_VERSION='1.0.0';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const SECRET_KEYS=['token','secret','password','api_key','apikey','authorization','credential','private_key'];

function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex');}
function norm(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ');}
function assertBase({company_id,evidence_at,environment='PREPROD'}){
  if(!String(company_id??'').trim()) throw new Error('company_id required');
  if(!String(evidence_at??'').trim()) throw new Error('evidence_at required');
  if(environment!=='PREPROD') throw new Error('PREPROD_ONLY');
}
function rejectSecrets(value,path='root'){
  if(Array.isArray(value)){value.forEach((x,i)=>rejectSecrets(x,`${path}[${i}]`));return;}
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(SECRET_KEYS.some(s=>String(k).toLowerCase().includes(s))) throw new Error(`SECURITY_INCIDENT:${path}.${k}`);
      rejectSecrets(v,`${path}.${k}`);
    }
  }
}
function finalize(engine_id,company_id,evidence_at,payload,human_required_code=null){
  if(human_required_code!==null&&!HUMAN_REQUIRED.has(human_required_code)) throw new Error('invalid human_required_code');
  const evidence_sha256=sha256({company_id,engine_id,evidence_at,payload});
  const result={company_id,engine_id,environment:'PREPROD',version:POST_SCAN_VERSION,evidence_at,evidence_sha256,payload,human_required_code,read_only:true,remote_write:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  result.result_sha256=sha256(result);
  return result;
}

export function auditKeywords({company_id,evidence_at,scan_result,declared_seed_terms=[],locations=[],public_terms=[]}){
  assertBase({company_id,evidence_at}); rejectSecrets({scan_result,declared_seed_terms,locations,public_terms});
  if(scan_result?.company_id!==company_id||scan_result?.engine_id!=='SCAN-001') throw new Error('POLICY_CONFLICT:SCAN');
  const sources=new Map();
  const add=(value,source)=>{const k=norm(value);if(k.length<2)return;const set=sources.get(k)||new Set();set.add(source);sources.set(k,set);};
  declared_seed_terms.forEach(x=>add(x,'declared_seed')); locations.forEach(x=>add(x,'declared_location')); public_terms.forEach(x=>add(x,'public_signal'));
  const seeds=[...sources.keys()];
  for(const seed of seeds) for(const location of locations){const l=norm(location);if(l&&!seed.includes(l)) add(`${seed} ${l}`,'derived_location');}
  const opportunities=[...sources.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([keyword,refs])=>({keyword,source_refs:[...refs].sort(),priority:Math.min(10,3+refs.size+Math.min(3,Math.max(0,keyword.split(' ').length-1))),external_metrics:'unknown_without_authorized_source'}));
  return finalize('KW-001',company_id,evidence_at,{opportunities,opportunity_count:opportunities.length,external_metrics_fabricated:false},opportunities.length?null:'LOW_CONFIDENCE');
}

export function auditWebsite({company_id,evidence_at,scan_result,pages=[]}){
  assertBase({company_id,evidence_at}); rejectSecrets({scan_result,pages});
  if(scan_result?.company_id!==company_id||scan_result?.engine_id!=='SCAN-001') throw new Error('POLICY_CONFLICT:SCAN');
  if(!Array.isArray(pages)||pages.length===0) return finalize('WAUD-001',company_id,evidence_at,{pages_audited:0,findings:[]},'LOW_CONFIDENCE');
  const findings=[];
  for(const page of pages){
    const url=String(page?.url??''); const html=String(page?.html??''); const status=Number(page?.status??200); const low=html.toLowerCase();
    if(!/^https?:\/\//.test(url)) throw new Error('invalid public page url');
    if(status>=400) findings.push({code:'HTTP_ERROR',severity:'error',url,evidence:String(status)});
    if(!/<title[^>]*>\s*[^<]+\s*<\/title>/i.test(html)) findings.push({code:'MISSING_TITLE',severity:'warning',url});
    if(!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i.test(html)) findings.push({code:'MISSING_META_DESCRIPTION',severity:'warning',url});
    if(!/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+/i.test(html)) findings.push({code:'MISSING_CANONICAL',severity:'warning',url});
    const h1=(html.match(/<h1(?:\s|>)/gi)||[]).length; if(h1===0)findings.push({code:'MISSING_H1',severity:'warning',url}); if(h1>1)findings.push({code:'MULTIPLE_H1',severity:'info',url,evidence:String(h1)});
    if(!/name=["']viewport["']/i.test(html)) findings.push({code:'MISSING_VIEWPORT',severity:'warning',url});
    if(/<img(?![^>]+alt=)[^>]*>/i.test(html)) findings.push({code:'IMAGE_ALT_MISSING',severity:'warning',url});
    if(!['gtag(','googletagmanager','google-analytics','fbq(','matomo'].some(x=>low.includes(x))) findings.push({code:'TRACKING_SIGNAL_NOT_DETECTED',severity:'info',url});
  }
  findings.sort((a,b)=>`${a.url}:${a.code}`.localeCompare(`${b.url}:${b.code}`));
  return finalize('WAUD-001',company_id,evidence_at,{pages_audited:pages.length,findings,finding_count:findings.length});
}

export function auditSocial({company_id,evidence_at,scan_result,public_social_evidence=[]}){
  assertBase({company_id,evidence_at}); rejectSecrets({scan_result,public_social_evidence});
  if(scan_result?.company_id!==company_id||scan_result?.engine_id!=='SCAN-001') throw new Error('POLICY_CONFLICT:SCAN');
  const profiles=[];
  const scanProfiles=scan_result?.social_profiles||{};
  for(const [platform,urls] of Object.entries(scanProfiles)) for(const url of (Array.isArray(urls)?urls:[urls])) if(url) profiles.push({platform:norm(platform),url:String(url),source:'SCAN-001'});
  for(const item of public_social_evidence){if(item?.company_id&&item.company_id!==company_id) throw new Error('POLICY_CONFLICT:SOCIAL');profiles.push({platform:norm(item?.platform),url:String(item?.url??''),observed_posts:Array.isArray(item?.posts)?item.posts.length:0,followers:Number.isInteger(item?.followers)&&item.followers>=0?item.followers:null,source:'public_evidence'});}
  profiles.sort((a,b)=>`${a.platform}:${a.url}`.localeCompare(`${b.platform}:${b.url}`));
  return finalize('SOCAUD-001',company_id,evidence_at,{profiles,profile_count:profiles.length,audience_metrics_policy:'public_evidence_only_no_estimation'},profiles.length?null:'LOW_CONFIDENCE');
}

export function auditLocal({company_id,evidence_at,scan_result,declared_business={},public_local_evidence={}}){
  assertBase({company_id,evidence_at}); rejectSecrets({scan_result,declared_business,public_local_evidence});
  if(scan_result?.company_id!==company_id||scan_result?.engine_id!=='SCAN-001') throw new Error('POLICY_CONFLICT:SCAN');
  for(const obj of [declared_business,public_local_evidence]) if(obj?.company_id&&obj.company_id!==company_id) throw new Error('POLICY_CONFLICT:LOCAL');
  const findings=[];
  const compare=field=>{const d=norm(declared_business?.[field]);const o=norm(public_local_evidence?.[field]);let status='match',severity='info';if(!d){status='declared_missing';severity='medium';}else if(!o){status='public_evidence_missing';severity='low';}else if(d!==o){status='mismatch';severity='high';}findings.push({category:'nap',field,status,severity});};
  ['name','address','phone'].forEach(compare);
  const categories=(declared_business?.categories||[]).map(norm).filter(Boolean); const observedCategories=new Set((public_local_evidence?.categories||[]).map(norm).filter(Boolean));
  const missing_categories=categories.filter(x=>!observedCategories.has(x)); if(missing_categories.length)findings.push({category:'categories',severity:'medium',status:'not_observed',items:missing_categories.sort()});
  const review_count=Number.isInteger(public_local_evidence?.review_count)&&public_local_evidence.review_count>=0?public_local_evidence.review_count:null;
  const rating=typeof public_local_evidence?.rating==='number'?public_local_evidence.rating:null;
  const usefulEvidence=[declared_business?.name,declared_business?.address,declared_business?.phone,public_local_evidence?.name,public_local_evidence?.address,public_local_evidence?.phone].some(Boolean);
  return finalize('LOCALP-001',company_id,evidence_at,{findings,finding_count:findings.length,reviews:{review_count,rating,state:review_count!==null&&rating!==null?'observed_public_evidence':'unknown_without_public_evidence'}},usefulEvidence?null:'LOW_CONFIDENCE');
}

export function persistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||!POST_SCAN_ENGINE_IDS.includes(result.engine_id)||result.environment!=='PREPROD'||result.read_only!==true) throw new Error('invalid post-scan result');
  const payload=result.payload||{};
  const item_count=result.engine_id==='KW-001'?payload.opportunity_count:result.engine_id==='WAUD-001'?payload.pages_audited:result.engine_id==='SOCAUD-001'?payload.profile_count:payload.finding_count;
  const finding_count=result.engine_id==='WAUD-001'||result.engine_id==='LOCALP-001'?payload.finding_count:0;
  return {company_id:result.company_id,engine_id:result.engine_id,version:result.version,evidence_at:result.evidence_at,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,item_count:Number(item_count??0),finding_count:Number(finding_count??0),human_required_code:result.human_required_code,idempotency_key:String(idempotency_key??''),recorded_by:String(recorded_by??''),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
