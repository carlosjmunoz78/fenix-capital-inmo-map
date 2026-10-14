import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const repoRoot=path.resolve(__dirname,'..','..');
const specs=[
  ['cerebro/skills/cerebro-184-items-62-68-live-reconciliation.v2.json','CEREBRO_184_ITEMS_62_68_LIVE_RECONCILIATION_V2',62,68],
  ['cerebro/skills/cerebro-184-items-69-73-live-reconciliation.v2.json','CEREBRO_184_ITEMS_69_73_LIVE_RECONCILIATION_V2',69,73],
  ['cerebro/skills/cerebro-184-items-74-82-live-reconciliation.v2.json','CEREBRO_184_ITEMS_74_82_LIVE_RECONCILIATION_V2',74,82],
  ['cerebro/skills/cerebro-184-items-83-92-live-reconciliation.v2.json','CEREBRO_184_ITEMS_83_92_LIVE_RECONCILIATION_V2',83,92]
];
const canonical=new Set(['REUTILIZAR','ENVOLVER','CATALOGAR','FABRICAR_GRATIS','HOLD','DESCARTAR','PAGO_JUSTIFICADO']);
function load(spec){return JSON.parse(fs.readFileSync(path.join(repoRoot,spec[0]),'utf8'));}

test('reconciliation covers exact canonical item ids 62 through 92 once',()=>{
  const ids=[];
  for(const spec of specs){const s=load(spec);assert.equal(s.state_type,spec[1]);assert.equal(s.company_id,'GLOBAL');assert.equal(s.engine_id,'FACT-001');assert.equal(s.environment,'PREPROD');const expected=Array.from({length:spec[3]-spec[2]+1},(_,i)=>spec[2]+i);assert.deepEqual(s.items.map(x=>x.id),expected);ids.push(...expected);}
  assert.equal(ids.length,31);assert.equal(new Set(ids).size,31);assert.deepEqual(ids,Array.from({length:31},(_,i)=>62+i));
});

test('every item has canonical disposition, evidence, owner and reason',()=>{
  for(const spec of specs){for(const item of load(spec).items){assert.equal(canonical.has(item.disposition),true,`item ${item.id}`);assert.ok(Array.isArray(item.owner_engine_ids)&&item.owner_engine_ids.length>0,`owner ${item.id}`);assert.ok(Array.isArray(item.evidence)&&item.evidence.length>0,`evidence ${item.id}`);assert.ok(typeof item.reason==='string'&&item.reason.length>30,`reason ${item.id}`);for(const rel of item.evidence)assert.equal(fs.existsSync(path.join(repoRoot,rel)),true,`${item.id}:${rel}`);}}
});

test('all blocks preserve zero-cost fail-closed authority',()=>{
  for(const spec of specs){const s=load(spec);const a=s.authority;for(const key of ['prod_authorized','prod_write_authorized','auto_merge_authorized','external_skill_code_execution_authorized','external_dependency_install_authorized','customer_data_authorized','trading_access','automatic_paid_fallback'])assert.equal(a[key],false,`${spec[0]}:${key}`);assert.equal(a.additional_cost_eur,0);assert.equal(s.summary.additional_cost_eur,0);assert.deepEqual(s.summary.human_required,[]);assert.equal(s.items.some(i=>i.disposition==='PAGO_JUSTIFICADO'),false);}
});

test('real zero-cost build gaps extend existing engines only',()=>{
  const s62=load(specs[0]),s74=load(specs[2]);
  const cap=s62.items.find(i=>i.id===62),evt=s74.items.find(i=>i.id===74);
  assert.equal(cap.disposition,'FABRICAR_GRATIS');assert.equal(cap.owner_engine_ids.includes('CAP-001'),true);assert.equal(cap.owner_engine_ids.includes('FACT-001'),true);
  assert.equal(evt.disposition,'FABRICAR_GRATIS');assert.equal(evt.owner_engine_ids.includes('EVT-001'),true);assert.equal(evt.owner_engine_ids.includes('FACT-001'),true);
});

test('privacy, paid and license-conflict candidates remain held/reference-only',()=>{
  const all=specs.flatMap(spec=>load(spec).items);
  for(const id of [69,72,76,78,90])assert.equal(all.find(i=>i.id===id)?.disposition,'HOLD',`item ${id}`);
  for(const id of [66,67,68,73,75,77])assert.equal(all.find(i=>i.id===id)?.disposition,'CATALOGAR',`item ${id}`);
  const verifio=all.find(i=>i.id===90);assert.match(verifio.state,/LICENSE_CONFLICT/);assert.equal(verifio.external_reference.external_code_executed,false);assert.equal(verifio.external_reference.dependency_installed,false);
});

test('lead scoring remains deterministic/read-only rather than falsely autonomous',()=>{
  const s=load(specs[3]);
  for(const id of [83,84,85,86,87,88,89,91,92]){const item=s.items.find(i=>i.id===id);assert.equal(item.disposition,'REUTILIZAR');assert.match(item.state,/PARTIAL_PREPROD/);}
  assert.equal(s.items.find(i=>i.id===90)?.disposition,'HOLD');
});
