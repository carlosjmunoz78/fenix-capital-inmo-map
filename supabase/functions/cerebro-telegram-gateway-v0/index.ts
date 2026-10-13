import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyConversationPolicy } from "../_shared/cerebro-conversation-policy-v1.ts";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ENGINES=["CONSOLE-001","CHAT-001","CTX-001","CMD-001","ACTGW-001"];
const HUMAN_REASONS=new Set(["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]);
const VOICE_URL="https://fenixcapital.es/wp-content/uploads/cerebro-os/telegram-voice-v0/index.html";
const VOICE_SAMPLES={
  ESM05:{label:"Voz 1 · Executive Cinematic",file_hint:"VOICE001_ESM05_CEREBRO_Executive_Cinematic_V1"},
  ESM06:{label:"Voz 2 · Suave Ejecutiva",file_hint:"VOICE001_ESM06_Suave_Ejecutiva_es_ES"},
  ESM07:{label:"Voz 3 · Asistente Técnico Cinemático",file_hint:"VOICE001_ESM07_Asistente_Tecnico_Cinematico_es_ES"}
} as const;
type VoiceSampleId=keyof typeof VOICE_SAMPLES;
const VOICE_SAMPLE_IDS=Object.keys(VOICE_SAMPLES) as VoiceSampleId[];

function j(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
async function secret(name:string){const {data,error}=await svc.rpc("cerebro_telegram_secret_v0",{p_name:name});if(error||!data)throw new Error("SECRET_UNAVAILABLE");return String(data)}
async function audit(row:Record<string,unknown>){try{await svc.from("cerebro_telegram_audit_v0").insert(row);}catch(_){}}
async function tg(method:string,payload:Record<string,unknown>){const token=await secret("cerebro_telegram_bot_token_v0");const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const body=await r.json().catch(()=>null);if(!r.ok||body?.ok!==true)throw new Error(`TELEGRAM_${method}_${r.status}`);return body}
async function send(chatId:number,text:string,replyMarkup?:Record<string,unknown>){return await tg("sendMessage",{chat_id:chatId,text,disable_web_page_preview:true,...(replyMarkup?{reply_markup:replyMarkup}:{})})}
async function sendVoiceLauncher(chatId:number,text="Pulsa el botón y habla conmigo con normalidad. También puedes escribir."){return await send(chatId,text,{inline_keyboard:[[{text:"🎙️ Hablar con CEREBRO",web_app:{url:VOICE_URL}}]]})}
function norm(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function looksAction(t:string){return /\b(prepara|activa|activar|crea|publica|lanza|ejecuta|inicia|configura|modifica|borra|elimina|envia|envía|paga|firma|autoriza)\b/i.test(t)}
async function activeBinding(userId:number){const {data}=await svc.from("cerebro_telegram_owner_binding_v0").select("telegram_user_id,telegram_chat_id,actor_code,status,username,first_name").eq("telegram_user_id",userId).maybeSingle();return data}
async function upsertPending(m:any){const user=m.from;const chat=m.chat;await svc.from("cerebro_telegram_owner_binding_v0").upsert({telegram_user_id:user.id,telegram_chat_id:chat.id,actor_code:"CARLOS-ADMIN",username:user.username??null,first_name:user.first_name??null,status:"PENDING",last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"telegram_user_id"})}

function detectVoiceSample(m:any):VoiceSampleId|null{
  const fileName=String(m?.audio?.file_name??m?.document?.file_name??"");
  const caption=String(m?.caption??"");
  const haystack=`${fileName} ${caption}`.toUpperCase();
  for(const id of VOICE_SAMPLE_IDS)if(haystack.includes(id))return id;
  return null;
}
function voiceAttachment(m:any){
  const item=m?.audio??m?.document;
  if(!item?.file_id)return null;
  const fileName=String(item?.file_name??"");
  const mime=String(item?.mime_type??"");
  if(m?.document&&!mime.toLowerCase().startsWith("audio/")&&!/\.(mp3|wav|ogg|opus|m4a|aac)$/i.test(fileName))return null;
  return {file_id:String(item.file_id),file_unique_id:String(item.file_unique_id??""),file_name:fileName||null,mime_type:mime||null,duration:Number(item.duration??0)||null,file_size:Number(item.file_size??0)||null};
}
async function latestVoiceSamples(){
  const {data,error}=await svc.from("cerebro_telegram_audit_v0").select("id,occurred_at,metadata").eq("actor_code","CARLOS-ADMIN").eq("event_type","VOICE_SAMPLE_UPLOAD").order("id",{ascending:false}).limit(100);
  if(error)throw new Error("VOICE_SAMPLE_READ_FAILED");
  const out:Partial<Record<VoiceSampleId,any>>={};
  for(const row of data??[]){
    const id=String((row as any)?.metadata?.voice_id??"") as VoiceSampleId;
    if(VOICE_SAMPLE_IDS.includes(id)&&!out[id])out[id]={...(row as any).metadata,audit_id:(row as any).id,occurred_at:(row as any).occurred_at};
  }
  return out;
}
async function preferredVoiceSample(){
  const {data,error}=await svc.from("cerebro_telegram_audit_v0").select("id,metadata").eq("actor_code","CARLOS-ADMIN").eq("event_type","VOICE_SAMPLE_SELECTED").order("id",{ascending:false}).limit(1).maybeSingle();
  if(error)return null;
  const id=String((data as any)?.metadata?.voice_id??"") as VoiceSampleId;
  return VOICE_SAMPLE_IDS.includes(id)?id:null;
}
async function sendVoiceSamples(chatId:number){
  let samples:Partial<Record<VoiceSampleId,any>>={};
  let selected:VoiceSampleId|null=null;
  try{samples=await latestVoiceSamples();selected=await preferredVoiceSample()}catch{await send(chatId,"No he podido leer ahora mismo el catálogo de muestras de voz. No he cambiado ninguna configuración.");return {available:0}}
  const available=VOICE_SAMPLE_IDS.filter(id=>Boolean(samples[id]?.file_id));
  if(!available.length){
    await send(chatId,"🎧 Todavía no tengo las tres muestras dentro de Telegram. Envíame desde este chat los MP3 ESM05, ESM06 y ESM07; reconoceré cada uno por su nombre y guardaré su file_id para no tener que subirlo otra vez.");
    return {available:0};
  }
  await send(chatId,`🎧 Voces candidatas de CEREBRO · ${available.length}/3 cargadas. Escúchalas y marca la que prefieras. Esto registra tu preferencia LAB; no sustituye la voz activa de producción sin el gate de VOICE-001.`);
  for(const id of VOICE_SAMPLE_IDS){
    const sample=samples[id];
    if(!sample?.file_id)continue;
    const chosen=selected===id;
    await tg("sendAudio",{chat_id:chatId,audio:String(sample.file_id),caption:`${chosen?"✅ ":""}${VOICE_SAMPLES[id].label} · ${id}`,reply_markup:{inline_keyboard:[[{text:chosen?"✅ Preferida":"⭐ Elegir esta",callback_data:`voice_sample_select:${id}`}]]}});
  }
  const missing=VOICE_SAMPLE_IDS.filter(id=>!samples[id]?.file_id);
  if(missing.length)await send(chatId,`Faltan por cargar: ${missing.join(", ")}. Envíame esos MP3 desde el móvil y quedarán guardados.`);
  return {available:available.length,selected};
}
async function storeVoiceSample(uid:number,cid:number,m:any){
  const attachment=voiceAttachment(m);
  if(!attachment)return {handled:false};
  const id=detectVoiceSample(m);
  if(!id){
    await send(cid,"He recibido un audio, pero no puedo asociarlo con seguridad. El nombre del archivo debe contener ESM05, ESM06 o ESM07. No lo he registrado.");
    return {handled:true,status:"UNRECOGNIZED"};
  }
  await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"VOICE_SAMPLE_UPLOAD",command:id,status:"SAVED",executed:false,metadata:{voice_id:id,label:VOICE_SAMPLES[id].label,telegram_file_id_scope:"BOT_LOCAL",channel:"telegram",...attachment}});
  await send(cid,`✅ ${VOICE_SAMPLES[id].label} (${id}) guardada en Telegram. Ya puedo reutilizar esta muestra sin volver a subirla. Usa /voces para compararlas.`);
  return {handled:true,status:"SAVED",voice_id:id};
}
async function handleVoiceSelection(q:any){
  const uid=Number(q?.from?.id??0);
  const callbackId=String(q?.id??"");
  const match=String(q?.data??"").match(/^voice_sample_select:(ESM05|ESM06|ESM07)$/);
  if(!uid||!callbackId||!match)return false;
  const id=match[1] as VoiceSampleId;
  const binding=await activeBinding(uid);
  if(!binding||binding.status!=="ACTIVE"||binding.actor_code!=="CARLOS-ADMIN"){
    await tg("answerCallbackQuery",{callback_query_id:callbackId,text:"Vinculación de propietario requerida.",show_alert:true});
    return true;
  }
  let samples:Partial<Record<VoiceSampleId,any>>={};
  try{samples=await latestVoiceSamples()}catch{}
  if(!samples[id]?.file_id){
    await tg("answerCallbackQuery",{callback_query_id:callbackId,text:"Esa muestra ya no está disponible. Vuelve a enviarla.",show_alert:true});
    return true;
  }
  const cid=Number(q?.message?.chat?.id??binding.telegram_chat_id);
  await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"VOICE_SAMPLE_SELECTED",command:id,status:"PREFERENCE_SAVED",executed:false,metadata:{voice_id:id,label:VOICE_SAMPLES[id].label,environment:"LAB",engine_id:"VOICE-001",prod_voice_changed:false,channel:"telegram"}});
  await tg("answerCallbackQuery",{callback_query_id:callbackId,text:`${id} marcada como preferida.`});
  await send(cid,`⭐ ${VOICE_SAMPLES[id].label} marcada como tu candidata preferida. He registrado la decisión en LAB; todavía no he cambiado la voz de producción.`);
  return true;
}

