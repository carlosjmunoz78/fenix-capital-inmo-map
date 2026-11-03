import test from 'node:test';import assert from 'node:assert/strict';
import {B4MemoryLabStore,createJarvisB4Memory} from './jarvis-b4-memory.mjs';
const source={kind:'OWNER_STATEMENT',id:'chat-1',evidenceRefs:['LIBRARY:chat-1']};
const mk=(overrides={})=>({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',idempotencyKey:'write-1',kind:'FACT',subjectKey:'goal',value:'cost-0',source,confidence:0.99,...overrides});
let t='2026-11-03T22:40:00.000Z';
const setup=({enabled=true,store=new B4MemoryLabStore(),environment='LAB',provenanceVerifier=async()=>true,b3PolicyService=null}={})=>{
 const identityProvider={verify:async token=>token==='good'?{ownerId:'owner-1',sessionId:'ses-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']}:token==='other'?{ownerId:'owner-2',sessionId:'ses-2',roles:['OWNER_ROOT'],authorizedCompanies:['otra']}:token==='no-role'?{ownerId:'owner-1',sessionId:'ses-3',roles:['VIEWER'],authorizedCompanies:['fenix']}:null};
 const controlStore={get:async()=>({enabled,killSwitch:!enabled})};
 const app=createJarvisB4Memory({identityProvider,store,controlStore,provenanceVerifier,b3PolicyService,environment,clock:()=>t});return{app,store,identityProvider,controlStore};
};
test('B4 defaults fail closed and requires trusted adapters',async()=>{
 assert.throws(()=>createJarvisB4Memory(),/B4_TRUSTED_ADAPTERS_REQUIRED/);
 const x=setup({enabled:false});await assert.rejects(x.app.append(mk()),/B4_LOCKED/);assert.equal(x.store.entries.length,0);
});
test('B4 owner identity and tenant-scoped denial',async()=>{
 const {app,store}=setup();await assert.rejects(app.append(mk({token:'no-role'})),/OWNER_ROOT_REQUIRED/);
 await assert.rejects(app.append(mk({token:'other'})),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(app.readContext({token:'other',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'}),/COMPANY_SCOPE_DENIED/);
 assert.equal(store.entries.length,0);
});
test('B4 provenance mandatory and inferred memory is never grounded',async()=>{
 const {app}=setup();await assert.rejects(app.append(mk({source:{kind:'DOCUMENT',id:'file-1',evidenceRefs:[]}})),/PROVENANCE_REQUIRED/);
 await app.append(mk({source:{kind:'INFERENCE',id:'model-1',evidenceRefs:['TRACE:model-1']}}));
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory.length,0);
});
test('B4 scoped context and links reject cross-company disclosure',async()=>{
 const {app}=setup();await assert.rejects(app.append(mk({links:[{type:'ENGINE',id:'E-1',companyId:'otra'}]})),/CROSS_COMPANY_LINK/);
 await app.append(mk({links:[{type:'ENGINE',id:'E-1',companyId:'fenix'}]}));
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'other-project'})).memory.length,0);
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory[0].value,'cost-0');
});
test('B4 atomic replay uses fingerprint of original request, not write time',async()=>{
 const {app,store}=setup();const first=await app.append(mk());t='2026-11-03T22:41:00.000Z';const second=await app.append(mk());
 assert.equal(first.replayed,false);assert.equal(second.replayed,true);assert.equal(first.event.id,second.event.id);assert.equal(store.entries.length,1);
 await assert.rejects(app.append(mk({value:'different'})),/IDEMPOTENCY_CONFLICT/);
});
test('B4 contradictions flagged, not invented or silently overwritten',async()=>{
 const {app}=setup();await app.append(mk());await app.append(mk({idempotencyKey:'write-2',value:'cost-15'}));
 const memory=(await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory[0];
 assert.equal(memory.status,'CONFLICT');assert.equal(memory.value,null);assert.equal(memory.evidence.length,2);
});
test('B4 explicit corrections preserve history and restore a grounded context',async()=>{
 const {app,store}=setup();const first=(await app.append(mk())).event;
 await app.append(mk({idempotencyKey:'fix-1',kind:'CORRECTION',value:'cost-0-corrected',targetId:first.id}));
 const item=(await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory[0];
 assert.equal(item.value,'cost-0-corrected');assert.equal(store.entries.length,2);assert.equal(store.entries[0].value,'cost-0');
 await assert.rejects(app.append(mk({idempotencyKey:'fix-2',kind:'CORRECTION',targetId:first.id})),/TARGET_SCOPE_OR_SUBJECT_DENIED/);
});
test('B4 revocation removes effective memory while preserving auditable tombstone',async()=>{
 const {app,store}=setup();const first=(await app.append(mk())).event;
 await app.append(mk({kind:'REVOCATION',idempotencyKey:'revoke-1',targetId:first.id,value:'',ttlSeconds:2592000}));
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory.length,0);
 assert.equal(store.entries.length,2);
});
test('B4 Never Ask Me Again only for owner-consented non-security UX preferences',async()=>{
 const {app}=setup();await assert.rejects(app.append(mk({kind:'PREFERENCE',subjectKey:'ux.theme',neverAskAgain:true})),/PREFERENCE_CONSENT_REQUIRED/);
 await assert.rejects(app.append(mk({kind:'PREFERENCE',subjectKey:'security.mfa',consent:{granted:true,purpose:'MEMORY_PREFERENCE',allowNeverAskAgain:true},neverAskAgain:true})),/NEVER_ASK_SECURITY_DENIED/);
 await app.append(mk({kind:'PREFERENCE',subjectKey:'ux.theme',consent:{granted:true,purpose:'MEMORY_PREFERENCE',allowNeverAskAgain:true},neverAskAgain:true,value:'dark'}));
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory[0].neverAskAgain,true);
});
test('B4 policy rejects secret-like content even in owner-supplied memory',async()=>{
 const {app}=setup();await assert.rejects(app.append(mk({value:'password is 123'})),/MEMORY_CONTENT_REJECTED/);
 await assert.rejects(app.append(mk({value:'Bearer abc.def.ghi'})),/MEMORY_CONTENT_REJECTED/);
});
test('B4 TTL and low-confidence entries do not become durable asserted facts',async()=>{
 t='2026-11-03T22:40:00.000Z';const {app}=setup();await app.append(mk({ttlSeconds:60,confidence:0.70}));
 assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory.length,0);
 t='2026-11-03T22:42:00.000Z';assert.equal((await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory.length,0);
});
test('B4 checkpoint records never auto-reexecute a missing receipt on resume',async()=>{
 t='2026-11-03T22:40:00.000Z';const {app}=setup();await app.append(mk({kind:'CHECKPOINT',missionId:'mission-1',subjectKey:'checkpoint',value:'step-1',checkpoint:{sequence:1,stage:'RUNNING',executionReceiptRef:'REC:001'}}));
 const c=(await app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',missionId:'mission-1'})).checkpoint;
 assert.equal(c.sequence,1);assert.equal(c.resumeState,'RECONCILIATION_REQUIRED');
 await assert.rejects(app.append(mk({kind:'CHECKPOINT',idempotencyKey:'cp-2',missionId:'mission-1',subjectKey:'checkpoint',value:'step-2',checkpoint:{sequence:1,stage:'RUNNING',executionReceiptRef:'REC:002'}})),/CHECKPOINT_SEQUENCE_CONFLICT/);
});
test('B4 second authenticated channel reconstructs same context from shared adapter',async()=>{
 t='2026-11-03T22:40:00.000Z';const {app,store,identityProvider,controlStore}=setup();await app.append(mk());
 const second=createJarvisB4Memory({identityProvider,store,controlStore,clock:()=>t});
 assert.equal((await second.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'})).memory[0].value,'cost-0');
});
test('B4 multi-request same-key concurrency creates exactly one assertion in LAB',async()=>{
 const {app,store}=setup();const result=await Promise.all(Array.from({length:8},()=>app.append(mk())));
 assert.equal(result.filter(x=>!x.replayed).length,1);assert.equal(store.entries.length,1);
});

test('B4 rejects any claimed verified external provenance without independent server verification',async()=>{
 const {app}=setup({provenanceVerifier:null});
 await assert.rejects(app.append(mk({source:{kind:'SYSTEM_VERIFIED',id:'sys-1',evidenceRefs:['EV:1']}})),/PROVENANCE_NOT_VERIFIED/);
 await assert.rejects(app.append(mk({source:{kind:'DOCUMENT',id:'doc-1',evidenceRefs:['DOC:1']}})),/PROVENANCE_NOT_VERIFIED/);
});
test('B4 duplicate correction retry remains idempotent and does not mutate historical assertion',async()=>{
 const {app,store}=setup();const first=(await app.append(mk())).event;
 const correction=mk({idempotencyKey:'correct-2',kind:'CORRECTION',targetId:first.id,value:'fixed'});
 const a=await app.append(correction);const b=await app.append(correction);
 assert.equal(a.event.id,b.event.id);assert.equal(b.replayed,true);assert.equal(store.entries.length,2);
});

test('B4 PROD rejects memory writes without audited B3 policy service even when feature is enabled',async()=>{
 const {app,store}=setup({environment:'PROD'});
 await assert.rejects(app.append(mk()),/B3_POLICY_REQUIRED/);
 assert.equal(store.entries.length,0);
 await assert.rejects(app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'}),/B3_POLICY_REQUIRED/);
});
test('B4 PROD policy decision DENY prevents memory writes and reads',async()=>{
 const decisions=[];
 const {app,store}=setup({environment:'PROD',b3PolicyService:{
  authorize:async req=>{decisions.push(req);return {decision:'DENY',reason:'GRANT_MISSING'};}
 }});
 await assert.rejects(app.append(mk()),/B3_POLICY_DENIED/);
 await assert.rejects(app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'}),/B3_POLICY_DENIED/);
 assert.deepEqual(decisions.map(x=>x.actionName),['JARVIS_MEMORY_APPEND','JARVIS_MEMORY_READ']);
 assert.equal(store.entries.length,0);
});
test('B4 PROD policy adapter requires explicit per-action grants for memory access',async()=>{
 const decisions=[];
 const {app}=setup({environment:'PROD',b3PolicyService:{
  authorize:async req=>{decisions.push(req);return req.actionName==='JARVIS_MEMORY_APPEND'?{decision:'ALLOW'}:{decision:'DENY'};}
 }});
 await app.append(mk());
 await assert.rejects(app.readContext({token:'good',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'}),/B3_POLICY_DENIED/);
 assert.deepEqual(decisions.map(x=>x.actionName),['JARVIS_MEMORY_APPEND','JARVIS_MEMORY_READ']);
});
test('B4 does not treat an invalid B3 audit/decision result as authorization',async()=>{
 const {app}=setup({environment:'PROD',b3PolicyService:{authorize:async()=>({decision:'AUDIT_UNAVAILABLE'})}});
 await assert.rejects(app.append(mk()),/B3_POLICY_DENIED/);
});
