import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Mic,MicOff} from 'lucide-react';

type Target={el:HTMLInputElement|HTMLTextAreaElement;key:string;rect:DOMRect};
type RecognitionLike={lang:string;interimResults:boolean;continuous:boolean;start:()=>void;stop:()=>void;onresult:((event:any)=>void)|null;onerror:((event:any)=>void)|null;onend:(()=>void)|null};

declare global{interface Window{SpeechRecognition?:new()=>RecognitionLike;webkitSpeechRecognition?:new()=>RecognitionLike;}}

const STYLE=`
.fenix-dictation-layer{position:fixed;inset:0;z-index:9100;pointer-events:none}.fenix-dictation-mic{position:fixed;width:28px;height:28px;border-radius:50%;border:1px solid rgba(135,0,100,.28);background:var(--surface,#fff);color:#870064;display:grid;place-items:center;padding:0;cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.12)}.fenix-dictation-mic:hover{border-color:#ff5f00;color:#ff5f00}.fenix-dictation-mic[data-listening='true']{background:#870064;color:#fff;border-color:#870064}.fenix-dictation-toast{position:fixed;right:18px;bottom:48px;max-width:340px;border:1px solid var(--border,#e4e4e8);background:var(--surface,#fff);color:var(--text,#222);border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;box-shadow:0 10px 32px rgba(0,0,0,.18);pointer-events:none}html[data-theme='dark'] .fenix-dictation-mic,html[data-theme='dark'] .fenix-dictation-toast{background:#202023;color:#f4f4f5;border-color:#44444a}html[data-theme='dark'] .fenix-dictation-mic[data-listening='true']{background:#870064;border-color:#870064}@media(max-width:760px){.fenix-dictation-mic{width:30px;height:30px}}
`;

function writable(el:Element):el is HTMLInputElement|HTMLTextAreaElement{
 if(el instanceof HTMLTextAreaElement)return !el.disabled&&!el.readOnly;
 if(!(el instanceof HTMLInputElement)||el.disabled||el.readOnly)return false;
 return !['hidden','button','submit','reset','file','checkbox','radio','color','range','date','datetime-local','month','week','time'].includes(el.type);
}
function setNativeValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
 const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 setter?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();
}
function visibleRect(el:HTMLElement){const r=el.getBoundingClientRect();return r.width>70&&r.height>20&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth?r:null;}

export default function GlobalDictationGuard(){
 const[targets,setTargets]=useState<Target[]>([]),[listening,setListening]=useState<string>(''),[toast,setToast]=useState('');
 const recognition=useRef<RecognitionLike|null>(null);
 const supported=useMemo(()=>typeof window!=='undefined'&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition),[]);
 useEffect(()=>{
  let raf=0;const scan=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const next:Array<Target>=[];document.querySelectorAll('input,textarea').forEach((el,i)=>{if(!writable(el))return;const rect=visibleRect(el);if(!rect)return;const base=el.id||el.getAttribute('name')||el.getAttribute('aria-label')||el.tagName;next.push({el,key:`${base}-${i}`,rect});});setTargets(next);});};
  scan();const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true});window.addEventListener('resize',scan);window.addEventListener('scroll',scan,true);const timer=window.setInterval(scan,1200);
  return()=>{observer.disconnect();window.removeEventListener('resize',scan);window.removeEventListener('scroll',scan,true);clearInterval(timer);cancelAnimationFrame(raf);recognition.current?.stop();};
 },[]);
 function start(target:Target){
  if(!supported){setToast('El dictado por micrófono no está disponible en este navegador.');window.setTimeout(()=>setToast(''),3500);return;}
  recognition.current?.stop();const Ctor=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Ctor)return;const rec=new Ctor();recognition.current=rec;rec.lang='es-ES';rec.interimResults=false;rec.continuous=false;setListening(target.key);setToast('Escuchando…');
  rec.onresult=(event:any)=>{let transcript='';for(let i=event.resultIndex??0;i<(event.results?.length??0);i++)transcript+=event.results[i]?.[0]?.transcript??'';transcript=transcript.trim();if(transcript){const existing=target.el.value.trim();setNativeValue(target.el,existing?`${existing} ${transcript}`:transcript);setToast('Dictado añadido.');}else setToast('No he detectado texto.');};
  rec.onerror=()=>setToast('No se pudo usar el micrófono. Revisa el permiso del navegador.');rec.onend=()=>{setListening('');window.setTimeout(()=>setToast(''),2500);};
  try{rec.start();}catch{setListening('');setToast('El micrófono ya está en uso.');}
 }
 if(typeof document==='undefined')return null;
 return createPortal(<div className="fenix-dictation-layer" aria-live="polite"><style>{STYLE}</style>{targets.map(t=><button key={t.key} type="button" className="fenix-dictation-mic" data-listening={listening===t.key?'true':'false'} style={{top:Math.max(2,t.rect.top+(t.rect.height-28)/2),left:Math.max(2,t.rect.right-34)}} aria-label="Dictar en este campo" title="Dictar" onClick={()=>start(t)}>{listening===t.key?<MicOff size={14}/>:<Mic size={14}/>}</button>)}{toast&&<div className="fenix-dictation-toast" role="status">{toast}</div>}</div>,document.body);
}
