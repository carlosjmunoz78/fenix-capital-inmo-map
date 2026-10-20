import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,RotateCcw,Settings,Volume2} from 'lucide-react';
import {speechSynthesisSupported} from './cerebroVoice';
import './cerebro-voice-settings.css';
import './cerebro-jarvis-hud.css';

const VOICE_STORAGE_KEY='cerebro_console_voice_id_v1';
const SPEED_STORAGE_KEY='cerebro_console_voice_speed_v1';
const VOICE_SLOT_STORAGE_KEY='cerebro_console_voice_slots_v1';
const USER_VOICE_ALIASES:Record<number,string>={1:'Bipi',2:'Trasta',3:'Pablo',4:'Marcos'};
const USER_HIDDEN_SLOT=5;
type VoiceSpeed='normal'|'fast';
type CerebroUtterance=SpeechSynthesisUtterance&{__cerebroPreviewVoice?:boolean};
type VoiceSlots=Record<string,string>;

function voiceId(voice:SpeechSynthesisVoice){
 return voice.voiceURI||`${voice.name}:${voice.lang}`;
}

function storedVoiceId(){
 try{return window.localStorage.getItem(VOICE_STORAGE_KEY)||''}catch{return ''}
}

function storedSpeed():VoiceSpeed{
 try{return window.localStorage.getItem(SPEED_STORAGE_KEY)==='fast'?'fast':'normal'}catch{return 'normal'}
}

function storedVoiceSlots():VoiceSlots{
 try{
  const parsed=JSON.parse(window.localStorage.getItem(VOICE_SLOT_STORAGE_KEY)||'{}');
  return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as VoiceSlots:{};
 }catch{return {}}
}

function persistVoiceSlots(slots:VoiceSlots){
 try{window.localStorage.setItem(VOICE_SLOT_STORAGE_KEY,JSON.stringify(slots))}catch{/* preference remains session-local */}
}

function ensureVoiceSlots(voices:SpeechSynthesisVoice[]){
 const current=storedVoiceSlots();
 const next={...current};
 let changed=false;
 for(let slot=1;slot<=USER_HIDDEN_SLOT;slot+=1){
  const voice=voices[slot-1];
  if(!voice||next[String(slot)])continue;
  next[String(slot)]=voiceId(voice);
  changed=true;
 }
 if(changed)persistVoiceSlots(next);
 return next;
}

function slotForVoice(id:string,slots:VoiceSlots){
 const entry=Object.entries(slots).find(([,storedId])=>storedId===id);
 return entry?Number(entry[0]):null;
}

function aliasForVoice(id:string,slots:VoiceSlots){
 const slot=slotForVoice(id,slots);
 return slot?USER_VOICE_ALIASES[slot]||'':'';
}

function availableVoices(){
 if(!speechSynthesisSupported())return [] as SpeechSynthesisVoice[];
 return [...window.speechSynthesis.getVoices()].sort((a,b)=>{
  const aSpanish=String(a.lang||'').toLowerCase().startsWith('es')?0:1;
  const bSpanish=String(b.lang||'').toLowerCase().startsWith('es')?0:1;
  if(aSpanish!==bSpanish)return aSpanish-bSpanish;
  const byLang=String(a.lang||'').localeCompare(String(b.lang||''),'es');
  return byLang||String(a.name||'').localeCompare(String(b.name||''),'es');
 });
}

