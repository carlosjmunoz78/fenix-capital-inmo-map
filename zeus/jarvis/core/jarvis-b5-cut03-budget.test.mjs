import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB5ModelRouter} from './jarvis-b5-model-router.mjs';
const local=(cost=0)=>({id:'local-fixture',provider:'LOCAL',capabilities:['LANGUAGE'],estimatedEuroPerCall:cost,healthy:true});
const deepseek={id:'deepseek-fixture',provider:'DEEPSEEK',capabilities:['LANGUAGE'],estimatedEuroPerCall:.01,healthy:true};
const request={companyId:'fenix',environment:'LAB',capability:'LANGUAGE',maxCallEuro:.5,allowPaid:true};
const proof={verified:true,currency:'EUR',availableEuro:4,companyId:'fenix',environment:'LAB',checkedAt:new Date().toISOString()};
const budgetStore={getVerifiedSpend:async()=>({verified:true,spentEuro:.25,companyId:'fenix',environment:'LAB'}),reserveAtomically:async()=>{throw Error('NO_RESERVE_IN_PREVIEW');}};
test('B5 CUT03 nonzero local marginal cost is not a free provider',async()=>{
 const x=await createJarvisB5ModelRouter({catalog:[local(.01)]}).choose({...request,maxCallEuro:0});
 assert.equal(x.state,'DENY');assert.equal(x.reason,'LOCAL_COST_NOT_ZERO_VERIFIED');
});
test('B5 CUT03 certified zero-cost local stays preferred over paid model',async()=>{
 const x=await createJarvisB5ModelRouter({catalog:[local(),deepseek],balanceProof:proof,budgetStore}).choose(request);
 assert.equal(x.provider,'LOCAL');assert.equal(x.executed,false);assert.equal(x.spentEuro,0);
});
test('B5 CUT03 stale paid provider credit must not authorize even preview',async()=>{
 const p={...proof,checkedAt:'2024-01-01T00:00:00.000Z'};
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:p,budgetStore}).choose(request);
 assert.equal(x.reason,'BALANCE_NOT_VERIFIED');assert.equal(x.executed,false);
});
test('B5 CUT03 future-dated credit proof must not be trusted',async()=>{
 const p={...proof,checkedAt:'2099-01-01T00:00:00.000Z'};
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:p,budgetStore}).choose(request);
 assert.equal(x.reason,'BALANCE_NOT_VERIFIED');
});
test('B5 CUT03 another company cannot reuse valid company credit balance',async()=>{
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:{...proof,companyId:'aion'},budgetStore}).choose(request);
 assert.equal(x.reason,'BALANCE_NOT_VERIFIED');
});
test('B5 CUT03 another environment cannot reuse approved proof',async()=>{
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:{...proof,environment:'PROD'},budgetStore}).choose(request);
 assert.equal(x.reason,'BALANCE_NOT_VERIFIED');
});
test('B5 CUT03 spend ledger cross-tenant spoof is rejected',async()=>{
 const s={...budgetStore,getVerifiedSpend:async()=>({verified:true,spentEuro:0,companyId:'aion',environment:'LAB'})};
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:proof,budgetStore:s}).choose(request);
 assert.equal(x.reason,'SPEND_NOT_VERIFIED');
});
test('B5 CUT03 production preview cannot inherit LAB ledger',async()=>{
 const s={...budgetStore,getVerifiedSpend:async()=>({verified:true,spentEuro:0,companyId:'fenix',environment:'LAB'})};
 const p={...proof,environment:'PROD'};
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:p,budgetStore:s}).choose({...request,environment:'PROD'});
 assert.equal(x.reason,'SPEND_NOT_VERIFIED');
});
test('B5 CUT03 paid model with valid budget remains only a nonexecuting preview',async()=>{
 const x=await createJarvisB5ModelRouter({catalog:[deepseek],balanceProof:proof,budgetStore}).choose(request);
 assert.equal(x.state,'PAID_CANDIDATE_NOT_EXECUTED');assert.equal(x.requiresAtomicReservation,true);
 assert.equal(x.executed,false);assert.equal(x.spentEuro,0);
});
