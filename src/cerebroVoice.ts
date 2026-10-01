export const VOICE_CONFIRMATION_CONFIDENCE_MIN=0.85;
export const VOICE_CONFIRMATION_PHRASES=new Set(['si','si adelante','adelante','confirmo','activalo','activarlo','hazlo','procede']);
export const CEREBRO_VOICE_CONTEXT_HINTS=[
 'CEREBRO','Fénix','Fénix Capital','Fénix Inmobiliaria','Belén','SEO','SEO local',
 'Supabase','Notion','Brevo','Buffer','Facebook','Instagram','LinkedIn',
 'hipoteca','hipotecas','inmobiliaria','inmobiliarias','expediente','expedientes'
];

export type CerebroSpeechRecognitionResult={
 transcript:string;
 confidence:number|null;
};

type RecognitionAlternative={transcript:string;confidence?:number};
type RecognitionResult={length:number;isFinal?:boolean;[index:number]:RecognitionAlternative};
type RecognitionEventLike=Event&{results:{length:number;[index:number]:RecognitionResult}};
type RecognitionErrorEventLike=Event&{error?:string;message?:string};

export type CerebroSpeechRecognition={
 lang:string;
 continuous:boolean;
 interimResults:boolean;
 maxAlternatives:number;
 onstart:((event:Event)=>void)|null;
 onresult:((event:RecognitionEventLike)=>void)|null;
 onerror:((event:RecognitionErrorEventLike)=>void)|null;
 onend:((event:Event)=>void)|null;
 start:()=>void;
 stop:()=>void;
 abort:()=>void;
};

type RecognitionCtor=new()=>CerebroSpeechRecognition;
type SpeechRecognitionPhraseCtor=new(phrase:string,boost?:number)=>unknown;
type VoiceWindow=Window&typeof globalThis&{
 SpeechRecognition?:RecognitionCtor;
 webkitSpeechRecognition?:RecognitionCtor;
 SpeechRecognitionPhrase?:SpeechRecognitionPhraseCtor;
};

function voiceWindow(){
 return window as VoiceWindow;
}

export function voiceRecognitionSupported(){
 if(typeof window==='undefined')return false;
 const target=voiceWindow();
 return Boolean(target.SpeechRecognition||target.webkitSpeechRecognition);
}

export function createVoiceRecognition(){
 if(typeof window==='undefined')return null;
 const target=voiceWindow();
 const Ctor=target.SpeechRecognition||target.webkitSpeechRecognition;
 return Ctor?new Ctor():null;
}

export function applyVoiceContextHints(recognition:CerebroSpeechRecognition){
 if(typeof window==='undefined')return false;
 const target=voiceWindow();
 const PhraseCtor=target.SpeechRecognitionPhrase;
 if(!PhraseCtor||!('phrases' in recognition))return false;
 try{
  (recognition as CerebroSpeechRecognition&{phrases:unknown[]}).phrases=CEREBRO_VOICE_CONTEXT_HINTS.map(phrase=>new PhraseCtor(phrase,5));
  return true;
 }catch{return false}
}

export function speechSynthesisSupported(){
 return typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
}

export function spanishVoices(){
 if(!speechSynthesisSupported())return [] as SpeechSynthesisVoice[];
 return window.speechSynthesis.getVoices().filter(voice=>String(voice.lang||'').toLowerCase().startsWith('es'));
}

export function normalizeVoiceConfirmation(text:string){
 return text.trim().toLocaleLowerCase('es-ES')
  .replace(/[áàäâ]/g,'a')
  .replace(/[éèëê]/g,'e')
  .replace(/[íìïî]/g,'i')
  .replace(/[óòöô]/g,'o')
  .replace(/[úùüû]/g,'u')
  .replace(/[¿?¡!.,;:]/g,'')
  .replace(/\s+/g,' ');
}

export function voiceNeedsManualConfirmation(text:string,confidence:number|null,hasPendingAction:boolean){
 if(!hasPendingAction)return false;
 if(!VOICE_CONFIRMATION_PHRASES.has(normalizeVoiceConfirmation(text)))return false;
 return confidence===null||!Number.isFinite(confidence)||confidence<VOICE_CONFIRMATION_CONFIDENCE_MIN;
}

export function speechText(text:string){
 const clean=text
  .replace(/https?:\/\/[^\s]+/gi,' enlace disponible en pantalla ')
  .replace(/\s+/g,' ')
  .trim();
 return clean.length>1600?`${clean.slice(0,1597)}…`:clean;
}
