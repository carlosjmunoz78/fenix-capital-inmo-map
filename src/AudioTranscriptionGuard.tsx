import {useEffect,useRef,useState} from 'react';
import {BookOpen,Check,ClipboardList,Copy,MessageCircle,Mic,MicOff,Send,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import './audio-transcription.css';

type RecognitionResultLike={isFinal:boolean;0:{transcript:string}};
type RecognitionEventLike={resultIndex:number;results:ArrayLike<RecognitionResultLike>};
type RecognitionErrorLike={error?:string};
type RecognitionLike={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:RecognitionEventLike)=>void)|null;onerror:((event:RecognitionErrorLike)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type RecognitionCtor=new()=>RecognitionLike;
type SpeechWindow=Window&{SpeechRecognition?:RecognitionCtor;webkitSpeechRecognition?:RecognitionCtor};
type ActionMode='correct'|'knowledge'|'task'|'ana'|null;

function recognitionConstructor():RecognitionCtor|null{if(typeof window==='undefined')return null;const w=window as SpeechWindow;return w.SpeechRecognition||w.webkitSpeechRecognition||null;}

const ACTIONS=[
 {id:'correct' as const,label:'Corregir',hint:'Corregir un dato, criterio o respuesta',icon:Check},
 {id:'knowledge' as const,label:'Dar conocimiento',hint:'Añadir conocimiento útil de financiación a CEREBRO',icon:BookOpen},
 {id:'task' as const,label:'Tarea',hint:'Preparar una tarea con este contexto',icon:ClipboardList},
 {id:'ana' as const,label:'Hablar con Ana',hint:'Consultar a Ana con contexto de financiación',icon:MessageCircle}
];

export default function AudioTranscriptionGuard(){
 const location=useLocation(),navigate=useNavigate();
 const recognitionRef=useRef<RecognitionLike|null>(null);
 const[open,setOpen]=useState(false),[mode,setMode]=useState<ActionMode>(null),[listening,setListening]=useState(false);
 const[finalText,setFinalText]=useState(''),[interimText,setInterimText]=useState(''),[message,setMessage]=useState('');
 const supported=Boolean(recognitionConstructor());
 const composed=`${finalText}${interimText?` ${interimText}`:''}`.trim();
 useEffect(()=>()=>{recognitionRef.current?.abort();recognitionRef.current=null},[]);
 useEffect(()=>{recognitionRef.current?.abort();recognitionRef.current=null;setListening(false);setInterimText('');setOpen(false);setMode(null)},[location.pathname]);
 function stop(){recognitionRef.current?.stop();setListening(false)}
 function start(){
  const Recognition=recognitionConstructor();
  if(!Recognition){setMessage('Este navegador no ofrece dictado por voz compatible. Puedes escribir igualmente.');setOpen(true);return}
  const recognition=new Recognition();recognition.lang='es-ES';recognition.continuous=true;recognition.interimResults=true;
  recognition.onresult=event=>{let f='',i='';for(let index=event.resultIndex;index<event.results.length;index+=1){const result=event.results[index];const transcript=result?.[0]?.transcript||'';if(result?.isFinal)f+=`${transcript} `;else i+=transcript}if(f)setFinalText(current=>`${current}${f}`.replace(/\s+/g,' ').trimStart());setInterimText(i)};
  recognition.onerror=event=>{const error=event?.error||'unknown';setMessage(error==='not-allowed'?'No hay permiso para usar el micrófono. Actívalo y vuelve a intentarlo.':error==='no-speech'?'No se ha detectado voz. Vuelve a intentarlo.':'El dictado se ha interrumpido. Puedes continuar escribiendo o reanudarlo.');setListening(false)};
  recognition.onend=()=>setListening(false);recognitionRef.current=recognition;setMessage('');setOpen(true);
  try{recognition.start();setListening(true)}catch{setMessage('No se pudo iniciar el dictado. Espera un instante y vuelve a intentarlo.');setListening(false)}
 }
 function close(){stop();setOpen(false);setMode(null);setMessage('')}
 async function copyText(){if(!composed){setMessage('Aún no hay texto para copiar.');return}try{await navigator.clipboard.writeText(composed);setMessage('Texto copiado.')}catch{setMessage('No se pudo copiar automáticamente.')}}
 function send(){
  if(!mode){setMessage('Elige una de las cuatro opciones.');return}
  if(!composed){setMessage('Escribe o dicta primero lo que quieres enviar.');return}
  stop();
  const base=new URLSearchParams({source_route:location.pathname,draft:composed,domain:'financiacion'});
  if(mode==='task'){navigate(`/tareas/nueva?${base.toString()}`);return}
  base.set('mode',mode==='ana'?'help':mode);
  navigate(`/ana?${base.toString()}`);
 }
 return <div className="fenix-audio-transcription" data-testid="audio-transcription-guard">
  {!open&&<button type="button" className="fenix-audio-launcher" onClick={()=>setOpen(true)} aria-label="Abrir acciones por voz" title="Acciones por voz"><Mic size={21}/></button>}
  {open&&<section className="fenix-audio-panel" aria-label="Acciones por voz y texto">
   <header><div><strong>Acción rápida</strong><span>Financiación · CEREBRO</span></div><button type="button" className="fenix-audio-icon" onClick={close} aria-label="Cerrar"><X size={18}/></button></header>
   <div className="fenix-audio-actions" role="group" aria-label="Elige una acción">{ACTIONS.map(action=>{const Icon=action.icon;return <button key={action.id} type="button" className={mode===action.id?'active':''} onClick={()=>{setMode(action.id);setMessage('')}}><Icon size={18}/><span><strong>{action.label}</strong><small>{action.hint}</small></span></button>})}</div>
   {mode&&<div className="fenix-audio-editor"><div className="fenix-audio-editor-head"><strong>{ACTIONS.find(x=>x.id===mode)?.label}</strong><span>{listening?'Escuchando…':'Escribe o dicta'}</span></div>
    <textarea aria-label="Texto de la acción" value={composed} onChange={event=>{setFinalText(event.target.value);setInterimText('')}} placeholder="Escribe aquí o usa el micrófono. Puedes corregir el texto antes de enviarlo."/>
    {message&&<p className="fenix-audio-message" role="status">{message}</p>}{!supported&&!message&&<p className="fenix-audio-message" role="status">Dictado automático no disponible en este navegador.</p>}
    <footer><button type="button" className={listening?'danger':'primary'} onClick={listening?stop:start}>{listening?<><MicOff size={17}/>Parar</>:<><Mic size={17}/>Dictar</>}</button><button type="button" className="secondary" onClick={copyText}><Copy size={17}/>Copiar</button><button type="button" className="secondary" onClick={()=>{setFinalText('');setInterimText('');setMessage('')}}>Limpiar</button><button type="button" className="send" onClick={send}><Send size={17}/>Enviar</button></footer>
   </div>}
   <small>Hablar con Ana usa el flujo nativo de la app y mantiene el contexto en financiación. Este lanzador no escribe por sí solo en registros canónicos.</small>
  </section>}
 </div>;
}
