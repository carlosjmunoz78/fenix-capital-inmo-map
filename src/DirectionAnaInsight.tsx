import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import type {DirectionLiveSnapshot} from './useDirectionLiveData';

type Person={name?:string;role?:string;expedientes?:number;firmas_mes?:number};
type PersonalResponse={items?:Person[]};
type Insight={eyebrow:string;title:string;detail:string};

function clean(v:unknown){return typeof v==='string'&&v.trim()?v.trim():'';}
function num(v:unknown){return typeof v==='number'&&Number.isFinite(v)?v:0;}

export default function DirectionAnaInsight(){
 const location=useLocation();
 const[target,setTarget]=useState<Element|null>(null);
 const[live,setLive]=useState<DirectionLiveSnapshot|null>(null);
 const[people,setPeople]=useState<Person[]>([]);
 const[index,setIndex]=useState(0);

 useEffect(()=>{
  if(location.pathname!=='/inicio'){setTarget(null);return;}
  let tries=0;
  const timer=window.setInterval(()=>{
   const node=document.querySelector('.dir-priority-copy');
   if(node){setTarget(node);window.clearInterval(timer);}
   else if(++tries>40)window.clearInterval(timer);
  },50);
  return()=>window.clearInterval(timer);
 },[location.pathname]);

 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  const onData=(event:Event)=>setLive((event as CustomEvent<DirectionLiveSnapshot>).detail??null);
  window.addEventListener('fenix-direction-live-data',onData as EventListener);
  return()=>window.removeEventListener('fenix-direction-live-data',onData as EventListener);
 },[location.pathname]);

 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let alive=true;
  fetchAppApi<PersonalResponse>('/personal').then(r=>{if(alive&&r.status===200)setPeople(r.data?.items??[])}).catch(()=>{});
  return()=>{alive=false};
 },[location.pathname]);

 const insights=useMemo<Insight[]>(()=>{
  const out:Insight[]=[];
  const financieros=people.filter(p=>/financier/i.test(clean(p.role))&&clean(p.name));
  const byFirmas=[...financieros].sort((a,b)=>num(b.firmas_mes)-num(a.firmas_mes));
  if(byFirmas[0]&&num(byFirmas[0].firmas_mes)>0){
   const top=num(byFirmas[0].firmas_mes);
   const tied=byFirmas.filter(p=>num(p.firmas_mes)===top);
   if(tied.length===1)out.push({eyebrow:'Rendimiento vivo',title:`${clean(byFirmas[0].name)} lidera las firmas`,detail:`${top} ${top===1?'firma':'firmas'} este mes según la fuente autorizada.`});
  }
  const byLoad=[...financieros].sort((a,b)=>num(b.expedientes)-num(a.expedientes));
  if(byLoad[0]&&num(byLoad[0].expedientes)>0){
   out.push({eyebrow:'Carga operativa',title:`${clean(byLoad[0].name)} concentra la mayor cartera`,detail:`${num(byLoad[0].expedientes)} expedientes asignados actualmente.`});
  }
  if(live?.riskSupported&&live.riskExp>0)out.push({eyebrow:'Atención Dirección',title:`${live.riskExp} ${live.riskExp===1?'expediente requiere':'expedientes requieren'} atención`,detail:'Riesgo explícito detectado en la fuente canónica. Las actuaciones concretas están a la derecha.'});
  if((live?.firmasMes??0)>0)out.push({eyebrow:'Cierre del mes',title:`${live!.firmasMes} ${live!.firmasMes===1?'firma prevista':'firmas previstas'} con fecha`,detail:'Solo operaciones no firmadas con fecha real de firma dentro del mes actual.'});
  if(!out.length&&live?.openExp!==undefined)out.push({eyebrow:'Situación actual',title:`${live.openExp} expedientes en curso`,detail:'Sin fabricar alertas: Ana solo destaca información respaldada por las fuentes disponibles.'});
  return out;
 },[people,live]);

 useEffect(()=>{
  setIndex(0);
  if(insights.length<2)return;
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%insights.length),12000);
  return()=>window.clearInterval(timer);
 },[insights.length]);

 if(!target||!insights.length)return null;
 const current=insights[index%insights.length];
 return createPortal(
  <section className="dir-ana-insight" aria-live="polite" aria-label="Información clave de Ana">
   <span>{current.eyebrow}</span>
   <strong>{current.title}</strong>
   <p>{current.detail}</p>
   {insights.length>1&&<small>{index%insights.length+1}/{insights.length} · actualización viva</small>}
  </section>,target
 );
}
