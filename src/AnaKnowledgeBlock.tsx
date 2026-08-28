import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, History, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { fetchAnaKnowledgeApi } from './supabase';

type KnowledgeResult={ok?:boolean;status?:number;reused?:boolean;knowledge_page_id?:string;task_page_id?:string;authority?:string;domain?:string;error?:string};
type RecentItem={id:string;title?:string;detail?:string;status?:string;domain?:string|null;authority?:string|null;date?:string|null};
type RecentResult={ok?:boolean;status?:number;items?:RecentItem[];error?:string};

const css=`
.ana-knowledge-mount{margin-top:24px}.ana-knowledge-card{border:1px solid #ececec;background:#fff;border-radius:16px;padding:20px 22px 18px;box-shadow:0 8px 24px rgba(17,17,17,.025);color:#1d1d1f}.ana-knowledge-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.ana-knowledge-title{display:flex;align-items:center;gap:12px;min-width:0}.ana-knowledge-icon{width:38px;height:38px;border-radius:11px;background:#fff3ed;color:#f36c21;display:grid;place-items:center;flex:0 0 auto}.ana-knowledge-copy strong{display:block;font-size:12.5px;letter-spacing:.075em}.ana-knowledge-copy span{display:block;margin-top:4px;font-size:11px;color:#777;line-height:1.45}.ana-knowledge-history{height:36px;border:1px solid #e7e7e7;background:#fff;border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#555;cursor:pointer}.ana-knowledge-history:hover{border-color:#ffd3c0;background:#fffaf7;color:#f36c21}.ana-knowledge-history:disabled{opacity:.45;cursor:wait}.ana-knowledge-input-wrap{position:relative;border:1px solid #e7e7e7;border-radius:13px;background:#fafafa;transition:.18s ease}.ana-knowledge-input-wrap:focus-within{border-color:#f36c21;box-shadow:0 0 0 3px rgba(243,108,33,.08);background:#fff}.ana-knowledge-input{display:block;width:100%;min-height:118px;resize:vertical;border:0;outline:0;background:transparent;color:inherit;padding:16px 18px 44px;font:inherit;font-size:13px;line-height:1.55}.ana-knowledge-input::placeholder{color:#9a9a9f}.ana-knowledge-hint{position:absolute;left:18px;bottom:12px;font-size:10px;color:#999}.ana-knowledge-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:13px}.ana-knowledge-status{font-size:10.5px;color:#8a8a8f}.ana-knowledge-submit{height:40px;border:0;border-radius:10px;padding:0 16px;background:#f36c21;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 7px 16px rgba(243,108,33,.18)}.ana-knowledge-submit:hover{filter:brightness(.97)}.ana-knowledge-submit:disabled{opacity:.46;cursor:not-allowed;box-shadow:none}.ana-knowledge-preview,.ana-knowledge-recent{margin-top:13px;border:1px solid #eee;border-radius:12px;background:#fffaf7;padding:13px 15px}.ana-knowledge-preview strong,.ana-knowledge-recent strong{display:block;font-size:10.5px;letter-spacing:.04em;margin-bottom:7px}.ana-knowledge-preview p{margin:0;font-size:12px;line-height:1.55;white-space:pre-wrap}.ana-knowledge-preview small{display:block;margin-top:8px;color:#888;font-size:10px}.ana-knowledge-recent-list{display:grid;gap:8px}.ana-knowledge-recent-item{border-top:1px solid #f0e7e2;padding-top:8px}.ana-knowledge-recent-item:first-child{border-top:0;padding-top:0}.ana-knowledge-recent-item p{margin:0;font-size:11.5px;line-height:1.45}.ana-knowledge-recent-item small{display:block;margin-top:3px;color:#8b8b90;font-size:9.5px}.dir-shell[data-dir-theme='dark'] .ana-knowledge-card{background:#202023;border-color:#39393e;color:#f4f4f5;box-shadow:none}.dir-shell[data-dir-theme='dark'] .ana-knowledge-icon{background:#3a241d;color:#ff7a42}.dir-shell[data-dir-theme='dark'] .ana-knowledge-copy span,.dir-shell[data-dir-theme='dark'] .ana-knowledge-status,.dir-shell[data-dir-theme='dark'] .ana-knowledge-hint{color:#aaaab2}.dir-shell[data-dir-theme='dark'] .ana-knowledge-history{background:#202023;border-color:#39393e;color:#d7d7db}.dir-shell[data-dir-theme='dark'] .ana-knowledge-history:hover{background:#2c2929;border-color:#70402c;color:#ff7a42}.dir-shell[data-dir-theme='dark'] .ana-knowledge-input-wrap{background:#242427;border-color:#3b3b40}.dir-shell[data-dir-theme='dark'] .ana-knowledge-input-wrap:focus-within{background:#242427;border-color:#ff7a42;box-shadow:0 0 0 3px rgba(255,122,66,.08)}.dir-shell[data-dir-theme='dark'] .ana-knowledge-preview,.dir-shell[data-dir-theme='dark'] .ana-knowledge-recent{background:#242427;border-color:#3b3b40}.dir-shell[data-dir-theme='dark'] .ana-knowledge-recent-item{border-color:#3b3b40}@media(max-width:760px){.ana-knowledge-card{padding:17px 16px 15px}.ana-knowledge-head{align-items:center}.ana-knowledge-copy span{font-size:10.5px}.ana-knowledge-history span{display:none}.ana-knowledge-footer{align-items:flex-start;flex-direction:column}.ana-knowledge-submit{width:100%;justify-content:center}.ana-knowledge-input{min-height:132px}}
`;

