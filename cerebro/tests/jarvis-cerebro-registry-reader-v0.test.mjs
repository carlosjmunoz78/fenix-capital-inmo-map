import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {createJarvisCerebroRegistryReaderV0} from '../console/jarvis-cerebro-registry-reader-v0.mjs';
import {bindJarvisCapabilityDelegationV0} from '../console/jarvis-capability-delegation-v0.mjs';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../registry');
const files=['engine-registry.v1.json','role-agent-registry.v1.json',
 'native-capability-operational-adoption-v1.json','skill-real-engine-binding-v1.json'];
test('CUT49 read-through consumes real CEREBRO canonical engine, role and skill knowledge without enabling execution',async()=>{
 const reader=createJarvisCerebroRegistryReaderV0();
 const snapshot=await reader();
 assert.equal(snapshot.source,'CEREBRO_CANONICAL_REGISTRY');
 assert.equal(snapshot.engine_ids.length,179);
 assert.equal(snapshot.roles.length,11);
 assert.ok(snapshot.learned_capabilities.some(c=>c.capability_id==='FACT-SKILL-NATIVE'));
 assert.ok(snapshot.learned_capabilities.some(c=>c.capability_id==='skill:agent-browser'));
 assert.ok(snapshot.learned_capabilities.every(c=>c.state==='TESTED_NOT_RELEASED'));
 assert.equal(snapshot.revision.length,64);
 const consoleGateway=new CerebroGatewayV0(),actionGateway=new ActionGatewayV1();
 bindJarvisCapabilityDelegationV0({consoleGateway,actionGateway,
  readCanonicalCatalogue:reader,readReleaseManifests:async()=>[],
  verifyOwner:async()=>true /* TEST FIXTURE, NOT REAL USER */});
 consoleGateway.createSession({session_id:'readonly',company_id:'fenix'});
 const info=await consoleGateway.execute({session_id:'readonly',command:'jarvis.capabilities'});
 assert.equal(info.known_engine_count,179);
 assert.equal(info.registered_role_count,11);
 assert.ok(info.discovered_learned_capabilities>0);
 assert.equal(info.released_capabilities.length,0);
 const cmd=await consoleGateway.execute({session_id:'readonly',command:'jarvis.delegate',
  payload:{capability_id:'skill:agent-browser',idempotency_key:'none',parameters:{}}});
 assert.equal(cmd.status,'CAPABILITY_NOT_RELEASED');
 assert.equal(cmd.executed,false);
});
test('CUT49 registry changes propagate on next read without changing Jarvis code or granting newly learned skills',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-readthrough-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const name of files)fs.copyFileSync(path.join(dir,name),path.join(temp,name));
 const reader=createJarvisCerebroRegistryReaderV0({registry_dir:temp});
 const first=await reader();
 const canonical=JSON.parse(fs.readFileSync(path.join(temp,files[0]),'utf8'));
 canonical.engine_ids.push('NEW-ENGINE-999');
 canonical.count=canonical.engine_ids.length;
 fs.writeFileSync(path.join(temp,files[0]),JSON.stringify(canonical));
 const native=JSON.parse(fs.readFileSync(path.join(temp,files[2]),'utf8'));
 native.capabilities.push({capability_id:'NEW-LEARNED-SKILL-999',owner_engine_id:'NEW-ENGINE-999'});
 fs.writeFileSync(path.join(temp,files[2]),JSON.stringify(native));
 const second=await reader();
 assert.equal(second.engine_ids.length,180);
 assert.notEqual(second.revision,first.revision);
 assert.ok(second.learned_capabilities.some(c=>c.capability_id==='NEW-LEARNED-SKILL-999'));
 assert.equal(second.learned_capabilities.find(c=>c.capability_id==='NEW-LEARNED-SKILL-999').state,'TESTED_NOT_RELEASED');
 // This is a copied test fixture, not a change to the live FACT-001 master.
 assert.equal((await createJarvisCerebroRegistryReaderV0()()).engine_ids.length,179);
});
test('CUT49 invalid or unavailable trusted registry fails closed instead of treating a stale cache as knowledge',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-readthrough-error-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const name of files)fs.copyFileSync(path.join(dir,name),path.join(temp,name));
 const reader=createJarvisCerebroRegistryReaderV0({registry_dir:temp});
 const engines=JSON.parse(fs.readFileSync(path.join(temp,files[0]),'utf8'));
 engines.count=999;
 fs.writeFileSync(path.join(temp,files[0]),JSON.stringify(engines));
 await assert.rejects(reader(),/CONTRACT_MISMATCH/);
 fs.rmSync(path.join(temp,files[2]));
 await assert.rejects(reader());
});
