import {createHash} from 'node:crypto';

export const SCAN001_ENGINE_ID='SCAN-001';
export const SCAN001_VERSION='1.0.0';
export const SCAN001_ENVIRONMENT='PREPROD';

const SOCIAL_HOSTS=new Map([
  ['facebook.com','facebook'],['instagram.com','instagram'],['linkedin.com','linkedin'],
  ['youtube.com','youtube'],['x.com','x'],['twitter.com','x'],['tiktok.com','tiktok']
]);

export class Scan001Error extends Error { constructor(code,message){super(message);this.name='Scan001Error';this.code=code;} }

function sha256(value){return createHash('sha256').update(String(value),'utf8').digest('hex');}

export function normalizePublicDomain(value){
  let raw=String(value??'').trim().toLowerCase();
  if(/^https?:\/\//.test(raw)){
    let parsed;
    try{parsed=new URL(raw);}catch{throw new Scan001Error('SCAN_INVALID_INPUT','invalid public domain');}
    raw=parsed.hostname.toLowerCase();
  }
  raw=raw.replace(/\.$/,'');
  if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(raw)){
    throw new Scan001Error('SCAN_INVALID_INPUT','invalid public domain');
  }
  if(raw==='localhost' || raw.endsWith('.localhost')) throw new Scan001Error('SCAN_POLICY_DENY','local targets are forbidden');
  return raw;
}

function textBetween(html,tag){
  const m=String(html??'').match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return (m?.[1]??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function attr(tag,name){
  const m=String(tag).match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i'));
  return m?.[1]??m?.[2]??m?.[3]??'';
}
function metaSignals(html){
  const out=new Map();
  const generators=[];
  for(const tag of String(html??'').match(/<meta\b[^>]*>/gi)??[]){
    const key=(attr(tag,'name')||attr(tag,'property')).toLowerCase();
    const value=attr(tag,'content').trim();
    if(key&&value) out.set(key,value);
    if(key==='generator'&&value) generators.push(value);
  }
  return {meta:out,generators};
}
function links(html){
  const out=[];
  for(const tag of String(html??'').match(/<a\b[^>]*>/gi)??[]){
    const href=attr(tag,'href'); if(href) out.push(href);
  }
  return out;
}
function technologySignals(headers,body,generators){
  const sample=String(body??'').slice(0,200000).toLowerCase();
  const server=String(headers?.server??'').toLowerCase();
  const powered=String(headers?.['x-powered-by']??'').toLowerCase();
  const generatorText=generators.join(' ').toLowerCase();
  const signals=new Set();
  const rules={
    wordpress:['wp-content/','wp-includes/','wordpress'], elementor:['elementor'],
    cloudflare:['cf-ray','cloudflare'], nextjs:['_next/','next.js']
  };
  for(const [name,markers] of Object.entries(rules)){
    if(markers.some(x=>sample.includes(x)||server.includes(x)||powered.includes(x)||generatorText.includes(x))) signals.add(name);
  }
  if(Object.prototype.hasOwnProperty.call(headers??{},'cf-ray')) signals.add('cloudflare');
  return [...signals].sort();
}
function normalizedHeaders(headers={}){
  return Object.fromEntries(Object.entries(headers).map(([k,v])=>[String(k).toLowerCase(),String(v)]));
}
async function optionalFetch(fetcher,url){
  try{
    const r=await fetcher(url);
    if(!r||typeof r!=='object') return {url,available:false,error:'INVALID_FETCH_RESPONSE'};
    const status=Number(r.status??0); const body=String(r.body??'');
    return {url:String(r.url??url),available:status>=200&&status<400,status,body:body.slice(0,20000)};
  }catch(error){return {url,available:false,error:error?.constructor?.name??'Error'};}
}

export async function scanDigitalFootprint({company_id,domain,evidence_at,fetcher,environment='PREPROD'}){
  const company=String(company_id??'').trim().toLowerCase();
  if(!company) throw new Scan001Error('SCAN_INVALID_INPUT','company_id is required');
  if(String(environment).toUpperCase()!=='PREPROD') throw new Scan001Error('SCAN_POLICY_DENY','SCAN-001 durable V1 is PREPROD only');
  if(typeof fetcher!=='function') throw new Scan001Error('SCAN_INVALID_INPUT','fetcher must be callable');
  const stamp=String(evidence_at??'').trim(); if(!stamp) throw new Scan001Error('SCAN_INVALID_INPUT','evidence_at is required');
  const host=normalizePublicDomain(domain); const root=`https://${host}/`;
  const response=await fetcher(root);
  if(!response||typeof response!=='object') throw new Scan001Error('SCAN_INVALID_INPUT','fetcher must return response object');
  const rootStatus=Number(response.status??0); const rootBody=String(response.body??''); const headers=normalizedHeaders(response.headers??{});
  const {meta,generators}=metaSignals(rootBody);
  const internal=new Set(); const external=new Set(); const social=new Map();
  for(const href of links(rootBody)){
    let absolute; try{absolute=new URL(href,root).toString();}catch{continue;}
    const linkHost=new URL(absolute).hostname.toLowerCase();
    if(linkHost===host||linkHost.endsWith(`.${host}`)) internal.add(absolute);
    else{
      external.add(absolute);
      for(const [socialHost,network] of SOCIAL_HOSTS){
        if(linkHost===socialHost||linkHost.endsWith(`.${socialHost}`)){
          if(!social.has(network)) social.set(network,new Set()); social.get(network).add(absolute);
        }
      }
    }
  }
  const robots=await optionalFetch(fetcher,new URL('robots.txt',root).toString());
  const sitemap=await optionalFetch(fetcher,new URL('sitemap.xml',root).toString());
  const technologies=technologySignals(headers,rootBody,generators);
  const socialProfiles=Object.fromEntries([...social.entries()].sort().map(([k,v])=>[k,[...v].sort()]));
  const internalLinks=[...internal].sort(); const externalLinks=[...external].sort();
  const evidenceSha256=sha256([host,rootStatus,rootBody,robots.body??'',sitemap.body??''].join('\n'));
  const result={
    company_id:company,engine_id:SCAN001_ENGINE_ID,environment:'PREPROD',version:SCAN001_VERSION,domain:host,evidence_at:stamp,
    root:{url:String(response.url??root),status:rootStatus,title:textBetween(rootBody,'title'),canonical_signal:meta.get('og:url')??''},
    indexation:{robots,sitemap},technologies,social_profiles:socialProfiles,internal_links:internalLinks,external_links:externalLinks,
    evidence_sha256:evidenceSha256,read_only:true,external_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false
  };
  result.result_sha256=sha256(JSON.stringify(result));
  return result;
}

export function scan001PersistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||result.engine_id!=='SCAN-001'||result.environment!=='PREPROD'||result.read_only!==true) throw new Scan001Error('SCAN_INVALID_RESULT','invalid SCAN-001 result');
  return {
    company_id:result.company_id,version:result.version,domain:result.domain,evidence_at:result.evidence_at,
    evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,root_status:result.root.status,
    robots_available:Boolean(result.indexation?.robots?.available),sitemap_available:Boolean(result.indexation?.sitemap?.available),
    technology_count:result.technologies?.length??0,social_network_count:Object.keys(result.social_profiles??{}).length,
    internal_link_count:result.internal_links?.length??0,external_link_count:result.external_links?.length??0,
    idempotency_key:String(idempotency_key??''),recorded_by:String(recorded_by??''),
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
}
