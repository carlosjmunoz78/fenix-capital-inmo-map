import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi} from './supabase';

const PHASES=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
type Workspace={expediente?:{stage?:string;proxima_accion?:string|null};lifecycle?:{recorded_stage?:string;effective_stage?:string;stage_inconsistent?:boolean};};
function lower(v:unknown){return String(v??'').trim().toLowerCase();}
function idxFor(stage:string){const s=lower(stage);if(!s)return-1;if(s.includes('final')||s.includes('cierre')||s.includes('cerrado'))return 9;if(s.includes('firma')||s.includes('firmado'))return 8;if(s.includes('notar'))return 7;if(s.includes('fein'))return 6;if(s.includes('oferta')||s.includes('aprob'))return 5;if(s.includes('tasaci'))return 4;if(s.includes('banco'))return 3;if(s.includes('análisis')||s.includes('analisis')||s.includes('pre-ok')||s.includes('preok')||s.includes('viabilidad'))return 2;if(s.includes('document')||s.includes('revisión legado')||s.includes('revision legado'))return 1;if(s.includes('entrada')||s.includes('nuevo')||s.includes('inicial')||s.includes('alta'))return 0;return-1;}

export default function ExpedienteJourneyGuard(){
 const{pathname}=useLocation();
 useEffect(()=>{
  const match=pathname.match(/^\/expedientes\/([^/]+)$/);
  if(!match||pathname==='/expedientes/nuevo')return;
  const code=decodeURIComponent(match[1]);
  let dead=false,observer:MutationObserver|undefined;
  let workspaceStage='',recordedStage='',nextAction='';

  const cleanLegacy=()=>{
   document.querySelectorAll('.exp-journey-live-host,.exp-live-journey-section').forEach(node=>node.remove());
  };
  const currentStageFromPage=()=>{
   const current=document.querySelector<HTMLElement>('[data-testid="expediente-current-stage"] small')?.textContent?.trim();
   if(current)return current;
   const label=document.querySelector<HTMLElement>('[data-testid="expediente-real-journey"] .detail-section-label')?.textContent||'';
   const m=label.match(/ACTUAL:\s*(.+)$/i);return m?.[1]?.trim()||'';
  };
  const patch=()=>{
   if(dead)return;
   cleanLegacy();
   const stage=workspaceStage||currentStageFromPage();
   if(!stage)return;
   const index=idxFor(stage);
   const journey=document.querySelector<HTMLElement>('[data-testid="expediente-real-journey"]');
   if(journey&&workspaceStage&&index>=0){
    journey.dataset.stageSource='workspace-effective-stage';
    const label=journey.querySelector<HTMLElement>('.detail-section-label');
    if(label)label.textContent=`RECORRIDO REAL DEL EXPEDIENTE · ACTUAL: ${stage}`;
    const steps=Array.from(journey.querySelectorAll<HTMLElement>('.detail-phase-track > div'));
    steps.forEach((step,i)=>{
     step.classList.toggle('done',i<index);step.classList.toggle('current',i===index);
     if(i===index)step.setAttribute('data-testid','expediente-current-stage');else step.removeAttribute('data-testid');
     const marker=step.querySelector<HTMLElement>('span');if(marker)marker.textContent=i<index?'✓':String(i+1);
     const text=step.querySelector<HTMLElement>('small');if(text&&PHASES[i])text.textContent=PHASES[i];
    });
    const source=journey.querySelector<HTMLElement>('.detail-source-note');
    if(source)source.textContent=`Fase canónica: ${stage}${recordedStage&&recordedStage!==stage?` · registrada: ${recordedStage}`:''}.`;
   }
   const heroHeading=document.querySelector<HTMLElement>('.detail-ana-hero .detail-ana-copy h2');
   if(heroHeading)heroHeading.textContent=`Fase actual: ${stage}`;
   const heroText=document.querySelector<HTMLElement>('.detail-ana-hero .detail-ana-copy p');
   if(heroText&&workspaceStage)heroText.innerHTML=`Estoy usando el estado canónico del expediente: <b>${stage}</b>. La línea de recorrido y Ana trabajan sobre el mismo expediente.`;
   const firstAction=document.querySelector<HTMLElement>('.detail-next-list button:first-child strong');
   if(firstAction)firstAction.textContent=`Ver fase actual: ${stage}`;
   const situation=document.querySelector<HTMLElement>('.detail-summary-card');
   const situationHeading=situation?.querySelector<HTMLElement>('h2');if(situationHeading&&workspaceStage)situationHeading.textContent=stage;
   if(nextAction){
    const nextField=Array.from(situation?.querySelectorAll<HTMLElement>('.detail-kv > div')||[]).find(x=>/Próxima acción/i.test(x.querySelector('small')?.textContent||''));
    const strong=nextField?.querySelector<HTMLElement>('strong');if(strong)strong.textContent=nextAction;
   }
  };

  void fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(code)}/workspace`).then(r=>{
   if(dead||r.status!==200||!r.data)return;
   workspaceStage=String(r.data.lifecycle?.effective_stage||r.data.expediente?.stage||'').trim();
   recordedStage=String(r.data.lifecycle?.recorded_stage||r.data.expediente?.stage||'').trim();
   nextAction=String(r.data.expediente?.proxima_accion||'').trim();
   patch();
   window.dispatchEvent(new CustomEvent('fenix-expediente-stage-resolved',{detail:{code,stage:workspaceStage,recordedStage,nextAction,source:'workspace'}}));
  });
  patch();
  observer=new MutationObserver(patch);observer.observe(document.getElementById('root')??document.body,{childList:true,subtree:true});
  return()=>{dead=true;observer?.disconnect();cleanLegacy()};
 },[pathname]);
 return null;
}