function scopeFromPath(path:string){
  const parts=path.split('/').filter(Boolean),root=parts[0]||'inicio',raw=parts[1]||'';
  const code=['nuevo','nueva','new'].includes(raw.toLowerCase())?'':raw;
  const map:Record<string,string>={expedientes:'expediente',bancos:'banco',contactos:'contacto',inmobiliarias:'inmobiliaria',tasaciones:'tasacion',firmas:'firma',documentacion:'documento',agenda:'tarea',tareas:'tarea',visitas:'visita',comunicaciones:'comunicacion',economia:'economia',notarias:'notaria','registros-propiedad':'registro_propiedad'};
  return{type:map[root]||'general',code};
}

export default function AnaKnowledgeBlock(){
  const location=useLocation();
  const scope=useMemo(()=>scopeFromPath(location.pathname),[location.pathname]);
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [value,setValue]=useState('');
  const [status,setStatus]=useState('Conectado con CEREBRO PRE-PROD.');
  const [preview,setPreview]=useState(false);
  const [saving,setSaving]=useState(false);
  const [historyBusy,setHistoryBusy]=useState(false);
  const [recent,setRecent]=useState<RecentItem[]|null>(null);

  useEffect(()=>{
    const place=()=>{
      const quick=document.querySelector('.dir-quick');
      if(!quick){setMount(null);return}
      let node=document.querySelector('.ana-knowledge-mount') as HTMLElement|null;
      if(!node){node=document.createElement('section');node.className='ana-knowledge-mount';quick.insertAdjacentElement('afterend',node)}
      setMount(node);
    };
    place();
    const observer=new MutationObserver(place);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.querySelector('.ana-knowledge-mount')?.remove()};
  },[]);

  async function submit(){
    const detail=value.trim();
    if(!detail||saving)return;
    if(!preview){setPreview(true);setStatus('Revisa el contenido. No se ha guardado nada todavía.');return;}
    setSaving(true);setStatus('Guardando en CEREBRO…');
    const r=await fetchAnaKnowledgeApi<KnowledgeResult>('/knowledge',{method:'POST',body:JSON.stringify({detail,scope_type:scope.type,scope_code:scope.code||null})});
    setSaving(false);
    if((r.status===200||r.status===201)&&r.data?.ok){
      setValue('');setPreview(false);setRecent(null);
      setStatus(r.data.reused?'Este conocimiento ya existía; CEREBRO no lo ha duplicado.':`Conocimiento registrado. Queda pendiente del gate ${r.data.authority||'de Dirección'} antes de ser canónico.`);
      return;
    }
    if(r.status===401||r.status===403){setStatus('No se ha guardado: la sesión no tiene autorización válida.');return;}
    setStatus('No se ha guardado nada. CEREBRO no pudo completar el registro de forma segura.');
  }

  async function loadHistory(){
    if(historyBusy)return;
    if(recent!==null){setRecent(null);setStatus('Historial cerrado.');return;}
    setHistoryBusy(true);setStatus('Cargando tus últimas aportaciones…');
    const r=await fetchAnaKnowledgeApi<RecentResult>('/recent');
    setHistoryBusy(false);
    if(r.status===200&&r.data?.ok){setRecent(r.data.items??[]);setStatus((r.data.items??[]).length?'Últimas aportaciones cargadas.':'Todavía no hay aportaciones guardadas desde este canal.');return;}
    setStatus('No se pudo cargar el historial en este momento.');
  }

  if(!mount)return null;
  return createPortal(<><style>{css}</style><article className="ana-knowledge-card" aria-label="Dar conocimiento a Ana"><div className="ana-knowledge-head"><div className="ana-knowledge-title"><div className="ana-knowledge-icon"><BookOpen size={18}/></div><div className="ana-knowledge-copy"><strong>DAR CONOCIMIENTO A ANA</strong><span>Añade criterios, decisiones, excepciones o conocimiento operativo. CEREBRO lo registra como candidato trazable y no lo convierte en regla sin el gate correspondiente.</span></div></div><button className="ana-knowledge-history" type="button" disabled={historyBusy} onClick={()=>void loadHistory()}><History size={15}/><span>{recent!==null?'Cerrar historial':'Historial'}</span></button></div><div className="ana-knowledge-input-wrap"><textarea className="ana-knowledge-input" value={value} onChange={e=>{setValue(e.target.value);setPreview(false)}} placeholder="Escribe aquí lo que Ana debe saber o recordar…"/><span className="ana-knowledge-hint">Ej.: “Cuando ocurra X, actuar así…” · “Este banco admite esta excepción…”</span></div>{preview&&<div className="ana-knowledge-preview" data-testid="ana-knowledge-preview"><strong>REVISAR ANTES DE GUARDAR</strong><p>{value.trim()}</p><small>No se escribirá nada en CEREBRO hasta que confirmes.</small></div>}{recent!==null&&<div className="ana-knowledge-recent" data-testid="ana-knowledge-recent"><strong>ÚLTIMAS APORTACIONES</strong><div className="ana-knowledge-recent-list">{recent.length===0?<div className="ana-knowledge-recent-item"><p>No hay aportaciones todavía.</p></div>:recent.map(item=><div className="ana-knowledge-recent-item" key={item.id}><p>{item.detail||item.title||'Conocimiento registrado'}</p><small>{[item.status,item.domain,item.date].filter(Boolean).join(' · ')}</small></div>)}</div></div>}<div className="ana-knowledge-footer"><span className="ana-knowledge-status" role="status">{status}</span><button className="ana-knowledge-submit" type="button" disabled={!value.trim()||saving} onClick={()=>void submit()}><Send size={15}/>{saving?'Guardando…':preview?'Confirmar y añadir':'Revisar antes de añadir'}</button></div></article></>,mount);
}
