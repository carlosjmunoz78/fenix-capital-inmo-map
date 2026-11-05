/**
 * CEREBRO / JARVIS temporary zero-API-fee browser voice.
 * Google es-ES voice when the browser exposes it; otherwise any es-ES,
 * then another Spanish locale. Does not change ANA or the global voice profile.
 * No cloned-voice provider or secret. Availability varies by browser/device.
 */
export type BrowserVoiceCandidate={name:string;lang:string;localService?:boolean};
export function selectCerebroFreeBrowserVoice<T extends BrowserVoiceCandidate>(voices:readonly T[]):T|undefined{
 if(!Array.isArray(voices)||voices.length===0)return undefined;
 const matches=voices.map((voice,index)=>{
  const lang=String(voice?.lang??'').toLowerCase().replace(/_/g,'-');
  const name=String(voice?.name??'').toLowerCase();
  if(!lang.startsWith('es'))return null;
  const google=/(^|\s)google(\s|$)/.test(name);
  const spanishSpain=lang==='es-es';
  const female=/(elvira|helena|laura|lucia|lucía|monica|mónica|paulina|sabina|sofia|sofía|carmen|marisol|paloma)/.test(name);
  return {voice,index,score:(google?100:0)+(spanishSpain?30:0)+(female?5:0)+(voice.localService?1:0)};
 }).filter((x):x is {voice:T;index:number;score:number}=>x!==null);
 return matches.sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.voice;
}
