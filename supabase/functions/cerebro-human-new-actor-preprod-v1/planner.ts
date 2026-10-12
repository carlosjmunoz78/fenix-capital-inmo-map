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
  if(/\b(multiempresa|nueva empresa|onboarding|company registry)\b/.test(t))return "multiempresa";
  return null;
}
function contextDomain(message:string,context:Turn[]){
  const explicit=domainFrom(message); if(explicit)return explicit;
  for(let i=context.length-1;i>=0;i--){const d=domainFrom(context[i].text);if(d)return d;}
  return null;
}
function oneQuestion(prefix:string,question:string){return `${prefix.trim().replace(/[?¿]+$/,"").trim()} ${question.trim().replace(/^¿?/,"¿").replace(/[?.!]+$/,"?")}`.trim();}
function repeated(candidate:string,context:Turn[]){
  const prev=lastByRole(context,"cerebro"); if(!prev)return false;
  const a=norm(candidate),b=norm(prev); if(a===b)return true;
  const wa=new Set(a.split(/\W+/).filter(x=>x.length>3)), wb=new Set(b.split(/\W+/).filter(x=>x.length>3));
  if(!wa.size||!wb.size)return false;
  const common=[...wa].filter(x=>wb.has(x)).length;
  return common/Math.max(wa.size,wb.size)>=0.82;
}
function domainFirstTurn(domain:string|null){
  const map:Record<string,{answer:string;question:string}>={
    finance:{answer:"En financiación conviene separar primero viabilidad, cuotas/deudas, documentación, banco y fase de firma. Una cuota o deuda existente puede cambiar la capacidad de endeudamiento, pero el efecto concreto depende del caso y debe verificarse.",question:"¿Qué necesitas aclarar primero: viabilidad, una deuda/cuota, documentación, banco/tasación o firma?"},
    legal:{answer:"En un asunto inmobiliario legal conviene separar hechos, documentos, fase de la operación y qué requiere verificación profesional o normativa vigente. No voy a convertir orientación general en criterio jurídico definitivo.",question:"¿Estás antes de firmar, revisando un documento, resolviendo una carga/herencia o intentando entender un riesgo concreto?"},
    seo:{answer:"En SEO empezaría por rastreo e indexación, intención y arquitectura, contenido, enlazado interno, SEO local cuando aplique y medición. El orden cambia según si la web es nueva o ya tiene tráfico.",question:"¿La web es nueva o ya tiene datos de Search Console y tráfico?"},
    marketing:{answer:"Para captar más sin aumentar gasto, priorizaría activos ya pagados: SEO, contenido reutilizable, CRM/reactivación, referidos, Google Business y B2B antes de añadir nuevos costes.",question:"¿Dónde está hoy el mayor cuello de botella: falta de leads, baja conversión o poca reactivación de contactos existentes?"},
    social:{answer:"En redes priorizaría objetivo, audiencia, canales que realmente puedan mantenerse, calendario reutilizable y medición ligada a leads o negocio, no a métricas de vanidad.",question:"¿Buscas captar clientes, reforzar marca, alimentar una comunidad o apoyar ventas B2B?"},
    newsletter:{answer:"En newsletter separaría audiencia, propósito, segmentación, contenido, frecuencia y medición; el envío real debe seguir los gates del canal.",question:"¿La newsletter es para particulares, colaboradores B2B o ambos con recorridos separados?"},
    platform:{answer:"No conviene cargar todo en Supabase: debe protegerse el core transaccional y sacar fuera jobs largos, investigación, training, simulación, OCR pesado y logs auxiliares cuando no necesiten consistencia transaccional inmediata.",question:"¿Quieres que lo llevemos a un caso concreto de runtime, logs, training o workers?"},
    trading:{answer:"Trading LAB debe permanecer aislado de App/CRM/CEREBRO PROD en credenciales, ejecución y recursos críticos, con límites y kill switch propios.",question:"¿Quieres revisar aislamiento, credenciales, límites o recuperación ante fallo?"},
    multiempresa:{answer:"El alta de una empresa debe empezar por registro e identidad de compañía, discovery del negocio y huella digital; después se activan conocimiento, marketing/SEO, CRM/App, automatización, training y supervisor mediante gates.",question:"¿La nueva empresa parte de una web y procesos existentes o empieza prácticamente desde cero?"}
  };
  return domain?map[domain]??null:null;
}
function responseForConcern(message:string,context:Turn[],domain:string|null){
  const t=clean(message);
  if(/\b(mala experiencia|salio mal|salió mal|desconfio|desconfío|no me fio|no me fío|antes me fue mal)\b/.test(t))
    return oneQuestion("Entiendo que vayas con cuidado; una mala experiencia anterior cambia el nivel de detalle que necesitas antes de confiar en el siguiente paso.","¿Qué fue exactamente lo que salió mal la otra vez y qué quieres evitar ahora?");
  if(/\b(no responde|no me estas resolviendo|no me estás resolviendo|dando vueltas|eso suena general|no me convence)\b/.test(t))
    return oneQuestion("Tienes razón en pedir algo más concreto. No voy a repetirte la explicación general.","¿Qué punto exacto necesitas resolver ahora: el dato que falta, el criterio que aplico o el siguiente paso?");
  if(/\b(perdido|perdida|no entiendo|no se por donde|no sé por dónde|no me cuadra|sigo dudando|no tengo claro)\b/.test(t))
    return oneQuestion("Veo que la explicación anterior no te ha dejado una decisión clara. Vamos a reducirlo a una sola cosa cada vez.","¿Qué te preocupa más ahora mismo: entender el criterio, saber qué dato falta o decidir qué hacer después?");
  if(/\b(otra financiacion|otra financiación|otro prestamo|otro préstamo|cuota mensual|deuda que pago|deuda)\b/.test(t))
    return oneQuestion("Sí, una obligación mensual puede afectar a la capacidad de endeudamiento y por eso conviene incorporarla al análisis en lugar de ignorarla.","¿Cuál es la cuota mensual aproximada y queda alguna otra financiación relevante por revisar?");
  if(/\b(documento que.*no tengo|me falta.*papel|me falta.*documento|no tengo.*documento)\b/.test(t))
    return oneQuestion("Que falte un documento no significa automáticamente que la operación esté bloqueada; primero hay que identificar qué acredita y si existe una alternativa válida.","¿Qué documento te falta exactamente y en qué fase estás?");
  if(/\b(otra persona.*dijo|me dijeron.*otra cosa|otra version|otra versión|contradictori)\b/.test(t))
    return oneQuestion("Si has recibido dos versiones distintas, no sería responsable elegir una por intuición. Hay que comparar exactamente qué afirmó cada fuente y qué evidencia tiene.","¿Cuáles son las dos versiones concretas que te han dado?");
  if(/\b(no depende solo de mi|no depende sólo de mí|otra persona.*acuerdo|tercera persona)\b/.test(t))
    return oneQuestion("Entonces la decisión no es solo individual y conviene incluir esa dependencia antes de proponerte un siguiente paso.","¿Qué decisión o condición depende de esa otra persona?");
  if(/\b(condicion importante|condición importante|limite que no|límite que no|me limita)\b/.test(t))
    return oneQuestion("Ese límite puede cambiar la recomendación, así que prefiero incorporarlo antes de seguir suponiendo.","¿Qué condición concreta te limita y qué no estarías dispuesto a asumir?");
  if(/\b(voy con prisa|vamos al grano|al grano|respuesta mas concreta|respuesta más concreta)\b/.test(t))
    return oneQuestion("Voy al punto y sin añadir teoría innecesaria.","¿Necesitas que te diga el siguiente paso, el dato que falta o una decisión entre opciones?");
  if(/\b(que necesitas saber de mi|qué necesitas saber de mí|que dato necesitas|qué dato necesitas|siguiente paso|que hago ahora|qué hago ahora)\b/.test(t)){
    const qs:Record<string,string>={
      finance:"¿Cuál es el dato que más puede cambiar la viabilidad ahora: ingresos netos, cuotas/deudas existentes, ahorro disponible o precio de compra?",
      legal:"¿Qué documento o compromiso vas a firmar o revisar y en qué fecha?",
      seo:"¿La web ya está publicada y tiene datos de indexación/medición, o aún está en construcción?",
      marketing:"¿Cuántos leads cualificados genera hoy el canal principal y dónde se pierden?",
      social:"¿Qué red es prioritaria y qué objetivo de negocio debe cumplir?",
      platform:"¿Qué carga concreta quieres sacar o dejar dentro de Supabase?",
      multiempresa:"¿Qué activos existen ya: web, CRM, documentación, procesos y cuentas de marketing?"
    };
    return oneQuestion("Vamos a concretarlo.",qs[domain??""]??"¿Cuál es el resultado concreto que quieres conseguir y qué dato te falta para poder decidir?");
  }
  return null;
}
export function planHumanResponse({message,conversation_context=[],seed=""}:{message:string;conversation_context?:Turn[];seed?:string}){
  const context=Array.isArray(conversation_context)?conversation_context.slice(-10):[];
  const text=clean(message), domain=contextDomain(message,context);
  if(!text)return {status:"INVALID",intent:"invalid",message:"Escribe una consulta.",executed:false};
  if(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey)$/.test(text))
    return {status:"OK",intent:"greeting",message:"Hola. Te escucho. Cuéntame qué necesitas y lo vamos concretando.",executed:false};
  if(/\b(prepara|activa|activar|crea|publica|lanza|ejecuta|inicia|configura|modifica|borra|envia|envía|paga|firma)\b/.test(text)){
    const candidate=oneQuestion("He detectado una petición de acción. En este actor PREPROD no voy a ejecutar nada real, pero sí puedo ayudarte a dejar el alcance correctamente definido.","¿Qué resultado exacto quieres conseguir y cuál sería el límite que no debo sobrepasar?");
    return {status:"ACTION_NEEDS_SCOPE",intent:"action",message:candidate,executed:false,conversation_topic:domain};
  }
  let candidate=responseForConcern(message,context,domain);
  let intent=candidate?"human_concern":"knowledge";
  if(!candidate){
    const first=domainFirstTurn(domain);
    if(first)candidate=oneQuestion(first.answer,first.question);
    else candidate=oneQuestion("No quiero rellenar los huecos inventando. Podemos ordenar la situación aunque todavía no sepas explicarla del todo.","¿Qué es lo que más te preocupa ahora mismo: entender qué pasa, saber qué información falta o decidir qué hacer?");
  }
  if(repeated(candidate,context)){
    candidate=oneQuestion("No voy a repetirte lo anterior. Voy a cambiar de estrategia para encontrar qué sigue sin resolverse.","¿Qué parte de mi respuesta anterior no te sirve o qué dato esperabas que concretara?");
    intent="repair_repetition";
  }
  const priorHuman=lastByRole(context,"user");
  const contextApplied=Boolean(priorHuman||domain);
  return {status:"OK",intent,message:candidate,executed:false,context_applied:contextApplied,conversation_topic:domain,epistemic_state:domain?"BOUNDED_DOMAIN_REASONING":"INSUFFICIENT_CONTEXT",question_budget:1};
}
