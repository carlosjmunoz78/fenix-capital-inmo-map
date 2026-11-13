import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
import type {CerebroSpeechRecognition} from './cerebroVoice';

type LocalRecognition=CerebroSpeechRecognition&{processLocally:boolean};
type Options={langs:string[];processLocally:true};
type Availability='available'|'downloadable'|'downloading'|'unavailable';
type LocalCtor={
 new():LocalRecognition;
 available?:(options:Options)=>Promise<Availability>;
 install?:(options:Options)=>Promise<boolean>;
};
type LocalWindow=Window&typeof globalThis&{SpeechRecognition?:LocalCtor};
const OPTIONS:Options={langs:['es-ES'],processLocally:true};
function ctor():LocalCtor|undefined{return(typeof window==='undefined'?undefined:(window as LocalWindow).SpeechRecognition)}
const MAX_MS=15000;
export default function CerebroLocalDictation({allowed,onTranscript}:{allowed:boolean;onTranscript:(text:string)=>void}){
 const[status,setStatus]=useState('Sin comprobar');
 const[working,setWorking]=useState(false);
 const[listening,setListening]=useState(false);
 const recognition=useRef<LocalRecognition|null>(null);
 const timer=useRef<number|null>(null);
 const generation=useRef(0);
 function stop(){
  generation.current++;
  if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null}
  const rec=recognition.current;recognition.current=null;
  if(rec){try{rec.abort()}catch{/* already ended */}}
  setListening(false);setWorking(false);
 }
 useEffect(()=>()=>{generation.current++;
  if(timer.current!==null)window.clearTimeout(timer.current);
  try{recognition.current?.abort()}catch{/* finished */}
 },[]);
 useEffect(()=>{if(!allowed)stop()},[allowed]);
 async function start(){
  if(!allowed||working)return;
  const Ctor=ctor();
  if(!Ctor||typeof Ctor.available!=='function'||typeof Ctor.install!=='function'){
   setStatus('Este navegador no ofrece dictado local. El micrófono sí funciona, pero falta un motor local compatible.');
   return;
  }
  setWorking(true);const current=++generation.current;
  try{
   const availability=await Ctor.available(OPTIONS);
   if(current!==generation.current)return;
   if(availability==='unavailable'){
    setStatus('El paquete de español de reconocimiento local no está disponible en este navegador.');
    setWorking(false);return;
   }
   if(availability==='downloading'){
    setStatus('El paquete de español se está descargando. Vuelve a pulsar el botón cuando termine.');
    setWorking(false);return;
   }
   if(availability==='downloadable'){
    setStatus('Instalando el paquete de español en Chrome. Solo se descargan recursos del navegador; tu voz no se envía a CEREBRO.');
    const installed=await Ctor.install(OPTIONS);
    if(current!==generation.current)return;
    setStatus(installed?'Paquete español instalado. Pulsa otra vez «Dictado local» y habla.':'Chrome no ha podido instalar el paquete de español. Comprueba permisos o políticas del navegador.');
    setWorking(false);return;
   }
   const rec=new Ctor();
   rec.lang='es-ES';rec.processLocally=true;
   rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=1;
   recognition.current=rec;
   rec.onstart=()=>{if(current===generation.current){setListening(true);setStatus('Te escucho en español desde el dispositivo. Di una frase corta…')}};
   rec.onresult=event=>{
    if(current!==generation.current||recognition.current!==rec)return;
    const text=String(event.results[event.results.length-1]?.[0]?.transcript||'').trim().slice(0,600);
    if(text&&allowed){onTranscript(text);setStatus('Texto reconocido y colocado en el campo. Revísalo y pulsa Enviar cuando quieras.')}
    else setStatus('No he detectado palabras. Prueba a hablar un poco más cerca.');
    stop();
   };
   rec.onerror=event=>{
    if(current!==generation.current||recognition.current!==rec)return;
    const code=String(event.error||'desconocido');
    setStatus(code==='language-not-supported'?'Español local no instalado. Cierra y vuelve a activar el paquete.':
     code==='not-allowed'?'Permiso de micrófono denegado para el reconocimiento local.':
     code==='no-speech'?'El navegador no ha detectado palabras.':
     'Error del motor local: '+code+'. No se ha enviado nada al chat.');
    stop();
   };
   rec.onend=()=>{
    if(current!==generation.current||recognition.current!==rec)return;
    setStatus(s=>s.startsWith('Te escucho')?'La escucha terminó sin transcripción. Prueba otra vez.':s);
    stop();
   };
   setStatus('Iniciando dictado local…');
   rec.start();
   timer.current=window.setTimeout(()=>{
    if(generation.current===current&&recognition.current===rec){
     setStatus('El reconocimiento local no ha respondido en 15 segundos. Se ha detenido; no se enviaron instrucciones.');
     stop();
    }
   },MAX_MS);
  }catch(error){
   if(current!==generation.current)return;
   const reason=error instanceof Error?error.name:'error desconocido';
   setStatus('No se pudo iniciar el reconocimiento local: '+reason+'.');
   stop();
  }
 }
 return <div className="op3-local-dictation">
  <button type="button" disabled={!allowed||working&&!listening}
   onClick={()=>listening?stop():void start()}
   aria-label={listening?'Detener dictado local':'Dictado local en español'}>
   {listening?<Square size={15}/>:<Mic size={15}/>}
   {listening?'Detener dictado local':'Dictado local (español)'}
  </button>
  <span role="status" aria-live="polite">{status}</span>
  <p>Opción experimental sin cuotas: Chrome puede descargar un paquete de español una sola vez. El reconocimiento se realiza en el dispositivo. Solo añade texto al campo; no envía mensajes ni confirma acciones.</p>
 </div>;
}
