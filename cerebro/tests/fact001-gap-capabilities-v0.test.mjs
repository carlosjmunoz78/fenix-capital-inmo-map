import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  learnProcedureV0,
  replayProcedureV0,
  buildAndroidDeviceWorkerShellV0,
  authorizeAndroidWorkerCommandV0,
  runCompetContinuousV0,
  runCapDiscoveryV0,
  FirstPartyEventCaptureV0,
  buildAppTemplatePackV0,
  FACT001_GAP_CAPABILITIES_V0_CONTRACT
} from '../runtime/fact001-gap-capabilities-v0.mjs';

const ctx = engine_id => ({ company_id:'fenix', engine_id, environment:'PREPROD', version:'v0' });

test('batch contract covers exactly the six routed gaps and never expands authority', () => {
  assert.deepEqual(FACT001_GAP_CAPABILITIES_V0_CONTRACT.item_ids, [47,48,57,62,74,183]);
  assert.deepEqual(FACT001_GAP_CAPABILITIES_V0_CONTRACT.primary_engines, ['LRN-001','AUTO-001','COMPET-001','CAP-001','EVT-001','APPBOOT-001']);
  assert.deepEqual(FACT001_GAP_CAPABILITIES_V0_CONTRACT.new_engine_ids_created, []);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.additional_cost_eur, 0);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.prod_authorized, false);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.prod_write_authorized, false);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.trading_access, false);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.external_dependency_install, false);
  assert.equal(FACT001_GAP_CAPABILITIES_V0_CONTRACT.external_network_execution, false);
});

test('Watch & Learn freezes a deterministic procedure, replays it and fails closed on tampering/mismatch', () => {
  const procedure = learnProcedureV0({
    context:ctx('LRN-001'),
    procedure_id:'seo-audit-replay-v1',
    steps:[
      { step_id:'s1', action:'READ', target:'fixture://page', input:{fixture_ref:'page-1'}, expected_result:{status:200}, side_effect_class:'READ_ONLY' },
      { step_id:'s2', action:'COMPARE', target:'fixture://baseline', input:{candidate_ref:'candidate-1'}, expected_result:{better:true}, side_effect_class:'SIMULATION' }
    ]
  });
  const matching = replayProcedureV0({ procedure, adapter:{ mode:'SAFE_PREPROD_SIMULATION', execute:step => step.expected_result } });
  assert.equal(matching.status, 'REPLAY_MATCH');
  assert.equal(matching.rollback_required, false);
  const mismatch = replayProcedureV0({ procedure, adapter:{ mode:'SAFE_PREPROD_SIMULATION', execute:() => ({wrong:true}) } });
  assert.equal(mismatch.status, 'REPLAY_MISMATCH');
  assert.equal(mismatch.rollback_required, true);
  assert.throws(() => replayProcedureV0({ procedure:{...procedure, procedure_id:'tampered'}, adapter:{mode:'SAFE_PREPROD_SIMULATION',execute:()=>({})} }), /checksum mismatch/i);
  assert.throws(() => learnProcedureV0({ context:ctx('LRN-001'), procedure_id:'bad', steps:[{action:'WRITE',target:'x',input:{},expected_result:null,side_effect_class:'WRITE'}] }), /SIMULATION or READ_ONLY/);
  assert.throws(() => learnProcedureV0({ context:ctx('LRN-001'), procedure_id:'pii', steps:[{action:'READ',target:'x',input:{email:'person@example.com'},expected_result:null,side_effect_class:'READ_ONLY'}] }), /personal-data key forbidden/i);
});

test('Android worker produces a PREPROD shell and remains physically locked', () => {
  const worker = buildAndroidDeviceWorkerShellV0({ context:ctx('AUTO-001'), capabilities:['PING','STATUS','SCREENSHOT_PREVIEW'] });
  assert.equal(worker.kill_switch_enabled, true);
  assert.equal(worker.physical_binding_required, true);
  assert.equal(worker.prod_authorized, false);
  assert.ok(worker.files['app/src/main/AndroidManifest.xml']);
  assert.ok(worker.files['app/src/main/java/MainActivity.kt']);
  const blocked = authorizeAndroidWorkerCommandV0({ worker, command:{ type:'PING', company_id:'fenix', idempotency_key:'cmd-1' } });
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.reason, 'KILL_SWITCH_ENABLED');
  assert.equal(blocked.physical_execution_authorized, false);
  assert.throws(() => authorizeAndroidWorkerCommandV0({ worker:{...worker,kill_switch_enabled:false}, command:{ type:'PING', company_id:'fenix', idempotency_key:'cmd-1' } }), /checksum mismatch/i);
  assert.throws(() => buildAndroidDeviceWorkerShellV0({ context:{...ctx('AUTO-001'),environment:'PROD'} }), /PREPROD-only/);
});

