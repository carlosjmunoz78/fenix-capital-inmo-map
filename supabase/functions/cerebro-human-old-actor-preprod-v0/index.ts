import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PREPROD_PROJECT_REF="hnqlnvakzaywtafeiybt";
const SOURCE_SERVICE="cerebro-console-gateway-v0";
const SOURCE_VERSION="prod-v33-frozen-old";
const SOURCE_SHA256="a32fc26e4b328d0477bc53f0ae9085c0d5d280703779db5ac8593fd9b718553a";
const OIDC_ISSUER="https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE="cerebro-human-old-actor-preprod-v0";
const REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const WORKFLOW_PATH=".github/workflows/cerebro-human-intelligence-v1.yml";
const ENGINES=["CONSOLE-001","CHAT-001","CTX-001","CMD-001","ACTGW-001"];

const EVIDENCE=Object.freeze({
  real_cerebro_actor:true,
  environment:"PREPROD",
  project_ref:PREPROD_PROJECT_REF,
  prod_write_authorized:false,
  prod_execution_enabled:false,
  customer_data:false,
  trading_access:false,
  additional_cost_eur:0,
  source_service:SOURCE_SERVICE,
  source_version:SOURCE_VERSION,
  source_sha256:SOURCE_SHA256,
  source_mode:"FROZEN_PROD_V33_SANDBOX",
  source_scope:"SAFE_CONVERSATIONAL_CORE",
  auth_mode:"GITHUB_OIDC"
});

type Turn={role:"user"|"cerebro";text:string};
type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;[key:string]:unknown};

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function norm(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}
function clean(v:string){return norm(v).replace(/^[¿¡?!.]+/g,"").replace(/[?!.]+$/g,"").trim();}
function b64urlBytes(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);const raw=atob(normalized);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}

