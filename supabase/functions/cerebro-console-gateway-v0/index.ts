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
  preference_writes: "EXPLICIT_USER_ONLY",
  durable_learning_mode: "STRUCTURED_CONVERSATIONAL_MEMORY_V2",
  conversation_memory: "AUTO_BOUNDED_NON_SENSITIVE_STRUCTURED",
  conversational_context: "LAST_10_BOUNDED_TURNS",
  follow_up_resolution: "DETERMINISTIC_DOMAIN_AND_NUMBERED_ITEM_V1",
  contradiction_handling: "EXPLICIT_SUPERSESSION_V1",
  internal_learning_writes: "SERVICE_ROLE_BOUNDED",
};

type LearningCandidate = {
  category:"voice_style"|"wording"|"pronunciation"|"response_length"|"interaction_preference"|"workflow_preference"|"business_preference";
  preference_key:string;
  value:string;
  label:string;
};

const DEFAULT_PREFERENCES:Record<string,string>={
  tone:"warm_close_caring",
  response_length:"concise",
  speech_rate:"1.08",
  speech_pitch:"1.04"
};

const LEARNING_CATEGORIES=new Set([
  "voice_style","wording","pronunciation","response_length",
  "interaction_preference","workflow_preference","business_preference"
]);

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

type ConversationTurn={role:"user"|"cerebro";text:string};

function validateConversationContext(value:unknown):ConversationTurn[]{
  if(!Array.isArray(value))return [];
  const out:ConversationTurn[]=[];
  let total=0;
  for(const item of value.slice(-10)){
    if(!item||typeof item!=="object"||Array.isArray(item))continue;
    const role=String((item as Record<string,unknown>).role??"");
    const text=String((item as Record<string,unknown>).text??"").trim().slice(0,1200);
    if((role!=="user"&&role!=="cerebro")||!text)continue;
    if(total+text.length>8000)break;
    total+=text.length;
    out.push({role:role as "user"|"cerebro",text});
  }
  return out;
}

function contextTopic(context:ConversationTurn[]){
  const recent=context.slice(-8).map(turn=>normalize(turn.text)).join(" ");
  const domains=[
    ["legal inmobiliario",/\b(legal|juridic|arras|compraventa|registro de la propiedad|cargas?|notari|herencia|donacion|itp|plusvalia|catastro|embargo|titularidad|urbanismo|blanqueo|aml)\b/],
    ["financiación hipotecaria",/\b(hipoteca|financi|banco|tin|tae|fein|tasacion|endeudamiento)\b/],
    ["SEO",/\b(seo|keyword|palabra clave|indexacion|search console|gsc|enlazado|landing)\b/],
    ["marketing",/\b(marketing|embudo|captacion|campana|campaña|conversion)\b/],
    ["redes sociales",/\b(redes|facebook|instagram|linkedin|buffer|publicacion social)\b/],
    ["newsletter",/\b(newsletter|brevo|campana de correo|campaña de correo)\b/],
    ["arquitectura de CEREBRO",/\b(supabase|gateway|console|runtime|worker|arquitectura|motor)\b/],
    ["multiempresa",/\b(multiempresa|nueva empresa|onboarding de empresa|company registry)\b/],
    ["Trading LAB",/\b(trading|watchdog|circuit breaker|kill switch)\b/]
  ] as const;
  for(const [label,pattern] of domains)if(pattern.test(recent))return label;
  return null;
}

function spokenNumber(value:string){
  if(/^\d{1,2}$/.test(value))return Number(value);
  const map:Record<string,number>={
    uno:1,una:1,primero:1,primer:1,
    dos:2,segundo:2,
    tres:3,tercero:3,
    cuatro:4,cuarto:4,
    cinco:5,quinto:5,
    seis:6,sexto:6,
    siete:7,septimo:7,
    ocho:8,octavo:8,
    nueve:9,noveno:9,
    diez:10,decimo:10
  };
  return map[value]??null;
}

