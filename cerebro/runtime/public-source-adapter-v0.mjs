import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { planWebAcquisition } from './web-acquisition-intelligence-profile-v1.mjs';

const PREPROD='PREPROD';
const SECRET_QUERY=/(token|secret|password|key|auth|credential|session|cookie|jwt)/i;
const ALLOWED_CONTENT=/^(application\/json|application\/(?:[^;]+\+)?json|text\/html|text\/plain|application\/xml|text\/xml)(?:;|$)/i;
const USER_AGENT='CEREBRO-PREPROD-PublicEvidence/0.2';

function text(value,label,max=2048){if(typeof value!=='string'||!value.trim())throw new TypeError(`${label} required`);const out=value.trim();if(out.length>max)throw new TypeError(`${label} too long`);return out;}
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function isPrivateV4(address){const p=address.split('.').map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return true;const [a,b]=p;return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===192&&b===0)||(a===192&&b===2)||(a===198&&b>=18&&b<=19)||(a===198&&b===51)||(a===203&&b===0)||(a>=224);}
function isPrivateV6(address){const a=address.toLowerCase().split('%')[0];if(a==='::'||a==='::1')return true;if(a.startsWith('fc')||a.startsWith('fd')||a.startsWith('fe8')||a.startsWith('fe9')||a.startsWith('fea')||a.startsWith('feb'))return true;if(a.startsWith('::ffff:')){const v4=a.slice(7);return net.isIP(v4)===4?isPrivateV4(v4):true;}return false;}
function isPrivateAddress(address){const kind=net.isIP(address);if(kind===4)return isPrivateV4(address);if(kind===6)return isPrivateV6(address);return true;}
async function validateRemoteUrl(raw){let url;try{url=new URL(text(raw,'target_url'));}catch{throw new Error('target_url invalid');}if(url.protocol!=='https:')throw new Error('public source adapter requires HTTPS');if(url.username||url.password)throw new Error('URL credentials forbidden');for(const key of url.searchParams.keys())if(SECRET_QUERY.test(key))throw new Error(`secret-bearing query key forbidden:${key}`);const records=await dns.lookup(url.hostname,{all:true,verbatim:true});if(!records.length)throw new Error('DNS resolution empty');for(const record of records)if(isPrivateAddress(record.address))throw new Error(`non-public resolved address denied:${record.address}`);return {url,addresses:records.map(x=>x.address).sort()};}
function context(input){const out={company_id:text(input?.company_id,'company_id',120),engine_id:text(input?.engine_id,'engine_id',80),environment:text(input?.environment,'environment',40),version:text(input?.version,'version',80)};if(out.environment!==PREPROD)throw new Error('public source adapter is PREPROD-only');return Object.freeze(out);}
function decodeBody(bytes,contentType){const body=Buffer.from(bytes).toString('utf8');if(/json/i.test(contentType)){try{return {kind:'JSON',value:JSON.parse(body)};}catch{throw new Error('remote JSON body invalid');}}return {kind:'TEXT',value:body};}
function extractSummary(decoded,finalUrl){if(decoded.kind==='JSON'){
  const value=decoded.value;
  if(Array.isArray(value)){const first=value[0]??null;return {kind:'JSON_ARRAY',count:value.length,site_name:null,title:typeof first?.title?.rendered==='string'?first.title.rendered:null,canonical_url:typeof first?.link==='string'?first.link:finalUrl};}
  return {kind:'JSON_OBJECT',count:null,site_name:typeof value?.name==='string'?value.name:null,title:typeof value?.title==='string'?value.title:null,canonical_url:typeof value?.url==='string'?value.url:finalUrl};
 }
 const title=decoded.value.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim()??null;return {kind:'TEXT',count:null,site_name:null,title,canonical_url:finalUrl};}

