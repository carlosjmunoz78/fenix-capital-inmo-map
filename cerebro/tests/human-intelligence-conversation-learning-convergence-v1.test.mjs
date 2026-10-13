import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildRealConversationLearningSignals,
  buildSyntheticConversationLearningSignals,
  buildConversationLearningConvergenceReport,
  CONVERSATION_LEARNING_CONVERGENCE_V1
} from '../human-intelligence/integration/conversation-learning-convergence-v1.mjs';

const CHANNELS=['CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE','APP_ANA_TEXT','APP_ANA_VOICE'];
const OWNER=new Set(['CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE']);

function real(channel_id,index=1,extra={}){
  return {channel_id,observation_id:`obs-${index}-${channel_id}`,observed_at:`2026-10-14T00:${String(index).padStart(2,'0')}:00.000Z`,metrics:{question_count:index,repeated:false,resolved:true},outcome_code:'RESOLVED',reason_code:'REAL_CONVERSATION_OBSERVATION',...extra};
}

test('knowledge surface map covers all six voice/text surfaces without making a channel a source of truth',()=>{
  const map=JSON.parse(fs.readFileSync(new URL('../human-intelligence/knowledge/knowledge-surface-map.v1.json',import.meta.url),'utf8'));
  assert.equal(map.state_type,'CEREBRO_KNOWLEDGE_SURFACE_MAP_V1');
  assert.deepEqual(new Set(map.channel_surfaces.map(x=>x.channel_id)),new Set(CHANNELS));
  for(const surface of map.channel_surfaces)assert.equal(surface.access_profile,OWNER.has(surface.channel_id)?'FULL_OWNER':'FENIX_OPERATIONAL');
  assert.ok(map.canonicality_rules.some(x=>x.includes('surface, never a source of truth')));
  assert.equal(map.learning_convergence.real_conversations.raw_content_to_lrn,false);
  assert.equal(map.learning_convergence.synthetic_conversations.direct_canonical_write,false);
  assert.equal(map.safety.prod_authority_expansion,false);
  assert.equal(map.safety.trading_access,false);
  assert.equal(map.safety.additional_cost_eur,0);
});

test('every real conversation surface can emit a safe derived METRIC_OBSERVATION into universal LRN ingress',()=>{
  let i=1;
  for(const channel_id of CHANNELS){
    const signals=buildRealConversationLearningSignals(real(channel_id,i++));
    assert.equal(signals.length,1);
    assert.equal(signals[0].signal_type,'METRIC_OBSERVATION');
    assert.equal(signals[0].payload.channel_id,channel_id);
    assert.equal(signals[0].payload.raw_content_persisted,false);
    assert.equal(signals[0].contains_customer_data,false);
    assert.equal(signals[0].contains_secrets,false);
    assert.equal(signals[0].prod_authorized,false);
    assert.equal(signals[0].prod_write_authorized,false);
    assert.equal(signals[0].trading_access,false);
    assert.equal(signals[0].additional_cost_eur,0);
  }
});

test('an explicit real human correction becomes HUMAN_CORRECTION plus observation, never an automatic rule',()=>{
  const signals=buildRealConversationLearningSignals(real('APP_ANA_TEXT',7,{explicit_correction:true,correction_code:'WRONG_NEXT_STEP'}));
  assert.deepEqual(signals.map(x=>x.signal_type).sort(),['HUMAN_CORRECTION','METRIC_OBSERVATION']);
  const correction=signals.find(x=>x.signal_type==='HUMAN_CORRECTION');
  assert.equal(correction.payload.canonical_rule_auto_promote,false);
  assert.equal(correction.payload.raw_content_persisted,false);
});

test('raw real conversation content is rejected instead of copied to the learning ledger',()=>{
  assert.throws(()=>buildRealConversationLearningSignals({...real('TELEGRAM_TEXT',8),user_message:'contenido real del usuario'}),/raw_conversation_content_forbidden:user_message/);
  assert.throws(()=>buildRealConversationLearningSignals({...real('CONSOLE_TEXT',9),metadata:{transcript:'audio real'}}),/raw_conversation_content_forbidden:transcript/);
});