function numberedContextItem(context:ConversationTurn[],number:number){
  for(const turn of [...context].reverse()){
    if(turn.role!=="cerebro")continue;
    const match=turn.text.match(new RegExp("(?:^|\\s)"+number+"[.)]\\s+([\\s\\S]*?)(?=(?:\\s+\\d{1,2}[.)]\\s+)|$)","i"));
    if(match?.[1])return match[1].trim().slice(0,700);
  }
  return "";
}

function recentSocialScheduleNetwork(context:ConversationTurn[]){
  for(const turn of [...context].reverse()){
    const normalized=normalize(turn.text);
    if(!/proxima publicacion|siguiente publicacion/.test(normalized))continue;
    const network=["linkedin","facebook","instagram","tiktok","youtube"].find(item=>new RegExp("\\b"+item+"\\b").test(normalized));
    if(network)return network==="linkedin"?"LinkedIn":network[0].toUpperCase()+network.slice(1);
  }
  return "";
}

function contextualizeMessage(message:string,context:ConversationTurn[]){
  const raw=message.trim();
  const text=cleanText(raw);
  if(!context.length)return {question:raw,applied:false,topic:null as string|null};

  const point=text.match(/^(?:(?:hablame|explicame|dime|cuentame)\s+(?:del?\s+)?)?(?:y\s+)?(?:el\s+)?(?:punto|numero)\s+(\d{1,2}|uno|una|primero|primer|dos|segundo|tres|tercero|cuatro|cuarto|cinco|quinto|seis|sexto|siete|septimo|ocho|octavo|nueve|noveno|diez|decimo)(?:\s+|$)/);
  if(point){
    const number=spokenNumber(point[1]);
    const item=number===null?"":numberedContextItem(context,number);
    if(item)return {question:`Sobre «${item}»: ${raw}`,applied:true,topic:item};
  }

  const shortSocialFollowup=/^(dame la|damela|quiero verla|muestramela|ensenamela)$/.test(text);
  if(shortSocialFollowup){
    const network=recentSocialScheduleNetwork(context);
    if(network)return {question:`Dame la próxima publicación de ${network} completa`,applied:true,topic:"redes sociales"};
  }

  const topic=contextTopic(context);
  const explicitDomain=/\b(legal|juridic|hipoteca|financi|seo|marketing|facebook|instagram|linkedin|newsletter|supabase|gateway|trading|multiempresa)\b/.test(text);
  const followUp=/^(y\b|eso\b|esa\b|ese\b|esto\b|lo anterior\b|la parte\b|sobre eso\b|fiscalmente\b|registralmente\b|notarialmente\b|y si\b|que pasa si\b|como seria\b|explicame ese\b)/.test(text);
  const shortAnswer=text.length<=48&&!/^(hola|buenas|si|no|vale|ok|gracias|procede|continua)$/.test(text);
  if(topic&&!explicitDomain&&(followUp||shortAnswer)){
    return {question:`En el contexto de ${topic}: ${raw}`,applied:true,topic};
  }
  return {question:raw,applied:false,topic};
}

function previousUserTurn(context:ConversationTurn[]){
  return [...context].reverse().find(turn=>turn.role==="user")?.text.trim()??"";
}

function closeOwnerGreeting(context:ConversationTurn[]=[]){
  const variants=[
    "Hola Carlos. ¿Qué tal guapo? Dime, ¿qué hacemos?",
    "¡Buenas Carlos! Aquí estoy guapo. ¿Qué necesitas?",
    "Hola guapo. Dime Carlos, ¿por dónde empezamos?",
    "¡Muy buenas Carlos! ¿Cómo va guapo? Cuéntame.",
    "Ey Carlos. ¿Qué tal guapo? Estoy aquí. ¿Qué vemos?",
    "Hola Carlos guapo. Dime qué tienes entre manos.",
    "Buenas guapo. Cuéntame, ¿qué miramos hoy?",
    "Hola Carlos. Aquí estoy. ¿Por dónde tiramos?",
    "Muy buenas guapo. Dime qué necesitas y vamos a ello.",
    "Ey Carlos. Te escucho. ¿Qué quieres revisar?"
  ];
  const priorGreetings=context.filter(turn=>turn.role==="cerebro"&&/(hola carlos|hola guapo|buenas carlos|buenas guapo|ey carlos|muy buenas)/i.test(turn.text)).length;
  const slot=(Math.floor(Date.now()/1000)+priorGreetings)%variants.length;
  return variants[slot];
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

async function liveExpedientesSummary(req:Request){
  const authz=await authorizedOwner(req);
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!authz.ok||!U||!S)return {ok:false,error:"OWNER_OR_SERVER_CONFIG_MISSING"} as const;
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_exp_list_server",{p_actor_code:authz.actor});
  if(error||data?.ok!==true||!Array.isArray(data.items))return {ok:false,error:"EXPEDIENTES_READ_FAILED"} as const;
  const active=data.items.filter((item:any)=>item?.is_active===true);
  const stages=new Map<string,number>();
  for(const item of active){
    const stage=String(item?.stage??"Sin etapa");
    stages.set(stage,(stages.get(stage)??0)+1);
  }
  const breakdown=[...stages.entries()].sort((a,b)=>a[0].localeCompare(b[0],"es")).map(([stage,count])=>`${stage}: ${count}`);
  return {ok:true,total:active.length,breakdown,source_count:data.items.length} as const;
}

