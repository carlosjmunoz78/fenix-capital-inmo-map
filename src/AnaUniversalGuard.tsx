import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileUp, MessageSquareWarning, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { anaAvatar } from './assets/visualAssets';
import { fetchAnaApi, fetchEvidenceApi, fetchMemoryApi, supabase } from './supabase';
import './ana-universal.css';

type Caps={
  show_ana_execute?:boolean;can_ana_execute?:boolean;ana_execute_requires_action_context?:boolean;
  can_ana_help?:boolean;can_manual_execute?:boolean;can_upload_evidence?:boolean;can_correct_ana?:boolean;
  can_view_learning_inbox?:boolean;can_decide_learning?:boolean;learning_inbox_disabled_reason?:string|null;
};
type Envelope={capabilities?:Caps;ok?:boolean;error?:string};
type Scope={type:string;code:string;label:string};
type Prepare={ok?:boolean;upload_id?:string;storage_path?:string;token?:string;max_bytes?:number;error?:string};
type Complete={ok?:boolean;reused?:boolean;no_op?:boolean;document_page_id?:string;error?:string};
type MemoryResult={ok?:boolean;reused?:boolean;no_op?:boolean;activity_page_id?:string;error?:string};

const hiddenRoots=['/','/perfil','/ana'];
const BUCKET='fenix-preprod-documents-test';

function scopeFromPath(path:string):Scope{
  const parts=path.split('/').filter(Boolean),root=parts[0]||'inicio',rawId=parts[1]||'';
  const id=['nuevo','nueva','new'].includes(rawId.toLowerCase())?'':rawId;
  const map:Record<string,{type:string;label:string}>={
    expedientes:{type:'expediente',label:'expediente'},contactos:{type:'contacto',label:'contacto'},inmobiliarias:{type:'inmobiliaria',label:'inmobiliaria'},
    tareas:{type:'tarea',label:'tarea'},agenda:{type:'tarea',label:'agenda'},visitas:{type:'visita',label:'visita'},bancos:{type:'banco',label:'banco'},
    tasaciones:{type:'tasacion',label:'tasación'},firmas:{type:'firma',label:'firma'},documentacion:{type:'documento',label:'documentación'},documentos:{type:'documento',label:'documento'},
    comunicaciones:{type:'comunicacion',label:'comunicación'},inicio:{type:'general',label:'inicio'}
  };
  const x=map[root]||{type:root,label:root};return{type:x.type,code:id,label:x.label};
}

function nextText(scope:Scope){
  if(scope.type==='general')return 'Revisa la prioridad que aparece en esta pantalla y actúa sobre el primer bloqueo real.';
  if(!scope.code)return `Completa los datos mínimos del nuevo ${scope.label}; cuando exista el registro podré vincular evidencia y correcciones a su ficha.`;
  return `Revisa la siguiente acción del ${scope.label}, confirma la evidencia vigente y registra el resultado real al terminar.`;
}

