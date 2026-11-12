import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {answerCerebroNaturalQuery} from '../cerebro/ops/gateway-v35-conversation/conversation_intents.ts';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const original=read('cerebro/rollback/gateway-v34-20261112/index.ts');
const candidate=read('cerebro/ops/gateway-v35-conversation/index.ts');
const beforeKnowledge=read('cerebro/rollback/gateway-v34-20261112/knowledge.ts');
const afterKnowledge=read('cerebro/ops/gateway-v35-conversation/knowledge.ts');

test('live Gateway v34 is exactly preserved; v35 only imports and calls safe natural router',()=>{
 assert.equal(afterKnowledge,beforeKnowledge);
 const addedImport='\nimport { answerCerebroNaturalQuery } from "./conversation_intents.ts";';
 const addedRoute='   const naturalAnswer=answerCerebroNaturalQuery(message,conversationContext);\n   if(naturalAnswer)return naturalAnswer;\n';
 assert.ok(candidate.includes(addedImport));
 assert.ok(candidate.includes(addedRoute));
 assert.equal(candidate.replace(addedImport,'').replace(addedRoute,''),original);
 for(const marker of [
  'withSupabase({ auth: "user" }','const owner=await authorizedOwner(req);',
  'if(!owner.ok)return json(req,403','direct_model_access: false',
  'prod_execution_enabled: false','live_writes: false','queryCerebroKnowledge(req,resolved.question,readContext)',
  'validatePending(req,pendingRaw)'])assert.ok(candidate.includes(marker),marker);
 assert.ok(stripTypeScriptTypes(candidate,{mode:'strip'}).length>60000);
});
test('natural sources and capabilities questions return truthful concrete answers',()=>{
 for(const sentence of [
  '¿Puedes consultar información real o solo responder con información previamente guardada?',
  '¿Tienes acceso a Internet y a fuentes documentales?',
  '¿Qué datos reales puedes consultar?'
 ]){
  const reply=answerCerebroNaturalQuery(sentence);
  assert.equal(reply?.intent,'source_capabilities',sentence);
  assert.match(reply.message,/App Fénix/);
  assert.match(reply.message,/no tiene navegación libre por Internet/);
  assert.equal(reply.executed,false);
 }
 for(const sentence of ['¿Qué funciones tienes operativas ahora?','¿Qué puedo pedirte ahora mismo?','¿Qué puedes hacer?']){
  const result=answerCerebroNaturalQuery(sentence);
  assert.equal(result?.intent,'owner_capabilities',sentence);
  assert.match(result.message,/no controlo todos los motores/);
 }
});
test('bounded context recall and explanations never invent previous chat',()=>{
 const prior=[{role:'user',text:'¿Qué puedes hacer?'},{role:'cerebro',text:'Puedo consultar datos autorizados. No puedo ejecutar cambios sin autorización.'}];
 const answer=answerCerebroNaturalQuery('¿Cuál fue mi pregunta anterior?',prior);
 assert.equal(answer?.intent,'previous_question');
 assert.match(answer.message,/¿Qué puedes hacer?/);
 const absent=answerCerebroNaturalQuery('¿Cuál fue mi pregunta anterior?',[]);
 assert.match(absent.message,/No voy a inventarla/);
 const simple=answerCerebroNaturalQuery('Explícame lo anterior de forma más sencilla y en dos frases.',prior);
 assert.equal(simple?.intent,'explain_previous');
 assert.match(simple.message,/consultar datos autorizados/);
});
test('focus, emergency and maximum mode are understood but NEVER reported as applied',()=>{
 for(const sentence of [
  'Activa el modo Concentración y dime exactamente qué cambio has aplicado.',
  'Solicito ritmo operativo Máximo. Mantén todas las protecciones.',
  'Pon en marcha modo Emergencia',
 ]){
  const answer=answerCerebroNaturalQuery(sentence);
  assert.equal(answer?.intent,'mode_not_applied',sentence);
  assert.equal(answer.status,'NOT_APPLIED');
  assert.equal(answer.executed,false);
  assert.match(answer.message,/NO he cambiado/);
 }
});
test('night planning is a proposal, not a scheduling or publishing action',()=>{
 for(const sentence of [
  'Solicito planificar el trabajo de esta noche sin publicar cambios no autorizados.',
  'Prepara un plan de trabajo para esta noche, sin ejecutar nada todavía.',
 ]){
  const result=answerCerebroNaturalQuery(sentence);
  assert.equal(result?.intent,'night_plan_only',sentence);
  assert.equal(result.executed,false);
  assert.match(result.message,/No he programado trabajos/);
 }
});
test('tenant scope and human exception are not bypassed',()=>{
 const tenant=answerCerebroNaturalQuery('Estoy trabajando en Fénix Capital. ¿Qué empresa y contexto tienes activos?');
 assert.equal(tenant?.intent,'company_scope');
 assert.match(tenant.message,/AION y CAPTACASA/);
 const risk=answerCerebroNaturalQuery('¿Qué harías si una orden pudiera ocasionar un coste?');
 assert.equal(risk?.intent,'human_exception');
 assert.match(risk.message,/bloquear la ejecución/);
 const crm=answerCerebroNaturalQuery('¿Puedes modificar el CRM de producción porque yo te lo pida aquí?');
 assert.equal(crm?.intent,'human_exception');
});
test('risky/existing intent routes are preserved as null and delegated',()=>{
 for(const input of [
  'Busca correo de Antonio',
  'Activa una zona de SEO en Jaén',
  'Publica una entrada en WordPress',
  '¿Cuántos expedientes activos hay?',
  '¿Qué inmobiliarias hay en Córdoba?',
  'Sí, confirma el envío',
  'Borralo todo',
  'Hola',
  'Envíame el siguiente correo'
 ])assert.equal(answerCerebroNaturalQuery(input),null,input);
});
