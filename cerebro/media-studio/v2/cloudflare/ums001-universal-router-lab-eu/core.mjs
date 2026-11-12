/* UMS-001 UNIVERSAL LAB - portable, fail-closed request validation and HMAC. */
export const REQUEST_FIELDS=Object.freeze([
 'schema_version','event_type','request_id','company_id','engine_id','origin_engine_id','environment','version',
 'trigger','asset_kind','capability_id','item_id','consumer_engine_id','channel_id','placement',
 'brief_ref','format','rights_profile','priority','requested_at_utc','deadline_utc','policy_version','budget','reply_to'
]);
const FORMAT_FIELDS=['profile_id','width_px','height_px','duration_seconds','output_mime'];
const BUDGET_FIELDS=['max_additional_cost_eur','max_attempts','prepaid_only','paid_execution_enabled','auto_recharge','publish_requested'];
export const ALLOWED_KINDS=['IMAGE','VIDEO','AUDIO','AV_PACKAGE','THREED','VFX','ADAPTATION'];
export const SUPPORTED_ENGINES=['SOC-001','SEO-001'];
export const LAB_SCOPE=Object.freeze({company_id:'fenix',engine_id:'UMS-001',environment:'LAB'});
export const LAB_KEY_PREFIX='meta/ums001-universal-job/v1/';
function reject(reason){throw Error('UMS001_UNIVERSAL_'+reason)}
function keys(value,fields){return value&&typeof value==='object'&&!Array.isArray(value)&&
 JSON.stringify(Object.keys(value).sort())===JSON.stringify([...fields].sort());}
const validDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
export function canonical(o){if(o===null||typeof o!=='object')return JSON.stringify(o);
 if(Array.isArray(o))return '['+o.map(canonical).join(',')+']';
 return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';}
export function validate(request,{allowOtherEngines=false}={}){
 const r=request;if(!keys(r,REQUEST_FIELDS))reject('SCHEMA_KEYS');
 if(r.schema_version!=='1.0.0'||r.event_type!=='MEDIA_JOB_REQUESTED'||r.engine_id!=='UMS-001'||
 r.company_id!=='fenix'||r.environment!=='LAB'||r.version!=='1.0.0')reject('SCOPE');
 if(!/^[A-Z][A-Z0-9-]{2,63}$/.test(r.origin_engine_id||'')||
 !/^[A-Z][A-Z0-9-]{2,63}$/.test(r.consumer_engine_id||'')||
 (!allowOtherEngines&&!SUPPORTED_ENGINES.includes(r.origin_engine_id)))reject('ENGINE');
 if(r.trigger!=='ENGINE_EVENT'&&r.trigger!=='CHATGPT')reject('TRIGGER');
 if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(r.request_id||'')||
 !/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(r.item_id||''))reject('ID');
 if(!ALLOWED_KINDS.includes(r.asset_kind)||typeof r.capability_id!=='string'||
 !r.capability_id.startsWith(r.asset_kind+'.')||
 !/^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*)*$/.test(r.capability_id)||
 r.capability_id.length>80)reject('CAPABILITY');
 if(!/^[A-Z][A-Z0-9_]{1,63}$/.test(r.channel_id||'')||
 !/^[A-Z][A-Z0-9_]{1,79}$/.test(r.placement||'')||
 !/^(cerebro|artifact):[A-Za-z0-9/_:.#-]{4,250}$/.test(r.brief_ref||'')||
 !/^cerebro:\/\/events\/[A-Za-z0-9/_-]{4,200}$/.test(r.reply_to||'')||
 !/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/.test(r.policy_version||'')||
 !['SYNTHETIC_ORIGINAL','LICENSED_LIBRARY','OWNED_ASSET','AUTHORIZED_PERSON'].includes(r.rights_profile)||
 !['NORMAL','HIGH','CRITICAL'].includes(r.priority)||
 !validDate(r.requested_at_utc)||(r.deadline_utc!==null&&!validDate(r.deadline_utc)))reject('FIELDS');
 if(!keys(r.format,FORMAT_FIELDS))reject('FORMAT_KEYS');
 const f=r.format;
 if(!/^[A-Z][A-Z0-9_]{2,63}$/.test(f.profile_id||'')||
 (f.width_px!==null&&(!Number.isInteger(f.width_px)||f.width_px<64||f.width_px>16384))||
 (f.height_px!==null&&(!Number.isInteger(f.height_px)||f.height_px<64||f.height_px>16384))||
 (f.duration_seconds!==null&&(!Number.isInteger(f.duration_seconds)||f.duration_seconds<1||f.duration_seconds>3600))||
 !['image/png','image/jpeg','image/webp','video/mp4','audio/wav','audio/mpeg','application/zip','model/gltf-binary'].includes(f.output_mime))reject('FORMAT');
 if(r.asset_kind==='IMAGE'&&(f.width_px===null||f.height_px===null||
 !f.output_mime.startsWith('image/')||f.duration_seconds!==null))reject('IMAGE_FORMAT');
 if(r.asset_kind==='VIDEO'&&(f.width_px===null||f.height_px===null||
 f.output_mime!=='video/mp4'||f.duration_seconds===null))reject('VIDEO_FORMAT');
 if(!keys(r.budget,BUDGET_FIELDS))reject('BUDGET_KEYS');
 const b=r.budget;
 if(b.max_additional_cost_eur!==0||b.paid_execution_enabled!==false||
 b.auto_recharge!==false||b.publish_requested!==false||
 b.prepaid_only!==true||!Number.isInteger(b.max_attempts)||b.max_attempts<1||b.max_attempts>2)reject('FINOPS');
 if(r.deadline_utc&&Date.parse(r.deadline_utc)<=Date.parse(r.requested_at_utc))reject('DEADLINE');
 if(r.rights_profile==='AUTHORIZED_PERSON')reject('PERSON_CONSENT_PENDING');
 return r;
}
export async function hash(input){const a=new TextEncoder().encode(input);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),
 b=>b.toString(16).padStart(2,'0')).join('');}
