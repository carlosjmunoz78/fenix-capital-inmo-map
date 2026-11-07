import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB2PostgresSessionStore} from './jarvis-b2-postgres-session-store.mjs';
import {createJarvisB2SessionRevocationGate} from './jarvis-b2-session-revocation-gate.mjs';
import {createHmac} from 'node:crypto';
const ownerId='zeus-owner:synthetic';
const sessionId='opaque-synthetic-123';
const secret=Buffer.alloc(32,9);
const hmac=createHmac('sha256',secret).update('jarvis-b2-session-v0\0')
 .update(ownerId).update('\0').update(sessionId).digest('hex');
const future=Date.parse('2026-11-05T23:00:00Z');
const now=future-60_000;
const row={owner_id:ownerId,session_hmac:hmac,environment:'LAB',role:'OWNER_ROOT',
 active:true,revoked:false,authorized_companies:['fenix'],expires_at_ms:future};
const spy=rows=>{const calls=[];return {calls,client:{query:async q=>{calls.push(q);return{rows}}}}};
test('requires server client and strictly LAB environment',()=>{
 assert.throws(()=>createJarvisB2PostgresSessionStore(),/TRUSTED_SESSION_POSTGRES_CLIENT/);
 assert.throws(()=>createJarvisB2PostgresSessionStore({client:{query:async()=>({rows:[]})},environment:'PROD'}),/LAB_ONLY/);
});
test('query binds only owner and HMAC; never raw session or token',async()=>{
 const s=spy([row]);const store=createJarvisB2PostgresSessionStore({client:s.client});
 const result=await store.get({ownerId,sessionHmac:hmac,environment:'LAB'});
 assert.equal(result.expiresAt,future);assert.equal(result.role,'OWNER_ROOT');
 assert.deepEqual(s.calls[0].values,[ownerId,hmac]);
 assert.match(s.calls[0].text,/\$1/);assert.match(s.calls[0].text,/\$2/);
 assert.ok(!JSON.stringify(s.calls).includes(sessionId));
 assert.ok(Object.isFrozen(result));
});
test('rejects malformed scope before database query',async()=>{
 const s=spy([row]);const store=createJarvisB2PostgresSessionStore({client:s.client});
 for(const args of [{ownerId,sessionHmac:hmac,environment:'PROD'},
  {ownerId:'a;drop table',sessionHmac:hmac,environment:'LAB'},
  {ownerId,sessionHmac:'plaintext',environment:'LAB'}])
  await assert.rejects(store.get(args),/B2_SESSION_SCOPE_INVALID/);
 assert.equal(s.calls.length,0);
});
test('missing and ambiguous records fail closed',async()=>{
 assert.equal(await createJarvisB2PostgresSessionStore({client:spy([]).client}).get({ownerId,sessionHmac:hmac,environment:'LAB'}),null);
 await assert.rejects(createJarvisB2PostgresSessionStore({client:spy([row,row]).client}).get({ownerId,sessionHmac:hmac,environment:'LAB'}),/AMBIGUOUS/);
});
test('inconsistent row fails closed',async()=>{
 const bad={...row,session_hmac:'b'.repeat(64)};
 await assert.rejects(createJarvisB2PostgresSessionStore({client:spy([bad]).client}).get({ownerId,sessionHmac:hmac,environment:'LAB'}),/ROW_INVALID/);
});
test('Postgres failure does not disclose underlying credentials',async()=>{
 const s=createJarvisB2PostgresSessionStore({client:{query:async()=>{throw Error('DB password secret!')}}});
 await assert.rejects(s.get({ownerId,sessionHmac:hmac,environment:'LAB'}),e=>e.message==='B2_SESSION_DB_UNAVAILABLE');
});
test('CUT16 session gate resolves PG-scoped row, revocation denies next read',async()=>{
 let current={...row};const queries=[];
 const store=createJarvisB2PostgresSessionStore({client:{query:async q=>{queries.push(q);
  return{rows:current?[current]:[]}}}});
 const principal={ownerId,sessionId,roles:['OWNER_ROOT'],authorizedCompanies:['fenix','aion']};
 const gate=createJarvisB2SessionRevocationGate({enabled:true,secret,sessionStore:store,
  identityProvider:{verify:async()=>principal},clock:()=>now});
 const ok=await gate.verify('trusted-synthetic');assert.deepEqual(ok.authorizedCompanies,['fenix']);
 current={...row,revoked:true};
 await assert.rejects(gate.verify('trusted-synthetic'),/B2_SESSION_NOT_VERIFIED/);
 assert.equal(queries.length,2);
});