async function configureBot(){
  const {data:binding,error}=await svc.from("cerebro_telegram_owner_binding_v0").select("telegram_chat_id,status,actor_code").eq("actor_code","CARLOS-ADMIN").eq("status","ACTIVE").limit(1).maybeSingle();
  if(error||!binding?.telegram_chat_id)throw new Error("OWNER_BINDING_MISSING");
  const chatId=Number(binding.telegram_chat_id);
  const commands=[
    {command:"start",description:"Abrir CEREBRO"},
    {command:"voz",description:"Hablar con CEREBRO"},
    {command:"voces",description:"Escuchar y comparar voces"},
    {command:"estado",description:"Ver estado de CEREBRO"},
    {command:"motores",description:"Ver motores disponibles"},
    {command:"ayuda",description:"Ver qué puedes pedirme"}
  ];
  const results:any[]=[];
  results.push(await tg("setMyCommands",{commands}));
  results.push(await tg("setMyDescription",{description:"CEREBRO OS · mando privado de Carlos. Consulta estado, conocimiento y operaciones; habla conmigo por voz y recibe HUMAN_REQUIRED cuando de verdad necesite tu decisión."}));
  results.push(await tg("setMyShortDescription",{short_description:"CEREBRO OS · control privado, voz y decisiones."}));
  results.push(await tg("setChatMenuButton",{chat_id:chatId,menu_button:{type:"web_app",text:"🎙️ Hablar",web_app:{url:VOICE_URL}}}));
  await audit({telegram_user_id:null,telegram_chat_id:chatId,actor_code:"CARLOS-ADMIN",direction:"SYSTEM",event_type:"BOT_CONFIG",status:"APPLIED",executed:false,metadata:{voice_url:VOICE_URL,commands:commands.map(x=>x.command),voice_samples_v1:true}});
  return {ok:true,configured:true,telegram_calls:results.length};
}
async function replyFor(text:string){
  const t=norm(text);
  if(/^(hola|buenas|hey|ey|\/start)$/.test(t))return {text:"Hola Carlos. CEREBRO Telegram está conectado. Puedes escribirme, usar /estado, /motores o /ayuda, abrir /voz para hablar conmigo y /voces para comparar las muestras de voz. Las acciones reales siguen protegidas por los gates de CEREBRO.",executed:false,status:"OK",voiceLauncher:true};
  if(/^(\/voz|voz|hablar|habla conmigo|quiero hablar)$/.test(t))return {text:"🎙️ Abriendo el modo voz de CEREBRO. Pulsa el botón para hablar conmigo.",executed:false,status:"OK",voiceLauncher:true};
  if(/^(\/estado|estado|salud|health|conexion|conectado)$/.test(t))return {text:"🟢 CEREBRO Telegram ONLINE\nActor: CARLOS-ADMIN\nGateway móvil: V0 seguro\nVoz: DISPONIBLE\nEscrituras PROD directas: BLOQUEADAS\nTrading: AISLADO\nCoste adicional: 0 €",executed:false,status:"OK"};
  if(/^(\/motores|motores|engines)$/.test(t))return {text:`Motores del contrato de Console: ${ENGINES.join(", ")}.`,executed:false,status:"OK"};
  if(/^(\/ayuda|ayuda|help|que puedes hacer)$/.test(t))return {text:"Puedes consultarme estado de CEREBRO, motores y datos operativos básicos. Con /voz puedes hablarme y recibir respuesta hablada; con /voces puedes escuchar y comparar las muestras candidatas. Si detecto una orden que pueda modificar algo, no la ejecutaré a ciegas: debe pasar por CEREBRO Gateway y sus gates de autorización.",executed:false,status:"OK",voiceLauncher:true};
  if(/\b(cuantos|numero|total)\b.*\bexpedientes?\b.*\b(activos?|abiertos?|en curso)\b|\bexpedientes?\b.*\b(activos?|abiertos?|en curso)\b/.test(t)){
    const {data,error}=await svc.rpc("fenix_prod_exp_list_server",{p_actor_code:"CARLOS-ADMIN"});
    if(error||data?.ok!==true||!Array.isArray(data.items))return {text:"No he podido leer ahora mismo los expedientes vivos. No voy a inventar el dato.",executed:false,status:"ERROR"};
    const active=data.items.filter((x:any)=>x?.is_active===true);
    return {text:`Ahora mismo hay ${active.length} expedientes activos en App Fénix.`,executed:false,status:"OK"};
  }
  const im=t.match(/inmobiliarias?(?: tenemos| hay)? en ([a-záéíóúñ -]{2,60})$/i);
  if(im){
    const locality=im[1].trim();
    const {data,error}=await svc.rpc("fenix_prod_inmo_list_server",{p_actor_code:"CARLOS-ADMIN"});
    if(error||data?.ok!==true||!Array.isArray(data.items))return {text:"No he podido consultar ahora mismo el directorio vivo de inmobiliarias.",executed:false,status:"ERROR"};
    const n=(v:string)=>norm(String(v??""));
    const items=data.items.filter((x:any)=>n(x?.localidad)===n(locality));
    return {text:items.length?`Tengo ${items.length} inmobiliaria(s) en ${locality}: ${items.slice(0,15).map((x:any)=>String(x?.nombre_alias??x?.nombre??"")).filter(Boolean).join(", ")}.`:`No tengo ninguna inmobiliaria activa cuya localidad sea exactamente «${locality}».`,executed:false,status:"OK"};
  }
  if(looksAction(text))return {text:"🔴 HUMAN_REQUIRED · HIGH_RISK\nHe detectado una orden de acción. Telegram V0 no ejecuta cambios directamente. La orden debe pasar por CEREBRO Gateway con alcance exacto, auditoría y confirmación segura.",executed:false,status:"HUMAN_REQUIRED",reason:"HIGH_RISK"};
  return {text:"Te leo. Telegram ya está conectado al control de CEREBRO, pero esta consulta todavía no tiene un handler seguro en V0. No voy a inventar ni ejecutar nada. Puedes usar /voz, /voces, /estado, /motores, preguntar por expedientes activos o por inmobiliarias de una localidad.",executed:false,status:"LOW_CONFIDENCE",reason:"LOW_CONFIDENCE"};
}

