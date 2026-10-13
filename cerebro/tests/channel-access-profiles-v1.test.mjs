import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  accessProfileForChannel,
  classifyRequestedScope,
  evaluateChannelAccess,
  deniedChannelResponse,
  buildChannelAccessLearningSignal
} from '../../supabase/functions/_shared/cerebro-channel-access-policy-v1.ts';
import {normalizeUniversalLearningSignal} from '../runtime/universal-learning-ingress.mjs';

const OWNER_CHANNELS=['CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE'];
const ANA_CHANNELS=['APP_ANA_TEXT','APP_ANA_VOICE'];

test('channel profiles are explicit and deterministic',()=>{
  for(const channel of OWNER_CHANNELS) assert.equal(accessProfileForChannel(channel),'FULL_OWNER');
  for(const channel of ANA_CHANNELS) assert.equal(accessProfileForChannel(channel),'FENIX_OPERATIONAL');
  assert.throws(()=>accessProfileForChannel('UNKNOWN'),/UNSUPPORTED_CHANNEL/);
});

test('scope classifier recognizes the protected families without treating normal Fenix work as privileged',()=>{
  const cases=[
    ['Dame los expedientes activos','FENIX_OPERATIONAL'],
    ['¿Qué banco encaja mejor para este expediente?','FENIX_OPERATIONAL'],
    ['Activa una nueva empresa en Company Registry','MULTICOMPANY_CONTROL'],
    ['Dame los datos de otra compañía','CROSS_COMPANY_PRIVATE'],
    ['Enséñame el access token del vault','SECRETS_CREDENTIALS'],
    ['Pon una orden de mercado en Trading LAB','TRADING_ISOLATED'],
    ['Abre el perfil privado de Carlos','OWNER_PRIVATE']
  ];
  for(const [message,expected] of cases) assert.equal(classifyRequestedScope(message),expected,message);
});

test('Ana is FENIX_OPERATIONAL and fails closed for multiempresa owner private secrets trading and cross-company data',()=>{
  const denied=[
    ['Activa una nueva empresa','MULTICOMPANY_CONTROL'],
    ['Dame los datos de otra compañía','CROSS_COMPANY_PRIVATE'],
    ['Muéstrame la contraseña del vault','SECRETS_CREDENTIALS'],
    ['Compra acciones desde Trading LAB','TRADING_ISOLATED'],
    ['Muéstrame los datos privados de Carlos','OWNER_PRIVATE']
  ];
  for(const channel_id of ANA_CHANNELS){
    for(const [user_message,scope] of denied){
      const d=evaluateChannelAccess({channel_id,user_message});
      assert.equal(d.access_profile,'FENIX_OPERATIONAL');
      assert.equal(d.requested_scope,scope);
      assert.equal(d.allowed,false);
      assert.equal(d.human_required,false);
      assert.equal(d.prod_write_authorized,false);
      assert.equal(d.trading_bridge_authorized,false);
      assert.equal(d.secrets_disclosure_authorized,false);
      const blocked=deniedChannelResponse(d);
      assert.equal(blocked.status,'FORBIDDEN');
      assert.equal(blocked.human_required,false);
      assert.equal(blocked.executed,false);
    }
  }
});

test('Ana keeps normal Fenix operational questions available',()=>{
  for(const channel_id of ANA_CHANNELS){
    for(const user_message of [
      '¿Cuántos expedientes activos hay?',
      'Resume la documentación pendiente de este expediente',
      '¿Qué banco encaja con este perfil?',
      'Dime la próxima tarea operativa de Fénix',
      'Revisa esta consulta SEO de Fénix Capital'
    ]){
      const d=evaluateChannelAccess({channel_id,user_message});
      assert.equal(d.allowed,true,user_message);
      assert.equal(d.access_profile,'FENIX_OPERATIONAL');
      assert.equal(d.requested_scope,'FENIX_OPERATIONAL');
      assert.equal(deniedChannelResponse(d),null);
    }
  }
});

