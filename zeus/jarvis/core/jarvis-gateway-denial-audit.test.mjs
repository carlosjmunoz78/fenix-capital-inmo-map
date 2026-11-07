import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
 createJarvisD1GatewayDenialAudit,createJarvisGatewayDenialAuditWrapper
} from './jarvis-gateway-denial-audit.mjs';
import {createJarvisCloudflareLabReadGateway} from './jarvis-cloudflare-lab-read-gateway.mjs';
import {createJarvisD1MissionStore} from './jarvis-d1-mission-store.mjs';

const ddl=['0001_jarvis_d1_mission_lab.sql',
 '0004_jarvis_d1_gateway_denial_audit_lab.sql'].map(name=>
 readFileSync(fileURLToPath(new URL('../cloudflare-lab/'+name,import.meta.url)),'utf8')
).join('\n');
const now=Date.parse('2026-11-06T00:20:00Z');
function rig(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(ddl);
 const statements=[];
 const db={prepare(sql){statements.push(sql);return{bind(...args){return{
  async first(){return sqlite.prepare(sql).get(...args)??null},
  async run(){
   if(sql.includes('INSERT INTO jarvis_lab_gateway_denial_audit_v0')){
    const result=sqlite.prepare(sql).run(...args);
    return {success:true,meta:{changes:Number(result.changes)},results:[]};
   }
   const results=sqlite.prepare(sql).all(...args);
   return {success:true,meta:{changes:results.length},results};
  }
 }}}}};
 const audit=createJarvisD1GatewayDenialAudit({db,clock:()=>now});
 const events=()=>sqlite.prepare('SELECT engine_id,environment,stage,reason_class,http_status,created_at_ms FROM jarvis_lab_gateway_denial_audit_v0 ORDER BY event_id').all();
 return {sqlite,db,audit,events,statements};
}
const source='secret-bearer-do-not-log';
const req=()=>new Request('https://jarvis-lab.example.test/v1/missions/cut25?potential-pii=discard',
 {headers:{authorization:'Bearer '+source,origin:'https://console.lab.example.test',
 'user-agent':'sensitive-device-fingerprint','x-forwarded-for':'1.2.3.4'}});