async function liveInmobiliariasByLocality(req:Request,locality:string){
  const authz=await authorizedOwner(req);
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!authz.ok||!U||!S)return {ok:false,error:"OWNER_OR_SERVER_CONFIG_MISSING",items:[]} as const;
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_inmo_list_server",{p_actor_code:authz.actor});
  if(error||data?.ok!==true||!Array.isArray(data.items))return {ok:false,error:"INMOBILIARIAS_READ_FAILED",items:[]} as const;
  const target=normalize(locality);
  const items=data.items.filter((item:any)=>normalize(String(item?.localidad??""))===target);
  return {ok:true,items} as const;
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

function validateLearningCandidate(value:unknown):LearningCandidate|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  const category=String(v.category??"");
  const preference_key=String(v.preference_key??"");
  const val=String(v.value??"");
  const label=String(v.label??"");
  if(!LEARNING_CATEGORIES.has(category))return null;
  if(!/^[a-z0-9_]{2,80}$/.test(preference_key))return null;
  if(!val||val.length>500||!label||label.length>240)return null;
  return {category:category as LearningCandidate["category"],preference_key,value:val,label};
}

function parseLearningCandidate(message:string):LearningCandidate|null{
  const text=cleanText(message);
  if(/(mas cercana|más cercana|cariñosa|carinosa|mas calida|más cálida|más calida|calida|cálida|mas humana|más humana)/.test(text)){
    return {category:"voice_style",preference_key:"tone",value:"warm_close_caring",label:"hablar de forma cercana, cariñosa, natural y profesional"};
  }
  if(/(menos explicaciones|mas breve|más breve|respuestas? mas cortas|respuestas? más cortas|ve al grano|mas directa|más directa)/.test(text)){
    return {category:"response_length",preference_key:"response_length",value:"concise",label:"dar respuestas habladas breves y directas por defecto"};
  }
  if(/(mas despacio|más despacio|habla despacio|no (me )?hables? tan rapido|no (me )?hables? tan rápido|baja .*velocidad)/.test(text)){
    return {category:"voice_style",preference_key:"speech_rate",value:"0.90",label:"hablar un poco más despacio"};
  }
  if(/(mas rapido|más rápido|más rapida|más rápida|habla rapido|habla rápido|sube .*velocidad)/.test(text)){
    return {category:"voice_style",preference_key:"speech_rate",value:"1.08",label:"hablar un poco más rápido"};
  }
  if(/(mas profesional|más profesional|menos cariñosa|menos carinosa|tono mas serio|tono más serio)/.test(text)){
    return {category:"voice_style",preference_key:"tone",value:"professional_warm",label:"usar un tono profesional, cálido y menos cariñoso"};
  }
  const preferred=message.match(/(?:llamame|llámame|quiero que me llames)\s+([\p{L} .'-]{1,40})/iu);
  if(preferred){
    const value=preferred[1].trim().replace(/[.?!]+$/,"");
    if(value)return {category:"wording",preference_key:"preferred_address",value,label:`llamarte «${value}»`};
  }
  const avoid=message.match(/(?:no me llames|deja de llamarme)\s+([\p{L} .'-]{1,40})/iu);
  if(avoid){
    const value=avoid[1].trim().replace(/[.?!]+$/,"");
    if(value)return {category:"wording",preference_key:"avoid_address",value,label:`no llamarte «${value}»`};
  }
  if(/(primero.*verde.*rojo|verde o rojo primero|rojo o verde primero)/.test(text)){
    return {category:"interaction_preference",preference_key:"status_first",value:"true",label:"dar primero el estado verde/rojo antes del detalle"};
  }
  return null;
}

function preferencesMap(items:any[]){
  const result:Record<string,string>={...DEFAULT_PREFERENCES};
  for(const item of items){
    const key=String(item?.preference_key??"");
    const value=String(item?.value??"");
    if(/^[a-z0-9_]{2,80}$/.test(key)&&value&&value.length<=500)result[key]=value;
  }
  return result;
}

async function loadPreferences(req:Request){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,preferences:{...DEFAULT_PREFERENCES},items:[] as any[]};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,preferences:{...DEFAULT_PREFERENCES},items:[] as any[]};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_preferences_list_server",{p_actor_code:authz.actor,p_company_id:"fenix"});
  const items=!error&&data?.ok&&Array.isArray(data.items)?data.items:[];
  return {ok:!error&&data?.ok===true,preferences:preferencesMap(items),items};
}

async function savePreference(req:Request,candidate:LearningCandidate){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,error:"PREFERENCE_CONFIG_MISSING"};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,error:"OWNER_REQUIRED"};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_preference_upsert_server",{
    p_actor_code:authz.actor,
    p_company_id:"fenix",
    p_scope:"USER",
    p_category:candidate.category,
    p_preference_key:candidate.preference_key,
    p_value_text:candidate.value
  });
  if(error||data?.ok!==true)return {ok:false,error:error?.message??data?.error??"PREFERENCE_WRITE_FAILED"};
  return {ok:true,data};
}

