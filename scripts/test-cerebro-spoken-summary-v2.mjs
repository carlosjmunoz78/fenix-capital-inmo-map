import {spokenResponseText} from '../src/cerebroVoice.ts';

function assert(condition,message){
 if(!condition)throw new Error(message);
}

{
 const out=spokenResponseText(
  'He localizado el documento. Puedes abrirlo aquí: https://example.com/documento/largo?foo=bar. También contiene el detalle técnico completo.',
  440,
  'normal'
 );
 assert(!out.includes('http'),'must never speak raw URL');
 assert(out.includes('Te dejo el enlace por escrito.'),'must replace URL with spoken cue');
}

{
 const out=spokenResponseText(
  '1. Revisar el SEO local.\n2. Actualizar el CRM.\n3. Preparar la newsletter.\n4. Revisar automatizaciones.',
  440,
  'normal'
 );
 assert(!/\b[1-4][.)]/.test(out),'must not read numbered-list markers');
 assert(out.includes('Lo principal es:'),'bullet list must become conversational summary');
}

{
 const out=spokenResponseText(
  'He encontrado estos correos para «Belén»:\n1. Belén <belen@example.com>\n2. Belén oficina <oficina@example.com>\n\nElige el número.',
  440,
  'action',
  {
   status:'ACTION_PROPOSAL',
   intent:'email_contact_selection',
   action:{scope:{contact_query:'Belén',candidates_json:JSON.stringify([{name:'Belén'},{name:'Belén oficina'}])}}
  }
 );
 assert(out==='He encontrado 2 opciones para Belén. Te las dejo por escrito para que elijas.','contact choice summary regression');
 assert(!out.includes('@'),'contact emails must stay written');
}

{
 const out=spokenResponseText(
  'Propuesta exacta de envío:\nDestinatario: Belén <belen@example.com>\nAsunto: Informe semanal\nTexto: Este es un texto muy largo que no debe leerse entero.\n\nNo he enviado nada. ¿Confirmas este envío con «sí»?',
  560,
  'action',
  {
   status:'ACTION_PROPOSAL',
   intent:'email_send',
   action:{scope:{contact_name:'Belén',subject:'Informe semanal',recipient_email:'belen@example.com',body:'Este es un texto muy largo que no debe leerse entero.'}}
  }
 );
 assert(out.includes('He preparado el correo para Belén'),'must identify recipient naturally');
 assert(out.includes('Te dejo el texto completo por escrito para que lo revises.'),'must keep long body written');
 assert(out.endsWith('¿Confirmas el envío?'),'must preserve explicit confirmation');
 assert(!out.includes('belen@example.com'),'must not speak raw email');
}

{
 const out=spokenResponseText(
  'Próxima publicación de Facebook\nFecha y hora programadas: viernes\nTexto exacto: Texto largo\nImagen: https://example.com/image.jpg',
  440,
  'normal',
  {
   status:'OK',
   intent:'social_schedule_complete',
   read_context:{kind:'social_schedule',network:'Facebook',scheduled_at:'2026-10-02T09:30:00+02:00',content_key:'Córdoba vivienda'}
  }
 );
 assert(out.includes('La próxima publicación de Facebook está programada'),'social schedule must become natural spoken summary');
 assert(out.includes('Te dejo el texto, la imagen y el resto de detalles por escrito.'),'social detail must remain written');
 assert(!out.includes('http'),'social URL must never be spoken');
}

{
 const out=spokenResponseText(
  'CEREBRO Gateway está disponible. PR #463 GREEN. SHA b64050f0320f31e1685fa028744e73e5920c8655. Runtime Smoke #308 SUCCESS.',
  440,
  'normal',
  {status:'OK',intent:'health'}
 );
 assert(out==='CEREBRO está conectado y disponible. Te dejo el detalle técnico por escrito.','health must be conversational, not log-like');
}

{
 const out=spokenResponseText(
  'En tu memoria conversacional de CEREBRO consta esto:\n\n1. El proyecto Faro Azul se revisa los martes. · 1 oct 2026\n\n2. La reunión es por la tarde. · 1 oct 2026',
  440,
  'normal',
  {status:'OK',intent:'conversation_memory'}
 );
 assert(out.startsWith('Sí. Recuerdo'),'memory recall must sound conversational');
 assert(!/\b1[.)]|\b2[.)]/.test(out),'memory recall must not read numbering');
}

{
 const out=spokenResponseText(
  'Has confirmado el envío, pero el gateway de comunicaciones no lo ha aceptado. No voy a fingir que se ha enviado; mantengo la propuesta para poder reintentar.',
  560,
  'action',
  {status:'ACTION_CONFIRMED',intent:'email_send_confirmation',executed:false}
 );
 assert(/no lo ha aceptado|No voy a fingir/i.test(out),'critical failed action must remain audible');
}

console.log('GREEN cerebro spoken summary V2 behavioral corpus');
