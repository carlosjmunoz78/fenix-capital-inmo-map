const EVENTS=new Set([
  'USEFUL_QUESTION','REPEATED_ANSWERED_QUESTION','ADMIT_REAL_ERROR','FALSE_CERTAINTY',
  'UNNECESSARY_PRESSURE','CLEAR_PROPORTIONATE_EXPLANATION','EXCESSIVE_DETAIL',
  'RESPECTFUL_BOUNDARY','GROUNDING_CONFIRMATION','IGNORED_CONCERN'
]);

function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function questionCount(value){return (String(value??'').match(/\?/g)??[]).length;}

export function observeActorSignals({actor_text,human_message,history=[]}={}) {
  const actor=String(actor_text??'').trim();
  const human=String(human_message??'').trim();
  const a=norm(actor);
  const h=norm(human);
  const prior=Array.isArray(history)?history:[];
  const lastActor=norm([...prior].reverse().find(x=>x?.actor)?.actor??'');
  const qCount=questionCount(actor);
  const repeatedExact=Boolean(actor&&lastActor&&a===lastActor);
  const admitsError=/\b(me equivoque|me he equivocado|tienes razon|corrijo|rectifico)\b/.test(a);
  const falseCertainty=/\b(seguro al 100%|garantizado|sin ninguna duda|te lo aseguro)\b/.test(a)&&!/(segun|fuente|verific|confirm)/.test(a);
  const pressure=/\b(tienes que hacerlo ya|hazlo ya|si no lo haces|no tienes otra opcion)\b/.test(a);
  const boundary=/\b(no puedo|no voy a|limite|requiere autorizacion|requiere confirmacion|no voy a ejecutar nada real|sin ejecutar nada)\b/.test(a)&&/(seguridad|autoriza|confirm|permiso|datos|privacidad|accion|ejecut)/.test(a);
  const grounding=/\b(entiendo|he entendido|veo que|tienes razon|por lo que dices|en tu caso|entonces|vamos a concretar|concretarlo|prefiero incorporarlo|no voy a repetirte|te escucho)\b/.test(a);
  const explanation=/\b(porque|por eso|puede afectar|conviene|depende|significa|no significa|primero|despues|debe|hay que|separa|verificar|no invent|prioriz|cambia|afecta|incorporar|proteger)\b/.test(a) || (actor.length>=90&&qCount<=1&&/[.!]/.test(actor));
  const concern=/\b(no me cuadra|no me convence|no entiendo|perdido|perdida|mala experiencia|desconf|me preocupa|me limita|no responde|dando vueltas|voy con prisa|me falta|otra persona|otra version|otra versión|deuda|cuota|no se por donde|no sé por dónde)\b/.test(h);
  const acknowledgesConcern=concern&&(/\b(entiendo|veo que|tienes razon|ese limite|esa deuda|una obligacion|que falte|si has recibido|entonces|voy al punto|prefiero incorporarlo)\b/.test(a));
  const repair=/\b(no voy a repetirte|cambiar de estrategia|mas concreto|más concreto|reducirlo a una sola cosa)\b/.test(a);
  const priorHuman=prior.map(x=>norm(x?.human)).filter(Boolean);
  const repeatedAnsweredQuestion=qCount>0&&priorHuman.slice(0,-1).some(prev=>prev&&prev===h);
  const ignoresConcern=!actor||repeatedExact||(concern&&!acknowledgesConcern&&qCount===0&&!explanation);
  return {
    has_actor:Boolean(actor),
    question_count:qCount,
    asks_question:qCount>0,
    question_budget_ok:qCount<=1,
    repeated_exact:repeatedExact,
    repeated_answered_question:repeatedAnsweredQuestion,
    admits_error:admitsError,
    false_certainty:falseCertainty,
    unnecessary_pressure:pressure,
    respectful_boundary:boundary,
    grounding,
    clear_explanation:explanation,
    human_concern:concern,
    acknowledges_concern:acknowledgesConcern,
    repair_repetition:repair,
    excessive_detail:actor.length>1100,
    ignores_concern:ignoresConcern
  };
}

export function observeActorBehavior(input={}) {
  const s=observeActorSignals(input);
  if(!s.has_actor||s.repeated_exact||s.ignores_concern) return 'IGNORED_CONCERN';
  if(s.excessive_detail) return 'EXCESSIVE_DETAIL';
  if(s.admits_error) return 'ADMIT_REAL_ERROR';
  if(s.false_certainty) return 'FALSE_CERTAINTY';
  if(s.unnecessary_pressure) return 'UNNECESSARY_PRESSURE';
  if(s.respectful_boundary) return 'RESPECTFUL_BOUNDARY';
  if(s.repeated_answered_question) return 'REPEATED_ANSWERED_QUESTION';
  if(s.asks_question) return 'USEFUL_QUESTION';
  if(s.grounding) return 'GROUNDING_CONFIRMATION';
  if(s.clear_explanation) return 'CLEAR_PROPORTIONATE_EXPLANATION';
  return 'GROUNDING_CONFIRMATION';
}

export function assertObserverEvent(event){
  if(!EVENTS.has(event)) throw new Error(`unsupported_observer_event:${event}`);
  return event;
}
