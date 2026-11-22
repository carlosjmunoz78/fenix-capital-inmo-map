import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCloudflareFactoryScaffold} from '../src/cloudflare-scaffold.mjs';
import {FACTORY_ARTIFACTS} from '../src/cloudflare-onboarding.mjs';
const base={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const make=(unit_type,unit_slug,required_resources)=>generateCloudflareFactoryScaffold({...base,unit_type,unit_slug,required_resources});
test('Factory generates all 18 actual schema files for Instagram department (NOT social platform connector)',()=>{
 const {plan,files,write_effects,cost_eur}=make('department','social-instagram',['compute','relational','async_jobs']);
 assert.equal(files.length,18);
 assert.equal(write_effects,0);assert.equal(cost_eur,0);
 assert.deepEqual(files.map(f=>f.path.split('/').at(-1)),FACTORY_ARTIFACTS.map(x=>x+'.json'));
 assert.equal(plan.resources.length,3);
 const m=JSON.parse(files.find(f=>f.path.endsWith('manifest.json')).content);
 assert.equal(m.unit_type,'department');assert.equal(m.id,'social-instagram');
 assert.ok(m.resources.every(r=>r.mode==='PLAN_ONLY'));
});
test('factory is identical for LinkedIn department, websites, companies and engines, no new server per unit',()=>{
 for(const [kind,slug,needs] of [
  ['department','social-linkedin',['compute','cache']],
  ['website','nueva-web',['website','objects']],
  ['company','otra-empresa',['compute','relational']],
  ['engine','backoffice',['compute']]
 ]){
  const result=make(kind,slug,needs);
  assert.equal(result.files.length,18);
  const conf=JSON.parse(result.files.find(f=>f.path.endsWith('config.json')).content);
  assert.equal(conf.deploy_enabled,false);assert.deepEqual(conf.public_routes,[]);assert.deepEqual(conf.schedules,[]);
  assert.equal(result.plan.new_server_per_engine,false);
 }
});
test('all generated artifacts use 4D scope, no secrets, paid resources, routes or PROD writes',()=>{
 const a=make('website','marketing-web',['website','private_access','cache']);
 const jsons=a.files.map(x=>JSON.parse(x.content));
 for(const j of jsons)assert.deepEqual(j.scope,base);
 const perm=jsons.find(x=>x.default==='DENY'&&Array.isArray(x.principals));
 assert.equal(perm.grants.length,0);
 const policy=jsons.find(x=>x.prod_writes===false);
 assert.equal(policy.unapproved_deletes,false);assert.equal(policy.free_plan_only,true);
 assert.equal(jsons.find(x=>x.additional_budget_eur===0).paid_services_enabled,false);
 const rollback=jsons.find(x=>x.policy==='REVERT_NEW_RESOURCES_ONLY_WHEN_OWNERSHIP_VERIFIED');
 assert.equal(rollback.tested,false);
 const text=JSON.stringify(jsons);
 assert.ok(!text.includes('Bearer '));assert.ok(!text.includes('BEGIN PRIVATE KEY'));
});
test('generator is deterministic and does not create file-system or remote resources',()=>{
 const a=make('department','social-instagram',['compute','relational']);
 const b=make('department','social-instagram',['compute','relational']);
 assert.deepEqual(a,b);assert.equal(a.status,'FILES_GENERATED_IN_MEMORY');
 assert.equal(a.write_effects,0);
});
