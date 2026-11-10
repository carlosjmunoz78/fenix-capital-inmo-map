import test from 'node:test';
import assert from 'node:assert/strict';
import {UniversalConnectorCore,inMemoryIdempotency,createAuditSink} from '../src/core.mjs';
import {makeChatGPTAdapter,makeCerebroAdapter} from '../src/clients.mjs';
import {createSupabaseAdminAdapter} from '../src/supabase-admin.mjs';
import {SUPABASE_PROJECT_REF,DISPOSABLE_FUNCTION,DISPOSABLE_FUNCTION_ID,DISPOSABLE_FUNCTION_SHA} from '../src/supabase-admin-catalog.mjs';
import {CAPABILITIES} from '../src/catalog.mjs';
const CTX={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const ID={identity_ref:'iam:fenix-owner-lab',actor_id:'owner'};
const deletedTarget={slug:DISPOSABLE_FUNCTION,project_ref:SUPABASE_PROJECT_REF,expected_function_id:DISPOSABLE_FUNCTION_ID,confirm_disposable:true};
function fixture({version=4,sha=DISPOSABLE_FUNCTION_SHA,scope=DISPOSABLE_FUNCTION,alreadyDeleted=false,canMutate=true,durable=true}={}){
 let deleted=alreadyDeleted;const calls=[];
 const request=async ({method,path})=>{
  calls.push({method,path});
  if(path==='/v1/projects/'+SUPABASE_PROJECT_REF+'/functions'&&method==='GET')return [{slug:DISPOSABLE_FUNCTION,version:4,status:'ACTIVE'}];
  if(path==='/v1/projects/'+SUPABASE_PROJECT_REF+'/functions/'+DISPOSABLE_FUNCTION){
   if(method==='GET')return deleted?{notFound:true}:{id:DISPOSABLE_FUNCTION_ID,slug:scope,version,verify_jwt:true,status:'ACTIVE',ezbr_sha256:sha};
   if(method==='DELETE'){if(!canMutate)throw Object.assign(Error('denied'),{code:'FORBIDDEN'});deleted=true;return {deleted:true};}
  }
  throw Error('WRONG_ENDPOINT');
 };
 const audit=createAuditSink();const idem=inMemoryIdempotency();idem.durable=durable;
 const core=new UniversalConnectorCore({supabaseAdmin:createSupabaseAdminAdapter({request}),authorize:async({identity,scope,action})=>identity.identity_ref===ID.identity_ref&&scope.environment==='LAB'&&action.id.startsWith('supabase-admin.'),idempotency:idem,audit:audit.record,costGuard:async()=>true});
 return {calls,deleted:()=>deleted,audit:()=>audit.list(),chatgpt:makeChatGPTAdapter({core,authenticate:async()=>ID}),cerebro:makeCerebroAdapter({core,authenticate:async()=>ID})};
}
const task=(capability,input={},idempotency_key)=>({context:CTX,capability,input,idempotency_key});
test('admin provider cannot start without trusted injected transport',()=>assert.throws(()=>createSupabaseAdminAdapter(),/TRUSTED_SUPABASE_MANAGEMENT_TRANSPORT_REQUIRED/));
test('list/get works for both independent identities through same typed core',async()=>{
 const f=fixture();
 const a=await f.chatgpt.callTool({name:'supabase-admin.edge-functions.list',arguments:{...CTX,input:{}}},{});
 const b=await f.cerebro.execute(task('supabase-admin.edge-functions.get',{slug:DISPOSABLE_FUNCTION}),{});
 assert.equal(a.status,'COMPLETED');assert.equal(b.status,'COMPLETED');assert.equal(b.data.exists,true);
 assert.deepEqual(f.audit().map(e=>e.client_id),['chatgpt','cerebro']);
});
test('guarded test tombstone delete verifies GET 404 and is idempotent',async()=>{
 const f=fixture();
 const a=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'sb-delete-lab-1'),{});
 assert.equal(a.status,'COMPLETED');assert.equal(a.deleted,true);assert.equal(a.other_functions_deleted,0);assert.equal(f.deleted(),true);
 const b=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'sb-delete-lab-1'),{});
 assert.deepEqual(a,b);assert.equal(f.calls.filter(x=>x.method==='DELETE').length,1);
});
test('already absent target does not try DELETE',async()=>{
 const f=fixture({alreadyDeleted:true});
 const a=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'sb-delete-lab-2'),{});
 assert.equal(a.status,'COMPLETED');assert.equal(a.verified_absent,true);assert.equal(f.calls.filter(x=>x.method==='DELETE').length,0);
});
test('different function name, project or ID never calls management DELETE',async()=>{
 const f=fixture();
 for(const input of [
  {...deletedTarget,slug:'cerebro-console-gateway-v0'},
  {...deletedTarget,project_ref:'hnqlnvakzaywtafeiybt'},
  {...deletedTarget,expected_function_id:'f0000000'},
  {...deletedTarget,confirm_disposable:false},
  {...deletedTarget,api_token:'forbidden'}
 ]){
  const o=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',input,'bad-'+JSON.stringify(input)),{});
  assert.equal(o.status,'HUMAN_REQUIRED');
 }
 assert.equal(f.calls.filter(x=>x.method==='DELETE').length,0);
});
test('wrong function signature, version or identity refuses deletion',async()=>{
 for(const opts of [{version:5},{sha:'a'.repeat(64)},{scope:'production-gateway'}]){
  const f=fixture(opts);const a=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'bad-metadata'),{});
  assert.equal(a.status,'HUMAN_REQUIRED');assert.equal(f.calls.filter(x=>x.method==='DELETE').length,0);
 }
});
test('PROD scope and destructive unregistered actions blocked',async()=>{
 const f=fixture();const wrong=await f.cerebro.execute({...task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'x'),context:{...CTX,environment:'PROD'}},{});
 assert.equal(wrong.reason,'HIGH_RISK');
 for(const cap of ['supabase-admin.edge-functions.delete-arbitrary','supabase-admin.projects.delete']){
  const a=await f.cerebro.execute(task(cap,{ref:SUPABASE_PROJECT_REF},'z'),{});
  assert.equal(a.status,'HUMAN_REQUIRED');
 }
 assert.equal(f.calls.length,0);
});
test('no durable idempotency means no management DELETE',async()=>{
 const f=fixture({durable:false});const a=await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'k'),{});
 assert.equal(a.reason,'POLICY_CONFLICT');assert.equal(f.calls.length,0);
});
test('audit does not include project token or request bodies',async()=>{
 const f=fixture();
 await f.cerebro.execute(task('supabase-admin.edge-functions.delete-test-tombstone',deletedTarget,'k2'),{});
 const s=JSON.stringify(f.audit());
 assert.ok(!s.includes('confirm_disposable'));assert.ok(!s.includes('Bearer'));assert.ok(!s.includes('api_token'));
});
test('actual Management API operation is explicitly included and gated',()=>{
 assert.ok(CAPABILITIES.some(c=>c.id==='supabase-admin.edge-functions.delete-test-tombstone'&&c.status==='IMPLEMENTED_LAB'&&c.method==='DELETE'));
 assert.ok(CAPABILITIES.some(c=>c.id==='supabase-admin.projects.delete'&&c.status==='PLANNED_PROD_GATED'));
});
