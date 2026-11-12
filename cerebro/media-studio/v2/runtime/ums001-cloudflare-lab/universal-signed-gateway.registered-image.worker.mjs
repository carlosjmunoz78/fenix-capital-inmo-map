/** UMS-001 universal LAB. SQLite Durable Object is the atomic ledger; no public routes. */
import {WorkerEntrypoint,DurableObject} from 'cloudflare:workers';
import {acceptMediaJob,validateEnvelope,canonical} from './core.mjs';
const NAME='cerebro-ums001-universal-demand-lab-eu';
const CREATE=[
 'CREATE TABLE IF NOT EXISTS media_issuers (key_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, environment TEXT NOT NULL, origin_engine_id TEXT NOT NULL, public_spki_base64 TEXT NOT NULL, public_spki_sha256 TEXT NOT NULL, allowed_channels TEXT NOT NULL, allowed_kinds TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS media_nonces (key_id TEXT NOT NULL, nonce TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(key_id,nonce))',
 'CREATE TABLE IF NOT EXISTS media_jobs (idempotency_key TEXT PRIMARY KEY, company_id TEXT NOT NULL, environment TEXT NOT NULL, origin_engine_id TEXT NOT NULL, consumer_engine_id TEXT NOT NULL, request_id TEXT NOT NULL, item_id TEXT NOT NULL, channel_id TEXT NOT NULL, asset_kind TEXT NOT NULL, request_sha256 TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE UNIQUE INDEX IF NOT EXISTS media_job_unique ON media_jobs(company_id,environment,origin_engine_id,request_id,consumer_engine_id,item_id)',
 'CREATE TABLE IF NOT EXISTS media_events (event_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL, event_type TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS media_rejections (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS media_factory_enrollments (event_id TEXT PRIMARY KEY, key_id TEXT NOT NULL, company_id TEXT NOT NULL, engine_id TEXT NOT NULL, public_sha TEXT NOT NULL, created_at TEXT NOT NULL)',
];
function adapter(sql){return {prepare(query){return {bind(...args){return {
 async first(){return sql.exec(query,...args).toArray()[0]||null},
 async run(){sql.exec(query,...args);return {meta:{changes:Number(sql.exec('SELECT changes() as n').one().n)}}}
}}}}}}
export class UniversalLedger extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;for(const q of CREATE)this.sql.exec(q);
  const issuers=JSON.parse(env.ISSUERS_V1_JSON||'[]');
  if(!Array.isArray(issuers)||issuers.length>25)throw Error('ISSUER_REGISTRY_INVALID');
  for(const i of issuers){
    if(i.company_id!=='fenix'||i.environment!=='LAB'||!/^UMS001-LAB-[A-Z0-9-]{8,90}$/.test(i.key_id||'')||!/^[A-Z][A-Z0-9-]{2,63}$/.test(i.origin_engine_id||'')||!/^[A-Za-z0-9+/=]{40,500}$/.test(i.public_spki_base64||'')||!/^[0-9a-f]{64}$/.test(i.public_spki_sha256||'')||!Array.isArray(i.allowed_channels)||!Array.isArray(i.allowed_kinds))throw Error('ISSUER_POLICY_INVALID');
    this.sql.exec('INSERT OR IGNORE INTO media_issuers(key_id,company_id,environment,origin_engine_id,public_spki_base64,public_spki_sha256,allowed_channels,allowed_kinds,enabled,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',i.key_id,i.company_id,'LAB',i.origin_engine_id,i.public_spki_base64,i.public_spki_sha256,JSON.stringify(i.allowed_channels),JSON.stringify(i.allowed_kinds),1,new Date().toISOString());
  }
}

 async enrollFactoryIssuer(r){
  const keys=['schema_version','event_id','key_id','company_id','environment','origin_engine_id','version','public_spki_base64','public_spki_sha256','allowed_channels','allowed_kinds','capabilities','issued_at_utc'];
  if(!r||typeof r!=='object'||Object.keys(r).sort().join('|')!==keys.sort().join('|')||r.schema_version!=='1.0.0'||r.company_id!=='fenix'||r.environment!=='LAB'||!/^[A-Z][A-Z0-9-]{2,63}$/.test(r.origin_engine_id||'')||!/^UMS001-LAB-[A-Z0-9-]{8,90}$/.test(r.key_id||'')||!/^FACT-ENROLL-[A-Z0-9-]{12,100}$/.test(r.event_id||'')||!/^\d+\.\d+\.\d+$/.test(r.version||''))throw Error('FACT_ENROLL_SCHEMA');
  if(!Array.isArray(r.allowed_channels)||r.allowed_channels.length<1||r.allowed_channels.length>8||!r.allowed_channels.every(x=>['SEO','INSTAGRAM','FACEBOOK','GENERIC','LINKEDIN','YOUTUBE','TIKTOK'].includes(x))||!Array.isArray(r.allowed_kinds)||r.allowed_kinds.length!==1||r.allowed_kinds[0]!=='IMAGE'||!Array.isArray(r.capabilities)||r.capabilities.length!==1||r.capabilities[0]!=='IMAGE.SYNTHETIC')throw Error('FACT_ENROLL_SCOPE');
  if(Math.abs(Date.now()-Date.parse(r.issued_at_utc))>300000||!Number.isFinite(Date.parse(r.issued_at_utc)))throw Error('FACT_ENROLL_EXPIRED');
  if(!/^[0-9a-f]{64}$/.test(r.public_spki_sha256||'')||!/^[A-Za-z0-9+/]+={0,2}$/.test(r.public_spki_base64||'')||r.public_spki_base64.length>400)throw Error('FACT_ENROLL_SPKI');
  const spki=Uint8Array.from(atob(r.public_spki_base64),c=>c.charCodeAt(0));
  if(spki.length<40||spki.length>200)throw Error('FACT_ENROLL_SPKI_LENGTH');
  const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',spki))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==r.public_spki_sha256)throw Error('FACT_ENROLL_SHA_MISMATCH');
  const existing=[...this.sql.exec('SELECT * FROM media_issuers WHERE key_id=?',r.key_id)][0];
  if(existing){
   if(existing.company_id!==r.company_id||existing.origin_engine_id!==r.origin_engine_id||existing.public_spki_sha256!==r.public_spki_sha256||existing.enabled!==1)throw Error('FACT_ENROLL_KEY_CONFLICT');
   return {state:'REGISTERED',already_present:true,company_id:r.company_id,engine_id:r.origin_engine_id,key_id:r.key_id};
  }
  const event=[...this.sql.exec('SELECT * FROM media_factory_enrollments WHERE event_id=?',r.event_id)][0];
  if(event)throw Error('FACT_ENROLL_EVENT_REPLAY');
  const when=new Date().toISOString();
  this.sql.exec('INSERT INTO media_issuers(key_id,company_id,environment,origin_engine_id,public_spki_base64,public_spki_sha256,allowed_channels,allowed_kinds,enabled,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',r.key_id,r.company_id,'LAB',r.origin_engine_id,r.public_spki_base64,r.public_spki_sha256,JSON.stringify(r.allowed_channels),JSON.stringify(r.allowed_kinds),1,when);
  this.sql.exec('INSERT INTO media_factory_enrollments(event_id,key_id,company_id,engine_id,public_sha,created_at) VALUES(?,?,?,?,?,?)',r.event_id,r.key_id,r.company_id,r.origin_engine_id,r.public_spki_sha256,when);
  return {state:'REGISTERED',already_present:false,company_id:r.company_id,engine_id:r.origin_engine_id,key_id:r.key_id,at:when};
 }
 async submitSignedJob(e){return acceptMediaJob(adapter(this.sql),e)}
 async issuerCount(){return this.sql.exec('SELECT COUNT(*) AS n FROM media_issuers WHERE enabled=1').one().n}
 async stats(){const a=this.sql.exec('SELECT COUNT(*) AS n FROM media_jobs').one().n,b=this.sql.exec('SELECT COUNT(*) AS n FROM media_events').one().n,c=this.sql.exec('SELECT COUNT(*) AS n FROM media_rejections').one().n;return {jobs:a,events:b,rejections:c}}
}
const target=(env,company)=>{const ns=env.MEDIA_LEDGER.jurisdiction('eu');return ns.get(ns.idFromName(company+'/UMS-001/LAB'))};

