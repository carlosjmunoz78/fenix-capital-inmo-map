/**
 * CEREBRO Owner Console natural-language contract, deterministic / zero-cost.
 * This is NOT an LLM. Narrow verified capabilities, no fabricated executions.
 * All other questions continue to existing canonical/documental router.
 */
export type SafeTurn={role:"user"|"cerebro";text:string};
type Reply={status:"OK"|"NOT_APPLIED"|"LOW_CONFIDENCE";intent:string;executed:false;message:string;evidence_mode:"GATEWAY_CAPABILITIES_V1"|"CONVERSATION_CONTEXT_BOUNDED"|"NO_EXECUTION_PLAN_V1"};
function norm(value:string){
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^[¿¡\s]+|[?!.\s]+$/g,"").trim();
}
function reply(status:Reply["status"],intent:string,message:string,evidence_mode:Reply["evidence_mode"]="GATEWAY_CAPABILITIES_V1"):Reply{
 return{status,intent,executed:false,message,evidence_mode};
}
export function answerCerebroNaturalQuery(message:string,context:SafeTurn[]=[]):Reply|null{
 const q=norm(message);
 if(!q||q.length>2000)return null;
 // Conversation recall uses only bounded, owner-authenticated conversation data.
 if(/(?:cual|que)\s+(?:fue|era|ha sido)\s+(?:mi|la)\s+(?:ultima\s+)?(?:pregunta|mensaje)\s+anterior|(?:recuerdas|repite|dime)\s+(?:mi|la)\s+ultima\s+(?:pregunta|mensaje)/.test(q)){
  const prev=[...context].reverse().find(t=>t.role==="user"&&t.text.trim());
  return reply("OK","previous_question",prev?"Tu última pregunta disponible en esta conversación fue: «"+prev.text.slice(0,450)+"».":"Todavía no tengo una pregunta anterior en el contexto que me ha enviado esta sesión. No voy a inventarla.","CONVERSATION_CONTEXT_BOUNDED");
 }
 if(/^(?:explicame|resume|resumeme|dime|cuentame|repite)\s+(?:lo|eso|el mensaje|la respuesta)\s+anterior|(?:mas|mucho)\s+(?:simple|sencillo|corto)\s+(?:lo anterior|eso)/.test(q)){
  const prev=[...context].reverse().find(t=>t.role==="cerebro"&&t.text.trim());
  if(!prev)return reply("LOW_CONFIDENCE","explain_previous_missing","No veo una respuesta anterior en el contexto de esta sesión. Indícame el tema y te lo explicaré sin inventar información.","CONVERSATION_CONTEXT_BOUNDED");
  const sentences=prev.text.replace(/\s+/g," ").trim().match(/[^.!?]+[.!?]?/g)||[prev.text];
  const short=sentences.map(t=>t.trim()).filter(Boolean).slice(0,2).join(" ").slice(0,400);
  return reply("OK","explain_previous","Mi respuesta anterior, resumida sin añadir información nueva: "+short,"CONVERSATION_CONTEXT_BOUNDED");
 }
 if(/\b(aion|captacasa)\b/.test(q)&&/\b(muestrame|mostrar|consulta|consultar|dame|lista|trabajos|expedientes|datos)\b/.test(q))return reply("OK","company_scope","Esta consola todavía no tiene autorización operativa para consultar datos de AION o CAPTACASA. Solo puedo trabajar en el contexto autorizado de Fénix Capital; no voy a mezclar información entre empresas.");
 // These ask ABOUT sources, not for any secret or new privileged access.
 if((/\b(puedes|podrias|tienes|eres capaz|capacidad|consultas|accedes|acceso)\b/.test(q)&&/\b(informacion|fuentes|datos|web|internet|documentos|guardad[oa]s?|tiempo real|en vivo)\b/.test(q))||
    /(?:informacion|datos)\s+real(?:es)?\s+o\s+(?:solo|solamente)/.test(q)){
  return reply("OK","source_capabilities",
   "Puedo consultar algunas fuentes reales autorizadas: por ejemplo, expedientes activos y directorio de inmobiliarias de App Fénix mediante consultas específicas, y programación social cuando su fuente está disponible. También consulto documentación autorizada y memoria conversacional acotada. No es lo mismo: los documentos pueden estar desactualizados, y este Gateway no tiene navegación libre por Internet ni acceso universal a los motores. Si no puedo verificar un dato actual, te lo diré y no inventaré una respuesta.");
 }
 if(/^(?:que|cuales)\s+(?:funciones|capacidades|herramientas)\s+(?:tienes|hay|estan)\b|(?:que|como)\s+(?:puedo|podemos)\s+(?:pedirte|hacer contigo)\b|(?:que|cuales)\s+(?:cosas|acciones)\s+(?:todavia\s+)?(?:puedes|no puedes)\s+(?:hacer|ejecutar)\b|^que\s+puedes\s+hacer\b|^(?:que|quien)\s+eres\b/.test(q)){
  return reply("OK","owner_capabilities",
   "En esta consola puedo responder sobre conocimiento autorizado de CEREBRO, consultar ciertos datos reales de App Fénix y programación social cuando están disponibles, mantener el contexto reciente y preparar propuestas sujetas a controles. No tengo acceso general a Internet, no controlo todos los motores desde este chat y no puedo prometer que un botón cambie el runtime. Las acciones reales requieren contrato, permisos y verificación; no modificaré CRM, DNS, dinero ni producción por interpretar una frase.");
 }
 // Focus and intensity controls are chat REQUESTS, not runtime changes.
 const asksMode=/\b(modo|ritmo|potencia|prioridad|concentracion|emergencia|maximo)\b/.test(q)
  &&/\b(activa|activar|pon|pongo|solicito|cambia|configura|aplica|aplicar|incrementa|aumenta|establece|quiero)\b/.test(q);
 if(asksMode){
  const mode=/\bmaximo\b/.test(q)?"Máximo":/\bemergencia\b/.test(q)?"Emergencia":/\bconcentracion\b/.test(q)?"Concentración":/\balto\b/.test(q)?"Alto":/\bsuave\b/.test(q)?"Suave":/\bnormal\b/.test(q)?"Normal":/\besta noche\b/.test(q)?"Esta noche":"el modo indicado";
  return reply("NOT_APPLIED","mode_not_applied",
   "He entendido tu solicitud de "+mode+", pero NO he cambiado la prioridad real de ningún motor. Estos controles envían una petición de chat; todavía no hay confirmación operativa de aplicación en el runtime. Para activarlo realmente necesitamos un contrato de ejecución autorizado y una comprobación del resultado. No se ha generado ningún gasto ni cambio en producción.");
 }
 if(/\b(esta noche|por la noche|trabajo nocturno)\b/.test(q)&&/\b(planifica|planificar|prepara|organiza|propon|organizar|programa|programar)\b/.test(q)&&/\b(sin ejecutar|sin publicar|sin cambios|solo (?:plan|planifica)|no ejecutes|no publiques)\b/.test(q)){
  return reply("OK","night_plan_only",
   "Plan propuesto para esta noche (sin ejecutar): 1) comprobar los trabajos y resultados con fuente y hora; 2) ordenar los bloqueos y después las tareas seguras; 3) preparar propuestas de cambio con pruebas, coste y rollback; 4) dejar para aprobación las acciones sensibles o con coste. No he programado trabajos, cambiado prioridades ni publicado nada.","NO_EXECUTION_PLAN_V1");
 }
 if(/\b(empresa|company_id|contexto)\b/.test(q)&&/\b(activa|actual|seleccionada|trabajando|estoy|cual|que)\b/.test(q)&&/\b(fenix|aion|captacasa|empresa|contexto)\b/.test(q)){
  return reply("OK","company_scope",
   "Este canal Operativa está autorizado para el contexto de Fénix Capital. El selector no acredita por sí solo acceso multiempresa. AION y CAPTACASA no se deben consultar ni mezclar hasta habilitar y comprobar los permisos por empresa en el servidor.");
 }
 if((/\b(cost[eo]s?|pago|dinero|suscripcion|facturacion|firma|legal|riesgo|permiso|autorizacion)\b/.test(q)&&/\b(que harias|que haces|que pasa|puedes|debes|modificar|sin autorizacion)\b/.test(q))||
    /\b(puedes|podrias)\s+modificar\s+(?:el\s+)?(?:crm|produccion|app)\b/.test(q)){
  return reply("OK","human_exception",
   "Si una petición implica firma, obligación legal, riesgo alto, baja confianza, conflicto de política, seguridad, límite económico o petición expresa de atención humana, debo bloquear la ejecución y pedir la decisión correspondiente. No modifico App/CRM, gasto dinero ni cambio producción solo porque una conversación lo sugiera. Una propuesta no equivale a una acción ejecutada.");
 }
 // Never catch arbitrary domain questions or actions; delegate to verified router.
 return null;
}
