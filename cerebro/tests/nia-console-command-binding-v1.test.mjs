import test from 'node:test';
import assert from 'node:assert/strict';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {bindConsoleNiaToFactQueueLabV1} from '../console/nia-console-command-binding-v1.mjs';
const input=(gw,sid,payload)=>gw.execute({session_id:sid,command:'notion.nia.discover.read',payload});
function rig(){
 const gw=new CerebroGatewayV0({environment:'PREPROD'});
 const sid='console-test-session';gw.createSession({session_id:sid,company_id:'fenix'});
 const emitted=[],audit=[];
 return {gw,sid,emitted,audit,bind:(authorize)=>bindConsoleNiaToFactQueueLabV1({
  consoleGateway:gw,queueProducer:{send:async x=>emitted.push(x)},authorize,auditSink:async x=>audit.push(x)
 })};
}
test('one trusted registered Console command queues only the existing FACT envelope',async()=>{
 const r=rig();r.bind(async()=>true);
 const result=await input(r.gw,r.sid,{topic:'documentation'});
 assert.equal(result.status,'PRIVATE_QUEUE_ACCEPTED');assert.equal(result.executed,false);
 assert.deepEqual(r.emitted,[{type:'NIA_FACT_PRIVATE_DISCOVERY_V1',company_id:'fenix',engine_id:'ACTGW-001',topic:'documentation'}]);
 assert.equal(r.audit[0].type,'CONSOLE_NIA_QUEUED');
});
test('client-forged permission and tenant are rejected before queue',async()=>{
 const r=rig();r.bind(async()=>true);
 const f=await input(r.gw,r.sid,{topic:'documentation',authorized:true});
 assert.equal(f.status,'HUMAN_REQUIRED');assert.equal(f.reason,'POLICY_CONFLICT');
 assert.equal(r.emitted.length,0);
 const x=rig();x.bind(async()=>false);
 const deny=await input(x.gw,x.sid,{topic:'documentation'});
 assert.equal(deny.status,'HUMAN_REQUIRED');assert.equal(x.emitted.length,0);
});
test('requires explicit trusted host authorizer and producer',()=>{
 const gw=new CerebroGatewayV0();
 assert.throws(()=>bindConsoleNiaToFactQueueLabV1({consoleGateway:gw,queueProducer:{send:async()=>{}}}),/AUTHORIZE/);
});
