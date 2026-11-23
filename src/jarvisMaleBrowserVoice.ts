/**
 * Temporary and optional browser fallback for JARVIS only.
 * This is NOT the approved vidIQ VOICE-001 voice or the JARVIS V2 model.
 * Never mutate shared/ANA voice routing or infer gender from locale alone.
 */
export type BrowserVoice={name:string;lang:string;localService?:boolean};
const MALE_HINTS=['pablo','jorge','alvaro','álvaro','diego','miguel','raul','raúl','enrique','antonio','felipe','spanish male','español hombre','male'];
const FEMININE_HINTS=['elvira','helena','laura','lucia','lucía','monica','mónica','paulina','sabina','sofia','sofía','carmen','marisol','paloma','female'];

export function preferredJarvisMaleBrowserVoice<T extends BrowserVoice>(voices:readonly T[]):T|undefined{
 const filtered=voices
  .map((voice,index)=>{
   const name=String(voice?.name||'').toLocaleLowerCase('es-ES');
   const lang=String(voice?.lang||'').toLocaleLowerCase('es-ES').replace(/_/g,'-');
   if(!lang.startsWith('es')||FEMININE_HINTS.some(hint=>name.includes(hint)))return null;
   const knownMale=MALE_HINTS.some(hint=>name.includes(hint));
   if(!knownMale)return null; // no assumed gender from language or voice label
   return{voice,index,score:(lang==='es-es'?100:0)+(voice.localService?2:0)};
  })
  .filter((item):item is {voice:T;index:number;score:number}=>item!==null);
 return filtered.sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.voice;
}
