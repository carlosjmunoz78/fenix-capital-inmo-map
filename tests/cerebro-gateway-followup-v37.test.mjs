import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerCerebroNaturalQuery} from '../cerebro/ops/gateway-v36-followups/conversation_intents.ts';
import {readFileSync} from 'node:fs';

const ownerAnswer='Para Fénix Capital puedo ayudarte ahora con tareas concretas de consulta: 1) comprobar cuántos expedientes activos constan en App Fénix; 2) buscar inmobiliarias por localidad, por ejemplo Córdoba; 3) consultar los trabajos de CEREBRO en ejecución, en cola y su resultado reciente, con la hora de los datos; 4) comprobar una próxima publicación social cuando esa fuente autorizada esté disponible. Puedes empezar con «¿Cuántos expedientes activos hay?» o «¿Qué trabajos de CEREBRO están en cola?». No he ejecutado ninguna consulta ni cambio al darte estas opciones.';

test('REAL owner follow-up: short semantic summary, no cut word or invented execution',()=>{
 const r=answerCerebroNaturalQuery('¿Puedes explicarme tu respuesta anterior de una forma más sencilla?',[
  {role:'user',text:'¿Qué puedes hacer por mí ahora mismo que sea útil para Fénix Capital?'},
  {role:'cerebro',text:ownerAnswer}
 ]);
 assert.equal(r?.intent,'explain_previous');
 assert.equal(r?.status,'OK');
 assert.equal(r?.executed,false);
 assert.ok(r.message.length<390, 'should truly simplify, not copy 400 chars');
 for(const word of ['expedientes','inmobiliarias','trabajos de CEREBRO','publicación','no he hecho ninguna consulta'])assert.match(r.message,new RegExp(word,'i'));
 assert.match(r.message,/[.!?]$/);
 assert.doesNotMatch(r.message,/mi respuesta anterior fue: Para Fénix|Pue$/);
 assert.ok(!r.message.includes(ownerAnswer.slice(0,160)));
});
test('does not hallucinate unavailable topics',()=>{
 const r=answerCerebroNaturalQuery('Resume lo anterior',[
  {role:'cerebro',text:'Puedo buscar inmobiliarias y comprobar expedientes activos. Todavía no he ejecutado nada.'}
 ]);
 assert.equal(r?.intent,'explain_previous');
 assert.match(r.message,/inmobiliarias/);
 assert.match(r.message,/expedientes/);
 assert.doesNotMatch(r.message,/publicación|trabajos de CEREBRO/);
});
test('generic previous answer does not end mid word and maintains uncertainty',()=>{
 const previous='La ejecución más antigua pendiente es Universal Media Studio V2 Gate. No conozco una causa verificada.';
 const r=answerCerebroNaturalQuery('¿Puedes explicarme tu respuesta anterior de una forma más sencilla?',[
  {role:'cerebro',text:previous}
 ]);
 assert.equal(r?.intent,'explain_previous');
 assert.match(r.message,/Universal Media Studio V2 Gate/);
 assert.ok(r.message.length<previous.length+45);
 const long='Esto es una respuesta '+('muy larga y comprobable '.repeat(45))+'.';
 const x=answerCerebroNaturalQuery('Resume lo anterior',[{role:'cerebro',text:long}]);
 assert.match(x.message,/… Si quieres, puedo explicarte una parte concreta\.$/);
 assert.doesNotMatch(x.message,/\s{2,}/);
});
test('missing context fails closed and actual action requests still delegate',()=>{
 const x=answerCerebroNaturalQuery('Resume lo anterior',[]);
 assert.equal(x?.status,'LOW_CONFIDENCE');
 assert.doesNotMatch(x.message,/inventé|he ejecutado/);
 for(const ask of ['Publica una entrada en WordPress','Busca correo de Antonio','Activa el motor SEO en PROD']){
  assert.equal(answerCerebroNaturalQuery(ask),null,ask);
 }
});
test('owner identity gateway and no arbitrary data grants are preserved',()=>{
 const src=readFileSync(new URL('../cerebro/ops/gateway-v36-followups/index.ts',import.meta.url),'utf8');
 assert.match(src,/withSupabase\(\{ auth: "user" \}/);
 assert.match(src,/if\(!owner.ok\)return json\(req,403/);
 assert.match(src,/prod_execution_enabled: false/);
 assert.match(src,/direct_model_access: false/);
 assert.match(src,/const owner=await authorizedOwner\(req\)/);
});


test('owner unified access is acknowledged as scope, not asserted as deployed',()=>{
 const query='¿Desde todas las interfaces puedo ver toda la información y hacer de todo?';
 const r=answerCerebroNaturalQuery(query);
 assert.equal(r?.intent,'owner_unified_access_scope');
 assert.equal(r?.status,'NOT_APPLIED');
 assert.equal(r?.executed,false);
 assert.match(r.message,/cualquiera de las interfaces/);
 assert.match(r.message,/todavía faltan conexiones/);
 assert.doesNotMatch(r.message,/ya puedo acceder a todo|ya he conectado todo/);
 const useful=answerCerebroNaturalQuery('¿Qué puedes hacer por mí ahora mismo que sea útil para Fénix Capital?');
 assert.equal(useful?.intent,'owner_useful_actions');
 assert.match(useful.message,/ejemplos, no el límite de CEREBRO/);
 assert.match(useful.message,/No he ejecutado/);
});
