import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, LogOut, Moon, Sun } from 'lucide-react';
import { supabase, SUPABASE_URL } from './supabase';
import { anaAvatar, fenixLogo } from './assets/visualAssets';
import './operational.css';

type Row={activity_code:string;owner_actor_code:string;inmobiliaria_code:string;canal:string;resultado?:string|null;proximo_contacto?:string|null;proxima_accion?:string|null;estado:string;version:number};
type Theme='light'|'dark';
type PendingCreate={inmobiliaria_code:string;canal:string;resultado:string;proxima_accion:string}|null;
type PendingDone=Row|null;

async function api(path:string,init?:RequestInit){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return {status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-visitas-api-test${path}`,{
    ...init,
    headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,...(init?.headers||{})}
  });
  let data:any=null;try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}

export default function VisitasShell(){
  const location=useLocation(),navigate=useNavigate();
  const active=location.pathname==='/visitas'||location.pathname.startsWith('/visitas/');
  const isNew=location.pathname==='/visitas/nueva';
  const detailMatch=location.pathname.match(/^\/visitas\/([^/]+)$/);
  const detailCode=detailMatch&&detailMatch[1]!=='nueva'?decodeURIComponent(detailMatch[1]):null;
  const [ready,setReady]=useState(false),[logged,setLogged]=useState(false),[rows,setRows]=useState<Row[]>([]),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
  const [inmo,setInmo]=useState(''),[canal,setCanal]=useState('Visita'),[resultado,setResultado]=useState(''),[proxima,setProxima]=useState('');
  const [pendingCreate,setPendingCreate]=useState<PendingCreate>(null),[pendingDone,setPendingDone]=useState<PendingDone>(null);
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const detail=useMemo(()=>detailCode?rows.find(r=>r.activity_code===detailCode)||null:null,[detailCode,rows]);

  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[theme]);

  async function load(){
    setLoading(true);
    const r=await api('/visitas');
    setLoading(false);
    if(r.status===200){setRows(r.data?.items??[]);setMessage('');}
    else if(r.status===403)setMessage('Tu perfil no tiene acceso a gestiones B2B.');
    else setMessage('No se pudieron cargar las gestiones.');
  }
  useEffect(()=>{if(active&&logged)void load();},[active,logged]);
  useEffect(()=>{setPendingCreate(null);setPendingDone(null);setMessage('');},[location.pathname]);

  if(!active||!ready||!logged)return null;

  function submit(e:FormEvent){
    e.preventDefault();
    setMessage('');
    setPendingCreate({inmobiliaria_code:inmo.trim(),canal,resultado:resultado.trim(),proxima_accion:proxima.trim()});
    setPendingDone(null);
  }
  async function confirmCreate(){
    if(!pendingCreate)return;
    setLoading(true);
    const r=await api('/visitas',{method:'POST',body:JSON.stringify(pendingCreate)});
    setLoading(false);
    if(r.status===201){
      setResultado('');setProxima('');setPendingCreate(null);setMessage('Gestión registrada.');
      await load();
      if(isNew)navigate('/visitas');
    }else if(r.status===403)setMessage('Esa inmobiliaria no pertenece a tu cartera.');
    else setMessage('No se pudo registrar la gestión.');
  }
  function prepareDone(row:Row){setPendingDone(row);setPendingCreate(null);setMessage('');}
  async function confirmDone(){
    const row=pendingDone;if(!row)return;
    setLoading(true);
    const r=await api(`/visitas/${encodeURIComponent(row.activity_code)}`,{method:'POST',body:JSON.stringify({expected_version:row.version,resultado:row.resultado||'Gestión realizada',proximo_contacto:row.proximo_contacto||null,proxima_accion:row.proxima_accion||'',estado:'Hecha'})});
    setLoading(false);
    if(r.status===200){setPendingDone(null);setMessage('Gestión actualizada.');await load();}
    else if(r.status===409)setMessage('La gestión cambió desde que la abriste. Recarga antes de confirmar.');
    else if(r.status===403)setMessage('Tu perfil no puede modificar esta gestión.');
    else setMessage('No se pudo actualizar la gestión.');
  }
  async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}

  const createForm=<form className="ops-message" onSubmit={submit} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
    <label>Inmobiliaria<input value={inmo} onChange={e=>setInmo(e.target.value)} placeholder="Código de inmobiliaria" required style={{width:'100%'}}/></label>
    <label>Canal<select value={canal} onChange={e=>setCanal(e.target.value)} style={{width:'100%'}}><option>Visita</option><option>Llamada</option><option>WhatsApp</option><option>Email</option><option>Otro</option></select></label>
    <label>Resultado<input value={resultado} onChange={e=>setResultado(e.target.value)} style={{width:'100%'}}/></label>
    <label>Próxima acción<input value={proxima} onChange={e=>setProxima(e.target.value)} style={{width:'100%'}}/></label>
    <button className="primary" disabled={loading}>Revisar antes de registrar</button>
  </form>;

  const previewCreate=pendingCreate&&<section className="ops-message" aria-label="Vista previa de nueva gestión">
    <strong>Vista previa antes de guardar</strong>
    <p><b>Inmobiliaria:</b> {pendingCreate.inmobiliaria_code}<br/><b>Canal:</b> {pendingCreate.canal}<br/><b>Resultado:</b> {pendingCreate.resultado||'Sin resultado indicado'}<br/><b>Próxima acción:</b> {pendingCreate.proxima_accion||'Sin próxima acción indicada'}</p>
    <div style={{display:'flex',gap:8}}><button className="primary" disabled={loading} onClick={()=>void confirmCreate()}>Confirmar y registrar</button><button disabled={loading} onClick={()=>setPendingCreate(null)}>Cancelar</button></div>
  </section>;

  const previewDone=pendingDone&&<section className="ops-message" aria-label="Vista previa de actualización de gestión">
    <strong>Vista previa antes de marcar hecha</strong>
    <p><b>Inmobiliaria:</b> {pendingDone.inmobiliaria_code}<br/><b>Canal:</b> {pendingDone.canal}<br/><b>Estado actual:</b> {pendingDone.estado}<br/><b>Nuevo estado:</b> Hecha</p>
    <div style={{display:'flex',gap:8}}><button className="primary" disabled={loading} onClick={()=>void confirmDone()}>Confirmar actualización</button><button disabled={loading} onClick={()=>setPendingDone(null)}>Cancelar</button></div>
  </section>;

  return <div className="ops-root visitas-root" data-theme={theme}>
    <aside className="ops-side">
      <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
      <nav><button onClick={()=>navigate('/inicio')}>Inicio</button><button onClick={()=>navigate('/inmobiliarias')}>Inmobiliarias</button><button className="active" onClick={()=>navigate('/visitas')}>Visitas / gestiones</button><button onClick={()=>navigate('/agenda')}>Agenda</button></nav>
      <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Hablar con Ana</strong><small>Asistente de Fénix Capital</small></span></button>
    </aside>
    <main className="ops-main">
      <header className="ops-top"><div className="ops-profile"><strong>Gestión B2B</strong></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
      <section className="ops-content">
        <div className="ops-title"><div><span className="ops-icon"><CalendarDays size={20}/></span><div><h1>{isNew?'Nueva visita / gestión':detailCode?'Ficha de visita / gestión':'Visitas y gestiones'}</h1><p>{isNew?'Registra una nueva gestión dentro de la cartera autorizada.':detailCode?'Consulta la gestión y prepara cualquier cambio antes de guardarlo.':'Visita, llamada, WhatsApp o email; resultado y siguiente acción dentro de tu cartera.'}</p></div></div><span className="ops-live ok">RBAC activo</span></div>
        <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Registra cada contacto con la inmobiliaria. Antes de escribir, revisas exactamente qué se va a guardar.</p></div></article>

        {isNew&&<><button onClick={()=>navigate('/visitas')}>← Volver a visitas</button>{createForm}{previewCreate}</>}

        {detailCode&&<>
          <button onClick={()=>navigate('/visitas')}>← Volver a visitas</button>
          {!loading&&!detail&&<div className="ops-message">La gestión no está disponible en tu ámbito autorizado.</div>}
          {detail&&<article className="ops-message" aria-label="Ficha de visita"><h2>{detail.inmobiliaria_code}</h2><p><b>Código:</b> {detail.activity_code}<br/><b>Canal:</b> {detail.canal}<br/><b>Resultado:</b> {detail.resultado||'No disponible'}<br/><b>Próxima acción:</b> {detail.proxima_accion||'No disponible'}<br/><b>Próximo contacto:</b> {detail.proximo_contacto||'No disponible'}<br/><b>Estado:</b> {detail.estado}</p>{detail.estado==='Pendiente'&&<button onClick={()=>prepareDone(detail)}>Revisar para marcar hecha</button>}</article>}
          {previewDone}
        </>}

        {!isNew&&!detailCode&&<>
          <div style={{display:'flex',justifyContent:'flex-end'}}><button className="primary" onClick={()=>navigate('/visitas/nueva')}>Nueva visita / gestión</button></div>
          {createForm}
          {previewCreate}
          {previewDone}
          {message&&<div className="ops-message">{message}</div>}
          <div className="ops-table-card"><div className="ops-table-head"><strong>{rows.length} gestiones</strong><span>PRE-PROD autorizado</span></div><div className="ops-table-wrap"><table><thead><tr><th>Inmobiliaria</th><th>Canal</th><th>Resultado</th><th>Próxima acción</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{rows.map(r=><tr key={r.activity_code}><td>{r.inmobiliaria_code}</td><td>{r.canal}</td><td>{r.resultado||'—'}</td><td>{r.proxima_accion||'—'}</td><td>{r.estado}</td><td><div style={{display:'flex',gap:6}}><button onClick={()=>navigate(`/visitas/${encodeURIComponent(r.activity_code)}`)}>Abrir</button>{r.estado==='Pendiente'?<button onClick={()=>prepareDone(r)}>Revisar para marcar hecha</button>:null}</div></td></tr>)}</tbody></table></div></div>
        </>}
        {(isNew||detailCode)&&message&&<div className="ops-message">{message}</div>}
      </section>
    </main>
  </div>;
}
