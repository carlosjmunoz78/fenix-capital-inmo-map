import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {bindNiaDiscoveryToActionGatewayV0,NIA_CAPABILITY,NIA_SKILL_ID} from '../gateway/nia-action-gateway-binding-v0.mjs';
const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'};
const title='NIA · Uso responsable de Notion Business en CEREBRO';
const enabled={skills:[{id:NIA_SKILL_ID,name:title}]};
const page={id:NIA_SKILL_ID,archived:false,properties:{title:{type:'title',title:[{plain_text:title}]}}};
const request=(key,topic='knowledge')=>({context,authorized:true,capability:NIA_CAPABILITY,payload:{topic},idempotency_key:key,risk:'LOW',estimated_additional_cost_eur:0});
test('legacy MCP skills client uses ACTGW idempotency without AI',async()=>{
 let reads=0;const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{getEnabledSkills:async()=>{reads++;return enabled;}}});
 const first=await gw.execute(request('nia-mcp-read'));
 const replay=await gw.execute(request('nia-mcp-read'));
 assert.equal(first.status,'ACTION_EXECUTED');assert.equal(first.result.status,'NIA_DISCOVERED');
 assert.equal(first.result.provider,'NOTION_MCP_READONLY');
 assert.equal(first.result.ai_session_started,false);assert.equal(first.result.skill_content_loaded,false);
 assert.deepEqual(first,replay);assert.equal(reads,1);
 assert.equal(gw.auditLog().at(-1).type,'ACTION_REPLAYED');
});
test('Notion service integration can prove page sharing with a standard API page read',async()=>{
 let reads=0;const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async(id)=>{reads++;assert.equal(id,NIA_SKILL_ID);return page;}}});
 const result=await gw.execute(request('nia-page-read','documentation'));
 assert.equal(result.result.status,'NIA_DISCOVERED');
 assert.equal(result.result.provider,'NOTION_PAGE_READONLY');
 assert.equal(result.result.skill_content_loaded,false);
 assert.equal(reads,1);
});
test('page metadata mismatch or trashed/archived page must not be used',async()=>{
 for(const invalid of [
 {...page,archived:true},
 {...page,in_trash:true},
 {...page,id:'00000000-0000-0000-0000-000000000000'},
 {...page,properties:{title:{type:'title',title:[{plain_text:'another skill'}]}}}
 ]){
 const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async()=>invalid}});
 const res=await gw.execute(request('nia-invalid-'+String(Math.random())));
 assert.equal(res.result.status,'NIA_UNAVAILABLE');assert.equal(res.result.reason,'SKILL_PAGE_NOT_VERIFIED');
 }
});
test('Notion provider access denied fails closed without exposing error',async()=>{
 const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async()=>{throw Error('mock access denied token in error');}}});
 const res=await gw.execute(request('nia-denied'));
 assert.equal(res.result.status,'NIA_UNAVAILABLE');assert.equal(res.result.reason,'PROVIDER_READ_FAILED');
 assert.equal(JSON.stringify(res).includes('token'),false);
});
test('ACTGW blocks paid, prod-write, trading, unauthorised before reading Notion',async()=>{
 let reads=0;const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async()=>{reads++;return page;}}});
 const base=request('default','research');
 for(const [extra,reason,key] of [
 [{estimated_additional_cost_eur:0.01},'MONEY_LIMIT','money'],
 [{requires_prod_write:true},'HIGH_RISK','prod'],
 [{trading_access:true},'POLICY_CONFLICT','trading'],
 [{authorized:false},'POLICY_CONFLICT','auth']
 ]){const r=await gw.execute({...base,...extra,idempotency_key:'nia-'+key});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,reason);}
 assert.equal(reads,0);
});
test('NIA returns NOOP without any Notion access when another engine owns task',async()=>{
 const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async()=>{throw Error('must not read');}}});
 const r=await gw.execute({...request('nia-noop','research'),payload:{topic:'research',already_handled:true}});
 assert.equal(r.result.status,'NOOP');
});
test('NIA prevents spoofed payload fields before Notion access',async()=>{
 const gw=new ActionGatewayV1();
 bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{readSkillPage:async()=>{throw Error('must not read');}}});
 const r=await gw.execute({...request('nia-invalid-payload'),payload:{topic:'knowledge',authorization:'secret'}});
 assert.equal(r.result.status,'NIA_DENIED');
 assert.equal(r.result.reason,'PAYLOAD_FIELDS_FORBIDDEN');
});
test('no provider methods fails before registration',()=>{
 const gw=new ActionGatewayV1();
 assert.throws(()=>bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{}}),/requires readSkillPage/);
});
