import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotionConnectedParentGate,CEREBRO_INITIAL_NOTION_ROOT} from '../notion-connected-parent-gate.mjs';
const order=patch=>({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 client_id:'cerebro',operation:'notion.page.create.child',source:'owner_order',
 request_id:'FACT001-CONNECTED-CREATE-20261110-01',parent_page_id:CEREBRO_INITIAL_NOTION_ROOT,
 title:'CEREBRO LAB · documento nuevo',...patch});
function gate(allowed=true,accessible=true){
 const registry={durable:true,get:async id=>allowed?{page_id:id,company_id:'fenix-capital',environment:'LAB',
  owner_approved:true,verified_with_independent_service:true,connection_type:'notion_internal_cerebro'}:null};
 const verifyServiceAccess=async id=>({accessible,id,provider:'notion',using_independent_credential:true,archived:false});
 return createNotionConnectedParentGate({registry,verifyServiceAccess});
}
test('future child gets linked to approved independently accessible parent, not a new root',async()=>{
 const response=await gate().authorizeCreate(order());
 assert.equal(response.authorized,true);
 assert.deepEqual(response.parent,{type:'page_id',page_id:CEREBRO_INITIAL_NOTION_ROOT});
 assert.equal(response.requires_extra_page_sharing,false);
});
test('unshared or unverified root denies child, regardless of user-supplied title',async()=>{
 assert.equal((await gate(false).authorizeCreate(order())).authorized,false);
 assert.equal((await gate(true,false).authorizeCreate(order())).authorized,false);
});
test('PROD, cross company, root creation and unknown payload fields denied',async()=>{
 const g=gate();
 for(const bad of [{environment:'PROD'},{company_id:'other'},{client_id:'chatgpt'},
  {operation:'notion.page.create.root'},{parent_page_id:null},{source:'cron'},
  {secret:'do-not-accept'}]){
  assert.equal((await g.authorizeCreate(order(bad))).authorized,false);
 }
});
test('verification must explicitly come from independent CEREBRO token not OAuth ChatGPT',async()=>{
 const registry={durable:true,get:async id=>({page_id:id,company_id:'fenix-capital',
  environment:'LAB',owner_approved:true,verified_with_independent_service:true,connection_type:'notion_internal_cerebro'})};
 const verifyServiceAccess=async id=>({accessible:true,id,provider:'notion',using_independent_credential:false});
 assert.equal((await createNotionConnectedParentGate({registry,verifyServiceAccess}).authorizeCreate(order())).authorized,false);
});
test('unreachable Notion parent fails closed',async()=>{
 const registry={durable:true,get:async id=>({page_id:id,company_id:'fenix-capital',
  environment:'LAB',owner_approved:true,verified_with_independent_service:true,connection_type:'notion_internal_cerebro'})};
 const g=createNotionConnectedParentGate({registry,verifyServiceAccess:async()=>{throw Error('503');}});
 assert.equal((await g.authorizeCreate(order())).reason,'INDEPENDENT_SERVICE_ACCESS_UNVERIFIED');
});
test('no in-memory fake registry or missing verified Notion reader',()=>{
 assert.throws(()=>createNotionConnectedParentGate({registry:{durable:false}}),/DEPENDENCIES_REQUIRED/);
});
