import {spokenResponseText} from '../src/cerebroVoice.ts';

function assert(condition,message){
 if(!condition)throw new Error(message);
}

{
 const out=spokenResponseText(
  'Actualmente la prioridad es revisar el flujo principal. Después hay que validar la evidencia técnica.',
  420,
  'normal',
  {status:'OK',intent:'knowledge',source_question:'¿Qué es lo más importante ahora?'}
 );
 assert(out.startsWith('Ahora mismo')||out.startsWith('Mira,'),'generic oral answer should sound conversational');
 assert(!out.includes('Te dejo el detalle completo por escrito.'),'normal prose must avoid repetitive screen boilerplate');
}

{
 const out=spokenResponseText(
  'Estado detallado con muchas métricas internas.',
  420,
  'normal',
  {status:'OK',intent:'autonomy_status',source_question:'¿Cómo funciona tu autonomía?'}
 );
 assert(out==='La idea es que yo resuelva lo ordinario y solo te pregunte cuando de verdad haga falta una decisión humana.','autonomy digest must be human and concise');
}

{
 const out=spokenResponseText(
  'Estado de arquitectura.',
  420,
  'normal',
  {status:'OK',intent:'platform_architecture',source_question:'¿Cómo repartimos Supabase y lo pesado?'}
 );
 assert(out.includes('Supabase se queda para el núcleo transaccional.'),'platform digest must use spoken wording');
 assert(!/gates|SHA|PR #|runtime/i.test(out),'spoken architecture answer must avoid technical ceremony');
}

{
 const out=spokenResponseText(
  'En tu memoria conversacional de CEREBRO consta esto:\n1. El proyecto Faro Azul se revisa los martes.',
  420,
  'normal',
  {status:'OK',intent:'conversation_memory',source_question:'¿Te acuerdas de Faro Azul?'}
 );
 assert(out.startsWith('Sí, me acuerdo:'),'memory recall should feel conversational');
}

console.log('GREEN CEREBRO natural spoken V4 behavioral corpus');
