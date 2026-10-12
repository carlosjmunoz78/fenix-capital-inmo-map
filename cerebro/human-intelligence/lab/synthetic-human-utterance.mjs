function pickBySeed(values,seed,turn,salt=''){let h=2166136261;const input=`${seed}|${turn}|${salt}`;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return values[(h>>>0)%values.length];}

const FACT_UTTERANCES={
  UNSTATED_CONSTRAINT:[
    'Hay una condición importante que no te había contado y que me limita bastante.',
    'Hay un límite que no había mencionado y puede cambiar lo que estamos viendo.'
  ],
  PRIOR_BAD_EXPERIENCE:[
    'Te digo una cosa: ya tuve una mala experiencia con algo parecido y por eso voy con bastante cuidado.',
    'La última vez que hice algo parecido salió mal y eso hace que ahora desconfíe un poco.'
  ],
  MISSING_DOCUMENT:[
    'Hay un documento que todavía no tengo y no sé si va a ser un problema.',
    'Me falta uno de los papeles que seguramente vais a necesitar.'
  ],
  CONFLICTING_COMMITMENT:[
    'Además tengo otro compromiso que me condiciona y no te lo había comentado.',
    'Hay otra obligación por medio que me limita más de lo que parecía al principio.'
  ],
  UNDECLARED_FINANCIAL_OBLIGATION:[
    'Hay una cosa que no te había dicho: tengo una cuota mensual de otro préstamo.',
    'También estoy pagando otra financiación todos los meses y no sabía si eso había que contarlo.'
  ],
  PRIVATE_DECISION_CRITERION:[
    'Para mí hay una condición personal que es bastante importante para decidir si sigo o no.',
    'Hay algo que para mí pesa mucho en la decisión y no lo había explicado todavía.'
  ],
  THIRD_PARTY_DEPENDENCY:[
    'Esto no depende solo de mí; hay otra persona que también tiene que estar de acuerdo.',
    'Hay una tercera persona de la que depende una parte importante de esto.'
  ],
  PREVIOUS_CONTRADICTORY_ADVICE:[
    'Antes me dijeron justamente otra cosa y ahora no sé cuál de las dos versiones es la correcta.',
    'Vengo con una duda porque otra persona me explicó esto de una manera diferente.'
  ]
};

const FOLLOWUPS={
  DIRECT_SHORT:['Vale, pero ¿qué necesitas saber de mí ahora?','Concrétamelo: ¿cuál es el siguiente paso?'],
  VERBOSE_DISORGANIZED:['Sí, pero es que hay varias cosas y no sé cuál es la importante. ¿Qué dato necesitas primero para aclararlo?','Entiendo, aunque sigo un poco perdido porque son varias cosas a la vez. ¿Por dónde empezamos de verdad?'],
  TECHNICAL_PRECISE:['Necesito el criterio concreto que estás aplicando y qué dato falta para llegar a una conclusión.','¿Qué variable necesitas comprobar ahora y por qué cambia la decisión?'],
  DISTRUSTFUL:['Eso suena bastante general. ¿Cómo sé que se aplica a mi caso?','Necesito algo más concreto antes de fiarme de esa respuesta.'],
  IMPATIENT:['Vale, pero vamos al grano. ¿Qué hago ahora?','Necesito una respuesta más concreta, por favor.'],
  INDECISIVE:['No tengo claro qué opción me conviene. ¿Qué mirarías tú primero?','Sigo dudando. ¿Qué dato ayudaría más a decidir?'],
  EVASIVE:['¿Es imprescindible entrar en ese detalle ahora?','¿Qué necesitas exactamente y para qué?'],
  CONTRADICTORY:['Puede ser, aunque antes lo entendí de otra manera. ¿Me lo aclaras?','No me termina de cuadrar con lo que pensaba. ¿Qué estoy entendiendo mal?'],
  REPETITIVE:['Entonces, para asegurarme: ¿qué es exactamente lo que tengo que hacer ahora?','Te lo vuelvo a preguntar porque no quiero equivocarme: ¿cuál es el siguiente paso?'],
  CONFRONTATIONAL:['Eso no responde a lo que te estoy preguntando. Dame una respuesta concreta.','No me convence. Explícame por qué esa respuesta sirve para mi caso.']
};

function styleBucket(profile){
  const raw=String(profile?.dimensions?.conversation_style??'').toUpperCase();
  if(FOLLOWUPS[raw])return raw;
  const map=[['DIRECT','DIRECT_SHORT'],['SHORT','DIRECT_SHORT'],['VERBOSE','VERBOSE_DISORGANIZED'],['CHAOTIC','VERBOSE_DISORGANIZED'],['TECH','TECHNICAL_PRECISE'],['PRECISE','TECHNICAL_PRECISE'],['DISTRUST','DISTRUSTFUL'],['IMPATIENT','IMPATIENT'],['INDECIS','INDECISIVE'],['EVAS','EVASIVE'],['CONTRAD','CONTRADICTORY'],['REPET','REPETITIVE'],['CONFRONT','CONFRONTATIONAL']];
  for(const [needle,bucket] of map)if(raw.includes(needle))return bucket;
  return 'DIRECT_SHORT';
}

export function revealedFactUtterance(fact,profile,turn){
  const type=String(fact?.type??'');
  const variants=FACT_UTTERANCES[type]??['Hay un dato importante que no había explicado antes y puede cambiar la situación.'];
  return pickBySeed(variants,profile?.seed??'synthetic',turn,`fact:${type}`);
}

export function nextSyntheticHumanUtterance({profile,turn,newlyRevealedFact=null,lastActorText=''}){
  if(newlyRevealedFact)return revealedFactUtterance(newlyRevealedFact,profile,turn);
  const state=profile?.private_state?.internal_state??{};
  if(Number(state.friction??0)>=0.72)return pickBySeed(['No me estás resolviendo lo que te estoy preguntando. ¿Puedes centrarte en eso?','Estamos dando vueltas. Necesito que respondas al punto concreto.'],profile?.seed??'synthetic',turn,'high-friction');
  if(Number(state.patience??1)<=0.25)return pickBySeed(['Voy con prisa. Dime solo qué necesitas o qué hago ahora.','Necesito que vayamos al punto, por favor.'],profile?.seed??'synthetic',turn,'low-patience');
  const bucket=styleBucket(profile);
  const variants=FOLLOWUPS[bucket]??FOLLOWUPS.DIRECT_SHORT;
  const base=pickBySeed(variants,profile?.seed??'synthetic',turn,`style:${bucket}`);
  if(lastActorText&&String(lastActorText).length>900)return `Hay demasiada información de golpe. ${base}`;
  return base;
}

export function assertNoOntologyLeak(text){
  const raw=String(text??'');
  for(const forbidden of Object.keys(FACT_UTTERANCES))if(raw.includes(forbidden))throw new Error(`synthetic_ontology_leak:${forbidden}`);
  return raw;
}
