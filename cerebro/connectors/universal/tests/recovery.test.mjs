import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryGuard,volatileTestLedger} from '../src/recovery.mjs';

const CTX={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const identities={
 chatgpt:{client_id:'chatgpt',identity_ref:'oauth:owner',actor_id:'owner'},
 cerebro:{client_id:'cerebro',identity_ref:'service:cerebro',actor_id:'service'}
};
const read=(id='RECON-20261110-001',input={})=>({context:CTX,capability:'cloudflare.d1.list',input,idempotency_key:id});
const write=(id='RECON-20261110-002')=>({context:CTX,capability:'cloudflare.d1.create-facebook-lab-eu',input:{name:'cerebro-facebook-autoqual-lab',jurisdiction:'eu',confirm_isolated:true},idempotency_key:id});
function store(){
 const rows=new Map();let writes=0;
 return {
  durable:true,rows,events:[],
  async claim({key,fingerprint,now,leaseMs,maxAttempts,retryableRead}){
   let r=rows.get(key);
   if(!r){r={fingerprint,state:'RUNNING',attempt:1,leaseUntil:now+leaseMs};rows.set(key,r);return {status:'CLAIMED',attempt:1};}
   if(r.fingerprint!==fingerprint)return {status:'CONFLICT'};
   if(r.state==='COMPLETED')return {status:'COMPLETED'};
   if(r.state==='RECONCILE')return {status:'RECONCILE'};
   if(r.state==='EXHAUSTED'||r.state==='STOPPED')return {status:'EXHAUSTED'};
   if(r.state==='BACKOFF'&&now<r.retryAt)return {status:'BACKOFF',retryAt:r.retryAt};
   if(r.state==='RUNNING'&&now<r.leaseUntil)return {status:'PENDING'};
   if(!retryableRead){r.state='RECONCILE';return {status:'RECONCILE'};}
   if(r.attempt>=maxAttempts){r.state='EXHAUSTED';return {status:'EXHAUSTED'};}
   r.attempt++;r.state='RUNNING';r.leaseUntil=now+leaseMs;r.retryAt=undefined;return {status:'CLAIMED',attempt:r.attempt};
  },
  async settle({key,fingerprint,attempt,now,status,retryAt}){
   const r=rows.get(key);
   if(!r||r.fingerprint!==fingerprint||r.attempt!==attempt||r.state!=='RUNNING')throw Error('CAS_CONFLICT');
   if(!['COMPLETED','RECONCILE','BACKOFF','STOPPED','EXHAUSTED'].includes(status))throw Error('INVALID_TRANSITION');
   r.state=status;r.retryAt=retryAt;r.updatedAt=now;writes++;this.events.push({state:status,attempt});
  },
  get writes(){return writes;}
 };
}
function fixture({invoke,identity=identities.chatgpt,maxAttempts=3}={}){
 let clock=100000;const audit=[];const s=store();
 const guard=createRecoveryGuard({store:s,invoke:invoke||async()=>({status:'COMPLETED'}),audit:e=>audit.push(e),now:()=>clock,sleep:async ms=>{clock+=ms;},maxAttempts,baseDelayMs:1000,leaseMs:2000});
 return {guard,s,audit,identity,clock:()=>clock,advance:ms=>{clock+=ms;}};
}
test('needs durable transactional CAS store',()=>assert.throws(()=>createRecoveryGuard({store:volatileTestLedger(),invoke:async()=>{},audit:()=>{}}),/DURABLE_ATOMIC_STORE_REQUIRED/));
test('strict 4D and trusted client are mandatory before I/O',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;return {status:'COMPLETED'};}});
 for(const request of [
 {identity:{...identities.chatgpt,client_id:'untrusted'},command:read()},
 {identity:identities.chatgpt,command:{...read(),context:{...CTX,environment:'PROD'}}},
 {identity:identities.chatgpt,command:{...read(),context:{...CTX,company_id:''}}},
 {identity:identities.chatgpt,command:{...read(),capability:'cloudflare.dns.update'}},
 {identity:identities.chatgpt,command:{...read(),capability:'missing.endpoint'}}
 ])assert.equal((await f.guard.once(request)).status,'DENIED');
 assert.equal(n,0);
});
test('read-only GET retries transient HTTP 503 once and succeeds, bounded delay',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;if(n===1)throw Object.assign(Error('irrelevant secret in message'),{code:'HTTP_503'});return {status:'COMPLETED',data:{count:3}};}});
 const result=await f.guard.drive({identity:f.identity,command:read()});
 assert.equal(result.status,'COMPLETED');assert.equal(n,2);assert.equal(f.s.events[0].state,'BACKOFF');assert.equal(f.s.events[1].state,'COMPLETED');
 assert.equal(f.clock(),101000);assert.equal(f.audit.length,2);
 assert.ok(!JSON.stringify(f.audit).includes('irrelevant secret'));
});
test('rate limit 429 retries only GET and has exponential delays',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;if(n<=2)throw Object.assign(Error('429'),{code:'HTTP_429'});return {status:'COMPLETED'};}});
 assert.equal((await f.guard.drive({identity:f.identity,command:read('RECON-20261110-003')})).status,'COMPLETED');
 assert.equal(n,3);assert.equal(f.clock(),103000);
});
test('GET retry is exhausted at exactly three attempts',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;throw Object.assign(Error('timeout'),{code:'ETIMEDOUT'});}});
 const r=await f.guard.drive({identity:f.identity,command:read('RECON-20261110-004')});
 assert.equal(r.status,'RETRIES_EXHAUSTED');assert.equal(n,3);
 assert.equal(f.s.events.at(-1).state,'EXHAUSTED');
});
test('OAuth 401 is never blindly retried',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;throw Object.assign(Error('password=hidden'),{code:'HTTP_401'});}});
 const r=await f.guard.drive({identity:f.identity,command:read('RECON-20261110-005')});
 assert.equal(r.status,'AUTH_REQUIRED');assert.equal(n,1);assert.equal(f.audit[0].reason,'AUTH_REQUIRED');
 assert.ok(!JSON.stringify(f.audit).includes('password'));
});
test('unknown error is not retried',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;throw Error('anything');}});
 const r=await f.guard.drive({identity:f.identity,command:read('RECON-20261110-006')});
 assert.equal(r.status,'RETRIES_EXHAUSTED');assert.equal(n,1);
});
test('ambiguous write is held for reconciliation, never retried',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;throw Object.assign(Error('lost response'),{code:'ETIMEDOUT'});}});
 const req={identity:f.identity,command:write()};
 assert.equal((await f.guard.drive(req)).status,'RECONCILIATION_REQUIRED');
 assert.equal((await f.guard.drive(req)).status,'RECONCILIATION_REQUIRED');
 assert.equal(n,1);assert.equal(f.s.events[0].state,'RECONCILE');
});
test('abandoned mutating lease fails closed on restart (no duplicate)',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;return {status:'COMPLETED'};}});
 const command=write('RECON-20261110-007'),identity=f.identity;
 const fake={client_id:identity.client_id,identity_ref:identity.identity_ref,scope:CTX,request_id:command.idempotency_key};
 // External transactional store has a crashed, previously claimed mutation for the SAME request.
 // Verify by starting the command in an unresolved promise, then advancing the lease.
 let release;const pending=new Promise(resolve=>{release=resolve;});
 const blocked=fixture({invoke:()=>pending});
 const underway=blocked.guard.once({identity,command});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal((await blocked.guard.once({identity,command})).status,'IN_PROGRESS');
 blocked.advance(3000);
 assert.equal((await blocked.guard.once({identity,command})).status,'RECONCILIATION_REQUIRED');
 release({status:'COMPLETED'});
 await assert.rejects(underway,/CAS_CONFLICT/); // stale response cannot overwrite reconciliation state.
 assert.equal(n,0);void fake;
});
test('concurrent calls with same idempotency key execute once',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});let calls=0;
 const f=fixture({invoke:async()=>{calls++;return pending;}});
 const request={identity:f.identity,command:read('RECON-20261110-008')};
 const first=f.guard.once(request);
 await new Promise(r=>setImmediate(r));
 const second=await f.guard.once(request);
 assert.equal(second.status,'IN_PROGRESS');assert.equal(calls,1);
 resolve({status:'COMPLETED',data:'private-data'});
 assert.equal((await first).status,'COMPLETED');
 assert.equal((await f.guard.once(request)).status,'ALREADY_COMPLETED');
 assert.ok(!JSON.stringify([...f.s.rows.values()]).includes('private-data'));
});
test('identical request key with modified payload is rejected (conflict)',async()=>{
 const f=fixture();
 const a=read('RECON-20261110-009',{page:1}),b=read('RECON-20261110-009',{page:2});
 assert.equal((await f.guard.once({identity:f.identity,command:a})).status,'COMPLETED');
 assert.equal((await f.guard.once({identity:f.identity,command:b})).status,'IDEMPOTENCY_CONFLICT');
});
test('separate client identity+scope get independent ledger keys',async()=>{
 let n=0;const f=fixture({invoke:async()=>{n++;return {status:'COMPLETED'};}});
 const command=read('RECON-20261110-010');
 assert.equal((await f.guard.once({identity:identities.chatgpt,command})).status,'COMPLETED');
 assert.equal((await f.guard.once({identity:identities.cerebro,command})).status,'COMPLETED');
 assert.equal(n,2);assert.equal(f.s.rows.size,2);
});
test('unverified read output stops and never silently becomes success',async()=>{
 const f=fixture({invoke:async()=>({status:'MAYBE_DONE'})});
 assert.equal((await f.guard.drive({identity:f.identity,command:read('RECON-20261110-011')})).status,'STOPPED');
 assert.equal(f.s.events[0].state,'STOPPED');
});
test('recovery ledger stores no secrets, payloads or model response bodies',async()=>{
 const marker='SUPERSENSITIVE-DO-NOT-LOG';
 const f=fixture({invoke:async()=>({status:'COMPLETED',data:{marker}})});
 await f.guard.once({identity:f.identity,command:read('RECON-20261110-012',{custom:marker})});
 assert.ok(!JSON.stringify([...f.s.rows.values()]).includes(marker));
 assert.ok(!JSON.stringify(f.audit).includes(marker));
});
