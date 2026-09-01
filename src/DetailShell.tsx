import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {MessageCircle,Save} from 'lucide-react';
import {SUPABASE_URL,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar} from './assets/visualAssets';
import ExpedientePeoplePanel from './ExpedientePeoplePanel';
import ExpedienteDetailAuthorizedNav from './ExpedienteDetailAuthorizedNav';
import './operational.css';
import './detail-expediente.css';

type AnyRow=Record<string,any>;
async function legacyDetailApi(code:string){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return {status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-detail-api-test/expedientes/${encodeURIComponent(code)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});let data:any=null;try{data=await r.json()}catch{}return {status:r.status,data};}
async function notionActionApi(id:string,changes:Record<string,unknown>){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return {status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/expedientes/${encodeURIComponent(id)}/action`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'update',changes})});let data:any=null;try{data=await r.json()}catch{}return {status:r.status,data};}
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function detailApi(code:string){if(isNotionId(code)){const r=await fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`);if(r.status!==404)return r;}return legacyDetailApi(code);}
function val(v:any){if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'Sí':'No';if(Array.isArray(v))return v.length?v.map(x=>typeof x==='object'?(x.name||x.id||JSON.stringify(x)):String(x)).join(', '):'—';if(typeof v==='object')return JSON.stringify(v);return String(v)}
function pick(row:AnyRow|undefined,keys:string[]){if(!row)return null;for(const k of keys){const v=row[k];if(v!==undefined&&v!==null&&v!=='')return v}return null}
function hasValue(row:AnyRow|undefined,keys:string[]){const v=pick(row,keys);if(v===null)return false;if(typeof v==='boolean')return v;const s=String(v).trim().toLowerCase();return !['','no','false','0','pendiente','no disponible','—'].includes(s)}
const phases=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];
const phaseAliases=[
 ['entrada','nuevo','inicial','recibido','alta'],
 ['documentación','documentacion','document','docs','documental'],
 ['análisis','analisis','estudio','viabilidad','pre-ok','preok'],
 ['banco','banc','presentado','enviado a banco','condiciones bancarias'],
 ['tasación','tasacion','tasador'],
 ['oferta','aprobado','aprobación','aprobacion','ok banco','condiciones aprobadas'],
 ['fein'],
 ['notaría','notaria','acta'],
 ['firma','firmado'],
 ['cierre','cerrado','finalizado','completado']
];
function phaseIndex(raw:any){const s=String(raw||'').trim().toLowerCase();if(!s)return -1;return phaseAliases.findIndex(group=>group.some(x=>s.includes(x)))}
function evidencePhaseIndex(row:AnyRow|undefined){
 if(!row)return -1;
 if(hasValue(row,['fecha_cierre','cierre_fecha','cerrado_en','finalizado_en']))return 9;
 if(hasValue(row,['fecha_firma','firma_fecha','firmado_en','hipoteca_firmada']))return 8;
 if(hasValue(row,['fecha_acta','acta_fecha','acta_notarial','acta_previa']))return 7;
 if(hasValue(row,['fein','fecha_fein','fein_fecha','fein_recibida','fein_firmada']))return 6;
 if(hasValue(row,['oferta','oferta_bancaria','aprobacion','aprobación','ok_banco','condiciones_aprobadas']))return 5;
 if(hasValue(row,['tasacion','tasación','fecha_tasacion','fecha_tasación','importe_tasacion','importe_tasación']))return 4;
 if(hasValue(row,['enviado_banco','presentado_banco','fecha_envio_banco','banco_objetivo','entidad_objetivo']))return 3;
 if(hasValue(row,['viabilidad','analisis','análisis','preok','pre_ok','resultado_viabilidad']))return 2;
 if(hasValue(row,['documentacion_completa','documentación_completa','docs_completos','gate_documental']))return 1;
 return 0;
}
function resolveJourney(row:AnyRow|undefined){
 const raw=pick(row,['stage','current_stage','stage_actual','etapa','etapa_actual','fase_actual','fase','estado_fase','estado_operativo','estado']);
 const explicit=phaseIndex(raw);
 const evidence=evidencePhaseIndex(row);
 const index=explicit>=0?Math.max(explicit,evidence):evidence;
 const source=explicit>=0?'estado/fase del expediente':evidence>0?'evidencia operativa del expediente':'entrada del expediente';
 return{raw,index,label:phases[Math.max(0,index)]||phases[0],source};
}
const stageNextActions=['Completar y validar los datos de entrada','Completar y validar la documentación','Cerrar el análisis de viabilidad','Presentar o comparar el expediente con banco','Completar y validar la tasación','Confirmar la oferta y sus condiciones','Revisar y cerrar la FEIN','Coordinar el acta notarial','Coordinar la firma','Cerrar el expediente y su trazabilidad'];
function display(v:any){return v===null||v===undefined||v===''?'No disponible':val(v)}

