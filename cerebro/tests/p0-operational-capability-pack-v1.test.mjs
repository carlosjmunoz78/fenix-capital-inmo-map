import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildP0OperationalCatalog,resolveP0Capability,createCrossDeviceAppScaffold,createWebsiteScaffold,
  descriptiveStatistics,twoProportionAB,buildStructuredReport,acquirePublicText,evaluateCommunicationText,runP0OperationalAction
} from '../runtime/p0-operational-capability-pack-v1.mjs';
import {runSyntheticSelfPlayCycle,persistSyntheticLearning} from '../runtime/synthetic-human-selfplay-v1.mjs';

function temp(prefix){return fs.mkdtempSync(path.join(os.tmpdir(),prefix));}

test('P0 operational catalog preserves all 10 exact FULL_SAFE_PREPROD capabilities without premature PROD canary',()=>{
  const c=buildP0OperationalCatalog();
  assert.equal(c.status,'GREEN_P0_OPERATIONAL_CATALOG');
  assert.equal(c.capability_count,10);
  assert.equal(c.prod_readonly_count,0);
  assert.equal(c.external_skill_code_execution,false);
  assert.equal(c.additional_cost_eur,0);
  for(const row of c.capabilities){assert.equal(row.full_safe_preprod_evidence_green,true);assert.equal(row.prod_capability_state,'HOLD_PREPROD_CANARY');assert.ok(row.target_engine_bindings.length>0);}
});

test('language capability is transversally bound to non-trading engines and PROD fails closed until main canary',()=>{
  const pre=resolveP0Capability({technical_name:'brand-voice',engine_id:'COM-001',environment:'PREPROD',requested_mode:'ANALYZE'});
  assert.equal(pre.allowed,true);
  const prod=resolveP0Capability({technical_name:'brand-voice',engine_id:'COM-001',environment:'PROD',requested_mode:'ANALYZE'});
  assert.equal(prod.allowed,false);
  assert.ok(prod.blockers.includes('PROD_READONLY_CANARY_NOT_GREEN'));
  const trd=resolveP0Capability({technical_name:'brand-voice',engine_id:'LAB-TRD',environment:'PREPROD',requested_mode:'ANALYZE'});
  assert.equal(trd.allowed,false);
  assert.ok(trd.blockers.includes('ENGINE_BINDING_MISMATCH'));
});

test('cross-device app scaffold creates a runnable zero-dependency PWA in PREPROD',()=>{
  const root=temp('cerebro-app-');const r=createCrossDeviceAppScaffold({name:'Demo Fenix',description:'Prueba',features:['Login','Expedientes'],output_root:root,company_id:'fenix'});
  assert.equal(r.status,'GREEN_CROSS_DEVICE_APP_SCAFFOLD_CREATED');
  for(const f of ['index.html','app.js','styles.css','manifest.webmanifest','sw.js','cerebro-app-contract.json','README.md'])assert.ok(fs.existsSync(path.join(r.output_dir,f)));
  const contract=JSON.parse(fs.readFileSync(path.join(r.output_dir,'cerebro-app-contract.json'),'utf8'));
  assert.equal(contract.targets.mobile,'RUNNABLE_PWA_INSTALLABLE');
  assert.equal(contract.prod_deploy_authorized,false);
});

test('website scaffold creates responsive semantic files without publishing PROD',()=>{
  const root=temp('cerebro-web-');const r=createWebsiteScaffold({name:'Demo Web',headline:'Más opciones',description:'Sitio de prueba',output_root:root});
  assert.equal(r.status,'GREEN_WEBSITE_SCAFFOLD_CREATED');
  assert.ok(fs.readFileSync(path.join(r.output_dir,'index.html'),'utf8').includes('viewport'));
  assert.equal(r.contract.prod_deploy_authorized,false);
});

test('analytics and A/B functions return deterministic auditable statistics',()=>{
  const d=descriptiveStatistics([1,2,3,4,5]);assert.equal(d.n,5);assert.equal(d.mean,3);assert.equal(d.median,3);
  const ab=twoProportionAB({control_success:100,control_total:1000,variant_success:130,variant_total:1000});
  assert.equal(ab.method,'two-proportion-z-test');assert.ok(ab.variant_rate>ab.control_rate);assert.ok(ab.p_value_two_sided>=0&&ab.p_value_two_sided<=1);
});

