import {useEffect,useMemo,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,fetchAppApi,supabase} from './supabase';
import './expediente-journey-guard.css';

const PHASES=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
const MANUAL_STAGES=['Entrada','Revisión legado','Documentación incompleta','Documentación completa','Análisis','Pre-OK','Banco','Tasación solicitada','Tasación realizada','Pre-OK + Tasación realizada','Oferta','FEIN','Notaría','Firma','Finalizado','Perdido'];

type Workspace={
 ok?:boolean;status?:number;
 expediente?:{stage?:string;version?:number;proxima_accion?:string|null};
 lifecycle?:{recorded_stage?:string;effective_stage?:string;stage_inconsistent?:boolean;workflow_closed?:boolean};
 qa?:{blockers?:unknown[];warnings?:unknown[]};
 counts?:{documentos?:number;envios_banco?:number;ofertas?:number;tasaciones?:number;firma?:number};
};

function lower(v:unknown){return String(v??'').trim().toLowerCase();}
function idxFor(stage:string){const s=lower(stage);if(s.includes('final')||s.includes('firmado')||s.includes('perdido')||s.includes('cierre'))return 9;if(s.includes('firma'))return 8;if(s.includes('notar'))return 7;if(s.includes('fein'))return 6;if(s.includes('oferta')||s.includes('aprob'))return 5;if(s.includes('tasaci'))return 4;if(s.includes('banco'))return 3;if(s.includes('análisis')||s.includes('analisis')||s.includes('pre-ok'))return 2;if(s.includes('document')||s.includes('revisión legado')||s.includes('revision legado'))return 1;return 0;}
function stringifyIssue(v:unknown){if(typeof v==='string')return v;if(v&&typeof v==='object'){const x=v as Record<string,unknown>;return String(x.message||x.detail||x.error||x.code||'').trim();}return'';}
function nextRecommendation(index:number,stage:string){const s=lower(stage);if(s.includes('perdido'))return 'El expediente está marcado como perdido. Solo debe reactivarse si existe una causa real para retomarlo.';if(index===0)return 'Completar datos iniciales y documentación mínima.';if(index===1)return 'Completar la documentación pendiente y validar que el expediente pueda pasar a análisis.';if(index===2)return 'Cerrar el análisis y preparar la estrategia bancaria / Pre-OK.';if(index===3)return 'Trabajar el banco objetivo y dejar preparada la siguiente decisión.';if(index===4)return 'Revisar la tasación y confirmar que permite continuar la operación.';if(index===5)return 'Comparar/validar la oferta y preparar FEIN.';if(index===6)return 'Revisar FEIN, plazos y requisitos previos a notaría.';if(index===7)return 'Coordinar notaría y dejar la firma lista.';if(index===8)return 'Confirmar firma y cerrar el expediente con su trazabilidad.';return 'Expediente finalizado. No hay una fase posterior automática.';}

