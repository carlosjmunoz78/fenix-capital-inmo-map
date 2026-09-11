import test from 'node:test';import assert from 'node:assert/strict';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {buildChatV0} from '../console/chat-v0.mjs';
import {resolveContextV0} from '../console/context-v0.mjs';
import {planCommandV0} from '../console/command-v0.mjs';
import {planActionGatewayV0} from '../gateway/action-gateway-v0.mjs';

test('Console PREPROD routes chat and guarded action through canonical gateway',async()=>{
  const g=new CerebroGatewayV0();
  g.createSession({session_id:'s1',company_id:'fenix',context:{engine_id:'CHAT-001'}});
  g.setChatAdapter(({context,message})=>buildChatV0({context,message}));
  const chat=await g.chat({session_id:'s1',message:'estado'});
  assert.equal(chat.status,'PLAN_READY');
  assert.equal(chat.gateway_adapter_contract,true);

  g.selectContext({session_id:'s1',company_id:'fenix',engine_id:'CTX-001'});
  const ctx=resolveContextV0({context:g.inspectSession('s1').context,authoritative_company_id:'fenix',authorized:true,scope:'company'});
  assert.equal(ctx.status,'CONTEXT_READY');

  g.selectContext({session_id:'s1',company_id:'fenix',engine_id:'CMD-001'});
  const cmd=planCommandV0({context:g.inspectSession('s1').context,authorized:true,command:'plan_action',idempotency_key:'cmd-1',risk:'LOW'});
  assert.equal(cmd.status,'COMMAND_PLANNED');

  g.selectContext({session_id:'s1',company_id:'fenix',engine_id:'ACTGW-001'});
  g.registerCommand('plan_action',({context,payload})=>planActionGatewayV0({context,authorized:true,signature_required:false,requires_prod_write:false,autonomous_prod:false,trading_access:false,...payload}));
  const action=await g.execute({session_id:'s1',command:'plan_action',payload:{action:'query_status',target:'engine:FACT-001',idempotency_key:'act-1',risk:'LOW',estimated_additional_cost_eur:0}});
  assert.equal(action.status,'ACTION_PLANNED');
  assert.equal(action.gateway_compatible,true);
  assert.equal(action.prod_writes,false);
  assert.equal(g.auditLog().some(x=>x.type==='COMMAND_EXECUTED'),true);
});
