function pickBySeed(values,seed,turn,salt=''){let h=2166136261;const input=`${seed}|${turn}|${salt}`;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return values[(h>>>0)%values.length];}

const FACT_UTTERANCES={
  UNSTATED_CONSTRAINT:['Hay una condición importante que no te había contado y que me limita bastante.','Hay un límite que no había mencionado y puede cambiar lo que estamos viendo.'],
  PRIOR_BAD_EXPERIENCE:['Te digo una cosa: ya tuve una mala experiencia con algo parecido y por eso voy con bastante cuidado.','La última vez que hice algo parecido salió mal y eso hace que ahora desconfíe un poco.'],
  MISSING_DOCUMENT:['Hay un documento que todavía no tengo y no sé si va a ser un problema.','Me falta uno de los papeles que seguramente vais a necesitar.'],
  CONFLICTING_COMMITMENT:['Además tengo otro compromiso que me condiciona y no te lo había comentado.','Hay otra obligación por medio que me limita más de lo que parecía al principio.'],
  UNDECLARED_FINANCIAL_OBLIGATION:['Hay una cosa que no te había dicho: tengo una cuota mensual de otro préstamo.','También estoy pagando otra financiación todos los meses y no sabía si eso había que contarlo.'],
  PRIVATE_DECISION_CRITERION:['Para mí hay una condición personal que es bastante importante para decidir si sigo o no.','Hay algo que para mí pesa mucho en la decisión y no lo había explicado todavía.'],
  THIRD_PARTY_DEPENDENCY:['Esto no depende solo de mí; hay otra persona que también tiene que estar de acuerdo.','Hay una tercera persona de la que depende una parte importante de esto.'],
  PREVIOUS_CONTRADICTORY_ADVICE:['Antes me dijeron justamente otra cosa y ahora no sé cuál de las dos versiones es la correcta.','Vengo con una duda porque otra persona me explicó esto de una manera diferente.']
};

