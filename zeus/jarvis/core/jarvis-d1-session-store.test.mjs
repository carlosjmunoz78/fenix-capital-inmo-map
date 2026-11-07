import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHmac} from 'node:crypto';
import {createJarvisD1SessionStore} from './jarvis-d1-session-store.mjs';
import {createJarvisB2SessionRevocationGate} from './jarvis-b2-session-revocation-gate.mjs';

const sql=readFileSync(fileURLToPath(new URL('../cloudflare-lab/0002_jarvis_d1_session_lab.sql',import.meta.url)),'utf8');
const owner='zeus-owner:synthetic';
const rawSession='synthetic-opaque-session';
const secret=Buffer.alloc(32,18);const now=Date.parse('2026-11-05T23:00:00Z');
const digest=createHmac('sha256',secret).update('jarvis-b2-session-v0\0')
 .update(owner).update('\0').update(rawSession).digest('hex');
const seed={owner_id:owner,session_hmac:digest,environment:'LAB',
 channel:'fenix-app',role:'OWNER_ROOT',active:1,revoked:0,
 authorized_companies_json:'["fenix","aion"]',expires_at_ms:now+60000,issued_at_ms:now-10000};
const bindSql="INSERT INTO jarvis_lab_session_binding_v0 (owner_id,session_hmac,environment,channel,role,active,revoked,authorized_companies_json,expires_at_ms,issued_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)";
function rig({insert=true,initial=seed}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(sql);
 if(insert)sqlite.prepare(bindSql).run(...Object.values(initial));
 const queries=[];
 const db={prepare(sql){queries.push(sql);return{bind(...values){return{
  async first(){return sqlite.prepare(sql).get(...values)??null}
 }}}}};
 return {sqlite,queries,db,store:createJarvisD1SessionStore({db,clock:()=>now})};
}
test('CUT22 server-only adapters required, LAB-only, trusted channel mandatory',()=>{
 assert.throws(()=>createJarvisD1SessionStore(),/TRUSTED_D1_B2_ADAPTERS_REQUIRED/);
 assert.throws(()=>createJarvisD1SessionStore({environment:'PROD',db:{prepare(){}}}),/D1_B2_LAB_ONLY/);
 assert.throws(()=>createJarvisD1SessionStore({db:{prepare(){}},trustedChannel:'../evil'}),/TRUSTED_D1_B2_ADAPTERS_REQUIRED/);
});
test('CUT22 reads matching hashed active owner session and companies',async()=>{
 const a=rig();try{const p=await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'});
  assert.equal(p.ownerId,owner);assert.equal(p.sessionHmac,digest);
  assert.deepEqual(p.authorizedCompanies,['fenix','aion']);
  assert.equal(p.active,true);assert.equal(p.revoked,false);assert.ok(Object.isFrozen(p));
 }finally{a.sqlite.close()}
});
test('CUT22 rejects invalid scope before query',async()=>{
 const a=rig();try{
  for(const args of [{ownerId:owner,sessionHmac:digest,environment:'PROD'},
    {ownerId:owner,sessionHmac:'not-a-hash',environment:'LAB'},
    {ownerId:'bad owner;',sessionHmac:digest,environment:'LAB'}]){
     await assert.rejects(a.store.get(args),/D1_B2_SESSION_SCOPE_INVALID/);
  }
  assert.equal(a.queries.length,0);
 }finally{a.sqlite.close()}
});
test('CUT22 revocation and expiry deny on every subsequent independent read',async()=>{
 const a=rig();try{
  assert.ok(await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}));
  a.sqlite.prepare('UPDATE jarvis_lab_session_binding_v0 SET revoked=1').run();
  assert.equal(await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),null);
  a.sqlite.prepare('UPDATE jarvis_lab_session_binding_v0 SET revoked=0,expires_at_ms=?').run(now-1);
  assert.equal(await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),null);
  a.sqlite.prepare('UPDATE jarvis_lab_session_binding_v0 SET expires_at_ms=?,active=0').run(now+10000);
  assert.equal(await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),null);
 }finally{a.sqlite.close()}
});
test('CUT22 cross-owner, cross-session, cross-channel all denied',async()=>{
 const a=rig();try{
  assert.equal(await a.store.get({ownerId:'zeus-owner:other',sessionHmac:digest,environment:'LAB'}),null);
  assert.equal(await a.store.get({ownerId:owner,sessionHmac:'a'.repeat(64),environment:'LAB'}),null);
  const other=createJarvisD1SessionStore({db:a.db,clock:()=>now,trustedChannel:'mobile-app'});
  assert.equal(await other.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),null);
 }finally{a.sqlite.close()}
});
test('CUT22 restricts SQL to bound hash, no raw session id and no interpolation',async()=>{
 const a=rig();try{
  await a.store.get({ownerId:owner,sessionHmac:digest,environment:'LAB'});
  assert.equal(a.queries.length,1);
  assert.ok(a.queries[0].includes('owner_id=?'));
  assert.ok(a.queries[0].includes('session_hmac=?'));
  assert.equal(a.queries[0].includes(rawSession),false);
  assert.equal(a.queries[0].includes(owner),false);
 }finally{a.sqlite.close()}
});
test('CUT22 composes with existing CUT16 HMAC session gate and denies revoked session',async()=>{
 const a=rig();try{
  const principal={ownerId:owner,sessionId:rawSession,roles:['OWNER_ROOT'],
   authorizedCompanies:['fenix','third-company']};
  const gate=createJarvisB2SessionRevocationGate({
   identityProvider:{verify:async()=>principal},sessionStore:a.store,
   secret,clock:()=>now,enabled:true
  });
  const permitted=await gate.verify({channel:'fenix-app',accessToken:'synthetic-not-real'});
  assert.deepEqual(permitted.authorizedCompanies,['fenix']);
  a.sqlite.prepare('UPDATE jarvis_lab_session_binding_v0 SET revoked=1').run();
  await assert.rejects(gate.verify('synthetic-not-real'),/B2_SESSION_NOT_VERIFIED/);
 }finally{a.sqlite.close()}
});
test('CUT22 database failure and invalid clock fail closed without leaking secrets',async()=>{
 const failing=createJarvisD1SessionStore({db:{prepare(){throw Error('D1 API secret private')}},clock:()=>now});
 await assert.rejects(failing.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),e=>e.message==='D1_B2_SESSION_DB_UNAVAILABLE');
 const badClock=createJarvisD1SessionStore({db:{prepare(){throw Error('NEVER_REACHED')}},clock:()=>NaN});
 await assert.rejects(badClock.get({ownerId:owner,sessionHmac:digest,environment:'LAB'}),/CLOCK_UNAVAILABLE/);
});