test('reporting renders HTML and Markdown with traceability contract',()=>{
  const h=buildStructuredReport({title:'Informe',summary:'Resumen',metrics:{leads:12},sections:[{heading:'Conclusión',body:'Sube.'}],format:'html'});
  assert.equal(h.status,'GREEN_REPORT_READY');assert.ok(h.content.includes('<h1>Informe</h1>'));assert.equal(h.source_traceability_required,true);
  const m=buildStructuredReport({title:'Informe',sections:[],format:'markdown'});assert.ok(m.content.startsWith('# Informe'));
});

test('public acquisition is HTTPS allowlist-only, bounded and never bypasses auth or anti-bot',async()=>{
  const fetch_impl=async()=>({ok:true,status:200,headers:{get:(k)=>k==='content-type'?'text/plain':'12'},arrayBuffer:async()=>Buffer.from('public data')});
  const r=await acquirePublicText({url:'https://example.com/public',allowed_hosts:['example.com'],fetch_impl});
  assert.equal(r.status,'GREEN_PUBLIC_READONLY_ACQUISITION');assert.equal(r.authenticated,false);assert.equal(r.captcha_bypass,false);assert.equal(r.anti_bot_bypass,false);
  await assert.rejects(()=>acquirePublicText({url:'http://example.com',allowed_hosts:['example.com'],fetch_impl}),/PUBLIC_HTTPS_URL_REQUIRED/);
  await assert.rejects(()=>acquirePublicText({url:'https://127.0.0.1/x',allowed_hosts:['127.0.0.1'],fetch_impl}),/PUBLIC_HTTPS_URL_REQUIRED/);
});

test('communication heuristic is explicitly a deterministic proxy, not fake human judgment',()=>{
  const r=evaluateCommunicationText('Sí. Lo importante primero: te doy el siguiente paso y la evidencia disponible.');
  assert.equal(r.status,'GREEN_COMMUNICATION_HEURISTIC');assert.equal(r.measurement_scope,'DETERMINISTIC_HEURISTIC_NOT_HUMAN_JUDGMENT');assert.equal(r.external_skill_code_execution,false);
});

test('operational dispatcher permits PREPROD artifact generation but never PROD artifact mutation',async()=>{
  const root=temp('cerebro-dispatch-');const pre=await runP0OperationalAction({technical_name:'project-bootstrapper',engine_id:'APP-001',environment:'PREPROD',action:'APP_SCAFFOLD',input:{name:'Dispatch Demo',output_root:root}});
  assert.equal(pre.status,'GREEN_P0_OPERATION_COMPLETE');
  const prod=await runP0OperationalAction({technical_name:'project-bootstrapper',engine_id:'APP-001',environment:'PROD',action:'APP_SCAFFOLD',input:{name:'Nope',output_root:root}});
  assert.equal(prod.status,'DENY_OPERATIONAL_ACTION');
});

test('synthetic humans run 160 deterministic self-play cases and emit bounded LRN-001 candidates',()=>{
  const r=runSyntheticSelfPlayCycle({cycle_id:'test-cycle'});
  assert.equal(r.case_count,160);assert.equal(r.status,'GREEN_SYNTHETIC_SELFPLAY_CYCLE');assert.ok(r.adaptive_weighted_average>r.baseline_weighted_average);assert.equal(r.prod_mutation_authorized,false);assert.equal(r.measurement_scope,'DETERMINISTIC_ZERO_COST_PROXY_EVALUATION');
  assert.ok(r.improvement_candidates.length>0);for(const c of r.improvement_candidates){assert.equal(c.target,'LRN-001');assert.equal(c.direct_prod_mutation,false);assert.equal(c.tribunal_required_before_prod_behavior_change,true);}
});

test('synthetic learning ledger is persistent and idempotent by report hash',()=>{
  const file=path.join(temp('cerebro-sh-ledger-'),'ledger.json');const r=runSyntheticSelfPlayCycle({cycle_id:'same'});const a=persistSyntheticLearning({report:r,ledgerFile:file});const b=persistSyntheticLearning({report:r,ledgerFile:file});
  assert.equal(a.duplicate,false);assert.equal(b.duplicate,true);assert.equal(b.cycle_count,1);
});
