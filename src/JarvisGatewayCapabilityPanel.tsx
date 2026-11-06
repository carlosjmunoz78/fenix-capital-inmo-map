import {useCallback,useEffect,useRef,useState} from 'react';
import {inspectJarvisGateway,type JarvisGatewayDiagnostic} from './jarvisGatewayDiagnostics';
import {fetchCerebroConsole} from './cerebroConsoleApi';

/**
 * CUT42: one evidence-driven capability probe for ALL four JARVIS surfaces.
 * Never calls the model, CRM, memory search, browser workers or any write path.
 * A green result means read-only Gateway contract ONLY.
 */
export default function JarvisGatewayCapabilityPanel({ready}:{ready:boolean}){
 const [report,setReport]=useState<JarvisGatewayDiagnostic|null>(null);
 const [busy,setBusy]=useState(false);
 const inFlight=useRef(false);
 const generation=useRef(0);
 const alive=useRef(true);
 useEffect(()=>()=>{alive.current=false;generation.current++},[]);
 const check=useCallback(async()=>{
  if(!ready||inFlight.current)return;
  const attempt=++generation.current;
  inFlight.current=true;
  setBusy(true);
  try{
   const result=await inspectJarvisGateway(fetchCerebroConsole);
   if(alive.current&&attempt===generation.current)setReport(result);
  }finally{
   if(alive.current&&attempt===generation.current){
    inFlight.current=false;
    setBusy(false);
   }
  }
 },[ready]);
 useEffect(()=>{
  if(!ready){
   generation.current++;
   inFlight.current=false;
   setReport(null);
   setBusy(false);
  }else void check();
 },[ready,check]);
 return <div className="jarvis-gateway-capability-panel" aria-label="Estado verificado de capacidades JARVIS">
  <button type="button" disabled={!ready||busy} onClick={()=>void check()}
   aria-label="Comprobar capacidades reales del Gateway">
   {busy?'Comprobando capacidades…':'Comprobar capacidades reales'}
  </button>
  {report?<div className="jarvis-gateway-capability-result" role="status" aria-live="polite">
   <strong>{report.status==='VERIFIED_READONLY'
    ?'Gateway autenticado: contrato de solo lectura verificado'
    :report.status==='AUTH_REQUIRED'?'Sesión de propietario requerida'
    :report.status==='GATEWAY_UNAVAILABLE'?'Gateway no disponible':'Contrato de seguridad no coincidente'}</strong>
   <p>{report.reason}</p>
   {report.status==='VERIFIED_READONLY'?<p>
    Motores declarados: {report.total_declared_engines} ({report.declared_engines.join(', ')}).
    Esto no acredita los 179 motores, toda la historia, micrófono físico ni ejecución universal.
   </p>:null}
  </div>:null}
 </div>;
}
