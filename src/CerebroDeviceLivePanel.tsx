import {useCallback,useEffect,useState} from 'react';
import {readDeviceLive,type DeviceLiveRead} from './cerebroDeviceLiveApi';
const initial:DeviceLiveRead={kind:'unavailable',data:null,reason:'NOT_READ_YET'};
const date=(s:string|null)=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleString('es-ES',{
 year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}):'sin fecha';
export default function CerebroDeviceLivePanel(){
 const[read,setRead]=useState<DeviceLiveRead>(initial);
 const[loading,setLoading]=useState(false);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  const next=await readDeviceLive(signal);
  if(signal?.aborted)return;
  setRead(next);setLoading(false);
 },[]);
 useEffect(()=>{
  const ctrl=new AbortController();
  void refresh(ctrl.signal);
  const t=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh(ctrl.signal)},120000);
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh(ctrl.signal)};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{ctrl.abort();window.clearInterval(t);document.removeEventListener('visibilitychange',onVisible)};
 },[refresh]);
 const data=read.kind==='ready'?read.data:null;
 return <section className="op4-device-live" aria-label="Latidos y trabajos de dispositivo · fuente actual LAB">
  <div className="op4-fleet-head">
   <div><h4>Latidos de dispositivo y órdenes · consulta actual LAB</h4>
    <p>Fuente independiente de Supabase LAB, con acceso verificado del propietario y resultados exclusivamente agregados.</p></div>
   <button type="button" disabled={loading} onClick={()=>{void refresh()}} aria-label="Actualizar latidos ahora">
    {loading?'Comprobando…':'Actualizar latidos ahora'}
   </button>
  </div>
  {!data?<p role="status">LECTURA EN VIVO NO ACREDITADA: {read.reason}. El archivo fechado inferior sigue disponible.
    No se infieren cero dispositivos, cero fallos ni agentes activos.</p>:<>
   <p role="status">LECTURA ACTUAL LAB: {date(data.observed_at)} · fuente {data.source}.
    Datos consultados al origen, no archivo.</p>
   <div className="op4-device-grid">
    {data.environments.map(item=><article className="op4-device-item" key={item.environment}>
     <strong>{item.environment==='LAB'?'LAB · dispositivos observados':'PREPROD · etiqueta histórica en Supabase LAB'}</strong>
     <span>Dispositivos no revocados: {item.not_revoked_count}. Contacto últimos 5 minutos: {item.heartbeat_5m_count}; últimas 24 horas: {item.heartbeat_24h_count}.</span>
     <span>Último latido registrado: {date(item.last_seen_at)}.</span>
     <span>Órdenes registradas: {item.commands_total}, completadas {item.commands_completed}, fallidas {item.commands_failed}, otras {item.commands_other}.</span>
     <span>Órdenes creadas en las últimas 24 h: {item.commands_created_24h}; último trabajo completado: {date(item.latest_completed_at)}.</span>
     <span>Recibos: {item.receipt_count}, con verificación semántica: {item.semantically_verified_receipts}.</span>
     <span>Duración histórica de finalizaciones comparables ({item.comparable_successful_duration_samples}): p50 {item.p50_completed_seconds??'NO_MEDIDO'} s · p90 {item.p90_completed_seconds??'NO_MEDIDO'} s.</span>
    </article>)}
   </div>
   <p className="op4-fleet-note">Los latidos corresponden a dispositivos registrados, NO al censo de agentes CEREBRO. Agentes, subagentes y jobs activos: DESCONOCIDOS.
    El estado ONLINE almacenado, la etiqueta PREPROD y las duraciones históricas no acreditan actividad autónoma ni una App PREPROD desplegada.
    Costes reales: NO_MEDIDOS. No se ejecuta ninguna orden.</p>
  </>}
 </section>;
}
