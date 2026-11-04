import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB8PortfolioSupervisor} from './jarvis-b8-portfolio-report.mjs';
const snap=(companyId,override={})=>({companyId,environment:'LAB',sourceState:'VERIFIED',
 observedAt:'2026-11-04T06:00:00Z',missionCounts:{running:1,pending:2,blocked:0,verified:3},
 incidents:0,observedCostEuro:0,evidenceRefs:['synthetic-evidence-01'],...override});
function rig(options={}){
 const calls=[];
 const ports={
  identityProvider:{verify:async t=>{calls.push(['identity']);return t==='valid'?
   {ownerId:'owner-1',roles:options.roles||['OWNER_ROOT'],authorizedCompanies:options.companies||['fenix','aion']}:
   {ownerId:'unknown',roles:[],authorizedCompanies:[]};}},
  companyRegistry:{resolve:async p=>{calls.push(['registry',p.companyId]);
   return {companyId:options.fakeRegistry?'foreign':p.companyId,environment:'LAB',
    verified:!options.unverified,status:'ACTIVE'};}},
  policy:{authorize:async p=>{calls.push(['policy',p.companyId]);return {decision:options.policyDenied?'DENY':'ALLOW'};}},
  supervisor:{inspect:async p=>{calls.push(['supervisor',p.companyId]);return {enabled:!options.killed,
   killSwitch:!!options.killed,halted:false,revoked:false,costEuro:0};}},
  observability:{readCompanySnapshot:async p=>{calls.push(['metrics',p.companyId]);
   if(options.sourceDown)throw Error('OUT');
   if(options.missing&&p.companyId==='aion')return {sourceState:'NOT_CONNECTED'};
   return snap(options.crossTenant?'foreign':p.companyId,options.override||{});}},
  audit:{append:async p=>{calls.push(['audit',p.companyId]);return !options.auditDenied;}}
 };
 return {engine:createJarvisB8PortfolioSupervisor(ports),calls};
}
const ask=x=>({token:'valid',companyIds:x||['fenix','aion']});
test('two verified company snapshots read with only evidenced metrics',async()=>{
 const x=rig(),r=await x.engine.report(ask());
 assert.equal(r.state,'LAB_PORTFOLIO_REPORT');assert.equal(r.measuredCompanyCount,2);
 assert.equal(r.companies[0].companyId,'fenix');assert.equal(r.companies[1].companyId,'aion');
 assert.equal(r.spentEuro,0);assert.equal(r.prodAuthorized,false);
});
test('disconnected company is marked missing; never given fabricated zero KPIs',async()=>{
 const r=await rig({missing:true}).engine.report(ask());
 assert.equal(r.state,'LAB_PORTFOLIO_REPORT');assert.equal(r.missingCompanyCount,1);
 assert.equal(r.companies[1].missionCounts,null);assert.equal(r.companies[1].observedCostEuro,null);
});
test('tenant outside owner scope denies before metrics',async()=>{
 const x=rig({companies:['fenix']}),r=await x.engine.report(ask());
 assert.equal(r.reason,'OWNER_COMPANY_SCOPE_DENIED');assert.equal(x.calls.some(c=>c[0]==='metrics'),false);
});
test('unknown token and non OWNER_ROOT are denied',async()=>{
 const x=rig({roles:['EMPLOYEE']});
 assert.equal((await x.engine.report(ask())).state,'DENY');
 assert.equal((await x.engine.report({token:'bad',companyIds:['fenix']})).state,'DENY');
});
test('registry substitution denies before metrics',async()=>{
 const x=rig({fakeRegistry:true});
 assert.equal((await x.engine.report(ask())).reason,'COMPANY_POLICY_OR_SUPERVISOR_DENIED');
 assert.equal(x.calls.some(c=>c[0]==='metrics'),false);
});
test('B3 denial and supervisor kill prevent cross-company reporting',async()=>{
 for(const flags of [{policyDenied:true},{killed:true}]){
  const x=rig(flags);assert.equal((await x.engine.report(ask())).state,'DENY');
  assert.equal(x.calls.some(c=>c[0]==='metrics'),false);
 }
});
test('duplicate or invalid company selection denied',async()=>{
 const x=rig();
 assert.equal((await x.engine.report(ask(['fenix','fenix']))).reason,'COMPANY_SELECTION_INVALID');
 assert.equal((await x.engine.report(ask([]))).reason,'COMPANY_SELECTION_INVALID');
});
test('untrusted telemetry companyId is hard privacy failure',async()=>{
 const x=rig({crossTenant:true}),r=await x.engine.report(ask());
 assert.equal(r.reason,'OBSERVABILITY_SCOPE_OR_EVIDENCE_INVALID');
});
test('negative or fake metrics fail without showing a report',async()=>{
 for(const override of [{missionCounts:{running:-1,pending:2,blocked:0,verified:1}},
  {evidenceRefs:[]},{observedCostEuro:-.1},{incidents:-1}]){
  const x=rig({override}),r=await x.engine.report(ask());
  assert.equal(r.reason,'OBSERVABILITY_SCOPE_OR_EVIDENCE_INVALID');
 }
});
test('source failure denies without inferring cost or financial figures',async()=>{
 const x=rig({sourceDown:true}),r=await x.engine.report(ask());
 assert.equal(r.reason,'OBSERVABILITY_UNAVAILABLE');
});
test('audit write failure prevents report delivery',async()=>{
 const x=rig({auditDenied:true}),r=await x.engine.report(ask());
 assert.equal(r.reason,'AUDIT_UNAVAILABLE');
});
test('B8 snapshot does not operate in production',async()=>{
 const x=rig(),r=await x.engine.report({...ask(),environment:'PROD'});
 assert.equal(r.reason,'PROD_NOT_CERTIFIED');assert.equal(x.calls.length,0);
});