test('COMPET-001 runtime detects evidence-backed changes and schedules the next zero-cost cycle deterministically', () => {
  const previous=[{competitor_id:'comp-a',dimension:'offer',value:'A',source_url:'https://example.com/offer',source_access:'PUBLIC',observed_at:'2026-10-14T10:00:00Z',confidence:0.9}];
  const current=[{competitor_id:'comp-a',dimension:'offer',value:'B',source_url:'https://example.com/offer',source_access:'PUBLIC',observed_at:'2026-10-14T11:00:00Z',confidence:0.95}];
  const result=runCompetContinuousV0({context:ctx('COMPET-001'),previous,current,cycle_anchor:'2026-10-14T12:00:00Z',cadence_hours:24});
  assert.equal(result.change_count,1);
  assert.equal(result.changes[0].before,'A');
  assert.equal(result.changes[0].after,'B');
  assert.equal(result.next_job.scheduled_for,'2026-10-15T12:00:00.000Z');
  assert.equal(result.network_calls,0);
  assert.equal(result.external_writes,0);
  assert.equal(result.additional_cost_eur,0);
  assert.throws(() => runCompetContinuousV0({context:ctx('COMPET-001'),current:[{...current[0],source_access:'SCRAPED_PRIVATE'}],cycle_anchor:'2026-10-14T12:00:00Z'}), /PUBLIC or AUTHORIZED/);
  assert.throws(() => runCompetContinuousV0({context:ctx('COMPET-001'),current:[{...current[0],source_url:'https://example.com/?access_token=secret'}],cycle_anchor:'2026-10-14T12:00:00Z'}), /secret-bearing query key/i);
});

test('CAP-001 discovery stays company-first, dedupes by domain and never generates person contacts', () => {
  const source_records=[
    {company_name:'Acme Old',domain:'https://www.acme.test',sector:'inmobiliaria',geography:'cordoba',employee_count:4,signals:['partner'],source_url:'https://acme.test/about',source_access:'PUBLIC',evidence_at:'2026-10-13T10:00:00Z'},
    {company_name:'Acme',domain:'acme.test',sector:'inmobiliaria',geography:'cordoba',employee_count:5,signals:['partner','growth'],source_url:'https://acme.test/about',source_access:'PUBLIC',evidence_at:'2026-10-14T10:00:00Z'},
    {company_name:'Other',domain:'other.test',sector:'retail',geography:'sevilla',employee_count:10,signals:['growth'],source_url:'https://other.test',source_access:'AUTHORIZED',evidence_at:'2026-10-14T10:00:00Z'}
  ];
  const result=runCapDiscoveryV0({context:ctx('CAP-001'),source_records,icp:{sectors:['inmobiliaria'],geographies:['cordoba'],min_employees:1,max_employees:20,signals:['partner']}});
  assert.equal(result.company_count,2);
  assert.equal(result.companies[0].domain,'acme.test');
  assert.equal(result.companies[0].company_name,'Acme');
  assert.equal(result.companies[0].fit_score,100);
  assert.equal(result.personal_contacts_generated,0);
  assert.equal(result.outreach_actions,0);
  assert.equal(result.crm_writes,0);
  assert.equal(result.network_calls,0);
  assert.throws(() => runCapDiscoveryV0({context:ctx('CAP-001'),source_records:[{...source_records[0],email:'person@example.com'}]}), /personal-data key forbidden/i);
  assert.throws(() => runCapDiscoveryV0({context:ctx('CAP-001'),source_records:[{...source_records[0],employee_count:-1}]}), /non-negative integer/i);
  assert.throws(() => runCapDiscoveryV0({context:ctx('CAP-001'),source_records,icp:{min_employees:20,max_employees:10}}), /bounds invalid/i);
});

