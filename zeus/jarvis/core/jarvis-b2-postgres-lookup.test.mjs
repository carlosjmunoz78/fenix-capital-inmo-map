import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB2PostgresLookup} from './jarvis-b2-postgres-lookup.mjs';
import {createJarvisB2HmacRegistry} from './jarvis-b2-hmac-registry.mjs';
import {createHmac} from 'node:crypto';
const secret=Buffer.alloc(32,7);
const hash=createHmac('sha256',secret).update('jarvis-b2-v0\0').update('fenix-app').update('\0').update('auth-user-1').digest('hex');
const good={channel:'fenix-app',subject_hmac:hash,owner_id:'owner1',role:'OWNER_ROOT',active:true,authorized_companies:['fenix']};
const querySpy=rows=>{const queries=[];return{queries,client:{query:async query=>{queries.push(query);return{rows}}}}};
test('parameterized lookup never inserts raw auth subject into SQL',async()=>{
 const spy=querySpy([good]);const lookup=createJarvisB2PostgresLookup({client:spy.client});
 const result=await lookup({channel:'fenix-app',subjectHmac:hash});
 assert.equal(result.owner_id,'owner1');
 assert.match(spy.queries[0].text,/\$1/);assert.match(spy.queries[0].text,/\$2/);
 assert.deepEqual(spy.queries[0].values,['fenix-app',hash]);
 assert.equal(JSON.stringify(spy.queries).includes('auth-user-1'),false);
 assert.equal(spy.queries[0].text.includes(hash),false);
});
test('denies wrong environment and missing PG adapter',()=>{
 assert.throws(()=>createJarvisB2PostgresLookup({client:{query:async()=>{}},environment:'PROD'}),/LAB_ONLY/);
 assert.throws(()=>createJarvisB2PostgresLookup(),/POSTGRES_CLIENT_REQUIRED/);
});
test('query rejects forged channel and nonhex HMAC before touching database',async()=>{
 const spy=querySpy([good]);const lookup=createJarvisB2PostgresLookup({client:spy.client});
 await assert.rejects(lookup({channel:'fenix-app; DROP TABLE x',subjectHmac:hash}),/B2_QUERY_DENIED/);
 await assert.rejects(lookup({channel:'fenix-app',subjectHmac:'auth-user-1'}),/B2_QUERY_DENIED/);
 assert.equal(spy.queries.length,0);
});
test('duplicate or missing DB rows fail closed',async()=>{
 for(const rows of [[],[good,good]]){
  const {client}=querySpy(rows);await assert.rejects(createJarvisB2PostgresLookup({client})({channel:'fenix-app',subjectHmac:hash}),/AMBIGUOUS_OR_ABSENT/);
 }
});
test('database failure hides details and denies identity',async()=>{
 const lookup=createJarvisB2PostgresLookup({client:{query:async()=>{throw Error('postgres credential secret value')}}});
 await assert.rejects(lookup({channel:'fenix-app',subjectHmac:hash}),e=>e.message==='B2_LOOKUP_UNAVAILABLE');
});
test('B2 registry + PostgreSQL adapter resolves only active OWNER_ROOT',async()=>{
 const {client}=querySpy([good]);
 const registry=createJarvisB2HmacRegistry({secret,lookup:createJarvisB2PostgresLookup({client})});
 const principal=await registry.resolve({channel:'fenix-app',subject:'auth-user-1'});
 assert.deepEqual(principal.authorizedCompanies,['fenix']);
 assert.equal(principal.ownerId,'owner1');
});
test('B2 registry denies revoked owner from durable lookup',async()=>{
 const {client}=querySpy([{...good,active:false}]);
 const registry=createJarvisB2HmacRegistry({secret,lookup:createJarvisB2PostgresLookup({client})});
 await assert.rejects(registry.resolve({channel:'fenix-app',subject:'auth-user-1'}),/OWNER_ROOT_REQUIRED/);
});
test('B2 registry denies misleading lookup row for another subject',async()=>{
 const {client}=querySpy([{...good,subject_hmac:'f'.repeat(64)}]);
 const registry=createJarvisB2HmacRegistry({secret,lookup:createJarvisB2PostgresLookup({client})});
 await assert.rejects(registry.resolve({channel:'fenix-app',subject:'auth-user-1'}),/OWNER_ROOT_REQUIRED/);
});
