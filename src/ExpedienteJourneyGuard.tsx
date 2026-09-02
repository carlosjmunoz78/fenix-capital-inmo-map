import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,fetchAppApi,supabase} from './supabase';
import './expediente-journey-guard.css';

const PHASES=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
const MANUAL_STAGES=['Entrada','Revisión legado','Documentación incompleta','Documentación completa','Análisis','Estudio','Viabilidad','Pre-OK','Banco','Tasación solicitada','Tasación realizada','Pre-OK + Tasación realizada','Oferta','FEIN','Notaría','Firma','Finalizado','Perdido'];
const FALLBACK_LABEL='RECORRIDO DEL EXPEDIENTE · ESTADO PENDIENTE DE CARGA';
const FALLBACK_GUIDE='No marco ninguna fase hasta recibir el dato canónico o una evidencia real reconocible. Siguiente fase: se calculará solo cuando exista estado real; Ana no asume Entrada por defecto.';

type Workspace={ok?:boolean;status?:number;expediente?:{stage?:string;version?:number;proxima_accion?:string|null};lifecycle?:{recorded_stage?:string;effective_stage?:string;stage_inconsistent?:boolean;workflow_closed?:boolean};qa?:{blockers?:unknown[];warnings?:unknown[]};counts?:{documentos?:number;envios_banco?:number;ofertas?:number;tasaciones?:number;firma?:number};};
function lower(v:unknown){return String(v??'').trim().toLowerCase();}
function idxFor(stage:string){
 const s=lower(stage);if(!s)return-1;
 if(s.includes('final')||s.includes('cerrad')||s.includes('cierre')||s.includes('completad')||s.includes('perdido'))return 9;
 if(s.includes('firma')||s.includes('firmado'))return 8;
 if(s.includes('notar')||s.includes('acta'))return 7;
 if(s.includes('fein'))return 6;
 if(s.includes('oferta')||s.includes('aprob')||s.includes('ok banco')||s.includes('condiciones aprobadas'))return 5;
 if(s.includes('tasaci')||s.includes('tasador'))return 4;
 if(s.includes('banco')||s.includes('banc')||s.includes('presentado')||s.includes('enviado a banco')||s.includes('condiciones bancarias'))return 3;
 if(s.includes('análisis')||s.includes('analisis')||s.includes('estudio')||s.includes('viabilidad')||s.includes('pre-ok')||s.includes('preok'))return 2;
 if(s.includes('document')||s.includes('docs')||s.includes('revisión legado')||s.includes('revision legado'))return 1;
 if(s.includes('entrada')||s.includes('nuevo')||s.includes('inicial')||s.includes('recibido')||s.includes('alta'))return 0;
 return-1;
}
function evidenceIdx(w:Workspace|null){const c=w?.counts;if(!c)return-1;if(Number(c.firma||0)>0)return 8;if(Number(c.ofertas||0)>0)return 5;if(Number(c.tasaciones||0)>0)return 4;if(Number(c.envios_banco||0)>0)return 3;if(Number(c.documentos||0)>0)return 1;return-1;}
function stringifyIssue(v:unknown){if(typeof v==='string')return v;if(v&&typeof v==='object'){const x=v as Record<string,unknown>;return String(x.message||x.detail||x.error||x.code||'').trim();}return'';}
function nextRecommendation(index:number,stage:string){const s=lower(stage);if(s.includes('perdido'))return 'El expediente está marcado como perdido. Solo debe reactivarse si existe una causa real para retomarlo.';if(index<0)return 'Primero hay que resolver el estado real del expediente; no voy a inventar el siguiente paso.';if(index===0)return 'Completar datos iniciales y documentación mínima.';if(index===1)return 'Completar la documentación pendiente y validar que el expediente pueda pasar a análisis.';if(index===2)return 'Cerrar el análisis y preparar la estrategia bancaria / Pre-OK.';if(index===3)return 'Trabajar el banco objetivo y dejar preparada la siguiente decisión.';if(index===4)return 'Revisar la tasación y confirmar que permite continuar la operación.';if(index===5)return 'Comparar o validar la oferta y preparar FEIN.';if(index===6)return 'Revisar FEIN, plazos y requisitos previos a notaría.';if(index===7)return 'Coordinar notaría y dejar la firma lista.';if(index===8)return 'Confirmar firma y cerrar el expediente con su trazabilidad.';return 'Expediente finalizado. No hay una fase posterior automática.';}
async function changeStage(code:string,version:number,stage:string){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-stage`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({expediente_code:code,expected_version:version,stage})});let data:any=null;try{data=await r.json()}catch{}return{status:r.status,data};}

export default function ExpedienteJourneyGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match)&&pathname!=='/expedientes/nuevo';
 const[host,setHost]=useState<HTMLElement|null>(null),[workspace,setWorkspace]=useState<Workspace|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[selected,setSelected]=useState('');

 useEffect(()=>{
  if(!active){setHost(null);return;}
  let cancelled=false;let contentObserver:MutationObserver|null=null;
  const removeLegacyJourney=(content:HTMLElement)=>{content.querySelectorAll<HTMLElement>(':scope > .detail-journey:not(.exp-live-journey-section)').forEach(section=>section.remove());};
  const ensure=()=>{
   if(cancelled)return;const content=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content');const ana=content?.querySelector<HTMLElement>(':scope > .detail-ana-hero');if(!content||!ana)return;
   removeLegacyJourney(content);let h=content.querySelector<HTMLElement>(':scope > .exp-journey-live-host');if(!h){h=document.createElement('div');h.className='exp-journey-live-host';content.insertBefore(h,ana.nextSibling);}setHost(current=>current===h?current:h);
   if(!contentObserver){contentObserver=new MutationObserver(()=>{const live=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content');if(!live)return;removeLegacyJourney(live);const liveAna=live.querySelector<HTMLElement>(':scope > .detail-ana-hero');let liveHost=live.querySelector<HTMLElement>(':scope > .exp-journey-live-host');if(liveAna&&!liveHost){liveHost=document.createElement('div');liveHost.className='exp-journey-live-host';live.insertBefore(liveHost,liveAna.nextSibling);}if(liveHost)setHost(current=>current===liveHost?current:liveHost);});contentObserver.observe(content,{childList:true});}
  };
  ensure();const rootObserver=new MutationObserver(ensure);rootObserver.observe(document.getElementById('root')??document.body,{childList:true,subtree:true});return()=>{cancelled=true;rootObserver.disconnect();contentObserver?.disconnect();document.querySelectorAll('.exp-journey-live-host').forEach(x=>x.remove());setHost(null);};
 },[active,pathname]);

 async function refresh(){if(!active||!code)return;const r=await fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(code)}/workspace`);if(r.status===200&&r.data){setWorkspace(r.data);setSelected(String(r.data.lifecycle?.recorded_stage||r.data.expediente?.stage||''));}}
 useEffect(()=>{void refresh();},[active,code]);

 const rawStage=String(workspace?.lifecycle?.effective_stage||workspace?.expediente?.stage||'');
 const recordedStage=String(workspace?.lifecycle?.recorded_stage||workspace?.expediente?.stage||'');
 const stateIndex=useMemo(()=>idxFor(rawStage),[rawStage]);
 const evidenceIndex=useMemo(()=>evidenceIdx(workspace),[workspace]);
 const phaseIndex=Math.max(stateIndex,evidenceIndex);
 const stage=phaseIndex>=0?PHASES[phaseIndex]:rawStage;
 const blockers=(workspace?.qa?.blockers??[]).map(stringifyIssue).filter(Boolean);const warnings=(workspace?.qa?.warnings??[]).map(stringifyIssue).filter(Boolean);
 const missing=blockers[0]||(lower(rawStage).includes('incompleta')?'Falta completar documentación antes de avanzar.':lower(rawStage).includes('revisión legado')||lower(rawStage).includes('revision legado')?'Este expediente necesita revisión y normalización de datos heredados.':'No hay un faltante crítico registrado por el backend.');
 const recommendation=nextRecommendation(phaseIndex,rawStage);
 async function saveManualStage(){const version=Number(workspace?.expediente?.version||0);if(!version||!selected||busy)return;setBusy(true);setMsg('');const r=await changeStage(code,version,selected);setBusy(false);if(r.status===200){setMsg('Estado actualizado y registrado en el histórico.');await refresh();}else if(r.status===409){setMsg('El expediente cambió mientras lo editabas. He recargado el estado actual.');await refresh();}else setMsg('No se pudo cambiar el estado. No se ha aplicado ningún cambio.');}

 if(!active||!host)return null;
 return createPortal(<section className="detail-journey exp-live-journey-section" data-testid="expediente-journey">
  <div className="detail-section-label">{phaseIndex>=0?`RECORRIDO DEL EXPEDIENTE · ESTADO REAL: ${stage}`:FALLBACK_LABEL}</div>
  <div className="exp-journey-guidance" data-testid="expediente-journey-guidance"><strong>ANA · {phaseIndex>=0?`Estamos en ${stage}.`:'Estoy comprobando el estado real del expediente.'}</strong>{phaseIndex>=0?<><span><b>Qué falta:</b> {missing}</span><span><b>Qué toca ahora:</b> {recommendation}</span>{rawStage&&rawStage!==stage&&<span><b>Estado registrado:</b> {rawStage}. El recorrido se ha adelantado por evidencia operativa real.</span>}</>:<span>{FALLBACK_GUIDE}</span>}{warnings[0]&&<span><b>Aviso:</b> {warnings[0]}</span>}{workspace?.lifecycle?.stage_inconsistent&&<span><b>Control:</b> el backend detecta diferencia entre estado efectivo y registrado ({recordedStage}).</span>}</div>
  <div className="detail-phase-track" aria-label="Fases del expediente">{PHASES.map((phase,i)=><div key={phase} className={phaseIndex>=0?(i<phaseIndex?'done':i===phaseIndex?'current':''):''} aria-current={phaseIndex>=0&&i===phaseIndex?'step':undefined}><span>{phaseIndex>=0&&i<phaseIndex?'✓':i+1}</span><small>{phase}</small></div>)}</div>
  {IS_PRODUCTION&&<div className="exp-stage-manual" data-testid="expediente-stage-manual-host"><label>Cambiar estado manualmente<select data-testid="expediente-stage-select" value={selected||recordedStage||rawStage||MANUAL_STAGES[0]} onChange={e=>setSelected(e.target.value)}>{selected&&!MANUAL_STAGES.includes(selected)&&<option value={selected}>{selected}</option>}{MANUAL_STAGES.map(st=><option key={st} value={st}>{st}</option>)}</select></label><button type="button" onClick={()=>void saveManualStage()} disabled={busy||!workspace?.expediente?.version}>{busy?'Guardando…':'Guardar cambio'}</button>{msg&&<span role="status">{msg}</span>}</div>}
 </section>,host);
}
