import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Brain} from 'lucide-react';
import {fetchEnvironmentApi} from './supabase';
import './financial-module-belen.css';

type Rule={id:string;category:string;text:string};
type Envelope={ok?:boolean;baseline?:Rule[]};
type ModuleConfig={selector:string;context:string;title:string};
const modules:Record<string,ModuleConfig>={
 '/bancos':{selector:'.bancos-ana > div:nth-child(2)',context:'banco estrategia financiación 100% aval doble garantía perfil viabilidad',title:'Criterios financieros que Ana cruza con cada banco'},
 '/tasaciones':{selector:'.tas-ana-body',context:'tasación pretasación nota simple fotos validación técnica inmueble',title:'Criterios de Belén para revisar una tasación'},
 '/firmas':{selector:'.firmas-ana-body',context:'FEIN acta firma documentación banco proceso cierre',title:'Controles de Belén antes de una firma'}
};

async function loadContext(context:string){
 const r=await fetchEnvironmentApi<Envelope>('fenix-belen-financial-context','/context',{method:'POST',body:JSON.stringify({action:context,phase:context,people:[]})},{productionAvailable:false});
 return r.status===200?r.data:null;
}

export default function FinancialModuleBelenGuard(){
 const location=useLocation();const config=modules[location.pathname]||null;
 const[target,setTarget]=useState<Element|null>(null),[rules,setRules]=useState<Rule[]>([]);
 useEffect(()=>{if(!config){setTarget(null);setRules([]);return;}const attach=()=>setTarget(document.querySelector(config.selector));attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect()},[config]);
 useEffect(()=>{if(!config)return;let alive=true;void loadContext(config.context).then(x=>{if(alive)setRules((x?.baseline||[]).slice(0,4))});return()=>{alive=false}},[config]);
 if(!config||!target||!rules.length)return null;
 return createPortal(<aside className="financial-belen-note" data-testid={`belen-context-${location.pathname.slice(1)}`}><div><Brain size={15}/><strong>{config.title}</strong></div><ul>{rules.map(x=><li key={x.id}>{x.text}</li>)}</ul><small>Si aparece una excepción o un criterio que pueda haber cambiado, Ana lo revisa con Belén antes de darlo por válido.</small></aside>,target);
}
