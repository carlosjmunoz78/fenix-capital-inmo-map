import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpBridge } from '../transport/mcp.mjs';
import { createCerebroGatewayBridge } from '../transport/cerebro-gateway.mjs';
const verified = {client_id:'chatgpt',actor_id:'operator',identity_ref:'iam:test-chatgpt'};
const toolNames = [{name:'cloudflare.d1.list',description:'read',inputSchema:{type:'object'}}];
const calls = [];
const mockAdapter={listTools:()=>toolNames,callTool:async(cmd,auth)=>{calls.push({cmd,auth});return {status:'COMPLETED',data:[]};}};
const request=(id,method,params={})=>({jsonrpc:'2.0',id,method,params});

test('MCP rejects anonymous and caller-supplied identity before tools/list',async()=>{
 const bridge=createMcpBridge({chatgptAdapter:mockAdapter,authenticate:async()=>null});
 for(const method of ['initialize','tools/list','tools/call']){
  const response=await bridge.dispatch(request('x',method,{name:'cloudflare.d1.list',arguments:{actor_id:'fake'}}),{actor_id:'fake'});
  assert.equal(response.error.code,-32001);
 }
 assert.equal(calls.length,0);
});
test('MCP initialize/list/execute expose declared tools to authenticated client only',async()=>{
 const bridge=createMcpBridge({chatgptAdapter:mockAdapter,authenticate:async()=>verified});
 const session={auth:'opaque'};
 const hello=await bridge.dispatch(request(1,'initialize',{protocolVersion:'2025-06-18'}),session);
 assert.equal(hello.result.protocolVersion,'2025-06-18');
 const list=await bridge.dispatch(request(2,'tools/list'),session);
 assert.deepEqual(list.result.tools,toolNames);
 const call=await bridge.dispatch(request(3,'tools/call',{name:'cloudflare.d1.list',arguments:{company_id:'fenix'}}),session);
 assert.equal(call.result.isError,false);
 assert.equal(calls.at(-1).auth,session);
 assert.equal(calls.at(-1).cmd.name,'cloudflare.d1.list');
});
test('MCP does not expose cloudflare token, denies unknown tool result',async()=>{
 const f={listTools:()=>toolNames,callTool:async()=>({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',executed:false})};
 const bridge=createMcpBridge({chatgptAdapter:f,authenticate:async()=>verified});
 const result=await bridge.dispatch(request(4,'tools/call',{name:'secret.other',arguments:{}}),{token:'opaque'});
 assert.equal(result.result.isError,true);
 assert.ok(!JSON.stringify(result).includes('opaque'));
});
test('CEREBRO Gateway transport rejects anonymous and forwards verified request',async()=>{
 const recieved=[];
 const bridge=createCerebroGatewayBridge({cerebroAdapter:{execute:async(c,a)=>{recieved.push([c,a]);return {status:'COMPLETED'};}},authenticatedGateway:async(ctx)=>ctx===true?{client_id:'cerebro',actor_id:'owner',identity_ref:'iam:owner'}:null});
 assert.equal((await bridge.dispatch({capability:'cloudflare.d1.list'},false)).reason,'POLICY_CONFLICT');
 const success=await bridge.dispatch({capability:'cloudflare.d1.list'},true);
 assert.equal(success.status,'COMPLETED');assert.equal(recieved.length,1);
});
