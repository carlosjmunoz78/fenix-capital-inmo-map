import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
import {createJarvisB6CapabilityPreflight} from './jarvis-b6-capability-preflight.mjs';
import {createJarvisB6ControlledRead} from './jarvis-b6-controlled-read.mjs';

const scope={token:'synthetic-session',companyId:'fenix',environment:'LAB',
 sessionId:'session-1',missionId:'mission-1',capability:'GITHUB_FILE_READ',
 idempotencyKey:'b3-safe-1'};
const connectorId='jarvis-b6-allowlisted-github-read';
const evidenceHash='d'.repeat(64);
function rig({grantActive=true,revoked=false,expired=false,b3Enabled=true,goodAudit=true,
 roles=['OWNER_ROOT'],companies=['fenix'],grantActions=[
 'JARVIS_CAPABILITY_DISCOVER','JARVIS_CAPABILITY_EXECUTE_READ']}={}){
 const events=[],reads=[];
 const principal={ownerId:'owner-1',sessionId:'session-1',roles,authorizedCompanies:companies};
 const identityProvider={verify:async token=>{
  if(token!==scope.token)throw Error('TOKEN_INVALID');
  return principal;
 }};
 const grant={grantId:'grant-lab-1',ownerId:'owner-1',companyId:'fenix',environment:'LAB',
  active:grantActive,revoked,expiresAt:expired?Date.now()-1:Date.now()+100000,
  actions:grantActions,maxCost:0,allowMutations:false};
 // Reuse existing B3 implementation, not a shadow authorization engine.
 const b3=createJarvisB3DecisionService({
  identityProvider,
  controlStore:{get:async()=>({enabled:b3Enabled,killSwitch:!b3Enabled})},
  grantStore:{find:async()=>grant},
  actionCatalog:{get:async name=>({name,estimatedCost:0,mutating:false,confidence:1})},
  auditStore:{append:async event=>{events.push(event);return goodAudit;}}
 });
 const preflight=createJarvisB6CapabilityPreflight({
  identityProvider,policy:b3,
  registry:{list:async()=>[{
   id:connectorId,companyId:'fenix',environment:'LAB',capability:'GITHUB_FILE_READ',
   isolation:'TENANT',route:'API',estimatedEuro:0,dataBoundary:'LOCAL_PRIVATE',
   enabled:true,supportsRollback:false
  }]},
  audit:{append:async event=>{events.push(event);return true;}}
 });
 const journal={
  claim:async()=>({state:'CLAIMED'}),
  complete:async()=>true,fail:async()=>true
 };
 const executor=createJarvisB6ControlledRead({
  identityProvider,controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  preflight,policy:b3,journal,
  connectorRegistry:{resolve:async()=>({
   id:connectorId,companyId:'fenix',environment:'LAB',capability:'GITHUB_FILE_READ',
   operation:'READ',route:'API',estimatedEuro:0,sideEffectFree:true,
   dataBoundary:'LOCAL_PRIVATE',
   read:async()=>{reads.push('real-code-adapter-fixture');return{ok:true};}
  })},
  resultVerifier:{verify:async()=>({verified:true,evidenceHash,summary:'B3 authorized synthetic read'})},
  audit:{append:async event=>{events.push(event);return true;}}
 });
 return{executor,events,reads};
}
test('B6 CUT02 integrates the existing B3 decision service for both grants',async()=>{
 const {executor,events,reads}=rig();
 const r=await executor.executeRead(scope);
 assert.equal(r.state,'EXECUTED_VERIFIED_READ');assert.equal(reads.length,1);
 assert.deepEqual(events.filter(e=>e.eventCode==='ALLOW').map(e=>e.allowed),[true,true]);
});
test('B6 CUT02 no real grant means no adapter invocation',async()=>{
 const{executor,reads}=rig({grantActive:false});
 const r=await executor.executeRead(scope);
 assert.equal(r.reason,'PREFLIGHT_DENIED_OR_INVALID');assert.equal(reads.length,0);
});
test('B6 CUT02 revoked grant is denied by existing B3 policy',async()=>{
 const{executor,events,reads}=rig({revoked:true});
 assert.equal((await executor.executeRead(scope)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(reads.length,0);
 assert.equal(events.some(e=>e.eventCode==='DENY'),true);
});
test('B6 CUT02 expired grant is denied by B3',async()=>{
 const{executor,reads}=rig({expired:true});
 assert.equal((await executor.executeRead(scope)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(reads.length,0);
});
test('B6 CUT02 B3 kill switch denies even if B6 control says ON',async()=>{
 const{executor,reads}=rig({b3Enabled:false});
 assert.equal((await executor.executeRead(scope)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(reads.length,0);
});
test('B6 CUT02 mandatory B3 execution grant is separate from discovery',async()=>{
 const{executor,reads,events}=rig({grantActions:['JARVIS_CAPABILITY_DISCOVER']});
 assert.equal((await executor.executeRead(scope)).reason,'B3_EXECUTION_DENIED');
 assert.equal(reads.length,0);
 assert.deepEqual(events.filter(e=>e.eventCode==='ALLOW'||e.eventCode==='DENY').map(e=>e.eventCode),['ALLOW','DENY']);
});
test('B6 CUT02 B3 audit outage prevents capabilities',async()=>{
 const{executor,reads}=rig({goodAudit:false});
 assert.equal((await executor.executeRead(scope)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(reads.length,0);
});
test('B6 CUT02 no company grant cannot be overridden by caller metadata',async()=>{
 const{executor,reads}=rig({companies:['aion']});
 assert.equal((await executor.executeRead({...scope,roles:['OWNER_ROOT'],authorizedCompanies:['fenix']})).reason,'OWNER_SCOPE_DENIED');
 assert.equal(reads.length,0);
});
test('B6 CUT02 non-array principal role is rejected before B3 can be tricked',async()=>{
 const{executor,reads}=rig({roles:'FAKE_OWNER_ROOT'});
 assert.equal((await executor.executeRead(scope)).reason,'OWNER_SCOPE_DENIED');
 assert.equal(reads.length,0);
});
test('B6 CUT02 no mutating operation can reach existing B3 through read executor',async()=>{
 const{executor,reads,events}=rig();
 assert.equal((await executor.executeRead({...scope,operation:'MUTATION'})).reason,'REQUEST_INVALID');
 assert.equal(reads.length,0);assert.deepEqual(events,[]);
});