Deno.serve(async(req:Request)=>{
  const path=new URL(req.url).pathname;
  if(req.method==="GET")return j(200,{status:"ok",service:"cerebro-telegram-gateway-v0",environment:"PROD_CONTROL_PLANE",mode:"OWNER_ONLY_SAFE_V0",voice_available:true,voice_samples_v1:true,voice_sample_ids:VOICE_SAMPLE_IDS,voice_url:VOICE_URL,direct_model_access:false,prod_write:false,trading:false,additional_cost_eur:0,human_intelligence_policy:"V1",conversation_owner:"CHAT-001"});
  if(req.method!=="POST")return j(405,{status:"CLOSED"});
  if(path.endsWith("/configure")){
    let expected="";
    try{expected=await secret("cerebro_telegram_internal_secret_v0")}catch{return j(503,{status:"ERROR",reason:"INTERNAL_SECRET_UNAVAILABLE"})}
    const got=req.headers.get("x-cerebro-internal-secret")??"";
    if(!got||got!==expected)return j(403,{status:"FORBIDDEN"});
    try{return j(200,await configureBot())}catch(e){return j(502,{status:"ERROR",reason:e instanceof Error?e.message:String(e)})}
  }
  let expected="";
  try{expected=await secret("cerebro_telegram_webhook_secret_v0")}catch{return j(503,{status:"ERROR",reason:"WEBHOOK_SECRET_UNAVAILABLE"})}
  const got=req.headers.get("x-telegram-bot-api-secret-token")??"";
  if(!got||got!==expected)return j(403,{status:"FORBIDDEN"});
  let update:any;
  try{update=await req.json()}catch{return j(400,{status:"INVALID"})}

  if(update?.callback_query){
    try{
      const handled=await handleVoiceSelection(update.callback_query);
      if(handled)return j(200,{ok:true,callback:"VOICE_SAMPLE_SELECTION"});
    }catch{return j(200,{ok:true,callback:"VOICE_SAMPLE_SELECTION_ERROR"})}
  }

  const m=update?.message;
  if(!m?.from?.id||!m?.chat?.id)return j(200,{ok:true,ignored:true});
  const uid=Number(m.from.id),cid=Number(m.chat.id),text=typeof m.text==="string"?String(m.text).slice(0,2000):"";
  let binding=await activeBinding(uid);
  if(!binding){
    await upsertPending(m);
    await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"PAIRING_REQUEST",command:text||"[non-text]",status:"PENDING",executed:false,metadata:{username:m.from.username??null,first_name:m.from.first_name??null}});
    await send(cid,"CEREBRO OS ha recibido tu identidad de Telegram. La vinculación está pendiente de confirmación del propietario; todavía no ejecutaré ninguna orden.");
    return j(200,{ok:true,pairing:"PENDING"});
  }
  await svc.from("cerebro_telegram_owner_binding_v0").update({telegram_chat_id:cid,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("telegram_user_id",uid);
  if(binding.status!=="ACTIVE"){
    await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"PAIRING_REPEAT",command:text||"[non-text]",status:String(binding.status??"PENDING"),executed:false,metadata:{channel:"telegram"}});
    await send(cid,"CEREBRO OS reconoce este Telegram, pero la vinculación aún no está activa. No ejecutaré órdenes hasta completar la confirmación.");
    return j(200,{ok:true,pairing:binding.status});
  }

  const upload=await storeVoiceSample(uid,cid,m);
  if(upload.handled)return j(200,{ok:true,voice_sample:upload.status,voice_id:(upload as any).voice_id??null});

  if(!text)return j(200,{ok:true,ignored:true});
  if(/^(\/voces|voces)$/i.test(norm(text))){
    const catalog=await sendVoiceSamples(cid);
    await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"VOICE_SAMPLE_CATALOG",command:text,status:"SERVED",executed:false,metadata:{channel:"telegram",available:catalog.available,selected:(catalog as any).selected??null}});
    return j(200,{ok:true,status:"OK",voice_samples:catalog.available});
  }

  const raw=await replyFor(text);
  if((raw as any).reason&&!HUMAN_REASONS.has((raw as any).reason))(raw as any).reason="LOW_CONFIDENCE";
  const policy=applyConversationPolicy({channel_id:"TELEGRAM_TEXT",user_message:text,upstream:{...raw,message:raw.text}});
  const out={...raw,text:String((policy.response as any).message??raw.text)};
  await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"IN",event_type:"COMMAND",command:text,status:out.status,executed:out.executed,human_required_reason:(out as any).reason??null,metadata:{channel:"telegram",human_intelligence_overlay:policy.overlay.applied,human_intelligence_reason:policy.overlay.reason}});
  if((out as any).voiceLauncher)await sendVoiceLauncher(cid,out.text);else await send(cid,out.text);
  await audit({telegram_user_id:uid,telegram_chat_id:cid,actor_code:"CARLOS-ADMIN",direction:"OUT",event_type:"REPLY",status:"SENT",executed:false,metadata:{response_status:out.status,voice_launcher:Boolean((out as any).voiceLauncher),human_intelligence_overlay:policy.overlay.applied}});
  return j(200,{ok:true,status:out.status});
});
