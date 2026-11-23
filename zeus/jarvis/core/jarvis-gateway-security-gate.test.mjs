import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisGatewaySecurityGate} from './jarvis-gateway-security-gate.mjs';
const url='https://jarvis.example.test/v1/missions';
const mk=(urlArg=url,headers={},method='GET')=>new Request(urlArg,{method,headers});
const handler=async()=>new Response('SAFE',{status:200});
test('deployment security gate is disabled by default and never invokes underlying handler',async()=>{
 let count=0;const gate=createJarvisGatewaySecurityGate({handler:async()=>{count++;return handler();}});
 const res=await gate(mk());assert.equal(res.status,503);assert.equal(count,0);
 assert.equal((await res.json()).reason,'JARVIS_GATEWAY_DISABLED');
});
test('cannot enable gateway without bound hosts, origins and rate limiter',()=>{
 assert.throws(()=>createJarvisGatewaySecurityGate({handler,enabled:true}),/SECURITY_GATE_INCOMPLETE/);
 assert.throws(()=>createJarvisGatewaySecurityGate({handler,allowedOrigins:['http://insecure.example.test']}),/ORIGIN_INVALID/);
});
test('reject forged host and browser origin before invoking core',async()=>{
 let count=0;const gate=createJarvisGatewaySecurityGate({handler:async()=>{count++;return handler();},enabled:true,allowedHosts:['https://jarvis.example.test'],allowedOrigins:['https://app.example.test'],rateLimiter:async()=>true});
 assert.equal((await gate(mk('https://evil.example.test/v1/missions'))).status,403);
 assert.equal((await gate(mk(url,{origin:'https://evil.example.test'}))).status,403);
 assert.equal(count,0);
 assert.equal((await gate(mk(url,{origin:'https://app.example.test'}))).status,200);
 assert.equal(count,1);
});
test('rate limiter rejects, errors fail closed, and method restrictions apply',async()=>{
 const config={handler,enabled:true,allowedHosts:['https://jarvis.example.test'],allowedOrigins:['https://app.example.test']};
 assert.equal((await createJarvisGatewaySecurityGate({...config,rateLimiter:async()=>false})(mk())).status,429);
 assert.equal((await createJarvisGatewaySecurityGate({...config,rateLimiter:async()=>{throw Error('unavailable');}})(mk())).status,503);
 assert.equal((await createJarvisGatewaySecurityGate({...config,rateLimiter:async()=>true})(mk(url,{},'DELETE'))).status,405);
});
