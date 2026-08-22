import {useEffect,useMemo,useState} from 'react';
import {ChevronDown,ChevronUp,FileUp,UserRound} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';
import './expediente-people.css';

type Person={
 id:string;comprador?:string|null;nombre?:string|null;apellidos?:string|null;dni_nie?:string|null;fecha_nacimiento?:string|null;edad?:number|null;nacionalidad?:string|null;residencia?:string|null;
 estado_civil?:string|null;regimen_matrimonial?:string|null;hijos?:number|null;situacion_laboral?:string|null;empresa_organismo?:string|null;antiguedad_laboral?:string|null;
 sueldo_neto_mensual?:number|null;numero_pagas?:number|null;otros_ingresos_mensuales?:number|null;deudas_mensuales?:number|null;tarjetas_otras_cuotas?:number|null;
 pension_paga?:number|null;pension_recibe?:number|null;ahorro_disponible?:number|null;origen_fondos?:string|null;aportado_operacion?:number|null;fondos_donados?:boolean|null;
 documentacion_completa?:boolean|null;documentos?:string[]|null;revision_belen?:string|null;rol_operacion?:string|null;orden_expediente?:number|null;datos_revisados_financiero?:boolean|null;
};
type Response={count?:number;titulares?:number;avalistas?:number;items?:Person[]};
const money=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function show(v:any){if(v===null||v===undefined||v==='')return 'Pendiente';if(typeof v==='boolean')return v?'Sí':'No';if(typeof v==='number')return String(v);return String(v)}
function euros(v:any){return typeof v==='number'?money.format(v):'Pendiente'}

export default function ExpedientePeoplePanel({expedienteId}:{expedienteId:string}){
 const navigate=useNavigate();const[loading,setLoading]=useState(false),[status,setStatus]=useState<number|null>(null),[data,setData]=useState<Response|null>(null),[open,setOpen]=useState<Record<string,boolean>>({});
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);const r=await fetchNotionRuntime<Response>(`/expedientes/${encodeURIComponent(expedienteId)}/compradores`);if(!alive)return;setStatus(r.status);setData(r.status===200?r.data:null);setLoading(false)})();return()=>{alive=false}},[expedienteId]);
 const people=useMemo(()=>data?.items??[],[data]);
 if(loading)return <section className="exp-people"><div className="exp-people-head"><strong>Personas de la operación</strong><span>Cargando…</span></div></section>;
 if(status===403)return <section className="exp-people"><div className="exp-people-head"><strong>Personas de la operación</strong><span>Sin acceso</span></div></section>;
 return <section className="exp-people" aria-label="Personas de la operación">
  <div className="exp-people-head"><div><span>INTERVINIENTES</span><h2>{data?.count??0} persona{(data?.count??0)===1?'':'s'} en la operación</h2><p>{data?.titulares??0} titular{(data?.titulares??0)===1?'':'es'} / comprador{(data?.titulares??0)===1?'':'es'} · {data?.avalistas??0} avalista{(data?.avalistas??0)===1?'':'s'}</p></div><button onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(expedienteId)}&upload=1`)}><FileUp size={16}/> Subir documentación general</button></div>
  {people.length===0?<div className="exp-people-empty">Todavía no hay intervinientes relacionados con este expediente. Ana debe pedir primero quiénes participan y con qué rol.</div>:
  <div className="exp-people-list">{people.map((p,i)=>{const isOpen=Boolean(open[p.id]);const name=[p.nombre,p.apellidos].filter(Boolean).join(' ')||p.comprador||`Persona ${i+1}`;return <article className="exp-person" key={p.id}>
    <button className="exp-person-toggle" onClick={()=>setOpen(v=>({...v,[p.id]:!isOpen}))}><span className="exp-person-index">{i+1}</span><UserRound size={18}/><span><strong>{name}</strong><small>{p.rol_operacion||'Rol pendiente'} · {p.documentacion_completa?'Documentación completa':'Documentación pendiente'}</small></span>{isOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
    {isOpen&&<div className="exp-person-body">
      <div className="exp-person-grid">
        <div><small>DNI / NIE</small><strong>{show(p.dni_nie)}</strong></div><div><small>Fecha nacimiento</small><strong>{show(p.fecha_nacimiento)}</strong></div><div><small>Edad</small><strong>{show(p.edad)}</strong></div><div><small>Nacionalidad</small><strong>{show(p.nacionalidad)}</strong></div>
        <div><small>Residencia</small><strong>{show(p.residencia)}</strong></div><div><small>Estado civil</small><strong>{show(p.estado_civil)}</strong></div><div><small>Régimen matrimonial</small><strong>{show(p.regimen_matrimonial)}</strong></div><div><small>Hijos</small><strong>{show(p.hijos)}</strong></div>
        <div><small>Situación laboral</small><strong>{show(p.situacion_laboral)}</strong></div><div><small>Empresa / organismo</small><strong>{show(p.empresa_organismo)}</strong></div><div><small>Antigüedad</small><strong>{show(p.antiguedad_laboral)}</strong></div><div><small>Sueldo neto</small><strong>{euros(p.sueldo_neto_mensual)}</strong></div>
        <div><small>Otros ingresos</small><strong>{euros(p.otros_ingresos_mensuales)}</strong></div><div><small>Deudas mensuales</small><strong>{euros(p.deudas_mensuales)}</strong></div><div><small>Tarjetas / cuotas</small><strong>{euros(p.tarjetas_otras_cuotas)}</strong></div><div><small>Ahorro disponible</small><strong>{euros(p.ahorro_disponible)}</strong></div>
        <div><small>Origen fondos</small><strong>{show(p.origen_fondos)}</strong></div><div><small>Aportado operación</small><strong>{euros(p.aportado_operacion)}</strong></div><div><small>Revisión Belén</small><strong>{show(p.revision_belen)}</strong></div><div><small>Revisado por financiero</small><strong>{show(p.datos_revisados_financiero)}</strong></div>
      </div>
      <div className="exp-person-actions"><button className="primary" onClick={()=>navigate(`/documentacion?expediente=${encodeURIComponent(expedienteId)}&comprador=${encodeURIComponent(p.id)}&upload=1`)}><FileUp size={16}/> Subir documentación de {name}</button><span>{p.documentos?.length??0} documento{(p.documentos?.length??0)===1?'':'s'} relacionado{(p.documentos?.length??0)===1?'':'s'}</span></div>
    </div>}
  </article>})}</div>}
 </section>;
}
