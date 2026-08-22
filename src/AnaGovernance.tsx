import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAnaApi, fetchAppApi, supabase } from './supabase';
import { anaAvatar, fenixLogo } from './assets/visualAssets';
import './operational.css';

type DecisionKind='regla'|'excepcion_precedente'|'contexto_caso'|'descartar';
type Correction={
  correction_code:string;created_by_actor_code:string;scope_type:string;scope_code?:string|null;
  ana_suggestion:string;user_reason:string;proposed_rule?:string|null;approved_rule?:string|null;
  status:'Pendiente'|'Aprobada'|'Rechazada';version:number;review_reason?:string|null;decision_kind?:DecisionKind|null;
};
type Ctx={actor_code?:string;role?:string};
type Capabilities={
  show_ana_execute?:boolean;can_ana_execute?:boolean;ana_execute_requires_action_context?:boolean;
  can_ana_help?:boolean;can_manual_execute?:boolean;can_upload_evidence?:boolean;can_correct_ana?:boolean;
  can_view_learning_inbox?:boolean;can_decide_learning?:boolean;learning_inbox_disabled_reason?:string|null;
};
type ApiEnvelope<T>={ok?:boolean;status?:number;items?:T[];capabilities?:Capabilities;correction?:T;reused?:boolean;no_op?:boolean;notion?:{ok?:boolean}};
type Theme='light'|'dark';

const decisionLabel:Record<DecisionKind,string>={
  regla:'Regla',excepcion_precedente:'Excepción / precedente',contexto_caso:'Solo contexto del caso',descartar:'Descartar'
};

