import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileJarvisB10ReadonlyObservations as reconcile} from './jarvis-b10-external-read-reconciler.mjs';
const NOW='2026-11-04T08:30:00.000Z',SHA_MAIN='3f06b8bbe92a12572329b05a27d1243335c2756f';
const P={
 SUPABASE_PROJECT_STATUS:'SUPABASE_CONTROL_PLANE',
 EDGE_FUNCTION_DEPLOYED:'SUPABASE_CONTROL_PLANE',
 B3_PROD_CONTROL:'SUPABASE_SQL_READONLY',
 B4_PROD_CONTROL:'SUPABASE_SQL_READONLY',
 COMPANY_REGISTRY_PREPROD_COUNT:'SUPABASE_SQL_READONLY',
 GITHUB_MAIN_HEAD:'GITHUB_READONLY',
 GITHUB_B10_HEAD:'GITHUB_READONLY',
 PUBLIC_APP_SOURCE_SHA_ATTEMPT:'PUBLIC_HTTP_READONLY',
 BROWSER_SESSION_ATTEMPT:'USER_BROWSER_READONLY'
};
const obs=(kind,status,extra={})=>({
 kind,source:P[kind],companyId:'fenix',environment:'PROD',
 reference:'ref-'+kind,observedAt:NOW,status,...extra
});
const sample=()=>[
 obs('SUPABASE_PROJECT_STATUS','ACTIVE_HEALTHY'),
 obs('EDGE_FUNCTION_DEPLOYED','ACTIVE',{reference:'fenix-app-gateway'}),
 obs('EDGE_FUNCTION_DEPLOYED','ACTIVE',{reference:'jarvis-orchestrator-v0'}),
 obs('B3_PROD_CONTROL','DISABLED_KILLSWITCH_ON'),
 obs('B4_PROD_CONTROL','DISABLED_KILLSWITCH_ON'),
 obs('COMPANY_REGISTRY_PREPROD_COUNT','EMPTY',{environmentScope:'PREPROD',value:0}),
 obs('GITHUB_MAIN_HEAD','KNOWN_COMMIT_SHA',{value:SHA_MAIN}),
 obs('PUBLIC_APP_SOURCE_SHA_ATTEMPT','NOT_ACCESSIBLE'),
 obs('BROWSER_SESSION_ATTEMPT','UNREACHABLE')
];
const run=(overrides={})=>reconcile({companyId:'fenix',observedAt:NOW,observations:sample(),...overrides});
test('B10 live-style read-only observations never become certification',()=>{
 const r=run();assert.equal(r.state,'NO_GO');
 assert.equal(r.verifiedExternallyReadCount,9);
 assert.equal(r.rejectedObservationIndices.length,0);
 assert.equal(r.certified,false);assert.equal(r.productionAuthorized,false);
 assert.equal(r.canActivate,false);assert.equal(r.costEuro,0);
 assert.equal(r.b10Assessment.state,'NO_GO');
});
test('B10 active Edge Function is deployment metadata only, not Gateway health',()=>{
 const r=run();
 const edge=r.externalReadObservations.filter(x=>x.kind==='EDGE_FUNCTION_DEPLOYED');
 assert.equal(edge.length,2);
 assert.equal(edge.every(x=>x.deploymentOnly&&x.prodOperationVerified===false),true);
 assert.equal(r.blockers.includes('GATEWAY_HEALTH_AUTHENTICATED_NOT_ATTESTED'),true);
});
test('B10 PROD control disabled remains NO_GO even with apparently healthy Supabase project',()=>{
 const r=run();assert.equal(r.b10Assessment.reason,'LIVE_PRODUCTION_CONTROLS_NOT_ENABLED');
 assert.equal(r.externalReadObservations.find(x=>x.kind==='SUPABASE_PROJECT_STATUS').status,'ACTIVE_HEALTHY');
 assert.equal(r.externalReadObservations.find(x=>x.kind==='B3_PROD_CONTROL').status,'DISABLED_KILLSWITCH_ON');
});
test('B10 current PREPROD company registry zero is not evidence of global absence of companies',()=>{
 const r=run();
 const c=r.externalReadObservations.find(x=>x.kind==='COMPANY_REGISTRY_PREPROD_COUNT');
 assert.equal(c.scope,'PREPROD');assert.equal(c.count,0);
 assert.equal(c.prodOperationVerified,false);
});
test('B10 cross-company observation cannot pollute Fenix report',()=>{
 const obsx=sample().map(x=>({...x,companyId:'aion'}));
 const r=run({observations:obsx});
 assert.equal(r.verifiedExternallyReadCount,0);
 assert.equal(r.rejectedObservationIndices.length,obsx.length);
});
test('B10 source authority must match observation kind',()=>{
 const data=sample();data[0]={...data[0],source:'USER_SELF_REPORT'};
 const r=run({observations:data});
 assert.equal(r.verifiedExternallyReadCount,8);
 assert.deepEqual(r.rejectedObservationIndices,[0]);
});
test('B10 injected extra tokens or secrets are denied without being returned',()=>{
 const data=sample();data[1]={...data[1],authToken:'synthetic-secret'};
 const r=run({observations:data});
 assert.deepEqual(r.rejectedObservationIndices,[1]);
 assert.equal(JSON.stringify(r).includes('synthetic-secret'),false);
});
test('B10 a forged ACTIVE B3 observation cannot flip control enabled',()=>{
 const data=sample();data[3]={...data[3],status:'ACTIVE',value:true};
 const r=run({observations:data});
 assert.deepEqual(r.rejectedObservationIndices,[3]);
 assert.equal(r.b10Assessment.reason,'LIVE_PRODUCTION_CONTROLS_NOT_ENABLED');
});
test('B10 project ACTIVE does not prove PROD runtime operational',()=>{
 const r=run({observations:[obs('SUPABASE_PROJECT_STATUS','ACTIVE_HEALTHY')]});
 assert.equal(r.certified,false);assert.equal(r.b10Assessment.evidenceMetadataComplete,false);
});
test('B10 reject fake public SHA success instead of calling it deployed proof',()=>{
 const data=[obs('PUBLIC_APP_SOURCE_SHA_ATTEMPT','ACTIVE',{value:SHA_MAIN})];
 const r=run({observations:data});
 assert.equal(r.verifiedExternallyReadCount,0);assert.equal(r.rejectedObservationIndices.length,1);
});
test('B10 future and stale observations are invalid',()=>{
 const data=[obs('SUPABASE_PROJECT_STATUS','ACTIVE_HEALTHY',{observedAt:'2026-11-02T08:30:00.000Z'}),
 obs('B3_PROD_CONTROL','DISABLED_KILLSWITCH_ON',{observedAt:'2026-11-04T09:45:00.000Z'})];
 const r=run({observations:data});
 assert.equal(r.verifiedExternallyReadCount,0);assert.equal(r.rejectedObservationIndices.length,2);
});
test('B10 duplicate observation claims are not counted twice',()=>{
 const data=sample();data.push({...data[1]});
 const r=run({observations:data});
 assert.equal(r.verifiedExternallyReadCount,9);
 assert.deepEqual(r.rejectedObservationIndices,[9]);
});
test('B10 GITHUB sha must be exact 40 lower-case hex, never user text',()=>{
 for(const value of ['../../main','GHI','f'.repeat(39),'z'.repeat(40)]){
  const r=run({observations:[obs('GITHUB_MAIN_HEAD','KNOWN_COMMIT_SHA',{value})]});
  assert.deepEqual(r.rejectedObservationIndices,[0]);
 }
});
test('B10 unknown vendor and unknown kind cannot become trusted',()=>{
 const r=run({observations:[
  {kind:'EVIL_OVERRIDE',source:'SUPABASE_CONTROL_PLANE',companyId:'fenix',
   environment:'PROD',reference:'attack',observedAt:NOW,status:'ACTIVE_HEALTHY'}
 ]});
 assert.deepEqual(r.rejectedObservationIndices,[0]);
});
test('B10 malformed input shape stops fail closed',()=>{
 for(const overrides of [{companyId:'*'},{observations:{}},{observedAt:'yesterday'},
  {observations:new Array(101).fill({})}]){
  const r=run(overrides);
  assert.equal(r.reason,'REQUEST_INVALID');
 }
});
test('B10 deterministic snapshot hashing is only fingerprint, not signed proof',()=>{
 const a=run(),b=run();assert.equal(a.fingerprintNotAuthentication,b.fingerprintNotAuthentication);
 assert.match(a.fingerprintNotAuthentication,/^[a-f0-9]{64}$/);
 assert.equal(a.productionAuthorized,false);
});
test('B10 raw contact records not accepted, logging strips to metadata only',()=>{
 const r=run({observations:[obs('SUPABASE_PROJECT_STATUS','ACTIVE_HEALTHY',
  {customers:[{name:'PRIVATE'}]})]});
 assert.equal(r.verifiedExternallyReadCount,0);assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
});
test('B10 domain-specific PROD operation spoof cannot be claimed from read-only SQL',()=>{
 const r=run({observations:[obs('B4_PROD_CONTROL','DISABLED_KILLSWITCH_ON',
  {classification:'PROD_OPERATION_VERIFIED'})]});
 assert.deepEqual(r.rejectedObservationIndices,[0]);
 assert.equal(r.productionAuthorized,false);
});
