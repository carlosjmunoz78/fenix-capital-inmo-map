import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {UserPlus} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';

type Ctx={role?:string};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}

export default function B2BContactCreateLauncher(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/inmobiliarias\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';
 const[allowed,setAllowed]=useState(false),[logged,setLogged]=useState(false);
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setLogged(Boolean(s)));return()=>{alive=false;subscription.unsubscribe()};},[]);
 useEffect(()=>{if(!logged||!id||!isNotionId(id)){setAllowed(false);return;}let alive=true;(async()=>{const r=await fetchAppApi<Ctx>('/session/context');if(!alive)return;setAllowed(r.status===200&&(r.data?.role==='Direccion'||r.data?.role==='Visitador'));})();return()=>{alive=false};},[logged,id]);
 if(!allowed||!id||!isNotionId(id))return null;
 return <button type="button" onClick={()=>navigate(`/inmobiliarias/${encodeURIComponent(id)}/contactos/nuevo`)} style={{position:'fixed',right:24,bottom:92,zIndex:6900,border:0,borderRadius:14,padding:'12px 16px',fontWeight:800,display:'flex',alignItems:'center',gap:8,boxShadow:'0 10px 30px rgba(0,0,0,.16)',cursor:'pointer'}}><UserPlus size={17}/> Nuevo contacto B2B</button>;
}