let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){
  if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;
  const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`,{cache:"no-store"});
  if(!configRes.ok)throw new Error("OIDC_CONFIG_UNAVAILABLE");
  const config=await configRes.json();
  const jwksRes=await fetch(String(config.jwks_uri),{cache:"no-store"});
  if(!jwksRes.ok)throw new Error("OIDC_JWKS_UNAVAILABLE");
  const jwks=await jwksRes.json();
  if(!Array.isArray(jwks?.keys))throw new Error("OIDC_JWKS_INVALID");
  jwksCache={at:Date.now(),keys:jwks.keys};
  return jwks.keys;
}

async function authorizeGitHubOidc(req:Request){
  const bearer=req.headers.get("authorization")??"";
  if(!bearer.startsWith("Bearer "))return {ok:false as const,reason:"OIDC_MISSING"};
  const token=bearer.slice(7);
  const parts=token.split(".");
  if(parts.length!==3)return {ok:false as const,reason:"OIDC_MALFORMED"};
  try{
    const header=b64urlJson<any>(parts[0]);
    const claims=b64urlJson<Claims>(parts[1]);
    if(header?.alg!=="RS256"||!header?.kid)return {ok:false as const,reason:"OIDC_ALG_OR_KID_INVALID"};
    const keys=await githubJwks();
    const jwk=keys.find((key:any)=>key?.kid===header.kid);
    if(!jwk)return {ok:false as const,reason:"OIDC_KID_UNKNOWN"};
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if(!verified)return {ok:false as const,reason:"OIDC_SIGNATURE_INVALID"};
    const now=Math.floor(Date.now()/1000);
    const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);
    if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:"OIDC_ISSUER_OR_AUDIENCE_INVALID"};
    if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:"OIDC_TIME_INVALID"};
    if(claims.repository!==REPOSITORY)return {ok:false as const,reason:"OIDC_REPOSITORY_INVALID"};
    if(!["pull_request","workflow_dispatch"].includes(String(claims.event_name??"")))return {ok:false as const,reason:"OIDC_EVENT_INVALID"};
    if(!String(claims.workflow_ref??"").includes(WORKFLOW_PATH))return {ok:false as const,reason:"OIDC_WORKFLOW_INVALID"};
    return {ok:true as const,claims};
  }catch(error){return {ok:false as const,reason:"OIDC_VERIFY_ERROR",detail:String(error instanceof Error?error.message:error)};}
}

function validateContext(raw:unknown):Turn[]{
  if(!Array.isArray(raw))return [];
  const out:Turn[]=[];let total=0;
  for(const item of raw.slice(-10)){
    if(!item||typeof item!=="object")continue;
    const role=String((item as any).role??"");const text=String((item as any).text??"").trim().slice(0,1200);
    if((role!=="user"&&role!=="cerebro")||!text)continue;
    if(total+text.length>8000)break;total+=text.length;out.push({role:role as Turn["role"],text});
  }
  return out;
}

function contextTopic(context:Turn[]){
  const recent=context.slice(-8).map(t=>norm(t.text)).join(" ");
  const domains:[string,RegExp][]=[
    ["legal inmobiliario",/\b(legal|juridic|arras|compraventa|registro|cargas?|notari|herencia|donacion|itp|plusvalia|catastro|embargo|titularidad|urbanismo)\b/],
    ["financiacion hipotecaria",/\b(hipoteca|financi|banco|tin|tae|fein|tasacion|endeudamiento)\b/],
    ["SEO",/\b(seo|keyword|palabra clave|indexacion|search console|gsc|enlazado|landing)\b/],
    ["marketing",/\b(marketing|embudo|captacion|campana|conversion)\b/],
    ["redes sociales",/\b(redes|facebook|instagram|linkedin|tiktok|youtube)\b/],
    ["arquitectura de CEREBRO",/\b(supabase|gateway|console|runtime|worker|arquitectura|motor)\b/],
    ["multiempresa",/\b(multiempresa|nueva empresa|onboarding|company registry)\b/]
  ];
  for(const [label,pattern] of domains)if(pattern.test(recent))return label;
  return null;
}

function contextualize(message:string,context:Turn[]){
  const text=clean(message);const topic=contextTopic(context);
  const explicit=/\b(legal|juridic|hipoteca|financi|seo|marketing|facebook|instagram|linkedin|newsletter|supabase|gateway|trading|multiempresa)\b/.test(text);
  const follow=/^(y\b|eso\b|esa\b|ese\b|esto\b|lo anterior\b|sobre eso\b|y si\b|que pasa si\b|como seria\b)/.test(text);
  const short=text.length<=48&&!/^(hola|buenas|si|no|vale|ok|gracias|procede|continua)$/.test(text);
  if(topic&&!explicit&&(follow||short))return {question:`En el contexto de ${topic}: ${message.trim()}`,applied:true,topic};
  return {question:message.trim(),applied:false,topic};
}

function hashSlot(input:string,mod:number){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%mod;}
function greeting(seed:string,context:Turn[]){
  const variants=["Hola Carlos. ¿Qué tal guapo? Dime, ¿qué hacemos?","¡Buenas Carlos! Aquí estoy guapo. ¿Qué necesitas?","Hola guapo. Dime Carlos, ¿por dónde empezamos?","Ey Carlos. Te escucho. ¿Qué quieres revisar?"];
  return variants[hashSlot(`${seed}|${context.length}`,variants.length)];
}

function detectDomain(q:string){const t=norm(q);if(/legal|juridic|arras|compraventa|registro|notari|herencia|fiscal|catastro/.test(t))return"legal";if(/hipoteca|banco|financi|tin|tae|fein|tasacion|endeudamiento/.test(t))return"finance";if(/seo|keyword|search console|landing|indexacion/.test(t))return"seo";if(/marketing|embudo|captacion|campana/.test(t))return"marketing";if(/redes|facebook|instagram|linkedin|tiktok|youtube/.test(t))return"social";if(/newsletter|brevo/.test(t))return"newsletter";if(/supabase|runtime|worker|gateway|arquitectura/.test(t))return"platform";if(/trading/.test(t))return"trading";if(/multiempresa|nueva empresa|onboarding/.test(t))return"multiempresa";return null;}

function domainMap(domain:string|null){
  const maps:Record<string,string>={
    finance:"En financiación puedo ayudarte con preanálisis y viabilidad, ingresos y endeudamiento, documentación, perfiles de cliente, estrategia de bancos, tasación, incidencias, FEIN, firma y seguimiento. Si el dato depende del banco o del caso real, hay que verificarlo antes de decidir.",
    seo:"En SEO puedo ayudarte con auditoría técnica, palabras clave e intención, arquitectura, landings, contenidos, enlazado interno, SEO local, indexación, Search Console cuando haya datos y seguimiento por ciudad.",
    marketing:"La estrategia de Fénix prioriza crecimiento orgánico y reutilización de activos antes de gasto nuevo: SEO, SEO local, contenidos, redes orgánicas, Google Business, B2B con inmobiliarias, CRM/reactivación y referidos.",
    social:"En redes puedo revisar estrategia, calendario, copy, creatividades y canales. Para una publicación o fecha concreta necesito consultar la fuente operativa; este actor LAB no accede a datos vivos.",
    newsletter:"El sistema canónico de newsletter es Brevo. Puedo explicar segmentación, campañas, automatizaciones y relación con CRM, pero este actor LAB no ejecuta envíos ni consulta datos vivos.",
    platform:"Supabase se reserva principalmente para el core transaccional. Jobs largos, training, investigación, simulación, OCR y logs pesados deben poder ejecutarse fuera mediante runtime y workers compartidos.",
    trading:"Trading LAB debe permanecer aislado de App, CRM y CEREBRO PROD, con credenciales, recursos, logs y kill switch propios.",
    multiempresa:"El onboarding objetivo es registro, discovery, web/keywords, SEO, competencia, redes, presencia local, marketing, negocio/procesos, conocimiento, CRM, App, automatizaciones, training, supervisor, backup y producción tras gates.",
    legal:"Puedo orientar sobre arras, compraventa, titularidad, cargas, Registro, Catastro, notaría, herencias y fiscalidad, separando orientación de criterio jurídico definitivo y verificando normativa vigente cuando corresponda."
  };
  return domain?maps[domain]??null:null;
}

function reply(message:string,context:Turn[],seed:string){
  const text=clean(message);const resolved=contextualize(message,context);const resolvedText=clean(resolved.question);
  if(!text)return {status:"INVALID",intent:"invalid",message:"Escribe una consulta.",executed:false};
  if(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey)$/.test(text))return {status:"OK",intent:"greeting",message:greeting(seed,context),executed:false};
  if(/^(ayuda|help|que puedes hacer)$/.test(text))return {status:"OK",intent:"help",message:"Puedes preguntarme por lo que sé o pedirme que te explique un tema. Este actor de laboratorio no ejecuta acciones ni consulta datos de clientes.",executed:false};
  if(/^(estado|salud|health|conexion|estas conectado)$/.test(text))return {status:"OK",intent:"health",message:"CEREBRO OLD está disponible en PREPROD como snapshot conversacional aislado para el Gym. No tiene escrituras PROD ni acceso a datos de clientes.",executed:false};
  if(/^(motores|motor|engines|lista de motores|que motores hay)$/.test(text))return {status:"OK",intent:"engines",message:`Motores de Console V0: ${ENGINES.join(", ")}.`,executed:false};
  if(/^(contrato|seguridad|policy|politica|permisos)$/.test(text))return {status:"OK",intent:"contract",message:"Este snapshot conserva el comportamiento conversacional OLD dentro de un perímetro PREPROD: sin escritura PROD, sin acciones reales, sin Trading y sin datos de clientes.",executed:false};
  if(/^(nuevas|eso|esa|ese|esto|aquello|arias|aria)$/.test(text))return {status:"LOW_CONFIDENCE",intent:"clarification",message:`He entendido «${message.trim()}», pero así no tengo suficiente contexto. Dime un poco más para no adivinar.`,executed:false};
  if(/\b(prepara|activa|activar|crea|publica|lanza|ejecuta|inicia|configura|modifica|borra|envia|paga|firma)\b/.test(text))return {status:"ACTION_NEEDS_SCOPE",intent:"action",message:"He detectado una petición de acción. En este actor PREPROD del Gym ninguna acción real está habilitada; puedo ayudarte a precisar el alcance sin ejecutar nada.",executed:false};
  const domain=detectDomain(resolvedText);const map=domainMap(domain);
  if(map)return {status:"OK",intent:`${domain}_knowledge_map`,message:map,executed:false,context_applied:resolved.applied,resolved_question:resolved.applied?resolved.question:undefined,conversation_topic:resolved.topic};
  if(resolved.applied)return {status:"LOW_CONFIDENCE",intent:"clarification",message:`Sigo el contexto de ${resolved.topic}, pero no tengo evidencia suficiente en este snapshot aislado para responder sin inventar. Concrétame el punto que necesitas.`,executed:false,context_applied:true,resolved_question:resolved.question,conversation_topic:resolved.topic};
  return {status:"LOW_CONFIDENCE",intent:"clarification",message:"No tengo suficiente conocimiento verificable en este snapshot aislado para responder con fiabilidad. Dime el tema o el dato concreto y no inventaré la respuesta.",executed:false};
}

function validateLabContext(value:unknown){
  if(!value||typeof value!=="object")return false;
  const v=value as any;
  return v.company_id==="fenix"&&v.engine_id==="SIM-001"&&v.environment==="LAB"&&v.prod_write_authorized===false&&v.trading_access===false&&v.customer_data===false;
}

Deno.serve(async(req:Request)=>{
  const auth=await authorizeGitHubOidc(req);
  if(!auth.ok)return json(403,{status:"FORBIDDEN",reason:auth.reason});
  const suffix=new URL(req.url).pathname.split("/").filter(Boolean).pop()??"";
  if(req.method==="GET"&&suffix==="health")return json(200,{status:"ok",service:"cerebro-human-old-actor-preprod-v0",actor_evidence:EVIDENCE});
  if(req.method!=="POST"||suffix!=="chat")return json(404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});
  let body:any;try{body=await req.json();}catch{return json(400,{status:"INVALID",reason:"JSON_INVALID"});}
  if(typeof body?.message!=="string"||body.message.length>2000)return json(400,{status:"INVALID",reason:"MESSAGE_INVALID"});
  if(!validateLabContext(body?.lab_context))return json(400,{status:"INVALID",reason:"LAB_CONTEXT_REQUIRED"});
  const context=validateContext(body?.conversation_context);
  const answer=reply(body.message,context,String(body.lab_context.seed??""));
  return json(200,{...answer,actor_evidence:EVIDENCE});
});