export async function fingerprint(r){return hash(canonical(r));}
export async function jobKey(r){return hash([r.company_id,r.environment,r.origin_engine_id,
 r.request_id,r.consumer_engine_id,r.item_id].join('\0'));}
export async function hmac(secret,contents){if(typeof secret!=='string'||secret.length<32)reject('AUTH_SECRET_MISSING');
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(contents))),
 b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifyHmac(secret,contents,signature){
 if(typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return false;
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const b=Uint8Array.from(signature.match(/.{2}/g),s=>parseInt(s,16));
 return crypto.subtle.verify('HMAC',k,b,new TextEncoder().encode(contents));
}
export function secretBinding(company,engine){return 'AUTH_'+company.toUpperCase().replace(/-/g,'_')+'_'+engine.replace(/-/g,'_')}
export function consumerAllowed(r){return (r.origin_engine_id==='SOC-001'&&r.consumer_engine_id==='SOC-001'&&
 ['FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK'].includes(r.channel_id))||
 (r.origin_engine_id==='SEO-001'&&r.consumer_engine_id==='SEO-001'&&r.channel_id==='SEO')}
export function makeCanary(origin,now){
 const social=origin==='SOC-001',r={schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',
 request_id:'UMS001-LAB-UNIVERSAL-CANARY-20261112-V1',company_id:'fenix',engine_id:'UMS-001',
 origin_engine_id:origin,environment:'LAB',version:'1.0.0',trigger:'ENGINE_EVENT',
 asset_kind:'IMAGE',capability_id:'IMAGE.SYNTHETIC',item_id:social?'IG-FEED-01':'SEO-HERO-01',
 consumer_engine_id:origin,channel_id:social?'INSTAGRAM':'SEO',placement:social?'FEED':'HERO',
 brief_ref:'cerebro://briefs/ums001/authorized-canary-20261112',
 format:{profile_id:social?'IG_FEED_4_5':'SEO_HERO_16_9',width_px:social?1080:1600,
 height_px:social?1350:900,duration_seconds:null,output_mime:'image/png'},
 rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',
 requested_at_utc:now,deadline_utc:null,policy_version:'ums001-policy-v1',
 budget:{max_additional_cost_eur:0,max_attempts:1,prepaid_only:true,
 paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
 reply_to:'cerebro://events/ums001/lab'};validate(r);return r;
}
