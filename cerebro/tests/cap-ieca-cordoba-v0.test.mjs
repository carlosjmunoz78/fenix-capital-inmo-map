import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIecaRealEstateCandidatesV0 } from '../runtime/cap-ieca-cordoba-v0.mjs';

const fixture={features:[
  {properties:{codmun:'14021',actividad:'Actividades Administrativas, Financieras y de Seguros',nombre:'Inmobiliaria Centro Córdoba',razon_soci:'CENTRO CORDOBA SL',id_directo:101}},
  {properties:{codmun:'14021',actividad:'Actividades Administrativas, Financieras y de Seguros',nombre:'Fincas Sur',razon_soci:'FINCAS SUR SL',id_directo:102}},
  {properties:{codmun:'14021',actividad:'Actividades Administrativas, Financieras y de Seguros',nombre:'Seguros Ejemplo',razon_soci:'SEGUROS EJEMPLO SL',id_directo:103}},
  {properties:{codmun:'41091',actividad:'Actividades Administrativas, Financieras y de Seguros',nombre:'Inmobiliaria Sevilla',razon_soci:'SEVILLA SL',id_directo:104}},
  {properties:{codmun:'14021',actividad:'Comercio',nombre:'Inmobiliaria Comercio',razon_soci:'COMERCIO SL',id_directo:105}}
]};

test('IECA extractor keeps only deterministic Córdoba real-estate business candidates',()=>{
  const rows=extractIecaRealEstateCandidatesV0(fixture,{evidence_at:'2026-10-15T00:00:00Z'});
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.registry_id),['101','102']);
  for(const row of rows){
    assert.equal(row.location,'cordoba');
    assert.equal(row.sector,'real_estate_business_candidate');
    assert.ok(row.signals.includes('official_ieca_establishment'));
    assert.ok(row.signals.includes('real_estate_name_match'));
    assert.equal(row.evidence_refs.length,1);
    assert.match(row.evidence_refs[0],/^ieca-espand:\d+$/);
    assert.match(row.lead_key,/^[a-f0-9]{64}$/);
  }
});

test('IECA extractor rejects malformed source payload',()=>{
  assert.throws(()=>extractIecaRealEstateCandidatesV0({}),/FeatureCollection/);
});
