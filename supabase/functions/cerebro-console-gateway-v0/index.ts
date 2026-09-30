import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { queryCerebroKnowledge, type CerebroReadContext } from "./knowledge.ts";
import nacl from "npm:tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  proposal_issued_at: number;
  proposal_token: string;
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

async function proposalHash(action:Omit<PendingAction,"proposal_hash"|"proposal_issued_at"|"proposal_token">){
  return sha256(JSON.stringify({
    action_type:action.action_type,
    engine_id:action.engine_id,
    company_id:action.company_id,
    scope:action.scope,
    summary:action.summary
  }));
}

const SEO001_PREPROD_EXECUTOR="https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-actgw-seo001-preprod";
const PROPOSAL_CONTEXT="CEREBRO_CONSOLE_PROPOSAL_V1";
const PROPOSAL_TTL_SECONDS=1800;
const ACTGW_SIGNING_CONTEXT="CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1";
const ACTGW_KEY_ID="cerebro-actgw-prod-v1";

async function sha256Bytes(value:string){
  return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
}
function b64(bytes:Uint8Array){
  let s="";
  for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s);
}

async function authorizedOwner(req:Request){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const bearer=req.headers.get("authorization")??"";
  if(!U||!A||!S||!bearer.toLowerCase().startsWith("bearer "))return {ok:false,actor:"",role:""};
  const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(bearer.slice(7));
  if(ue||!ud.user)return {ok:false,actor:"",role:""};
  const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:ud.user.id});
  if(ce||!ctx?.ok||!ctx?.actor_code)return {ok:false,actor:"",role:""};
  const role=String(ctx.role??"");
  const actor=String(ctx.actor_code);
  return {ok:actor==="CARLOS-ADMIN",actor,role};
}
async function proposalToken(payload:string){
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!secret)return "";
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret+"|"+PROPOSAL_CONTEXT),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)));
  return b64(sig).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function jwtSubject(req:Request){
  const bearer=req.headers.get("authorization")??"";
  const token=bearer.toLowerCase().startsWith("bearer ")?bearer.slice(7):"";
  try{
    const part=token.split(".")[1];
    if(!part)return "authenticated-owner";
    const normalized=part.replace(/-/g,"+").replace(/_/g,"/");
    const padded=normalized+"=".repeat((4-normalized.length%4)%4);
    const payload=JSON.parse(atob(padded));
    return String(payload?.sub??payload?.email??"authenticated-owner").slice(0,120);
  }catch{return "authenticated-owner";}
}
async function executeSeo001Preprod(req:Request,action:PendingAction){
  const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!serviceRole)return {ok:false,error:"SIGNER_CONFIG_MISSING"};
  const seed=await sha256Bytes(serviceRole+"|"+ACTGW_SIGNING_CONTEXT);
  const kp=nacl.sign.keyPair.fromSeed(seed);
  const body=JSON.stringify({
    action_type:action.action_type,
    engine_id:action.engine_id,
    company_id:action.company_id,
    scope:action.scope,
    summary:action.summary,
    proposal_hash:action.proposal_hash,
    requested_by:jwtSubject(req)
  });
  const timestamp=Math.floor(Date.now()/1000).toString();
  const signature=nacl.sign.detached(new TextEncoder().encode(timestamp+"."+body),kp.secretKey);
  try{
    const res=await fetch(SEO001_PREPROD_EXECUTOR,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-cerebro-actgw-key-id":ACTGW_KEY_ID,
        "x-cerebro-actgw-timestamp":timestamp,
        "x-cerebro-actgw-signature-ed25519":b64(signature)
      },
      body,
      redirect:"manual"
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok||data?.ok!==true)return {ok:false,error:"SEO001_PREPROD_REJECTED",http_status:res.status,detail:data};
    return {ok:true,data};
  }catch(e){
    return {ok:false,error:"SEO001_PREPROD_UNREACHABLE",detail:e instanceof Error?e.message:String(e)};
  }
}

