/** UMS-001 universal LAB. SQLite Durable Object is the atomic ledger; no public routes. */
import {WorkerEntrypoint,DurableObject} from 'cloudflare:workers';
import {acceptMediaJob,validateEnvelope} from './core.mjs';
const NAME='cerebro-ums001-universal-demand-lab-eu';
const CREATE=[
 'CREATE TABLE IF NOT EXISTS media_issuers (key_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, environment TEXT NOT NULL, origin_engine_id TEXT NOT NULL, public_spki_base64 TEXT NOT NULL, public_spki_sha256 TEXT NOT NULL, allowed_channels TEXT NOT NULL, allowed_kinds TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS media_nonces (key_id TEXT NOT NULL, nonce TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(key_id,nonce))',
 'CREATE TABLE IF NOT EXISTS media_jobs (idempotency_key TEXT PRIMARY KEY, company_id TEXT NOT NULL, environment TEXT NOT NULL, origin_engine_id TEXT NOT NULL, consumer_engine_id TEXT NOT NULL, request_id TEXT NOT NULL, item_id TEXT NOT NULL, channel_id TEXT NOT NULL, asset_kind TEXT NOT NULL, request_sha256 TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE UNIQUE INDEX IF NOT EXISTS media_job_unique ON media_jobs(company_id,environment,origin_engine_id,request_id,consumer_engine_id,item_id)',
 'CREATE TABLE IF NOT EXISTS media_events (event_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL, event_type TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS media_rejections (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, created_at TEXT NOT NULL)'
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
 async submitSignedJob(e){return acceptMediaJob(adapter(this.sql),e)}
 async issuerCount(){return this.sql.exec('SELECT COUNT(*) AS n FROM media_issuers WHERE enabled=1').one().n}
 async stats(){const a=this.sql.exec('SELECT COUNT(*) AS n FROM media_jobs').one().n,b=this.sql.exec('SELECT COUNT(*) AS n FROM media_events').one().n,c=this.sql.exec('SELECT COUNT(*) AS n FROM media_rejections').one().n;return {jobs:a,events:b,rejections:c}}
}
const target=(env,company)=>env.MEDIA_LEDGER.get(env.MEDIA_LEDGER.idFromName(company+'/UMS-001/LAB'));
export class UniversalMediaLab extends WorkerEntrypoint{
 async submitSignedJob(e){if(this.env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('OFF');validateEnvelope(e);return target(this.env,e.payload.company_id).submitSignedJob(e)}
 async stats(){return target(this.env,'fenix').stats()}
}
export default {
 async queue(batch,env){
  if(batch.queue!==NAME||env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('WRONG_QUEUE_OR_OFF');
  for(const m of batch.messages){
   try{
    validateEnvelope(m.body);
    await target(env,m.body.payload.company_id).submitSignedJob(m.body);
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
