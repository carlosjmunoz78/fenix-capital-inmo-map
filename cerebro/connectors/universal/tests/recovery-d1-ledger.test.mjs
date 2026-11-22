import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createD1RecoveryLedger,RECOVERY_D1_SCHEMA} from '../src/recovery-d1-ledger.mjs';
import {createRecoveryGuard} from '../src/recovery.mjs';

const CTX={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const identity={client_id:'cerebro',identity_ref:'service:cerebro',actor_id:'cerebro'};
const read=id=>({context:CTX,capability:'cloudflare.d1.list',input:{},idempotency_key:id});
const write=id=>({context:CTX,capability:'cloudflare.d1.create-facebook-lab-eu',input:{name:'cerebro-facebook-autoqual-lab',jurisdiction:'eu',confirm_isolated:true},idempotency_key:id});
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(RECOVERY_D1_SCHEMA);
 const query=async(sql,params)=>db.prepare(sql).all(...params);
 const store=createD1RecoveryLedger({query});
 let t=10000;const events=[];
 const make=(invoke)=>createRecoveryGuard({store,invoke,audit:x=>events.push(x),now:()=>t,sleep:async ms=>{t+=ms},baseDelayMs:100,leaseMs:1000});
 return {db,store,make,events,advance:ms=>t+=ms};
}
test('schema retains only hash/idempotency fields, no payloads or secrets',()=>{
 const x=setup();const names=x.db.prepare('PRAGMA table_info(fact001_recovery_v1)').all().map(y=>y.name);
 assert.deepEqual(names,['key_hash','fingerprint','state','retryable_read','attempt','lease_until','retry_at','updated_at']);
 assert.equal(x.db.prepare('SELECT count(*) AS n FROM fact001_recovery_v1').get().n,0);
});
test('D1 ledger persists completed state across recovery guard recreation',async()=>{
 const s=setup();let n=0;const cmd=read('D1-RESTART-1');
 let g=s.make(async()=>{n++;return {status:'COMPLETED',sensitive:'not-saved'};});
 assert.equal((await g.once({identity,command:cmd})).status,'COMPLETED');
 g=s.make(async()=>{n++;return {status:'COMPLETED'};});
 assert.equal((await g.once({identity,command:cmd})).status,'ALREADY_COMPLETED');
 assert.equal(n,1);assert.equal(s.db.prepare('SELECT state FROM fact001_recovery_v1').get().state,'COMPLETED');
 assert.ok(!JSON.stringify(s.db.prepare('SELECT * FROM fact001_recovery_v1').all()).includes('not-saved'));
});
test('one transient read retries through durable database, then completes',async()=>{
 const s=setup();let n=0;
 const g=s.make(async()=>{n++;if(n===1)throw Object.assign(Error('temporary'),{code:'HTTP_503'});return {status:'COMPLETED'}});
 assert.equal((await g.drive({identity,command:read('D1-READ-RETRY-1')})).status,'COMPLETED');
 assert.equal(n,2);assert.equal(s.db.prepare('SELECT attempt FROM fact001_recovery_v1').get().attempt,2);
});
test('lost mutating response goes to RECONCILE permanently, no duplicate',async()=>{
 const s=setup();let n=0;
 let g=s.make(async()=>{n++;throw Object.assign(Error('timeout'),{code:'ETIMEDOUT'});});
 assert.equal((await g.once({identity,command:write('D1-WRITE-LOST-1')})).status,'RECONCILIATION_REQUIRED');
 g=s.make(async()=>{n++;return {status:'COMPLETED'};});
 assert.equal((await g.once({identity,command:write('D1-WRITE-LOST-1')})).status,'RECONCILIATION_REQUIRED');
 assert.equal(n,1);
});
test('crashed write cannot be repeated after its lease expires',async()=>{
 const s=setup();let release;const inFlight=new Promise(resolve=>release=resolve);
 const g=s.make(async()=>inFlight),req={identity,command:write('D1-CRASH-1')};
 const promise=g.once(req);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal((await g.once(req)).status,'IN_PROGRESS');
 s.advance(2000);
 assert.equal((await g.once(req)).status,'RECONCILIATION_REQUIRED');
 release({status:'COMPLETED'});
 await assert.rejects(promise,/CAS_CONFLICT/);
 assert.equal(s.db.prepare('SELECT state FROM fact001_recovery_v1').get().state,'RECONCILE');
});
test('old 4D identity cannot impersonate client via same request id',async()=>{
 const s=setup();const g=s.make(async()=>({status:'COMPLETED'}));const command=read('D1-CLIENT-1');
 assert.equal((await g.once({identity,command})).status,'COMPLETED');
 assert.equal((await g.once({identity:{...identity,client_id:'chatgpt'},command})).status,'COMPLETED');
 assert.equal(s.db.prepare('SELECT count(*) AS n FROM fact001_recovery_v1').get().n,2);
});
test('same idempotency key with changed input cannot reexecute',async()=>{
 const s=setup();let n=0;const g=s.make(async()=>{n++;return {status:'COMPLETED'};});
 const a=read('D1-COLLISION-1');const b={...read('D1-COLLISION-1'),input:{page:2}};
 assert.equal((await g.once({identity,command:a})).status,'COMPLETED');
 assert.equal((await g.once({identity,command:b})).status,'IDEMPOTENCY_CONFLICT');
 assert.equal(n,1);
});
test('D1 has no UPDATE/DELETE of business data and no credential strings',()=>{
 const x=setup();assert.equal(x.db.prepare('SELECT count(*) AS n FROM sqlite_master WHERE type=\'table\' AND name=\'fact001_recovery_v1\'').get().n,1);
});
