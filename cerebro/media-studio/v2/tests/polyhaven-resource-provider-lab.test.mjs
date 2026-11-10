import test from 'node:test';
import assert from 'node:assert/strict';
import {searchStudioResources,acquireStudioResource} from '../runtime/polyhaven-resource-provider-lab.mjs';
const request={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',kind:'hdris',request_id:'REQ-20261110-1',production_id:'PROD-TEST-1',query:'cinematic apartment interior'};
const identity={gateway_verified:true,actor_id:'ums001-producer',scopes:['media.search','media.acquire'],private_service_token:'test'.repeat(12)};
const svc={async search(){return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',results:[{id:'sunset_jhbcentral',known:false,license:'CC0-1.0'}]};},
 async acquire(){return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',status:'STORED',
 asset_id:'sunset_jhbcentral',file_key:'media/first-real-smoke/sunset_jhbcentral/sunset_1k.exr',
 sha256:'a'.repeat(64),license:'CC0-1.0',source:'https://polyhaven.com/a/sunset_jhbcentral',cost_eur:0,production_approved:false};}};
test('search returns metadata only, never downloads',async()=>{const r=await searchStudioResources({request,identity,mediaService:svc});assert.equal(r.downloaded,false);assert.equal(r.candidates.length,1)});
test('selected download becomes a non-production studio candidate',async()=>{const r=await acquireStudioResource({request:{...request,selected_asset_id:'sunset_jhbcentral'},identity,mediaService:svc});assert.equal(r.status,'CANDIDATE_REGISTERED_QA_PENDING');assert.equal(r.asset_record.status,'REGISTERED');assert.equal(r.asset_record.rights.status,'UNKNOWN');assert.equal(r.production_ready,false)});
test('denies other tenants and unauthenticated actor',async()=>{await assert.rejects(searchStudioResources({request:{...request,company_id:'foreign'},identity,mediaService:svc}),/SCOPE_DENIED/);await assert.rejects(searchStudioResources({request,identity:{...identity,gateway_verified:false},mediaService:svc}),/GATEWAY_AUTH_REQUIRED/)});
test('denies implicit download and forged receipt',async()=>{await assert.rejects(acquireStudioResource({request,identity,mediaService:svc}),/SELECTION_REQUIRED/);await assert.rejects(acquireStudioResource({request:{...request,selected_asset_id:'sunset_jhbcentral'},identity,mediaService:{acquire:async()=>({...await svc.acquire(),production_approved:true})}}),/RECEIPT_INVALID/)});
