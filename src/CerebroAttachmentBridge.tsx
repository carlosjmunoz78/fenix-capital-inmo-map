import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {createPortal} from 'react-dom';
import {FileText,LoaderCircle,Paperclip,X} from 'lucide-react';
import {ATTACHMENT_LIMITS,composeCerebroMessage,extractCerebroAttachment,type CerebroAttachment} from './cerebroAttachments';
import './cerebro-attachment-bridge.css';

const ACCEPT='.txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.sql,.ts,.tsx,.js,.jsx,.mjs,.cjs,.css,.scss,.py,.sh,.ps1,.ini,.env,.toml,.docx,.xlsx,.pdf';
const ATTACH_BUTTON='.cerebro-browser-composer button[aria-label="Adjuntar archivo"]';
const BROWSER_TEXTAREA='.cerebro-browser-composer textarea[aria-label="Escribe una orden para CEREBRO"]';
const CORE_FORM='.cerebro-host-v0 .cerebro-console .cerebro-chat-form';

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}
function humanBytes(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;return`${(bytes/1024/1024).toFixed(1)} MB`;}
function errorLabel(error:unknown){
 const code=String((error as Error)?.message||error||'ERROR_ADJUNTO');
 const map:Record<string,string>={
  ARCHIVO_VACIO:'El archivo está vacío.',ARCHIVO_SUPERA_5MB:'Cada archivo puede pesar como máximo 5 MB.',IMAGEN_REQUIERE_OCR:'Las imágenes requieren el motor OCR y no se adjuntan como texto.',TIPO_DE_ARCHIVO_NO_SOPORTADO:'Este tipo de archivo no está permitido en la consola.',DOCX_SIN_TEXTO:'El DOCX no contiene texto extraíble.',XLSX_SIN_DATOS:'El XLSX no contiene datos extraíbles.',PDF_SIN_TEXTO_EXTRAIBLE_O_REQUIERE_OCR:'El PDF no contiene texto extraíble o requiere OCR.',ARCHIVO_SIN_CONTENIDO_EXTRAIBLE:'No se encontró contenido útil en el archivo.'
 };
 return map[code]||`No se pudo procesar el adjunto: ${code}`;
}

export default function CerebroAttachmentBridge(){
 const[attachments,setAttachments]=useState<CerebroAttachment[]>([]);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[portalTarget,setPortalTarget]=useState<HTMLElement|null>(null);
 const inputRef=useRef<HTMLInputElement|null>(null);
 const attachmentsRef=useRef<CerebroAttachment[]>([]);
 const resubmitArmedRef=useRef(false);

 useEffect(()=>{attachmentsRef.current=attachments;},[attachments]);

 useEffect(()=>{
  const refresh=()=>{
   const target=document.querySelector<HTMLElement>('.cerebro-browser-composer');
   setPortalTarget(current=>current===target?current:target);
   const button=document.querySelector<HTMLButtonElement>(ATTACH_BUTTON);
   if(button){
    if(button.disabled)button.disabled=false;
    if(button.title!=='Adjuntar archivos · procesamiento local y privado')button.title='Adjuntar archivos · procesamiento local y privado';
    button.setAttribute('aria-label','Adjuntar archivos');
   }
  };
  refresh();
  const observer=new MutationObserver(refresh);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','aria-label']});
  const onClick=(event:MouseEvent)=>{const target=event.target as Element|null;const button=target?.closest?.('button[aria-label="Adjuntar archivo"],button[aria-label="Adjuntar archivos"]');if(!button||!document.querySelector('.cerebro-browser-composer')?.contains(button))return;event.preventDefault();event.stopPropagation();inputRef.current?.click();};
  document.addEventListener('click',onClick,true);
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true)};
 },[]);

 useEffect(()=>{
  const onCoreSubmit=(event:SubmitEvent)=>{
   const form=event.target as HTMLFormElement|null;if(!form?.matches(CORE_FORM))return;
   const current=attachmentsRef.current;if(!current.length)return;
   if(resubmitArmedRef.current){resubmitArmedRef.current=false;setAttachments([]);setError('');return;}
   const textarea=form.querySelector<HTMLTextAreaElement>('textarea');if(!textarea)return;
   const message=composeCerebroMessage(textarea.value,current);if(!message)return;
   event.preventDefault();event.stopPropagation();
   setReactTextareaValue(textarea,message);
   resubmitArmedRef.current=true;
   window.setTimeout(()=>{try{form.requestSubmit()}catch{resubmitArmedRef.current=false;setError('No se pudo reenviar la orden con los adjuntos.');}},0);
  };
  document.addEventListener('submit',onCoreSubmit,true);
  return()=>document.removeEventListener('submit',onCoreSubmit,true);
 },[]);

 async function selectFiles(event:ChangeEvent<HTMLInputElement>){
  const incoming=Array.from(event.target.files||[]);event.target.value='';if(!incoming.length)return;
  const existing=attachmentsRef.current;
  if(existing.length+incoming.length>ATTACHMENT_LIMITS.maxFiles){setError(`Máximo ${ATTACHMENT_LIMITS.maxFiles} archivos por orden.`);return;}
  const totalBytes=existing.reduce((sum,item)=>sum+item.size,0)+incoming.reduce((sum,file)=>sum+file.size,0);
  if(totalBytes>ATTACHMENT_LIMITS.maxTotalBytes){setError('Los adjuntos de una orden no pueden superar 12 MB en total.');return;}
  setBusy(true);setError('');const parsed:CerebroAttachment[]=[];const failures:string[]=[];
  for(const file of incoming){try{parsed.push(await extractCerebroAttachment(file));}catch(reason){failures.push(`${file.name}: ${errorLabel(reason)}`);}}
  if(parsed.length){setAttachments(current=>[...current,...parsed]);const textarea=document.querySelector<HTMLTextAreaElement>(BROWSER_TEXTAREA);if(textarea&&!textarea.value.trim())setReactTextareaValue(textarea,'Analiza los archivos adjuntos y dime lo relevante.');}
  if(failures.length)setError(failures.join(' · '));setBusy(false);
 }
 function removeAttachment(id:string){setAttachments(current=>current.filter(item=>item.id!==id));setError('');}

 const panel=portalTarget&&attachments.length||portalTarget&&busy||portalTarget&&error?createPortal(<div className="cerebro-attachment-panel" aria-live="polite">
  {attachments.length?<div className="cerebro-attachment-list">{attachments.map(item=><span className="cerebro-attachment-chip" key={item.id} title={`${item.name} · SHA-256 ${item.sha256}`}><FileText size={13}/><span><strong>{item.name}</strong><small>{item.kind.toUpperCase()} · {humanBytes(item.size)}{item.truncated?' · texto acotado':''}</small></span><button type="button" onClick={()=>removeAttachment(item.id)} aria-label={`Quitar ${item.name}`}><X size={12}/></button></span>)}</div>:null}
  {busy?<span className="cerebro-attachment-processing"><LoaderCircle size={13}/> Procesando localmente…</span>:null}
  {error?<span className="cerebro-attachment-error" role="status">{error}</span>:null}
  {attachments.length?<span className="cerebro-attachment-privacy"><Paperclip size={11}/> Local · sin subida binaria · contexto acotado · {attachments.length}/{ATTACHMENT_LIMITS.maxFiles}</span>:null}
 </div>,portalTarget):null;

 return <><input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={selectFiles} aria-label="Selector de archivos para CEREBRO"/>{panel}</>;
}
