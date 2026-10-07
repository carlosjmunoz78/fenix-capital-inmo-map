import test from 'node:test';
import assert from 'node:assert/strict';
import {bindProviderReadinessFromEnv} from '../skills/skill-provider-binding-from-env.mjs';

const evidence={routes:[
  {provider_id:'cloudflare-workers-ai-free',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'VERIFIED_FREE_TIER_EXISTS',credential_state:'UNBOUND',behavioral_inference:true,data_policy_state:'REVIEW_BEFORE_NON_SYNTHETIC_DATA',eligible_for_behavioral_inference:false},
  {provider_id:'google-gemini-api-free',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'VERIFIED_FREE_TIER_EXISTS',credential_state:'UNBOUND',behavioral_inference:true,data_policy_state:'SYNTHETIC_ONLY_BY_DEFAULT',eligible_for_behavioral_inference:false},
  {provider_id:'github-models',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'RETIRED',credential_state:'NOT_APPLICABLE',behavioral_inference:true,data_policy_state:'NOT_APPLICABLE',eligible_for_behavioral_inference:false}
]};

test('no flags means no provider becomes eligible and no secret values are read',()=>{
  const report=bindProviderReadinessFromEnv(evidence,{env:{}});
  assert.equal(report.secret_values_read,false);
  assert.equal(report.secret_values_emitted,false);
  assert.equal(report.bindings.filter(x=>x.eligible_for_behavioral_inference).length,0);
});

test('Gemini synthetic route needs only presence plus hard quota guard',()=>{
  const report=bindProviderReadinessFromEnv(evidence,{env:{CEREBRO_GEMINI_KEY_PRESENT:'true',CEREBRO_GEMINI_FREE_QUOTA_GUARD:'true'}});
  const item=report.bindings.find(x=>x.provider_id==='google-gemini-api-free');
  assert.equal(item.credential_ready,true);
  assert.equal(item.policy_green,true);
  assert.equal(item.quota_guarded,true);
  assert.equal(item.eligible_for_behavioral_inference,true);
});

test('Cloudflare stays blocked until explicit policy green and both credential-presence flags exist',()=>{
  let report=bindProviderReadinessFromEnv(evidence,{env:{CEREBRO_CF_TOKEN_PRESENT:'true',CEREBRO_CF_ACCOUNT_PRESENT:'true',CEREBRO_CF_FREE_QUOTA_GUARD:'true'}});
  assert.equal(report.bindings.find(x=>x.provider_id==='cloudflare-workers-ai-free').eligible_for_behavioral_inference,false);
  report=bindProviderReadinessFromEnv(evidence,{env:{CEREBRO_CF_TOKEN_PRESENT:'true',CEREBRO_CF_ACCOUNT_PRESENT:'true',CEREBRO_CF_POLICY_GREEN:'true',CEREBRO_CF_FREE_QUOTA_GUARD:'true'}});
  assert.equal(report.bindings.find(x=>x.provider_id==='cloudflare-workers-ai-free').eligible_for_behavioral_inference,true);
});

test('raw-looking env values do not count as presence flags',()=>{
  const report=bindProviderReadinessFromEnv(evidence,{env:{CEREBRO_GEMINI_KEY_PRESENT:'AIza-secret-looking-value',CEREBRO_GEMINI_FREE_QUOTA_GUARD:'true'}});
  assert.equal(report.bindings.find(x=>x.provider_id==='google-gemini-api-free').credential_ready,false);
});
