import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeJarvisAction} from './jarvis-b3-authorization-policy.mjs';
const principal={ownerId:'zeus-owner-001',sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
const context={companyId:'fenix',environment:'LAB'};
const grant={grantId:'grant-01',ownerId:'zeus-owner-001',companyId:'fenix',environment:'LAB',
 active:true,revoked:false,expiresAt:20000,actions:['STATUS','UPDATE'],maxCost:0,allowMutations:false};
const action={name:'STATUS',estimatedCost:0,mutating:false};
const check=(v={})=>authorizeJarvisAction({principal,context,grant,action,now:1000,...v});
test('B3 permits only explicitly scoped, active server grant',()=>assert.equal(check().decision,'ALLOW'));
test('B3 refuses missing/revoked/expired owner grants and forged role',()=>{
 for(const replacement of [null,{...grant,active:false},{...grant,revoked:true},{...grant,expiresAt:1000},{...grant,ownerId:'someone-else'}]){
  assert.equal(check({grant:replacement}).decision,'DENY');
 }
 assert.equal(check({principal:{...principal,roles:['VIEWER']}}).decision,'DENY');
});
test('B3 never crosses companies or environments',()=>{
 assert.equal(check({context:{companyId:'aion',environment:'LAB'}}).decision,'DENY');
 assert.equal(check({context:{companyId:'fenix',environment:'PROD'}}).decision,'DENY');
});
test('B3 kill switch blocks all operations',()=>assert.deepEqual(check({killSwitch:true}),{decision:'DENY',reason:'KILL_SWITCH'}));
test('B3 real risk and money exceptions remain human-controlled',()=>{
 const examples=[
 [{...action,legalRequired:true},'LEGAL_REQUIRED'],
 [{...action,signatureRequired:true},'SIGNATURE_REQUIRED'],
 [{...action,estimatedCost:0.01},'MONEY_LIMIT'],
 [{...action,highRisk:true},'HIGH_RISK'],
 [{...action,securityIncident:true},'SECURITY_INCIDENT'],
 [{...action,confidence:0.3},'LOW_CONFIDENCE'],
 [{...action,mutating:true},'HIGH_RISK']
 ];
 for(const [candidate,reason] of examples)assert.deepEqual(check({action:candidate}),{decision:'HUMAN_REQUIRED',reason});
});
test('B3 rejects malformed cost and cannot obtain mutations via caller input',()=>{
 assert.equal(check({action:{...action,estimatedCost:-1}}).decision,'DENY');
 assert.equal(check({action:{...action,estimatedCost:NaN}}).decision,'DENY');
 assert.equal(check({action:{...action,name:'UNLISTED'}}).decision,'DENY');
});
