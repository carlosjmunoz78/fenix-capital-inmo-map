import {createPortal} from 'react-dom';
import {useEffect,useMemo,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {FileUp,RotateCcw,Save,ShieldAlert,X} from 'lucide-react';
import {fetchAppApi,IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import './expediente-manual-phase.css';

type Row=Record<string,any>;
type Ctx={role?:string;display_name?:string};
const phases=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
const aliases=[['entrada','nuevo','inicial'],['document','doc'],['análisis','analisis','estudio'],['banco','banc'],['tasación','tasacion'],['oferta','aprob'],['fein'],['notar'],['firma'],['cierre','cerrado','final']];
function text(row:Row|null,keys:string[]){if(!row)return'';for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim()}return''}
function phaseIndex(raw:string){const s=raw.toLowerCase();const i=aliases.findIndex(group=>group.some(x=>s.includes(x)));return i>=0?i:0}
function detailItem(data:any):Row|null{return data?.item||data?.expediente||null}

export default function ExpedienteManualPhaseGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);const code=match?.[1]?decodeURIComponent(match[1]):'';
 const[host,setHost]=useState<HTMLElement|null>(null),[ctx,setCtx]=useState<Ctx|null>(null),[row,setRow]=useState<Row|null>(null);
 const[selected,setSelected]=useState(''),[reason,setReason]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const current=text(row,['stage','fase','estado'])||'Entrada';const currentIndex=phaseIndex(current);const selectedIndex=selected?phases.indexOf(selected):-1;
 const canEdit=ctx?.role==='Direccion'||ctx?.role==='Financiero';
 const movement=useMemo(()=>selectedIndex<0?'':selectedIndex<currentIndex?'retroceso':selectedIndex>currentIndex+1?'salto':'avance',[selectedIndex,currentIndex]);

 async function reloadData(){const[c,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`)]);setCtx(c.status===200?c.data:null);setRow(r.status===200?detailItem(r.data):null)}
 useEffect(()=>{if(!code)return;void reloadData()},[code]);
 useEffect(()=>{
  if(!code)return;let mounted=true;const wire=()=>{
   if(!mounted)return;const journey=document.querySelector('[data-testid="expediente-phase-line"]') as HTMLElement|null;if(!journey)return;
   let portal=journey.parentElement?.querySelector(':scope > .manual-phase-host') as HTMLElement|null;
   if(!portal&&journey.parentElement){portal=document.createElement('div');portal.className='manual-phase-host';journey.insertAdjacentElement('afterend',portal)}
   if(portal)setHost(portal);
   const cells=Array.from(journey.querySelectorAll('.detail-phase-track > div')) as HTMLElement[];
   cells.forEach((cell,i)=>{cell.classList.add('manual-phase-cell');cell.setAttribute('role','button');cell.setAttribute('tabindex','0');cell.setAttribute('aria-label',`Cambiar manualmente a fase ${phases[i]}`);cell.onclick=()=>{if(!canEdit)return;setSelected(phases[i]);setReason('');setConfirm(false);setMsg('')};cell.onkeydown=e=>{if(!canEdit)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(phases[i]);setReason('');setConfirm(false);setMsg('')}}});
  };wire();const obs=new MutationObserver(wire);obs.observe(document.body,{subtree:true,childList:true});return()=>{mounted=false;obs.disconnect();document.querySelectorAll('.manual-phase-host').forEach(n=>n.remove())}
 },[code,canEdit]);

 function close(){setSelected('');setReason('');setConfirm(false);setMsg('')}
 async function commit(){if(!canEdit||!row||!selected||selected===current||!reason.trim())return;setBusy(true);setMsg('');
  const fresh=await fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`);const item=fresh.status===200?detailItem(fresh.data):row;const version=Number(item?.version||row.version||0);const oldNotes=text(item,['notas']);const actor=ctx?.display_name||ctx?.role||'Usuario';const stamp=new Date().toISOString();const audit=`[CAMBIO MANUAL DE FASE] ${current} → ${selected} · Motivo: ${reason.trim()} · Usuario: ${actor} · Fecha: ${stamp}`;const notes=oldNotes?`${oldNotes}\n${audit}`:audit;
  let status=500;let data:any=null;
  if(IS_PRODUCTION){const r=await supabase.rpc('fenix_prod_exp_update',{p_code:code,p_expected_version:version,p_cliente_alias:null,p_stage:selected,p_inmobiliaria_code:null,p_notas:notes,p_proxima_accion:null});data=r.data;status=r.error?500:Number(r.data?.status||200)}else{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token){setBusy(false);setMsg('La sesión no permite guardar el cambio.');return}const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/expedientes/${encodeURIComponent(code)}/action`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'update',changes:{stage:selected,notas:notes}})});status=r.status;try{data=await r.json()}catch{}}
  setBusy(false);if(status===200&&data?.ok!==false){setMsg('Fase cambiada y motivo registrado.');setConfirm(false);await reloadData();window.setTimeout(()=>window.location.reload(),450)}else if(status===409){setMsg('El expediente cambió mientras lo revisabas. Recarga y vuelve a intentarlo.')}else if(status===403){setMsg('Tu perfil no puede cambiar la fase.')}else setMsg(`No se pudo cambiar la fase (${data?.error||status}).`)
 }
 if(!host)return null;
 return createPortal(<section className="manual-phase-panel" data-testid="manual-phase-panel">
  <div className="manual-phase-header"><div><span>CONTROL MANUAL DE FASE</span><strong>{canEdit?'Puedes intervenir cuando lo necesites':'Tu perfil ve el recorrido en solo lectura'}</strong></div>{selected&&<button type="button" className="manual-phase-close" onClick={close} aria-label="Cerrar cambio manual"><X size={17}/></button>}</div>
  {!selected?<div className="manual-phase-hint">{canEdit?'Pulsa cualquier fase del recorrido para preparar un cambio manual. Nada cambia hasta que expliques el motivo y confirmes.':'Los cambios manuales están reservados a Dirección y Financiero.'}</div>:<>
   <div className="manual-phase-transition"><div><small>Fase actual</small><strong>{current}</strong></div><span>→</span><label><small>Nueva fase</small><select value={selected} onChange={e=>{setSelected(e.target.value);setConfirm(false);setMsg('')}}>{phases.map(p=><option key={p}>{p}</option>)}</select></label></div>
   {selected===current&&<div className="manual-phase-warning"><ShieldAlert size={17}/> Esa ya es la fase actual. Elige una fase distinta.</div>}
   {movement==='salto'&&<div className="manual-phase-warning"><ShieldAlert size={17}/> Estás saltando una o más fases. El motivo será obligatorio.</div>}
   {movement==='retroceso'&&<div className="manual-phase-warning"><RotateCcw size={17}/> Estás retrocediendo el expediente. El motivo será obligatorio.</div>}
   <label className="manual-phase-reason">¿Por qué quieres cambiar la fase?<textarea rows={3} value={reason} onChange={e=>{setReason(e.target.value);setConfirm(false);setMsg('')}} placeholder="Explica el motivo operativo, excepción o evidencia que justifica el cambio…"/></label>
   <div className="manual-phase-actions"><button type="button" onClick={()=>window.open(`/documentacion?expediente=${encodeURIComponent(code)}&upload=1&phaseEvidence=${encodeURIComponent(selected)}`,'_blank','noopener,noreferrer')}><FileUp size={16}/> Añadir documento justificativo</button>{!confirm?<button type="button" className="primary" disabled={selected===current||!reason.trim()} onClick={()=>setConfirm(true)}>Revisar cambio</button>:<div className="manual-phase-confirm"><span>¿Seguro que quieres cambiar <b>{current}</b> → <b>{selected}</b>?</span><button type="button" onClick={()=>setConfirm(false)}>No, revisar</button><button type="button" className="primary" disabled={busy} onClick={commit}><Save size={16}/>{busy?'Guardando…':'Sí, cambiar fase'}</button></div>}</div>
  </>}
  {msg&&<div className="manual-phase-message">{msg}</div>}
 </section>,host);
}
