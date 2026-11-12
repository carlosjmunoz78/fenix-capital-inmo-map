import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readOwnerRegistryLive} from '../cerebro/ops/gateway-v36-followups/owner_registry_live.ts';

function client(initial={}){
 const calls=[];
 const tables={
  cerebro_company_registry_preprod:initial.companies??[],
  jarvis_project_overlay_v1:initial.projects??[],
  cerebro_company_engine_state_preprod:initial.engines??[]
 };
 return {calls,from(table){
  calls.push({operation:"FROM",table});
  if(!(table in tables))throw Error("UNKNOWN_TABLE");
  return {select(columns){
   calls.push({operation:"SELECT",table,columns});
   return {eq(key,value){
    calls.push({operation:"EQ",table,key,value});
    return {async limit(n){
     calls.push({operation:"LIMIT",table,n});
     if(initial.fail===table)return {data:null,error:{code:"DB_ERROR",details:"secret-danger-do-not-echo"}};
     return {data:tables[table].filter(x=>String(x?.[key]??"").toLowerCase()===value).slice(0,n),error:null};
    }};
   }};
  }};
 }};
}
function call(db,rest={}){return readOwnerRegistryLive({actor:"CARLOS-ADMIN",serviceClient:db,now:()=>"2026-11-12T20:00:00.000Z",...rest})}

test('Actual previously existing data: authenticated Fénix context and JARVIS project are surfaced without claiming registration',async()=>{
 const db=client({projects:[{company_id:"fenix",project_id:"PRJ-SUPERAGENT-001",environment:"PROD",status:"PARCIAL"}]});
 const out=await call(db);
 assert.equal(out.status,"OK");
 assert.equal(out.source_status,"LIVE_SERVER_READ");
 assert.equal(out.companies.length,1);
 assert.equal(out.companies[0].access_status,"VERIFIED_OWNER_CONTEXT_NOT_REGISTERED");
 assert.equal(out.companies[0].prod_authorized,false);
 assert.equal(out.projects[0].project_id,"PRJ-SUPERAGENT-001");
 assert.equal(out.projects[0].project_status,"PARCIAL");
 assert.deepEqual(out.engines,[]);
 assert.equal(out.factory.integration_status,"GITOPS_ADAPTER_NOT_YET_CONNECTED");
 assert.equal(out.live_writes,false);
 assert.equal(out.prod_execution_enabled,false);
 assert.ok(db.calls.every(x=>["FROM","SELECT","EQ","LIMIT"].includes(x.operation)));
 assert.ok(db.calls.filter(x=>x.operation==="EQ").every(x=>x.key==="company_id"&&x.value==="fenix"));
});

test('A new verified-company registry row and engine state appear without hardcoding IDs',async()=>{
 const db=client({
  companies:[{company_id:"newco",environment:"PREPROD",version:"0.1",state:"REGISTERED",prod_authorized:false}],
  projects:[{company_id:"newco",project_id:"newco-project",environment:"LAB",status:"ACTIVE"}],
  engines:[{company_id:"newco",engine_id:"SEO-001",environment:"LAB",version:"0.1",state:"READY",prod_authorized:true}]
 });
 const denied=await call(db,{requestedCompany:"newco"});
 assert.equal(denied.status,"NOT_CONNECTED");
 assert.deepEqual(denied.projects,[]);
 const allowed=await call(db,{requestedCompany:"newco",verifiedCompanyIds:["fenix","newco"]});
 assert.equal(allowed.status,"OK");
 assert.equal(allowed.companies.length,1);
 assert.equal(allowed.companies[0].company_id,"newco");
 assert.equal(allowed.projects[0].project_id,"newco-project");
 assert.equal(allowed.engines[0].engine_id,"SEO-001");
 assert.equal(allowed.engines[0].prod_authorized,false,"PREPROD is never a production permission");
});

test('Unverified caller and cross-company query cannot read the database',async()=>{
 const db=client({projects:[{company_id:"other",project_id:"SECRET",environment:"PROD"}]});
 for(const args of [{actor:"ANOTHER"},{actor:"CARLOS-ADMIN",requestedCompany:"other"},{actor:"CARLOS-ADMIN",verifiedCompanyIds:[]}]){
  const v=await readOwnerRegistryLive({serviceClient:db,...args});
  assert.notEqual(v.status,"OK");
  assert.deepEqual(v.projects,[]);
  assert.deepEqual(v.engines,[]);
 }
 assert.equal(db.calls.length,0);
});

test('Unexpected source rows from another company are filtered at the trusted boundary',async()=>{
 const db=client({projects:[{company_id:"fenix",project_id:"good",environment:"LAB"}]});
 const v=await call(db);
 assert.deepEqual(v.projects.map(x=>x.project_id),["good"]);
 const untrust={from(table){
  return {select(){return {eq(){return {async limit(){
   return {data:[{company_id:"intruder",project_id:"bad",engine_id:"BAD-001"}],error:null};
  }};}};}
 }};
 };
 const out=await call(untrust);
 assert.equal(out.status,"OK");
 assert.deepEqual(out.projects,[]);
 assert.deepEqual(out.engines,[]);
 assert.deepEqual(out.companies.map(x=>x.company_id),["fenix"]);
});

test('Database error fails closed with no partial results or private diagnostics',async()=>{
 const db=client({projects:[{company_id:"fenix",project_id:"good"}],fail:"cerebro_company_engine_state_preprod"});
 const v=await call(db);
 assert.equal(v.status,"SOURCE_UNAVAILABLE");
 assert.deepEqual(v.companies,[]);
 assert.deepEqual(v.projects,[]);
 assert.deepEqual(v.engines,[]);
 assert.ok(!JSON.stringify(v).includes("secret-danger"));
});
