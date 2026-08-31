import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {supabase} from './supabase';

export default function GlobalOperationalFooter(){
 const navigate=useNavigate();
 const location=useLocation();
 const[logged,setLogged]=useState(false);
 useEffect(()=>{
  let alive=true;
  supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setLogged(Boolean(session)));
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 if(!logged||location.pathname==='/')return null;
 return <>
  <style>{`#root:has(> .ops-root)>.fenix-global-footer{display:none!important}.fenix-global-footer{position:fixed;left:238px;right:0;bottom:0;z-index:3900;height:38px;display:flex;align-items:center;justify-content:center;gap:18px;border-top:1px solid #e5e7eb;background:#fff;color:#667085;font:11px/1.2 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.05em;text-align:center}.fenix-global-footer>strong{font-size:10.5px;letter-spacing:.08em;white-space:nowrap}.fenix-global-footer>nav{display:flex;align-items:center;gap:4px}.fenix-global-footer button{border:0;background:transparent;color:inherit;font:inherit;font-weight:700;letter-spacing:0;padding:5px 7px;border-radius:7px;cursor:pointer}.fenix-global-footer button:hover{background:rgba(127,127,127,.10);color:#e95d27}html[data-theme='dark'] .fenix-global-footer{background:#202023;border-color:#343438;color:#aaaab2}html[data-theme='dark'] .fenix-global-footer button:hover{background:#2b2b2f;color:#ff7a42}@media(max-width:900px){.fenix-global-footer{left:96px}.fenix-global-footer>strong{display:none}}@media(max-width:760px){.fenix-global-footer{left:0}}@media(max-width:650px){.fenix-global-footer{left:0;bottom:58px;height:34px;font-size:10px;gap:2px}.fenix-global-footer button{padding:4px 5px}}`}</style>
  <footer className="fenix-global-footer" aria-label="Pie de Fénix Capital"><strong>FÉNIX CAPITAL · CEREBRO</strong><nav aria-label="Enlaces del pie"><button type="button" onClick={()=>navigate('/inicio')}>Inicio</button><button type="button" onClick={()=>navigate('/documentacion')}>Documentación</button><button type="button" onClick={()=>navigate('/ana')}>Ana</button><button type="button" onClick={()=>navigate('/perfil')}>Mi perfil</button></nav></footer>
 </>;
}
