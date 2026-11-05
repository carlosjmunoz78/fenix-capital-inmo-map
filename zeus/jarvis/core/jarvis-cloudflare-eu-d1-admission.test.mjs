import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCloudflareD1EUResponse,CUT23_EU_D1} from './jarvis-cloudflare-eu-d1-admission.mjs';
const accountId='e39a57e1ac42650ca5a6d5307cf0ac8e';
const uuid='11111111-2222-4333-8444-555555555555';
const report=(overrides={})=>({success:true,errors:[],result:{
 uuid,name:'cerebro-jarvis-lab-eu',jurisdiction:'eu',
 read_replication:{mode:'disabled'},...overrides
}});
const assess=(response=report(),args={})=>assessCloudflareD1EUResponse({
 apiResponse:response,accountId,expectedDatabaseId:uuid,...args
});
test('CUT23 new D1 with reported eu only yields admission; no deploy or PROD',()=>{
 const r=assess();assert.equal(r.accepted,true);
 assert.equal(r.deployAllowed,false);assert.equal(r.prod,'NO_GO');
 assert.equal(r.databaseId,uuid);assert.equal(r.jurisdiction,'eu');
 assert.equal(CUT23_EU_D1.workersDev,false);
});
test('CUT23 current existing D1 with eastern Europe region but jurisdiction none is blocked',()=>{
 const r=assess(report({uuid:'a859fde1-126b-4c40-bc0d-aec2f8839f7b',
  name:'cerebro-jarvis-lab-cut21',jurisdiction:null}),
  {expectedDatabaseId:'a859fde1-126b-4c40-bc0d-aec2f8839f7b'});
 assert.equal(r.accepted,false);assert.equal(r.reason,'NEW_D1_ID_UNVERIFIED');
});
test('CUT23 region alone is never accepted as EU jurisdiction',()=>{
 for(const jurisdiction of [null,undefined,'eeur','EU','us',false]){
  const r=assess(report({jurisdiction,location:'eeur'}));
  assert.equal(r.accepted,false);assert.equal(r.reason,'EU_JURISDICTION_MISSING');
 }
});
test('CUT23 wrong database name and UUID fail closed',()=>{
 assert.equal(assess(report({name:'fenix-capital-inmo-map'})).accepted,false);
 assert.equal(assess(report({uuid:'aaaaaaaa-2222-4333-8444-555555555555'})).reason,'DATABASE_UUID_MISMATCH');
});
test('CUT23 fictitious placeholder and invalid account ID cannot be admitted',()=>{
 assert.equal(assess(report(),{accountId:'wrong'}).reason,'ACCOUNT_ID_UNVERIFIED');
 assert.equal(assess(report(),{expectedDatabaseId:'00000000-0000-0000-0000-000000000000'}).reason,'NEW_D1_ID_UNVERIFIED');
});
test('CUT23 API failure and malformed error metadata denied',()=>{
 for(const value of [null,{}, {success:false,errors:[],result:report().result},
  {success:true,errors:[{code:1001}],result:report().result}]){
  assert.equal(assess(value).reason,'CLOUDFLARE_API_RESPONSE_UNVERIFIED');
 }
});
test('CUT23 unreviewed read replication is denied for residency-sensitive sessions',()=>{
 const r=assess(report({read_replication:{mode:'auto'}}));
 assert.equal(r.accepted,false);assert.equal(r.reason,'READ_REPLICATION_NOT_REVIEWED');
});
test('CUT23 cannot run as PROD, cannot self-promote by metadata',()=>{
 const r=assess(report(),{environment:'PROD'});
 assert.equal(r.accepted,false);assert.equal(r.prod,'NO_GO');assert.equal(r.deployAllowed,false);
});
test('CUT23 never returns supplied extra fields including credentials',()=>{
 const response=report({secret:'dont-output',token:'dont-output',api_key:'dont-output'});
 const r=assess(response);
 assert.equal(JSON.stringify(r).includes('dont-output'),false);
});