function canonicalJson(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('non-finite JSON value');return JSON.stringify(value);}
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
  if(typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  throw new Error('unsupported JSON semantic value');
}
function decodeEntities(value){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,entity)=>{
    const lower=entity.toLowerCase();
    if(lower.startsWith('#x')){const cp=Number.parseInt(lower.slice(2),16);return Number.isSafeInteger(cp)&&cp>=0&&cp<=0x10ffff?String.fromCodePoint(cp):all;}
    if(lower.startsWith('#')){const cp=Number.parseInt(lower.slice(1),10);return Number.isSafeInteger(cp)&&cp>=0&&cp<=0x10ffff?String.fromCodePoint(cp):all;}
    return named[lower]??all;
  });
}
function visibleHtmlText(value){
  return decodeEntities(value)
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
export function semanticFingerprintV0(decoded,contentType='text/plain'){
  if(!decoded||!['JSON','TEXT'].includes(decoded.kind))throw new TypeError('decoded body invalid');
  let normalized;
  let kind;
  if(decoded.kind==='JSON'){
    kind='CANONICAL_JSON';
    normalized=canonicalJson(decoded.value);
  }else if(/^text\/html(?:;|$)/i.test(contentType)){
    kind='VISIBLE_HTML_TEXT';
    normalized=visibleHtmlText(decoded.value);
  }else if(/(?:application|text)\/xml(?:;|$)/i.test(contentType)){
    kind='VISIBLE_XML_TEXT';
    normalized=decodeEntities(decoded.value).replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  }else{
    kind='NORMALIZED_TEXT';
    normalized=decoded.value.replace(/\s+/g,' ').trim();
  }
  const bytes=Buffer.from(normalized,'utf8');
  return Object.freeze({kind,semantic_sha256:sha(bytes),semantic_bytes:bytes.length});
}

export async function fetchPublicEvidenceV0(input={}){
  const ctx=context(input);
  if(input.authorized_public_research!==true)throw new Error('authorized_public_research required');
  if(input.robots_allowed!==true)throw new Error('robots_allowed must be explicitly true');
  const maxBytes=Number(input.max_bytes??1_500_000);if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>5_000_000)throw new TypeError('max_bytes invalid');
  const timeoutMs=Number(input.timeout_ms??15000);if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw new TypeError('timeout_ms invalid');
  const route=planWebAcquisition({...ctx,target_url:input.target_url,authorized_public_research:true,robots_allowed:true,estimated_incremental_cost_eur:0,sources:{official_api_feed:true}});
  if(route.status!=='ROUTED'||route.selected_route!=='OFFICIAL_API_FEED_SITEMAP')throw new Error(`web acquisition route not authorized:${route.status}:${route.reason??''}`);
  let current=(await validateRemoteUrl(input.target_url)).url;const redirects=[];
  for(let hop=0;hop<=3;hop++){
    const validated=await validateRemoteUrl(current.toString());
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let response;try{response=await fetch(validated.url,{method:'GET',redirect:'manual',headers:{'accept':'application/json,text/html;q=0.9,text/plain;q=0.8,application/xml;q=0.7','user-agent':USER_AGENT},signal:controller.signal});}finally{clearTimeout(timer);}
    if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('redirect without location');if(hop===3)throw new Error('redirect limit exceeded');const next=new URL(location,validated.url);redirects.push({from:validated.url.toString(),to:next.toString(),status:response.status});current=next;continue;}
    if(response.status<200||response.status>=300)throw new Error(`remote HTTP status ${response.status}`);
    const contentType=(response.headers.get('content-type')??'').toLowerCase();if(!ALLOWED_CONTENT.test(contentType))throw new Error(`content-type denied:${contentType}`);
    const declaredLength=Number(response.headers.get('content-length')??0);if(Number.isFinite(declaredLength)&&declaredLength>maxBytes)throw new Error('remote body exceeds max_bytes');
    const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>maxBytes)throw new Error('remote body exceeds max_bytes');
    const decoded=decodeBody(bytes,contentType);const summary=extractSummary(decoded,validated.url.toString());const semantic=semanticFingerprintV0(decoded,contentType);
    return Object.freeze({schema_version:'0.2.0',state_type:'CEREBRO_PUBLIC_SOURCE_EVIDENCE_V0',context:ctx,status:'REMOTE_READ_GREEN',selected_route:route.selected_route,requested_url:text(input.target_url,'target_url'),final_url:validated.url.toString(),resolved_addresses:Object.freeze(validated.addresses),redirects:Object.freeze(redirects),http_status:response.status,content_type:contentType,body_bytes:bytes.length,body_sha256:sha(bytes),semantic_kind:semantic.kind,semantic_bytes:semantic.semantic_bytes,semantic_sha256:semantic.semantic_sha256,summary:Object.freeze(summary),read_only:true,auth_used:false,cookies_used:false,provider_write:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
  }
  throw new Error('unreachable');
}

export const PUBLIC_SOURCE_ADAPTER_V0_CONTRACT=Object.freeze({environment:PREPROD,method:'GET_ONLY',https_only:true,dns_public_only:true,manual_redirect_validation:true,max_redirects:3,auth_allowed:false,cookies_allowed:false,provider_write:false,external_dependency_install:false,semantic_fingerprint:'BODY_NOT_RETURNED_HASH_ONLY',additional_cost_target_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});