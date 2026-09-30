import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { queryCerebroKnowledge } from "./knowledge.ts";

const ALLOWED_ORIGINS = new Set([
  "https://app.fenixcapital.es",
  "https://www.app.fenixcapital.es",
]);

const ENGINES = [
  { engine_id: "CONSOLE-001", name: "CEREBRO Console", depends_on: ["ACTGW-001"] },
  { engine_id: "CHAT-001", name: "CEREBRO Chat", depends_on: ["CTX-001", "ACTGW-001"] },
  { engine_id: "CTX-001", name: "Context Selector", depends_on: [] },
  { engine_id: "CMD-001", name: "Command Executor", depends_on: ["CTX-001", "ACTGW-001"] },
  { engine_id: "ACTGW-001", name: "CEREBRO Action Gateway", depends_on: ["CTX-001"] },
];

const CONTRACT = {
  environment: "LAB",
  gateway_required: true,
  direct_model_access: false,
  prod_execution_enabled: false,
  supabase_writes: false,
  live_writes: false,
  autonomous_prod: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  required_context: ["company_id", "engine_id", "environment", "version"],
  chat_mode: "OWNER_DECISION_BY_EXCEPTION_V1",
  confirmation_mode: "EXACT_PROPOSAL_SINGLE_EXPLICIT_YES",
};

type PendingAction = {
  action_id: string;
  action_type: string;
  engine_id: string;
  company_id: string;
  scope: Record<string,string>;
  summary: string;
  proposal_hash: string;
};

function cors(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(req.headers.get("origin")) });
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function cleanText(value:string){
  return normalize(value).replace(/^[¿¡?!.]+/g, "").replace(/[?!.]+$/g, "").trim();
}

