import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB6CapabilityPreflight} from './jarvis-b6-capability-preflight.mjs';
const base={token:'session',companyId:'fenix',environment:'LAB',sessionId:'s-1',missionId:'mission-1',capability:'SEO_READ'};
const entry=(id,route='API',more={})=>({id,route,companyId:'fenix',environment:'LAB',capability:'SEO_READ',isolation:'TENANT',
 enabled:true,estimatedEuro:0,dataBoundary:'LOCAL_PRIVATE',supportsRollback:true,...more});
const build=({entries=[entry('api-1'),entry('mcp-1','MCP'),entry('cli-1','CLI'),entry('browser-1','BROWSER')],
  tenant='fenix',role='OWNER_ROOT',grant='ALLOW',audit=true}={})=>{
 let calls=[];
 const p=createJarvisB6CapabilityPreflight({
  identityProvider:{verify:async()=>{calls.push('identity');return{ownerId:'owner',sessionId:'s-1',roles:[role],authorizedCompanies:[tenant]};}},
  policy:{authorize:async()=>{calls.push('policy');return{decision:grant};}},
  registry:{list:async()=>{calls.push('registry');return entries;}},
  audit:{append:async e=>{calls.push(['audit',e]);return audit;}}
 });
 return{p,calls};
};
test('B6 selects approved API over existing MCP, CLI and browser without executing',async()=>{
 const {p}=build();const r=await p.plan(base);assert.equal(r.state,'PLAN_ONLY_OFF');
 assert.equal(r.route,'API');assert.equal(r.executed,false);assert.equal(r.spentEuro,0);
});
test('B6 existing MCP preferred to CLI and Browser if API absent',async()=>{
 const {p}=build({entries:[entry('browser','BROWSER'),entry('cli','CLI'),entry('mcp','MCP')]});
 assert.equal((await p.plan(base)).route,'MCP');
});
test('B6 denies cross company spoof even with caller-chosen tenant',async()=>{
 const {p,calls}=build({tenant:'aion'});assert.equal((await p.plan(base)).reason,'OWNER_SCOPE_DENIED');
 assert.equal(calls.includes('registry'),false);
});
test('B6 refuses third party / cross-tenant options returned by catalog',async()=>{
 const {p}=build({entries:[entry('leak','API',{companyId:'aion'})]});
 assert.equal((await p.plan(base)).reason,'NO_SAFE_ZERO_COST_CAPABILITY');
});
test('B6 refuses paid connectors, including tiny metered charges',async()=>{
 const {p}=build({entries:[entry('paid','API',{estimatedEuro:.001})]});
 assert.equal((await p.plan(base)).reason,'NO_SAFE_ZERO_COST_CAPABILITY');
});
test('B6 rejects unisolated global connector for tenant-specific mission',async()=>{
 const {p}=build({entries:[entry('global','API',{isolation:'GLOBAL'})]});
 assert.equal((await p.plan(base)).reason,'NO_SAFE_ZERO_COST_CAPABILITY');
});
test('B6 confidential content never routed to a remote browser adapter',async()=>{
 const {p}=build({entries:[entry('remote','BROWSER',{dataBoundary:'REMOTE'})]});
 assert.equal((await p.plan({...base,privacy:'CONFIDENTIAL'})).reason,'NO_SAFE_ZERO_COST_CAPABILITY');
});
test('B6 requires B3 read grant for tool selection',async()=>{
 const {p,calls}=build({grant:'DENY'});assert.equal((await p.plan(base)).reason,'B3_POLICY_DENIED');
 assert.equal(calls.includes('registry'),false);
});
test('B6 requires reversible mutation plan and no immediate execution',async()=>{
 const {p}=build();
 assert.equal((await p.plan({...base,operation:'MUTATION'})).reason,'MUTATION_CONTRACT_INCOMPLETE');
 const r=await p.plan({...base,operation:'MUTATION',idempotencyKey:'key1',rollbackRef:'rollback1'});
 assert.equal(r.state,'PLAN_ONLY_OFF');assert.equal(r.requiresReversibleExecution,true);assert.equal(r.executed,false);
});
test('B6 refuses mutable adapter with no rollback support',async()=>{
 const {p}=build({entries:[entry('danger','API',{supportsRollback:false})]});
 const r=await p.plan({...base,operation:'MUTATION',idempotencyKey:'key1',rollbackRef:'rollback1'});
 assert.equal(r.reason,'NO_SAFE_ZERO_COST_CAPABILITY');
});
test('B6 no audit means no capability plan released',async()=>{
 const {p}=build({audit:false});assert.equal((await p.plan(base)).reason,'AUDIT_UNAVAILABLE');
});
test('B6 private audit never contains bearer token, arbitrary inputs or secrets',async()=>{
 const {p,calls}=build();await p.plan({...base,token:'never-log-this'});
 const logs=JSON.stringify(calls.filter(Array.isArray));assert.equal(logs.includes('never-log-this'),false);
});
test('B6 invalid company id fails before any trusted external adapter',async()=>{
 const {p,calls}=build();assert.equal((await p.plan({...base,companyId:'*'})).reason,'REQUEST_INVALID');
 assert.deepEqual(calls,[]);
});
