import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,RotateCcw,Settings,Volume2} from 'lucide-react';
import {preferredSpanishVoice,spanishVoices,speechSynthesisSupported} from './cerebroVoice';
import './cerebro-voice-settings.css';

const VOICE_STORAGE_KEY='cerebro_console_voice_id_v1';
const SPEED_STORAGE_KEY='cerebro_console_voice_speed_v1';
type VoiceSpeed='normal'|'fast';

function voiceId(voice:SpeechSynthesisVoice){
 return voice.voiceURI||`${voice.name}:${voice.lang}`;
}

function storedVoiceId(){
 try{return window.localStorage.getItem(VOICE_STORAGE_KEY)||''}catch{return ''}
}

function storedSpeed():VoiceSpeed{
 try{return window.localStorage.getItem(SPEED_STORAGE_KEY)==='fast'?'fast':'normal'}catch{return 'normal'}
}

function resolveSelectedVoice(voices:SpeechSynthesisVoice[]){
 const selectedId=storedVoiceId();
 return voices.find(voice=>voiceId(voice)===selectedId)||preferredSpanishVoice(voices)||null;
}

function persistVoice(id:string){
 try{
  if(id)window.localStorage.setItem(VOICE_STORAGE_KEY,id);
  else window.localStorage.removeItem(VOICE_STORAGE_KEY);
 }catch{/* preference remains session-local */}
}

function persistSpeed(speed:VoiceSpeed){
 try{window.localStorage.setItem(SPEED_STORAGE_KEY,speed)}catch{/* preference remains session-local */}
}

function installSpeechPreferenceBridge(){
 if(!speechSynthesisSupported())return()=>{};
 const synth=window.speechSynthesis;
 const originalSpeak=synth.speak.bind(synth);
 const bridgedSpeak=(utterance:SpeechSynthesisUtterance)=>{
  const voices=spanishVoices();
  const selected=resolveSelectedVoice(voices);
  if(selected){utterance.voice=selected;utterance.lang=selected.lang||'es-ES'}
  if(storedSpeed()==='fast')utterance.rate=Math.min(1.3,Math.max(0.75,utterance.rate*1.12));
  originalSpeak(utterance);
 };
 try{
  synth.speak=bridgedSpeak;
  return()=>{
   try{if(synth.speak===bridgedSpeak)synth.speak=originalSpeak}catch{/* browser owns this API */}
  };
 }catch{return()=>{}}
}

export function CerebroVoiceSettings(){
 const [open,setOpen]=useState(false);
 const [voicesOpen,setVoicesOpen]=useState(true);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>(()=>spanishVoices());
 const [selectedId,setSelectedId]=useState(()=>storedVoiceId());
 const [speed,setSpeed]=useState<VoiceSpeed>(()=>storedSpeed());
 const rootRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>installSpeechPreferenceBridge(),[]);

 useEffect(()=>{
  if(!speechSynthesisSupported())return;
  const refresh=()=>setVoices(spanishVoices());
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged',refresh);
  const timer=window.setTimeout(refresh,250);
  return()=>{
   window.clearTimeout(timer);
   window.speechSynthesis.removeEventListener?.('voiceschanged',refresh);
  };
 },[]);

 useEffect(()=>{
  if(!open)return;
  const closeOnPointer=(event:PointerEvent)=>{
   if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false);
  };
  const closeOnKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  document.addEventListener('pointerdown',closeOnPointer);
  document.addEventListener('keydown',closeOnKey);
  return()=>{
   document.removeEventListener('pointerdown',closeOnPointer);
   document.removeEventListener('keydown',closeOnKey);
  };
 },[open]);

 const recommended=useMemo(()=>preferredSpanishVoice(voices)||null,[voices]);
 const effectiveSelected=useMemo(()=>voices.find(voice=>voiceId(voice)===selectedId)||recommended,[voices,selectedId,recommended]);

 function chooseVoice(voice:SpeechSynthesisVoice){
  const id=voiceId(voice);
  setSelectedId(id);
  persistVoice(id);
 }

 function resetVoice(){
  setSelectedId('');
  persistVoice('');
 }

 function chooseSpeed(next:VoiceSpeed){
  setSpeed(next);
  persistSpeed(next);
 }

 function preview(voice:SpeechSynthesisVoice){
  if(!speechSynthesisSupported())return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance('Hola, soy CEREBRO. Esta es mi voz.');
  utterance.voice=voice;
  utterance.lang=voice.lang||'es-ES';
  utterance.rate=speed==='fast'?1.12:1;
  window.speechSynthesis.speak(utterance);
 }

 return <div className="cerebro-settings" ref={rootRef}>
  <button type="button" className={`cerebro-settings-trigger ${open?'is-open':''}`} onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-haspopup="dialog">
   <Settings size={17}/><span>Ajustes</span>
  </button>
  {open?<div className="cerebro-settings-panel" role="dialog" aria-label="Ajustes de CEREBRO">
   <div className="cerebro-settings-head"><div><strong>Ajustes</strong><small>Se aplican al instante</small></div></div>

   <button type="button" className="cerebro-settings-section-toggle" onClick={()=>setVoicesOpen(value=>!value)} aria-expanded={voicesOpen}>
    <span><Volume2 size={17}/>Voz de CEREBRO</span><ChevronDown size={16}/>
   </button>

   {voicesOpen?<div className="cerebro-voice-picker">
    {voices.length===0?<div className="cerebro-voice-empty">No hay voces españolas disponibles en este navegador.</div>:<div className="cerebro-voice-list" role="listbox" aria-label="Voces disponibles">
     {voices.map((voice,index)=>{
      const id=voiceId(voice);
      const selected=effectiveSelected?voiceId(effectiveSelected)===id:false;
      return <div className={`cerebro-voice-option ${selected?'is-selected':''}`} key={id} role="option" aria-selected={selected}>
       <button type="button" className="cerebro-voice-choice" onClick={()=>chooseVoice(voice)}>
        <span className="cerebro-voice-check">{selected?<Check size={15}/>:null}</span>
        <span><strong>Voz {index+1}</strong><small>{voice.name} · {voice.lang||'es'}</small></span>
       </button>
       <button type="button" className="cerebro-voice-preview" onClick={()=>preview(voice)} aria-label={`Escuchar Voz ${index+1}`} title="Escuchar"><Volume2 size={16}/></button>
      </div>;
     })}
    </div>}
    <button type="button" className="cerebro-voice-reset" onClick={resetVoice} disabled={!selectedId}><RotateCcw size={14}/> Usar recomendada</button>
   </div>:null}

   <div className="cerebro-speed-row">
    <span><strong>Velocidad</strong><small>Respuesta hablada</small></span>
    <div className="cerebro-speed-options" role="group" aria-label="Velocidad de voz">
     <button type="button" className={speed==='normal'?'is-active':''} onClick={()=>chooseSpeed('normal')}>Normal</button>
     <button type="button" className={speed==='fast'?'is-active':''} onClick={()=>chooseSpeed('fast')}>Rápida</button>
    </div>
   </div>
  </div>:null}
 </div>;
}
