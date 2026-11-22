import test from 'node:test';
import assert from 'node:assert/strict';
import {planNotionConnectedLabChild} from '../notion-connected-child-plan.mjs';
import {CEREBRO_INITIAL_NOTION_ROOT} from '../notion-connected-parent-gate.mjs';
const token='CEREBRO_TEST_NOTION_SERVICE_TOKEN_0123456789';
const order=(overrides={})=>({
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 client_id:'cerebro',source:'owner_order',operation:'notion.page.create.child',
 request_id:'FACT001-PARENT-PLAN-20261110-01',title:'FACT001 CEREBRO Notion LAB Nueva pagina',
 parent_page_id:CEREBRO_INITIAL_NOTION_ROOT,...overrides
});
function http(options={}){
 let calls=0;
 return {call:async (url,request)=>{
  calls++;assert.equal(url,'https://api.notion.com/v1/pages/'+CEREBRO_INITIAL_NOTION_ROOT);
  assert.equal(request.method,'GET');assert.equal(request.headers.Authorization,'Bearer '+token);
  return {status:options.status??200,json:async()=>({object:'page',id:CEREBRO_INITIAL_NOTION_ROOT,
   in_trash:options.in_trash??false})};
 },count:()=>calls};
}
test('approved connected Wiki root verified with independent CEREBRO token, no creation',async()=>{
 const h=http();
 const r=await planNotionConnectedLabChild({token,order:order(),http:h.call});
 assert.equal(r.authorized,true);
 assert.equal(r.connected_parent_id,CEREBRO_INITIAL_NOTION_ROOT);
 assert.equal(r.independent_service_rechecked,true);assert.equal(h.count(),1);
 assert.equal(r.creation_executed,false);assert.equal(r.write_operations,0);
 assert.equal(r.inherited_connection_expected,true);
 assert.ok(!JSON.stringify(r).includes(token));
});
test('no blanket write approval: the other 57 readable roots are not approved child parents',async()=>{
 const h=http();
 const r=await planNotionConnectedLabChild({token,order:order({parent_page_id:'37d81b1a-756d-8002-b611-d4ce3a60965a'}),http:h.call});
 assert.equal(r.authorized,false);assert.equal(h.count(),0);
});
test('PROD, foreign company, untrusted fields, root creation all rejected before provider call',async()=>{
 const h=http();
 for(const bad of [{environment:'PROD'},{company_id:'foreign'},{client_id:'chatgpt'},
  {operation:'notion.page.create.root'},{x:'unapproved'},{source:'cron'}]){
  const r=await planNotionConnectedLabChild({token,order:order(bad),http:h.call});
  assert.equal(r.authorized,false);
 }
 assert.equal(h.count(),0);
});
test('expired connection, archived parent, malformed Notion response fail closed',async()=>{
 for(const props of [{status:404},{status:403},{in_trash:true}]){
  const h=http(props);const r=await planNotionConnectedLabChild({token,order:order(),http:h.call});
  assert.equal(r.authorized,false);assert.equal(r.write_operations,0);
 }
 const r=await planNotionConnectedLabChild({token,order:order(),
  http:async()=>({status:200,json:async()=>({object:'page',id:'wrong'})})});
 assert.equal(r.authorized,false);
});
test('bad token cannot be used even for LAB plan',async()=>{
 await assert.rejects(()=>planNotionConnectedLabChild({token:'bad',order:order()}),/TOKEN_DENIED/);
});
