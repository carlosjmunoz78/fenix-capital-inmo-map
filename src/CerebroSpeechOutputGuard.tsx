import {useEffect} from 'react';

const CEREBRO_CONSOLE_DATASET_KEY='cerebroConsole';
const PREROLL_MAX_CHARS=48;
const PREROLL_VOLUME=0.001;

function consoleVoiceActive(){
 return document.documentElement.dataset[CEREBRO_CONSOLE_DATASET_KEY]==='1';
}

function primerText(text:string){
 const clean=text.replace(/\s+/g,' ').trim();
 if(!clean)return 'CEREBRO';
 const clipped=clean.slice(0,PREROLL_MAX_CHARS);
 const lastSpace=clipped.lastIndexOf(' ');
 return lastSpace>=12?clipped.slice(0,lastSpace):clipped;
}

/**
 * Browser SpeechSynthesis can clip the beginning of the first utterance after
 * cancel()/idle while the audio sink wakes up. CEREBRO primes that sink with a
 * practically inaudible copy of the response prefix, then queues the untouched
 * real utterance. The visible response and the canonical voice loop remain
 * unchanged; this guard is active only while /cerebro owns the document.
 */
export default function CerebroSpeechOutputGuard(){
 useEffect(()=>{
  if(typeof window==='undefined'||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return;
  const synthesis=window.speechSynthesis;
  const originalSpeak=synthesis.speak;
  const originalCancel=synthesis.cancel;
  let needsPreroll=false;

  const guardedCancel:SpeechSynthesis['cancel']=function(){
   if(consoleVoiceActive())needsPreroll=true;
   return originalCancel.call(synthesis);
  };

  const guardedSpeak:SpeechSynthesis['speak']=function(utterance){
   if(consoleVoiceActive()&&needsPreroll&&utterance.text.trim()){
    needsPreroll=false;
    const primer=new SpeechSynthesisUtterance(primerText(utterance.text));
    primer.lang=utterance.lang||'es-ES';
    primer.voice=utterance.voice;
    primer.pitch=utterance.pitch;
    primer.rate=Math.min(1.5,Math.max(0.9,utterance.rate*1.35));
    primer.volume=PREROLL_VOLUME;
    originalSpeak.call(synthesis,primer);
   }
   return originalSpeak.call(synthesis,utterance);
  };

  synthesis.cancel=guardedCancel;
  synthesis.speak=guardedSpeak;

  return()=>{
   if(synthesis.cancel===guardedCancel)synthesis.cancel=originalCancel;
   if(synthesis.speak===guardedSpeak)synthesis.speak=originalSpeak;
  };
 },[]);
 return null;
}
