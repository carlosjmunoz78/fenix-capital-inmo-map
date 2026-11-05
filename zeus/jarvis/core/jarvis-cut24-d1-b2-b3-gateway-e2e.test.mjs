/**
 * CUT24 integration: existing JARVIS gateway + verified B2 HMAC sessions +
 * scoped B3 zero-cost grant + private D1 durable mission and B3 audit.
 * ALL identities, JWT-like values and D1 bindings are synthetic/local.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createJarvisD1MissionStore} from './jarvis-d1-mission-store.mjs';
import {createJarvisD1SessionStore} from './jarvis-d1-session-store.mjs';
import {createJarvisB2SessionRevocationGate} from './jarvis-b2-session-revocation-gate.mjs';
import {createJarvisD1B3Adapters} from './jarvis-d1-b3-adapters.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
import {createJarvisCloudflareLabReadGateway} from './jarvis-cloudflare-lab-read-gateway.mjs';
const ddl=['0001_jarvis_d1_mission_lab.sql','0002_jarvis_d1_session_lab.sql',
 '0003_jarvis_d1_b3_readonly_audit_lab.sql'].map(p=>
 readFileSync(fileURLToPath(new URL('../cloudflare-lab/'+p,import.meta.url)),'utf8')
).join('\n');
const owner='zeus-owner:synthetic',company='fenix';
const secret=Buffer.alloc(32,27);
const time=Date.now();
const tokenToId={'synthetic-desktop':'session-desktop','synthetic-mobile':'session-mobile'};
const mission={id:'cut24',ownerId:owner,companyId:company,projectId:'PRJ',
 engineId:'JARVIS-CORE-001',coreVersion:'0.1.0',environment:'LAB',
 intent:'STATUS',status:'RECEIVED',idempotencyKey:'cut24-key',request:{},
 createdAt:'2026-11-05T22:00:00.000Z',updatedAt:'2026-11-05T22:00:00.000Z',events:[]};
const hash=id=>createHmac('sha256',secret).update('jarvis-b2-session-v0\0')
 .update(owner).update('\0').update(id).digest('hex');
const req=(token,method='GET')=>new Request('https://jarvis-lab.example.test/v1/missions/cut24',
 {method,headers:{authorization:'Bearer '+token,origin:'https://console.lab.example.test'}});
function open(path){
 const sqlite=new DatabaseSync(path);
 sqlite.exec(ddl);
 const binding={prepare(sql){return{bind(...args){return{
   async first(){return sqlite.prepare(sql).get(...args)??null},
   async run(){
    const result=sqlite.prepare(sql).all(...args);
    return {success:true,results:result,meta:{changes:sql.includes('jarvis_lab_b3_audit_v0')?1:result.length}};
   }
 }}}}};
 return {sqlite,binding};
}
test('CUT24 integrated B2→B3→Gateway D1 across two synthetic sessions and restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-cut24-e2e-'));
 const path=join(dir,'lab.sqlite');
 let current;
 try{
  current=open(path);
  const {sqlite,binding}=current;
  const store=createJarvisD1MissionStore({db:binding});
  await store.createIfAbsent(mission);
  const sessionInsert=sqlite.prepare('INSERT INTO jarvis_lab_session_binding_v0(owner_id,session_hmac,environment,channel,role,active,revoked,authorized_companies_json,expires_at_ms,issued_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for(const sessionId of Object.values(tokenToId))
   sessionInsert.run(owner,hash(sessionId),'LAB','fenix-app','OWNER_ROOT',1,0,'["fenix"]',time+3600000,time-1000);
  sqlite.prepare('INSERT INTO jarvis_lab_b3_control_v0(company_id,environment,enabled,kill_switch) VALUES (?, ?, ?, ?)').run(company,'LAB',1,0);
  sqlite.prepare('INSERT INTO jarvis_lab_b3_read_grant_v0(grant_id,owner_id,company_id,environment,action_name,active,revoked,max_cost,allow_mutations,expires_at_ms,issued_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
   .run('cut24-grant',owner,company,'LAB','MISSION_INSPECT',1,0,0,0,time+3600000,time-1000);
  const trustedSource={verify:async(input)=>{
    const token=typeof input==='string'?input:input?.accessToken;
    if(!(token in tokenToId))throw Error('INVALID_SYNTHETIC_SESSION');
    return {ownerId:owner,sessionId:tokenToId[token],roles:['OWNER_ROOT'],
     authorizedCompanies:['fenix','aion']};
  }};
  const b2Store=createJarvisD1SessionStore({db:binding,clock:()=>time});
  const b2=createJarvisB2SessionRevocationGate({
   identityProvider:trustedSource,sessionStore:b2Store,secret,clock:()=>time,enabled:true
  });
  const b3adapters=createJarvisD1B3Adapters({db:binding,clock:()=>time});
  const b3=createJarvisB3DecisionService({
   identityProvider:{verify:async token=>b2.verify({channel:'fenix-app',accessToken:token})},
   ...b3adapters
  });
  const gateway=createJarvisCloudflareLabReadGateway({
   identityProvider:b2,b3DecisionService:b3,enabled:true,environment:'LAB',
   allowedHosts:['https://jarvis-lab.example.test'],
   allowedOrigins:['https://console.lab.example.test'],
   rateLimiter:async()=>true,perimeterLimiter:async()=>true
  });
  for(const token of Object.keys(tokenToId)){
   const response=await gateway(req(token),{JARVIS_LAB_DB:binding});
   assert.equal(response.status,200);
   assert.equal((await response.json()).mission.id,'cut24');
  }
  let count=sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_b3_audit_v0').get().n;
  assert.equal(count,2);
  sqlite.prepare('UPDATE jarvis_lab_session_binding_v0 SET revoked=1 WHERE session_hmac=?').run(hash('session-mobile'));
  assert.notEqual((await gateway(req('synthetic-mobile'),{JARVIS_LAB_DB:binding})).status,200);
  assert.equal((await gateway(req('synthetic-desktop'),{JARVIS_LAB_DB:binding})).status,200);
  assert.equal((await gateway(req('synthetic-desktop','POST'),{JARVIS_LAB_DB:binding})).status,405);
  count=sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_b3_audit_v0').get().n;
  assert.equal(count,3);
  sqlite.close();current=null;
  const reopened=open(path);current=reopened;
  assert.equal(reopened.sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_b3_audit_v0').get().n,3);
  assert.equal(reopened.sqlite.prepare("SELECT revoked FROM jarvis_lab_session_binding_v0 WHERE session_hmac=?").get(hash('session-mobile')).revoked,1);
  assert.equal((await createJarvisD1MissionStore({db:reopened.binding}).get('cut24')).id,'cut24');
  assert.throws(()=>reopened.sqlite.prepare('DELETE FROM jarvis_lab_b3_audit_v0').run(),/B3_AUDIT_APPEND_ONLY/);
 }finally{try{current?.sqlite.close()}catch{}rmSync(dir,{recursive:true,force:true})}
});
