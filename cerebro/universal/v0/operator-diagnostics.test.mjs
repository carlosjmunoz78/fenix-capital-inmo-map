import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyDiagnosticRequest,answerDiagnosticRequest} from '../../../src/cerebroOperativaDiagnostics.ts';
const now=()=>new Date().toISOString();
const live=()=>({
 kind:'ready',reason:'',snapshot:{
  status:'OK',source:'OWNER_LAB_FLEET_SOURCES_V1',company_id:'fenix',environment:'LAB',observed_at:now(),
  verified_owner:true,read_only:true,execution_enabled:false,additional_cost_eur:0,
  roles:{declared_role_profiles:11,active_agent_count:null,verified_subagent_count:null,
   unknown_agent_count:true,unknown_subagent_count:true,hierarchy_complete:false,by_department:{ENGINEERING:10},entries:[]},
  engine_registry_count:179,engine_registry_semantics:'DEFINED_NOT_RUNNING',sources:[
   {name:'App / CEREBRO',platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-inmo-map',
    state:'LIVE',reason:null,observed_at:now(),recent:[
     {run_id:42,name:'CEREBRO QA',status:'completed',conclusion:'failure',updated_at:now(),
      url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42',engine_id:null,agent_id:null,subagent_id:null},
     {run_id:43,name:'Engine Registry',status:'in_progress',conclusion:null,updated_at:now(),
      url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43',engine_id:null,agent_id:null,subagent_id:null}
    ]},
   {platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-cerebro-social',name:'Social / AUTOQUAL',
    state:'UNAVAILABLE',reason:'PRIVATE_REPO_RUNTIME_CONNECTOR_NOT_CONFIGURED',observed_at:null,recent:[]},
   {platform:'Cloudflare',name:'Cloudflare',state:'UNAVAILABLE',reason:'OWNER_RUNTIME_CONNECTOR_NOT_VERIFIED',observed_at:null}
  ]
 }
});
for(const [q,expectation] of [
 ['Qué agentes faltan para SEO-001','MISSING'],
 ['Qué está fallando ahora','FAILURES'],
 ['Qué puede hacer CEREBRO','CAPABILITIES'],
 ['Qué necesitamos que haga CEREBRO','MISSING'],
 ['Qué hay que avanzar','PROGRESS'],
 ['Qué deberíamos priorizar','PROGRESS'],
 ['¿Cuánto tarda cada trabajo?','ESTIMATES'],
 ['¿Cuánto cuesta terminar Instagram?','ESTIMATES'],
 ['Tiempo y coste de SEO-001','ESTIMATES'],
 ['¿Cuántos agentes tenemos?',null],
 ['pausar SEO-001',null],
 ['acelerar SEO-001',null],
 ['priorizar SEO-001',null],
 ['ejecutar una campaña',null]
]){
 test('diagnostic classification is read-only: '+q,()=>assert.equal(classifyDiagnosticRequest(q),expectation));
}
test('no invented agent counts: missing identities are unverified, not necessarily missing agents',()=>{
 const text=answerDiagnosticRequest('MISSING',live(),'Qué agentes faltan para SEO-001');
 assert.match(text,/NO CUANTIFICABLES/);
 assert.match(text,/11 perfiles/);
 assert.match(text,/179 motores/);
 assert.match(text,/Social \/ AUTOQUAL/);
 assert.match(text,/sin correspondencia|no acredita telemetría individual/i);
 assert.doesNotMatch(text,/0 agentes faltan|0 agentes activos/);
});
test('failures are reported only from actual sampled run conclusions, never as engine failure',()=>{
 const text=answerDiagnosticRequest('FAILURES',live(),'Qué falla');
 assert.match(text,/CEREBRO QA \[failure\]/);
 assert.match(text,/actions\/runs\/42/);
 assert.match(text,/NO censo global/);
 assert.match(text,/Causa raíz.*NO VERIFICADAS/);
});
test('cost and ETA are unknown until measured, without fabricated numbers',()=>{
 const text=answerDiagnosticRequest('ESTIMATES',live(),'Cuánto cuesta y tarda');
 assert.match(text,/TIEMPO: NO_MEDIDO/);
 assert.match(text,/ETA DEL MOTOR: SIN_BASE_SUFICIENTE/);
 assert.match(text,/COSTE REAL.*NO_MEDIDOS/);
 assert.doesNotMatch(text,/0 €|1 hora|2 horas|gratis garantizado/);
});
test('capabilities distinguish existing registry readings from verified runtime execution',()=>{
 const text=answerDiagnosticRequest('CAPABILITIES',live(),'Qué puede hacer CEREBRO');
 assert.match(text,/179 definiciones/);
 assert.match(text,/NO ACREDITADO/);
 assert.match(text,/autonomía de los motores/);
});
test('stale records and disconnected source never become live evidence or inferred zero',()=>{
 const stale=live();
 stale.snapshot.observed_at='2026-01-01T00:00:00Z';
 const res=answerDiagnosticRequest('FAILURES',stale,'Qué falla');
 assert.match(res,/DATOS EN VIVO NO DISPONIBLES/);
 assert.match(res,/No se puede concluir que haya cero agentes/);
 const denied=answerDiagnosticRequest('ESTIMATES',{kind:'unavailable',reason:'UPSTREAM_DOWN',snapshot:null},'Cuánto cuesta');
 assert.match(denied,/UPSTREAM_DOWN/);
 assert.match(denied,/NO_MEDIDOS/);
});
test('no mutation and no provider/network imports in diagnostic reader',async()=>{
 const data=await import('node:fs/promises').then(x=>x.readFile(new URL('../../../src/cerebroOperativaDiagnostics.ts',import.meta.url),'utf8'));
 assert.ok(!/\bfetch\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\bPOST\b/.test(data));
});

test('specific GitHub workflow reports observed bounded timing, not an engine ETA or verified cost',()=>{
 const sample=live();
 sample.snapshot.sources[0].timing_samples=[{
  workflow_name:'CEREBRO Universal Gateway V0 LAB contract CI',
  sample_size:4,p50_upper_bound_seconds:20,p90_upper_bound_seconds:40,
  method:'GITHUB_RUN_STARTED_TO_LAST_UPDATE_PROXY',engine_mapping_verified:false
 }];
 const answer=answerDiagnosticRequest('ESTIMATES',sample,'¿Cuánto tarda CEREBRO Universal Gateway V0 LAB contract CI?');
 assert.match(answer,/TIEMPO DEL WORKFLOW GITHUB/);
 assert.match(answer,/p50=20 s, p90=40 s/);
 assert.match(answer,/NO duración exacta/);
 assert.match(answer,/ETA DEL MOTOR: SIN_BASE_SUFICIENTE/);
 assert.match(answer,/COSTE REAL.*NO_MEDIDOS/);
 const unknown=answerDiagnosticRequest('ESTIMATES',sample,'Cuánto tarda SEO-001');
 assert.match(unknown,/TIEMPO: NO_MEDIDO/);
 assert.doesNotMatch(unknown,/p50=20 s/);
});
