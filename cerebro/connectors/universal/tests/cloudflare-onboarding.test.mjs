import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudflareOnboardingPlan,reconcileCloudflareOnboarding,
  CLOUDFLARE_ACCOUNT_ID,FACTORY_ARTIFACTS} from '../src/cloudflare-onboarding.mjs';

const basic={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const build=(unit_type,unit_slug,required_resources)=>createCloudflareOnboardingPlan({...basic,unit_type,unit_slug,required_resources});

test('Instagram CEREBRO department is internal infrastructure, not a social API connection',()=>{
 const p=build('department','social-instagram',['compute','relational','async_jobs']);
 assert.equal(p.unit.slug,'social-instagram');assert.equal(p.unit.type,'department');
 assert.deepEqual(p.resources.map(x=>x.type),['compute','relational','async_jobs']);
 assert.equal(p.external_social_network_authorization_required,false);
 assert.equal(p.shared_runtime,true);assert.equal(p.new_server_per_engine,false);
 assert.equal(p.provider_writes_enabled,false);assert.equal(p.status,'DEFINED_NOT_DEPLOYED');
 assert.ok(p.resources.every(r=>r.ownership.company_id==='fenix-capital'&&r.ownership.engine_id==='FACT-001'));
 assert.ok(p.resources.every(r=>r.name.endsWith('-worker')||r.name.endsWith('-relational')||r.name.endsWith('-async-jobs')));
});
test('LinkedIn CEREBRO department is reproducible with a separate identity and no external platform assumptions',()=>{
 const p=build('department','social-linkedin',['cache','compute']);
 assert.deepEqual(p.resources.map(x=>x.type),['compute','cache']);
 assert.equal(p.resources.length,2);
 assert.equal(p.resources[0].ownership.unit_slug,'social-linkedin');
 assert.equal(p.additional_cost_ceiling_eur,0);
});
test('a website can request Pages, Worker, object storage and access without touching DNS',()=>{
 const p=build('website','nueva-web',['website','objects','private_access']);
 assert.deepEqual(p.resources.map(x=>x.provider),['pages','r2','access']);
 assert.equal(p.website_domain_binding,'DISABLED_UNTIL_OWNERSHIP_AND_DNS_ROLLBACK');
 assert.equal(p.provider_writes_enabled,false);
});
test('other engines and new companies use the same 18-artifact factory and resources on demand',()=>{
 const a=build('engine','crm-importer',['compute']);
 const b=createCloudflareOnboardingPlan({...basic,company_id:'otraempresa',unit_type:'company',unit_slug:'knowledge',required_resources:['compute','relational','cache']});
 assert.equal(a.resources.length,1);assert.equal(b.resources.length,3);
 assert.equal(FACTORY_ARTIFACTS.length,18);
 assert.deepEqual(b.artifact_scaffold,[...FACTORY_ARTIFACTS]);
 assert.ok(b.resources.every(x=>x.ownership.company_id==='otraempresa'));
});
test('reconcile requires trusted account inventory before provisioning',()=>{
 const p=build('department','social-instagram',['compute','cache']);
 assert.throws(()=>reconcileCloudflareOnboarding(p,{}),/TRUSTED_PROVIDER_INVENTORY_REQUIRED/);
 const r=reconcileCloudflareOnboarding(p,{verified:true,account_id:CLOUDFLARE_ACCOUNT_ID,resources:[]});
 assert.equal(r.status,'PLAN_RECONCILED');assert.equal(r.may_execute,false);
 assert.ok(r.resources.every(x=>x.state==='CREATE_CANDIDATE'));
});
test('owned resources are reused and resources belonging to others are blocked',()=>{
 const p=build('department','social-linkedin',['compute']);
 const r=p.resources[0];
 const owner={verified:true,account_id:CLOUDFLARE_ACCOUNT_ID,resources:[{type:r.type,name:r.name,ownership:r.ownership,account_id:CLOUDFLARE_ACCOUNT_ID}]};
 const x=reconcileCloudflareOnboarding(p,owner);
 assert.equal(x.resources[0].state,'REUSE_OWNED');
 const conflict={...owner,resources:[{...owner.resources[0],ownership:{...r.ownership,company_id:'competitor'}}]};
 const y=reconcileCloudflareOnboarding(p,conflict);
 assert.equal(y.status,'BLOCKED');
 assert.equal(y.resources[0].state,'BLOCKED_EXISTING_RESOURCE');
});
test('rejects ambiguous inventory, malicious names and implied production permissions',()=>{
 const p=build('website','site-nuevo',['website']);
 const f=p.resources[0];
 const duplicated={verified:true,account_id:CLOUDFLARE_ACCOUNT_ID,resources:[{type:f.type,name:f.name},{type:f.type,name:f.name}]};
 assert.equal(reconcileCloudflareOnboarding(p,duplicated).resources[0].state,'BLOCKED_AMBIGUOUS_INVENTORY');
 for(const attempt of [
  {...basic,unit_type:'department',unit_slug:'../../etc',required_resources:['compute']},
  {...basic,company_id:'fenix/../',unit_type:'engine',unit_slug:'foo',required_resources:['compute']},
  {...basic,unit_type:'website',unit_slug:'foo',required_resources:['relational']},
  {...basic,unit_type:'department',unit_slug:'foo',required_resources:['secret-api-token']},
  {...basic,unit_type:'department',unit_slug:'foo',required_resources:['compute','compute']},
  {...basic,unit_type:'department',unit_slug:'foo',required_resources:['compute'],domain:'app.fenixcapital.es'},
 ])assert.throws(()=>createCloudflareOnboardingPlan(attempt));
});
test('PROD is a planning context only, never a permission to change resources',()=>{
 const p=createCloudflareOnboardingPlan({...basic,environment:'PROD',unit_type:'website',unit_slug:'web-fenix',required_resources:['website']});
 assert.equal(p.provider_writes_enabled,false);
 assert.equal(p.resources[0].mode,'PLAN_ONLY');
 assert.equal(p.additional_cost_ceiling_eur,0);
});
