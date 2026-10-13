import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../multichannel/preprod/preprod-channel-contract-parity-v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multichannel/preprod/preprod-channel-contract-parity-v1.rollback.sql',import.meta.url),'utf8');
const prodOverlay=fs.readFileSync(new URL('../../supabase/migrations/20261013010500_cerebro_multichannel_ana_overlay_v1.sql',import.meta.url),'utf8');
const prodScope=fs.readFileSync(new URL('../../supabase/migrations/20261013042000_cerebro_channel_access_profiles_v1.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../multichannel/channel-registry.v1.json',import.meta.url),'utf8'));
const lrn=JSON.parse(fs.readFileSync(new URL('../registry/rsi-learning-subscribers.v0.json',import.meta.url),'utf8'));

test('PREPROD parity is additive isolated and rollback-complete',()=>{
  for(const fn of [
    'preprod_test_channel_access_decision_v1',
    'preprod_test_apply_conversation_overlay_v1',
    'preprod_test_multichannel_contract_v1'
  ]){
    assert.ok(migration.includes(`function public.${fn}`),fn);
    assert.ok(rollback.includes(`drop function if exists public.${fn}`),fn);
  }
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(rollback),false);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(migration.includes('service_role'),false);
});

test('PREPROD overlay preserves PR 605 observable semantics',()=>{
  const phrases=[
    'CONSERVATIVE_OVERLAY',
    'OBSERVABLE_CONCERN',
    'authoritative_answer',
    'authoritative_preserved',
    'questions_added',
    'prod_authority_changed',
    'Entiendo que quieras ir con más cuidado después de esa experiencia.',
    'Veo que esto todavía no te ha quedado claro.',
    'Tienes razón en pedir algo más concreto.',
    'Voy al punto.',
    'Ese dato puede cambiar el análisis y conviene incorporarlo.'
  ];
  for(const phrase of phrases){
    assert.ok(prodOverlay.includes(phrase),`PR605 missing ${phrase}`);
    assert.ok(migration.includes(phrase),`PREPROD parity missing ${phrase}`);
  }
});

test('PREPROD access contract preserves FULL_OWNER and FENIX_OPERATIONAL boundaries from 616',()=>{
  for(const phrase of [
    'FULL_OWNER','FENIX_OPERATIONAL','MULTICOMPANY_CONTROL','OWNER_PRIVATE',
    'SECRETS_CREDENTIALS','TRADING_ISOLATED','CROSS_COMPANY_PRIVATE',
    'CHANNEL_PROFILE_SCOPE_DENIED','prod_write_authorized','trading_access'
  ]) assert.ok(migration.includes(phrase),phrase);

  assert.ok(prodScope.includes('fenix_prod_ana_channel_scope_guard_v1'));
  assert.ok(migration.includes("v_profile='FULL_OWNER' or v_scope='FENIX_OPERATIONAL'"));
  assert.ok(migration.includes("'error',case when v_access->>'status'='UNSUPPORTED_CHANNEL' then 'unsupported_channel' else 'channel_scope_denied' end"));
});

test('registry and live LRN contract remain authoritative while PREPROD harness adds no authority',()=>{
  assert.deepEqual(
    registry.channels.filter(x=>x.access_profile==='FULL_OWNER').map(x=>x.channel_id).sort(),
    ['CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE']
  );
  assert.deepEqual(
    registry.channels.filter(x=>x.access_profile==='FENIX_OPERATIONAL').map(x=>x.channel_id).sort(),
    ['APP_ANA_TEXT','APP_ANA_VOICE']
  );
  assert.equal(lrn.engine_id,'LRN-001');
  assert.equal(lrn.environment,'PREPROD');
  assert.equal(lrn.prod_authorized,false);
  assert.equal(lrn.trading_access,false);
  assert.ok(lrn.accepted_signal_families.includes('METRIC_OBSERVATION'));
  const fenix=lrn.subscribers.find(x=>x.company_id==='fenix');
  assert.equal(fenix.local_validation_required,true);
  assert.equal(fenix.prod_write_authorized,false);
});
