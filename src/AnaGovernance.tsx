import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, LogOut, Moon, Sun, X } from 'lucide-react';
import { fetchAppApi, supabase } from './supabase';
import { anaAvatar, fenixLogo } from './assets/visualAssets';
import './operational.css';

type Correction={correction_code:string;created_by_actor_code:string;scope_type:string;scope_code?:string|null;ana_suggestion:string;user_reason:string;proposed_rule?:string|null;approved_rule?:string|null;status:'Pendiente'|'Aprobada'|'Rechazada';version:number;review_reason?:string|null};
type Ctx={actor_code?:string;role?:string};
type ListResponse={items?:Correction[]};
type Theme='light'|'dark';

export default function AnaGovernance(){
  const location=useLocation(),navigate=useNavigate();
  const [logged,setLogged]=useState(false),[ready,setReady]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[items,setItems]=useState<Correction[]>([]);
  const [suggestion,setSuggestion]=useState(''),[reason,setReason]=useState(''),[rule,setRule]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const active=location.pathname==='/ana'||location.pathname.startsWith('/ana/');
  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[theme]);
  async function load(){const [c,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<ListResponse>('/ana/correcciones')]);setCtx(c.status===200?c.data:null);setItems(r.status===200?(r.data?.items??[]):[]);}
  useEffect(()=>{if(active&&logged)void load();},[active,logged]);
  if(!active||!ready||!logged)return null;
  const isDirection=(ctx?.role||'').toLowerCase().includes('direccion')||(ctx?.role||'').toLowerCase().includes('dirección');
  async function submit(e:FormEvent){e.preventDefault();setMessage('');if(reason.trim().length<2||suggestion.trim().length<2){setMessage('Indica qué sugirió Ana y por qué no debe hacerse así.');return;}setSaving(true);const r=await fetchAppApi('/ana/correcciones',{method:'POST',body:JSON.stringify({scope_type:'general',ana_suggestion:suggestion,user_reason:reason,proposed_rule:rule})});setSaving(false);if(r.status===201){setSuggestion('');setReason('');setRule('');setMessage('Corrección enviada para revisión de Dirección.');await load();}else setMessage('No se pudo guardar la corrección.');}
  async function decide(c:Correction,decision:'aprobar'|'rechazar'){setMessage('');const approved=decision==='aprobar'?(c.proposed_rule||c.user_reason):'';const r=await fetchAppApi(`/ana/correcciones/${encodeURIComponent(c.correction_code)}/decision`,{method:'POST',body:JSON.stringify({expected_version:c.version,decision,review_reason:decision==='aprobar'?'Validada por Dirección':'Rechazada por Dirección',approved_rule:approved})});if(r.status===200){setMessage(decision==='aprobar'?'Corrección aprobada y convertida en norma.':'Corrección rechazada.');await load();}else setMessage('No se pudo registrar la decisión.');}
  async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
  return <div className="ops-root" data-theme={theme}>
    <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav><button onClick={()=>navigate('/inicio')}>Inicio</button><button className="active">Hablar con Ana</button><button onClick={()=>navigate('/agenda')}>Agenda</button><button onClick={()=>navigate('/contactos')}>Contactos</button></nav><button className="ops-ana"><img src={anaAvatar} alt="Ana"/><span><strong>Ana</strong><small>Asistente de Fénix Capital</small></span></button></aside>
    <main className="ops-main"><header className="ops-top"><div className="ops-profile"><strong>Gobierno de Ana · {ctx?.role||'Usuario'}</strong></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
      <section className="ops-content"><div className="ops-title"><div><img src={anaAvatar} alt="Ana" style={{width:48,height:48,borderRadius:'50%'}}/><div><h1>Hablar con Ana</h1><p>Una acción cada vez. Las correcciones no se convierten en norma sin revisión.</p></div></div><span className="ops-live ok">Gobierno activo</span></div>
        <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Si no quieres seguir una sugerencia mía, explícame por qué. Esa corrección queda pendiente y Dirección decide si debe convertirse en una norma para el futuro.</p></div></article>
        <form className="ops-message" onSubmit={submit} style={{display:'grid',gap:10}}><strong>Corregir una sugerencia de Ana</strong><label>¿Qué sugirió Ana?<textarea value={suggestion} onChange={e=>setSuggestion(e.target.value)} rows={2} style={{width:'100%'}}/></label><label>¿Por qué no debe hacerse así?<textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{width:'100%'}}/></label><label>Regla propuesta para próximas veces (opcional)<textarea value={rule} onChange={e=>setRule(e.target.value)} rows={2} style={{width:'100%'}}/></label><button className="primary" disabled={saving}>{saving?'Guardando…':'Enviar a revisión'}</button></form>
        {message&&<div className="ops-message">{message}</div>}
        <div className="ops-table-card"><div className="ops-table-head"><strong>Correcciones y aprendizaje</strong><span>Pendiente → Aprobada/Rechazada</span></div><div className="ops-table-wrap"><table><thead><tr><th>Estado</th><th>Creada por</th><th>Sugerencia</th><th>Motivo</th><th>Regla propuesta</th>{isDirection&&<th>Revisión</th>}</tr></thead><tbody>{items.map(c=><tr key={c.correction_code}><td>{c.status}</td><td>{c.created_by_actor_code}</td><td>{c.ana_suggestion}</td><td>{c.user_reason}</td><td>{c.approved_rule||c.proposed_rule||'—'}</td>{isDirection&&<td>{c.status==='Pendiente'?<div style={{display:'flex',gap:6}}><button onClick={()=>void decide(c,'aprobar')} aria-label="Aprobar corrección"><Check size={15}/> Aprobar</button><button onClick={()=>void decide(c,'rechazar')} aria-label="Rechazar corrección"><X size={15}/> Rechazar</button></div>:c.review_reason||'Revisada'}</td>}</tr>)}</tbody></table></div></div>
      </section>
    </main>
  </div>;
}
