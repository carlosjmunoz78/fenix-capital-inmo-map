/**
 * JARVIS-only browser voice fallback. No cloned voice or external model.
 * This policy never touches ANA or the existing generic voice selector.
 */
export const JARVIS_BROWSER_VOICE_DEFAULTS: Readonly<Record<string,string>> = Object.freeze({
  tone:'executive_formal',
  response_length:'concise',
  speech_rate:'1.10',
  speech_pitch:'0.98'
});

export function resolveJarvisVoicePreferences(raw: Record<string,string> = {}): Record<string,string> {
  const requestedRate=Number(raw.speech_rate);
  return {
    ...raw,
    tone:'executive_formal',
    response_length:raw.response_length==='detailed'?'detailed':'concise',
    speech_rate:raw.speech_rate && Number.isFinite(requestedRate) && requestedRate>=0.82 && requestedRate<=1.18
      ? String(requestedRate) : JARVIS_BROWSER_VOICE_DEFAULTS.speech_rate,
    // Browser TTS only; legacy warm/feminine pitch is not JARVIS's default.
    speech_pitch:JARVIS_BROWSER_VOICE_DEFAULTS.speech_pitch
  };
}

/** Best-effort neutral Spanish-Spain male voice preference, no voice cloning claim. */
export function preferredJarvisSpanishVoice<T extends {name:string;lang:string;localService?:boolean}>(voices:readonly T[]):T|undefined {
  const masculine=/\b(?:pablo|jorge|antonio|diego|alvaro|álvaro|david|manuel|carlos|juan|enrique|jorge|raul|raúl|fernando|miguel)\b/i;
  const feminine=/\b(?:elvira|helena|laura|lucia|lucía|monica|mónica|paulina|sabina|sofia|sofía|carmen|marisol|paloma)\b/i;
  return voices.filter(v=>/^es(?:-|$)/i.test(String(v.lang||'')))
   .map((voice,index)=>{
     const lang=voice.lang.toLocaleLowerCase('es-ES');
     const name=voice.name.toLocaleLowerCase('es-ES');
     let score=lang==='es-es'?12:4;
     if(masculine.test(name))score+=6;
     if(feminine.test(name))score-=9;
     if(/natural|enhanced|premium|google/.test(name))score+=1;
     if(voice.localService)score+=0.25;
     return {voice,score,index};
   })
   .sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.voice;
}

/** User-visible diagnostics; a missing Web Speech API cannot be solved by claiming microphone permission. */
export function jarvisDictationProblem(error:string):string {
  switch(String(error||'').toLowerCase()){
    case 'not-allowed': return 'El micrófono está denegado para esta página. Permítalo desde los ajustes del sitio y vuelva a pulsar Dictar.';
    case 'service-not-allowed': return 'El servicio de reconocimiento de voz está bloqueado por el navegador. Puede escribir o utilizar el dictado del teclado del dispositivo.';
    case 'audio-capture': return 'El navegador no encuentra ningún micrófono disponible. Compruebe la entrada de sonido del equipo.';
    case 'network': return 'El reconocimiento de voz no ha podido conectarse. Puede seguir escribiendo; no se ha enviado ningún audio ni mensaje.';
    case 'no-speech': return 'No se ha detectado voz. Acerque el micrófono y vuelva a intentarlo.';
    case 'language-not-supported': return 'Este navegador no ofrece reconocimiento de voz en español de España.';
    case 'aborted': return 'Dictado detenido.';
    default: return 'No se pudo completar el dictado. Revise los permisos de micrófono o utilice el dictado del teclado.';
  }
}