async function dispatchRegisteredImage(env,r){
 if(r?.policy_version!=='ums001-execution-lab-v1'||r?.asset_kind!=='IMAGE'||r?.capability_id!=='IMAGE.SYNTHETIC')return;
 if(env.REGISTERED_IMAGE_ENABLED!=='true'||!env.REGISTERED_IMAGE_QUEUE||typeof env.SIGNED_JOB_DISPATCH_KEY!=='string'||env.SIGNED_JOB_DISPATCH_KEY.length<48)throw Error('UMS001_EXECUTION_OFF');
 if(r.company_id!=='fenix'||r.environment!=='LAB'||r.budget?.paid_execution_enabled!==false||r.budget?.publish_requested!==false)throw Error('UMS001_EXECUTION_SCOPE');
 const unsigned={schema_version:1,event_type:'UMS001_REGISTERED_IMAGE_DISPATCH',payload:r};
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SIGNED_JOB_DISPATCH_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(canonical(unsigned)));
 const hmac=btoa(String.fromCharCode(...new Uint8Array(signature)));
 await env.REGISTERED_IMAGE_QUEUE.send({...unsigned,hmac});
}
export class UniversalMediaLab extends WorkerEntrypoint{
 async submitSignedJob(e){if(this.env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('OFF');validateEnvelope(e);const out=await target(this.env,e.payload.company_id).submitSignedJob(e);if(['REGISTERED_QA_PENDING','DUPLICATE_ACCEPTED'].includes(out.status))await dispatchRegisteredImage(this.env,e.payload);return out}

 async enrollFactoryIssuer(r,token){
  if(this.env.FACT_ENROLL_ENABLED!=='true'||typeof this.env.FACT_ENROLL_TOKEN!=='string'||this.env.FACT_ENROLL_TOKEN.length<48||typeof token!=='string'||token.length!==this.env.FACT_ENROLL_TOKEN.length)throw Error('FACT_ENROLL_NOT_AUTHORIZED');
  const a=new TextEncoder().encode(token),b=new TextEncoder().encode(this.env.FACT_ENROLL_TOKEN);
  let v=0;for(let i=0;i<a.length;i++)v|=a[i]^b[i];if(v!==0)throw Error('FACT_ENROLL_NOT_AUTHORIZED');
  return target(this.env,r.company_id).enrollFactoryIssuer(r);
 }
 async stats(){return target(this.env,'fenix').stats()}
}
export default {
 async queue(batch,env){
  if(batch.queue!==NAME||env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('WRONG_QUEUE_OR_OFF');
  for(const m of batch.messages){
   try{
    validateEnvelope(m.body);
    const accepted=await target(env,m.body.payload.company_id).submitSignedJob(m.body);
    if(['REGISTERED_QA_PENDING','DUPLICATE_ACCEPTED'].includes(accepted.status))await dispatchRegisteredImage(env,m.body.payload);
    m.ack();
   }catch(e){
    const code=String(e?.message||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_').slice(0,85);
    console.error('UMS001_PRIVATE_REJECTED',code);
    m.ack();
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}})}
};
