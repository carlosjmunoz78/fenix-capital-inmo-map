/** LAB-only signed universal media ingress. No provider, spend, publish, video execution or external IO.
 * The unsigned request is never trusted; engine identities derive from a pinned Ed25519 issuer registry.
 */
const REQ=['schema_version','event_type','request_id','company_id','engine_id','origin_engine_id','environment','version','trigger','asset_kind','capability_id','item_id','consumer_engine_id','channel_id','placement','brief_ref','format','rights_profile','priority','requested_at_utc','deadline_utc','policy_version','budget','reply_to'];
const FMT=['profile_id','width_px','height_px','duration_seconds','output_mime'];
const BUD=['max_additional_cost_eur','max_attempts','prepaid_only','paid_execution_enabled','auto_recharge','publish_requested'];
const ENV=['schema_version','key_id','issuer','sent_at_utc','nonce','payload','signature'];
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>isObj(x)&&JSON.stringify(Object.keys(x).sort())===JSON.stringify([...keys].sort());
const id=/^[A-Z][A-Z0-9-]{2,63}$/,reqid=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/,slot=/^[A-Z][A-Z0-9_]{1,79}$/;
const when=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const bytes=s=>new TextEncoder().encode(s);
const hex=a=>[...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=s=>{if(typeof s!=='string'||s.length>4096||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))throw Error('BASE64');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
export const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':isObj(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export const sha=async x=>hex(await crypto.subtle.digest('SHA-256',bytes(x)));
export const envelopeSigningBody=x=>{const {signature,...signed}=x;return canonical(signed);};
export function validateMediaJob(r){
 if(!exact(r,REQ)||r.schema_version!=='1.0.0'||r.event_type!=='MEDIA_JOB_REQUESTED'||r.engine_id!=='UMS-001'||r.environment!=='LAB'||!/^[a-z][a-z0-9-]{1,62}$/.test(r.company_id||'')||!id.test(r.origin_engine_id||'')||!id.test(r.consumer_engine_id||'')||!reqid.test(r.request_id||''))throw Error('REQUEST_SCHEMA_SCOPE');
 if(!['IMAGE','VIDEO','AUDIO','AV_PACKAGE','THREED','VFX','ADAPTATION'].includes(r.asset_kind)||typeof r.capability_id!=='string'||r.capability_id.length>80||!r.capability_id.startsWith(r.asset_kind+'.')||!id.test(r.origin_engine_id)||!['ENGINE_EVENT'].includes(r.trigger)||!slot.test(r.channel_id||'')||!slot.test(r.placement||'')||!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(r.item_id||''))throw Error('REQUEST_CAPABILITY');
 if(!/^(cerebro|artifact):[A-Za-z0-9/_:.#-]{4,250}$/.test(r.brief_ref||'')||!/^cerebro:\/\/events\/[A-Za-z0-9/_-]{4,200}$/.test(r.reply_to||'')||!when(r.requested_at_utc)||!(r.deadline_utc===null||when(r.deadline_utc))||!['NORMAL','HIGH','CRITICAL'].includes(r.priority)||!['SYNTHETIC_ORIGINAL','LICENSED_LIBRARY','OWNED_ASSET','AUTHORIZED_PERSON'].includes(r.rights_profile)||typeof r.policy_version!=='string'||r.policy_version.length>64)throw Error('REQUEST_FIELDS');
 if(!exact(r.format,FMT)||!slot.test(r.format.profile_id||'')||!['image/png','image/jpeg','image/webp','video/mp4','audio/wav','audio/mpeg','application/zip','model/gltf-binary'].includes(r.format.output_mime))throw Error('REQUEST_FORMAT');
 const f=r.format;
 if((r.asset_kind==='IMAGE'&&(!f.output_mime.startsWith('image/')||!Number.isInteger(f.width_px)||!Number.isInteger(f.height_px)||f.duration_seconds!==null))||(r.asset_kind==='VIDEO'&&(!f.output_mime.startsWith('video/')||!Number.isInteger(f.width_px)||!Number.isInteger(f.height_px)||!Number.isInteger(f.duration_seconds)))||(r.asset_kind==='AUDIO'&&(!f.output_mime.startsWith('audio/')||!Number.isInteger(f.duration_seconds))))throw Error('REQUEST_FORMAT_KIND');
 if(!exact(r.budget,BUD)||r.budget.max_additional_cost_eur!==0||![1,2].includes(r.budget.max_attempts)||r.budget.prepaid_only!==true||r.budget.paid_execution_enabled!==false||r.budget.auto_recharge!==false||r.budget.publish_requested!==false)throw Error('REQUEST_MONEY_LIMIT');
 return r;
}
export function validateEnvelope(e){
 if(!exact(e,ENV)||e.schema_version!==1||!id.test(e.issuer||'')||!/^UMS001-LAB-[A-Z0-9-]{8,90}$/.test(e.key_id||'')||!when(e.sent_at_utc)||!/^[a-f0-9-]{32,40}$/.test(e.nonce||'')||typeof e.signature!=='string'||e.signature.length>200)throw Error('SIGNED_SCHEMA');
 validateMediaJob(e.payload);return e;
}
export async function verifySignedJob(e,issuer,now=Date.now()){
 validateEnvelope(e);const r=e.payload;
 if(!issuer||Number(issuer.enabled)!==1||issuer.key_id!==e.key_id||issuer.origin_engine_id!==e.issuer||issuer.origin_engine_id!==r.origin_engine_id||issuer.company_id!==r.company_id||issuer.environment!=='LAB')throw Error('UNTRUSTED_ISSUER');
 if(Math.abs(now-Date.parse(e.sent_at_utc))>180000||Math.abs(now-Date.parse(r.requested_at_utc))>300000)throw Error('SIGNED_TIME_EXPIRED');
 if(r.deadline_utc&&Date.parse(r.deadline_utc)<=now)throw Error('DEADLINE_EXPIRED');
 if(!JSON.parse(issuer.allowed_channels).includes(r.channel_id)||!JSON.parse(issuer.allowed_kinds).includes(r.asset_kind))throw Error('ISSUER_PERMISSION');
 if(r.rights_profile==='AUTHORIZED_PERSON')throw Error('LEGAL_REQUIRED');
 const spki=b64(issuer.public_spki_base64);
 if(hex(await crypto.subtle.digest('SHA-256',spki))!==issuer.public_spki_sha256)throw Error('TRUST_FINGERPRINT_MISMATCH');
 const key=await crypto.subtle.importKey('spki',spki,{name:'Ed25519'},false,['verify']);
 if(!(await crypto.subtle.verify('Ed25519',key,b64(e.signature),bytes(envelopeSigningBody(e)))))throw Error('SIGNED_SIGNATURE_INVALID');
 return {r,key_id:e.key_id,nonce:e.nonce,body_sha:await sha(canonical(r)),dedupe:await sha([r.company_id,r.environment,r.origin_engine_id,r.request_id,r.consumer_engine_id,r.item_id].join('\0'))};
}
export async function acceptMediaJob(db,e,now=Date.now()){
 if(!db?.prepare)throw Error('D1_NOT_CONFIGURED');
 validateEnvelope(e);
 const issuer=await db.prepare('SELECT * FROM media_issuers WHERE key_id=?').bind(e.key_id).first();
 const {r,key_id,nonce,body_sha,dedupe}=await verifySignedJob(e,issuer,now);
 const old=await db.prepare('SELECT request_sha256 FROM media_jobs WHERE idempotency_key=?').bind(dedupe).first();
 if(old){if(old.request_sha256!==body_sha)throw Error('IDEMPOTENCY_CONFLICT');return {status:'DUPLICATE_ACCEPTED',event_type:'UMS001_ORDER_ACCEPTED',request_id:r.request_id,idempotency_key:dedupe,cost_eur:0};}
 const inserted=await db.prepare('INSERT OR IGNORE INTO media_nonces(key_id,nonce,created_at) VALUES(?,?,?)').bind(key_id,nonce,new Date(now).toISOString()).run();
 if(inserted.meta?.changes!==1)throw Error('SIGNED_REPLAY');
 const saved=await db.prepare('INSERT OR IGNORE INTO media_jobs(idempotency_key,company_id,environment,origin_engine_id,consumer_engine_id,request_id,item_id,channel_id,asset_kind,request_sha256,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(dedupe,r.company_id,'LAB',r.origin_engine_id,r.consumer_engine_id,r.request_id,r.item_id,r.channel_id,r.asset_kind,body_sha,'REGISTERED_QA_PENDING',new Date(now).toISOString()).run();
 if(saved.meta?.changes!==1){const prior=await db.prepare('SELECT request_sha256 FROM media_jobs WHERE idempotency_key=?').bind(dedupe).first();if(prior?.request_sha256!==body_sha)throw Error('IDEMPOTENCY_CONFLICT');}
 await db.prepare('INSERT OR IGNORE INTO media_events(event_id,idempotency_key,event_type,created_at) VALUES(?,?,?,?)').bind('ack:'+dedupe,dedupe,'UMS001_ORDER_ACCEPTED',new Date(now).toISOString()).run();
 return {status:'REGISTERED_QA_PENDING',event_type:'UMS001_ORDER_ACCEPTED',request_id:r.request_id,idempotency_key:dedupe,cost_eur:0};
}
