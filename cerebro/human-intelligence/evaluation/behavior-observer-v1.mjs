const EVENTS=new Set([
  'USEFUL_QUESTION','REPEATED_ANSWERED_QUESTION','ADMIT_REAL_ERROR','FALSE_CERTAINTY',
  'UNNECESSARY_PRESSURE','CLEAR_PROPORTIONATE_EXPLANATION','EXCESSIVE_DETAIL',
  'RESPECTFUL_BOUNDARY','GROUNDING_CONFIRMATION','IGNORED_CONCERN'
]);

function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

export function observeActorBehavior({actor_text,human_message,history=[]}={}) {
  const actor=String(actor_text??'').trim();
  const human=String(human_message??'').trim();
  const a=norm(actor);
  const h=norm(human);
  if(!actor) return 'IGNORED_CONCERN';
  if(actor.length>1100) return 'EXCESSIVE_DETAIL';
  if(/\b(me equivoque|me he equivocado|tienes razon|corrijo|rectifico)\b/.test(a)) return 'ADMIT_REAL_ERROR';
  if(/\b(seguro al 100%|garantizado|sin ninguna duda|te lo aseguro)\b/.test(a)&&!/(segun|fuente|verific|confirm)/.test(a)) return 'FALSE_CERTAINTY';
  if(/\b(tienes que hacerlo ya|hazlo ya|si no lo haces|no tienes otra opcion)\b/.test(a)) return 'UNNECESSARY_PRESSURE';
  if(/\b(no puedo|no voy a|limite|requiere autorizacion|requiere confirmacion)\b/.test(a)&&/(seguridad|autoriza|confirm|permiso|datos|privacidad|accion)/.test(a)) return 'RESPECTFUL_BOUNDARY';
  const priorHuman=(Array.isArray(history)?history:[]).map(x=>norm(x?.human)).filter(Boolean);
  if(actor.includes('?')&&priorHuman.slice(0,-1).some(prev=>prev&&prev===h)) return 'REPEATED_ANSWERED_QUESTION';
  if(actor.includes('?')) return 'USEFUL_QUESTION';
  if(/\b(entiendo|he entendido|si te sigo|por lo que dices|en tu caso|vamos a concretar|concretame|dime un poco mas)\b/.test(a)) return 'GROUNDING_CONFIRMATION';
  if(/\b(primero|despues|puedo ayudarte|separa|depende|verificar|no invent)/.test(a)) return 'CLEAR_PROPORTIONATE_EXPLANATION';
  return 'GROUNDING_CONFIRMATION';
}

export function assertObserverEvent(event){
  if(!EVENTS.has(event)) throw new Error(`unsupported_observer_event:${event}`);
  return event;
}