async function executeEmailCommunication(req:Request,action:PendingAction){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const bearer=req.headers.get("authorization")??"";
  if(!U||!A||!bearer.toLowerCase().startsWith("bearer "))return {ok:false,error:"COMMUNICATIONS_AUTH_MISSING"};
  const email=action.scope.recipient_email??"";
  const subject=action.scope.subject??"";
  const bodyText=action.scope.body??"";
  const contactName=action.scope.contact_name??email;
  if(!email||!subject||!bodyText)return {ok:false,error:"EMAIL_SCOPE_INVALID"};
  const headers={"content-type":"application/json",authorization:bearer,apikey:A};
  const prepareKey=`cerebro-email-${action.proposal_hash}-prepare`;
  const sendKey=`cerebro-email-${action.proposal_hash}-send`;
  try{
    const prep=await fetch(`${U}/functions/v1/fenix-communications-gateway/comunicaciones/prepare`,{
      method:"POST",headers,body:JSON.stringify({
        scope_type:"contacto",scope_code:contactName,canal:"Email",recipient_alias:email,
        asunto:subject,cuerpo:bodyText,consentimiento_requerido:false,consentimiento_valido:false,
        no_contactar:false,idempotency_key:prepareKey
      }),cache:"no-store"
    });
    const prepared=await prep.json().catch(()=>null);
    const item=prepared?.item;
    if(!prep.ok||prepared?.ok!==true||!item?.communication_code)return {ok:false,error:"COMMUNICATION_PREPARE_FAILED",http_status:prep.status,detail:prepared};
    const authRes=await fetch(`${U}/functions/v1/fenix-communications-gateway/comunicaciones/${encodeURIComponent(String(item.communication_code))}/authorize`,{
      method:"POST",headers,body:JSON.stringify({expectedVersion:Number(item.version),payload_hash:String(item.payload_hash)}),cache:"no-store"
    });
    const authorized=await authRes.json().catch(()=>null);
    const authItem=authorized?.item;
    if(!authRes.ok||authorized?.ok!==true||!authItem)return {ok:false,error:"COMMUNICATION_AUTHORIZE_FAILED",http_status:authRes.status,detail:authorized};
    const sendRes=await fetch(`${U}/functions/v1/fenix-communications-gateway/comunicaciones/${encodeURIComponent(String(authItem.communication_code))}/send`,{
      method:"POST",headers,body:JSON.stringify({
        expectedVersion:Number(authItem.version),payload_hash:String(authItem.payload_hash),
        idempotency_key:sendKey,mode:"REAL"
      }),cache:"no-store"
    });
    const sent=await sendRes.json().catch(()=>null);
    if(!sendRes.ok||sent?.ok!==true)return {ok:false,error:"COMMUNICATION_SEND_FAILED",http_status:sendRes.status,detail:sent};
    return {ok:true,data:sent};
  }catch(e){
    return {ok:false,error:"COMMUNICATIONS_GATEWAY_UNREACHABLE",detail:e instanceof Error?e.message:String(e)};
  }
}

async function resolveContacts(req:Request,query:string){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,items:[] as any[]};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,items:[] as any[]};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_contact_search_server",{p_actor_code:authz.actor,p_query:query});
  if(error||!data?.ok)return {ok:false,items:[] as any[]};
  return {ok:true,items:Array.isArray(data.items)?data.items:[]};
}

async function buildEmailContactSelection(req:Request,contactQuery:string,subject:string,bodyText:string,candidates:any[]):Promise<PendingAction>{
  const authz=await authorizedOwner(req);
  if(!authz.ok)throw new Error("OWNER_REQUIRED");
  const compact=candidates.slice(0,10).map((x:any)=>({name:String(x.name??""),email:String(x.email??""),source:String(x.source??"")}));
  const base={
    action_id:`EMAIL-CONTACT-${Date.now()}`,
    action_type:"EMAIL_CONTACT_SELECTION",
    engine_id:"COMM-001",
    company_id:"fenix",
    scope:{
      contact_query:contactQuery.trim(),
      subject:subject.trim(),
      body:bodyText.trim(),
      candidates_json:JSON.stringify(compact)
    },
    summary:`Elegir el correo de ${contactQuery.trim()} antes de preparar el envío.`
  };
  const proposal_hash=await proposalHash(base);
  const proposal_issued_at=Math.floor(Date.now()/1000);
  const proposal_token=await proposalToken(JSON.stringify({proposal_hash,proposal_issued_at,actor:authz.actor}));
  return {...base,proposal_hash,proposal_issued_at,proposal_token};
}

