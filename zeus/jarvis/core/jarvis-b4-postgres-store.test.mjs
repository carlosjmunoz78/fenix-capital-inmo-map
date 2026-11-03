import test from 'node:test';import assert from 'node:assert/strict';
import {createJarvisB4PostgresStore,createJarvisB4GuardedControlStore} from './jarvis-b4-postgres-store.mjs';
import {createJarvisB4Memory,B4MemoryLabStore} from './jarvis-b4-memory.mjs';
const base={id:'8cdfbf5a-3fb2-469a-a283-113e78a39c15',ownerId:'owner-1',companyId:'fenix',environment:'LAB',projectId:'project-1',idempotencyKey:'key-1',fingerprint:'sha256-stable'};
test('B4 Postgres store requires a trusted SQL binding, no untrusted SQL inputs',()=>assert.throws(()=>createJarvisB4PostgresStore(),/TRUSTED_POSTGRES_QUERY_REQUIRED/));
test('B4 Postgres insert uses parameterized SQL with explicit private table and atomic constraint',async()=>{
 const calls=[];const store=createJarvisB4PostgresStore({query:async(sql,args)=>{calls.push({sql,args});return{rows:[{seq:'1',event:base}]};}});
 const result=await store.appendUnique(base);assert.equal(result.replayed,false);assert.match(calls[0].sql,/ON CONFLICT \(owner_id,company_id,environment,project_id,idempotency_key\) DO NOTHING/);assert.deepEqual(calls[0].args.slice(1,6),['owner-1','fenix','LAB','project-1','key-1']);
});
test('B4 Postgres conflicting duplicate is rejected without overwriting older event',async()=>{
 const store=createJarvisB4PostgresStore({query:async(sql)=>sql.startsWith('INSERT')?{rows:[]}:{rows:[{seq:'1',event:base,fingerprint:'different'}]}});
 await assert.rejects(store.appendUnique(base),/IDEMPOTENCY_CONFLICT/);
});
test('B4 Postgres list is server-scoped and sends tenant data as parameters only',async()=>{
 const calls=[];const store=createJarvisB4PostgresStore({query:async(sql,args)=>{calls.push({sql,args});return{rows:[{seq:'1',event:base}]};}});
 const rows=await store.list({ownerId:'owner-1',companyId:'fenix',environment:'LAB',projectId:'project-1'});
 assert.equal(rows[0].sequence,1);assert.deepEqual(calls[0].args,['owner-1','fenix','LAB','project-1']);assert.match(calls[0].sql,/WHERE owner_id=\$1 AND company_id=\$2 AND environment=\$3 AND project_id=\$4/);
});

test('B4 dual runtime gate rejects an enabled memory flag while B3 authority stays locked',async()=>{
 const calls=[];
 const control=createJarvisB4GuardedControlStore({query:async(sql,args)=>{
  calls.push({sql,args});
  return {rows:[{memory_enabled:true,memory_kill_switch:false,authority_enabled:false,authority_kill_switch:true}]};
 }});
 const c=await control.get({companyId:'fenix',environment:'PROD'});
 assert.deepEqual(c,{enabled:false,killSwitch:true});
 assert.match(calls[0].sql,/INNER JOIN zeus_jarvis.b3_runtime_control/);
 assert.deepEqual(calls[0].args,['fenix','PROD']);
});
test('B4 dual runtime gate fails closed on missing control rows',async()=>{
 const control=createJarvisB4GuardedControlStore({query:async()=>({rows:[]})});
 assert.deepEqual(await control.get({companyId:'fenix',environment:'PROD'}),{enabled:false,killSwitch:true});
 await assert.rejects(control.get({companyId:'fenix',environment:'BAD'}),/ENVIRONMENT_INVALID/);
});
test('B4 dual runtime gate requires BOTH authority and memory flags to be enabled',async()=>{
 const control=createJarvisB4GuardedControlStore({query:async()=>({rows:[{
  memory_enabled:true,memory_kill_switch:false,authority_enabled:true,authority_kill_switch:false
 }]})});
 assert.deepEqual(await control.get({companyId:'fenix',environment:'LAB'}),{enabled:true,killSwitch:false});
});
test('B4 memory API cannot write while B3 authority is still locked even if B4 flag is true',async()=>{
 const control=createJarvisB4GuardedControlStore({query:async()=>({rows:[{
  memory_enabled:true,memory_kill_switch:false,authority_enabled:false,authority_kill_switch:true
 }]})});
 const app=createJarvisB4Memory({
  identityProvider:{verify:async()=>({
   ownerId:'verified-owner',sessionId:'verified-session',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']
  })},
  controlStore:control,store:new B4MemoryLabStore(),environment:'PROD'
 });
 await assert.rejects(app.append({
  token:'verified-test',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',
  idempotencyKey:'synthetic-1',kind:'FACT',subjectKey:'synthetic.topic',
  value:'synthetic test only',
  source:{kind:'OWNER_STATEMENT',id:'test',evidenceRefs:['EV:test']},confidence:1
 }),/B4_LOCKED/);
});
test('B4 SQL control failure denies access instead of falling back to an unlocked runtime',async()=>{
 const control=createJarvisB4GuardedControlStore({query:async()=>{throw new Error('DB_UNAVAILABLE')}});
 await assert.rejects(control.get({companyId:'fenix',environment:'PROD'}),/DB_UNAVAILABLE/);
});
