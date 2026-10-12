import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANNEL_IDS,channelContract,applyConversationPolicy,buildConversationLearningSignal} from '../../supabase/functions/_shared/cerebro-conversation-policy-v1.ts';

test('all declared channels resolve to CHAT-001 or VOICE-001 without authority expansion',()=>{
  assert.deepEqual([...CHANNEL_IDS],['CONSOLE_TEXT','APP_ANA_TEXT','TELEGRAM_TEXT','TELEGRAM_VOICE','APP_ANA_VOICE','CONSOLE_VOICE']);
  for(const id of CHANNEL_IDS){const c=channelContract(id);assert.equal(c.company_id,'fenix');assert.equal(c.environment,'PROD');assert.equal(c.authority_source,'EXISTING_CHANNEL_BACKEND');assert.equal(c.future_adapter,true);assert.equal(c.owner,id.includes('VOICE')?'VOICE-001':'CHAT-001')}
});

test('protected action and HUMAN_REQUIRED responses pass through byte-equivalent semantically',()=>{
  for(const upstream of [
    {status:'HUMAN_REQUIRED',message:'Firma necesaria',reason:'SIGNATURE_REQUIRED',executed:false},
    {status:'ACTION_PROPOSAL',message:'Propuesta',action:{kind:'SEND'},executed:false},
    {status:'ERROR',message:'No disponible',executed:false}
  ]){const x=applyConversationPolicy({channel_id:'TELEGRAM_TEXT',user_message:'hazlo',upstream});assert.deepEqual(x.response,upstream);assert.equal(x.overlay.applied,false);assert.equal(x.overlay.authoritative_preserved,true)}
});

test('same conservative policy applies to text and voice while preserving authoritative text',()=>{
  const upstream={status:'OK',message:'La cuota mensual influye en el endeudamiento.',executed:false};
  for(const id of ['CONSOLE_TEXT','APP_ANA_TEXT','TELEGRAM_TEXT','TELEGRAM_VOICE','APP_ANA_VOICE','CONSOLE_VOICE']){const x=applyConversationPolicy({channel_id:id,user_message:'Tengo otra deuda y no me queda claro',upstream});assert.equal(x.overlay.applied,true);assert.equal(x.overlay.authoritative_preserved,true);assert.ok(x.response.message.includes(upstream.message));assert.ok((x.response.message.match(/\?/g)??[]).length<=1);assert.equal(x.response.human_intelligence.prod_authority_changed,false)}
});

test('voice surfaces share VOICE-001 and text surfaces share CHAT-001',()=>{
  assert.equal(channelContract('TELEGRAM_VOICE').owner,'VOICE-001');
  assert.equal(channelContract('APP_ANA_VOICE').owner,'VOICE-001');
  assert.equal(channelContract('CONSOLE_VOICE').owner,'VOICE-001');
  assert.equal(channelContract('APP_ANA_TEXT').owner,'CHAT-001');
  assert.equal(channelContract('TELEGRAM_TEXT').owner,'CHAT-001');
  assert.equal(channelContract('CONSOLE_TEXT').owner,'CHAT-001');
});

test('conversation learning signal is observation-only and compatible with universal ingress authority boundary',()=>{
  const s=buildConversationLearningSignal({channel_id:'TELEGRAM_VOICE',signal_id:'conv:test:1',observed_at:'2026-10-13T00:00:00.000Z',payload:{overlay_applied:true}});
  assert.equal(s.signal_type,'METRIC_OBSERVATION');assert.equal(s.engine_id,'VOICE-001');assert.equal(s.source_environment,'PROD');assert.equal(s.contains_customer_data,false);assert.equal(s.contains_secrets,false);assert.equal(s.prod_authorized,false);assert.equal(s.prod_write_authorized,false);assert.equal(s.trading_access,false);assert.equal(s.additional_cost_eur,0);
});
