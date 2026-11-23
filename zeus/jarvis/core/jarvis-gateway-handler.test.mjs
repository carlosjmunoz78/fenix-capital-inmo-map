import test from 'node:test';
import assert from 'node:assert/strict';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
const principal={ownerId:'zeus-owner:u1',sessionId:'s',roles:['OWNER_ROOT'],authorizedCompanies:['fenix','aion']};
const store=new MemoryEventStore();
const core=new JarvisUniversalCore({identityProvider:{verify:async token=>token==='valid-token'?principal:null},store,ids:()=>'mission001',capabilities:new Map([['STATUS',{mutating:false,run:async()=>({ok:true,secret:'redact-me'})}]])});
const handler=createJarvisGatewayHandler({core});
const base='https://localhost/v1/missions';
function request(url=base,{method='GET',token='valid-token',body}={}){return new Request(url,{method,headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});}
const input={company_id:'fenix',project_id:'PRJ-1',idempotency_key:'x1',intent:'STATUS',channel:'mobile',payload:{password:'hidden'}};
test('gateway denies missing token and invalid principal',async()=>{const a=await handler(new Request(base));assert.equal(a.status,401);const b=await handler(request(base,{token:'invalid',method:'POST',body:input}));assert.equal(b.status,403);});
test('gateway create from mobile, retrieve from desktop and replay without duplication',async()=>{const a=await handler(request(base,{method:'POST',body:input}));assert.equal(a.status,201);const first=await a.json();assert.equal(first.mission.request.password,'[REDACTED]');const b=await handler(request(`${base}/mission001`,{method:'GET'}));assert.equal(b.status,200);const c=await handler(request(base,{method:'POST',body:{...input,channel:'desktop'}}));assert.equal(c.status,200);assert.equal((await c.json()).mission.id,'mission001');const run=await handler(request(`${base}/mission001/execute`,{method:'POST'}));assert.equal(run.status,200);assert.equal((await run.json()).mission.result.secret,'[REDACTED]');});
test('gateway blocks other tenant and idempotency payload mismatch',async()=>{const x=await handler(request(base,{method:'POST',body:{...input,company_id:'trading',idempotency_key:'z'}}));assert.equal(x.status,403);const y=await handler(request(base,{method:'POST',body:{...input,payload:{a:1}}}));assert.equal(y.status,409);});
test('gateway never exposes bearer or server exceptions',async()=>{const x=await handler(request(`${base}/notfound`));assert.equal(x.status,404);assert.ok(!(await x.text()).includes('valid-token'));const y=await handler(new Request('https://localhost/v1/health'));assert.equal((await y.json()).ready,false);});