test('CUT25 OFF by default, does not invoke downstream or audit adapters',async()=>{
 let calls=0;
 const gateway=createJarvisGatewayDenialAuditWrapper({handler:async()=>{calls++;return new Response('',{status:200})}});
 assert.equal((await gateway(req())).status,503);assert.equal(calls,0);
});
test('CUT25 cannot turn on without trusted quota and audit or outside LAB',()=>{
 assert.throws(()=>createJarvisGatewayDenialAuditWrapper({enabled:true,handler:()=>null}),/AUDIT_AND_QUOTA_REQUIRED/);
 assert.throws(()=>createJarvisGatewayDenialAuditWrapper({enabled:true,environment:'PROD',handler:()=>null}),/LAB_ONLY/);
 assert.throws(()=>createJarvisD1GatewayDenialAudit(),/TRUSTED_GATEWAY_AUDIT_BINDING_REQUIRED/);
 assert.throws(()=>createJarvisD1GatewayDenialAudit({environment:'PROD',db:{prepare(){}}}),/LAB_ONLY/);
});
test('CUT25 records only fixed status classes for all denied gateway responses',async()=>{
 const r=rig();
 try{
  const statuses=[400,401,403,404,405,429,503];
  for(const status of statuses){
   const gateway=createJarvisGatewayDenialAuditWrapper({
    handler:async()=>new Response(JSON.stringify({details:source}),{status}),
    audit:r.audit,quotaGuard:async()=>true,enabled:true
   });
   const response=await gateway(req());assert.equal(response.status,status);
  }
  assert.deepEqual(r.events().map(x=>x.http_status),statuses);
  assert.deepEqual(r.events().map(x=>x.reason_class),
   ['BAD_REQUEST','AUTH_REQUIRED','ACCESS_DENIED','NOT_FOUND',
    'METHOD_DENIED','RATE_LIMITED','DEPENDENCY_UNAVAILABLE']);
  const rows=JSON.stringify(r.events());
  for(const forbidden of [source,'1.2.3.4','device-fingerprint','potential-pii','cut25','ownerId','sessionId'])
   assert.equal(rows.includes(forbidden),false);
  assert.ok(r.statements.every(s=>!s.includes(source)));
 }finally{r.sqlite.close()}
});
test('CUT25 success responses are not double-audited (B3 owns ALLOW audit)',async()=>{
 const r=rig();try{
  const w=createJarvisGatewayDenialAuditWrapper({
   handler:async()=>new Response('OK',{status:200}),audit:r.audit,
   quotaGuard:async()=>true,enabled:true
  });
  assert.equal((await w(req())).status,200);assert.equal(r.events().length,0);
 }finally{r.sqlite.close()}
});
test('CUT25 quota deny or quota outage avoids unbounded D1 writes',async()=>{
 const r=rig();try{
  const handler=async()=>new Response('bad',{status:401});
  const noBudget=createJarvisGatewayDenialAuditWrapper({handler,audit:r.audit,
   quotaGuard:async()=>false,enabled:true});
  assert.equal((await noBudget(req())).status,429);
  const down=createJarvisGatewayDenialAuditWrapper({handler,audit:r.audit,
   quotaGuard:async()=>{throw Error('quota token private')},enabled:true});
  assert.equal((await down(req())).status,503);
  assert.equal(r.events().length,0);
 }finally{r.sqlite.close()}
});
test('CUT25 audit outage fails closed even when handler returned specific 403',async()=>{
 const gateway=createJarvisGatewayDenialAuditWrapper({handler:async()=>new Response('',{status:403}),
  audit:{append:async()=>{throw Error('private secret')}},quotaGuard:async()=>true,enabled:true});
 const response=await gateway(req());assert.equal(response.status,503);
 assert.equal((await response.text()).includes('private secret'),false);
});
test('CUT25 unexpected upstream failures are audited as dependency unavailable',async()=>{
 const r=rig();try{
  const w=createJarvisGatewayDenialAuditWrapper({handler:async()=>{throw Error('JWT raw secret')},
   audit:r.audit,quotaGuard:async()=>true,enabled:true});
  assert.equal((await w(req())).status,503);
  assert.deepEqual(r.events().map(x=>x.reason_class),['DEPENDENCY_UNAVAILABLE']);
 }finally{r.sqlite.close()}
});
test('CUT25 audit table rejects any SQL UPDATE and DELETE',async()=>{
 const r=rig();try{
  assert.equal(await r.audit.append({httpStatus:403}),true);
  assert.throws(()=>r.sqlite.prepare("UPDATE jarvis_lab_gateway_denial_audit_v0 SET http_status=401").run(),/JARVIS_GATEWAY_AUDIT_APPEND_ONLY/);
  assert.throws(()=>r.sqlite.prepare("DELETE FROM jarvis_lab_gateway_denial_audit_v0").run(),/JARVIS_GATEWAY_AUDIT_APPEND_ONLY/);
  assert.equal(r.events().length,1);assert.equal(r.events()[0].http_status,403);
 }finally{r.sqlite.close()}
});
test('CUT25 actual perimeter→B2→B3 gateway B2 denial is audited before B3',async()=>{
 const r=rig();try{
  let b3=0;
  const coreGateway=createJarvisCloudflareLabReadGateway({
   enabled:true,environment:'LAB',identityProvider:{verify:async()=>{throw Error('invalid session')}},
   b3DecisionService:{authorize:async()=>{b3++;return {decision:'ALLOW'}}},
   rateLimiter:async()=>true,perimeterLimiter:async()=>true,
   allowedHosts:['https://jarvis-lab.example.test'],
   allowedOrigins:['https://console.lab.example.test']
  });
  const audited=createJarvisGatewayDenialAuditWrapper({handler:coreGateway,
   audit:r.audit,quotaGuard:async()=>true,enabled:true});
  const safe=new Request('https://jarvis-lab.example.test/v1/missions/cut25',{
   headers:{authorization:'Bearer '+source,origin:'https://console.lab.example.test'}
  });
  const response=await audited(safe,{JARVIS_LAB_DB:r.db});
  assert.notEqual(response.status,200);assert.equal(b3,0);
  assert.equal(r.events().length,1);
  assert.equal(r.events()[0].reason_class,'ACCESS_DENIED');
  assert.equal(JSON.stringify(r.events()).includes(source),false);
 }finally{r.sqlite.close()}
});
test('CUT25 authentic simulated authorized owner stays on B3 success path without extra denial log',async()=>{
 const r=rig();try{
  const m={id:'cut25',ownerId:'zeus-owner:synthetic',companyId:'fenix',
   engineId:'JARVIS-CORE-001',projectId:'PRJ',coreVersion:'0.1.0',
   environment:'LAB',intent:'STATUS',status:'RECEIVED',idempotencyKey:'one',
   request:{},events:[],createdAt:'2026-11-05T22:00:00Z',updatedAt:'2026-11-05T22:00:00Z'};
  await createJarvisD1MissionStore({db:r.db}).createIfAbsent(m);
  const identityProvider={verify:async()=>({
   ownerId:'zeus-owner:synthetic',sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']
  })};
  const b3DecisionService={authorize:async()=>({
   decision:'ALLOW',ownerId:'zeus-owner:synthetic',companyId:'fenix',
   environment:'LAB',action:'MISSION_INSPECT'
  })};
  const coreGateway=createJarvisCloudflareLabReadGateway({
   enabled:true,environment:'LAB',identityProvider,b3DecisionService,
   rateLimiter:async()=>true,perimeterLimiter:async()=>true,
   allowedHosts:['https://jarvis-lab.example.test'],
   allowedOrigins:['https://console.lab.example.test']
  });
  const audited=createJarvisGatewayDenialAuditWrapper({handler:coreGateway,
   audit:r.audit,quotaGuard:async()=>true,enabled:true});
  const safe=new Request('https://jarvis-lab.example.test/v1/missions/cut25',{
   headers:{authorization:'Bearer synthetic-session',origin:'https://console.lab.example.test'}
  });
  const response=await audited(safe,{JARVIS_LAB_DB:r.db});
  assert.equal(response.status,200);assert.equal(r.events().length,0);
 }finally{r.sqlite.close()}
});
