import {voiceInterruptRequested,spokenResponseText} from '../src/cerebroVoice.ts';

function assert(condition,message){
 if(!condition)throw new Error(message);
}

for(const phrase of ['para','para ya','CEREBRO para','stop','calla','cállate','silencio','basta','detente','oye CEREBRO para por favor']){
 assert(voiceInterruptRequested(phrase),`interrupt phrase not recognized: ${phrase}`);
}

for(const phrase of ['para Belén','esto es para mañana','prepara el correo','compara opciones','paramos luego']){
 assert(!voiceInterruptRequested(phrase),`false verbal interruption: ${phrase}`);
}

{
 const out=spokenResponseText(
  'La estrategia actual de marketing de Fénix Capital prioriza crecimiento orgánico y reutilización de activos antes de gasto nuevo. Canales prioritarios: SEO, SEO local, contenidos, redes orgánicas, Google Business Profile, B2B con inmobiliarias, CRM/reactivación, referidos y reutilización multicanal.',
  420,
  'normal',
  {status:'OK',intent:'marketing_strategy'}
 );
 assert(out==='Ahora mismo la prioridad es sacar más partido a lo orgánico y a lo que ya tenemos antes de meter más gasto.','marketing spoken digest regression');
}

{
 const out=spokenResponseText(
  'Última auditoría SEO canónica disponible.\n\nPendiente prioritario:\n1. Recuperar acceso a GSC para CTR y ranking.\n2. Consolidar Jaén.\n\nGates pendientes:\n- No tocar claims.',
  420,
  'normal',
  {status:'OK',intent:'seo_status'}
 );
 assert(out.includes('lo más importante es Recuperar acceso a GSC'),'SEO spoken digest must prioritize the next action');
 assert(!out.includes('2.'),'SEO spoken digest must not read the list');
}

{
 const out=spokenResponseText(
  'Primera explicación bastante larga. Segunda explicación. Tercera explicación.',
  420,
  'normal',
  {status:'OK',intent:'knowledge'}
 );
 assert(!out.includes('Segunda explicación'),'generic spoken output should not read multiple prose sentences by default');
 assert(!out.includes('Te dejo el detalle completo por escrito.'),'generic concise speech should avoid repetitive written-detail boilerplate');
}

console.log('GREEN CEREBRO verbal barge-in + spoken digest V3');
