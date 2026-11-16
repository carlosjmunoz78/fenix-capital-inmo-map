import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {bindNiaDiscoveryToActionGatewayV0,NIA_CAPABILITY,NIA_SKILL_ID} from '../gateway/nia-action-gateway-binding-v0.mjs';
const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'};
const enabled={skills:[{id:NIA_SKILL_ID,name:'NIA · Uso responsable de Notion Business en CEREBRO'}]};
test('existing ACTGW discovers NIA with idempotency, no AI invocation',async()=>{
  let reads=0;const gw=new ActionGatewayV1();
  bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{getEnabledSkills:async()=>{reads++;return enabled;}}});
  const req={context,authorized:true,capability:NIA_CAPABILITY,payload:{topic:'knowledge'},
    idempotency_key:'nia-read-001',risk:'LOW',estimated_additional_cost_eur:0};
  const first=await gw.execute(req),replayed=await gw.execute(req);
  assert.equal(first.status,'ACTION_EXECUTED');
  assert.equal(first.result.status,'NIA_DISCOVERED');
  assert.equal(first.result.ai_session_started,false);
  assert.equal(first.result.executed,false);
  assert.deepEqual(first,replayed);
  assert.equal(reads,1);
  assert.equal(gw.auditLog().at(-1).type,'ACTION_REPLAYED');
});
test('ACTGW blocks paid, prod-write, trading, unauthorised requests before NIA provider',async()=>{
  let reads=0;const gw=new ActionGatewayV1();
  bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{getEnabledSkills:async()=>{reads++;return enabled;}}});
  const base={context,authorized:true,capability:NIA_CAPABILITY,payload:{topic:'research'},risk:'LOW'};
  for(const [extra,reason,key] of [
    [{estimated_additional_cost_eur:0.01},'MONEY_LIMIT','money'],
    [{requires_prod_write:true},'HIGH_RISK','prod'],
    [{trading_access:true},'POLICY_CONFLICT','trading'],
    [{authorized:false},'POLICY_CONFLICT','auth']
  ]){
    const r=await gw.execute({...base,...extra,idempotency_key:'nia-'+key});
    assert.equal(r.status,'HUMAN_REQUIRED');
    assert.equal(r.reason,reason);
  }
  assert.equal(reads,0);
});
test('NIA returns NOOP without provider call when another engine owns task',async()=>{
  const gw=new ActionGatewayV1();
  bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{getEnabledSkills:async()=>{throw Error('must not call');}}});
  const r=await gw.execute({context,authorized:true,capability:NIA_CAPABILITY,
    payload:{topic:'research',already_handled:true},idempotency_key:'nia-noop'});
  assert.equal(r.result.status,'NOOP');
});
test('NIA prevents tenant spoofing and malicious payload before provider',async()=>{
  const gw=new ActionGatewayV1();
  bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider:{getEnabledSkills:async()=>{throw Error('must not call');}}});
  const tenant=await gw.execute({context,authorized:true,capability:NIA_CAPABILITY,
    payload:{topic:'knowledge',authorization:'secret'},idempotency_key:'nia-payload'});
  assert.equal(tenant.result.reason,'PAYLOAD_FIELDS_FORBIDDEN');
});
