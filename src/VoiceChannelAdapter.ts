export type VoiceChannelId='ana_voice'|'console_voice'|'telegram_voice'|'whatsapp_voice'|'phone_voice'|'web_widget_voice';
export type VoiceState='idle'|'listening'|'speaking'|'error';

type RecognitionResultLike={isFinal:boolean;0:{transcript:string}};
type RecognitionEventLike={resultIndex:number;results:ArrayLike<RecognitionResultLike>};
type RecognitionErrorLike={error?:string};
type RecognitionLike={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:RecognitionEventLike)=>void)|null;onerror:((event:RecognitionErrorLike)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type RecognitionCtor=new()=>RecognitionLike;
type VoiceWindow=Window&{SpeechRecognition?:RecognitionCtor;webkitSpeechRecognition?:RecognitionCtor};

export const VOICE_OWNER='VOICE-001' as const;
export const VOICE_CONTRACT_VERSION='1.0.0' as const;
export const VOICE_CHANNEL_REGISTRY={
 ana_voice:{owner:VOICE_OWNER,active:true,transport:'browser_speech_to_existing_text_submit'},
 console_voice:{owner:VOICE_OWNER,active:true,transport:'browser_speech_to_existing_text_submit'},
 telegram_voice:{owner:VOICE_OWNER,active:true,transport:'existing_backend_adapter'},
 whatsapp_voice:{owner:VOICE_OWNER,active:false,transport:'future_adapter'},
 phone_voice:{owner:VOICE_OWNER,active:false,transport:'future_adapter'},
 web_widget_voice:{owner:VOICE_OWNER,active:false,transport:'future_adapter'}
} as const;

function recognitionCtor():RecognitionCtor|null{
 if(typeof window==='undefined')return null;
 const w=window as VoiceWindow;
 return w.SpeechRecognition||w.webkitSpeechRecognition||null;
}

export function voiceRecognitionSupported(){return Boolean(recognitionCtor())}
export function voiceSynthesisSupported(){return typeof window!=='undefined'&&'speechSynthesis'in window&&typeof SpeechSynthesisUtterance!=='undefined'}

export type VoiceSession={
 channel:VoiceChannelId;
 state:VoiceState;
 supported:boolean;
 interim:string;
 error:string;
 start:()=>void;
 stop:()=>void;
 abort:()=>void;
 speak:(text:string,opts?:{rate?:number;pitch?:number})=>void;
 stopSpeaking:()=>void;
 destroy:()=>void;
};

export function createVoiceSession(options:{
 channel:VoiceChannelId;
 onFinalText:(text:string)=>void;
 onInterimText?:(text:string)=>void;
 onState?:(state:VoiceState)=>void;
 onError?:(message:string)=>void;
 locale?:string;
}):VoiceSession{
 let recognition:RecognitionLike|null=null;
 let state:VoiceState='idle';
 let interim='';
 let error='';
 let finalBuffer='';
 let delivered=false;
 const supported=voiceRecognitionSupported();
 const setState=(next:VoiceState)=>{state=next;options.onState?.(next)};
 const setError=(message:string)=>{error=message;setState('error');options.onError?.(message)};
 const deliver=()=>{
  const text=finalBuffer.replace(/\s+/g,' ').trim();
  if(!text||delivered)return;
  delivered=true;
  options.onFinalText(text);
 };
 const start=()=>{
  const Ctor=recognitionCtor();
  if(!Ctor){setError('Este navegador no ofrece reconocimiento de voz compatible. Puedes seguir escribiendo.');return}
  recognition?.abort();
  finalBuffer='';interim='';error='';delivered=false;
  const next=new Ctor();
  next.lang=options.locale||'es-ES';
  next.continuous=false;
  next.interimResults=true;
  next.onresult=event=>{
   let currentInterim='';
   for(let i=event.resultIndex;i<event.results.length;i+=1){
    const result=event.results[i];
    const text=result?.[0]?.transcript||'';
    if(result?.isFinal)finalBuffer+=`${text} `;else currentInterim+=text;
   }
   interim=currentInterim;
   options.onInterimText?.(currentInterim);
   if(finalBuffer.trim())deliver();
  };
  next.onerror=event=>{
   const code=event?.error||'unknown';
   const message=code==='not-allowed'?'No hay permiso para usar el micrófono. Actívalo en el navegador y vuelve a intentarlo.':code==='no-speech'?'No se ha detectado voz. Vuelve a intentarlo.':'El reconocimiento de voz se ha interrumpido. Puedes continuar escribiendo.';
   setError(message);
  };
  next.onend=()=>{deliver();interim='';options.onInterimText?.('');if(state!=='error')setState('idle')};
  recognition=next;
  try{next.start();setState('listening')}catch{setError('No se pudo iniciar el micrófono. Espera un instante y vuelve a intentarlo.')}
 };
 const stop=()=>{recognition?.stop();if(state==='listening')setState('idle')};
 const abort=()=>{recognition?.abort();recognition=null;finalBuffer='';interim='';delivered=true;options.onInterimText?.('');if(state!=='speaking')setState('idle')};
 const stopSpeaking=()=>{if(voiceSynthesisSupported())window.speechSynthesis.cancel();if(state==='speaking')setState('idle')};
 const speak=(text:string,opts?:{rate?:number;pitch?:number})=>{
  const value=text.trim();
  if(!value||!voiceSynthesisSupported())return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(value);
  utterance.lang=options.locale||'es-ES';
  utterance.rate=opts?.rate??1.02;
  utterance.pitch=opts?.pitch??1;
  utterance.onstart=()=>setState('speaking');
  utterance.onend=()=>setState('idle');
  utterance.onerror=()=>setState('idle');
  window.speechSynthesis.speak(utterance);
 };
 const destroy=()=>{abort();stopSpeaking()};
 return {channel:options.channel,get state(){return state},supported,get interim(){return interim},get error(){return error},start,stop,abort,speak,stopSpeaking,destroy};
}
