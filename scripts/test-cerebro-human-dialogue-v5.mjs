import fs from 'node:fs';
import {spokenResponseText} from '../src/cerebroVoice.ts';

function assert(condition,message){
 if(!condition)throw new Error(message);
}

const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
const knowledge=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/knowledge.ts','utf8');

assert(gateway.includes('function closeOwnerGreeting()'),'owner greeting function missing');
for(const phrase of ['Hola, Carlos','guapo','buenos dias','buenas tardes','buenas noches']){
 assert(gateway.toLocaleLowerCase('es-ES').includes(phrase.toLocaleLowerCase('es-ES')),'greeting contract missing: '+phrase);
}
assert(gateway.includes('intent:"greeting"'),'greeting intent missing');
assert(gateway.includes('0.9.0-conversational-intelligence-v2'),'gateway version not advanced');

for(const phrase of [
 'legal_knowledge_map',
 'Arras y compraventa',
 'Titularidad, cargas y Registro de la Propiedad',
 'Registro frente a Catastro',
 'Notaría y firma',
 'Herencias',
 'Donaciones y aportaciones familiares',
 'Fiscalidad de operaciones inmobiliarias',
 'Prevención de blanqueo y compliance'
]){
 assert(knowledge.includes(phrase),'legal knowledge map missing: '+phrase);
}
assert(knowledge.includes('function broadKnowledgeQuestion'),'broad knowledge map classifier missing');
assert(knowledge.includes('function clarificationMessage'),'clarification helper missing');
assert(knowledge.includes('No te he entendido del todo.'),'generic clarification wording missing');
assert(knowledge.includes('status:"LOW_CONFIDENCE",intent:"clarification"'),'low-confidence clarification contract missing');

{
 const out=spokenResponseText(
  'Pues bastante, pero lo separo por nivel de validación. 1. Arras y compraventa. 2. Registro. 3. Notaría.',
  420,
  'normal',
  {status:'OK',intent:'legal_knowledge_map',source_question:'¿Qué sabes de temas legales inmobiliarios?'}
 );
 assert(out.startsWith('Pues bastante.'),'legal map should answer naturally');
 assert(out.includes('arras y compraventa'),'legal map should expose useful areas');
 assert(out.includes('Dime por dónde quieres entrar.'),'legal map should invite a precise follow-up');
}

{
 const raw='No te he entendido del todo. ¿Quieres que te explique un tema, que consulte el conocimiento de Fénix o que prepare una acción concreta?';
 const out=spokenResponseText(raw,420,'normal',{status:'LOW_CONFIDENCE',intent:'clarification',source_question:'¿Y aquello de lo otro?'});
 assert(out===raw,'clarification must be spoken intact');
}

{
 const out=spokenResponseText(
  'La prioridad principal es validar el expediente antes de avanzar.',
  420,
  'normal',
  {status:'OK',intent:'knowledge',source_question:'¿Qué harías aquí?'}
 );
 assert(/^(Claro\.|Mira,|Vale\.|Te cuento\.|Ahora mismo|La prioridad)/.test(out),'generic speech should allow a human lead-in');
}

console.log('GREEN CEREBRO Human Dialogue + Knowledge Map + Clarification V1');
