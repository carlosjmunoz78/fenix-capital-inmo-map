/** ZEUS / JARVIS B5 · stable Spanish dialogue policy, no generation API or actions.
 * Evidence is trusted only when an independent server-side verifier confirms it.
 * NEVER infer a successful side effect from a user's statement or model output.
 */
const MAX_SPEECH=260;
const clean=x=>typeof x==='string'?x.replace(/[\u0000-\u001f]/g,' ').trim():'';
const cap=x=>x.length>MAX_SPEECH?x.slice(0,MAX_SPEECH-1).trimEnd()+'…':x;
const frozen=(status,text,reason=null)=>Object.freeze({
 status,text,speech:cap(text),locale:'es-ES',
 persona:'JARVIS_NEUTRAL_CLEAR_V0',executed:false,reason
});
export function createJarvisB5Dialogue({evidenceVerifier=null}={}){
 return Object.freeze({
 async respond({intent,evidence=[]}={}){
  if(!intent||typeof intent!=='object'||intent.mayExecute!==false)
   return frozen('DENY','No puedo procesar esa instrucción sin el contrato de seguridad.','INTENT_NOT_VERIFIED');
  if(intent.kind==='INTERRUPT')
   return frozen('INTERRUPTED','De acuerdo. Detengo la conversación por voz.','LOCAL_AUDIO_STOP_ONLY');
  if(intent.kind==='REJECTED')
   return frozen('REJECTED','No procesaré contraseñas ni códigos de acceso por voz o chat.','SENSITIVE_INPUT');
  if(intent.requiresHuman||intent.kind==='HIGH_RISK')
   return frozen('HUMAN_REQUIRED','He identificado una operación de riesgo elevado. Necesita la autorización humana correspondiente antes de ejecutarse.','HIGH_RISK');
  if(intent.needsClarification)
   return frozen('CLARIFY','¿Sobre qué tarea, archivo o misión concreta quieres que actúe?','NEED_MISSION_OR_OBJECT');
  if(intent.kind==='STATUS'){
   if(!Array.isArray(evidence)||evidence.length>10)
    return frozen('NO_EVIDENCE','Todavía no tengo evidencia verificada del estado actual.','EVIDENCE_MISSING');
   const confirmed=[];
   if(typeof evidenceVerifier==='function'){
    for(const record of evidence){
     if(record&&await evidenceVerifier(record,intent)===true){
      const message=clean(record.summary);
      if(message&&message.length<=220)confirmed.push(message);
     }
    }
   }
   if(confirmed.length===0)
    return frozen('NO_EVIDENCE','Todavía no tengo evidencia verificada del estado actual.','EVIDENCE_MISSING');
   const message='He comprobado lo siguiente: '+confirmed.slice(0,3).join('. ')+'.';
   return frozen('VERIFIED_STATUS',message,'INDEPENDENT_VERIFICATION');
  }
  if(intent.kind==='QUESTION')
   return frozen('NEEDS_KNOWLEDGE','He entendido la pregunta. Necesito consultar una fuente verificable antes de darte una respuesta factual.','NO_KNOWLEDGE_ADAPTER');
  if(intent.kind==='CONTINUE')
   return frozen('READY','Tengo identificada la misión. Todavía no he ejecutado ningún paso nuevo.','EXECUTION_GATE_REQUIRED');
  return frozen('READY','He entendido la solicitud. He preparado su interpretación, pero no he ejecutado ninguna acción.','EXECUTION_GATE_REQUIRED');
 }
 });
}
