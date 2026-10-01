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

export function voiceSpeechProfile(preferences:Record<string,string>={}){
 const rawRate=Number(preferences.speech_rate??0.96);
 const rawPitch=Number(preferences.speech_pitch??1.04);
 return{
  rate:Number.isFinite(rawRate)?Math.min(1.3,Math.max(0.75,rawRate)):0.96,
  pitch:Number.isFinite(rawPitch)?Math.min(1.25,Math.max(0.8,rawPitch)):1.04
 };
}

export function speechText(text:string,maxChars=700){
 const clean=text
  .replace(/https?:\/\/[^\s]+/gi,' enlace disponible en pantalla ')
  .replace(/\s+/g,' ')
  .trim();
 if(clean.length<=maxChars)return clean;
 const clipped=clean.slice(0,maxChars);
 const boundaries=[clipped.lastIndexOf('. '),clipped.lastIndexOf('? '),clipped.lastIndexOf('! '),clipped.lastIndexOf('; ')];
 const boundary=Math.max(...boundaries);
 const end=boundary>=Math.floor(maxChars*0.55)?boundary+1:maxChars;
 return `${clipped.slice(0,end).trim()} Tengo más detalle en pantalla.`;
}

export type CerebroSpokenMode='normal'|'action';

function cleanSpokenUnit(value:string){
 return value
  .replace(/^\s*(?:[-*•]|\d+[.)])\s+/u,'')
  .replace(/\s+/g,' ')
  .trim();
}

function spokenUnits(text:string){
 const withoutLinks=text
  .replace(/https?:\/\/[^\s]+/gi,' ')
  .replace(/[*_`#]/g,'')
  .replace(/(?:^|\s)\d+[.)]\s+/g,' ')
  .replace(/\r/g,'');
 return withoutLinks
  .split(/\n+|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u)
  .map(cleanSpokenUnit)
  .filter(Boolean)
  .filter(unit=>!/^propuesta exacta de env[ií]o:?$/i.test(unit));
}

function conciseSpokenUnits(units:string[],maxChars:number,maxUnits:number){
 const chosen:string[]=[];
 let total=0;
 for(const unit of units){
  const extra=(chosen.length?1:0)+unit.length;
  if(chosen.length&&total+extra>maxChars)break;
  chosen.push(unit);
  total+=extra;
  if(chosen.length>=maxUnits)break;
 }
 return chosen;
}

export function spokenResponseText(text:string,maxChars=420,mode:CerebroSpokenMode='normal'){
 const raw=text.trim();
 if(!raw)return '';
 const linkMatches=raw.match(/https?:\/\/[^\s]+/gi)??[];
 const units=spokenUnits(raw);
 if(!units.length){
  return linkMatches.length
   ?(linkMatches.length===1?'Te dejo el enlace por escrito.':'Te dejo los enlaces por escrito.')
   :'';
 }

 if(mode==='action'){
  const finalQuestion=[...units].reverse().find(unit=>/\?$/.test(unit)&&/(confirm|quieres|activo|env[ií]o|activar)/i.test(unit));
  const core=units
   .filter(unit=>unit!==finalQuestion)
   .filter(unit=>!/^(no he enviado nada|todav[ií]a no he enviado nada)/i.test(unit));
  const chosen=conciseSpokenUnits(core,Math.max(220,maxChars-120),2);
  const parts=[...chosen];
  if(linkMatches.length)parts.push(linkMatches.length===1?'Te dejo el enlace por escrito.':'Te dejo los enlaces por escrito.');
  if(finalQuestion)parts.push(finalQuestion);
  else if(core.length>chosen.length)parts.push('Te dejo el detalle completo por escrito.');
  return parts.join(' ').replace(/\s+/g,' ').trim();
 }

 const chosen=conciseSpokenUnits(units,maxChars,2);
 const omitted=units.length>chosen.length;
 const parts=[...chosen];
 if(linkMatches.length)parts.push(linkMatches.length===1?'Te dejo el enlace por escrito.':'Te dejo los enlaces por escrito.');
 if(omitted)parts.push('Te dejo el detalle completo por escrito.');
 return parts.join(' ').replace(/\s+/g,' ').trim();
}
export type CerebroSpeechSegment={
 text:string;
 rate:number;
 pitch:number;
};

function clampVoice(value:number,min:number,max:number){
 return Math.min(max,Math.max(min,value));
}

export function speechSegments(text:string,maxChars=420,preferences:Record<string,string>={},mode:CerebroSpokenMode='normal'):CerebroSpeechSegment[]{
 const spoken=spokenResponseText(text,maxChars,mode);
 if(!spoken)return [];
 const base=voiceSpeechProfile(preferences);
 const parts=(spoken.match(/[^.!?;:]+[.!?;:]?/g)||[spoken])
  .map(part=>part.trim())
  .filter(Boolean);
 return parts.map((part,index)=>{
  const normalized=normalizeVoiceConfirmation(part);
  let rate=base.rate;
  let pitch=base.pitch;

  // Keep the user's chosen overall rhythm; vary only locally for natural prosody.
  if(/^(vale|perfecto|bien|entendido|confirmado|hecho)\b/.test(normalized)&&part.length<140){
   rate+=0.035;
   pitch+=0.018;
  }
  if(part.endsWith('?')){
   rate+=0.012;
   pitch+=0.045;
  }
  if(/\b(no voy|no puedo|riesgo|seguridad|confirmas|firma|pago|bloqueado|error|human_required|atencion|atención)\b/.test(normalized)){
   rate-=0.035;
   pitch-=0.018;
  }
  if(/^\s*(?:\d+[.)]|[-•])/.test(part)||/\b(primero|segundo|tercero|paso \d+)\b/.test(normalized)){
   rate-=0.015;
  }
  if(part.length>180)rate-=0.012;
  if(index===parts.length-1&&!part.endsWith('?'))pitch-=0.008;

  return{
   text:part,
   rate:clampVoice(rate,0.82,1.18),
   pitch:clampVoice(pitch,0.88,1.16)
  };
 });
}

