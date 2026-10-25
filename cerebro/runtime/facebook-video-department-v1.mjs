import fs from 'node:fs/promises';

export const FACEBOOK_VIDEO_DEPARTMENT_VERSION='1.0.0';

const CATALOG=Object.freeze([
  Object.freeze({
    id:'FB-FIN-25-30-FIRST-HOME',
    target:{age_band:'25-30',life_stage:'FIRST_HOME',financial_intent:'HIGH_FINANCING_ORIENTATION'},
    concept:'PRISA_VS_PRIMERA_VIVIENDA',
    hook:'Te gusta el piso. Mucho. Y justo aparece: “hay que reservar hoy”.',
    cta:'Cuéntanos tu caso antes de reservar.',
    voice:{id:'ES_ES_CHATTERBOX_YOUNG',engine:'CHATTERBOX_MTL_V3_ES_ES',locale:'es-ES',delivery:'ENERGETIC_CONVERSATIONAL'},
    visual_profile:{id:'FAST_YOUNG_VERTICAL',cut_sec:2.35,lighting:'BRIGHT_WARM_DAYLIGHT',camera:'HANDHELD_PUNCHIN_SOCIAL',transition:'HARD_CUT_WHIP',graphics:'KINETIC_ORANGE_BLACK',caption_style:'CENTER_KINETIC',music:'BLIPPY_TRANCE'},
    story:`¿Primera vivienda y te están metiendo prisa para reservar? Para un segundo. Antes de soltar dinero, comprueba si la financiación encaja contigo y con esa casa. Ilusión, sí. Ir a ciegas, no. Cuéntanos tu caso y hacemos primero los números.`,
    reel:`Te gusta el piso. Mucho. Y justo aparece la frase que mete presión: “hay que reservar hoy”. Si tienes veinticinco o treinta años y estás buscando tu primera vivienda, no conviertas la prisa en una decisión financiera a ciegas. Antes de reservar conviene saber si tus ingresos, tus deudas, el ahorro disponible y la vivienda permiten plantear la financiación que necesitas. Y no, no siempre necesitas tener ahorrado el veinte por ciento, pero tampoco existe un cien por cien automático para todo el mundo. Cada operación depende del perfil y de la vivienda. En Fénix Capital hacemos primero los números. Si encaja, aceleramos contigo. Si estás mirando tu primera casa, cuéntanos tu caso antes de reservar.`,
    long:`Hay una escena que se repite mucho: encuentras un piso que te encanta, haces cuentas por encima y empiezas a pensar que, si no reservas ya, se te escapa. A los veinticinco o treinta años esa mezcla de ilusión y prisa pesa mucho porque casi todo es nuevo: la primera hipoteca, la primera tasación, los gastos de compra y la sensación de que el banco habla otro idioma.\n\nLo primero que conviene separar es el precio de la vivienda de lo que realmente puedes financiar. No basta con mirar una cuota rápida en una calculadora. Hay que ver tus ingresos, la estabilidad laboral, las deudas que ya tienes y el dinero disponible para los gastos. A veces la operación encaja mejor de lo que creías. Otras veces hay que ajustar precio, plazo o buscar una estructura distinta. Saberlo antes te da poder para decidir.\n\nTambién está la entrada. Mucha gente joven piensa que, si no tiene ahorrado el veinte por ciento más los gastos, no tiene ninguna opción. No siempre es así. Existen operaciones con porcentajes de financiación superiores, pero no son automáticas ni sirven para todo el mundo. Dependen del perfil, de la vivienda, de la tasación y de las condiciones que acepte cada entidad. Por eso una promesa genérica vale poco; lo útil es estudiar tu caso de verdad.\n\nOtro error típico es reservar primero y preguntar después. La reserva puede parecer el paso que asegura la vivienda, pero si aún no sabes si la financiación es razonable, puedes convertir la ilusión en presión. Lo inteligente no es ir lento: es comprobar rápido. Si la operación sale, entonces sí tiene sentido moverse con velocidad y negociar con más seguridad.\n\nEn Fénix Capital hacemos ese trabajo previo para que entiendas qué escenario tienes delante. Revisamos la información necesaria, estimamos la viabilidad y, cuando procede, buscamos la forma de plantear la operación a las entidades. No se trata de venderte una cifra bonita; se trata de saber qué puede sostenerse y qué no antes de que tomes una decisión importante.\n\nY hay una parte que casi nadie te cuenta: no todas las hipotecas se comparan solo por el tipo de interés. Hay bonificaciones, seguros, vinculaciones, plazos, comisiones y condiciones que pueden cambiar bastante el coste real. Una oferta que parece mejor en un titular puede no serlo cuando miras el conjunto. Por eso hay que comparar la operación completa.\n\nSi estás empezando a mirar vivienda, no hace falta que tengas todo cerrado para pedir una primera orientación. Puedes venir con tus números reales, aunque todavía no hayas encontrado el piso definitivo. Saber aproximadamente qué rango de compra es sensato te permite buscar mejor, filtrar anuncios y evitar enamorarte de una vivienda que te obligue a forzar demasiado.\n\nLa idea es sencilla: ilusión sí, pero con información. Si tienes entre veinticinco y treinta años, estás pensando en tu primera vivienda y quieres saber hasta dónde puedes llegar sin ir a ciegas, cuéntanos tu caso. Primero comprobamos. Si encaja, entonces aceleramos contigo.`
  }),
  Object.freeze({
    id:'FB-FIN-35-45-FAMILY-MOVE',
    target:{age_band:'35-45',life_stage:'FAMILY_MOVE_UP',financial_intent:'BUY_AND_SELL_COORDINATION'},
    concept:'LA_CUOTA_QUE_DEJA_RESPIRAR',
    hook:'La casa que necesita tu familia no empieza por el máximo que te presta el banco.',
    cta:'Contadnos vuestro escenario y ordenamos la operación.',
    voice:{id:'ES_ES_SHARVARD_F',engine:'PIPER_ES_ES_SHARVARD',speaker:'F',speaker_id:1,locale:'es-ES',delivery:'WARM_REASSURING'},
    visual_profile:{id:'WARM_FAMILY_DOCUMENTARY',cut_sec:4.8,lighting:'SOFT_WARM_HOME',camera:'STABLE_OBSERVATIONAL',transition:'SOFT_DISSOLVE',graphics:'MINIMAL_ORANGE_UNDERLINE',caption_style:'LOWER_THIRD_CLEAN',music:'STARCourt_MALL'},
    story:`¿La familia crece y la casa se queda pequeña? Antes de buscar el máximo que te presta el banco, calcula qué cuota deja respirar vuestra economía. Comprar mejor no es apurar más: es ordenar vivienda, ahorro, tiempos y financiación. Lo vemos contigo.`,
    reel:`Cambiar de casa con treinta y cinco o cuarenta y cinco años no es solo conseguir otra hipoteca. Es hacer que la nueva vivienda encaje con colegio, coche, ahorro, gastos y tranquilidad. El error es preguntar cuánto te presta el banco antes de decidir cuánto quieres comprometer de verdad cada mes. Y si además tienes que vender tu vivienda actual, el calendario importa casi tanto como la financiación. En Fénix Capital ordenamos ingresos, deudas, ahorro, vivienda y tiempos para ver qué operación tiene sentido. No buscamos una aprobación a cualquier precio. Buscamos que la operación encaje y que la familia siga respirando después de firmar. Si estáis pensando en cambiar de casa, contadnos vuestro escenario.`,
    long:`A partir de cierta edad, comprar vivienda rara vez significa empezar de cero. Muchas veces significa cambiar de casa porque la familia ha crecido, porque necesitas una habitación más, porque trabajas desde casa o porque la vivienda actual ya no encaja con vuestra vida. Y ahí la hipoteca deja de ser solo una cuota: se convierte en una decisión que tiene que convivir con colegio, coche, ahorro, estabilidad y tranquilidad.\n\nEl primer paso no debería ser mirar cuánto te presta un banco en teoría. Debería ser entender cuánto quieres comprometer de verdad cada mes. Dos familias con los mismos ingresos pueden tener márgenes completamente distintos. Una puede tener préstamos, gastos fijos altos o poca capacidad de ahorro; otra puede tener una estructura mucho más cómoda. La cifra importante no es la máxima que te ofrecen, sino la que mantiene vuestra economía respirando.\n\nDespués viene la vivienda actual. Si vas a vender para comprar, los tiempos importan muchísimo. No es lo mismo comprar cuando ya has vendido, coordinar ambas operaciones, necesitar un margen entre firmas o depender de que una tasación llegue a tiempo. La financiación tiene que diseñarse junto al calendario real de la familia, no en una hoja aislada.\n\nTambién conviene mirar qué ocurre si una de las dos nóminas cambia, si aparece un gasto imprevisto o si durante unos meses necesitáis más liquidez. Una buena operación no se mide solo por que el banco diga sí. Se mide por cómo encaja en vuestra vida cuando el mes no sale perfecto. Ahí es donde tiene sentido revisar plazo, tipo, bonificaciones y nivel de endeudamiento con calma.\n\nOtro punto importante es la entrada. A veces hay ahorro, pero usarlo todo para comprar puede dejar a la familia sin colchón. En otros casos, se necesita una financiación alta y hay que estudiar si el perfil y la vivienda permiten plantearla. No hay una respuesta universal. La estructura correcta depende de los números, de la tasación y de cómo quede el conjunto después de firmar.\n\nEn Fénix Capital analizamos la operación desde ese punto de vista: no como una carrera por conseguir cualquier aprobación, sino como una forma de ordenar las piezas. Revisamos ingresos, deudas, ahorro, vivienda, calendario y documentación para saber qué escenarios son razonables. Si algo no encaja, es mejor detectarlo antes de reservar o de comprometer una venta.\n\nCuando aparecen varias ofertas, tampoco nos quedamos solo con el interés. Una hipoteca puede esconder diferencias relevantes en seguros, vinculaciones, comisiones o condiciones de mantenimiento. Comparar bien significa poner todas esas piezas encima de la mesa y ver cuál tiene sentido para la familia, no solo cuál luce mejor en un anuncio.\n\nY si la operación está clara, entonces sí: velocidad. Tener la documentación preparada y saber qué banco puede encajar con vuestro perfil reduce vueltas innecesarias. La rapidez útil llega después de ordenar la operación, no antes.\n\nSi estáis pensando en cambiar de casa y tenéis entre treinta y cinco y cuarenta y cinco años, contadnos qué queréis hacer y qué situación tenéis ahora. No hace falta llegar con todo resuelto. Nuestro trabajo es ayudaros a ver el mapa completo, comprobar si la operación encaja y, si encaja, moverla con criterio y con ritmo.`
  }),
  Object.freeze({
    id:'FB-FIN-45-55-REFINANCE',
    target:{age_band:'45-55',life_stage:'ESTABLISHED_HOMEOWNER',financial_intent:'REFINANCE_OR_REORDER_DEBT'},
    concept:'CUOTA_BAJA_NO_ES_IGUAL_A_MEJOR',
    hook:'Una cuota más baja no siempre significa una financiación mejor.',
    cta:'Cuéntanos cómo tienes montada tu financiación y comparamos escenarios.',
    voice:{id:'ES_ES_SHARVARD_M',engine:'PIPER_ES_ES_SHARVARD',speaker:'M',speaker_id:0,locale:'es-ES',delivery:'CALM_AUTHORITATIVE'},
    visual_profile:{id:'EDITORIAL_DATA_DARK',cut_sec:6.2,lighting:'CONTROLLED_DARK_CONTRAST',camera:'LOCKED_OFF_DETAIL_MACRO',transition:'DIP_TO_CHARCOAL',graphics:'EDITORIAL_DATA_ORANGE',caption_style:'LEFT_EDITORIAL',music:'BASS_MEANT_JAZZ'},
    story:`¿Pagas hipoteca y varios préstamos? Antes de buscar una cuota más baja, mira el coste total y el plazo. Refinanciar solo merece la pena si mejora realmente tu estructura. Primero hacemos números. Después decidimos si tocar algo o dejarlo como está.`,
    reel:`Una cuota más baja no siempre significa una financiación mejor. Si tienes entre cuarenta y cinco y cincuenta y cinco años, hipoteca, quizá algún préstamo y una economía estable, merece la pena revisar el conjunto. Refinanciar puede tener sentido, pero solo si mejora de verdad la estructura: coste total, plazo, vinculaciones y margen mensual. A veces conviene novar, otras subrogar, otras reorganizar y, muchas veces, no tocar una buena hipoteca. En Fénix Capital no empezamos prometiendo ahorro. Empezamos haciendo números y comparando escenarios. La pregunta no es solo cuánto pagas este mes. Es si tu financiación sigue siendo la adecuada para los próximos años. Si quieres revisarla, cuéntanos cómo la tienes montada.`,
    long:`Hay una conversación financiera que muchas familias posponen durante años: revisar si la estructura de sus deudas sigue teniendo sentido. No hablamos solo de buscar una cuota más baja. Hablamos de entender qué estás pagando, durante cuánto tiempo, con qué tipos, qué préstamos conviven entre sí y cuánto margen te queda cada mes.\n\nEntre los cuarenta y cinco y los cincuenta y cinco años es habitual tener una vivienda, una hipoteca ya avanzada, quizá algún préstamo personal, gastos familiares importantes y una renta más estable que hace unos años. Precisamente por eso merece la pena mirar el conjunto. Lo que era una estructura razonable hace cinco o diez años puede haberse quedado desordenado.\n\nRefinanciar no significa automáticamente que haya que cambiarlo todo. A veces la mejor decisión es no tocar una hipoteca buena. Otras veces tiene sentido estudiar una novación, una subrogación o una operación distinta que agrupe o reorganice cargas. La clave está en comparar el coste total, los plazos y el efecto real sobre tu economía, no solo la cuota del próximo mes.\n\nUna cuota más baja puede parecer una mejora, pero si se consigue alargando demasiado el plazo, el coste total puede aumentar mucho. También puede ocurrir lo contrario: una operación con una cuota algo más alta puede reducir años y coste financiero. Por eso hay que decidir qué objetivo tienes: ganar liquidez, reducir intereses, ordenar deudas, liberar capacidad mensual o preparar una compra futura.\n\nTambién influye el valor de la vivienda y la deuda pendiente. La tasación, la estabilidad de ingresos y el resto de obligaciones determinan qué alternativas pueden plantearse. No existe una refinanciación universal que sirva para todos. Hay casos que se pueden mejorar y otros en los que lo sensato es conservar lo que ya tienes.\n\nEn Fénix Capital empezamos por ordenar la fotografía completa. Revisamos préstamos, recibos, ingresos, plazos y documentación para entender qué está pasando de verdad. Después comparamos escenarios. El objetivo no es prometer ahorro antes de hacer números, sino identificar si existe una mejora defendible y cuánto cuesta conseguirla.\n\nHay otro detalle importante: las vinculaciones. Seguros, productos asociados y bonificaciones pueden alterar la comparación. Un tipo nominal más bajo no siempre significa un coste menor si exige productos caros o condiciones que no necesitas. La comparación buena incluye el conjunto y también el esfuerzo de mantener esas condiciones durante años.\n\nY luego está la tranquilidad. Tener varias cuotas con fechas y condiciones distintas genera fricción. Si una reorganización tiene sentido económico, simplificar puede ser valioso. Pero simplificar por simplificar no basta: la nueva estructura debe justificar sus costes y no convertir un problema corto en una deuda demasiado larga.\n\nPor eso conviene revisar antes de que exista una urgencia. Cuando todavía tienes margen, puedes comparar mejor y decidir sin presión. Si esperas a que la situación esté al límite, normalmente hay menos opciones y menos capacidad de negociar.\n\nSi tienes entre cuarenta y cinco y cincuenta y cinco años, tienes vivienda y quieres saber si tu financiación actual sigue teniendo sentido, cuéntanos cómo está montada. La pregunta no es “¿puedo pagar menos este mes?”. La pregunta correcta es “¿puedo tener una estructura mejor para los próximos años?”. Primero hacemos números. Si hay una mejora real, entonces vemos cómo llevarla a cabo.`
  })
]);

