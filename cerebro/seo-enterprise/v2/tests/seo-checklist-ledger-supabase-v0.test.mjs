import test from 'node:test';
import assert from 'node:assert/strict';
import {createChecklistDeliveryLedgerV0,LEDGER_PREPROD_CONTRACT_V0} from '../runtime/seo-checklist-ledger-supabase-v0.mjs';
const asset='59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6';
const key='abcdef0123456789abcdef0123456789abcdef0123456789';
const info={
 lead_event_id:'00000000-0000-4000-a000-000000000001',
 request_id:'00000000-0000-4000-a000-000000000002',
 recipient_sha256:'a'.repeat(64),attachment_sha256:asset,
 consent_privacy_at:'2026-11-06T07:00:00.000Z',
 privacy_notice_version:'fenix-privacy-2026-11',consent_marketing:false
};
function mockClient(){
 const state={rows:new Map(),reads:[],queries:[]};
 const client={
   delivery_project_ref:'hnqlnvakzaywtafeiybt',delivery_server_verified:true,
   from(table){
     assert.equal(table,'cerebro_seo_checklist_delivery_v0');
     return {
       insert(row){state.queries.push(['insert',row]);return {select:()=>({maybeSingle:async()=>{
        if(state.rows.has(row.idempotency_key))return {data:null,error:{code:'23505'}};
        state.rows.set(row.idempotency_key,row);
        return {data:{idempotency_key:row.idempotency_key},error:null};
       }})};},
       update(patch){
         const filters=[];
         const chain={
           eq(field,value){filters.push([field,value]);return this;},
           select(){return {maybeSingle:async()=>{
             state.queries.push(['update',patch,filters]);
             const id=filters.find(x=>x[0]==='idempotency_key')?.[1];
             const row=state.rows.get(id);
             if(!row||filters.some(([k,v])=>row[k]!==v))return {data:null,error:null};
             state.rows.set(id,{...row,...patch});
             return {data:{idempotency_key:id},error:null};
           }};}
         };return chain;
       }
     };
   }
 };
 return {client,state};
}
test('service role + exact PREPROD bound client required and no other project',()=>{
 assert.equal(LEDGER_PREPROD_CONTRACT_V0.project_ref,'hnqlnvakzaywtafeiybt');
 assert.equal(LEDGER_PREPROD_CONTRACT_V0.production_authorized,false);
 assert.throws(()=>createChecklistDeliveryLedgerV0({client:{}}),/SUPABASE_SERVICE_ROLE_CLIENT_REQUIRED/);
 const {client}=mockClient();
 assert.throws(()=>createChecklistDeliveryLedgerV0({client:{...client,delivery_project_ref:'cluhljgonannaafpmblx'}}),/PREPROD_PROJECT_BINDING_REQUIRED/);
 assert.throws(()=>createChecklistDeliveryLedgerV0({client:{...client,delivery_server_verified:false}}),/SERVER_VERIFIED_CLIENT_REQUIRED/);
});
test('atomic-style reserve is once, accepts receipt and never overwrites ACCEPTED',async()=>{
 const {client,state}=mockClient(), ledger=createChecklistDeliveryLedgerV0({client});
 assert.equal(await ledger.reserve(key,info),true);
 assert.equal(await ledger.reserve(key,info),false);
 assert.equal(state.rows.size,1);
 assert.equal(state.rows.get(key).consent_marketing,false);
 assert.equal(state.rows.get(key).email,undefined);
 assert.equal(await ledger.complete(key,{message_id_sha256:'f'.repeat(64),http_status:201}),true);
 assert.equal(state.rows.get(key).status,'ACCEPTED');
 assert.equal(await ledger.markUnknown(key,{reason:'TRANSPORT_OR_PERSISTENCE_UNCERTAIN'}),false);
 assert.equal(state.rows.get(key).status,'ACCEPTED');
});
test('transport UNKNOWN requires reconciliation; same reserve cannot repeat',async()=>{
 const {client,state}=mockClient(),ledger=createChecklistDeliveryLedgerV0({client});
 await ledger.reserve(key,info);
 assert.equal(await ledger.markUnknown(key,{reason:'TRANSPORT_OR_PERSISTENCE_UNCERTAIN'}),true);
 assert.equal(await ledger.reserve(key,info),false);
 assert.equal(state.rows.get(key).status,'UNKNOWN');
});
test('reject incomplete verified consent, wrong asset hash and 200 instead of Brevo 201',async()=>{
 const {client}=mockClient(),ledger=createChecklistDeliveryLedgerV0({client});
 await assert.rejects(()=>ledger.reserve(key,{...info,attachment_sha256:'e'.repeat(64)}),/LEDGER_ASSET_SHA_DENIED/);
 await assert.rejects(()=>ledger.reserve(key,{...info,consent_marketing:'yes'}),/LEDGER_CONSENT_EVIDENCE_REQUIRED/);
 await assert.rejects(()=>ledger.reserve('not_a_key',info),/LEDGER_INVALID_KEY/);
 await ledger.reserve(key,info);
 await assert.rejects(()=>ledger.complete(key,{message_id_sha256:'f'.repeat(64),http_status:200}),/BREVO_201_REQUIRED/);
 await assert.rejects(()=>ledger.markUnknown(key,{reason:'RETRY'}),/UNKNOWN_REASON_DENIED/);
});
