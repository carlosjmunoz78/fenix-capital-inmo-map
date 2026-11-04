import test from 'node:test';import assert from 'node:assert/strict';
import {createJarvisB5ModelRouter as make} from './jarvis-b5-model-router.mjs';
const local={id:'local-fixture',provider:'LOCAL',capabilities:['LANGUAGE','REASONING','VOICE_STT'],estimatedEuroPerCall:0,healthy:true};
const deepseek={id:'deepseek-fixture',provider:'DEEPSEEK',capabilities:['LANGUAGE','REASONING'],estimatedEuroPerCall:0.03,healthy:true};
const qa={companyId:'fenix',environment:'LAB',capability:'LANGUAGE'};
const proof={verified:true,provider:'DEEPSEEK',currency:'EUR',availableEuro:20,companyId:'fenix',environment:'LAB',checkedAt:new Date().toISOString()};
const store={getVerifiedSpend:async()=>({verified:true,spentEuro:1,companyId:'fenix',environment:'LAB'}),reserveAtomically:async()=>{throw Error('MUST_NOT_RESERVE_IN_PREVIEW')}};
test('B5 deterministic router never invokes paid model if local capability is healthy',async()=>{
 const r=await make({catalog:[deepseek,local]}).choose({...qa,allowPaid:true,maxCallEuro:1});
 assert.equal(r.provider,'LOCAL');assert.equal(r.executed,false);assert.equal(r.spentEuro,0);
});
test('B5 DeepSeek requested without verified balance is denied, no guessed credit',async()=>{
 const r=await make({catalog:[deepseek]}).choose({...qa,allowPaid:true,maxCallEuro:1});
 assert.equal(r.reason,'BALANCE_NOT_VERIFIED');
});
test('B5 pre-paid model requires explicit paid opt in',async()=>{
 const r=await make({catalog:[deepseek],balanceProof:proof,budgetStore:store}).choose({...qa,maxCallEuro:1});
 assert.equal(r.reason,'PAID_MODEL_OPT_IN_REQUIRED');
});
test('B5 paid preview needs atomic spending gate before any candidate is returned',async()=>{
 const r=await make({catalog:[deepseek],balanceProof:proof}).choose({...qa,allowPaid:true,maxCallEuro:1});
 assert.equal(r.reason,'ATOMIC_SPEND_GUARD_MISSING');
});
test('B5 paid routing never automatically charges nor reserves credits',async()=>{
 const r=await make({catalog:[deepseek],balanceProof:proof,budgetStore:store}).choose({...qa,allowPaid:true,maxCallEuro:1});
 assert.equal(r.state,'PAID_CANDIDATE_NOT_EXECUTED');
 assert.equal(r.executed,false);assert.equal(r.spentEuro,0);
 assert.equal(r.requiresAtomicReservation,true);
});
test('B5 data classified confidential never leaves local model selection',async()=>{
 const r=await make({catalog:[deepseek],balanceProof:proof,budgetStore:store})
 .choose({...qa,privacy:'CONFIDENTIAL',allowPaid:true,maxCallEuro:1});
 assert.equal(r.reason,'NO_PRIVATE_PROVIDER');
});
test('B5 restricted data likewise never routed externally',async()=>{
 const r=await make({catalog:[deepseek]}).choose({...qa,privacy:'RESTRICTED',allowPaid:true,maxCallEuro:1});
 assert.equal(r.state,'DENY');
});
test('B5 certified balance and spend cannot exceed absolute owner ceiling 50 euros',()=>{
 assert.throws(()=>make({catalog:[deepseek],hardCeilingEuro:50.01}),/HARD_CEILING_EXCEEDS_MANDATE/);
});
test('B5 hard-stop on per-call max and remaining verified spend limit',async()=>{
 const router=make({catalog:[deepseek],balanceProof:proof,budgetStore:{...store,getVerifiedSpend:async()=>({verified:true,spentEuro:19.99,companyId:'fenix',environment:'LAB'})}});
 assert.equal((await router.choose({...qa,allowPaid:true,maxCallEuro:1})).reason,'COST_HARD_STOP');
 assert.equal((await router.choose({...qa,allowPaid:true,maxCallEuro:0.001})).reason,'COST_HARD_STOP');
});
test('B5 spend read unavailable fails closed and never falls back to spending',async()=>{
 const router=make({catalog:[deepseek],balanceProof:proof,budgetStore:{...store,getVerifiedSpend:async()=>{throw Error('DB_DOWN')}}});
 assert.equal((await router.choose({...qa,allowPaid:true,maxCallEuro:1})).reason,'SPEND_READ_UNAVAILABLE');
});
test('B5 cannot infer safe spend from unverified ledger',async()=>{
 const router=make({catalog:[deepseek],balanceProof:proof,budgetStore:{...store,getVerifiedSpend:async()=>({verified:false,spentEuro:0,companyId:'fenix',environment:'LAB'})}});
 assert.equal((await router.choose({...qa,allowPaid:true,maxCallEuro:1})).reason,'SPEND_NOT_VERIFIED');
});
test('B5 unsupported external paid provider is denied even with verified DeepSeek balance',async()=>{
 const ext={id:'external',provider:'EXTERNAL',capabilities:['LANGUAGE'],estimatedEuroPerCall:0.01,healthy:true};
 const router=make({catalog:[ext],balanceProof:proof,budgetStore:store});
 assert.equal((await router.choose({...qa,allowPaid:true,maxCallEuro:1})).reason,'EXTERNAL_PROVIDER_NOT_AUTHORIZED');
});
test('B5 rejects malformed provider catalog and duplicate ids',()=>{
 assert.throws(()=>make({catalog:[local,{...local}]}),/CATALOG_ID_INVALID/);
 assert.throws(()=>make({catalog:[{...local,estimatedEuroPerCall:-1}]}),/CATALOG_PROVIDER_INVALID/);
});
test('B5 rejects impossible request context',async()=>{
 const r=await make({catalog:[local]}).choose({...qa,companyId:'*'});
 assert.equal(r.reason,'REQUEST_INVALID');
});
test('B5 provider unavailable returns denial; model ID is never invented',async()=>{
 const r=await make({catalog:[{...local,healthy:false}]}).choose({...qa});
 assert.equal(r.state,'DENY');
});

test('B5 never accidentally selects cheap unapproved provider ahead of DeepSeek',async()=>{
 const ext={id:'unapproved',provider:'EXTERNAL',capabilities:['LANGUAGE'],estimatedEuroPerCall:0,healthy:true};
 const router=make({catalog:[ext,deepseek],balanceProof:proof,budgetStore:store});
 const r=await router.choose({...qa,allowPaid:true,maxCallEuro:1});
 assert.equal(r.provider,'DEEPSEEK');assert.equal(r.modelId,'deepseek-fixture');assert.equal(r.executed,false);
});
test('B5 DeepSeek is never misrepresented as a native speech-to-text or text-to-speech engine',()=>{
 assert.throws(()=>make({catalog:[{...deepseek,capabilities:['VOICE_TTS']}]}),/DEEPSEEK_SPEECH_UNSUPPORTED/);
 assert.throws(()=>make({catalog:[{...deepseek,capabilities:['VOICE_STT']}]}),/DEEPSEEK_SPEECH_UNSUPPORTED/);
});