const SEMANTIC_UTTERANCES={
  FIN_MONTHLY_DEBT:['Hay algo que no había comentado: pago todos los meses otra financiación.','Tengo una cuota mensual de otro préstamo y no sé cuánto cambia el estudio.'],
  FIN_SAVINGS_BUFFER:['Aunque pueda encajar, no quiero quedarme sin colchón después de comprar.','Para mí es importante conservar algo de ahorro para imprevistos.'],
  FIN_VARIABLE_INCOME:['Una parte de mis ingresos cambia bastante de un mes a otro.','No todo lo que cobro es fijo y me preocupa cómo lo va a valorar el banco.'],
  FIN_COBORROWER_DEPENDENCY:['La decisión también depende de la otra persona que compraría conmigo.','No puedo decidir esto solo porque hay otro titular implicado.'],
  FIN_MISSING_INCOME_DOCUMENT:['Me falta un documento de ingresos que todavía no he conseguido.','Hay un justificante económico que aún no tengo.'],
  FIN_BANK_ADVICE_CONFLICT:['En otro banco me han explicado esto de una forma distinta y no sé qué criterio es correcto.','Ya me dieron una versión diferente sobre cómo me computan una parte del expediente.'],
  FIN_PRIOR_BANK_SETBACK:['Ya tuve una operación que se cayó bastante tarde y no quiero repetir aquello.','La última vez pensé que estaba todo encaminado y al final el banco dijo que no.'],

  LEGAL_MISSING_DOCUMENT:['Me falta un documento de la operación y no sé si se puede avanzar sin él.','Hay un papel jurídico o registral que todavía no tengo disponible.'],
  LEGAL_THIRD_PARTY_SIGNATURE:['Hay otra persona cuya firma o consentimiento también hace falta.','Esto no depende solo de mí porque interviene otra persona en la operación.'],
  LEGAL_SIGNING_DEADLINE:['Tengo una fecha de firma o un plazo que me aprieta bastante.','Hay un plazo acordado y me preocupa llegar sin tener todo resuelto.'],
  LEGAL_ADVICE_CONFLICT:['Me han dado dos explicaciones jurídicas distintas y no sé cuál aplica a mi caso.','Otro profesional me dijo algo diferente sobre este punto.'],
  LEGAL_OWNERSHIP_UNCERTAINTY:['No tengo del todo claro cómo está ahora mismo la titularidad.','Hay una duda sobre quién figura o debe figurar como titular.'],
  LEGAL_PRIOR_DOCUMENT_PROBLEM:['Ya tuve un problema anterior porque un documento no estaba como esperábamos.','Vengo con cautela porque antes una discrepancia documental complicó una operación.'],

  SEO_EXISTING_TRAFFIC_RISK:['La web ya recibe visitas y no quiero perder posiciones por tocar algo que funciona.','Hay URLs que ya traen tráfico y me preocupa romperlas durante los cambios.'],
  SEO_MEASUREMENT_ACCESS_MISSING:['Ahora mismo no tengo acceso completo a una de las herramientas de medición.','Nos falta acceso a datos de Search Console o medición para confirmar algunas decisiones.'],
  SEO_CMS_CONSTRAINT:['La web tiene una configuración y plugins que no podemos cambiar a lo bruto.','Hay dependencias del CMS que tenemos que conservar mientras mejoramos el SEO.'],
  SEO_PRIOR_MIGRATION_DAMAGE:['Ya tuvimos una migración que hizo caer tráfico y no quiero repetirla.','Una vez cambiamos estructura y perdimos visibilidad, así que ahora voy con cuidado.'],
  SEO_DEV_DEPENDENCY:['Algunos cambios dependen del desarrollador y no puedo ejecutarlos directamente.','Hay mejoras técnicas que requieren a otra persona del equipo.'],
  SEO_LOCAL_LEAD_PRIORITY:['Para mí lo importante no es tener más visitas sin más, sino generar leads locales útiles.','Prefiero menos tráfico si convierte mejor en la zona que realmente trabajamos.'],

  MKT_ZERO_EXTRA_BUDGET:['No quiero añadir presupuesto nuevo; tenemos que aprovechar lo que ya pagamos.','La condición es crecer sin contratar otra herramienta ni aumentar gasto fijo.'],
  MKT_LIMITED_TEAM_CAPACITY:['El equipo no puede sostener diez canales distintos a la vez.','Tenemos capacidad limitada y necesito priorizar lo que realmente mueve negocio.'],
  MKT_CRM_DATA_GAP:['La base de contactos no está tan limpia o segmentada como debería.','Hay datos del CRM que tendríamos que ordenar antes de lanzar algo masivo.'],
  MKT_APPROVAL_DEPENDENCY:['Parte de lo que hagamos tiene que pasar por otra persona antes de salir.','No todas las campañas las puedo aprobar yo solo.'],
  MKT_PRIOR_CAMPAIGN_DISAPPOINTMENT:['Ya gastamos en una campaña que dio mucho ruido y pocos clientes reales.','Vengo escarmentado porque una campaña anterior generó métricas bonitas pero poco negocio.'],
  MKT_QUALIFIED_LEAD_PRIORITY:['Me importa más la calidad del lead que inflar el volumen.','No quiero perseguir visitas o formularios si no terminan en oportunidades reales.'],

  SOC_LIMITED_CONTENT_CAPACITY:['No podemos producir contenido nuevo todos los días.','Necesito un sistema de redes que funcione con una capacidad de producción limitada.'],
  SOC_APPROVAL_DEPENDENCY:['Algunas publicaciones necesitan revisión antes de salir.','No todo el contenido puede publicarse sin una aprobación previa.'],
  SOC_ACCOUNT_ACCESS_MISSING:['No tenemos acceso completo a una de las cuentas sociales.','Hay una red en la que todavía falta recuperar permisos de administración.'],
  SOC_BRAND_TONE_CONSTRAINT:['No quiero que la marca suene agresiva ni demasiado comercial.','El tono de la marca tiene que mantenerse cercano y profesional.'],
  SOC_PRIOR_ACCOUNT_PROBLEM:['Ya tuvimos un problema con una cuenta o una publicación y no quiero repetirlo.','Una incidencia anterior en redes hace que ahora quiera más control antes de publicar.'],
  SOC_CHANNEL_LIMIT:['No quiero abrir canales que luego no podamos mantener bien.','Prefiero trabajar menos redes si las podemos llevar con continuidad.'],

  PLATFORM_LEGACY_DEPENDENCY:['Hay una parte del sistema actual que no podemos romper porque ya la usa producción.','Tenemos una dependencia antigua que debe seguir funcionando mientras envolvemos lo nuevo.'],
  PLATFORM_SHARED_RESOURCE_CONSTRAINT:['No quiero que los trabajos pesados saturen los recursos que usa la App.','Hay procesos auxiliares que compiten por recursos con el core y eso me preocupa.'],
  PLATFORM_EXTERNAL_SERVICE_DEPENDENCY:['Una parte del flujo depende de un servicio externo que no controlamos.','Tenemos una dependencia externa que puede fallar y necesitamos contemplarla.'],
  PLATFORM_ROLLBACK_REQUIRED:['No acepto este cambio si no podemos volver atrás de forma probada.','Para mí el rollback real es condición para avanzar.'],
  PLATFORM_PRIOR_OUTAGE:['Ya tuvimos una caída relacionada con un cambio y no quiero repetirla.','Una incidencia anterior me hace exigir una implantación más gradual.'],
  PLATFORM_ARCHITECTURE_CONFLICT:['He recibido dos propuestas distintas sobre dónde debería vivir este componente.','Hay criterios enfrentados sobre si esto debe ir dentro o fuera del core.'],

  MULTI_LEGACY_STACK_MUST_SURVIVE:['La empresa ya tiene web, CRM y automatizaciones que no podemos romper durante el alta.','No empezamos desde cero; hay sistemas actuales que deben seguir funcionando mientras conectamos CEREBRO.'],
  MULTI_ADMIN_ACCESS_MISSING:['Todavía no tenemos acceso de administrador a uno de los sistemas de la nueva empresa.','Falta recuperar una credencial o permiso administrativo antes de poder integrar una parte.'],
  MULTI_MIGRATION_WINDOW_CONSTRAINT:['No podemos cambiar todo a la vez porque hay una ventana limitada para migrar.','La transición tiene que hacerse por fases sin parar la operativa de la empresa.'],
  MULTI_OWNER_APPROVAL_DEPENDENCY:['Hay decisiones de implantación que dependen también del responsable de esa empresa.','No puedo cerrar todo el onboarding sin la aprobación de otra persona.'],
  MULTI_ZERO_COST_PRIORITY:['Quiero evitar nuevas suscripciones mientras haya una alternativa razonable con lo que ya tenemos.','El coste adicional cero es una condición importante para este alta.'],
  MULTI_PRIOR_MIGRATION_FAILURE:['Ya tuvimos una migración que rompió cosas y no quiero repetir ese enfoque.','Una implantación anterior salió mal por sustituir demasiado de golpe.'],

  NEWSLETTER_LIST_QUALITY_GAP:['La lista tiene contactos que todavía necesitan mejor segmentación.','No estoy seguro de que la base esté lo bastante limpia para enviar a todos igual.'],
  NEWSLETTER_AUDIENCE_SPLIT:['Tenemos dos públicos distintos y no quiero mandarles el mismo mensaje.','Particulares y colaboradores necesitan recorridos separados.'],
  NEWSLETTER_CONTENT_APPROVAL:['El contenido de algunos envíos necesita revisión antes de salir.','No todos los correos pueden salir sin una validación previa.'],
  NEWSLETTER_FREQUENCY_CAPACITY:['No quiero prometer una frecuencia que luego el equipo no pueda mantener.','La cadencia tiene que ser sostenible con la capacidad real que tenemos.'],
  NEWSLETTER_PRIOR_DELIVERABILITY_ISSUE:['Ya tuvimos problemas de entrega o rebotes y quiero evitar que se repitan.','Una campaña anterior tuvo problemas de entregabilidad.'],
  NEWSLETTER_CONSENT_CONSTRAINT:['Quiero asegurarme de que la segmentación y el envío respeten los permisos disponibles.','No podemos tratar todos los contactos igual sin revisar el consentimiento aplicable.'],

  TRADING_ISOLATION_REQUIRED:['No quiero que este laboratorio comparta nada crítico con producción.','El aislamiento respecto a App, CRM y CEREBRO PROD es una condición absoluta.'],
  TRADING_LOSS_LIMIT_REQUIRED:['No quiero ninguna prueba que pueda saltarse los límites de pérdida establecidos.','Los límites de riesgo tienen que estar por encima de cualquier estrategia.'],
  TRADING_RESOURCE_BOUNDARY:['Si hay conflicto de recursos, el laboratorio debe ser lo primero que se detenga.','Trading no puede competir con producción por recursos críticos.'],
  TRADING_BROKER_DEPENDENCY:['Parte de la prueba depende del broker y de su disponibilidad.','Hay una dependencia del proveedor de mercado que tenemos que contemplar.'],
  TRADING_PRIOR_RUNTIME_FAILURE:['Ya vimos un fallo del runtime y no quiero que se repita sin circuit breaker.','Una incidencia anterior hace que quiera watchdog y kill switch antes de seguir.'],
  TRADING_STRATEGY_CONFLICT:['Hay dos criterios distintos sobre cómo debería reaccionar la estrategia en este caso.','No tengo claro qué regla debe prevalecer porque hemos recibido recomendaciones opuestas.']
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
  const semanticKey=String(fact?.semantic_key??'');
  const variants=SEMANTIC_UTTERANCES[semanticKey]??FACT_UTTERANCES[type]??['Hay un dato importante que no había explicado antes y puede cambiar la situación.'];
  return pickBySeed(variants,profile?.seed??'synthetic',turn,`fact:${semanticKey||type}`);
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
  for(const forbidden of [...Object.keys(FACT_UTTERANCES),...Object.keys(SEMANTIC_UTTERANCES)])if(raw.includes(forbidden))throw new Error(`synthetic_ontology_leak:${forbidden}`);
  return raw;
}