async function deactivatePreference(req:Request,key:string){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,error:"PREFERENCE_CONFIG_MISSING"};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,error:"OWNER_REQUIRED"};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_preference_deactivate_server",{
    p_actor_code:authz.actor,p_company_id:"fenix",p_scope:"USER",p_preference_key:key
  });
  if(error||data?.ok!==true)return {ok:false,error:error?.message??data?.error??"PREFERENCE_DEACTIVATE_FAILED"};
  return {ok:true,data};
}

const MEMORY_SKIP_EXACT=new Set([
  "ok","vale","si","sí","no","procede","continua","continúa","dale","perfecto","gracias",
  "adelante","confirmo","hazlo","activalo","actívalo","cancelar","cancela"
]);

function conversationMemoryKind(message:string){
  const text=cleanText(message);
  if(/(eso ya no es asi|esto ya no es asi|ya no es asi|corrige|correccion|corrección|hemos cambiado|cambiamos ahora)/.test(text))return "CORRECTION";
  if(/(prefiero|me gusta que|quiero que me|no quiero que me|a partir de ahora.*(?:habla|dime|llamame|llámame|responde))/i.test(message))return "PREFERENCE";
  if(/(he decidido|hemos decidido|queda decidido|decidimos|vamos a hacer|quiero que hagamos)/.test(text))return "DECISION";
  if(/(en fenix|en fénix|nuestro proceso|nuestra forma|internamente).*(hacemos|usamos|trabajamos|gestionamos|debe|tiene que)/i.test(message))return "OPERATIONAL_KNOWLEDGE";
  if(/^(recuerda que|ten en cuenta que|quiero que recuerdes que)\b/.test(text))return "FACT";
  if(/(tenemos|usamos|trabajamos|nuestro|nuestra|son dos|es el|es la|debe ser|tiene que ser)/.test(text))return "FACT";
  return "USER_TURN";
}