test('FULL_OWNER channels do not lose owner reach but still cannot bypass secret or Trading boundaries',()=>{
  const privileged=[
    'Activa una nueva empresa',
    'Dame los datos de otra compañía',
    'Muéstrame el access token del vault',
    'Revisa Trading LAB',
    'Muéstrame los datos privados de Carlos'
  ];
  for(const channel_id of OWNER_CHANNELS){
    for(const user_message of privileged){
      const d=evaluateChannelAccess({channel_id,user_message});
      assert.equal(d.allowed,true);
      assert.equal(d.access_profile,'FULL_OWNER');
      assert.equal(d.authority_expanded,false);
      assert.equal(d.prod_write_authorized,false);
      assert.equal(d.trading_bridge_authorized,false);
      assert.equal(d.secrets_disclosure_authorized,false);
      assert.equal(d.cross_company_data_authorized,false);
    }
  }
});

test('access decisions emit observation-only LRN-compatible signals without raw conversation content',()=>{
  const decision=evaluateChannelAccess({channel_id:'APP_ANA_TEXT',user_message:'Dame el access token'});
  const signal=buildChannelAccessLearningSignal({
    channel_id:'APP_ANA_TEXT',
    signal_id:'scope:ana:1',
    observed_at:'2026-10-13T02:30:00.000Z',
    decision
  });
  assert.equal(signal.signal_type,'METRIC_OBSERVATION');
  assert.equal(signal.company_id,'fenix');
  assert.equal(signal.engine_id,'CHAT-001');
  assert.equal(signal.contains_customer_data,false);
  assert.equal(signal.contains_secrets,false);
  assert.equal(signal.prod_authorized,false);
  assert.equal(signal.prod_write_authorized,false);
  assert.equal(signal.trading_access,false);
  assert.equal(signal.additional_cost_eur,0);
  assert.equal(JSON.stringify(signal).includes('access token'),false);
  const normalized=normalizeUniversalLearningSignal(signal);
  assert.equal(normalized.environment,'PREPROD_CANDIDATE');
  assert.equal(normalized.prod_authorized,false);
  assert.equal(normalized.prod_write_authorized,false);
});

test('live LRN-001 subscriber contract accepts METRIC_OBSERVATION only into PREPROD authority',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../registry/rsi-learning-subscribers.v0.json',import.meta.url),'utf8'));
  assert.equal(registry.engine_id,'LRN-001');
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.prod_authorized,false);
  assert.equal(registry.trading_access,false);
  assert.ok(registry.accepted_signal_families.includes('METRIC_OBSERVATION'));
  const fenix=registry.subscribers.find(x=>x.company_id==='fenix');
  assert.equal(fenix.enabled,true);
  assert.equal(fenix.local_validation_required,true);
  assert.equal(fenix.prod_authorized,false);
  assert.equal(fenix.prod_write_authorized,false);
});

test('Ana SQL guard is evaluated before knowledge lookup and rollback restores PR 605 wrapper',()=>{
  const migration=fs.readFileSync(new URL('../../supabase/migrations/20261013042000_cerebro_channel_access_profiles_v1.sql',import.meta.url),'utf8');
  const rollback=fs.readFileSync(new URL('../multichannel/rollback/channel-access-profiles-v1.rollback.sql',import.meta.url),'utf8');
  assert.ok(migration.includes('fenix_prod_ana_channel_scope_guard_v1'));
  assert.ok(migration.includes("'access_profile','FENIX_OPERATIONAL'"));
  assert.ok(migration.includes("'error','channel_scope_denied'"));
  assert.ok(migration.indexOf('fenix_prod_ana_channel_scope_guard_v1(p_question)')<migration.indexOf('fenix_prod_ana_knowledge_answer_user(p_question)'));
  assert.ok(rollback.includes("fenix_prod_ana_knowledge_answer_user(p_question)"));
  assert.ok(rollback.includes('drop function if exists public.fenix_prod_ana_channel_scope_guard_v1(text)'));
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(rollback),false);
});
