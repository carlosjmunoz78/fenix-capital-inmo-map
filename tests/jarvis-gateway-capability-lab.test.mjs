import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectJarvisGateway,JARVIS_GATEWAY_ENGINE_IDS} from '../src/jarvisGatewayDiagnostics.ts';

const health={status:'ok',authenticated_transport:true,direct_model_access:false,
 prod_execution_enabled:false,live_writes:false,chat_available:true};
const contract={gateway_required:true,direct_model_access:false,
 prod_execution_enabled:false,trading_access:false,live_writes:false};
const engines={engines:JARVIS_GATEWAY_ENGINE_IDS.map(engine_id=>({engine_id}))};
function mock(responses={}){
 const paths=[];
 const request=async path=>{
  paths.push(path);
  if(Object.hasOwn(responses,path))return responses[path];
  const data=path==='health'?health:path==='contract'?contract:engines;
  return {status:200,data};
 };
 return {request,paths};
}
test('CUT42 safe owner session checks exactly 3 existing GET contracts',async()=>{
 const {request,paths}=mock();
 const data=await inspectJarvisGateway(request);
 assert.equal(data.status,'VERIFIED_READONLY');
 assert.equal(data.owner_authenticated,true);
 assert.equal(data.chat_available,true);
 assert.deepEqual(paths,['health','contract','engines']);
 assert.deepEqual(data.declared_engines,[...JARVIS_GATEWAY_ENGINE_IDS]);
 assert.equal(data.total_declared_engines,5);
 assert.equal(data.full_knowledge_verified,false);
 assert.equal(data.universal_execution_verified,false);
 assert.equal(data.voice_device_verified,false);
});
test('CUT42 anonymous/expired session stays closed, no follow-on requests',async()=>{
 const {request,paths}=mock({health:{status:401,data:{status:'FORBIDDEN'}}});
 const data=await inspectJarvisGateway(request);
 assert.equal(data.status,'AUTH_REQUIRED');
 assert.deepEqual(paths,['health']);
 assert.equal(data.owner_authenticated,false);
 assert.deepEqual(data.declared_engines,[]);
});
test('CUT42 forbids any change to safe health or contract flags',async()=>{
 const a=await inspectJarvisGateway(mock({health:{status:200,data:{...health,live_writes:true}}}).request);
 const b=await inspectJarvisGateway(mock({contract:{status:200,data:{...contract,trading_access:true}}}).request);
 assert.equal(a.status,'CONTRACT_MISMATCH');
 assert.equal(b.status,'CONTRACT_MISMATCH');
 assert.equal(a.owner_authenticated,false);
 assert.equal(b.owner_authenticated,false);
});
test('CUT42 catches extra/duplicate/missing motors, never conflates engine registry',async()=>{
 const extra={engines:[...engines.engines,{engine_id:'MAGIC-999'}]};
 const duplicate={engines:[...engines.engines,engines.engines[0]]};
 const missing={engines:engines.engines.slice(1)};
 for(const variant of [extra,duplicate,missing]){
  const d=await inspectJarvisGateway(mock({engines:{status:200,data:variant}}).request);
  assert.equal(d.status,'CONTRACT_MISMATCH');
  assert.equal(d.universal_execution_verified,false);
 }
});
test('CUT42 network failure is not misreported as functioning chat',async()=>{
 const d=await inspectJarvisGateway(async()=>{throw Error('unreachable')});
 assert.equal(d.status,'GATEWAY_UNAVAILABLE');
 assert.equal(d.transport_verified,false);
});
test('CUT42 diagnostics are wired in all non-JARVIS surfaces through the same authenticated client',async()=>{
 const {readFileSync}=await import('node:fs');
 const {dirname,join}=await import('node:path');
 const {fileURLToPath}=await import('node:url');
 const src=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../src/JarvisOmniDock.tsx'),'utf8');
 assert.match(src,/inspectJarvisGateway\(fetchCerebroConsole\)/);
 assert.match(src,/Comprobar capacidades reales/);
 assert.match(src,/Esto no acredita todos los motores/);
 assert.doesNotMatch(src,/api\.deepseek\.com/);
 assert.doesNotMatch(src,/service_role/);
});
