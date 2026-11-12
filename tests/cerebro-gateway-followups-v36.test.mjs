import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {answerCerebroNaturalQuery as oldAnswer} from '../cerebro/rollback/gateway-v35-20261112/conversation_intents.ts';
import {answerCerebroNaturalQuery as improvedAnswer} from '../cerebro/ops/gateway-v36-followups/conversation_intents.ts';
import {answerWithVerifiedActivity} from '../cerebro/ops/gateway-v36-followups/activity_reader.ts';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const oldFiles=['index.ts','knowledge.ts','conversation_intents.ts','activity_reader.ts'].map(name=>read('cerebro/rollback/gateway-v35-20261112/'+name));
const newFiles=['index.ts','knowledge.ts','conversation_intents.ts','activity_reader.ts'].map(name=>read('cerebro/ops/gateway-v36-followups/'+name));

test('Gateway owner auth, knowledge and governed execution remain preserved while read-only registry is additive',()=>{
 const authBlock=(src)=>{
  const i=src.indexOf("async function authorizedOwner(req:Request){");
  const next=src.indexOf(String.fromCharCode(10)+"async function ",i+1);
  return i<0||next<0?"":src.slice(i,next).trim();
 };
 const oldAuth=authBlock(oldFiles[0]);
 const newAuth=authBlock(newFiles[0]);
 assert.ok(oldAuth&&newAuth);
 assert.equal(newAuth,oldAuth,"owner authentication implementation stays byte-exact");
 assert.ok(newFiles[0].includes('readOwnerRegistryLive'));
 assert.ok(newFiles[0].includes('if(req.method==="GET"&&suffix==="owner-registry")'));
 assert.ok(newFiles[0].indexOf('if(!owner.ok)return json(req,403')<
   newFiles[0].indexOf('if(req.method==="GET"&&suffix==="owner-registry")'));
 assert.equal(newFiles[1],oldFiles[1]);
 for(const marker of [
  'withSupabase({ auth: "user" }',
  'const owner=await authorizedOwner(req);',
  'if(!owner.ok)return json(req,403',
  'direct_model_access: false',
  'prod_execution_enabled: false',
  'live_writes: false',
  'answerCerebroNaturalQuery(message,conversationContext)',
  'answerWithVerifiedActivity(req,message)',
  'validatePending(req,pendingRaw)'
 ])assert.ok(newFiles[0].includes(marker),marker);
 for(const file of newFiles)assert.ok(stripTypeScriptTypes(file,{mode:'strip'}).length>100);
});
test('original exact failure: explain my previous answer in simple terms',()=>{
 const context=[
  {role:'user',text:'¿Cuál es el trabajo que lleva más tiempo esperando y por qué?'},
  {role:'cerebro',text:'La ejecución más antigua pendiente es Universal Media Studio V2 Gate. No conozco una causa verificada.'},
  {role:'user',text:'CEREBRO, ¿cuál fue mi pregunta anterior?'},
  {role:'cerebro',text:'Tu última pregunta fue: «¿Cuál es el trabajo que lleva más tiempo esperando y por qué?». No conozco causas no verificadas.'}
 ];
 const question='¿Puedes explicarme tu respuesta anterior de una forma más sencilla?';
 assert.equal(oldAnswer(question,context),null);
 const response=improvedAnswer(question,context);
 assert.equal(response?.intent,'explain_previous');
 assert.equal(response?.status,'OK');
 assert.equal(response?.executed,false);
 assert.match(response.message,/Tu última pregunta fue/);
 assert.doesNotMatch(response.message,/No te he entendido/);
});
test('follow-up variants are understood without false memory',()=>{
 const previous=[{role:'user',text:'¿Qué está en cola?'},{role:'cerebro',text:'Hay dos trabajos visibles, pero sus causas de espera no están verificadas.'}];
 for(const ask of [
  'Explícame lo anterior de forma más sencilla y en dos frases.',
  '¿Me puedes resumir tu respuesta anterior?',
  'Puedes explicar tu última respuesta',
  'Resume lo anterior'
 ]){
  const r=improvedAnswer(ask,previous);
  assert.equal(r?.intent,'explain_previous',ask);
  assert.ok(r.message.includes('dos trabajos'),ask);
 }
 const missing=improvedAnswer('¿Cuál fue mi pregunta anterior?',[]);
 assert.equal(missing?.intent,'previous_question');
 assert.match(missing.message,/si se ha recargado o reiniciado/i);
 assert.doesNotMatch(missing.message,/mi pregunta anterior fue:/);
});
test('specific Fénix owner question yields 4 concrete, supported read-only tasks',()=>{
 const ask='¿Qué puedes hacer por mí ahora mismo que sea útil para Fénix Capital?';
 const old=oldAnswer(ask);
 assert.equal(old?.intent,'owner_capabilities');
 const r=improvedAnswer(ask);
 assert.equal(r?.intent,'owner_useful_actions');
 assert.equal(r?.executed,false);
 for(const x of ['expedientes activos','inmobiliarias por localidad','trabajos de CEREBRO','próxima publicación social','No he ejecutado'])assert.ok(r.message.includes(x),x);
 assert.doesNotMatch(r.message,/He iniciado|He publicado|Ya he cambiado/);
 const r2=improvedAnswer('Dime tres tareas concretas que puedes hacer por mí ahora mismo');
 assert.equal(r2?.intent,'owner_useful_actions');
});
test('existing approved queries and dangerous action routes are unchanged',()=>{
 const expectedIntent={
  '¿Puedes consultar información real o solo responder con información previamente guardada?':'source_capabilities',
  '¿Qué funciones tienes operativas ahora?':'owner_capabilities',
  '¿Cuál fue mi pregunta anterior?':'previous_question',
  'Solicito ritmo operativo Máximo. Mantén todas las protecciones.':'mode_not_applied',
  'Prepara un plan de trabajo para esta noche, sin ejecutar nada todavía.':'night_plan_only',
  'Muéstrame los trabajos de AION':'company_scope',
  '¿Puedes modificar el CRM de producción porque yo te lo pida aquí?':'human_exception'
 };
 for(const [ask,expected] of Object.entries(expectedIntent))assert.equal(improvedAnswer(ask)?.intent,expected,ask);
 for(const ask of [
  'Busca correo de Antonio',
  'Publica una entrada en WordPress',
  'Activa una zona de SEO en Jaén',
  '¿Cuántos expedientes activos hay?',
  '¿Qué inmobiliarias hay en Córdoba?',
  'Sí, confirma el envío',
  'Bórralo todo'
 ])assert.equal(improvedAnswer(ask),null,ask);
});
test('verified activity handles ONE running job grammatically and keeps observed_at',async()=>{
 const now=new Date().toISOString(),repo='carlosjmunoz78/fenix-capital-inmo-map';
 const data={status:'OK',observed_at:now,repository:repo,source_status:'CACHED',
 runs:[
  {run_id:199,workflow_name:'CEREBRO Browser V2',status:'in_progress',conclusion:null,
   html_url:'https://github.com/'+repo+'/actions/runs/199',
   created_at:now,updated_at:now,source:'GITHUB_ACTIONS',company_id:'fenix'},
  {run_id:200,workflow_name:'CEREBRO Gate',status:'queued',conclusion:null,
   html_url:'https://github.com/'+repo+'/actions/runs/200',
   created_at:now,updated_at:now,source:'GITHUB_ACTIONS',company_id:'fenix'}
 ]};
 const req=new Request('https://example.com/console',{headers:{authorization:'Bearer owner_test_jwt',apikey:'public_test_key'}});
 const stub=async(_url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.headers.Authorization,'Bearer owner_test_jwt');
  return new Response(JSON.stringify(data),{status:200});
 };
 const r=await answerWithVerifiedActivity(req,'¿Cuántos trabajos hay ahora en ejecución y en cola?',stub);
 assert.equal(r.status,'OK');
 assert.match(r.message,/1 ejecución en curso y 1 trabajo en cola/);
 assert.doesNotMatch(r.message,/1 ejecuciones/);
 assert.match(r.message,/resultados terminados visibles/);
 assert.equal(r.source.observed_at,now);
});