test('EVT-001 first-party capture is consent-gated, durable, idempotent and company-scoped', () => {
  const dir=mkdtempSync(join(tmpdir(),'cerebro-fact-gap-evt-'));
  const file=join(dir,'events.v8');
  try {
    const capture=new FirstPartyEventCaptureV0({file_path:file,company_id:'fenix'});
    const input={event_type:'PAGE_VIEW',occurred_at:'2026-10-14T12:00:00Z',page_path:'/hipotecas/?utm_source=test#top',account_ref:'acct-123',properties:{page_category:'SERVICE',campaign_ref:'cmp-1'},consent:{analytics:true},idempotency_key:'evt-1'};
    const first=capture.capture(input);
    assert.equal(first.accepted,true);
    assert.equal(first.event.page_path,'/hipotecas/');
    assert.equal(first.event.company_id,'fenix');
    const duplicate=capture.capture(input);
    assert.equal(duplicate.accepted,false);
    assert.equal(duplicate.duplicate,true);
    const reopened=new FirstPartyEventCaptureV0({file_path:file,company_id:'fenix'});
    assert.equal(reopened.operation_count,1);
    assert.equal(reopened.list()[0].event_id,first.event.event_id);
    assert.throws(() => new FirstPartyEventCaptureV0({file_path:file,company_id:'other'}), /company scope mismatch/i);
    assert.throws(() => capture.capture({...input,idempotency_key:'evt-2',consent:{analytics:false}}), /consent required/i);
    assert.throws(() => capture.capture({...input,idempotency_key:'evt-3',email:'person@example.com'}), /personal-data key forbidden/i);
    assert.throws(() => capture.capture({...input,idempotency_key:'evt-4',properties:{raw_query:'x'}}), /not allowlisted/i);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('APPBOOT-001 generates deterministic zero-dependency template packs without deployment authority', () => {
  const pwa=buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'PWA',name:'Fenix Portal',brand_tokens:{primary:'#222222',surface:'#ffffff',accent:'#ffb71b',font_family:'Montserrat'}});
  assert.equal(pwa.type,'PWA');
  assert.ok(pwa.artifacts['index.html']);
  assert.ok(pwa.artifacts['manifest.webmanifest']);
  assert.ok(pwa.artifacts['sw.js']);
  assert.deepEqual(pwa.external_dependencies,[]);
  assert.equal(pwa.deploy_authorized,false);
  assert.equal(pwa.publish_authorized,false);
  assert.equal(pwa.additional_cost_eur,0);
  assert.equal(pwa.prod_authorized,false);
  const mobile=buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'MOBILE_TEMPLATE',name:'CEREBRO Mobile'});
  assert.ok(mobile.artifacts['android/app/src/main/AndroidManifest.xml']);
  assert.ok(mobile.artifacts['android/app/src/main/java/MainActivity.kt']);
  assert.throws(() => buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'DESKTOP'}), /WEB_APP, PWA or MOBILE_TEMPLATE/);
  assert.throws(() => buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'PWA',brand_tokens:{api_key:'secret'}}), /secret-bearing key forbidden/i);
});

test('all six capability surfaces reject accidental PROD context', () => {
  assert.throws(() => learnProcedureV0({context:{...ctx('LRN-001'),environment:'PROD'},procedure_id:'p1',steps:[{action:'READ',target:'x',input:{},expected_result:null,side_effect_class:'READ_ONLY'}]}), /PREPROD-only/);
  assert.throws(() => runCompetContinuousV0({context:{...ctx('COMPET-001'),environment:'PROD'},cycle_anchor:'2026-10-14T00:00:00Z'}), /PREPROD-only/);
  assert.throws(() => runCapDiscoveryV0({context:{...ctx('CAP-001'),environment:'PROD'}}), /PREPROD-only/);
  assert.throws(() => new FirstPartyEventCaptureV0({file_path:'/tmp/should-not-write.v8',company_id:'fenix',environment:'PROD'}), /PREPROD-only/);
  assert.throws(() => buildAppTemplatePackV0({context:{...ctx('APPBOOT-001'),environment:'PROD'},type:'PWA'}), /PREPROD-only/);
});