function selectedVoice(voices:SpeechSynthesisVoice[]){
 const selectedId=storedVoiceId();
 if(!selectedId)return null;
 return voices.find(voice=>voiceId(voice)===selectedId)||null;
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
  if((utterance as CerebroUtterance).__cerebroPreviewVoice){originalSpeak(utterance);return}
  const selected=selectedVoice(availableVoices());
  if(selected){
   utterance.voice=selected;
   utterance.lang=selected.lang||utterance.lang||'es-ES';
  }
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
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>(()=>availableVoices());
 const [voiceSlots,setVoiceSlots]=useState<VoiceSlots>(()=>ensureVoiceSlots(availableVoices()));
 const [selectedId,setSelectedId]=useState(()=>storedVoiceId());
 const [speed,setSpeed]=useState<VoiceSpeed>(()=>storedSpeed());
 const rootRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>installSpeechPreferenceBridge(),[]);

 useEffect(()=>{
  if(!speechSynthesisSupported())return;
  let cancelled=false;
  const timers:number[]=[];
  const refresh=()=>{
   if(cancelled)return;
   const next=availableVoices();
   const slots=ensureVoiceSlots(next);
   setVoices(next);
   setVoiceSlots(slots);
   if(next.length>0){
    const current=storedVoiceId();
    const hiddenId=slots[String(USER_HIDDEN_SLOT)]||'';
    if(current===hiddenId||current&&!next.some(voice=>voiceId(voice)===current)){
     persistVoice('');
     setSelectedId('');
    }
   }
  };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged',refresh);
  for(const delay of [150,400,900,1800,3200])timers.push(window.setTimeout(refresh,delay));
  return()=>{
   cancelled=true;
   for(const timer of timers)window.clearTimeout(timer);
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

 const visibleVoices=useMemo(()=>{
  const hiddenId=voiceSlots[String(USER_HIDDEN_SLOT)]||'';
  return voices.filter(voice=>voiceId(voice)!==hiddenId);
 },[voices,voiceSlots]);
 const effectiveSelected=useMemo(()=>visibleVoices.find(voice=>voiceId(voice)===selectedId)||null,[visibleVoices,selectedId]);

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
  const alias=aliasForVoice(voiceId(voice),voiceSlots);
  const utterance=new SpeechSynthesisUtterance(alias?`Hola, soy ${alias}. Esta es mi voz para CEREBRO.`:'Hola, soy CEREBRO. Esta es mi voz.') as CerebroUtterance;
  utterance.__cerebroPreviewVoice=true;
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
    <div className="cerebro-voice-selection-status">
     <strong>{effectiveSelected?'Voz elegida por ti':'Catálogo de voces'}</strong>
     <small>{effectiveSelected?`${aliasForVoice(voiceId(effectiveSelected),voiceSlots)?`${aliasForVoice(voiceId(effectiveSelected),voiceSlots)} — `:''}${effectiveSelected.name} · ${effectiveSelected.lang||'idioma no indicado'}`:`${visibleVoices.length} ${visibleVoices.length===1?'voz disponible':'voces disponibles'} · la voz descartada está oculta`}</small>
    </div>
    {visibleVoices.length===0?<div className="cerebro-voice-empty">El navegador todavía no ha publicado sus voces. CEREBRO seguirá reintentando durante unos segundos.</div>:<div className="cerebro-voice-list" role="listbox" aria-label="Voces disponibles en este navegador y dispositivo">
     {visibleVoices.map((voice,index)=>{
      const id=voiceId(voice);
      const selected=selectedId===id;
      const alias=aliasForVoice(id,voiceSlots);
      return <div className={`cerebro-voice-option ${selected?'is-selected':''}`} key={id} role="option" aria-selected={selected}>
       <button type="button" className="cerebro-voice-choice" onClick={()=>chooseVoice(voice)}>
        <span className="cerebro-voice-check">{selected?<Check size={15}/>:null}</span>
        <span><strong>{alias?`${alias} — `:''}{voice.name||`Voz ${index+1}`}</strong><small>{voice.lang||'idioma no indicado'} · {voice.localService?'dispositivo':'navegador/red'}</small></span>
       </button>
       <button type="button" className="cerebro-voice-preview" onClick={()=>preview(voice)} aria-label={`Escuchar ${alias||voice.name||`Voz ${index+1}`}`} title="Probar esta voz"><Volume2 size={16}/></button>
      </div>;
     })}
    </div>}
    <button type="button" className="cerebro-voice-reset" onClick={resetVoice} disabled={!selectedId}><RotateCcw size={14}/> Quitar selección</button>
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
