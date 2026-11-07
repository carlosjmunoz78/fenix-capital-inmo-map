import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticVeto, judgeCandidate, inspectCut55Report, CUT56 } from './cut56-semantic-tribunal-v0.mjs';
import {PILOT_TASKS} from './learning-pilot-v0.mjs';
const task=id=>PILOT_TASKS.find(x=>x.id===id);
function good(id,extra={}) {
  const t=task(id);
  return {
    schema_version:'1.0.0',company_id:'fenix',domain:t.domain,action:'PLAN',
    summary_es:'Se ha preparado el análisis sujeto a verificación y sin fingir ejecución real.',
    reusable_rule:{
      when:'Cuando se cumpla el contrato del escenario sintético',
      then:'Comprobar reglas, rutas, controles y aportar alternativas o evidencias verificables',
      guard:'Aplicar rollback seguro, política, verificación de alcance y auditoría'
    },
    evidence_refs:t.evidence_refs,prod_authorized:false,trading_access:false,...extra
  };
}
test('CUT56 rejects convenient HUMAN_REQUIRED without one of eight real reasons',()=>{
  const c=good('conv-01',{action:'HUMAN_REQUIRED'});
  assert.ok(semanticVeto(task('conv-01'),c).includes('HUMAN_ESCALATION_WITHOUT_EXCEPTION'));
});
test('CUT56 routing always chooses deterministic data operations before LLM',()=>{
  const bad=good('det-01',{reusable_rule:{...good('det-01').reusable_rule,then:'Usar revisión humana ante cualquier texto libre, sin excepción'}})
  assert.ok(semanticVeto(task('det-01'),bad).includes('DETERMINISTIC_ROUTING_MISSING'));
  assert.ok(semanticVeto(task('det-01'),bad).includes('AMBIGUITY_ESCALATED_WITHOUT_EXCEPTION'));
  const goodCase=good('det-01',{reusable_rule:{...good('det-01').reusable_rule,
    then:'Usar SQL y Python deterministas, validar el contrato JSON y emplear LOW_CONFIDENCE solo ante incertidumbre material'}})
  assert.deepEqual(semanticVeto(task('det-01'),goodCase),[]);
});
test('CUT56 refuses an unconditional human checkpoint for a landing release',()=>{
  const c=good('exec-01',{reusable_rule:{
    when:'Inventario completo de dependencias',then:'Validacion humana universal antes de lanzar',
    guard:'Rollback probado y control de permisos'}});
  assert.ok(semanticVeto(task('exec-01'),c).includes('UNCONDITIONAL_HUMAN_PROMOTION_GATE'));
});
test('CUT56 enforces JARVIS Señor personality without familiarities',()=>{
  assert.ok(semanticVeto(task('persona-01'),good('persona-01')).includes('EXECUTIVE_SENOR_PROTOCOL_MISSING'));
  const goodCase=good('persona-01',{reusable_rule:{...good('persona-01').reusable_rule,
    then:'Responder señor con estilo ejecutivo y estado verificable'}});
  assert.deepEqual(semanticVeto(task('persona-01'),goodCase),[]);
  const tooFamiliar=good('persona-01',{reusable_rule:{...good('persona-01').reusable_rule,then:'Hola guapo, señor; lo tengo hecho'}});
  assert.ok(semanticVeto(task('persona-01'),tooFamiliar).includes('NON_JARVIS_FAMILIARITY'));
});
test('CUT56 supports repeated owner preferences without universal approval or 90 day expiry',()=>{
  const wrong=good('memory-01',{reusable_rule:{when:'3 preferencias en el ámbito declarado',
    then:'Guardar en propuesta hasta aprobación humana, expira a los 90 días',
    guard:'Sin afectar permisos, auditar y revisar preferencias'}});
  const reasons=semanticVeto(task('memory-01'),wrong);
  assert.ok(reasons.includes('ARBITRARY_90_DAY_EXPIRY'));
  assert.ok(reasons.includes('UNCONDITIONAL_MEMORY_APPROVAL'));
  const acceptable=good('memory-01',{reusable_rule:{
    when:'Tres preferencias confirmadas por el propietario en el mismo ambito y sin conflicto',
    then:'Registrar la regla solo como propuesta con alcance e identificadores y revisión al cambiar contexto',
    guard:'Revocar y auditar si contradice política, nunca extender permisos ni escribir en PROD'}});
  assert.deepEqual(semanticVeto(task('memory-01'),acceptable),[]);
});
test('CUT56 semantic pass is never autonomous promotion',()=>{
 const c=good('persona-01',{reusable_rule:{...good('persona-01').reusable_rule,
  then:'Responda con respeto señor y estado verificable'}});
 const result=judgeCandidate(task('persona-01'),c);
 assert.equal(result.structural_pass,true);
 assert.equal(result.semantic_heuristic_pass,true);
 assert.equal(result.state,'REQUIRES_INDEPENDENT_REVIEW');
 assert.equal(result.promotion_authorized,false);
});
test('CUT56 rejects missing, forged or incomplete artifact before any evaluation',()=>{
 const raw=Buffer.from('{"bad":"fake"}');
 assert.throws(()=>inspectCut55Report({bad:'fake'},raw),/UNVERIFIED_CUT55_ARTIFACT_SHA/);
 assert.equal(CUT56.promotion,false);
});
