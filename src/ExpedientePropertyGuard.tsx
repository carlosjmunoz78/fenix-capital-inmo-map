import {useCallback,useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Home,History,PenLine,RefreshCcw,Save,X} from 'lucide-react';
import {supabase,fetchAppApi} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import './expediente-property.css';

type Row=Record<string,any>;
type Ctx={role?:string};
type Form=Record<string,string>;

const statusOptions=['Buscando','Seleccionada','Reservada','Arras firmadas','Tasada'];
const typeOptions=['Piso','Casa','Chalet','Adosado','Ático','Dúplex','Estudio','Local','Terreno','Obra nueva','Otro'];
const useOptions=['Vivienda habitual','Segunda vivienda','Inversión','Otro'];
const marketOptions=['Segunda mano','Obra nueva','Autopromoción','Otro'];

function rowsFrom(data:any):Row[]{return Array.isArray(data?.items)?data.items:[]}
function codeOf(r:Row){return String(r.inmobiliaria_code||r.id||'')}
function nameOf(r:Row){return String(r.inmobiliaria||r.nombre||r.nombre_alias||codeOf(r)||'')}
function money(v:any){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n):'—'}
function txt(v:any){return v===null||v===undefined?'':String(v)}
function boolText(v:any){return v===true?'Sí':v===false?'No':'—'}
function currentAddress(p:Row|null){if(!p)return'Sin vivienda registrada';const line=[p.direccion,p.numero,p.planta?`Pl. ${p.planta}`:'',p.puerta?`Pta. ${p.puerta}`:''].filter(Boolean).join(' ');return line||[p.localidad,p.provincia].filter(Boolean).join(', ')||'Vivienda pendiente de completar'}

function formFrom(p:Row|null,exp:Row|null):Form{
 const keys=['estado','tipo_inmueble','uso_inmueble','mercado','direccion','numero','bloque','escalera','planta','puerta','codigo_postal','localidad','provincia','referencia_catastral','finca_registral','registro_propiedad','nota_simple_fecha','metros_construidos','metros_utiles','dormitorios','banos','precio_compraventa','reserva_importe','reserva_fecha','arras_importe','arras_fecha','inmobiliaria_code','contacto_inmobiliaria','enlace_anuncio','cargas','notas'];
 const out:Form={};for(const k of keys)out[k]=txt(p?.[k]);
 out.garaje=p?.garaje===true?'true':p?.garaje===false?'false':'';
 out.trastero=p?.trastero===true?'true':p?.trastero===false?'false':'';
 out.importe_solicitado=txt(exp?.importe_solicitado);
 return out;
}
function emptyNew(exp:Row|null):Form{
 const out=formFrom(null,exp);out.estado='Seleccionada';out.provincia='Córdoba';return out;
}
function payload(form:Form){return {...form,garaje:form.garaje,trastero:form.trastero};}

