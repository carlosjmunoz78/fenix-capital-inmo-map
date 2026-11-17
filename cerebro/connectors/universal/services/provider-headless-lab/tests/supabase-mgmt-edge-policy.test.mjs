import test from 'node:test';
import assert from 'node:assert/strict';
import {SUPABASE_MGMT_LAB,assertServicePrincipal,assertEdgeLabOrder,planSupabaseEdgeCanary} from '../supabase-mgmt-edge-policy.mjs';
const NOW=1794419220000;
const H='a'.repeat(64), A='b'.repeat(64), R='c'.repeat(64);
const principal={trusted:true,source:'github_oidc',client_id:'cerebro',company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',capability:SUPABASE_MGMT_LAB.capability};
function order(operation='edge.read') {
  const exists=operation!=='edge.create',mutation=operation!=='edge.read';
  return {company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',
    project_ref:SUPABASE_MGMT_LAB.project_ref,resource_type:'edge_function',resource_slug:SUPABASE_MGMT_LAB.resource_slug,
    operation,request_id:'FACT001-SBMGT-20261111-TEST01',idempotency_key:'FACT001-SBMGT-20261111-TEST01',
    max_cost_eur:0,expires_at:NOW+60000,expected_state:exists?'present':'absent',expected_sha256:exists?H:null,
    artifact_sha256:operation==='edge.create'||operation==='edge.update'?A:null,rollback_sha256:mutation?R:null};
}
function baseline(o=order()) {return {verified:true,project_ref:o.project_ref,resource_slug:o.resource_slug,
  exists:o.expected_state==='present',sha256:o.expected_sha256,checked_at:NOW-3000};}
function backup(o){return {verified:true,rollback_test_passed:true,project_ref:o.project_ref,
 resource_slug:o.resource_slug,sha256:R,before_sha256:o.expected_sha256,checked_at:NOW-3000,
 restore_kind:o.operation==='edge.create'?'delete_new_canary':'restore_exact_canary'};}
const reject=(fn,code)=>assert.throws(fn,e=>e.message===code);
test('read plan is no-write and contains no URL or secret',()=>{
 const o=order();const result=planSupabaseEdgeCanary({order:o,principal,baseline:baseline(o),now:NOW});
 assert.equal(result.status,'LAB_READ_PLAN_ONLY');assert.equal(result.executed,false);
 assert.equal(JSON.stringify(result).includes('http'),false);assert.equal(result.max_cost_eur,0);
});
test('all four mutation types have closed gates, never execute',()=>{
 for(const operation of ['edge.create','edge.update','edge.delete']) {
  const o=order(operation);reject(()=>planSupabaseEdgeCanary({order:o,principal,baseline:baseline(o),now:NOW}), 'SB_MGMT_MUTATIONS_OFF');
  const p=planSupabaseEdgeCanary({order:o,principal,baseline:baseline(o),backup:backup(o),now:NOW,enableMutations:true});
  assert.equal(p.status,'LAB_MUTATION_PLAN_ONLY');assert.equal(p.executed,false);
 }
});
test('reject unknown claims, ChatGPT user context and spoofed identity',()=>{
 for(const bad of [{...principal,trusted:false},{...principal,client_id:'chatgpt'},
  {...principal,environment:'PROD'},{...principal,source:'user_supplied'},
  {...principal,capability:'*'}]) reject(()=>assertServicePrincipal(bad),'SB_MGMT_SERVICE_IDENTITY_DENIED');
});
test('deny other projects and company/tenant environments',()=>{
 for(const p of [{project_ref:'hnqlnvakzaywtafeiybt'},{company_id:'captacasa'},
  {environment:'PROD'},{resource_slug:'cerebro-console-gateway-v0'}])
   reject(()=>assertEdgeLabOrder({...order(),...p},{now:NOW}),
   p.company_id||p.environment?'SB_MGMT_SCOPE_DENIED':'SB_MGMT_RESOURCE_DENIED');
});
test('reject injected data, arbitrary URLs and client controlled auth',()=>{
 for(const injection of [{url:'https://evil.test'},{authorization:'Bearer secret'},{token:'secret'},
   {sql:'select * from customers'},{payload:{source:'unreviewed'}}])
   reject(()=>assertEdgeLabOrder({...order(),...injection},{now:NOW}),'SB_MGMT_ORDER_FIELDS_DENIED');
});
test('only fixed safe operations, no generic function deletion',()=>{
 reject(()=>assertEdgeLabOrder({...order(),operation:'project.delete'},{now:NOW}),'SB_MGMT_OPERATION_DENIED');
});
test('money, expiry and replay key must match exact contract',()=>{
 for(const [field,value,code] of [['max_cost_eur',1,'SB_MGMT_MONEY_LIMIT'],
  ['expires_at',NOW-1,'SB_MGMT_TIME_DENIED'],['expires_at',NOW+2000000,'SB_MGMT_TIME_DENIED'],
  ['idempotency_key','NEW-KEY','SB_MGMT_IDEMPOTENCY_DENIED']])
    reject(()=>assertEdgeLabOrder({...order(),[field]:value},{now:NOW}),code);
});
test('create fails closed if resource exists',()=>{
 reject(()=>assertEdgeLabOrder({...order('edge.create'),expected_state:'present',expected_sha256:H},{now:NOW}),
   'SB_MGMT_CREATE_MUST_BE_ABSENT');
});
test('delete and update require existing proven snapshot',()=>{
 reject(()=>assertEdgeLabOrder({...order('edge.delete'),expected_state:'absent',expected_sha256:null},{now:NOW}),
  'SB_MGMT_EXISTING_REQUIRED');
 for(const operation of ['edge.delete','edge.update']){
  const o=order(operation);reject(()=>assertEdgeLabOrder({...o,expected_sha256:'bad'},{now:NOW}),
   'SB_MGMT_EXPECTED_SHA_DENIED');
 }
});
test('mutation requires verified physical rollback artifact and check result',()=>{
 const o=order('edge.update');for(const bad of [null,{...backup(o),verified:false},
 {...backup(o),rollback_test_passed:false},{...backup(o),sha256:H},
 {...backup(o),restore_kind:'delete_new_canary'}]){
  const code=bad?.restore_kind==='delete_new_canary'?'SB_MGMT_WRONG_ROLLBACK_STRATEGY':'SB_MGMT_BACKUP_ROLLBACK_REQUIRED';
  reject(()=>planSupabaseEdgeCanary({order:o,principal,baseline:baseline(o),backup:bad,now:NOW,enableMutations:true}),code);
 }
});
test('changed concurrent resource and stale metadata are blocked',()=>{
 const o=order();reject(()=>planSupabaseEdgeCanary({order:o,principal,baseline:{...baseline(o),sha256:A},now:NOW}),
  'SB_MGMT_BASELINE_HASH_CHANGED');
 reject(()=>planSupabaseEdgeCanary({order:o,principal,baseline:{...baseline(o),checked_at:NOW-70000},now:NOW}),
  'SB_MGMT_PREFLIGHT_UNVERIFIED');
});
test('rollback type must match create/delete semantics',()=>{
 const o=order('edge.create');reject(()=>planSupabaseEdgeCanary({order:o,principal,baseline:baseline(o),backup:{...backup(o),restore_kind:'restore_exact_canary'},now:NOW,enableMutations:true}),
   'SB_MGMT_WRONG_ROLLBACK_STRATEGY');
});
test('LAB and exact resource, no financial or provider side-effects',()=>{
 assert.equal(SUPABASE_MGMT_LAB.mutation_enabled,false);
 assert.equal(SUPABASE_MGMT_LAB.max_cost_eur,0);
 assert.deepEqual(SUPABASE_MGMT_LAB.operations,['edge.read','edge.create','edge.update','edge.delete']);
});