import {useEffect,useState} from 'react';
import {fetchAppApi} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import './operational.css';
import './expediente-detail-nav.css';

const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function ExpedienteDetailAuthorizedNav(){
 const[nav,setNav]=useState<NavItem[]>([]);
 const[theme,setTheme]=useState(()=>sessionStorage.getItem('fenix-theme')||'light');
 useEffect(()=>{let alive=true;fetchAppApi<unknown>('/navigation').then(r=>{if(alive)setNav(r.status===200?normalizeNavigation(r.data):[])}).catch(()=>{if(alive)setNav([])});return()=>{alive=false};},[]);
 useEffect(()=>{const sync=()=>setTheme(sessionStorage.getItem('fenix-theme')||'light');sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 const items=nav.length?nav:fallback;
 return <OperationalSidebar navigation={items} activeRoute="/expedientes" anaSubtitle="Asistente de Fénix Capital" anaRoute="/ana" className="detail-auth-nav" theme={theme} ariaLabel="Navegación autorizada del expediente"/>;
}