export default function ExpedientePropertyGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);const code=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(code&&code!=='nuevo');
 const[mount,setMount]=useState<HTMLElement|null>(null),[ctx,setCtx]=useState<Ctx|null>(null),[exp,setExp]=useState<Row|null>(null),[current,setCurrent]=useState<Row|null>(null),[items,setItems]=useState<Row[]>([]),[inmos,setInmos]=useState<Row[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState<'view'|'edit'|'change'>('view'),[form,setForm]=useState<Form>({}),[oldStatus,setOldStatus]=useState('Sustituida'),[message,setMessage]=useState('');
 const canEdit=ctx?.role==='Direccion'||ctx?.role==='Financiero';
 const history=useMemo(()=>items.filter(x=>!x.is_current),[items]);
 const load=useCallback(async()=>{
  if(!active)return;setLoading(true);setMessage('');
  const [c,e,i,pr]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`),fetchNotionRuntime<any>('/inmobiliarias'),supabase.rpc('fenix_prod_exp_properties',{p_exp_code:code})]);
  setCtx(c.status===200?c.data:null);const er=e.status===200?(e.data?.item||e.data?.expediente||null):null;setExp(er);setInmos(i.status===200?rowsFrom(i.data):[]);
  const d:any=pr.data;if(pr.error||!d?.ok){setMessage(pr.error?.message||d?.error||'No se pudo cargar la vivienda.');setCurrent(null);setItems([])}else{setCurrent(d.current||null);setItems(Array.isArray(d.items)?d.items:[])}
  setLoading(false);
 },[active,code]);
 useEffect(()=>{if(active)void load()},[active,load]);
 useEffect(()=>{
  if(!active)return;let host:HTMLElement|null=null;
  const place=()=>{if(host)return;const anchor=document.querySelector<HTMLElement>('[data-testid="expediente-inmobiliaria-assignment"]');if(!anchor?.parentElement)return;host=document.createElement('div');host.id='expediente-property-host';anchor.parentElement.insertBefore(host,anchor);setMount(host)};
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();host?.remove();setMount(null)};
 },[active,pathname]);
 if(!active||!mount)return null;
 function startEdit(){setForm(formFrom(current,exp));setMode('edit');setMessage('')}
 function startChange(){setForm(emptyNew(exp));setOldStatus('Sustituida');setMode('change');setMessage('')}
 function set(k:string,v:string){setForm(f=>({...f,[k]:v}))}
 async function saveEdit(){if(!current||!exp)return;setBusy(true);setMessage('');const {data,error}=await supabase.rpc('fenix_prod_exp_property_update',{p_exp_code:code,p_expected_exp_version:Number(exp.version||0),p_expected_property_version:Number(current.version||0),p_changes:payload(form)});const d:any=data;setBusy(false);if(error||!d?.ok){setMessage(error?.message||d?.error||'No se pudo guardar.');if(d?.status===409)await load();return}setMessage('Vivienda actualizada y versionada correctamente.');setMode('view');await load()}
 async function saveChange(){if(!exp)return;setBusy(true);setMessage('');const {data,error}=await supabase.rpc('fenix_prod_exp_property_replace',{p_exp_code:code,p_expected_exp_version:Number(exp.version||0),p_expected_property_version:current?Number(current.version||0):null,p_old_status:oldStatus,p_property:payload(form)});const d:any=data;setBusy(false);if(error||!d?.ok){setMessage(error?.message||d?.error||'No se pudo cambiar la vivienda.');if(d?.status===409)await load();return}setMessage('Nueva vivienda activada. La anterior se conserva en el histórico.');setMode('view');await load()}
 const panel=<section className="exp-property-card" data-testid="expediente-property-panel">
  <div className="exp-property-head"><div><span>VIVIENDA / INMUEBLE DE LA OPERACIÓN</span><h2><Home size={20}/>{currentAddress(current)}</h2><p>{current?.estado||'Sin estado'} · {current?.tipo_inmueble||'Tipo pendiente'} · {current?.localidad||exp?.localidad||'Localidad pendiente'}</p></div><div className="exp-property-actions">{canEdit&&mode==='view'&&<><button type="button" onClick={startEdit}><PenLine size={15}/>Editar vivienda</button><button className="primary" type="button" onClick={startChange}><RefreshCcw size={15}/>Cambiar vivienda</button></>}{mode!=='view'&&<button type="button" onClick={()=>{setMode('view');setMessage('')}}><X size={15}/>Cancelar</button>}</div></div>
  {loading&&<div className="exp-property-message">Cargando vivienda…</div>}
  {message&&<div className="exp-property-message">{message}</div>}
  {!loading&&mode==='view'&&<>
   <div className="exp-property-summary"><div><small>Precio compraventa</small><strong>{money(current?.precio_compraventa??exp?.precio_vivienda)}</strong></div><div><small>Financiación solicitada</small><strong>{money(exp?.importe_solicitado)}</strong></div><div><small>Inmobiliaria</small><strong>{nameOf(inmos.find(x=>codeOf(x)===current?.inmobiliaria_code)||{})||'Sin inmobiliaria'}</strong></div><div><small>Versión vivienda</small><strong>{current?.version||'—'}</strong></div></div>
   <details className="exp-property-details"><summary>Ver todos los datos del inmueble</summary><div className="exp-property-readgrid">
    <Read label="Dirección" value={current?.direccion}/><Read label="Número" value={current?.numero}/><Read label="Bloque" value={current?.bloque}/><Read label="Escalera" value={current?.escalera}/><Read label="Planta" value={current?.planta}/><Read label="Puerta" value={current?.puerta}/><Read label="Código postal" value={current?.codigo_postal}/><Read label="Localidad" value={current?.localidad}/><Read label="Provincia" value={current?.provincia}/><Read label="Tipo" value={current?.tipo_inmueble}/><Read label="Uso" value={current?.uso_inmueble}/><Read label="Mercado" value={current?.mercado}/><Read label="Metros construidos" value={current?.metros_construidos}/><Read label="Metros útiles" value={current?.metros_utiles}/><Read label="Dormitorios" value={current?.dormitorios}/><Read label="Baños" value={current?.banos}/><Read label="Garaje" value={boolText(current?.garaje)}/><Read label="Trastero" value={boolText(current?.trastero)}/><Read label="Referencia catastral" value={current?.referencia_catastral}/><Read label="Finca registral" value={current?.finca_registral}/><Read label="Registro propiedad" value={current?.registro_propiedad}/><Read label="Fecha nota simple" value={current?.nota_simple_fecha}/><Read label="Reserva" value={money(current?.reserva_importe)}/><Read label="Fecha reserva" value={current?.reserva_fecha}/><Read label="Arras" value={money(current?.arras_importe)}/><Read label="Fecha arras" value={current?.arras_fecha}/><Read label="Contacto inmobiliaria" value={current?.contacto_inmobiliaria}/><Read label="Enlace anuncio" value={current?.enlace_anuncio}/><Read label="Cargas / incidencias" value={current?.cargas}/><Read label="Notas inmueble" value={current?.notas}/>
   </div></details>
   <details className="exp-property-history"><summary><History size={15}/>Histórico de viviendas ({history.length})</summary>{history.length===0?<p>No hay viviendas anteriores.</p>:history.map(h=><article key={h.property_code}><strong>{currentAddress(h)}</strong><span>{h.estado||'Histórica'} · {money(h.precio_compraventa)} · {h.localidad||'—'}</span><small>Archivada {h.archived_at?new Date(h.archived_at).toLocaleString('es-ES'):'—'}</small></article>)}</details>
  </>}
  {!loading&&(mode==='edit'||mode==='change')&&<div className="exp-property-form">
   {mode==='change'&&<div className="exp-property-warning"><strong>Vas a cambiar de vivienda.</strong><span>La vivienda actual no se borrará. Quedará guardada en el histórico.</span><label>Estado de la vivienda anterior<select value={oldStatus} onChange={e=>setOldStatus(e.target.value)}><option>Sustituida</option><option>Descartada</option></select></label></div>}
   <div className="exp-property-grid">
    <Field label="Situación"><select value={form.estado||''} onChange={e=>set('estado',e.target.value)}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Tipo de inmueble"><select value={form.tipo_inmueble||''} onChange={e=>set('tipo_inmueble',e.target.value)}><option value="">Seleccionar</option>{typeOptions.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Uso"><select value={form.uso_inmueble||''} onChange={e=>set('uso_inmueble',e.target.value)}><option value="">Seleccionar</option>{useOptions.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Mercado"><select value={form.mercado||''} onChange={e=>set('mercado',e.target.value)}><option value="">Seleccionar</option>{marketOptions.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Input label="Dirección" k="direccion" form={form} set={set}/><Input label="Número" k="numero" form={form} set={set}/><Input label="Bloque" k="bloque" form={form} set={set}/><Input label="Escalera" k="escalera" form={form} set={set}/><Input label="Planta" k="planta" form={form} set={set}/><Input label="Puerta" k="puerta" form={form} set={set}/><Input label="Código postal" k="codigo_postal" form={form} set={set}/><Input label="Localidad" k="localidad" form={form} set={set}/><Input label="Provincia" k="provincia" form={form} set={set}/>
    <Input label="Precio compraventa (€)" k="precio_compraventa" type="number" form={form} set={set}/><Input label="Financiación solicitada (€)" k="importe_solicitado" type="number" form={form} set={set}/><Input label="Metros construidos" k="metros_construidos" type="number" form={form} set={set}/><Input label="Metros útiles" k="metros_utiles" type="number" form={form} set={set}/><Input label="Dormitorios" k="dormitorios" type="number" form={form} set={set}/><Input label="Baños" k="banos" type="number" form={form} set={set}/>
    <Field label="Garaje"><select value={form.garaje||''} onChange={e=>set('garaje',e.target.value)}><option value="">Sin indicar</option><option value="true">Sí</option><option value="false">No</option></select></Field><Field label="Trastero"><select value={form.trastero||''} onChange={e=>set('trastero',e.target.value)}><option value="">Sin indicar</option><option value="true">Sí</option><option value="false">No</option></select></Field>
    <Input label="Referencia catastral" k="referencia_catastral" form={form} set={set}/><Input label="Finca registral" k="finca_registral" form={form} set={set}/><Input label="Registro de la Propiedad" k="registro_propiedad" form={form} set={set}/><Input label="Fecha nota simple" k="nota_simple_fecha" type="date" form={form} set={set}/>
    <Input label="Importe reserva (€)" k="reserva_importe" type="number" form={form} set={set}/><Input label="Fecha reserva" k="reserva_fecha" type="date" form={form} set={set}/><Input label="Importe arras (€)" k="arras_importe" type="number" form={form} set={set}/><Input label="Fecha arras" k="arras_fecha" type="date" form={form} set={set}/>
    <Field label="Inmobiliaria"><select value={form.inmobiliaria_code||''} onChange={e=>set('inmobiliaria_code',e.target.value)}><option value="">Sin inmobiliaria</option>{inmos.map(x=>{const id=codeOf(x);return id?<option key={id} value={id}>{nameOf(x)}</option>:null})}</select></Field><Input label="Contacto / agente inmobiliaria" k="contacto_inmobiliaria" form={form} set={set}/><Input label="Enlace del anuncio" k="enlace_anuncio" form={form} set={set}/>
   </div>
   <Field label="Cargas / incidencias"><textarea rows={3} value={form.cargas||''} onChange={e=>set('cargas',e.target.value)}/></Field><Field label="Notas del inmueble"><textarea rows={3} value={form.notas||''} onChange={e=>set('notas',e.target.value)}/></Field>
   <div className="exp-property-save"><button type="button" onClick={()=>setMode('view')}><X size={15}/>Cancelar</button><button className="primary" type="button" disabled={busy} onClick={mode==='edit'?saveEdit:saveChange}><Save size={15}/>{busy?'Guardando…':mode==='edit'?'Guardar cambios':'Confirmar cambio de vivienda'}</button></div>
  </div>}
 </section>;
 return createPortal(panel,mount);
}

function Read({label,value}:{label:string;value:any}){return <div><small>{label}</small><strong>{value===null||value===undefined||value===''?'—':String(value)}</strong></div>}
function Field({label,children}:{label:string;children:any}){return <label className="exp-property-field"><span>{label}</span>{children}</label>}
function Input({label,k,form,set,type='text'}:{label:string;k:string;form:Form;set:(k:string,v:string)=>void;type?:string}){return <Field label={label}><input type={type} value={form[k]||''} onChange={e=>set(k,e.target.value)}/></Field>}