function memorySensitive(message:string){
  const raw=message.trim();
  const low=normalize(raw);
  if(/\b(password|contraseña|contrasena|access[_ -]?token|refresh[_ -]?token|service[_ -]?role|api[_ -]?key|secret|secreto|jwt|private[_ -]?key|clave privada)\b/.test(low))return true;
  if(/\b(?:dni|nie|iban|cuenta bancaria|numero de tarjeta|número de tarjeta|cvv|pin)\b/.test(low))return true;
  if(/\b(?:diagnostico|diagnóstico|medicacion|medicación|historial medico|historial médico)\b/.test(low))return true;
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw))return true;
  if(/\bES\d{22}\b/i.test(raw))return true;
  if(/\b[XYZ]?\d{7,8}[A-Z]\b/i.test(raw))return true;
  if(/\b(?:\+34[ .-]?)?[6789](?:[ .-]?\d){8}\b/.test(raw))return true;
  if(/\b(?:\d[ -]?){13,19}\b/.test(raw))return true;
  if(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(raw))return true;
  return false;
}

function looksLikeQuestionOrRequest(message:string){
  const text=cleanText(message);
  if(/[?¿]/.test(message))return true;
  return /^(que|qué|cual|cuál|cuales|cuáles|como|cómo|cuando|cuándo|donde|dónde|quien|quién|cuanto|cuánto|cuantos|cuántos|dime|hablame|háblame|explicame|explícame|cuentame|cuéntame|busca|encuentra|localiza|ensename|enséñame|muestrame|muéstrame|quiero saber|necesito saber|puedes decirme|sabes de|sabes si)\b/.test(text);
}

function shouldObserveConversationMemory(message:string){
  const text=message.trim();
  if(text.length<10||text.length>2000)return false;
  if(MEMORY_SKIP_EXACT.has(cleanText(text)))return false;
  if(memorySensitive(text))return false;
  if(/^(olvida|borra|elimina)\b/i.test(text))return false;
  if(/\b(recuerdas|te acuerdas|que te dije|qué te dije|que te comente|qué te comenté|conversacion anterior|conversación anterior)\b/i.test(text))return false;
  if(looksLikeQuestionOrRequest(text))return false;
  return conversationMemoryKind(text)!=="USER_TURN";
}

function memorySubjectKey(message:string,context:ConversationTurn[]){
  const topic=contextTopic(context);
  if(topic)return normalize(topic).replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,160);
  const stop=new Set(["para","como","esto","esta","este","estas","estos","quiero","tenemos","usamos","nuestro","nuestra","debe","tiene","hacer","ahora","desde","sobre","porque","pero"]);
  const words=normalize(message).replace(/[^a-z0-9ñ ]/g," ").split(/\s+/).filter(word=>word.length>=4&&!stop.has(word)).slice(0,5);
  return words.length?words.join("_").slice(0,160):null;
}

function explicitSupersession(message:string){
  const text=cleanText(message);
  return /(eso ya no es asi|esto ya no es asi|ya no es asi|corrige eso|hemos cambiado|cambiamos ahora|sustituye lo anterior)/.test(text);
}

async function supersedeConversationMemory(req:Request,query:string,replacementId:string){
  if(!query||!replacementId)return {ok:true,superseded:0};
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,error:"MEMORY_CONFIG_MISSING"};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,error:"OWNER_REQUIRED"};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_memory_supersede_server",{
    p_actor_code:authz.actor,p_company_id:"fenix",p_query:query,p_superseded_by:replacementId
  });
  if(error||data?.ok!==true)return {ok:false,error:error?.message??data?.error??"MEMORY_SUPERSEDE_FAILED"};
  return {ok:true,superseded:Number(data.superseded??0)};
}

async function observeConversationMemory(req:Request,message:string,context:ConversationTurn[]=[]){
  if(!shouldObserveConversationMemory(message))return {ok:true,stored:false,reason:"SKIPPED"};
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,stored:false,error:"MEMORY_CONFIG_MISSING"};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,stored:false,error:"OWNER_REQUIRED"};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const content=message.trim();
  const hash=await sha256([authz.actor,"fenix","CONSOLE-001","PROD","v2",content].join("|"));
  const {data,error}=await svc.rpc("fenix_prod_cerebro_memory_observe_v2_server",{
    p_actor_code:authz.actor,
    p_company_id:"fenix",
    p_engine_id:"CONSOLE-001",
    p_environment:"PROD",
    p_version:"v2",
    p_memory_kind:conversationMemoryKind(content),
    p_content_text:content,
    p_content_hash:hash,
    p_subject_key:memorySubjectKey(content,context)
  });
  if(error||data?.ok!==true)return {ok:false,stored:false,error:error?.message??data?.error??"MEMORY_WRITE_FAILED"};
  const item=data.item??{};
  let superseded=0;
  if(explicitSupersession(content)){
    const previous=previousUserTurn(context);
    if(previous){
      const changed=await supersedeConversationMemory(req,previous,String(item.memory_id??""));
      if(changed.ok)superseded=Number(changed.superseded??0);
    }
  }
  return {ok:true,stored:true,item,superseded};
}

