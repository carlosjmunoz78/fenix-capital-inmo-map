import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../registry/engine-registry.v1.json' with {type:'json'};
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createFactAttestationAdapterLabV0} from './execution-lab/fact-attest-adapter.mjs';

const session='A'.repeat(52);
const actor=async()=>({actor_id:'CARLOS-ADMIN',company_ids:['fenix'],
 scopes:['cerebro:universal:read','cerebro:factory:inspect','cerebro:command:dryrun','cerebro:audit:read']});
const receipt={status:'FACT_ATTESTATION_EXECUTED',source:'PREPROD_LAB_DETERMINISTIC_RECEIPT',
 company_id:'fenix',environment:'LAB',engine_id:'FACT-001',capability_id:'fact.registry.attest',
 version:'0.1.0-lab',receipt_id:'00000000-0000-4000-8000-000000000001',created_at:'2026-11-14T09:00:00Z',
 registry_digest:'a'.repeat(64),registry_count:179,base_count:177,replayed:false,executed:true,
 external_actions_executed:false,prod_execution_enabled:false,additional_cost_eur:0,
 operational_engines_verified:false};
const adapter={
 executeForContext:async()=>receipt,
 latestForContext:async()=>({status:'OK',source:'PREPROD_LAB_DETERMINISTIC_RECEIPT',
  latest:receipt,executed_external_actions:false,prod_execution_enabled:false})
};
const params={company_id:'fenix',environment:'LAB',engine_id:'FACT-001',version:'0.1.0-lab',
 capability_id:'fact.registry.attest',idempotency_key:'lab-fact-attest-test-fact-registry-001',
 dry_run:false,payload:{},estimated_additional_cost_eur:0,risk:'LOW'};
test('FACT only advertises real capability when strict adapter is connected',async()=>{
 const no=new UniversalGatewayLabV0({registry,authenticate:actor});
 const yes=new UniversalGatewayLabV0({registry,authenticate:actor,factAdapter:adapter});
 const a=await no.handle({session_token:session,action:'list_capabilities',params});
 const b=await yes.handle({session_token:session,action:'list_capabilities',params});
 assert.equal(a.capabilities.length,1);
 assert.equal(b.capabilities.length,2);
 assert.equal(b.capabilities[1].capability_id,'fact.registry.attest');
 assert.equal(b.capabilities[1].side_effects,'APPEND_ONLY_LAB_RECEIPT');
});
test('FACT prepares deterministic ordered registry digest but does NOT claim execution',async()=>{
 const g=new UniversalGatewayLabV0({registry,authenticate:actor,factAdapter:adapter});
 const r=await g.handle({session_token:session,action:'submit_command',params});
 assert.equal(r.status,'FACT_ATTESTATION_PREPARED');
 assert.equal(r.executed,false);
 assert.equal(r.registry_count,179);
 assert.equal(r.base_count,177);
 assert.match(r.registry_digest,/^[a-f0-9]{64}$/);
});
test('fact executor refuses staging, arbitrary payloads, PROD, expensive or unapproved commands',async()=>{
 const g=new UniversalGatewayLabV0({registry,authenticate:actor,factAdapter:adapter});
 for(const altered of [
  {...params,environment:'PROD'},
  {...params,engine_id:'SOC-001'},
  {...params,dry_run:true},
  {...params,estimated_additional_cost_eur:2},
  {...params,risk:'HIGH'},
  {...params,signature_required:true},
  {...params,human_exception:'MONEY_LIMIT'},
  {...params,payload:{url:'https://staging.fenixcapital.es'}},
  {...params,target_url:'https://staging.fenixcapital.es'},
  {...params,idempotency_key:'invalid-key'}
 ]){
  await assert.rejects(g.handle({session_token:session,action:'submit_command',params:altered}));
 }
});
test('shared FACT adapter calls only a fixed protected PREPROD endpoint',async()=>{
 const calls=[];
 const a=createFactAttestationAdapterLabV0({preprodApiKey:'sb_publishable_test_12345678',
 ownerApiKey:'a'.repeat(40),fetchImpl:async(url,options)=>{
  calls.push({url,method:options.method,body:options.body});
  return {status:200,json:async()=>({...receipt,registry_digest:'b'.repeat(64)})};
 }});
 const got=await a.executeForContext({...params,session_token:session,registry_digest:'b'.repeat(64),registry_count:179,base_count:177,preserved_base:true});
 assert.equal(got.status,'FACT_ATTESTATION_EXECUTED');
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-command-executor-lab-v0');
 assert.equal(calls[0].method,'POST');
 assert.equal(calls[0].body.includes('staging.fenixcapital.es'),false);
});
test('FACT adapter fails closed on missing owner or mismatched digest',async()=>{
 const a=createFactAttestationAdapterLabV0({preprodApiKey:'sb_publishable_test_12345678',
 ownerApiKey:'a'.repeat(40),fetchImpl:async()=>({status:200,json:async()=>receipt})});
 await assert.rejects(a.executeForContext({...params,session_token:'invalid',registry_digest:'b'.repeat(64),registry_count:179,base_count:177,preserved_base:true}));
 const r=await a.executeForContext({...params,session_token:session,registry_digest:'b'.repeat(64),registry_count:179,base_count:177,preserved_base:true});
 assert.equal(r.status,'UNAVAILABLE');
});
