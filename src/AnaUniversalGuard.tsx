import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileUp, MessageSquareWarning, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { anaAvatar } from './assets/visualAssets';
import { fetchAnaApi, supabase } from './supabase';
import './ana-universal.css';

type Caps={
  show_ana_execute?:boolean;can_ana_execute?:boolean;ana_execute_requires_action_context?:boolean;
  can_ana_help?:boolean;can_manual_execute?:boolean;can_upload_evidence?:boolean;can_correct_ana?:boolean;
  can_view_learning_inbox?:boolean;can_decide_learning?:boolean;learning_inbox_disabled_reason?:string|null;
};
type Envelope={capabilities?:Caps};
type Scope={type:string;code:string;label:string;uploadSupported:boolean};

const hiddenRoots=['/','/perfil','/ana'];

function scopeFromPath(path:string):Scope{
  const parts=path.split('/').filter(Boolean),root=parts[0]||'inicio',id=parts[1]||'';
  const map:Record<string,{type:string;label:string;upload:boolean}>={
    expedientes:{type:'expediente',label:'expediente',upload:true},
    contactos:{type:'contacto',label:'contacto',upload:false},
    inmobiliarias:{type:'inmobiliaria',label:'inmobiliaria',upload:true},
    tareas:{type:'tarea',label:'tarea',upload:false},agenda:{type:'tarea',label:'agenda',upload:false},
    visitas:{type:'visita',label:'visita',upload:false},bancos:{type:'banco',label:'banco',upload:false},
    tasaciones:{type:'tasacion',label:'tasación',upload:false},firmas:{type:'firma',label:'firma',upload:false},
    documentacion:{type:'documento',label:'documentación',upload:false},documentos:{type:'documento',label:'documento',upload:false},
    comunicaciones:{type:'comunicacion',label:'comunicación',upload:false},inicio:{type:'general',label:'inicio',upload:false}
  };
  const x=map[root]||{type:root,label:root,upload:false};return{type:x.type,code:id,label:x.label,uploadSupported:x.upload&&Boolean(id)};
}

function nextText(scope:Scope){
  if(scope.type==='general')return 'Revisa la prioridad que aparece en esta pantalla y actúa sobre el primer bloqueo real.';
  return `Revisa la siguiente acción del ${scope.label}, confirma la evidencia vigente y registra el resultado real al terminar.`;
}

export default function AnaUniversalGuard(){
  const location=useLocation(),navigate=useNavigate();
  const scope=useMemo(()=>scopeFromPath(location.pathname),[location.pathname]);
  const [logged,setLogged]=useState(false),[caps,setCaps]=useState<Caps|null>(null),[open,setOpen]=useState(false),[mode,setMode]=useState<'help'|'manual'|null>(null);
  const hide=hiddenRoots.some(p=>location.pathname===p)||(location.pathname.startsWith('/ana/'))||location.pathname.includes('/nuevo');

  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setLogged(Boolean(s)));return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{if(!logged||hide)return;fetchAnaApi<Envelope>('/capabilities').then(r=>setCaps(r.status===200?r.data?.capabilities??null:null));},[logged,hide,location.pathname]);
  if(!logged||hide||!caps)return null;

  const correctionUrl=`/ana?scope_type=${encodeURIComponent(scope.type)}${scope.code?`&scope_code=${encodeURIComponent(scope.code)}`:''}`;
  const evidenceUrl=scope.uploadSupported?`/documentacion?scope_type=${encodeURIComponent(scope.type)}&scope_code=${encodeURIComponent(scope.code)}&upload=1`:'';

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
        <button disabled={!caps.can_upload_evidence||!evidenceUrl} onClick={()=>evidenceUrl&&navigate(evidenceUrl)} title={!evidenceUrl?'La carga desde este tipo de entidad se habilitará cuando el backend común tenga el scope validado':''}><FileUp size={15}/> Subir evidencia</button>
        <button disabled={!caps.can_correct_ana} onClick={()=>navigate(correctionUrl)}><MessageSquareWarning size={15}/> Ana se ha equivocado</button>
        <button disabled={!caps.can_view_learning_inbox} onClick={()=>caps.can_view_learning_inbox&&navigate('/ana')} title={caps.learning_inbox_disabled_reason||''}>Correcciones</button>
      </div>
      <small className="ana-evidence-hint">Texto y documentos quedan ligados al contexto. Audio: se conservará como evidencia, sin transcripción automática en esta fase.</small>
    </div>}
  </aside>;
}
