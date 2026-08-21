import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Building2,FileText,MessageCircle,Save,UserRound} from 'lucide-react';
import {SUPABASE_URL,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './detail-expediente.css';

type AnyRow=Record<string,any>;
async function legacyDetailApi(path:string){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return {status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-detail-api-test${path}`,{headers:{Authorization:`Bearer ${session.access_token}`}});let data:any=null;try{data=await r.json()}catch{}return {status:r.status,data};}
async function notionActionApi(resource:string,id:string,changes:Record<string,unknown>){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return {status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/${resource}/${encodeURIComponent(id)}/action`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'update',changes})});let data:any=null;try{data=await r.json()}catch{}return {status:r.status,data};}
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function detailApi(type:string,code:string){
  if(isNotionId(code)){
    const notionType=type==='contactos'?'clientes':type;
    const r=await fetchNotionRuntime<any>(`/${notionType}/${encodeURIComponent(code)}`);
    if(r.status!==404)return r;
  }
  return legacyDetailApi(`/${type}/${encodeURIComponent(code)}`);
}
function pretty(k:string){return k.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}
function val(v:any){if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'Sí':'No';if(Array.isArray(v))return v.length?v.map(x=>typeof x==='object'?(x.name||x.id||JSON.stringify(x)):String(x)).join(', '):'—';if(typeof v==='object')return JSON.stringify(v);return String(v)}
function pick(row:AnyRow|undefined,keys:string[]){if(!row)return null;for(const k of keys){const v=row[k];if(v!==undefined&&v!==null&&v!=='')return v}return null}
const phases=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
function phaseIndex(raw:any){const s=String(raw||'').toLowerCase();const aliases=[['entrada','nuevo','inicial'],['document','doc'],['análisis','analisis','estudio'],['banco','banc'],['tasación','tasacion'],['oferta','aprob'],['fein'],['notar'],['firma'],['cierre','cerrado','final']];const i=aliases.findIndex(group=>group.some(x=>s.includes(x)));return i>=0?i:0}
function display(v:any){return v===null||v===undefined||v===''?'No disponible':val(v)}