async function forgetConversationMemory(req:Request,query:string){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!U||!S)return {ok:false,error:"MEMORY_CONFIG_MISSING"};
  const authz=await authorizedOwner(req);
  if(!authz.ok)return {ok:false,error:"OWNER_REQUIRED"};
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_memory_forget_server",{
    p_actor_code:authz.actor,p_company_id:"fenix",p_query:query
  });
  if(error||data?.ok!==true)return {ok:false,error:error?.message??data?.error??"MEMORY_FORGET_FAILED"};
  return {ok:true,deactivated:Number(data.deactivated??0)};
}

async function maybeHandleConversationMemoryControl(req:Request,message:string){
  const match=message.trim().match(/^(?:olvida|borra|elimina)\s+(?:lo que te dije sobre\s+|lo de\s+|mis conversaciones sobre\s+)(.{2,500})$/iu);
  if(!match)return null;
  const topic=match[1].trim();
  const result=await forgetConversationMemory(req,topic);
  if(!result.ok)return {status:"ERROR",intent:"conversation_memory_forget",executed:false,reason:result.error,message:"No he podido actualizar la memoria conversacional. No voy a fingir que se ha borrado."};
  return {
    status:"MEMORY_FORGOTTEN",
    intent:"conversation_memory_forget",
    executed:true,
    message:result.deactivated>0
      ?`He desactivado ${result.deactivated} recuerdo(s) conversacionales relacionados con «${topic}».`
      :`No había recuerdos conversacionales activos que coincidieran con «${topic}».`
  };
}