async function buildEmailProposal(req:Request,recipientEmail:string,subject:string,bodyText:string,contactName:string):Promise<PendingAction>{
  const authz=await authorizedOwner(req);
  if(!authz.ok)throw new Error("OWNER_REQUIRED");
  const email=recipientEmail.trim().toLowerCase();
  const name=contactName.trim()||email;
  const subj=subject.trim();
  const body=bodyText.trim();
  const summary=`Enviar un email a ${name} <${email}> con asunto «${subj}» y texto exacto: «${body}».`;
  const base={
    action_id:`EMAIL-${Date.now()}`,
    action_type:"EMAIL_SEND",
    engine_id:"COMM-001",
    company_id:"fenix",
    scope:{recipient_email:email,contact_name:name,subject:subj,body},
    summary
  };
  const proposal_hash=await proposalHash(base);
  const proposal_issued_at=Math.floor(Date.now()/1000);
  const proposal_token=await proposalToken(JSON.stringify({proposal_hash,proposal_issued_at,actor:authz.actor}));
  return {...base,proposal_hash,proposal_issued_at,proposal_token};
}


async function buildSeoProposal(req:Request,location:string,coverage:"capital_and_province"|"capital_only"="capital_and_province"):Promise<PendingAction>{
  const authz=await authorizedOwner(req);
  if(!authz.ok)throw new Error("OWNER_REQUIRED");
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
  const proposal_hash=await proposalHash(base);
  const proposal_issued_at=Math.floor(Date.now()/1000);
  const proposal_token=await proposalToken(JSON.stringify({proposal_hash,proposal_issued_at,actor:authz.actor}));
  return {...base,proposal_hash,proposal_issued_at,proposal_token};
}

async function validatePending(req:Request,value:unknown):Promise<PendingAction|null>{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(typeof v.action_id!=="string"||typeof v.action_type!=="string"||typeof v.engine_id!=="string"||
     typeof v.company_id!=="string"||typeof v.summary!=="string"||typeof v.proposal_hash!=="string"||
     typeof v.proposal_issued_at!=="number"||typeof v.proposal_token!=="string"||
     !v.scope||typeof v.scope!=="object"||Array.isArray(v.scope))return null;
  const authz=await authorizedOwner(req);
  if(!authz.ok)return null;
  const now=Math.floor(Date.now()/1000);
  if(v.proposal_issued_at>now+30||now-v.proposal_issued_at>PROPOSAL_TTL_SECONDS)return null;
  const scope:Record<string,string>={};
  for(const [k,val] of Object.entries(v.scope as Record<string,unknown>)){
    if(typeof val!=="string")return null;
    scope[k]=val;
  }
  const candidate={action_id:v.action_id,action_type:v.action_type,engine_id:v.engine_id,company_id:v.company_id,scope,summary:v.summary};
  if(await proposalHash(candidate)!==v.proposal_hash)return null;
  const expected=await proposalToken(JSON.stringify({proposal_hash:v.proposal_hash,proposal_issued_at:v.proposal_issued_at,actor:authz.actor}));
  if(!expected||expected!==v.proposal_token)return null;
  return {...candidate,proposal_hash:v.proposal_hash,proposal_issued_at:v.proposal_issued_at,proposal_token:v.proposal_token};
}

function seoExplanation(action:PendingAction){
  const location=action.scope.location||"la zona indicada";
  const coverage=action.scope.coverage==="capital_only"?"capital":"capital y provincia";
  return `El proceso para ${location} (${coverage}) comprende: investigación y clustering de palabras clave; mapa de ciudades/zonas e intención; arquitectura y contenidos; enlazado interno; SEO local; activos de captación cuando correspondan; controles técnicos/QA; publicación solo mediante los gates autorizados; monitorización, medición y mejora. Si algún paso exige firma, pago, riesgo alto, conflicto de política o un permiso que CEREBRO no tenga, te explicaré exactamente qué falta y te llevaré al enlace o decisión necesaria. ¿Quieres que active este proceso?`;
}