function wordCount(text){return String(text||'').trim().split(/\s+/).filter(Boolean).length}
function unique(rows,key){return new Set(rows.map(key)).size}

export function buildFacebookVideoBrief(){
  const campaigns=CATALOG.map((c,index)=>({
    ...c,
    priority:index+1,
    channel:'FACEBOOK',
    business_family:'FINANCIAL_REAL_ESTATE',
    formats:{
      story:{target_duration_sec:[15,28],text:c.story},
      reel:{target_duration_sec:[48,59.5],text:c.reel},
      long:{target_duration_sec:[180,null],text:c.long},
    },
    script_metrics:{story_words:wordCount(c.story),reel_words:wordCount(c.reel),long_words:wordCount(c.long)},
    publish_authorized:false,
    environment:'PREPROD',
    additional_cost_eur:0,
  }));
  const diversity={
    targets:unique(campaigns,c=>c.target.age_band),
    concepts:unique(campaigns,c=>c.concept),
    hooks:unique(campaigns,c=>c.hook),
    ctas:unique(campaigns,c=>c.cta),
    voices:unique(campaigns,c=>c.voice.id),
    visual_profiles:unique(campaigns,c=>c.visual_profile.id),
    lighting_profiles:unique(campaigns,c=>c.visual_profile.lighting),
    camera_profiles:unique(campaigns,c=>c.visual_profile.camera),
    transitions:unique(campaigns,c=>c.visual_profile.transition),
    music_profiles:unique(campaigns,c=>c.visual_profile.music),
  };
  const gates={
    three_targets:Object.values(diversity).every(v=>v===3),
    reel_word_floor:campaigns.every(c=>c.script_metrics.reel_words>=105),
    long_word_floor:campaigns.every(c=>c.script_metrics.long_words>=480),
    spanish_spain:campaigns.every(c=>c.voice.locale==='es-ES'),
    story_short:campaigns.every(c=>c.script_metrics.story_words<=55),
  };
  if(!Object.values(gates).every(Boolean))throw new Error(`FACEBOOK_VIDEO_DIRECTION_GATE_RED:${JSON.stringify({diversity,gates})}`);
  return {schema_version:'1.0.0',engine_id:'SOCIAL-FACEBOOK-VIDEO-DIRECTOR-001',environment:'PREPROD',company_id:'fenix',channel:'FACEBOOK',business_family:'FINANCIAL_REAL_ESTATE',handoff_to_engine:'CREATIVE-STUDIO-001',decision_authority:'FACEBOOK_DEPARTMENT_DECIDES_WHAT_PRODUCTORA_DECIDES_HOW',campaigns,diversity,gates,publish_authorized:false,promotion_eligible:false,additional_cost_eur:0};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const out=process.argv[2]||'/tmp/cerebro-facebook-video-brief.json';
  const brief=buildFacebookVideoBrief();
  await fs.writeFile(out,JSON.stringify(brief,null,2)+'\n','utf8');
  console.log(JSON.stringify({ok:true,out,campaigns:brief.campaigns.map(c=>({id:c.id,target:c.target.age_band,voice:c.voice.id,visual:c.visual_profile.id,words:c.script_metrics})),diversity:brief.diversity}));
}