async function maybeHandleLearning(req:Request,message:string,learningRaw:unknown){
  const text=cleanText(message);
  const supplied=validateLearningCandidate(learningRaw);
  const parsed=parseLearningCandidate(message);
  const persistOnly=/^(guardalo|guárdalo|recuerdalo|recuérdalo|recuerda eso|recuerda esto|guarda eso|guarda esto|que quede guardado)$/.test(text);
  const directPersist=Boolean(parsed)||/(a partir de ahora|recuerda que|guarda que|quiero que recuerdes|quiero que lo guardes)/.test(text);
  const forget=/(^olvida|^borra|^elimina|^quita|ya no quiero que)/.test(text);

  if(forget){
    const target=parsed??supplied;
    if(!target)return null;
    const dropped=await deactivatePreference(req,target.preference_key);
    if(!dropped.ok)return {status:"ERROR",intent:"preference_forget",executed:false,reason:dropped.error,message:"No he podido actualizar esa preferencia. No voy a fingir que la he olvidado.",learning_candidate:supplied};
    const current=await loadPreferences(req);
    return {status:"PREFERENCE_FORGOTTEN",intent:"preference_forget",executed:true,message:`Vale. He dejado de guardar la preferencia de ${target.label}.`,learning_candidate:null,preferences:current.preferences};
  }

  if(persistOnly){
    if(!supplied)return {status:"PREFERENCE_NEEDS_SCOPE",intent:"preference_save",executed:false,message:"No tengo una corrección concreta pendiente para guardar. Dímela y la aplico.",learning_candidate:null};
    const saved=await savePreference(req,supplied);
    if(!saved.ok)return {status:"ERROR",intent:"preference_save",executed:false,reason:saved.error,message:"He aplicado la corrección en esta conversación, pero no he podido guardarla para futuras conversaciones.",learning_candidate:supplied};
    const current=await loadPreferences(req);
    return {status:"PREFERENCE_SAVED",intent:"preference_save",executed:true,message:"Vale, guardado. Lo mantendré en las próximas conversaciones.",learning_candidate:null,preferences:current.preferences};
  }

  if(parsed){
    if(directPersist){
      const saved=await savePreference(req,parsed);
      if(!saved.ok)return {status:"ERROR",intent:"preference_save",executed:false,reason:saved.error,message:"He entendido la corrección, pero no he podido guardarla todavía.",learning_candidate:parsed};
      const current=await loadPreferences(req);
      return {status:"PREFERENCE_SAVED",intent:"preference_save",executed:true,message:`Vale, guardado: ${parsed.label}.`,learning_candidate:null,preferences:current.preferences};
    }
    const current=await loadPreferences(req);
    return {
      status:"PREFERENCE_APPLIED_SESSION",
      intent:"preference_correction",
      executed:false,
      message:`Vale, lo aplico desde ahora: ${parsed.label}. Si quieres que quede para próximas conversaciones, dime «guárdalo».`,
      learning_candidate:parsed,
      preferences:{...current.preferences,[parsed.preference_key]:parsed.value}
    };
  }
  return null;
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

async function chatReply(req:Request,message:string,pendingRaw:unknown,readContextRaw:unknown,learningRaw:unknown,conversationRaw:unknown){
  const text=cleanText(message);
  const readContext=(readContextRaw&&typeof readContextRaw==="object"&&!Array.isArray(readContextRaw))?readContextRaw as CerebroReadContext:null;
  const conversationContext=validateConversationContext(conversationRaw);
  const resolved=contextualizeMessage(message,conversationContext);
  if(!text)return {status:"INVALID",message:"Escribe una consulta.",executed:false};

  const memoryControl=await maybeHandleConversationMemoryControl(req,message);
  if(memoryControl)return memoryControl;

  // Conversational learning is additive and non-blocking: a memory write failure must not break chat.
  await observeConversationMemory(req,message,conversationContext).catch(()=>({ok:false,stored:false,error:"MEMORY_WRITE_FAILED"}));

  const learning=await maybeHandleLearning(req,message,learningRaw);
  if(learning)return learning;

  if(/\b(cuantos|numero|total)\b.*\bexpedientes?\b.*\b(activos?|abiertos?|en curso)\b|\bexpedientes?\b.*\b(activos?|abiertos?|en curso)\b/.test(text)){
    const summary=await liveExpedientesSummary(req);
    if(!summary.ok)return {status:"ERROR",intent:"expedientes_active_summary",executed:false,reason:summary.error,message:"No he podido leer ahora mismo el estado vivo de los expedientes. No voy a sustituirlo por conocimiento documental."};
    return {
      status:"OK",
      intent:"expedientes_active_summary",
      executed:false,
      message:`Ahora mismo hay ${summary.total} expedientes activos en App Fénix.${summary.breakdown.length?" Por etapa: "+summary.breakdown.join(", ")+".":""}`,
      source:{system:"APP_FENIX_PROD",rpc:"fenix_prod_exp_list_server",active_contract:"fenix_prod_expediente_is_active"}
    };
  }

  const inmoLocality=text.match(/(?:que\s+)?inmobiliarias?(?:\s+tenemos|\s+hay|\s+conoces)?\s+en\s+([a-záéíóúñ -]{2,60})$/i);
  if(inmoLocality){
    const locality=inmoLocality[1].trim();
    const live=await liveInmobiliariasByLocality(req,locality);
    if(!live.ok)return {status:"ERROR",intent:"inmobiliarias_by_locality",executed:false,reason:live.error,message:"No he podido consultar ahora mismo el directorio vivo de inmobiliarias. No voy a sustituirlo por resultados documentales aproximados."};
    if(!live.items.length)return {status:"OK",intent:"inmobiliarias_by_locality",executed:false,message:`No tengo ninguna inmobiliaria activa en App Fénix cuya localidad sea exactamente «${locality}». Si quieres, puedo buscar una variante del nombre o revisar otra zona.`,source:{system:"APP_FENIX_PROD",rpc:"fenix_prod_inmo_list_server"}};
    const names=live.items.slice(0,20).map((item:any)=>String(item?.nombre_alias??item?.nombre??"").trim()).filter(Boolean);
    return {status:"OK",intent:"inmobiliarias_by_locality",executed:false,message:`En App Fénix tengo ${live.items.length} inmobiliaria(s) en ${locality}: ${names.join(", ")}.`,source:{system:"APP_FENIX_PROD",rpc:"fenix_prod_inmo_list_server"}};
  }

  if(/^(nuevas|eso|esa|ese|esto|aquello|arias|aria)$/.test(text)){
    return {status:"LOW_CONFIDENCE",intent:"clarification",executed:false,message:`He entendido «${message.trim()}», pero así no tengo suficiente contexto para responder con fiabilidad. Dime un poco más: por ejemplo, «obras nuevas», «nuevas publicaciones» o el tema concreto que quieras consultar.`};
  }

  if(/^arias\s+hay\s+en\s+/.test(text)){
    const locality=message.trim().replace(/^arias\s+hay\s+en\s+/i,"").trim();
    return {status:"LOW_CONFIDENCE",intent:"clarification",executed:false,message:`No quiero adivinar. He entendido «Arias hay en ${locality}». ¿Preguntas por una persona o empresa llamada Arias, o querías decir «qué inmobiliarias hay en ${locality}»?`};
  }

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

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey)$/.test(text)) {
    return {status:"OK",intent:"greeting",executed:false,message:closeOwnerGreeting(conversationContext)};
  }
  if (/^(ayuda|help|que puedes hacer)$/.test(text)) {
    return {status:"OK",intent:"help",executed:false,message:"Claro. Puedes preguntarme por lo que sé, pedirme que te lo explique por temas o decirme qué quieres hacer. Si una acción real necesita tu decisión, te enseñaré exactamente el alcance antes de pedirte confirmación."};
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

  const socialContextHasPublication=(context:any)=>Boolean(
    context?.kind==="social_schedule"&&(
      context.content_key||
      context.external_post_id||
      context.scheduled_at||
      context.caption||
      context.public_media_url||
      (Array.isArray(context.media_urls)&&context.media_urls.length)
    )
  );
  const socialShareCommand=/\b(mandasela|mandaselo|enviasela|enviaselo)\b/.test(text);
  if(socialShareCommand){
    let socialContext=readContext?.kind==="social_schedule"&&socialContextHasPublication(readContext)?readContext:null;
    if(!socialContext){
      const recovered:any=await queryCerebroKnowledge(req,"La próxima publicación de Facebook",null);
      socialContext=recovered?.read_context?.kind==="social_schedule"&&socialContextHasPublication(recovered.read_context)?recovered.read_context:null;
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

  if(readContext?.kind==="social_schedule" && socialContextHasPublication(readContext) && /^[\p{L}.-]+(?:\s+[\p{L}.-]+){0,3}$/u.test(message.trim())){
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

  const answer=await queryCerebroKnowledge(req,resolved.question,readContext);
  return {...answer,context_applied:resolved.applied,resolved_question:resolved.applied?resolved.question:undefined,conversation_topic:resolved.topic};
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
      return json(req,200,await chatReply(req,message,obj.pending_action,obj.read_context,obj.learning_candidate,obj.conversation_context));
    }

    if(req.method!=="GET")return json(req,405,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});

    if(suffix==="health")return json(req,200,{
      status:"ok",service:"cerebro-console-gateway-v0",environment:"LAB",version:"0.9.0-conversational-intelligence-v2",
      authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,
      chat_available:true,chat_mode:"OWNER_DECISION_BY_EXCEPTION_V1",additional_cost_target_eur:0
    });
    if(suffix==="contract")return json(req,200,CONTRACT);
    if(suffix==="engines")return json(req,200,{engines:ENGINES});
    if(suffix==="preferences"){
      const current=await loadPreferences(req);
      if(!current.ok)return json(req,503,{status:"ERROR",reason:"PREFERENCES_UNAVAILABLE",preferences:current.preferences});
      return json(req,200,{status:"OK",preferences:current.preferences});
    }

    return json(req,404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE",available:["health","contract","engines","preferences","chat"]});
  }),
};
