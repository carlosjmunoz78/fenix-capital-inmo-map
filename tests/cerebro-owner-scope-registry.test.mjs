import {test} from "node:test";
import assert from "node:assert/strict";
import {listOwnerRegisteredScopes} from "../cerebro/ops/gateway-v36-followups/owner_scope_registry.ts";

const registry=[
 {company_id:"fenix",environment:"PREPROD",state:"REGISTERED",prod_authorized:false},
 {company_id:"aion",environment:"PREPROD",state:"REGISTERED",prod_authorized:false},
 {company_id:"captacasa",environment:"PREPROD",state:"REGISTERED",prod_authorized:false}
];
const projects=[
 {company_id:"fenix",project_id:"seo-cordoba",environment:"LAB"},
 {company_id:"aion",project_id:"product-factory",environment:"PREPROD"},
 {company_id:"captacasa",project_id:"source-scout",environment:"PREPROD"},
 {company_id:"unknown",project_id:"should-never-show",environment:"PROD"}
];
function get(opts={}){return listOwnerRegisteredScopes({
 actor:"CARLOS-ADMIN",serverSourceVerified:true,companyRecords:registry,
 projectRecords:projects,...opts
});}
test("Owner is a trusted server-side identity prerequisite",()=>{
 for(const actor of [null,undefined,"anonymous","admin","CARLOS-ADMIN-FAKE"]){
  const r=listOwnerRegisteredScopes({actor,serverSourceVerified:true,companyRecords:registry});
  assert.equal(r.status,"FORBIDDEN");
  assert.ok(!("companies" in r));
 }
});
test("Unverified registry is always empty even for the real owner",()=>{
 const r=listOwnerRegisteredScopes({actor:"CARLOS-ADMIN",companyRecords:registry,projectRecords:projects});
 assert.equal(r.status,"SOURCE_UNVERIFIED");
 assert.deepEqual(r.companies,[]);assert.deepEqual(r.projects,[]);
});
test("New companies and projects are discovered dynamically, without ID hardcoding",()=>{
 const r=get();assert.equal(r.status,"OK");
 assert.deepEqual(r.companies.map(x=>x.company_id),["fenix","aion","captacasa"]);
 assert.equal(r.projects.length,3);
 assert.equal(r.access_granted,false);assert.equal(r.executed,false);assert.equal(r.data_returned,false);
 assert.ok(r.companies.every(x=>x.access_status==="REGISTRY_PRESENT_INTEGRATION_UNVERIFIED"));
});
test("Request selects company scope but does not grant other tenants",()=>{
 const r=get({requestedCompany:"aion"});
 assert.deepEqual(r.companies.map(x=>x.company_id),["aion"]);
 assert.deepEqual(r.projects.map(x=>x.company_id),["aion"]);
 const nope=get({requestedCompany:"third-party"});
 assert.equal(nope.status,"NOT_CONNECTED");
 assert.deepEqual(nope.companies,[]);assert.deepEqual(nope.projects,[]);
});
test("Project search never leaks records of other companies",()=>{
 const r=get({requestedCompany:"fenix",requestedProject:"seo-cordoba"});
 assert.equal(r.status,"OK");
 assert.deepEqual(r.projects.map(x=>x.project_id),["seo-cordoba"]);
 const cross=get({requestedCompany:"fenix",requestedProject:"product-factory"});
 assert.equal(cross.status,"NOT_CONNECTED");
 assert.deepEqual(cross.projects,[]);
});
test("Bad IDs, unknown companies, and extra untrusted fields are discarded",()=>{
 const r=listOwnerRegisteredScopes({
 actor:"CARLOS-ADMIN",serverSourceVerified:true,
 companyRecords:[...registry,{company_id:"../../../other",secrets:"DO_NOT_ECHO"}],
 projectRecords:[...projects,{company_id:"fenix",project_id:"../aion",jwt:"DO_NOT_ECHO"}]
 });
 assert.equal(r.status,"OK");assert.equal(r.companies.length,3);assert.equal(r.projects.length,3);
 const body=JSON.stringify(r);
 assert.ok(!body.includes("DO_NOT_ECHO"));
 assert.ok(!body.includes("../"));
});