export default function AnaUniversalGuard(){
  const location=useLocation(),navigate=useNavigate();
  const scope=useMemo(()=>scopeFromPath(location.pathname),[location.pathname]);
  const [logged,setLogged]=useState(false),[caps,setCaps]=useState<Caps|null>(null),[open,setOpen]=useState(false),[mode,setMode]=useState<'help'|'manual'|null>(null);
  const [scopeAllowed,setScopeAllowed]=useState(false),[evidenceOpen,setEvidenceOpen]=useState(false),[evidenceText,setEvidenceText]=useState(''),[evidenceMessage,setEvidenceMessage]=useState(''),[uploading,setUploading]=useState(false);
  const hide=hiddenRoots.some(p=>location.pathname===p)||(location.pathname.startsWith('/ana/'));

  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setLogged(Boolean(s)));return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{if(!logged||hide)return;fetchAnaApi<Envelope>('/capabilities').then(r=>setCaps(r.status===200?r.data?.capabilities??null:null));},[logged,hide,location.pathname]);
  useEffect(()=>{
    setScopeAllowed(false);setEvidenceOpen(false);setEvidenceMessage('');
    if(!logged||hide||!scope.code||scope.type==='general'||scope.type==='banco')return;
    fetchEvidenceApi<Envelope>('/scope',{method:'POST',body:JSON.stringify({origin_type:scope.type,origin_code:scope.code})}).then(r=>setScopeAllowed(r.status===200&&Boolean(r.data?.ok)));
  },[logged,hide,scope.type,scope.code,location.pathname]);
  if(!logged||hide||!caps)return null;

  const correctionUrl=`/ana?scope_type=${encodeURIComponent(scope.type)}${scope.code?`&scope_code=${encodeURIComponent(scope.code)}`:''}`;

  async function rememberText(text:string,kind:'texto_conversacion'|'comentario',evidencePageId:string){
    const key=`memory:${evidencePageId}:${kind}`;
    return fetchMemoryApi<MemoryResult>('/remember',{method:'POST',body:JSON.stringify({origin_type:scope.type,origin_code:scope.code,detail:text,evidence_page_id:evidencePageId,memory_class:'Contexto',idempotency_key:key})});
  }

  async function saveFile(file:File,kind:'documento'|'texto_conversacion'|'audio_conversacion'|'comentario',memoryText?:string){
    setEvidenceMessage('');setUploading(true);
    const p=await fetchEvidenceApi<Prepare>('/prepare',{method:'POST',body:JSON.stringify({origin_type:scope.type,origin_code:scope.code,evidence_kind:kind,filename:file.name,mime_type:file.type||'application/octet-stream'})});
    if(p.status!==200||!p.data?.upload_id||!p.data.storage_path||!p.data.token){setUploading(false);setEvidenceMessage('No se pudo preparar la carga en este contexto.');return;}
    if(p.data.max_bytes&&file.size>p.data.max_bytes){setUploading(false);setEvidenceMessage('El archivo supera el tamaño permitido en PRE-PROD.');return;}
    const up=await supabase.storage.from(BUCKET).uploadToSignedUrl(p.data.storage_path,p.data.token,file,file.type?{contentType:file.type}:{});
    if(up.error){setUploading(false);setEvidenceMessage('No se pudo subir el archivo.');return;}
    const done=await fetchEvidenceApi<Complete>('/complete',{method:'POST',body:JSON.stringify({upload_id:p.data.upload_id,title:file.name})});
    if(done.status===200&&done.data?.ok){
      let memoryOk=true;
      if(memoryText&&done.data.document_page_id){const m=await rememberText(memoryText,kind==='comentario'?'comentario':'texto_conversacion',done.data.document_page_id);memoryOk=m.status===200||m.status===201;}
      setUploading(false);
      if(!memoryOk){setEvidenceMessage('La evidencia quedó guardada, pero la memoria relacional no pudo vincularse todavía.');return;}
      setEvidenceMessage(done.data.reused?'Esta evidencia ya estaba guardada; no se ha duplicado.':'Evidencia guardada, vinculada al contexto y disponible para la siguiente gestión.');
      if(kind==='texto_conversacion'||kind==='comentario')setEvidenceText('');
    }else{setUploading(false);setEvidenceMessage('La carga llegó al almacenamiento, pero no pudo cerrarse de forma segura.');}
  }

  async function uploadSelected(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    const kind=file.type.startsWith('audio/')?'audio_conversacion':'documento';
    await saveFile(file,kind);
  }
  async function saveText(kind:'texto_conversacion'|'comentario'){
    const value=evidenceText.trim();if(!value){setEvidenceMessage('Escribe el texto que quieres guardar.');return;}
    const name=kind==='comentario'?`comentario-${Date.now()}.txt`:`conversacion-${Date.now()}.txt`;
    await saveFile(new File([value],name,{type:'text/plain'}),kind,value);
  }

  return <aside className={`ana-universal ${open?'open':''}`} aria-label="Ana · asistente contextual">
    <button className="ana-universal-head" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <img src={anaAvatar} alt="Ana"/><span><strong>Ana</strong><small>{nextText(scope)}</small></span>{open?<ChevronUp size={17}/>:<ChevronDown size={17}/>} 
    </button>
    {open&&<div className="ana-universal-body">
      <div className="ana-action-grid">
        <button disabled={!caps.can_ana_execute} title={caps.can_ana_execute?'':'Ana todavía no puede ejecutar esta acción sin un gate específico'}><Sparkles size={15}/> Que lo haga Ana</button>
        <button className={mode==='help'?'selected':''} disabled={!caps.can_ana_help} onClick={()=>setMode('help')}>Ayúdame</button>
        <button className={mode==='manual'?'selected':''} disabled={!caps.can_manual_execute} onClick={()=>setMode('manual')}>Lo hago yo</button>
      </div>
      {mode==='help'&&<p className="ana-inline-note">Ana te acompaña: revisa primero evidencia y bloqueo; después ejecuta una sola acción y registra el resultado.</p>}
      {mode==='manual'&&<p className="ana-inline-note">Modo manual activo. Al terminar, registra qué ocurrió y cualquier contexto útil para la próxima gestión.</p>}
      <div className="ana-secondary-actions">
        <button disabled={!caps.can_upload_evidence||!scopeAllowed} onClick={()=>setEvidenceOpen(v=>!v)} title={!scope.code?'Primero guarda el registro para poder relacionar la evidencia.':!scopeAllowed?'Este origen todavía no tiene un scope de carga autorizado.':''}><FileUp size={15}/> Subir evidencia</button>
        <button disabled={!caps.can_correct_ana||!scope.code} onClick={()=>navigate(correctionUrl)} title={!scope.code?'Primero guarda el registro para vincular la corrección a su origen.':''}><MessageSquareWarning size={15}/> Ana se ha equivocado</button>
        <button disabled={!caps.can_view_learning_inbox} onClick={()=>caps.can_view_learning_inbox&&navigate('/ana')} title={caps.learning_inbox_disabled_reason||''}>Correcciones</button>
      </div>
      {evidenceOpen&&scopeAllowed&&<div className="ana-evidence-panel">
        <label className="ana-file-button">Documento o audio<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.mp3,.m4a,.wav,.webm,audio/*" onChange={e=>void uploadSelected(e)} disabled={uploading}/></label>
        <textarea value={evidenceText} onChange={e=>setEvidenceText(e.target.value)} rows={3} placeholder="Pega aquí una conversación o escribe un comentario/contexto" disabled={uploading}/>
        <div className="ana-evidence-actions"><button disabled={uploading||!evidenceText.trim()} onClick={()=>void saveText('texto_conversacion')}>Guardar conversación</button><button disabled={uploading||!evidenceText.trim()} onClick={()=>void saveText('comentario')}>Guardar comentario</button></div>
        {evidenceMessage&&<small className="ana-evidence-result">{evidenceMessage}</small>}
      </div>}
      <small className="ana-evidence-hint">Texto y documentos quedan ligados al contexto. Las conversaciones/comentarios de texto quedan disponibles como memoria relacional. Audio: se conserva como evidencia, sin transcripción automática en esta fase.</small>
    </div>}
  </aside>;
}