test('synthetic evidence is bounded: green NEW_BETTER may emit tribunal evidence, failed gates may not',()=>{
  const green=buildSyntheticConversationLearningSignals({scenario_id:'FENIX-HUMAN-001',episode_id:'ep-001',variant:'AMBIGUOUS',observed_at:'2026-10-14T01:00:00.000Z',source_environment:'LAB',old_score:0.61,new_score:0.83,hard_gates_green:true,verdict:'NEW_BETTER'});
  assert.deepEqual(green.map(x=>x.signal_type).sort(),['METRIC_OBSERVATION','TRIBUNAL_DECISION']);
  assert.equal(green.every(x=>x.payload.synthetic===true),true);
  const red=buildSyntheticConversationLearningSignals({scenario_id:'FENIX-HUMAN-002',episode_id:'ep-002',variant:'ADVERSARIAL',observed_at:'2026-10-14T01:01:00.000Z',source_environment:'PREPROD',old_score:0.7,new_score:0.9,hard_gates_green:false,verdict:'NEW_BETTER'});
  assert.deepEqual(red.map(x=>x.signal_type),['METRIC_OBSERVATION']);
});

test('real plus synthetic convergence normalizes only to PREPROD_CANDIDATE and never expands PROD or Trading authority',()=>{
  const report=buildConversationLearningConvergenceReport({
    real_observations:[real('CONSOLE_VOICE',10,{explicit_correction:true,correction_code:'MISSED_CONTEXT'})],
    synthetic_observations:[{scenario_id:'FENIX-HUMAN-003',episode_id:'ep-003',variant:'FRICTION',observed_at:'2026-10-14T01:02:00.000Z',source_environment:'LAB',old_score:0.55,new_score:0.8,hard_gates_green:true,verdict:'NEW_BETTER'}]
  });
  assert.equal(report.state_type,'CEREBRO_RSI_UNIVERSAL_LEARNING_EVENT_REPORT');
  assert.equal(report.events_total,4);
  for(const event of report.events){
    assert.equal(event.environment,'PREPROD_CANDIDATE');
    assert.equal(event.contains_customer_data,false);
    assert.equal(event.contains_secrets,false);
    assert.equal(event.prod_authorized,false);
    assert.equal(event.prod_write_authorized,false);
    assert.equal(event.trading_access,false);
    assert.equal(event.additional_cost_eur,0);
  }
});

test('existing LRN subscriber already accepts the required real and synthetic signal families and remains PREPROD only',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../registry/rsi-learning-subscribers.v0.json',import.meta.url),'utf8'));
  for(const type of ['METRIC_OBSERVATION','HUMAN_CORRECTION','TRIBUNAL_DECISION'])assert.ok(registry.accepted_signal_families.includes(type));
  const fenix=registry.subscribers.find(x=>x.company_id==='fenix');
  assert.equal(fenix.enabled,true);
  assert.equal(fenix.environment,'PREPROD');
  assert.equal(fenix.prod_authorized,false);
  assert.equal(fenix.prod_write_authorized,false);
  assert.equal(fenix.trading_access,false);
});

test('channel registry points all six surfaces at the same knowledge/learning convergence contract while preserving access profiles',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../multichannel/channel-registry.v1.json',import.meta.url),'utf8'));
  assert.deepEqual(new Set(registry.learning.channels_observed),new Set(CHANNELS));
  assert.equal(registry.learning.knowledge_surface_map,'cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json');
  assert.equal(registry.learning.convergence_module,'cerebro/human-intelligence/integration/conversation-learning-convergence-v1.mjs');
  assert.equal(registry.learning.real_conversation_raw_text_to_lrn,false);
  assert.equal(registry.learning.synthetic_direct_truth_promotion,false);
  assert.equal(registry.safety.prod_authority_expansion,false);
  assert.equal(registry.safety.trading_access,false);
  assert.equal(CONVERSATION_LEARNING_CONVERGENCE_V1.single_conversation_auto_promote,false);
});
