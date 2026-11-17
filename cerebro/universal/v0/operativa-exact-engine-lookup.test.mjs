import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractExactEngineId,describeEngineLookup} from '../../../src/cerebroOperativaEngineLookup.ts';
import masterRegistry from '../../registry/engine-registry-detailed-20261113.json' with {type:'json'};
const proof=()=>({kind:'ready',capabilities:[],registeredDefinitions:179,operationalState:'NO_VERIFICADO',source:'LAB'});
const universe=(engines=[],catalog=[],scaffolded=[])=>({kind:'ready',data:{
 owner_scope:'SERVER_VERIFIED_FENIX_ONLY',status:'OK',
 registry:{status:'OK',source_status:'OWNER',companies:[],projects:[],engines},
 factory:{status:'OK',source_status:'FACT_GITOPS',observed_at:'2026-11-16T07:00:00Z',catalog,scaffolded}
}});
const definition={engine_id:'SEO-001',name:'SEO',purpose:'Optimización'};
test('exact motor ID is not a substring of a compound resource',()=>{
 assert.equal(extractExactEngineId('estado SEO-001'),'SEO-001');
 assert.equal(extractExactEngineId('BRANDBOOT-001'),'BRANDBOOT-001');
 assert.equal(extractExactEngineId('LAB-DEMO-001'),null);
 assert.equal(extractExactEngineId('SEO-001-extra'),null);
 assert.equal(extractExactEngineId('Estado de COMP-DEP-001'),'COMP-DEP-001');
 assert.equal(extractExactEngineId('Estado de COMP-HLT-001'),'COMP-HLT-001');
 assert.equal(extractExactEngineId('Estado de LAB-SEO'),'LAB-SEO');
 assert.equal(extractExactEngineId('Estado de 3RD-001'),'3RD-001');
});
test('historical registry cannot become LIVE or an agent count',()=>{
 const text=describeEngineLookup({engineId:'SEO-001',universe:universe(),proof:proof(),definition});
 assert.match(text,/REGISTRO HISTÓRICO: DEFINIDO/);
 assert.match(text,/Estado operativo\/latido: NO_VERIFICADO/);
 assert.match(text,/Control: NO_CONECTADO/);assert.match(text,/NO_MEDIDO/);
 assert.doesNotMatch(text,/0 agentes activos|EJECUCIÓN VERIFICADA/);
});
test('cross-tenant rows never appear under Fenix',()=>{
 const text=describeEngineLookup({engineId:'SEO-001',universe:universe([
  {company_id:'captacasa',engine_id:'SEO-001',engine_state:'RUNNING',environment:'LAB',version:'9'}
 ]),proof:proof(),definition});
 assert.doesNotMatch(text,/RUNNING|versión 9/);
});
test('reads FACT and PREPROD configuration without claiming execution',()=>{
 const p={...proof(),job001:{state:'OK',source_environment:'PREPROD',executionVerified:false,
  observedAt:'2026-11-16T08:00:00Z',
  engineBindings:[{engine_id:'SEO-001',declared_state:'RUNNING',freshness:'STALE_CONFIG',observed_config_at:'2026-09-15'}],
  controlEngineBindings:[{engine_id:'SEO-001',configured_controls:3,enabled_controls:2,stale_controls:1}]}};
 const out=describeEngineLookup({engineId:'SEO-001',universe:universe([
  {company_id:'fenix',engine_id:'SEO-001',engine_state:'CONFIGURED',environment:'LAB',version:'1'}
 ],[{engine_id:'SEO-001'}],[{engine_id:'SEO-001'}]),proof:p,definition});
 assert.match(out,/estado DECLARADO CONFIGURED/);
 assert.match(out,/configuración DECLARADA RUNNING/);
 assert.match(out,/STALE_CONFIG/);
 assert.match(out,/observado 2026-11-16/);
 assert.match(out,/TTL por recurso: NO INFORMADO/);
});
test('denied identity never leaks a historical description',()=>{
 const out=describeEngineLookup({engineId:'SEO-001',universe:{kind:'denied',data:null},proof:proof(),definition});
 assert.match(out,/^DENEGADO/);assert.doesNotMatch(out,/Optimización|FACT/);
});
test('unavailable is not zero and no unknown motor is invented',()=>{
 const out=describeEngineLookup({engineId:'UNKNOWN-001',universe:{kind:'unavailable',data:null},
  proof:{kind:'unavailable',capabilities:[],registeredDefinitions:null,operationalState:'NO_VERIFICADO',source:'SIN_EVIDENCIA_LIVE'}});
 assert.match(out,/no demuestra inexistencia/);assert.match(out,/NO_CONECTADO o NO_VERIFICADO/);
 assert.match(out,/Agentes\/subagentes activos: DESCONOCIDOS/);
});

test('all 179 master IDs are searchable, including unconventional exact names',()=>{
 assert.equal(masterRegistry.engines.length,179);
 const unique=new Set(masterRegistry.engines.map(x=>x.engine_id));
 assert.equal(unique.size,179);
 for(const item of masterRegistry.engines){
  assert.equal(extractExactEngineId('Consulta el motor '+item.engine_id),item.engine_id);
  const answer=describeEngineLookup({engineId:item.engine_id,universe:universe(),proof:proof(),definition:item});
  assert.match(answer,/REGISTRO HISTÓRICO: DEFINIDO/);
  assert.doesNotMatch(answer,/Identificador de motor inválido/);
  assert.match(answer,/Control: NO_CONECTADO/);
 }
});
test('unknown compound tokens never accidentally match the suffix engine',()=>{
 assert.equal(extractExactEngineId('INVENTED-COMP-DEP-001-TAIL'),null);
 assert.equal(extractExactEngineId('LAB-DEMO-001'),null);
 assert.match(describeEngineLookup({engineId:'LAB-DEMO-001',universe:universe(),proof:proof()}),/reservado al control LAB/);
});