export default function DetailShell(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/);const active=Boolean(match)&&location.pathname!=='/expedientes/nuevo';const code=match?.[1]?decodeURIComponent(match[1]):'';
 const [data,setData]=useState<any>(null),[message,setMessage]=useState('');
 const [notes,setNotes]=useState(''),[nextAction,setNextAction]=useState(''),[actionBusy,setActionBusy]=useState(false),[actionMsg,setActionMsg]=useState('');
 const [anaChoice,setAnaChoice]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;(async()=>{setMessage('');setActionMsg('');const r=await detailApi(code);if(!alive)return;setData(r.data);if(r.status===403)setMessage('Tu perfil no puede abrir esta ficha.');else if(r.status===404)setMessage('No se ha encontrado la ficha.');else if(r.status!==200)setMessage('No se pudo cargar la ficha.');})();return()=>{alive=false}},[active,code]);
 const main=useMemo(()=>{if(!data)return null;if(data.source==='notion_canonical'&&data.item)return data.item;return data.expediente},[data]);
 const canonical=Boolean(data?.source==='notion_canonical');
 if(!active)return null;
 const displayName=main?.expediente||main?.cliente||main?.cliente_alias||main?.nombre_cliente||main?.nombre||'Expediente';
 const journey=resolveJourney(main);const pIndex=journey.index;
 const registeredNext=pick(main,['proxima_accion','próxima_acción','siguiente_accion','siguiente_paso']);
 const anaNext=registeredNext||stageNextActions[pIndex]||stageNextActions[0];
 const resumen={cliente:pick(main,['cliente','cliente_alias','nombre_cliente','nombre']),titulares:pick(main,['titulares','titular','numero_titulares']),inmobiliaria:pick(main,['inmobiliaria','agencia','inmobiliaria_nombre']),financiero:pick(main,['financiero','financiero_ficha','financiero_nombre','id_financiero_operativo']),visitador:pick(main,['visitador','visitador_ficha','visitador_nombre','id_visitador_operativo']),fase:journey.label,estado:journey.raw,riesgo:pick(main,['riesgo','nivel_riesgo','criticidad']),proxima:registeredNext};
 const economicos={precio:pick(main,['precio','precio_compra','importe_compra','precio_vivienda']),financiacion:pick(main,['financiacion','financiación','importe_financiacion','importe_financiación','importe_solicitado']),ahorro:pick(main,['ahorro','ahorros','aportacion','aportación']),ingresos:pick(main,['ingresos','ingresos_mensuales','ingresos_neto']),deudas:pick(main,['deudas','cuotas_deuda','deuda_mensual']),ratio:pick(main,['ratio','ratio_endeudamiento','endeudamiento']),ltv:pick(main,['ltv','LTV']),banco:pick(main,['banco','entidad','banco_objetivo'])};
 async function saveFollowUp(){if(!canonical||!isNotionId(code)||(!notes.trim()&&!nextAction))return;setActionBusy(true);setActionMsg('');const changes:Record<string,unknown>={};if(notes.trim())changes.notas=notes.trim();if(nextAction)changes.proxima_accion=nextAction;const r=await notionActionApi(code,changes);setActionBusy(false);if(r.status===200){setActionMsg('Seguimiento guardado y auditado en Notion.');setNotes('');setNextAction('');const fresh=await detailApi(code);if(fresh.status===200)setData(fresh.data)}else if(r.status===403)setActionMsg('Tu perfil no puede modificar esta ficha.');else setActionMsg(`No se pudo guardar el seguimiento (${r.data?.error||r.status}).`);}
 function ana(mode:'do'|'help'|'self'){setAnaChoice(mode);if(mode==='do')navigate(`/ana?mode=do&scope_type=expediente&scope_code=${encodeURIComponent(code)}&stage=${encodeURIComponent(journey.label)}`);else if(mode==='help')navigate(`/ana?mode=help&scope_type=expediente&scope_code=${encodeURIComponent(code)}&stage=${encodeURIComponent(journey.label)}`);else setTimeout(()=>document.getElementById('seguimiento-contextual')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}
 return <div className="ops-root detail-exp-root" style={{zIndex:5200}} data-theme={(sessionStorage.getItem('fenix-theme')||'light')}>
  <ExpedienteDetailAuthorizedNav/>
  <main className="ops-main detail-exp-main"><header className="ops-top detail-exp-top"><button className="detail-filter" onClick={()=>navigate('/expedientes')}>Filtros avanzados</button><div className="detail-search">Buscar expediente, cliente o tarea…</div><button className="primary" onClick={()=>navigate('/expedientes')}>Buscar</button><strong>Expediente</strong></header>
  <section className="ops-content detail-exp-content">
   <article className="detail-ana-hero"><img src={anaAvatar} alt="Ana"/><div className="detail-ana-copy"><span>ANA · EN ESTA PANTALLA</span><h2>{anaNext}</h2><p>Estoy usando la fase real resuelta del expediente: <b>{journey.label}</b>. La línea de recorrido, la situación actual y mi siguiente acción comparten exactamente la misma fuente.</p><div className="detail-next-list"><button onClick={()=>document.getElementById('recorrido-expediente')?.scrollIntoView({behavior:'smooth'})}><b>1</b><strong>Ver fase actual: {journey.label}</strong><em>Ver recorrido →</em></button><button onClick={()=>document.getElementById('seguimiento-contextual')?.scrollIntoView({behavior:'smooth'})}><b>2</b><strong>{anaNext}</strong><em>Ver motivo →</em></button><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}><b>3</b><strong>Revisar evidencia</strong><em>Ver documentación →</em></button></div><button className="primary detail-upload" onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}&upload=1`)}>↑ Subir documentación</button></div></article>
   <button className="detail-back" onClick={()=>navigate('/expedientes')}>← Volver a expedientes</button>
   <div className="detail-master-title"><span>FICHA MAESTRA</span><h1>{displayName}</h1><p>{canonical?'Fuente canónica Notion · acceso filtrado por tu rol.':'Ficha PRE-PROD autorizada por rol.'}</p></div>
   {message&&<div className="ops-message">{message}</div>}
   {main&&<>
    <section className="detail-journey" id="recorrido-expediente" data-testid="expediente-real-journey"><div className="detail-section-label">RECORRIDO REAL DEL EXPEDIENTE · ACTUAL: {journey.label}</div><div className="detail-phase-track">{phases.map((phase,i)=><div key={phase} data-testid={i===pIndex?'expediente-current-stage':undefined} className={i<pIndex?'done':i===pIndex?'current':''}><span>{i<pIndex?'✓':i+1}</span><small>{phase}</small></div>)}</div><small className="detail-source-note">Fase resuelta desde {journey.source}{journey.raw?` · valor registrado: ${display(journey.raw)}`:''}.</small></section>
    <nav className="detail-tabs"><button className="active">Resumen</button><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}`)}>Documentación</button><button onClick={()=>setAnaChoice('analysis')}>Análisis</button><button onClick={()=>setAnaChoice('bank')}>Banco</button><button onClick={()=>navigate('/tareas')}>Tareas</button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}>Comunicaciones</button><button onClick={()=>setAnaChoice('activity')}>Actividad</button><button onClick={()=>setAnaChoice('history')}>Historial</button><button onClick={()=>navigate(`/ana?scope_type=expediente&scope_code=${encodeURIComponent(code)}&stage=${encodeURIComponent(journey.label)}`)}>Ana</button></nav>
    {anaChoice&&['analysis','bank','activity','history'].includes(anaChoice)&&<div className="detail-inline-note">Este bloque se abrirá cuando exista una fuente canónica conectada para esta sección. No se muestran datos inventados.</div>}
    <div className="detail-summary-grid"><article className="detail-summary-card"><span>SITUACIÓN ACTUAL</span><h2>{journey.label}</h2><div className="detail-kv"><div><small>Cliente</small><strong>{display(resumen.cliente)}</strong></div><div><small>Titulares</small><strong>{display(resumen.titulares)}</strong></div><div><small>Inmobiliaria</small><strong>{display(resumen.inmobiliaria)}</strong></div><div><small>Financiero</small><strong>{display(resumen.financiero)}</strong></div><div><small>Visitador</small><strong>{display(resumen.visitador)}</strong></div><div><small>Fase real</small><strong>{display(resumen.fase)}</strong></div><div><small>Estado registrado</small><strong>{display(resumen.estado)}</strong></div><div><small>Riesgo</small><strong>{display(resumen.riesgo)}</strong></div><div><small>Próxima acción</small><strong>{display(anaNext)}</strong></div></div></article><article className="detail-summary-card"><span>OPERACIÓN</span><h2>Datos económicos</h2><div className="detail-kv"><div><small>Precio</small><strong>{display(economicos.precio)}</strong></div><div><small>Financiación</small><strong>{display(economicos.financiacion)}</strong></div><div><small>Ahorro</small><strong>{display(economicos.ahorro)}</strong></div><div><small>Ingresos</small><strong>{display(economicos.ingresos)}</strong></div><div><small>Deudas</small><strong>{display(economicos.deudas)}</strong></div><div><small>Ratio</small><strong>{display(economicos.ratio)}</strong></div><div><small>LTV</small><strong>{display(economicos.ltv)}</strong></div><div><small>Banco</small><strong>{display(economicos.banco)}</strong></div></div><p className="detail-source-note">Los campos sin fuente conectada se muestran vacíos, nunca inventados.</p></article></div>
    {canonical&&isNotionId(code)&&<ExpedientePeoplePanel expedienteId={code}/>} 
    <article className="detail-next-action"><img src={anaAvatar} alt="Ana"/><div><span>ANA · SIGUIENTE MEJOR ACCIÓN · FASE {journey.label.toUpperCase()}</span><h2>{display(anaNext)}</h2><p><b>Por qué:</b> {registeredNext?'es la próxima acción registrada en el expediente canónico y tiene prioridad.':`es la acción operativa asociada a la fase real ${journey.label}; no estoy suponiendo que el expediente esté en Entrada.`}</p><div className="detail-prepared"><small>SI LO HACES TÚ</small><p>Te indicaré el paso concreto y, al terminar, registrarás qué ocurrió para recalcular el siguiente paso sobre el estado actualizado.</p></div><div className="detail-prepared"><small>SI LO HAGO YO</small><p>Usaré este expediente y su fase {journey.label}. Te enseñaré exactamente qué voy a hacer antes de ejecutar cualquier acción autorizada.</p></div><div className="detail-prepared"><small>CONTACTO · VISTA PREVIA OBLIGATORIA</small><div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:8}}><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}&channel=Llamada`)}>Llamada · ver guion exacto</button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}&channel=WhatsApp`)}>WhatsApp · ver texto exacto</button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}&channel=Email`)}>Email · ver asunto y texto</button></div></div><div className="detail-ana-actions"><button onClick={()=>ana('do')}><strong>Que lo haga Ana</strong><small>Solo si el backend lo autoriza</small></button><button onClick={()=>ana('help')}><strong>Ayúdame</strong><small>Ver texto, motivo y pasos</small></button><button onClick={()=>ana('self')}><strong>Lo hago yo</strong><small>Registrar resultado real</small></button></div></div></article>
    <div className="detail-action-row"><button className="primary" onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}><MessageCircle size={16}/> Preparar Email / WhatsApp / Llamada</button><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(code)}&upload=1`)}>Documentación</button><button onClick={()=>navigate(`/tasaciones?expediente=${encodeURIComponent(code)}`)}>Tasaciones</button><button onClick={()=>navigate(`/firmas?expediente=${encodeURIComponent(code)}`)}>FEIN / Firma</button></div>
    {canonical&&isNotionId(code)&&<div className="ops-table-card" id="seguimiento-contextual"><div className="ops-table-head"><strong>Seguimiento contextual</strong><span>Escritura permitida y auditada · PRE-PROD</span></div><div className="ops-message" style={{display:'grid',gap:10}}><label>Notas<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Añade contexto operativo sin duplicar datos..."/></label><label>Próxima acción<input type="date" value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label><div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><button className="primary" disabled={actionBusy||(!notes.trim()&&!nextAction)} onClick={saveFollowUp}><Save size={16}/>{actionBusy?'Guardando…':'Guardar seguimiento'}</button>{actionMsg&&<span>{actionMsg}</span>}</div></div></div>}
   </>}
  </section></main></div>;
}
