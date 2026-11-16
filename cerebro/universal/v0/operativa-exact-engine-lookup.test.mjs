import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractExactEngineId,describeEngineLookup} from '../../../src/cerebroOperativaEngineLookup.ts';
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
