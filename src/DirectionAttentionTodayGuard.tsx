import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {AlertTriangle,ArrowRight} from 'lucide-react';
import type {DirectionLiveSnapshot} from './useDirectionLiveData';

export default function DirectionAttentionTodayGuard(){
 const{pathname}=useLocation();const navigate=useNavigate();const active=pathname==='/inicio';
 const[target,setTarget]=useState<Element|null>(null),[snapshot,setSnapshot]=useState<DirectionLiveSnapshot|null>(null);
 useEffect(()=>{if(!active){setTarget(null);return;}const attach=()=>setTarget(document.querySelector('.dir-right-top'));attach();const o=new MutationObserver(attach);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[active]);
 useEffect(()=>{const onData=(e:Event)=>setSnapshot((e as CustomEvent<DirectionLiveSnapshot>).detail??null);window.addEventListener('fenix-direction-live-data',onData as EventListener);return()=>window.removeEventListener('fenix-direction-live-data',onData as EventListener)},[]);
 if(!active||!target||!snapshot)return null;
 const items=snapshot.priorities.slice(0,3);
 const css=`.dir-attention-today{margin:0 0 18px;border:1px solid #f0d4c6;border-radius:14px;background:#fffaf7;padding:14px 15px;display:grid;gap:10px}.dir-shell[data-dir-theme='dark'] .dir-attention-today{background:#2a211d;border-color:#69432f}.dir-attention-head{display:flex;align-items:center;gap:8px}.dir-attention-head strong{font-size:12px;letter-spacing:.04em}.dir-attention-list{display:grid;gap:8px}.dir-attention-item{width:100%;border:1px solid #eee;border-radius:10px;background:#fff;padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;text-align:left;cursor:pointer;color:inherit}.dir-shell[data-dir-theme='dark'] .dir-attention-item{background:#202023;border-color:#3b3b40}.dir-attention-item strong{font-size:12px}.dir-attention-item small{font-size:10.5px;color:#777}.dir-attention-item svg{grid-column:2;grid-row:1/3;align-self:center;color:#f36c21}`;
 return createPortal(<><style>{css}</style><section className="dir-attention-today" data-testid="direction-attention-today"><div className="dir-attention-head"><AlertTriangle size={17}/><strong>REQUIERE ATENCIÓN HOY</strong></div>{items.length?<div className="dir-attention-list">{items.map((p,i)=><button className="dir-attention-item" key={`${p.route}-${i}`} onClick={()=>navigate(p.route)}><strong>{p.title}</strong><small>{p.reason}</small><ArrowRight size={16}/></button>)}</div>:<small>No hay incidencias prioritarias confirmadas en las fuentes visibles.</small>}</section></>,target);
}
