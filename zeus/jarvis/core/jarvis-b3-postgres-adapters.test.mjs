import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB3PostgresAdapters} from './jarvis-b3-postgres-adapters.mjs';
const setup=()=>{
 const calls=[];
 const query=async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('b3_runtime_control'))return{rows:[{enabled:false,kill_switch:true}]};
  if(sql.includes('b3_owner_grants'))return{rows:[{grant_id:'grant-123',owner_id:'zeus-001',company_id:'fenix',environment:'PROD',actions:['STATUS'],expires_at_ms:'1800000000000',max_cost_eur:'0.00',allow_mutations:false,active:false,revoked:true}]};
  if(sql.includes('b3_secret_inventory'))return{rows:[{company_id:'fenix',connector_id:'github',status:'UNBOUND',vault_secret_id:null,allowed_actions:['STATUS']}]};
  if(sql.includes('b3_audit_events'))return{rows:[{audit_id:'23'}]};
  throw Error('unknown statement');
 };
 return{adapters:createJarvisB3PostgresAdapters({query}),calls};
};
test('B3 Postgres adapters enforce locked live defaults and scoped grant shape',async()=>{
 const {adapters,calls}=setup();
 assert.deepEqual(await adapters.controlStore.get({companyId:'fenix',environment:'PROD'}),{enabled:false,killSwitch:true});
 const grant=await adapters.grantStore.find({ownerId:'zeus-001',companyId:'fenix',environment:'PROD',actionName:'STATUS'});
 assert.equal(grant.active,false);assert.equal(grant.revoked,true);assert.equal(grant.expiresAt,1800000000000);
 assert.equal(grant.maxCost,0);
 assert.deepEqual(calls[1].args,['zeus-001','fenix','PROD','STATUS']);
});
test('B3 inventory refuses non-PROD environment until migration is supported',async()=>{
 const {adapters,calls}=setup();
 assert.equal(await adapters.inventoryStore.get({companyId:'fenix',environment:'LAB',connectorId:'github',actionName:'STATUS'}),null);
 assert.equal(calls.length,0);
 const row=await adapters.inventoryStore.get({companyId:'fenix',environment:'PROD',connectorId:'github',actionName:'STATUS'});
 assert.equal(row.status,'UNBOUND');assert.equal(row.reference,null);
 assert.deepEqual(calls[0].args,['fenix','github','STATUS']);
});
test('B3 audit is append only and uses parameters, never interpolation',async()=>{
 const {adapters,calls}=setup();
 assert.equal(await adapters.auditStore.append({eventCode:'DENY',companyId:'fenix',environment:'PROD',grantId:null,allowed:false}),true);
 assert.match(calls[0].sql,/INSERT INTO zeus_jarvis.b3_audit_events/);
 assert.deepEqual(calls[0].args,['DENY','fenix','PROD',null,false]);
 assert.equal(await adapters.auditStore.append({eventCode:'SQL;DROP TABLE',companyId:'fenix',environment:'PROD',allowed:false}),false);
 assert.equal(calls.length,1);
});
