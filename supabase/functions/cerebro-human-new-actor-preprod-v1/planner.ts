export type Turn={role:"user"|"cerebro";text:string};

function norm(v:string){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");}
function clean(v:string){return norm(v).replace(/^[¿¡?!.]+/g,"").replace(/[?!.]+$/g,"").trim();}
function lastByRole(context:Turn[],role:"user"|"cerebro"){for(let i=context.length-1;i>=0;i--)if(context[i]?.role===role)return String(context[i].text??"").trim();return "";}
function domainFrom(text:string){
  const t=norm(text);
  if(/\b(legal|juridic|arras|compraventa|registro|cargas?|notari|herencia|donacion|itp|plusvalia|catastro|embargo|titularidad|urbanismo|fiscal)\b/.test(t))return "legal";
  if(/\b(hipoteca|financi|banco|tin|tae|fein|tasacion|endeudamiento|deuda|prestamo|cuota)\b/.test(t))return "finance";
  if(/\b(seo|keyword|palabra clave|indexacion|search console|gsc|enlazado|landing)\b/.test(t))return "seo";
  if(/\b(marketing|embudo|captacion|campana|conversion|clientes)\b/.test(t))return "marketing";
  if(/\b(redes|facebook|instagram|linkedin|tiktok|youtube|social)\b/.test(t))return "social";
  if(/\b(newsletter|brevo|email marketing)\b/.test(t))return "newsletter";
  if(/\b(supabase|gateway|console|runtime|worker|arquitectura|motor)\b/.test(t))return "platform";
  if(/\b(trading|watchdog|kill switch)\b/.test(t))return "trading";
  if(/\b(multiempresa|nueva empresa|empresa nueva|dar de alta una empresa|alta de una empresa|onboarding|company registry)\b/.test(t))return "multiempresa";
  return null;
}
function contextDomain(message:string,context:Turn[]){const explicit=domainFrom(message);if(explicit)return explicit;for(let i=context.length-1;i>=0;i--)if(context[i]?.role==="user"){const d=domainFrom(context[i].text);if(d)return d;}for(let i=context.length-1;i>=0;i--)if(context[i]?.role==="cerebro"){const d=domainFrom(context[i].text);if(d)return d;}return null;}
function oneQuestion(prefix:string,question:string){return `${prefix.trim().replace(/[?¿]+$/,"").trim()} ${question.trim().replace(/^¿?/,"¿").replace(/[?.!]+$/,"?")}`.trim();}
function repeated(candidate:string,context:Turn[]){const prev=lastByRole(context,"cerebro");if(!prev)return false;const a=norm(candidate),b=norm(prev);if(a===b)return true;const wa=new Set(a.split(/\W+/).filter(x=>x.length>3)),wb=new Set(b.split(/\W+/).filter(x=>x.length>3));if(!wa.size||!wb.size)return false;const common=[...wa].filter(x=>wb.has(x)).length;return common/Math.max(wa.size,wb.size)>=0.82;}
function isActionRequest(text:string){
  const t=clean(text);
  if(/^(?:por favor\s+)?(?:prepara|activa|crea|publica|lanza|ejecuta|inicia|configura|modifica|borra|elimina|envia|manda|paga|firma)\b/.test(t))return true;
  if(/^(?:quiero|necesito)\s+que\s+(?:prepares|actives|crees|publiques|lances|ejecutes|inicies|configures|modifiques|borres|elimines|envies|mandes|pagues|firmes)\b/.test(t))return true;
  return false;
}
function actionThread(context:Turn[]){for(let i=context.length-1;i>=0;i--){if(context[i]?.role!=="user")continue;const t=clean(context[i].text);if(isActionRequest(t))return t;}return "";}
function actionScopeQuestion(action:string){
  if(/campana|clientes/.test(action))return "¿Qué campaña quieres preparar, para qué audiencia autorizada y con qué objetivo?";
  if(/envia|manda|correo|email/.test(action))return "¿Qué mensaje quieres preparar, quién es el destinatario autorizado y qué resultado esperas?";
  if(/publica/.test(action))return "¿Qué pieza quieres preparar, en qué canal autorizado y con qué objetivo?";
  return "¿Qué resultado exacto quieres preparar, sobre qué alcance autorizado y qué límite no debo sobrepasar?";
}
function domainFirstTurn(domain:string|null){const map:Record<string,{answer:string;question:string}>={
  finance:{answer:"En financiación conviene separar primero viabilidad, cuotas/deudas, documentación, banco y fase de firma. Una cuota o deuda existente puede cambiar la capacidad de endeudamiento, pero el efecto concreto depende del caso y debe verificarse.",question:"¿Qué necesitas aclarar primero: viabilidad, una deuda/cuota, documentación, banco/tasación o firma?"},
  legal:{answer:"En un asunto inmobiliario legal conviene separar hechos, documentos, fase de la operación y qué requiere verificación profesional o normativa vigente. No voy a convertir orientación general en criterio jurídico definitivo.",question:"¿Estás antes de firmar, revisando un documento, resolviendo una carga/herencia o intentando entender un riesgo concreto?"},
  seo:{answer:"En SEO empezaría por rastreo e indexación, intención y arquitectura, contenido, enlazado interno, SEO local cuando aplique y medición. El orden cambia según si la web es nueva o ya tiene tráfico.",question:"¿La web es nueva o ya tiene datos de Search Console y tráfico?"},
  marketing:{answer:"Para captar más sin aumentar gasto, priorizaría activos ya pagados: SEO, contenido reutilizable, CRM/reactivación, referidos, Google Business y B2B antes de añadir nuevos costes.",question:"¿Dónde está hoy el mayor cuello de botella: falta de leads, baja conversión o poca reactivación de contactos existentes?"},
  social:{answer:"En redes priorizaría objetivo, audiencia, canales que realmente puedan mantenerse, calendario reutilizable y medición ligada a leads o negocio, no a métricas de vanidad.",question:"¿Buscas captar clientes, reforzar marca, alimentar una comunidad o apoyar ventas B2B?"},
  newsletter:{answer:"En newsletter separaría audiencia, propósito, segmentación, contenido, frecuencia y medición; el envío real debe seguir los gates del canal.",question:"¿La newsletter es para particulares, colaboradores B2B o ambos con recorridos separados?"},
  platform:{answer:"No conviene cargar todo en Supabase: debe protegerse el core transaccional y sacar fuera jobs largos, investigación, training, simulación, OCR pesado y logs auxiliares cuando no necesiten consistencia transaccional inmediata.",question:"¿Quieres que lo llevemos a un caso concreto de runtime, logs, training o workers?"},
  trading:{answer:"Trading LAB debe permanecer aislado de App/CRM/CEREBRO PROD en credenciales, ejecución y recursos críticos, con límites y kill switch propios.",question:"¿Quieres revisar aislamiento, credenciales, límites o recuperación ante fallo?"},
  multiempresa:{answer:"El alta de una empresa debe empezar por registro e identidad de compañía, discovery del negocio y huella digital; después se activan conocimiento, marketing/SEO, CRM/App, automatización, training y supervisor mediante gates.",question:"¿La nueva empresa parte de una web y procesos existentes o empieza prácticamente desde cero?"}
};return domain?map[domain]??null:null;}
function responseForConcern(message:string,context:Turn[],domain:string|null){
  const t=clean(message);const hasPriorActor=context.some(turn=>turn.role==="cerebro");
  if(/\b(mala experiencia|salio mal|desconfio|no me fio|antes me fue mal)\b/.test(t))return oneQuestion("Entiendo que vayas con cuidado; una mala experiencia anterior cambia el nivel de evidencia que necesitas antes de confiar, así que primero conviene entender qué falló.","¿Qué fue exactamente lo que salió mal la otra vez y qué quieres evitar ahora?");
  if(/\b(otra financiacion|otro prestamo|cuota mensual|deuda que pago|deuda)\b/.test(t))return oneQuestion("Sí, una obligación mensual puede afectar a la capacidad de endeudamiento y por eso conviene incorporarla al análisis en lugar de ignorarla.","¿Cuál es la cuota mensual aproximada y queda alguna otra financiación relevante por revisar?");
  if(/\b(documento que.*no tengo|me falta.*papel|me falta.*documento|no tengo.*documento)\b/.test(t))return oneQuestion("Que falte un documento no significa automáticamente que la operación esté bloqueada; primero hay que identificar qué acredita y si existe una alternativa válida.","¿Qué documento te falta exactamente y en qué fase estás?");
  if(/\b(otra persona.*dijo|me dijeron.*otra cosa|otra version|contradictori)\b/.test(t))return oneQuestion("Si has recibido dos versiones distintas, no sería responsable elegir una por intuición; hay que contrastar qué afirma cada fuente y con qué evidencia.","¿Cuáles son las dos versiones concretas que te han dado?");
  if(/\b(no depende solo de mi|otra persona.*acuerdo|tercera persona|otra persona.*firma|firma o consentimiento|consentimiento.*hace falta)\b/.test(t))return oneQuestion("Entonces hay una dependencia de otra persona que puede cambiar el siguiente paso, así que conviene incorporarla antes de dar nada por cerrado.","¿Qué decisión, firma o condición depende exactamente de esa otra persona?");
  if(/\b(no podemos romper|no puedo romper|deben seguir funcionando|tiene que seguir funcionando|sistemas actuales|web,? crm|automatizaciones)\b/.test(t))return oneQuestion("Entendido: ya existe un stack que debe sobrevivir al alta, así que no partimos de cero y la implantación tiene que envolverlo y probarse antes de sustituir nada.","¿Qué sistemas son críticos hoy y cuál de ellos no admite ninguna interrupción?");
  if(/\b(otro compromiso|otra obligacion|me condiciona|condicion importante|limite que no|me limita|no estaria dispuesto)\b/.test(t))return oneQuestion("Ese condicionante puede cambiar la recomendación, así que prefiero incorporarlo antes de seguir suponiendo y evitar una propuesta que no te sirva.","¿Qué compromiso o límite concreto tenemos que respetar?");
  if(/\b(no responde|no me estas resolviendo|dando vueltas|eso suena general|no me convence)\b/.test(t))return oneQuestion("Tienes razón en pedir algo más concreto; repetir la explicación general no resolvería tu duda, así que voy a aislar el punto que falta.","¿Qué necesitas cerrar ahora: un dato, el criterio que estoy aplicando o el siguiente paso?");
  if(hasPriorActor&&/\b(perdido|no entiendo|no se por donde|no me cuadra|sigo dudando|no tengo claro)\b/.test(t))return oneQuestion("Veo que la explicación anterior no te ha dejado una decisión clara; para no añadir más carga vamos a reducirlo a una sola cuestión.","¿Qué te preocupa más ahora mismo: entender el criterio, saber qué dato falta o decidir qué hacer después?");
  if(/\b(voy con prisa|vamos al grano|al grano|respuesta mas concreta)\b/.test(t))return oneQuestion("Voy al punto y sin añadir teoría innecesaria, porque ahora lo útil es darte una siguiente decisión concreta.","¿Necesitas que te diga el siguiente paso, el dato que falta o una decisión entre opciones?");
  if(/\b(que necesitas saber de mi|que dato necesitas|siguiente paso|que hago ahora)\b/.test(t)){
    const action=actionThread(context);if(action)return oneQuestion("Vamos a concretar el alcance sin ejecutar nada todavía; así podemos validar destinatario, objetivo y límites antes de cualquier acción.",actionScopeQuestion(action));
    const qs:Record<string,string>={finance:"¿Cuál es el dato que más puede cambiar la viabilidad ahora: ingresos netos, cuotas/deudas existentes, ahorro disponible o precio de compra?",legal:"¿Qué documento, firma o compromiso estás intentando resolver y en qué fecha?",seo:"¿La web ya está publicada y tiene datos de indexación/medición, o aún está en construcción?",marketing:"¿Cuántos leads cualificados genera hoy el canal principal y dónde se pierden?",social:"¿Qué red es prioritaria y qué objetivo de negocio debe cumplir?",platform:"¿Qué carga concreta quieres sacar o dejar dentro de Supabase?",multiempresa:"¿Qué sistemas y procesos existen ya y cuál es el más crítico que debemos conservar?"};
    return oneQuestion("Vamos a concretarlo; una pregunta bien elegida evita pedirte información que no cambia la decisión.",qs[domain??""]??"¿Cuál es el resultado concreto que quieres conseguir y qué dato te falta para poder decidir?");
  }
  return null;
}
export function planHumanResponse({message,conversation_context=[],seed=""}:{message:string;conversation_context?:Turn[];seed?:string}){
  const context=Array.isArray(conversation_context)?conversation_context.slice(-10):[];const text=clean(message),domain=contextDomain(message,context);
  if(!text)return {status:"INVALID",intent:"invalid",message:"Escribe una consulta.",executed:false};
  if(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey)$/.test(text))return {status:"OK",intent:"greeting",message:"Hola. Te escucho. Cuéntame qué necesitas y lo vamos concretando.",executed:false};
  if(isActionRequest(text)){const candidate=oneQuestion("He detectado una petición de acción. En este actor PREPROD no voy a ejecutar nada real; primero hay que cerrar el alcance para no actuar sobre una interpretación incompleta.","¿Qué resultado exacto quieres conseguir y cuál sería el límite que no debo sobrepasar?");return {status:"ACTION_NEEDS_SCOPE",intent:"action",message:candidate,executed:false,conversation_topic:domain};}
  let candidate=responseForConcern(message,context,domain);let intent=candidate?"human_concern":"knowledge";
  if(!candidate){const first=domainFirstTurn(domain);if(first)candidate=oneQuestion(first.answer,first.question);else candidate=oneQuestion("No quiero rellenar los huecos inventando. Podemos ordenar la situación aunque todavía no sepas explicarla del todo, porque separar objetivo, datos y restricciones reduce el riesgo de asumir mal.","¿Qué es lo que más te preocupa ahora mismo: entender qué pasa, saber qué información falta o decidir qué hacer?");}
  if(repeated(candidate,context)){candidate=oneQuestion("No voy a repetirte lo anterior; si la respuesta se parece demasiado, significa que tengo que cambiar de estrategia para encontrar qué sigue sin resolverse.","¿Qué parte de mi respuesta anterior no te sirve o qué dato esperabas que concretara?");intent="repair_repetition";}
  const priorHuman=lastByRole(context,"user");return {status:"OK",intent,message:candidate,executed:false,context_applied:Boolean(priorHuman||domain),conversation_topic:domain,epistemic_state:domain?"BOUNDED_DOMAIN_REASONING":"INSUFFICIENT_CONTEXT",question_budget:1};
}
