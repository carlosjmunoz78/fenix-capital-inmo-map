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
/**
 * Real simplification, not a verbatim copy of the prior answer.
 * All capabilities mentioned here must be present in the supplied previous turn.
 * No new tools are invoked and no execution is implied.
 */
function simplifyPreviousAnswer(previous:string):string{
 const plain=String(previous||"").replace(/\s+/g," ").trim();
 const actions=[
  {test:/expedientes activos|expedientes.{0,35}activos/i,phrase:"ver cuántos expedientes están activos"},
  {test:/inmobiliarias por localidad|buscar inmobiliarias/i,phrase:"buscar inmobiliarias por localidad"},
  {test:/trabajos de CEREBRO|trabajos.{0,35}(?:ejecución|cola)/i,phrase:"consultar los trabajos de CEREBRO"},
  {test:/próxima publicación social|publicación social/i,phrase:"revisar la próxima publicación en redes si su fuente está disponible"}
 ].filter(item=>item.test.test(plain)).map(item=>item.phrase);
 if(actions.length>=2&&/\b(?:puedo|ayudarte|consulta|comprobar|buscar)\b/i.test(plain)){
  const tasks=actions.length===1?actions[0]:actions.slice(0,-1).join(", ")+" y "+actions.at(-1);
  const note=/no he ejecutado|no he realizado|no he consultado/i.test(plain)
   ?" Solo te he explicado las opciones; todavía no he hecho ninguna consulta ni cambio.":"";
  return "En resumen: puedo "+tasks+", cuando las fuentes autorizadas estén disponibles."+note;
 }
 // The previous turn may be a factual answer, not a list of capabilities.
 // Preserve its key factual sentence without cutting halfway through a word.
 const first=(plain.match(/[^.!?]+[.!?]?/)||[plain])[0].trim();
 if(first.length<=260)return "Dicho de forma sencilla: "+first;
 const cut=first.slice(0,240);
 const lastWord=cut.lastIndexOf(" ");
 const safeCut=(lastWord>=120?cut.slice(0,lastWord):cut).trim().replace(/[,:;\s]+$/,"");
 return "Resumen parcial de mi respuesta anterior: "+safeCut+"… Si quieres, puedo explicarte una parte concreta.";
}

export function answerCerebroNaturalQuery(message:string,context:SafeTurn[]=[]):Reply|null{
 const q=norm(message);
 if(!q||q.length>2000)return null;
 // Conversation recall uses only bounded, owner-authenticated conversation data.
 if(/(?:cual|que)\s+(?:fue|era|ha sido)\s+(?:mi|la)\s+(?:ultima\s+)?(?:pregunta|mensaje)\s+anterior|(?:recuerdas|repite|dime)\s+(?:mi|la)\s+ultima\s+(?:pregunta|mensaje)/.test(q)){
  const prev=[...context].reverse().find(t=>t.role==="user"&&t.text.trim());
  return reply("OK","previous_question",prev?"Tu última pregunta disponible en esta conversación fue: «"+prev.text.slice(0,450)+"».":"No he recibido una pregunta anterior en el contexto de esta sesión. Si se ha recargado o reiniciado la consola, puede que el historial anterior no se haya transmitido. No voy a inventarlo.","CONVERSATION_CONTEXT_BOUNDED");
 }
 if((/^(?:(?:puedes|podrias|me puedes|me podrias)\s+)?(?:explicame|explicarme|explicar|resume|resumeme|resumir|aclara|aclarame|simplifica|repite|dime)\b/.test(q)&&/\b(anterior|ultima respuesta|lo anterior|eso que has dicho|lo que acabas de decir)\b/.test(q))||/^(?:mas|mucho)\s+(?:simple|sencillo|corto)\s+(?:lo anterior|eso)/.test(q)){
  const prev=[...context].reverse().find(t=>t.role==="cerebro"&&t.text.trim());
  if(!prev)return reply("LOW_CONFIDENCE","explain_previous_missing","No veo una respuesta anterior en el contexto de esta sesión. Indícame el tema y te lo explicaré sin inventar información.","CONVERSATION_CONTEXT_BOUNDED");
  return reply("OK","explain_previous",simplifyPreviousAnswer(prev.text),"CONVERSATION_CONTEXT_BOUNDED");
 }
 if(/\b(aion|captacasa)\b/.test(q)&&/\b(muestrame|mostrar|consulta|consultar|dame|lista|trabajos|expedientes|datos)\b/.test(q))return reply("OK","company_scope","Esta consola todavía no tiene autorización operativa para consultar datos de AION o CAPTACASA. Solo puedo trabajar en el contexto autorizado de Fénix Capital; no voy a mezclar información entre empresas.");
 // These ask ABOUT sources, not for any secret or new privileged access.
 if((/\b(puedes|podrias|tienes|eres capaz|capacidad|consultas|accedes|acceso)\b/.test(q)&&/\b(informacion|fuentes|datos|web|internet|documentos|guardad[oa]s?|tiempo real|en vivo)\b/.test(q))||
    /(?:informacion|datos)\s+real(?:es)?\s+o\s+(?:solo|solamente)/.test(q)){
  return reply("OK","source_capabilities",
   "Puedo consultar algunas fuentes reales autorizadas: por ejemplo, expedientes activos y directorio de inmobiliarias de App Fénix mediante consultas específicas, y programación social cuando su fuente está disponible. También consulto documentación autorizada y memoria conversacional acotada. No es lo mismo: los documentos pueden estar desactualizados, y este Gateway no tiene navegación libre por Internet ni acceso universal a los motores. Si no puedo verificar un dato actual, te lo diré y no inventaré una respuesta.");
 }
 if((/^(?:que|como|dime|sugiere|propon|recomienda)\b/.test(q)&&/\b(puedes|podrias|hacer|ayudarme|ayuda|tareas?|acciones?|cosas?)\b/.test(q)&&/\b(por mi|para mi|util|ahora mismo|fenix|capital|concretas?)\b/.test(q))||
    /\b(?:tres|3|varias|algunas)\s+(?:tareas|cosas|acciones)\s+(?:concretas|utiles|que puedes hacer)/.test(q)){
  return reply("OK","owner_useful_actions",
   "Para Fénix Capital puedo ayudarte ahora con tareas concretas de consulta: 1) comprobar cuántos expedientes activos constan en App Fénix; 2) buscar inmobiliarias por localidad, por ejemplo Córdoba; 3) consultar los trabajos de CEREBRO en ejecución, en cola y su resultado reciente, con la hora de los datos; 4) comprobar una próxima publicación social cuando esa fuente autorizada esté disponible. Puedes empezar con «¿Cuántos expedientes activos hay?» o «¿Qué trabajos de CEREBRO están en cola?». No he ejecutado ninguna consulta ni cambio al darte estas opciones.");
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
