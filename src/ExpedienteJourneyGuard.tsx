import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,fetchAppApi,supabase} from './supabase';
import './expediente-journey-guard.css';

const PHASES=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
const MANUAL_STAGES=['Entrada','Revisión legado','Documentación incompleta','Documentación completa','Análisis','Pre-OK','Banco','Tasación solicitada','Tasación realizada','Pre-OK + Tasación realizada','Oferta','FEIN','Notaría','Firma','Finalizado','Perdido'];

type Workspace={ok?:boolean;status?:number;expediente?:{stage?:string;version?:number;proxima_accion?:string|null};lifecycle?:{recorded_stage?:string;effective_stage?:string;stage_inconsistent?:boolean;workflow_closed?:boolean};qa?:{blockers?:unknown[];warnings?:unknown[]};counts?:{documentos?:number;envios_banco?:number;ofertas?:number;tasaciones?:number;firma?:number};};
function lower(v:unknown){return String(v??'').trim().toLowerCase();}
function idxFor(stage:string){const s=lower(stage);if(s.includes('final')||s.includes('firmado')||s.includes('perdido')||s.includes('cierre'))return 9;if(s.includes('firma'))return 8;if(s.includes('notar'))return 7;if(s.includes('fein'))return 6;if(s.includes('oferta')||s.includes('aprob'))return 5;if(s.includes('tasaci'))return 4;if(s.includes('banco'))return 3;if(s.includes('análisis')||s.includes('analisis')||s.includes('pre-ok'))return 2;if(s.includes('document')||s.includes('revisión legado')||s.includes('revision legado'))return 1;return 0;}
function stringifyIssue(v:unknown){if(typeof v==='string')return v;if(v&&typeof v==='object'){const x=v as Record<string,unknown>;return String(x.message||x.detail||x.error||x.code||'').trim();}return'';}
function nextRecommendation(index:number,stage:string){const s=lower(stage);if(s.includes('perdido'))return 'El expediente está marcado como perdido. Solo debe reactivarse si existe una causa real para retomarlo.';if(index===0)return 'Completar datos iniciales y documentación mínima.';if(index===1)return 'Completar la documentación pendiente y validar que el expediente pueda pasar a análisis.';if(index===2)return 'Cerrar el análisis y preparar la estrategia bancaria / Pre-OK.';if(index===3)return 'Trabajar el banco objetivo y dejar preparada la siguiente decisión.';if(index===4)return 'Revisar la tasación y confirmar que permite continuar la operación.';if(index===5)return 'Comparar o validar la oferta y preparar FEIN.';if(index===6)return 'Revisar FEIN, plazos y requisitos previos a notaría.';if(index===7)return 'Coordinar notaría y dejar la firma lista.';if(index===8)return 'Confirmar firma y cerrar el expediente con su trazabilidad.';return 'Expediente finalizado. No hay una fase posterior automática.';}
async function changeStage(code:string,version:number,stage:string){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-stage`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({expediente_code:code,expected_version:version,stage})});let data:any=null;try{data=await r.json()}catch{}return{status:r.status,data};}

export default function ExpedienteJourneyGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match)&&pathname!=='/expedientes/nuevo';
 const[host,setHost]=useState<HTMLElement|null>(null),[workspace,setWorkspace]=useState<Workspace|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[selected,setSelected]=useState('');

 useEffect(()=>{
  if(!active){setHost(null);return;}
  let cancelled=false;let tries=0;let timer=0;
  const locate=()=>{
   if(cancelled)return;
   const content=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content');
   const ana=content?.querySelector<HTMLElement>(':scope > .detail-ana-hero');
   if(content&&ana){
    let h=content.querySelector<HTMLElement>(':scope > .exp-journey-live-host');
    if(!h){h=document.createElement('div');h.className='exp-journey-live-host';content.insertBefore(h,ana.nextSibling);}
    setHost(h);
    return;
   }
   tries+=1;if(tries<80)timer=window.setTimeout(locate,100);
  };
  locate();
  return()=>{cancelled=true;window.clearTimeout(timer);document.querySelector('.exp-journey-live-host')?.remove();setHost(null);};
 },[active,pathname]);

 async function refresh(){
  if(!active||!IS_PRODUCTION||!code)return;
  const r=await fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(code)}/workspace`);
  if(r.status===200&&r.data){setWorkspace(r.data);setSelected(String(r.data.lifecycle?.recorded_stage||r.data.expediente?.stage||''));}
 }
 useEffect(()=>{void refresh();},[active,code]);

 const stage=String(workspace?.lifecycle?.effective_stage||workspace?.expediente?.stage||'');
 const recordedStage=String(workspace?.lifecycle?.recorded_stage||workspace?.expediente?.stage||'');
 const phaseIndex=useMemo(()=>idxFor(stage),[stage]);
 const blockers=(workspace?.qa?.blockers??[]).map(stringifyIssue).filter(Boolean);
 const warnings=(workspace?.qa?.warnings??[]).map(stringifyIssue).filter(Boolean);
 const missing=blockers[0]||(lower(stage).includes('incompleta')?'Falta completar documentación antes de avanzar.':lower(stage).includes('revisión legado')||lower(stage).includes('revision legado')?'Este expediente necesita revisión y normalización de datos heredados.':'No hay un faltante crítico registrado por el backend.');
 const recommendation=nextRecommendation(phaseIndex,stage);
 async function saveManualStage(){const version=Number(workspace?.expediente?.version||0);if(!version||!selected||busy)return;setBusy(true);setMsg('');const r=await changeStage(code,version,selected);setBusy(false);if(r.status===200){setMsg('Estado actualizado y registrado en el histórico.');await refresh();}else if(r.status===409){setMsg('El expediente cambió mientras lo editabas. He recargado el estado actual.');await refresh();}else setMsg('No se pudo cambiar el estado. No se ha aplicado ningún cambio.');}

 if(!active||!host)return null;
 return createPortal(<section className="detail-journey exp-live-journey-section" data-testid="expediente-journey">
  <div className="detail-section-label">RECORRIDO DEL EXPEDIENTE · {stage?`ESTADO REAL: ${stage}`:'CARGANDO ESTADO REAL'}</div>
  <div className="exp-journey-guidance" data-testid="expediente-journey-guidance"><strong>ANA · {stage?`Estamos en ${stage}.`:'Estoy comprobando el estado real del expediente.'}</strong><span><b>Qué falta:</b> {stage?missing:'Aún no marco faltantes hasta recibir el workspace canónico.'}</span><span><b>Qué toca ahora:</b> {stage?recommendation:'Se calculará en cuanto llegue el estado real.'}</span>{warnings[0]&&<span><b>Aviso:</b> {warnings[0]}</span>}{workspace?.lifecycle?.stage_inconsistent&&<span><b>Estado automático:</b> el backend calcula {stage} aunque el estado registrado sea {recordedStage}.</span>}</div>
  <div className="detail-phase-track" aria-label="Fases del expediente">{PHASES.map((phase,i)=><div key={phase} className={stage?(i<phaseIndex?'done':i===phaseIndex?'current':''):''} aria-current={stage&&i===phaseIndex?'step':undefined}><span>{stage&&i<phaseIndex?'✓':i+1}</span><small>{phase}</small></div>)}</div>
  {IS_PRODUCTION&&<div className="exp-stage-manual" data-testid="expediente-stage-manual-host"><label>Cambiar estado manualmente<select data-testid="expediente-stage-select" value={selected||recordedStage||stage||MANUAL_STAGES[0]} onChange={e=>setSelected(e.target.value)}>{selected&&!MANUAL_STAGES.includes(selected)&&<option value={selected}>{selected}</option>}{MANUAL_STAGES.map(st=><option key={st} value={st}>{st}</option>)}</select></label><button type="button" onClick={()=>void saveManualStage()} disabled={busy||!workspace?.expediente?.version}>{busy?'Guardando…':'Guardar cambio'}</button>{msg&&<span role="status">{msg}</span>}</div>}
 </section>,host);
}