async function chatReply(req:Request,message:string,pendingRaw:unknown,readContextRaw:unknown){
  const text=cleanText(message);
  const readContext=(readContextRaw&&typeof readContextRaw==="object"&&!Array.isArray(readContextRaw))?readContextRaw as CerebroReadContext:null;
  if(!text)return {status:"INVALID",message:"Escribe una consulta.",executed:false};

  const pending=await validatePending(req,pendingRaw);

  if(pending){
    if(pending.action_type==="EMAIL_CONTACT_SELECTION"){
      let candidates:any[]=[];
      try{candidates=JSON.parse(pending.scope.candidates_json||"[]");}catch{}
      const numberMatch=text.match(/^(?:opcion\s*)?(\d{1,2})$/);
      const emailMatchRaw=message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      let selected:any=null;
      if(numberMatch){
        const idx=Number(numberMatch[1])-1;
        if(idx>=0&&idx<candidates.length)selected=candidates[idx];
      }else if(emailMatchRaw){
        selected=candidates.find((x:any)=>String(x.email||"").toLowerCase()===String(emailMatchRaw[0]).toLowerCase())??null;
      }else{
        const choice=text.replace(/^(?:a|para)\s+/,"").trim();
        selected=candidates.find((x:any)=>normalize(String(x.name||""))===choice)??null;
      }
      if(selected?.email){
        const action=await buildEmailProposal(req,String(selected.email),pending.scope.subject||"Fénix Capital",pending.scope.body||"",String(selected.name||pending.scope.contact_query||selected.email));
        return {
          status:"ACTION_PROPOSAL",intent:"email_send",executed:false,action,
          message:`Perfecto. Propuesta exacta de envío:\nDestinatario: ${action.scope.contact_name} <${action.scope.recipient_email}>\nAsunto: ${action.scope.subject}\nTexto: ${action.scope.body}\n\nNo he enviado nada. ¿Confirmas este envío con «sí»?`
        };
      }
      const list=candidates.map((x:any,i:number)=>`${i+1}. ${x.name} <${x.email}>`).join("\n");
      return {
        status:"ACTION_CLARIFICATION_REQUIRED",intent:"email_contact_selection",executed:false,action:pending,
        message:`Estos son los correos encontrados para «${pending.scope.contact_query}»:\n${list}\n\nElige el número, el nombre exacto o el correo que quieres usar.`
      };
    }
    if(/^(si|sí|si adelante|adelante|confirmo|activalo|activarlo|hazlo|procede)$/.test(text)){
      if(pending.action_type==="EMAIL_SEND"&&pending.engine_id==="COMM-001"&&pending.company_id==="fenix"){
        const run=await executeEmailCommunication(req,pending);
        if(run.ok){
          const remote:any=run.data;
          const item=remote?.item??{};
          return {
            status:"ACTION_ACCEPTED",
            intent:"email_send_confirmation",
            executed:true,
            completed:true,
            execution_environment:"PROD",
            result:remote,
            message:`Email enviado a ${pending.scope.contact_name} <${pending.scope.recipient_email}>. Asunto: «${pending.scope.subject}». Evidencia del proveedor registrada${item?.provider_message_id?" con ID de mensaje":""}.`
          };
        }
        return {
          status:"ACTION_CONFIRMED",
          intent:"email_send_confirmation",
          executed:false,
          action:pending,
          reason:run.error,
          detail:run,
          message:"Has confirmado el envío, pero el gateway de comunicaciones no lo ha aceptado. No voy a fingir que se ha enviado; mantengo la propuesta para poder reintentar."
        };
      }
      if(pending.action_type==="SEO_ZONE_ACTIVATION"&&pending.engine_id==="SEO-001"&&pending.company_id==="fenix"){
        const run=await executeSeo001Preprod(req,pending);
        if(run.ok){
          const remote:any=run.data;
          const activation=remote?.activation??{};
          return {
            status:"ACTION_ACCEPTED",
            intent:"action_confirmation",
            executed:true,
            completed:false,
            execution_environment:"PREPROD",
            execution_state:activation?.state??remote?.state??"ACTIVATION_ACCEPTED_PREPROD",
            result:remote,
            message:`Confirmado y registrado en SEO-001 PREPROD: ${pending.summary} CEREBRO ha creado/reutilizado el territorio y su cola de investigación con la fuente oficial de municipios, sin publicar nada en PROD. El proceso continúa por los workers y gates existentes de SEO-001; la publicación seguirá bloqueada hasta superar QA, rollout y CITY COMPLETE V2.`
          };
        }
        return {
          status:"ACTION_CONFIRMED",
          intent:"action_confirmation",
          executed:false,
          action:pending,
          reason:run.error,
          detail:run,
          message:`La propuesta está confirmada, pero el binding SEO-001 PREPROD no ha aceptado la ejecución. No voy a fingir éxito. Mantengo la propuesta exacta para reintentar cuando el transporte vuelva a estar disponible.`
        };
      }
      return {
        status:"ACTION_CONFIRMED",
        intent:"action_confirmation",
        executed:false,
        action:pending,
        reason:"EXECUTOR_NOT_BOUND",
        message:`Confirmado: ${pending.summary} Esta propuesta no tiene todavía un ejecutor real enlazado; no voy a fingir que se ha ejecutado.`
      };
    }
    if(/^(no|cancelar|cancela|dejalo|déjalo)$/.test(text)){
      return {status:"CANCELED",intent:"action_cancel",executed:false,message:"Acción cancelada. No se ha ejecutado ningún cambio."};
    }
    if(/(en que consiste|explica|explicame|que hace|que incluye|proceso entero|detallame)/.test(text)){
      return {status:"ACTION_EXPLANATION",intent:"action_explanation",executed:false,action:pending,message:pending.action_type==="SEO_ZONE_ACTIVATION"?seoExplanation(pending):`${pending.summary} ¿Quieres que active este proceso?`};
    }
    if(pending.action_type==="SEO_ZONE_ACTIVATION" && /(solo .*capital|solo capital|no provincia)/.test(text)){
      const revised=await buildSeoProposal(req,pending.scope.location||"Valencia","capital_only");
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

  if (/(simula|simulacion|simulación|sin ejecutar|no ejecutes|ningun cambio real|ningún cambio real)/.test(text) && /seo/.test(text)) {
    return {
      status:"SIMULATION",
      intent:"seo_zone_simulation",
      executed:false,
      completed:true,
      message:"Simulación únicamente: el proceso incluiría investigación y clustering de palabras clave, mapa territorial e intención, arquitectura y contenidos, enlazado interno, SEO local, activos de captación, controles técnicos y QA, monitorización, medición y mejora. No se crea territorio, no se escribe ninguna cola, no se publica nada y no se ejecuta ningún cambio real."
    };
  }

  const seoZone=text.match(/(?:prepara|activar|activa|inicia|lanza|pon en marcha|haz).*?(?:zona de|seo (?:de|en|para)|en)\s+([a-z0-9 -]{2,60})(?:\s+en\s+seo|\s+para\s+seo|$)/i)
    || text.match(/(?:prepara|activar|activa|inicia|lanza|pon en marcha|haz).*?seo.*?(?:de|en|para)\s+([a-z0-9 -]{2,60})/i);
  if(seoZone){
    const raw=seoZone[1].replace(/\s+(?:en|para)\s+seo.*$/i,"").trim();
    const location=raw.split(/\s+y\s+provincia/)[0].trim();
    const coverage=/(solo .*capital|solo capital|no provincia)/.test(text)?"capital_only":"capital_and_province";
    const action=await buildSeoProposal(req,location||"Valencia",coverage);
    return {status:"ACTION_PROPOSAL",intent:"seo_zone_activation",executed:false,action,message:`${action.summary} ¿Quieres que active exactamente este proceso?`};
  }

  if (/marketing/.test(text) && /(estrategia|canales|organico|organicos|orgánico|orgánicos|priorizando|priorizamos)/.test(text)) {
    return {
      status:"OK",
      intent:"marketing_strategy",
      executed:false,
      message:"La estrategia actual de marketing de Fénix Capital prioriza crecimiento orgánico y reutilización de activos antes de gasto nuevo. Canales prioritarios: SEO, SEO local, contenidos, redes orgánicas, Google Business Profile, B2B con inmobiliarias, CRM/reactivación, referidos y reutilización multicanal. El doble motor comercial es particulares + inmobiliarias, midiendo leads cualificados, expedientes, firmas e ingreso, no métricas de vanidad.",
      sources:[{notion_page_id:"3b481b1a-756d-81ce-bdd3-d28125e964c7",title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"}],
      evidence_mode:"CANONICAL_INDEX_GUARD_V1"
    };
  }

  const contactLookupMatch=text.match(/^(?:busca|buscar|encuentra|dime|localiza).*?(?:correo|email).*?(?:de|para)\s+([a-z0-9 .'-]{2,80})$/i)
    || text.match(/^(?:correo|email).*?(?:de|para)\s+([a-z0-9 .'-]{2,80})$/i);
  if(contactLookupMatch){
    const contactQuery=contactLookupMatch[1].trim();
    const resolved=await resolveContacts(req,contactQuery);
    if(!resolved.ok||resolved.items.length===0){
      return {status:"OK",intent:"email_contact_lookup",executed:false,message:`No he encontrado ningún correo verificado para «${contactQuery}» en las fuentes autorizadas de CEREBRO. No voy a inventarlo.`};
    }
    const list=resolved.items.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name} <${x.email}>`).join("\n");
    return {status:"OK",intent:"email_contact_lookup",executed:false,message:`He encontrado estos correos para «${contactQuery}»:\n${list}`};
  }

  const socialShareCommand=/\b(mandasela|mandaselo|enviasela|enviaselo)\b/.test(text);
  if(socialShareCommand){
    let socialContext=readContext?.kind==="social_schedule"?readContext:null;
    if(!socialContext){
      const recovered:any=await queryCerebroKnowledge(req,"La próxima publicación de Facebook",null);
      socialContext=recovered?.read_context?.kind==="social_schedule"?recovered.read_context:null;
    }
    if(!socialContext){
      return {status:"ACTION_NEEDS_SCOPE",intent:"social_share_email",executed:false,message:"No tengo una publicación social operativa identificada para compartir. Dime qué publicación quieres enviar o vuelve a pedirme la próxima de Facebook."};
    }
    const recipientMatch=message.match(/(?:^|\s)(?:a|para)\s+(.+?)(?=\s+(?:con|y)\s+|$)/iu);
    const contactQuery=(recipientMatch?.[1]??"").trim().replace(/^(?:correo|email)\s+/i,"");
    if(!contactQuery){
      return {status:"ACTION_NEEDS_SCOPE",intent:"social_share_email",executed:false,message:"Dime a qué contacto quieres enviar esta publicación. Buscaré sus correos y te dejaré elegir antes de preparar el envío."};
    }
    const caption=String((socialContext as any).caption||"").trim();
    const when=String(socialContext.scheduled_at||"").trim();
    const media=String(socialContext.public_media_url||socialContext.media_urls?.[0]||"").trim();
    const key=String(socialContext.content_key||"").trim();
    const network=String(socialContext.network||"Facebook");
    const parts=[
      `Próxima publicación de ${network}${key?` · ${key}`:""}`,
      when?`Fecha y hora programadas: ${new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",dateStyle:"full",timeStyle:"short"}).format(new Date(when))}`:"",
      caption?`Texto exacto:\n${caption}`:"",
      media?`Imagen: ${media}`:""
    ].filter(Boolean);
    const bodyText=parts.join("\n\n");
    if(!bodyText){
      return {status:"ACTION_NEEDS_SCOPE",intent:"social_share_email",executed:false,message:"Tengo la referencia de la publicación, pero no suficiente contenido estructurado para preparar el envío. No voy a inventarlo."};
    }
    const resolved=await resolveContacts(req,contactQuery);
    if(!resolved.ok||resolved.items.length===0){
      return {status:"ACTION_NEEDS_SCOPE",intent:"email_contact_lookup",executed:false,message:`No he encontrado ningún correo verificado para «${contactQuery}» en las fuentes autorizadas de CEREBRO. No voy a inventarlo.`};
    }
    const subject=`Próxima publicación de ${network}`;
    const selection=await buildEmailContactSelection(req,contactQuery,subject,bodyText,resolved.items);
    const list=resolved.items.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name} <${x.email}>`).join("\n");
    return {
      status:"ACTION_PROPOSAL",intent:"email_contact_selection",executed:false,action:selection,
      message:`He encontrado estos correos para «${contactQuery}»:\n${list}\n\nElige el número, el nombre exacto o el correo. Prepararé el email con el texto, la fecha, la hora y la imagen de la publicación. Todavía no he enviado nada.`
    };
  }

  if(readContext?.kind==="social_schedule" && /^[\p{L}.-]+(?:\s+[\p{L}.-]+){0,3}$/u.test(message.trim())){
    const contactQuery=message.trim();
    const resolved=await resolveContacts(req,contactQuery);
    if(resolved.ok&&resolved.items.length){
      const caption=String((readContext as any).caption||"").trim();
      const when=String(readContext.scheduled_at||"").trim();
      const media=String(readContext.public_media_url||readContext.media_urls?.[0]||"").trim();
      const key=String(readContext.content_key||"").trim();
      const network=String(readContext.network||"Facebook");
      const parts=[
        `Próxima publicación de ${network}${key?` · ${key}`:""}`,
        when?`Fecha y hora programadas: ${new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",dateStyle:"full",timeStyle:"short"}).format(new Date(when))}`:"",
        caption?`Texto exacto:\n${caption}`:"",
        media?`Imagen: ${media}`:""
      ].filter(Boolean);
      const selection=await buildEmailContactSelection(req,contactQuery,`Próxima publicación de ${network}`,parts.join("\n\n"),resolved.items);
      const list=resolved.items.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name} <${x.email}>`).join("\n");
      return {status:"ACTION_PROPOSAL",intent:"email_contact_selection",executed:false,action:selection,message:`He encontrado estos correos para «${contactQuery}»:\n${list}\n\nElige el número, el nombre exacto o el correo. Todavía no he enviado nada.`};
    }
  }

  const emailMatch=message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const emailIntent=/\b(email|correo)\b/i.test(message)&&(/\b(envia|envía|envies|envíes|enviar|manda|mandar|mandes|prepara|preparar)\b/i.test(message)||/\b(mandaselo|mándaselo|enviaselo|envíaselo)\b/i.test(message));
  if(emailIntent){
    const quoted=[...message.matchAll(/[«“"]([^»”"]+)[»”"]/g)].map(m=>m[1].trim());
    const subjectMatch=message.match(/asunto\s*(?:[:=-]|es)?\s*[«“"]([^»”"]+)[»”"]/i);
    const bodyMatch=message.match(/(?:texto|cuerpo|mensaje|dile|decirle)\s*[:=-]?\s*[«“"]([^»”"]+)[»”"]/i);
    const subject=(subjectMatch?.[1]??quoted[0]??(/prueba/i.test(message)?"Prueba de CEREBRO":"Fénix Capital")).trim();
    let bodyText=(bodyMatch?.[1]??quoted[1]??"").trim();
    if(!bodyText&&readContext?.kind==="social_schedule"){
      const network=String(readContext.network||"Facebook");
      const caption=String((readContext as any).caption||"").trim();
      const when=String(readContext.scheduled_at||"").trim();
      const media=String(readContext.public_media_url||readContext.media_urls?.[0]||"").trim();
      const key=String(readContext.content_key||"").trim();
      const parts=[
        `Próxima publicación de ${network}${key?` · ${key}`:""}`,
        when?`Fecha y hora programadas: ${new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",dateStyle:"full",timeStyle:"short"}).format(new Date(when))}`:"",
        caption?`Texto exacto:\n${caption}`:"",
        media?`Imagen: ${media}`:""
      ].filter(Boolean);
      bodyText=parts.join("\n\n");
    }
    if(!bodyText){
      const freeBody=message.match(/(?:que le digas|que le digan|que le diga|dile|decirle|texto)\s+(.+)$/i);
      bodyText=(freeBody?.[1]??"").trim().replace(/[. ]+$/,"");
    }
    const explicitNameMatch=message.match(/(?:a|para)\s+([A-ZÁÉÍÓÚÑ][\p{L}.-]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}.-]+){0,3})/u);
    const contactQuery=(explicitNameMatch?.[1]??"").replace(/\s+(?:busca|con|en|y)$/i,"").trim();

    if(emailMatch){
      if(!bodyText){
        return {status:"ACTION_NEEDS_SCOPE",intent:"email_send",executed:false,message:`He verificado el destinatario ${emailMatch[0]}. Indícame el texto exacto del correo para poder presentarte una propuesta cerrada antes de enviarlo.`};
      }
      const action=await buildEmailProposal(req,emailMatch[0],subject,bodyText,contactQuery||emailMatch[0]);
      return {status:"ACTION_PROPOSAL",intent:"email_send",executed:false,action,message:`Propuesta exacta de envío:\nDestinatario: ${action.scope.contact_name} <${action.scope.recipient_email}>\nAsunto: ${action.scope.subject}\nTexto: ${action.scope.body}\n\nNo he enviado nada. ¿Confirmas este envío con «sí»?`};
    }

    if(!contactQuery){
      return {status:"ACTION_NEEDS_SCOPE",intent:"email_contact_lookup",executed:false,message:"Dime el nombre del contacto al que quieres escribir. Buscaré los correos disponibles y te los enseñaré para que elijas."};
    }
    const resolved=await resolveContacts(req,contactQuery);
    if(!resolved.ok||resolved.items.length===0){
      return {status:"ACTION_NEEDS_SCOPE",intent:"email_contact_lookup",executed:false,message:`No he encontrado ningún correo verificado para «${contactQuery}» en las fuentes autorizadas de CEREBRO. No voy a inventarlo.`};
    }
    if(!bodyText){
      return {status:"ACTION_NEEDS_SCOPE",intent:"email_send",executed:false,message:`He encontrado ${resolved.items.length} correo(s) para «${contactQuery}», pero necesito el texto exacto que quieres enviar antes de crear la propuesta.`};
    }
    const selection=await buildEmailContactSelection(req,contactQuery,subject,bodyText,resolved.items);
    const list=resolved.items.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name} <${x.email}>`).join("\n");
    return {
      status:"ACTION_PROPOSAL",intent:"email_contact_selection",executed:false,action:selection,
      message:`He encontrado estos correos para «${contactQuery}»:\n${list}\n\nElige el número, el nombre exacto o el correo que quieres usar. Todavía no he enviado nada.`
    };
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

  return await queryCerebroKnowledge(req,message,readContext);
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
    const owner=await authorizedOwner(req);
    if(!owner.ok)return json(req,403,{status:"FORBIDDEN",reason:"OWNER_ONLY",message:"CEREBRO Console está reservada al propietario autorizado."});

    if(req.method==="POST"&&suffix==="chat"){
      let body:unknown;
      try{body=await req.json()}catch{return json(req,400,{status:"INVALID",message:"JSON inválido.",executed:false})}
      const obj=typeof body==="object"&&body!==null?body as Record<string,unknown>:{};
      const message=obj.message;
      if(typeof message!=="string"||message.length>2000)return json(req,400,{status:"INVALID",message:"Mensaje inválido.",executed:false});
      return json(req,200,await chatReply(req,message,obj.pending_action,obj.read_context));
    }

    if(req.method!=="GET")return json(req,405,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});

    if(suffix==="health")return json(req,200,{
      status:"ok",service:"cerebro-console-gateway-v0",environment:"LAB",version:"0.5.3-owner-only-contextual-ops",
      authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,
      chat_available:true,chat_mode:"OWNER_DECISION_BY_EXCEPTION_V1",additional_cost_target_eur:0
    });
    if(suffix==="contract")return json(req,200,CONTRACT);
    if(suffix==="engines")return json(req,200,{engines:ENGINES});

    return json(req,404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE",available:["health","contract","engines","chat"]});
  }),
};
