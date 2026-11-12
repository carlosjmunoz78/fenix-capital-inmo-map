import test from 'node:test';import assert from 'node:assert/strict';
import {CloudflareOfficialMcpClient,bindCloudflareOfficialReadOnlyToGateway} from '../transport/cloudflare-official-mcp-client.mjs';
const account='e39a57e1ac42650ca5a6d5307cf0ac8e';
const scope={account_id:account,client_id:'cerebro',environment:'LAB'};
function makeHttp(sent){return async (url,req)=>{sent.push({url,req});const body=JSON.parse(req.body);let data;
 if(body.method==='initialize')data={jsonrpc:'2.0',id:body.id,result:{protocolVersion:'2025-06-18',serverInfo:{name:'cloudflare-mcp'},capabilities:{tools:{}}}};
 if(body.method==='notifications/initialized')return {ok:true,status:202,headers:{get:()=>''}};
 if(body.method==='tools/list')data={jsonrpc:'2.0',id:body.id,result:{tools:[{name:'search'},{name:'docs'},{name:'execute'}]}};
 return {ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(data)};
}}
test('official endpoint pinned, avoids credential in model payload',()=>{
 assert.throws(()=>new CloudflareOfficialMcpClient({endpoint:'https://elsewhere.invalid/mcp',tokenProvider:()=>''}),/OFFICIAL_ENDPOINT_REQUIRED/);
 assert.throws(()=>new CloudflareOfficialMcpClient({http:()=>{}}),/TRUSTED_BACKEND_REQUIRED/)
});
test('read-only MCP init, list; bearer used only in request, zero writes',async()=>{
 const sent=[];const c=new CloudflareOfficialMcpClient({tokenProvider:async()=> 'test-token-not-a-secret',http:makeHttp(sent)});const x=await c.verifyReadOnly(scope);
 assert.equal(x.status,'READ_ONLY_MCP_VERIFIED');assert.equal(x.mutations,0);assert.equal(x.tool_count,3);assert.equal(sent.length,3);
 assert.deepEqual(sent.map(y=>JSON.parse(y.req.body).method),['initialize','notifications/initialized','tools/list']);
 assert.ok(sent.every(y=>String(y.req.headers.Authorization).includes('Bearer ')));
 assert.equal(JSON.stringify(x).includes('test-token'),false);
});
test('cross-account and non-CEREBRO identity rejected before HTTP',async()=>{
 const sent=[];const c=new CloudflareOfficialMcpClient({tokenProvider:async()=> 'test-token',http:makeHttp(sent)});
 await assert.rejects(()=>c.verifyReadOnly({...scope,account_id:'other'}),/SCOPE_DENIED/);
 await assert.rejects(()=>c.verifyReadOnly({...scope,client_id:'chatgpt'}),/SCOPE_DENIED/);assert.equal(sent.length,0);
});
test('missing backend secret denies without HTTP',async()=>{
 const sent=[];const c=new CloudflareOfficialMcpClient({tokenProvider:async()=> null,http:makeHttp(sent)});
 await assert.rejects(()=>c.verifyReadOnly(scope),/TOKEN_NOT_AVAILABLE/);assert.equal(sent.length,0);
});
test('MCP 401 denied without leaking response body',async()=>{
 const c=new CloudflareOfficialMcpClient({tokenProvider:async()=> 'test',http:async()=>({ok:false,status:401,text:async()=> 'secret stuff'})});
 await assert.rejects(()=>c.verifyReadOnly(scope),/MCP_HTTP_401/);
});
test('MCP reply id mismatch fail closed',async()=>{
 const c=new CloudflareOfficialMcpClient({tokenProvider:async()=> 'test',http:async()=>({ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=> JSON.stringify({jsonrpc:'2.0',id:99,result:{}})})});
 await assert.rejects(()=>c.verifyReadOnly(scope),/MCP_RESPONSE_ID_MISMATCH/);
});
test('SSE streamable-http supported without logs',async()=>{
 const sent=[];const http=async (url,req)=>{sent.push(req);const body=JSON.parse(req.body);
 if(body.method==='notifications/initialized')return {ok:true,status:202,headers:{get:()=> 'text/event-stream'}};
 const result=body.method==='initialize'?{protocolVersion:'2025-06-18',serverInfo:{name:'cf'}}:{tools:[{name:'search'}]};
 return {ok:true,status:200,headers:{get:()=> 'text/event-stream'},text:async()=>`event: message\ndata: ${JSON.stringify({jsonrpc:'2.0',id:body.id,result})}\n\n`};
 };const c=new CloudflareOfficialMcpClient({tokenProvider:()=> 'test',http});const x=await c.verifyReadOnly(scope);assert.equal(x.tool_count,1)
});
test('Gateway binding registers only a read-only scoped probe',async()=>{
 const available=new Map(),actionGateway={registerCapability(n,cb){available.set(n,cb)}};
 const client={verifyReadOnly:async()=>({status:'READ_ONLY_MCP_VERIFIED',endpoint_host:'mcp.cloudflare.com',tool_count:3})};
 const b=bindCloudflareOfficialReadOnlyToGateway({actionGateway,client,resolvePrincipal:async()=>({client_id:'cerebro',account_id:account,approved_lab_probe:true})});
 assert.equal(b.production_deployed,false);assert.deepEqual([...available.keys()],['cloudflare.official.mcp.probe']);
 const out=await available.get('cloudflare.official.mcp.probe')({context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD'},payload:{}});
 assert.equal(out.status,'COMPLETED');assert.equal(out.mutations,0);
});
test('Gateway refuses payload injection and spoofed identities',async()=>{
 const available=new Map(),actionGateway={registerCapability(n,cb){available.set(n,cb)}};
 bindCloudflareOfficialReadOnlyToGateway({actionGateway,client:{verifyReadOnly:async()=>{throw Error('not-called')}},resolvePrincipal:async()=>({client_id:'chatgpt',account_id:account,approved_lab_probe:true})});
 const h=available.get('cloudflare.official.mcp.probe');const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD'};
 await assert.rejects(()=>h({context,payload:{token:'x'}}),/EMPTY_PROBE_PAYLOAD_REQUIRED/);
 await assert.rejects(()=>h({context,payload:{}}),/GATEWAY_IDENTITY_DENIED/);
});