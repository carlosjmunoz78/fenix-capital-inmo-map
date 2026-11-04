/** ZEUS/JARVIS B5 · deterministic Spanish/voice intent compiler, LAB candidate only.
 * Pure analysis; never performs mutations, follows user text as program instructions
 * or confers permissions. Auth + grants are upstream B2/B3 responsibilities.
 */
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const SECRET=/\b(?:password|contrase(?:ñ|n)a|clave privada|api[_ -]?key|access[_ -]?token|bearer\s+\S+|refresh[_ -]?token|otp|c[oó]digo\s+(?:de\s+)?verificaci[oó]n)\b/i;
const STOP=/^(?:para(?: ya)?|detente|detenete|c[aá]llate|calla|interrumpe|silencio|stop|corta|basta)(?:\s+por favor)?\s*[.!?]*$/i;
const UNSAFE=/\b(?:borr(?:a|ar|ado|ando)|elimin(?:a|ar|ado|ando)|destruy(?:e|a)|destru(?:ir|ye)|formatea(?:r)?|transfiere|transferir|paga(?:r)?|compr(?:a|ar)|firma(?:r)?|contrata(?:r)?|env[ií]a dinero)\b/i;
const verbs=[
 ['STATUS',/^(?:estado|c[oó]mo va|como va|qu[eé] falta|dime el estado|revisa el estado|qu[eé] tenemos)\b/i],
 ['QUESTION',/^(?:[¿¡]?\s*(?:qu[eé]|qui[eé]n|cu[aá]ndo|d[oó]nde|c[oó]mo|por qu[eé]|para qu[eé]|cu[aá]l|cu[aá]nto|puedes explicar|me puedes explicar)(?=\s|$|[!?.,;])|expl[ií]came(?=\s|$|[!?.,;]))/i],
 ['CONTINUE',/^(?:contin[uú]a|sigue|prosigue|procede|vamos con)\b/i],
 ['FIND',/^(?:busca|encuentra|recupera|localiza|consulta|investiga)\b/i],
 ['DRAFT',/^(?:redacta|escribe|prepara|crea un (?:texto|art[ií]culo|borrador|email|correo)|haz un borrador)\b/i],
 ['PUBLISH',/^(?:publica|sube|despliega|promociona|activa)\b/i],
 ['SEND',/^(?:env[ií]a|manda|responde al|contesta al)\b/i],
 ['CONFIGURE',/^(?:configura|instala|conecta|modifica|actualiza|arregla|corrige)\b/i],
 ['EXECUTE',/^(?:ejecuta|haz|realiza|comprueba|verifica|prueba)\b/i]
];
const checkId=(value,name,nullable=false)=>{
 if(nullable&&value===null)return null;
 if(typeof value!=='string'||!SAFE_ID.test(value))throw Error(name+'_INVALID');
 return value;
};
export function compileJarvisB5Intent({text,channel='TEXT',companyId,projectId,missionId=null,locale='es-ES'}={}){
 checkId(companyId,'COMPANY_ID');checkId(projectId,'PROJECT_ID');checkId(missionId,'MISSION_ID',true);
 if(!['TEXT','VOICE_STT'].includes(channel))throw Error('CHANNEL_INVALID');
 if(locale!=='es-ES')throw Error('LOCALE_UNSUPPORTED');
 if(typeof text!=='string'||text.length<1||text.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw Error('TEXT_INVALID');
 if(SECRET.test(text))return Object.freeze({
  kind:'REJECTED',reason:'SENSITIVE_SPEECH_OR_TEXT',requiresHuman:false,mayExecute:false,companyId,projectId,missionId,channel
 });
 let clean=text.normalize('NFKC').trim().replace(/^(?:oye\s+)?(?:jarvis|cerebro)[,:]?\s*/i,'').replace(/\s+/g,' ');
 // Remove a single leading Spanish question mark for intent classification.
 if(clean.startsWith('¿'))clean=clean.slice(1).trim();
 if(!clean)throw Error('TEXT_EMPTY_AFTER_WAKE_WORD');
 if(STOP.test(clean))return Object.freeze({
  kind:'INTERRUPT',reason:'USER_INTERRUPTION',requiresHuman:false,mayExecute:false,companyId,projectId,missionId,channel
 });
 const found=verbs.find(([,re])=>re.test(clean));
 const kind=UNSAFE.test(clean)?'HIGH_RISK':found?.[0]??'UNKNOWN';
 const highRisk=kind==='HIGH_RISK';
 const payload=clean.replace(/[.,!?]+$/g,'').trim();
 const onlyVerb=/^(?:contin[uú]a|sigue|procede|haz(?:lo)?|realiza|ejecuta|publica|env[ií]a|manda|configura|instala|activa|arregla|revisa|comprueba|verifica|busca|escribe|redacta|prepara)\s*[.!?]*$/i.test(payload);
 const anaphora=/^(?:hazlo|eso|lo de antes|igual que antes|contin[uú]a con eso)$/i.test(payload);
 const requiresClarification=kind==='UNKNOWN'||(onlyVerb&&!missionId)|| (anaphora&&!missionId);
 const clarification=requiresClarification?'NEED_MISSION_OR_OBJECT':null;
 return Object.freeze({
  kind,normalizedText:payload,companyId,projectId,missionId,channel,locale,
  needsClarification:requiresClarification,clarification,requiresHuman:highRisk,
  humanReason:highRisk?'HIGH_RISK':null,
  mayExecute:false,executionMode:'COMPILE_ONLY',
  confidence:kind==='UNKNOWN'?0:requiresClarification?0.5:1
 });
}
