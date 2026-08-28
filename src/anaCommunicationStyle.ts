export type AnaChannelDrafts={
 llamada?:{objetivo?:string;guion?:string;preguntas?:string[];resultado_esperado?:string}|null;
 whatsapp?:{texto?:string}|null;
 email?:{asunto?:string;cuerpo?:string}|null;
};

export type AnaStyleInput={
 name?:string|null;
 action?:string|null;
 why?:string|null;
 channels?:AnaChannelDrafts;
};

export const ANA_RELATIONAL_SOURCES=[
 'CEREBRO · Motor de Empatía y Persuasión Ética',
 'CEREBRO · Motor de venta consultiva y cierre',
 'CEREBRO · Router maestro de conocimiento comercial y relacional',
 'CEREBRO · Motor comercial integral · pipeline, prospección y venta consultiva',
 'CEREBRO · Motor de ventas digitales, journey y captación multicanal',
 'CEREBRO · Motor de captación, fidelización y experiencia de cliente',
 'Fuente web · Discovery comercial · 35 preguntas',
 'Modelo Belén · relación con cliente'
] as const;

export const ANA_RELATIONAL_PRINCIPLES=[
 'Empatizar y reconocer el contexto real sin frases vacías.',
 'Preguntar y escuchar antes de presionar o argumentar.',
 'Explicar el porqué de la petición o propuesta.',
 'Hablar en lenguaje claro y centrado en la necesidad del interlocutor.',
 'Evitar discusión, presión artificial, falsa urgencia o escasez inventada.',
 'Proponer un único siguiente paso concreto y fácil de responder.',
 'Respetar la autonomía: ofrecer ayuda y una salida si ese momento no encaja.',
 'No repetir información o documentación que Fénix ya tenga.'
] as const;

function clean(v:string|undefined|null){return String(v??'').trim().replace(/[.]+$/,'');}
function lowerFirst(v:string){return v?`${v.charAt(0).toLowerCase()}${v.slice(1)}`:'';}
function firstName(v:string){return clean(v).split(/\s+/)[0]||'Hola';}

export function applyAnaRelationalStyle(input:AnaStyleInput):AnaStyleInput{
 const action=clean(input.action);
 if(!action)return input;
 const who=firstName(input.name||'');
 const step=lowerFirst(action);
 const current=input.channels||{};
 const reason=clean(input.why);
 const whyLine=reason?` El motivo es sencillo: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.`:'';
 const whatsapp=current.whatsapp?{
  texto:`Hola, ${who}. Espero que estés bien. Para seguir avanzando con tu expediente, nos queda este paso: ${step}.${whyLine} Si ya lo tienes, envíanoslo cuando puedas. Si necesitas ayuda o ahora no te viene bien, dímelo y lo vemos contigo. Así evitamos hacerte repetir nada y dejamos claro el siguiente paso. Gracias.`
 }:current.whatsapp;
 const email=current.email?{
  asunto:current.email.asunto||'Fénix Capital · siguiente paso de tu expediente',
  cuerpo:`Hola, ${who}:\n\nEspero que estés bien. Queremos que el proceso te resulte lo más claro y sencillo posible. Para seguir avanzando con tu expediente, nos queda este paso: ${step}.\n\n${reason?`El motivo es: ${reason}\n\n`:''}Si ya lo tienes disponible, puedes enviárnoslo cuando te venga bien. Si tienes alguna duda, necesitas ayuda para conseguirlo o ahora mismo no te encaja, dínoslo y buscamos contigo la mejor forma de resolverlo.\n\nAsí evitamos pedirte dos veces lo mismo y, en cuanto quede confirmado, te indicaremos un único siguiente paso.\n\nGracias por tu ayuda.\nFénix Capital`
 }:current.email;
 const llamada=current.llamada?{
  ...current.llamada,
  guion:`Hola, ${who}. Soy de Fénix Capital. ¿Te viene bien que revisemos un momento el expediente? Quiero asegurarme de que no te hacemos repetir nada y de que el siguiente paso quede claro. Ahora mismo tenemos pendiente ${step}. Antes de darte nada por supuesto, cuéntame cómo lo tienes y vemos juntos la forma más sencilla de resolverlo.`,
  preguntas:[
   `¿Cómo tienes ahora mismo el tema de ${step}?`,
   '¿Hay algo que te esté dificultando este paso o alguna duda que no hayamos resuelto?',
   '¿Qué necesitarías de nosotros para poder dejarlo avanzado?',
   `¿Te parece bien que dejemos como siguiente paso ${step} y fijemos cuándo revisarlo?`
  ],
  resultado_esperado:`Entender la situación real, resolver fricción si existe y acordar un único siguiente paso sobre: ${action}.`
 }:current.llamada;
 return {...input,channels:{...current,llamada,whatsapp,email}};
}