export default function AnaGovernance(){
  const location=useLocation(),navigate=useNavigate();
  const [logged,setLogged]=useState(false),[ready,setReady]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null);
  const [caps,setCaps]=useState<Capabilities|null>(null),[items,setItems]=useState<Correction[]>([]);
  const [suggestion,setSuggestion]=useState(''),[reason,setReason]=useState(''),[rule,setRule]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
  const [reviewing,setReviewing]=useState<string|null>(null),[comments,setComments]=useState<Record<string,string>>({});
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const createKey=useRef(`ana-ui:${crypto.randomUUID()}`);
  const active=location.pathname==='/ana'||location.pathname.startsWith('/ana/');
  const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
  const scopeType=params.get('scope_type')?.trim()||params.get('resource')?.trim()||'general';
  const scopeCode=params.get('scope_code')?.trim()||params.get('contact_id')?.trim()||params.get('inmobiliaria_id')?.trim()||params.get('expediente_id')?.trim()||params.get('task_id')?.trim()||'';
  const correctionContext=scopeType!=='general'||Boolean(scopeCode)||Boolean(params.get('correction'));

  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[theme]);
  useEffect(()=>{if(!active)return;if(params.get('mode')==='do'&&scopeType==='contacto'&&!scopeCode&&!params.get('channel')&&!params.get('correction'))navigate('/contactos/nuevo',{replace:true});},[active,params,scopeType,scopeCode,navigate]);
  useEffect(()=>{if(!active)return;const s=params.get('correction')?.trim()||'',r=params.get('reason')?.trim()||'',p=params.get('rule')?.trim()||'';if(s)setSuggestion(s);if(r)setReason(r);if(p)setRule(p);},[active,params]);

  async function load(){
    const [c,cap]=await Promise.all([
      fetchAppApi<Ctx>('/session/context'),
      fetchAnaApi<ApiEnvelope<Correction>>('/capabilities')
    ]);
    setCtx(c.status===200?c.data:null);
    const nextCaps=cap.status===200?cap.data?.capabilities??null:null;
    setCaps(nextCaps);
    if(nextCaps?.can_view_learning_inbox){
      const list=await fetchAnaApi<ApiEnvelope<Correction>>('/corrections');
      setItems(list.status===200?(list.data?.items??[]):[]);
    }else setItems([]);
  }
  useEffect(()=>{if(active&&logged)void load();},[active,logged]);
  if(!active||!ready||!logged)return null;

  async function submit(e:FormEvent){
    e.preventDefault();setMessage('');
    if(!caps?.can_correct_ana){setMessage('No tienes permiso para registrar correcciones en este contexto.');return;}
    if(reason.trim().length<2||suggestion.trim().length<2){setMessage('Indica qué sugirió Ana y qué debe corregirse.');return;}
    setSaving(true);
    const payload:Record<string,unknown>={scope_type:scopeType,ana_suggestion:suggestion,user_reason:reason,proposed_rule:rule||null,idempotency_key:createKey.current};if(scopeCode)payload.scope_code=scopeCode;
    const r=await fetchAnaApi<ApiEnvelope<Correction>>('/corrections',{method:'POST',body:JSON.stringify(payload)});
    setSaving(false);
    if(r.status===200||r.status===201){
      setSuggestion('');setReason('');setRule('');createKey.current=`ana-ui:${crypto.randomUUID()}`;
      setMessage(r.data?.reused?'La corrección ya estaba registrada; no se ha duplicado.':'Corrección guardada. Ana la ha dejado preparada para revisión de Belén.');
      await load();
    }else setMessage('No se pudo guardar la corrección.');
  }

  async function decide(c:Correction,kind:DecisionKind){
    if(!caps?.can_decide_learning)return;
    const comment=(comments[c.correction_code]||'').trim();
    if(kind!=='descartar'&&!comment){setMessage('Añade un comentario de Belén antes de clasificar esta corrección.');return;}
    setReviewing(`${c.correction_code}:${kind}`);setMessage('');
    const idem=`ana-decision:${c.correction_code}:${c.version}:${kind}`;
    const approved=kind==='regla'?(c.proposed_rule||c.user_reason):null;
    const r=await fetchAnaApi<ApiEnvelope<Correction>>(`/corrections/${encodeURIComponent(c.correction_code)}/decision`,{
      method:'POST',body:JSON.stringify({expectedVersion:c.version,decision_kind:kind,comment,approved_rule:approved,idempotency_key:idem})
    });
    setReviewing(null);
    if(r.status===200){
      setMessage(r.data?.reused?`La decisión ${decisionLabel[kind]} ya estaba registrada; no se ha duplicado.`:`Corrección clasificada como ${decisionLabel[kind]}.`);
      setComments(v=>{const n={...v};delete n[c.correction_code];return n;});await load();
    }else if(r.status===403)setMessage('Esta decisión está reservada a Belén.');
    else setMessage('No se pudo registrar la decisión.');
  }

  async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
  const inboxAllowed=Boolean(caps?.can_view_learning_inbox);

  return <div className="ops-root" data-theme={theme}>
    <aside className="ops-side">
      <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
      <nav><button onClick={()=>navigate('/inicio')}>Inicio</button><button className="active">Hablar con Ana</button><button onClick={()=>navigate('/agenda')}>Agenda</button><button onClick={()=>navigate('/contactos')}>Contactos</button></nav>
      <button className="ops-ana"><img src={anaAvatar} alt="Ana"/><span><strong>Ana</strong><small>Asistente de Fénix Capital</small></span></button>
    </aside>
    <main className="ops-main">
      <header className="ops-top"><div className="ops-profile"><strong>Ana · {ctx?.role||'Usuario'}</strong></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
      <section className="ops-content">
        <div className="ops-title"><div><img src={anaAvatar} alt="Ana" style={{width:48,height:48,borderRadius:'50%'}}/><div><h1>Hablar con Ana</h1><p>{inboxAllowed?'Correcciones pendientes de todos los módulos, reunidas en una sola bandeja.':'Ana sigue ayudándote en tu trabajo; la bandeja global de correcciones está reservada a Belén.'}</p></div></div><span className={`ops-live ${inboxAllowed?'ok':''}`}>{inboxAllowed?'Bandeja Belén':'Acceso limitado'}</span></div>

        <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>{inboxAllowed?'Aquí te reúno las correcciones que se han ido registrando en expedientes, contactos, comunicaciones, tareas y demás módulos. Tú decides qué pasa a regla, qué queda como excepción, qué solo sirve para este caso y qué descartamos.':'Te seguiré diciendo qué conviene hacer y podrás corregirme en cada caso. La revisión global del aprendizaje está capada para tu rol en esta fase.'}</p></div></article>

        {(correctionContext||inboxAllowed)&&caps?.can_correct_ana&&<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:10}}>
          <strong>Ana se ha equivocado</strong>{scopeType!=='general'&&<small>Contexto: {scopeType}{scopeCode?` · ${scopeCode}`:''}</small>}
          <label>¿Qué recomendó Ana?<textarea value={suggestion} onChange={e=>setSuggestion(e.target.value)} rows={2} style={{width:'100%'}}/></label>
          <label>¿Qué ocurrió / qué debería corregirse?<textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{width:'100%'}}/></label>
          <label>Posible regla o aprendizaje (opcional)<textarea value={rule} onChange={e=>setRule(e.target.value)} rows={2} style={{width:'100%'}}/></label>
          <button className="primary" disabled={saving}>{saving?'Guardando…':'Guardar corrección'}</button>
        </form>}

        {!inboxAllowed&&<div className="ops-message"><strong>Correcciones globales capadas</strong><p>{caps?.learning_inbox_disabled_reason||'En Fase 1, solo Belén puede revisar y clasificar el aprendizaje global.'}</p><p>Desde cada expediente, contacto, visita o tarea sí podrás corregir a Ana y adjuntar contexto/evidencia.</p></div>}
        {message&&<div className="ops-message">{message}</div>}

        {inboxAllowed&&<div className="ops-table-card">
          <div className="ops-table-head"><strong>Correcciones pendientes de Belén</strong><span>{items.length} pendiente{items.length===1?'':'s'}</span></div>
          <div className="ops-table-wrap"><table><thead><tr><th>Origen</th><th>Quién</th><th>Recomendó Ana</th><th>Qué ocurrió</th><th>Propuesta</th><th>Comentario de Belén</th><th>Clasificar</th></tr></thead>
          <tbody>{items.length===0?<tr><td colSpan={7}>No hay correcciones pendientes.</td></tr>:items.map(c=><tr key={c.correction_code}>
            <td>{c.scope_type}{c.scope_code?<><br/><small>{c.scope_code}</small></>:null}</td><td>{c.created_by_actor_code}</td><td>{c.ana_suggestion}</td><td>{c.user_reason}</td><td>{c.proposed_rule||'—'}</td>
            <td><textarea aria-label={`Comentario Belén ${c.correction_code}`} value={comments[c.correction_code]||''} onChange={e=>setComments(v=>({...v,[c.correction_code]:e.target.value}))} rows={3} style={{minWidth:190}} placeholder="Matiz, condición o motivo"/></td>
            <td><div style={{display:'grid',gap:6,minWidth:180}}>{(Object.keys(decisionLabel) as DecisionKind[]).map(kind=><button key={kind} disabled={Boolean(reviewing)} onClick={()=>void decide(c,kind)}>{reviewing===`${c.correction_code}:${kind}`?'Guardando…':decisionLabel[kind]}</button>)}</div></td>
          </tr>)}</tbody></table></div>
        </div>}
      </section>
    </main>
  </div>;
}
