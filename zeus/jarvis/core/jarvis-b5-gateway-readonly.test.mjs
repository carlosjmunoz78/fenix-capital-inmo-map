import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB5GatewayReadOnly} from './jarvis-b5-gateway-readonly.mjs';
import {createJarvisB5GuardedPreview} from './jarvis-b5-guarded-preview.mjs';
import {compileJarvisB5Intent} from './jarvis-b5-intent.mjs';
import {adaptJarvisB5BrowserVoice} from './jarvis-b5-browser-voice-bridge.mjs';
import {createJarvisB5Dialogue} from './jarvis-b5-dialogue.mjs';
import {createJarvisB5ModelRouter} from './jarvis-b5-model-router.mjs';
const base={version:'B5_READONLY_V0',requestId:'request-1',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',
 environment:'LAB',sessionId:'session-1',token:'opaque-owner-token',channel:'TEXT',text:'Dime el estado'};
const local={id:'local-fixture',provider:'LOCAL',capabilities:['LANGUAGE'],estimatedEuroPerCall:0,healthy:true};
function setup({enabled=true,grant='ALLOW',tenant='fenix',rate=true,privacy='INTERNAL',router='LOCAL',audit=true}={}){
 const log=[];const controlStore={get:async ()=>{log.push('control');return {enabled,killSwitch:!enabled};}};
 const previewService=createJarvisB5GuardedPreview({
  identityProvider:{verify:async()=>{log.push('identity');return{ownerId:'owner-1',sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:[tenant]};}},
  controlStore,b3PolicyService:{authorize:async()=>{log.push('b3');return {decision:grant};}},
  auditStore:{append:async x=>{log.push(['audit',x]);return audit;}},
  compileIntent:compileJarvisB5Intent,adaptVoice:adaptJarvisB5BrowserVoice,
  dialogue:createJarvisB5Dialogue()
 });
 const modelRouter=router==='LOCAL'?createJarvisB5ModelRouter({catalog:[local]}):
  router==='MISSING'?createJarvisB5ModelRouter({catalog:[]}):
  {choose:async()=>({state:'ADAPTER_CANDIDATE',provider:'DEEPSEEK',executed:false,spentEuro:0})};
 const gateway=createJarvisB5GatewayReadOnly({
  controlStore,rateLimiter:{allow:async()=>{log.push('rate');return rate;}},
  previewService,privacyResolver:{classify:async()=>{log.push('privacy');return{privacy};}},
  modelRouter
 });return{gateway,log};
}
test('B5 CUT04 Gateway text invokes existing server compiler, never executes or bills',async()=>{
 const {gateway,log}=setup();const x=await gateway.handle(base);
 assert.equal(x.state,'PREVIEW_ONLY');assert.equal(x.routing,'LOCAL_CANDIDATE_NOT_EXECUTED');
 assert.equal(x.dialogueStatus,'NO_EVIDENCE');assert.equal(x.mayExecute,false);
 assert.equal(x.modelCalled,false);assert.equal(x.spentEuro,0);
 assert.ok(log.some(x=>Array.isArray(x)&&x[0]==='audit'));
});
test('B5 CUT04 Gateway final voice maps to same intent and response as text',async()=>{
 const {gateway}=setup();
 const t=await gateway.handle(base);
 const v=await gateway.handle({...base,channel:'VOICE_STT',isFinal:true,confidence:.97});
 assert.equal(v.intentKind,t.intentKind);assert.equal(v.answer,t.answer);
 assert.equal(v.routing,t.routing);
});
test('B5 CUT04 Gateway feature switch OFF denies before rate limit or identity',async()=>{
 const {gateway,log}=setup({enabled:false});
 const x=await gateway.handle({...base,enabled:true,killSwitch:false});
 assert.equal(x.reason,'FEATURE_OFF');assert.deepEqual(log,['control']);
});
test('B5 CUT04 Gateway denies missing token through B2 trusted identity boundary',async()=>{
 const {gateway}=setup();
 assert.equal((await gateway.handle({...base,token:null})).reason,'AUTH_REQUIRED');
});
test('B5 CUT04 Gateway ignores browser OWNER_ROOT claims; server cross-tenant denies',async()=>{
 const {gateway,log}=setup({tenant:'aion'});
 const x=await gateway.handle({...base,roles:['OWNER_ROOT'],authorizedCompanies:['fenix']});
 assert.equal(x.reason,'OWNER_SCOPE_DENIED');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway B3 deny stays fail-closed before provider routing',async()=>{
 const {gateway,log}=setup({grant:'DENY'});
 const x=await gateway.handle(base);
 assert.equal(x.reason,'B3_POLICY_DENIED');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway audit unavailable denies prior to provider candidate',async()=>{
 const {gateway,log}=setup({audit:false});
 const x=await gateway.handle(base);
 assert.equal(x.reason,'AUDIT_UNAVAILABLE');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway rate limit deny never reads identity or transcript downstream',async()=>{
 const {gateway,log}=setup({rate:false});
 assert.equal((await gateway.handle(base)).reason,'RATE_LIMITED');assert.deepEqual(log,['control','rate']);
});
test('B5 CUT04 Gateway refusal when privacy resolver cannot classify',async()=>{
 const {gateway}=setup({privacy:'NOT_CERTIFIED'});
 assert.equal((await gateway.handle(base)).reason,'PRIVACY_NOT_VERIFIED');
});
test('B5 CUT04 Gateway confidential data only yields zero-cost local candidate',async()=>{
 const {gateway}=setup({privacy:'CONFIDENTIAL'});
 const x=await gateway.handle(base);
 assert.equal(x.routing,'LOCAL_CANDIDATE_NOT_EXECUTED');assert.equal(x.spentEuro,0);
});
test('B5 CUT04 Gateway no local provider degrades without making up model answer',async()=>{
 const {gateway}=setup({router:'MISSING'});
 const x=await gateway.handle(base);
 assert.equal(x.routing,'NO_PROVIDER_FALLBACK');assert.equal(x.state,'PREVIEW_ONLY');assert.equal(x.modelCalled,false);
});
test('B5 CUT04 Gateway rejects a router offering unapproved DeepSeek',async()=>{
 const {gateway}=setup({router:'FORGED_PAID'});
 const x=await gateway.handle(base);
 assert.equal(x.reason,'ROUTER_CONTRACT_INVALID');assert.equal(x.spentEuro,0);
});
test('B5 CUT04 Gateway ignores client pay and vendor choices',async()=>{
 const {gateway}=setup({router:'MISSING'});
 const x=await gateway.handle({...base,allowPaid:true,maxCallEuro:50,provider:'DEEPSEEK'});
 assert.equal(x.routing,'NO_PROVIDER_FALLBACK');assert.equal(x.modelCalled,false);
});
test('B5 CUT04 Gateway no-confidence voice asks clarification before model routing',async()=>{
 const {gateway,log}=setup();
 const x=await gateway.handle({...base,channel:'VOICE_STT',isFinal:true,confidence:null});
 assert.equal(x.state,'CLARIFY');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway interim voice never triggers model routing',async()=>{
 const {gateway,log}=setup();
 const x=await gateway.handle({...base,channel:'VOICE_STT',isFinal:false,confidence:.99});
 assert.equal(x.state,'INTERIM_IGNORED');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway blocks voice confirmation before any provider routing',async()=>{
 const {gateway,log}=setup();
 const x=await gateway.handle({...base,channel:'VOICE_STT',isFinal:true,
  confidence:.95,text:'Sí adelante',pendingAction:true});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');assert.equal(log.includes('privacy'),false);
});
test('B5 CUT04 Gateway never logs raw text, session token or transcript',async()=>{
 const {gateway,log}=setup();await gateway.handle({...base,text:'Dime el estado de los expedientes secretos'});
 const a=JSON.stringify(log.filter(Array.isArray));
 assert.equal(a.includes('expedientes secretos'),false);assert.equal(a.includes('opaque-owner-token'),false);
});
test('B5 CUT04 Gateway refuses malformed company and client-controlled request versions',async()=>{
 const {gateway,log}=setup();
 assert.equal((await gateway.handle({...base,companyId:'*'})).reason,'REQUEST_INVALID');
 assert.equal((await gateway.handle({...base,version:'B5_WRITE_V1'})).reason,'REQUEST_INVALID');
 assert.deepEqual(log,[]);
});
test('B5 CUT04 Gateway always denies executable previews returned by untrusted dependency',async()=>{
 const gateway=createJarvisB5GatewayReadOnly({
  controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  rateLimiter:{allow:async()=>true},
  previewService:{preview:async()=>({state:'PREVIEW_ONLY',mayExecute:true,modelCalled:false,spentEuro:0})},
  privacyResolver:{classify:async()=>({privacy:'PUBLIC'})},modelRouter:{choose:async()=>({state:'DENY'})}
 });
 assert.equal((await gateway.handle(base)).reason,'PREVIEW_CONTRACT_INVALID');
});
