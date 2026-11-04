import test from 'node:test';import assert from 'node:assert/strict';
import {decideJarvisB9Recovery as decide} from './jarvis-b9-resilience-decision.mjs';
const base={companyId:'fenix',environment:'LAB',missionId:'mission-1',failureClass:'NETWORK',consecutiveSameFamily:1};
test('B9 classifies low-risk deterministic retry but never performs it',()=>{
 const x=decide(base);assert.equal(x.decision,'CANDIDATE_ONLY');assert.equal(x.executed,false);assert.equal(x.retried,false);
});
test('B9 three failures of same family terminate retry strategy',()=>{
 assert.equal(decide({...base,consecutiveSameFamily:3}).reason,'ANTI_LOOP_REEVALUATE_CAUSE');
 assert.equal(decide({...base,consecutiveSameFamily:20}).decision,'STOP');
});
test('B9 no credential retry on invalid auth, even below three failures',()=>{
 for(const failureClass of ['AUTH','CREDENTIALS','POLICY','PERMISSIONS'])
 assert.equal(decide({...base,failureClass}).reason,'REVALIDATE_IDENTITY_OR_POLICY');
});
test('B9 never retries unknown unclassified failure',()=>{
 assert.equal(decide({...base,failureClass:'UNKNOWN'}).reason,'CLASSIFY_FAILURE_BEFORE_RETRY');
});
test('B9 no money spending on unexpected retry regardless of prior owner permissions',()=>{
 assert.equal(decide({...base,estimatedExtraEuro:.0001}).reason,'ZERO_NEW_COST_GUARD');
});
test('B9 stops mutable task without atomic idempotency and rollback',()=>{
 assert.equal(decide({...base,operation:'MUTATION'}).reason,'MUTATION_RETRY_REQUIRES_IDEMPOTENCY_AND_ROLLBACK');
});
test('B9 complete mutation contract is still only a candidate decision',()=>{
 const r=decide({...base,operation:'MUTATION',idempotencyKey:'unique-1',rollbackRef:'rollback-1'});
 assert.equal(r.decision,'CANDIDATE_ONLY');assert.equal(r.retried,false);
});
test('B9 security incident always emits HUMAN_REQUIRED',()=>{
 assert.equal(decide({...base,exceptionCode:'SECURITY_INCIDENT'}).decision,'HUMAN_REQUIRED');
});
test('B9 explicit money limit or signature goes to human, never to fallback connector',()=>{
 for(const exceptionCode of ['MONEY_LIMIT','SIGNATURE_REQUIRED','LEGAL_REQUIRED','HIGH_RISK'])
 assert.equal(decide({...base,exceptionCode}).reason,exceptionCode);
});
test('B9 malformed tenant, environment, or failure class is denied',()=>{
 assert.equal(decide({...base,companyId:'*'}).decision,'STOP');
 assert.equal(decide({...base,environment:'INVALID'}).reason,'REQUEST_INVALID');
 assert.equal(decide({...base,failureClass:'MAGIC'}).decision,'STOP');
});
test('B9 rejects negative and nonfinite cost, including NaN',()=>{
 assert.equal(decide({...base,estimatedExtraEuro:NaN}).reason,'REQUEST_INVALID');
 assert.equal(decide({...base,estimatedExtraEuro:-.01}).reason,'REQUEST_INVALID');
});
test('B9 decision carries no secret, token, transcripts or personal content',()=>{
 const result=decide({...base});assert.equal(Object.keys(result).includes('token'),false);
 assert.equal(result.spentEuro,0);
});