export default function DetailShell(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/(expedientes|contactos|inmobiliarias)\/([^/]+)$/);const active=Boolean(match);const type=match?.[1]||'';const code=match?.[2]?decodeURIComponent(match[2]):'';
 const [status,setStatus]=useState<number|null>(null),[data,setData]=useState<any>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const [notes,setNotes]=useState(''),[nextAction,setNextAction]=useState(''),[actionBusy,setActionBusy]=useState(false),[actionMsg,setActionMsg]=useState('');
 const [anaChoice,setAnaChoice]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;(async()=>{setLoading(true);setMessage('');setActionMsg('');const r=await detailApi(type,code);if(!alive)return;setStatus(r.status);setData(r.data);setLoading(false);if(r.status===403)setMessage('Tu perfil no puede abrir esta ficha.');else if(r.status===404)setMessage('No se ha encontrado la ficha.');else if(r.status!==200)setMessage('No se pudo cargar la ficha.');})();return()=>{alive=false}},[active,type,code]);
 const main=useMemo(()=>{if(!data)return null;if(data.source==='notion_canonical'&&data.item)return data.item;return type==='expedientes'?data.expediente:type==='inmobiliarias'?data.inmobiliaria:data.contacto},[data,type]);
 const canonical=Boolean(data?.source==='notion_canonical');
 if(!active)return null;
 const title=type==='expedientes'?'Expediente':type==='inmobiliarias'?'Inmobiliaria':'Contacto';
 const Icon=type==='expedientes'?FileText:type==='inmobiliarias'?Building2:UserRound;
 const scopeType=type==='inmobiliarias'?'inmobiliaria':'expediente';
 const scopeCode=type==='contactos'?(main?.destino?.startsWith('/expedientes/')?main.destino.split('/').pop():main?.destino?.startsWith('/inmobiliarias/')?main.destino.split('/').pop():''):code;
 const fields=main?Object.keys(main).filter(k=>!['id','synthetic','destino','fuente'].includes(k)):[];
 const displayName=main?.expediente||main?.cliente||main?.inmobiliaria||main?.cliente_alias||main?.nombre_alias||main?.nombre||title;
 const actionResource=type==='contactos'?'clientes':type;
 const currentPhase=pick(main,['fase','fase_actual','estado_fase']);
 const pIndex=phaseIndex(currentPhase);
 const resumen={
  cliente:pick(main,['cliente','cliente_alias','nombre_cliente','nombre']),
  titulares:pick(main,['titulares','titular','numero_titulares']),
  inmobiliaria:pick(main,['inmobiliaria','agencia','inmobiliaria_nombre']),
  financiero:pick(main,['financiero','financiero_ficha','financiero_nombre','id_financiero_operativo']),
  visitador:pick(main,['visitador','visitador_ficha','visitador_nombre','id_visitador_operativo']),
  fase:currentPhase,
  riesgo:pick(main,['riesgo','nivel_riesgo','criticidad']),
  proxima:pick(main,['proxima_accion','próxima_acción','siguiente_accion'])
 };
 const economicos={
  precio:pick(main,['precio','precio_compra','importe_compra']),
  financiacion:pick(main,['financiacion','financiación','importe_financiacion','importe_financiación']),
  ahorro:pick(main,['ahorro','ahorros','aportacion','aportación']),
  ingresos:pick(main,['ingresos','ingresos_mensuales','ingresos_neto']),
  deudas:pick(main,['deudas','cuotas_deuda','deuda_mensual']),
  ratio:pick(main,['ratio','ratio_endeudamiento','endeudamiento']),
  ltv:pick(main,['ltv','LTV']),
  banco:pick(main,['banco','entidad','banco_objetivo'])
 };
 async function saveFollowUp(){if(!canonical||!isNotionId(code)||(!notes.trim()&&!nextAction))return;setActionBusy(true);setActionMsg('');const changes:Record<string,unknown>={};if(notes.trim())changes.notas=notes.trim();if(nextAction){if(type==='inmobiliarias')changes.proximo_contacto_b2b=nextAction;else changes.proxima_accion=nextAction;}const r=await notionActionApi(actionResource,code,changes);setActionBusy(false);if(r.status===200){setActionMsg('Seguimiento guardado y auditado en Notion.');setNotes('');setNextAction('');const fresh=await detailApi(type,code);if(fresh.status===200){setData(fresh.data);setStatus(200)}}else if(r.status===403)setActionMsg('Tu perfil no puede modificar esta ficha.');else setActionMsg(`No se pudo guardar el seguimiento (${r.data?.error||r.status}).`);}
 function ana(mode:'do'|'help'|'self'){setAnaChoice(mode);if(mode==='do')navigate(`/ana?mode=do&scope_type=${scopeType}&scope_code=${encodeURIComponent(scopeCode)}`);else if(mode==='help')navigate(`/ana?mode=help&scope_type=${scopeType}&scope_code=${encodeURIComponent(scopeCode)}`);else setTimeout(()=>document.getElementById('seguimiento-contextual')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}
 const sidebar=<aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav><button onClick={()=>navigate(`/${type}`)}><ArrowLeft size={15}/> Volver</button><button onClick={()=>navigate('/comunicaciones')}>Comunicaciones</button><button onClick={()=>navigate('/agenda')}>Agenda</button><button onClick={()=>navigate('/documentacion')}>Documentación</button></nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Cuando quieras, avanzamos paso a paso.</small></span></button></aside>;

 if(type==='expedientes')return <div className="ops-root detail-exp-root" style={{zIndex:5200}} data-theme={(sessionStorage.getItem('fenix-theme')||'light')}>
  {sidebar}
  <main className="ops-main detail-exp-main"><header className="ops-top detail-exp-top"><button className="detail-filter" onClick={()=>navigate('/expedientes')}>Filtros avanzados</button><div className="detail-search">Buscar expediente, cliente o tarea…</div><button className="primary" onClick={()=>navigate('/expedientes')}>Buscar</button><strong>{title}</strong></header>
  <section className="ops-content detail-exp-content">
   <article className="detail-ana-hero"><img src={anaAvatar} alt="Ana"/><div className="detail-ana-copy"><span>ANA · EN ESTA PANTALLA</span><h2>¿Qué hacemos ahora?</h2><p>Un expediente se vuelve sencillo cuando solo miramos el siguiente paso.</p><div className="detail-next-list"><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}><b>1</b><strong>Revisar bloqueos</strong><em>Ver y preparar →</em></button><button onClick={()=>document.getElementById('seguimiento-contextual')?.scrollIntoView({behavior:'smooth'})}><b>2</b><strong>Priorizar próximas acciones</strong><em>Ver y preparar →</em></button><button onClick={()=>navigate(`/tasaciones?expediente=${encodeURIComponent(code)}`)}><b>3</b><strong>Comprobar riesgos</strong><em>Ver y preparar →</em></button></div><button className="primary detail-upload" onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}>↑ Subir documentación</button></div></article>
   <button className="detail-back" onClick={()=>navigate('/expedientes')}>← Volver a expedientes</button>
   <div className="detail-master-title"><span>FICHA MAESTRA</span><h1>{displayName}</h1><p>{canonical?'Fuente canónica Notion · acceso filtrado por tu rol.':'Ficha PRE-PROD autorizada por rol.'}</p></div>
   {message&&<div className="ops-message">{message}</div>}
   {main&&<>
    <section className="detail-journey"><div className="detail-section-label">RECORRIDO DEL EXPEDIENTE</div><div className="detail-phase-track">{phases.map((phase,i)=><div key={phase} className={i<pIndex?'done':i===pIndex?'current':''}><span>{i<pIndex?'✓':i+1}</span><small>{phase}</small></div>)}</div></section>
    <nav className="detail-tabs"><button className="active">Resumen</button><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}>Documentación</button><button onClick={()=>setAnaChoice('analysis')}>Análisis</button><button onClick={()=>setAnaChoice('bank')}>Banco</button><button onClick={()=>navigate('/tareas')}>Tareas</button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}>Comunicaciones</button><button onClick={()=>setAnaChoice('activity')}>Actividad</button><button onClick={()=>setAnaChoice('history')}>Historial</button><button onClick={()=>navigate(`/ana?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}>Ana</button></nav>
    {anaChoice&&['analysis','bank','activity','history'].includes(anaChoice)&&<div className="detail-inline-note">Este bloque se abrirá cuando exista una fuente canónica conectada para esta sección. No se muestran datos inventados.</div>}
    <div className="detail-summary-grid">
     <article className="detail-summary-card"><span>SITUACIÓN ACTUAL</span><h2>{display(currentPhase)}</h2><div className="detail-kv"><div><small>Cliente</small><strong>{display(resumen.cliente)}</strong></div><div><small>Titulares</small><strong>{display(resumen.titulares)}</strong></div><div><small>Inmobiliaria</small><strong>{display(resumen.inmobiliaria)}</strong></div><div><small>Financiero</small><strong>{display(resumen.financiero)}</strong></div><div><small>Visitador</small><strong>{display(resumen.visitador)}</strong></div><div><small>Fase</small><strong>{display(resumen.fase)}</strong></div><div><small>Riesgo</small><strong>{display(resumen.riesgo)}</strong></div><div><small>Próxima acción</small><strong>{display(resumen.proxima)}</strong></div></div></article>
     <article className="detail-summary-card"><span>OPERACIÓN</span><h2>Datos económicos</h2><div className="detail-kv"><div><small>Precio</small><strong>{display(economicos.precio)}</strong></div><div><small>Financiación</small><strong>{display(economicos.financiacion)}</strong></div><div><small>Ahorro</small><strong>{display(economicos.ahorro)}</strong></div><div><small>Ingresos</small><strong>{display(economicos.ingresos)}</strong></div><div><small>Deudas</small><strong>{display(economicos.deudas)}</strong></div><div><small>Ratio</small><strong>{display(economicos.ratio)}</strong></div><div><small>LTV</small><strong>{display(economicos.ltv)}</strong></div><div><small>Banco</small><strong>{display(economicos.banco)}</strong></div></div><p className="detail-source-note">Los campos sin fuente conectada se muestran vacíos, nunca inventados.</p></article>
    </div>
    <article className="detail-next-action"><img src={anaAvatar} alt="Ana"/><div><span>ANA · SIGUIENTE MEJOR ACCIÓN</span><h2>{resumen.proxima?display(resumen.proxima):'Confirmar el dato que desbloquee el caso'}</h2><p>{resumen.proxima?'Esta acción procede del expediente canónico.':'No hay una próxima acción registrada; Ana no completará datos por suposición.'}</p><div className="detail-prepared"><small>TEXTO PREPARADO · WHATSAPP / CORREO / GUION DE LLAMADA</small><p>Antes de enviar nada, se prepara una vista previa y se mantiene el contexto del expediente.</p></div><div className="detail-ana-actions"><button onClick={()=>ana('do')}><strong>Que lo haga Ana</strong><small>Preparar para revisión</small></button><button onClick={()=>ana('help')}><strong>Ayúdame</strong><small>Ver texto y pasos</small></button><button onClick={()=>ana('self')}><strong>Lo hago yo</strong><small>Ir al seguimiento</small></button></div></div></article>
    <div className="detail-action-row"><button className="primary" onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}><MessageCircle size={16}/> Preparar Email / WhatsApp</button><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}>Documentación</button><button onClick={()=>navigate(`/tasaciones?expediente=${encodeURIComponent(code)}`)}>Tasaciones</button><button onClick={()=>navigate(`/firmas?expediente=${encodeURIComponent(code)}`)}>FEIN / Firma</button></div>
    {canonical&&isNotionId(code)&&<div className="ops-table-card" id="seguimiento-contextual"><div className="ops-table-head"><strong>Seguimiento contextual</strong><span>Escritura permitida y auditada · PRE-PROD</span></div><div className="ops-message" style={{display:'grid',gap:10}}><label>Notas<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Añade contexto operativo sin duplicar datos..."/></label><label>Próxima acción<input type="date" value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label><div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><button className="primary" disabled={actionBusy||(!notes.trim()&&!nextAction)} onClick={saveFollowUp}><Save size={16}/>{actionBusy?'Guardando…':'Guardar seguimiento'}</button>{actionMsg&&<span>{actionMsg}</span>}</div></div></div>}
   </>}
  </section></main></div>;

 return <div className="ops-root" style={{zIndex:5200}} data-theme={(sessionStorage.getItem('fenix-theme')||'light')}>{sidebar}<main className="ops-main"><header className="ops-top"><strong>{title}</strong></header><section className="ops-content"><div className="ops-title"><div><span className="ops-icon"><Icon size={20}/></span><div><h1>{displayName}</h1><p>{canonical?'Fuente canónica Notion · acceso filtrado por tu rol.':'Ficha PRE-PROD autorizada por rol.'}</p></div></div><span className={status===200?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?(canonical?'Notion vivo':'Datos vivos'):'PRE-PROD'}</span></div><article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Desde esta ficha puedes preparar la siguiente acción sin perder el contexto del registro.</p></div></article>{message&&<div className="ops-message">{message}</div>}{main&&<><div className="ops-message" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{fields.map(k=><div key={k}><small>{pretty(k)}</small><div><strong>{val(main[k])}</strong></div></div>)}</div><div className="ops-message" style={{display:'flex',gap:8,flexWrap:'wrap'}}>{scopeCode&&<button className="primary" onClick={()=>navigate(`/comunicaciones/nueva?scope_type=${scopeType}&scope_code=${encodeURIComponent(scopeCode)}`)}><MessageCircle size={16}/> Preparar Email / WhatsApp</button>}{type==='inmobiliarias'&&<button onClick={()=>navigate('/visitas')}>Registrar gestión B2B</button>}</div>{canonical&&isNotionId(code)&&<div className="ops-table-card" id="seguimiento-contextual"><div className="ops-table-head"><strong>Seguimiento contextual</strong><span>Escritura permitida y auditada · PRE-PROD</span></div><div className="ops-message" style={{display:'grid',gap:10}}><label>Notas<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Añade contexto operativo sin duplicar datos..."/></label><label>{type==='inmobiliarias'?'Próximo contacto B2B':'Próxima acción'}<input type="date" value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label><div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><button className="primary" disabled={actionBusy||(!notes.trim()&&!nextAction)} onClick={saveFollowUp}><Save size={16}/>{actionBusy?'Guardando…':'Guardar seguimiento'}</button>{actionMsg&&<span>{actionMsg}</span>}</div></div></div>}</>}{!canonical&&type==='inmobiliarias'&&data?.gestiones&&<div className="ops-table-card"><div className="ops-table-head"><strong>Gestiones B2B</strong><span>{data.gestiones.length} registros</span></div><div className="ops-table-wrap"><table><thead><tr><th>Canal</th><th>Resultado</th><th>Próxima acción</th><th>Estado</th></tr></thead><tbody>{data.gestiones.map((g:AnyRow)=><tr key={g.activity_code}><td>{g.canal}</td><td>{g.resultado||'—'}</td><td>{g.proxima_accion||'—'}</td><td>{g.estado}</td></tr>)}</tbody></table></div></div>}</section></main></div>;
}
