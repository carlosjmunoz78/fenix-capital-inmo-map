import test from 'node:test';import assert from 'node:assert/strict';
import {createJarvisB4PostgresStore} from './jarvis-b4-postgres-store.mjs';
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