async function changeStage(code:string,version:number,stage:string){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as any};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-stage`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({expediente_code:code,expected_version:version,stage})});
 let data:any=null;try{data=await r.json()}catch{}return{status:r.status,data};
}

export default function ExpedienteJourneyGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match)&&pathname!=='/expedientes/nuevo';
 const [workspace,setWorkspace]=useState<Workspace|null>(null);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [selected,setSelected]=useState('');

 const refresh=async()=>{
  if(!active||!IS_PRODUCTION||!code)return;
  const r=await fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(code)}/workspace`);
  if(r.status===200&&r.data){setWorkspace(r.data);const st=String(r.data.lifecycle?.effective_stage||r.data.expediente?.stage||'');setSelected(st);}
 };
 useEffect(()=>{void refresh();},[active,code]);

 const stage=String(workspace?.lifecycle?.effective_stage||workspace?.expediente?.stage||'');
 const phaseIndex=useMemo(()=>idxFor(stage),[stage]);
 const blockers=(workspace?.qa?.blockers??[]).map(stringifyIssue).filter(Boolean);
 const warnings=(workspace?.qa?.warnings??[]).map(stringifyIssue).filter(Boolean);
 const missing=blockers[0]||((lower(stage).includes('incompleta'))?'Falta completar documentación antes de avanzar.':(lower(stage).includes('revisión legado')||lower(stage).includes('revision legado'))?'Este expediente necesita revisión y normalización de datos heredados.':'No hay un faltante crítico registrado por el backend.');
 const recommendation=nextRecommendation(phaseIndex,stage);

 useEffect(()=>{
  if(!active)return;
  let scheduled=false;
  const sync=()=>{
   if(scheduled)return;scheduled=true;
   queueMicrotask(()=>{
    scheduled=false;
    const content=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content');
    if(!content)return;
    let section=content.querySelector<HTMLElement>(':scope > .detail-journey:not(.exp-journey-fallback)');
    if(!section){section=content.querySelector<HTMLElement>(':scope > .exp-journey-fallback');}
    if(!section){section=document.createElement('section');section.className='detail-journey exp-journey-fallback';const lifecycle=content.querySelector<HTMLElement>(':scope > .exp-life-inline-host');const ana=content.querySelector<HTMLElement>(':scope > .detail-ana-hero');if(lifecycle)content.insertBefore(section,lifecycle.nextSibling);else if(ana)content.insertBefore(section,ana.nextSibling);else content.prepend(section);}
    section.dataset.testid='expediente-journey';
    section.querySelector('.exp-journey-guidance')?.remove();
    section.querySelector('.exp-journey-manual-host')?.remove();
    let label=section.querySelector<HTMLElement>(':scope > .detail-section-label');if(!label){label=document.createElement('div');label.className='detail-section-label';section.prepend(label);}
    label.textContent=stage?`RECORRIDO DEL EXPEDIENTE · ESTADO REAL: ${stage}`:'RECORRIDO DEL EXPEDIENTE · CARGANDO ESTADO REAL';
    let track=section.querySelector<HTMLElement>(':scope > .detail-phase-track');if(!track){track=document.createElement('div');track.className='detail-phase-track';section.appendChild(track);}
    track.innerHTML=PHASES.map((phase,i)=>`<div class="${i<phaseIndex?'done':i===phaseIndex?'current':''}" ${i===phaseIndex?'aria-current="step"':''}><span>${i<phaseIndex?'✓':i+1}</span><small>${phase}</small></div>`).join('');
    const guidance=document.createElement('div');guidance.className='exp-journey-guidance';guidance.dataset.testid='expediente-journey-guidance';guidance.innerHTML=`<strong>ANA · ${stage?`Estamos en ${stage}.`:'Estoy comprobando el estado real.'}</strong><span><b>Qué falta:</b> ${missing}</span><span><b>Qué toca ahora:</b> ${recommendation}</span>${warnings[0]?`<span><b>Aviso:</b> ${warnings[0]}</span>`:''}`;section.insertBefore(guidance,track);
    const host=document.createElement('div');host.className='exp-journey-manual-host';host.dataset.testid='expediente-stage-manual-host';section.appendChild(host);
   });
  };
  sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll('.exp-journey-fallback,.exp-journey-guidance,.exp-journey-manual-host').forEach(x=>x.remove());};
 },[active,pathname,stage,phaseIndex,missing,recommendation,warnings.join('|')]);

 useEffect(()=>{
  if(!active||!IS_PRODUCTION)return;
  const host=document.querySelector<HTMLElement>('[data-testid="expediente-stage-manual-host"]');if(!host)return;
  host.innerHTML='';
  const wrap=document.createElement('div');wrap.className='exp-stage-manual';
  const label=document.createElement('label');label.textContent='Cambiar estado manualmente';
  const select=document.createElement('select');select.dataset.testid='expediente-stage-select';for(const st of MANUAL_STAGES){const o=document.createElement('option');o.value=st;o.textContent=st;select.appendChild(o);}if(selected&&!MANUAL_STAGES.includes(selected)){const o=document.createElement('option');o.value=selected;o.textContent=selected;select.prepend(o);}select.value=selected||stage||MANUAL_STAGES[0];
  const button=document.createElement('button');button.type='button';button.textContent=busy?'Guardando…':'Guardar cambio';button.disabled=busy||!workspace?.expediente?.version;
  const status=document.createElement('span');status.textContent=msg;
  button.onclick=async()=>{const version=Number(workspace?.expediente?.version||0);if(!version)return;setBusy(true);setMsg('');const r=await changeStage(code,version,select.value);setBusy(false);if(r.status===200){setMsg('Estado actualizado y registrado en el histórico.');await refresh();}else if(r.status===409){setMsg('El expediente cambió mientras lo editabas. He recargado el estado actual.');await refresh();}else setMsg('No se pudo cambiar el estado. No se ha aplicado ningún cambio.');};
  label.appendChild(select);wrap.append(label,button,status);host.appendChild(wrap);
 },[active,workspace,selected,stage,busy,msg,code]);
 return null;
}
