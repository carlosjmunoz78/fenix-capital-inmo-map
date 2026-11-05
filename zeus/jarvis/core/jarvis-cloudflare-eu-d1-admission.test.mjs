import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCloudflareD1EUResponse,CUT23_EU_D1,verifyCloudflareD1EUReadOnly} from './jarvis-cloudflare-eu-d1-admission.mjs';
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


test('CUT23 read-only verifier uses EXACT Cloudflare GET with no redirects or mutations',async()=>{
 const calls=[];const secret='synthetic-secret-not-live';
 const fetchImpl=async(url,options)=>{calls.push({url,options});return{
  status:200,ok:true,text:async()=>JSON.stringify(report())
 }};
 const out=await verifyCloudflareD1EUReadOnly({
  fetchImpl,token:secret,accountId,expectedDatabaseId:uuid
 });
 assert.equal(out.accepted,true);assert.equal(out.deployAllowed,false);
 assert.deepEqual(calls.map(c=>c.url),[
  'https://api.cloudflare.com/client/v4/accounts/'+accountId+'/d1/database/'+uuid
 ]);
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.cache,'no-store');
 assert.equal(calls[0].options.headers.authorization,'Bearer '+secret);
 assert.equal(JSON.stringify(out).includes(secret),false);
});
test('CUT23 read-only verifier blocks old D1 before using token or network',async()=>{
 let calls=0;
 const out=await verifyCloudflareD1EUReadOnly({
  fetchImpl:async()=>{calls++;throw Error('NEVER_REACH');},
  token:'synthetic-secret',accountId,
  expectedDatabaseId:'a859fde1-126b-4c40-bc0d-aec2f8839f7b'
 });
 assert.equal(out.accepted,false);assert.equal(calls,0);
});
test('CUT23 read-only verifier fails closed without a protected token',async()=>{
 let calls=0;
 const out=await verifyCloudflareD1EUReadOnly({
  fetchImpl:async()=>{calls++;},accountId,expectedDatabaseId:uuid,token:''
 });
 assert.equal(out.reason,'TRUSTED_FETCH_AND_SCOPED_TOKEN_REQUIRED');
 assert.equal(calls,0);
});
test('CUT23 read-only verifier never leaks sensitive API errors',async()=>{
 const secret='synthetic-secret-private';
 const out=await verifyCloudflareD1EUReadOnly({
  fetchImpl:async()=>{throw Error('fail '+secret)},
  token:secret,accountId,expectedDatabaseId:uuid
 });
 assert.equal(out.accepted,false);
 assert.equal(out.reason,'CLOUDFLARE_READ_UNAVAILABLE');
 assert.equal(JSON.stringify(out).includes(secret),false);
});
test('CUT23 authenticated Cloudflare GET must return EU not region-only',async()=>{
 const out=await verifyCloudflareD1EUReadOnly({
  fetchImpl:async()=>({status:200,ok:true,text:async()=>JSON.stringify(
    report({jurisdiction:null,primary_location_hint:'eeur'})
  )}),token:'synthetic-secret',accountId,expectedDatabaseId:uuid
 });
 assert.equal(out.reason,'EU_JURISDICTION_MISSING');
});
test('CUT23 verifier cannot run against PROD or follow Cloudflare redirect',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return{status:302,ok:false}};
 assert.equal((await verifyCloudflareD1EUReadOnly({fetchImpl,
  token:'synthetic-secret',accountId,expectedDatabaseId:uuid,
  environment:'PROD'})).reason,'LAB_ONLY');
 assert.equal(calls,0);
 assert.equal((await verifyCloudflareD1EUReadOnly({fetchImpl,
  token:'synthetic-secret',accountId,expectedDatabaseId:uuid})).reason,
  'CLOUDFLARE_READ_UNAVAILABLE');
});