async function sha256(value:string){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function proposalHash(action:Omit<PendingAction,"proposal_hash">){
  return sha256(JSON.stringify({
    action_type:action.action_type,
    engine_id:action.engine_id,
    company_id:action.company_id,
    scope:action.scope,
    summary:action.summary
  }));
}

async function buildSeoProposal(location:string,coverage:"capital_and_province"|"capital_only"="capital_and_province"):Promise<PendingAction>{
  const normalizedLocation=location.trim().replace(/\s+/g," ");
  const summary=coverage==="capital_only"
    ? `Activar el proceso SEO canónico para ${normalizedLocation} capital.`
    : `Activar el proceso SEO canónico para ${normalizedLocation} y provincia.`;
  const base={
    action_id:`SEO-ZONE-${normalize(normalizedLocation).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-V1`,
    action_type:"SEO_ZONE_ACTIVATION",
    engine_id:"SEO-001",
    company_id:"fenix",
    scope:{location:normalizedLocation,coverage},
    summary
  };
  return {...base,proposal_hash:await proposalHash(base)};
}

async function validatePending(value:unknown):Promise<PendingAction|null>{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(typeof v.action_id!=="string"||typeof v.action_type!=="string"||typeof v.engine_id!=="string"||
     typeof v.company_id!=="string"||typeof v.summary!=="string"||typeof v.proposal_hash!=="string"||
     !v.scope||typeof v.scope!=="object"||Array.isArray(v.scope))return null;
  const scope:Record<string,string>={};
  for(const [k,val] of Object.entries(v.scope as Record<string,unknown>)){
    if(typeof val!=="string")return null;
    scope[k]=val;
  }
  const candidate={action_id:v.action_id,action_type:v.action_type,engine_id:v.engine_id,company_id:v.company_id,scope,summary:v.summary};
  if(await proposalHash(candidate)!==v.proposal_hash)return null;
  return {...candidate,proposal_hash:v.proposal_hash};
}

function seoExplanation(action:PendingAction){
  const location=action.scope.location||"la zona indicada";
  const coverage=action.scope.coverage==="capital_only"?"capital":"capital y provincia";
  return `El proceso para ${location} (${coverage}) comprende: investigación y clustering de palabras clave; mapa de ciudades/zonas e intención; arquitectura y contenidos; enlazado interno; SEO local; activos de captación cuando correspondan; controles técnicos/QA; publicación solo mediante los gates autorizados; monitorización, medición y mejora. Si algún paso exige firma, pago, riesgo alto, conflicto de política o un permiso que CEREBRO no tenga, te explicaré exactamente qué falta y te llevaré al enlace o decisión necesaria. ¿Quieres que active este proceso?`;
}

async function chatReply(req:Request,message:string,pendingRaw:unknown){
  const text=cleanText(message);
  if(!text)return {status:"INVALID",message:"Escribe una consulta.",executed:false};

  const pending=await validatePending(pendingRaw);

  if(pending){
    if(/^(si|sí|si adelante|adelante|confirmo|activalo|activarlo|hazlo|procede)$/.test(text)){
      return {
        status:"ACTION_CONFIRMED",
        intent:"action_confirmation",
        executed:false,
        action:pending,
        reason:"EXECUTOR_NOT_BOUND",
        message:`Confirmado: ${pending.summary} La confirmación ya es válida para esta propuesta exacta. El ejecutor real todavía no está enlazado a esta Console V0, así que no voy a fingir que se ha ejecutado. El siguiente gate técnico es conectar ACTGW/SEO-001 y reanudar desde esta acción confirmada.`
      };
    }
    if(/^(no|cancelar|cancela|dejalo|déjalo)$/.test(text)){
      return {status:"CANCELED",intent:"action_cancel",executed:false,message:"Acción cancelada. No se ha ejecutado ningún cambio."};
    }
    if(/(en que consiste|explica|explicame|que hace|que incluye|proceso entero|detallame)/.test(text)){
      return {status:"ACTION_EXPLANATION",intent:"action_explanation",executed:false,action:pending,message:pending.action_type==="SEO_ZONE_ACTIVATION"?seoExplanation(pending):`${pending.summary} ¿Quieres que active este proceso?`};
    }
    if(pending.action_type==="SEO_ZONE_ACTIVATION" && /(solo .*capital|solo capital|no provincia)/.test(text)){
      const revised=await buildSeoProposal(pending.scope.location||"Valencia","capital_only");
      return {status:"ACTION_PROPOSAL",intent:"action_revision",executed:false,action:revised,message:`Entendido. Nuevo alcance: ${revised.summary} ¿Quieres que active exactamente este proceso?`};
    }
    // Any other content is treated as clarification/revision, never implicit confirmation.
    return {
      status:"ACTION_CLARIFICATION_REQUIRED",
      intent:"action_clarification",
      executed:false,
      action:pending,
      message:`La propuesta pendiente sigue siendo: ${pending.summary} Puedes preguntarme en qué consiste, modificar el alcance, decir «sí» para confirmarla o «no» para cancelarla.`
    };
  }

  if (/^(hola|ayuda|help|que puedes hacer)$/.test(text)) {
    return {status:"OK",intent:"help",executed:false,message:"Puedes consultarme información sin activar cambios. Si pides una acción, te propondré el alcance exacto y solo la ejecutaré después de tu «sí». Si aparece una excepción humana, te explicaré el motivo y la forma exacta de resolverla."};
  }
  if (/^(estado|estado de cerebro|salud|health|conexion|estas conectado|esta conectado|cerebro esta conectado)$/.test(text)) {
    return {status:"OK",intent:"health",executed:false,message:"CEREBRO Gateway está disponible por transporte autenticado. Este canal móvil sigue en LAB y no tiene escrituras PROD directas."};
  }
  if (/^(motores|motor|engines|lista de motores|que motores hay)$/.test(text)) {
    return {status:"OK",intent:"engines",executed:false,message:`Motores de Console V0 disponibles en el contrato: ${ENGINES.map(item=>item.engine_id).join(", ")}.`,available:ENGINES.map(item=>item.engine_id)};
  }
  if (/^(contrato|seguridad|policy|politica|permisos|contrato de seguridad|politica de seguridad)$/.test(text)) {
    return {status:"OK",intent:"contract",executed:false,message:"Contrato móvil V1: lectura sin confirmación dentro de conocimiento autorizado; acciones mediante propuesta exacta + un «sí»; HUMAN_REQUIRED se explica y se resuelve con decisión/enlace cuando exista; acceso directo a modelos y escrituras PROD siguen bloqueados en esta superficie."};
  }

  const seoZone=text.match(/(?:prepara|activar|activa|inicia|lanza|pon en marcha|haz).*?(?:zona de|seo (?:de|en|para)|en)\s+([a-z0-9 -]{2,60})(?:\s+en\s+seo|\s+para\s+seo|$)/i)
    || text.match(/(?:prepara|activar|activa|inicia|lanza|pon en marcha|haz).*?seo.*?(?:de|en|para)\s+([a-z0-9 -]{2,60})/i);
  if(seoZone){
    const raw=seoZone[1].replace(/\s+(?:en|para)\s+seo.*$/i,"").trim();
    const location=raw.split(/\s+y\s+provincia/)[0].trim();
    const coverage=/(solo .*capital|solo capital|no provincia)/.test(text)?"capital_only":"capital_and_province";
    const action=await buildSeoProposal(location||"Valencia",coverage);
    return {status:"ACTION_PROPOSAL",intent:"seo_zone_activation",executed:false,action,message:`${action.summary} ¿Quieres que active exactamente este proceso?`};
  }

  const looksLikeAction=/\b(prepara|activa|activar|crea|publica|lanza|ejecuta|inicia|configura|modifica|borra|envia|envía|paga|firma)\b/.test(text);
  if(looksLikeAction){
    return {
      status:"ACTION_NEEDS_SCOPE",
      intent:"action",
      executed:false,
      message:"He detectado una petición de acción, pero aún no tengo suficiente estructura para convertirla en una propuesta exacta sin arriesgarme a interpretar mal el alcance. Te pediré solo el dato mínimo necesario antes de presentar la confirmación."
    };
  }

  return await queryCerebroKnowledge(req,message);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    const origin=req.headers.get("origin");

    if(req.method==="OPTIONS"){
      if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
      return new Response(null,{status:204,headers:{
        "access-control-allow-origin":origin,
        "access-control-allow-methods":"GET,POST,OPTIONS",
        "access-control-allow-headers":"authorization,apikey,content-type",
        "access-control-max-age":"600",
        "vary":"origin"
      }});
    }

    const suffix=new URL(req.url).pathname.split("/").filter(Boolean).pop()??"";

    if(req.method==="POST"&&suffix==="chat"){
      let body:unknown;
      try{body=await req.json()}catch{return json(req,400,{status:"INVALID",message:"JSON inválido.",executed:false})}
      const obj=typeof body==="object"&&body!==null?body as Record<string,unknown>:{};
      const message=obj.message;
      if(typeof message!=="string"||message.length>2000)return json(req,400,{status:"INVALID",message:"Mensaje inválido.",executed:false});
      return json(req,200,await chatReply(req,message,obj.pending_action));
    }

    if(req.method!=="GET")return json(req,405,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});

    if(suffix==="health")return json(req,200,{
      status:"ok",service:"cerebro-console-gateway-v0",environment:"LAB",version:"0.4.0-owner-decision-knowledge",
      authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,
      chat_available:true,chat_mode:"OWNER_DECISION_BY_EXCEPTION_V1",additional_cost_target_eur:0
    });
    if(suffix==="contract")return json(req,200,CONTRACT);
    if(suffix==="engines")return json(req,200,{engines:ENGINES});

    return json(req,404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE",available:["health","contract","engines","chat"]});
  }),
};
