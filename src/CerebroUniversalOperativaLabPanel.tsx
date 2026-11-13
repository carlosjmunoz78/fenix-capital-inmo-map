import {useCallback,useEffect,useState} from 'react';
import {canPreviewUniversalOperativa,readUniversalOperativaLab,type UniversalLabProof} from './cerebroUniversalOperativaLabApi';
import './cerebro-universal-operativa-lab.css';
export default function CerebroUniversalOperativaLabPanel({company}:{company:'fenix'|'all'|'aion'|'captacasa'}){
 const [result,setResult]=useState<UniversalLabProof|null>(null);
 const [loading,setLoading]=useState(false);
 const enabled=company==='fenix'&&typeof window!=='undefined'&&canPreviewUniversalOperativa(window.location);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(!enabled)return;
  setLoading(true);
  const value=await readUniversalOperativaLab(signal);
  if(!signal?.aborted){setResult(value);setLoading(false);}
 },[enabled]);
 useEffect(()=>{
  if(!enabled)return;
  const controller=new AbortController();
  void refresh(controller.signal);
  return()=>controller.abort();
 },[enabled,refresh]);
 if(!enabled)return null;
 return <section className="op-uni-lab" aria-label="Gateway Universal en ensayo">
  <div className="op-uni-lab-head">
   <div><strong>Gateway Universal · LAB</strong><span>Operativa, sin JARVIS · Solo lectura</span></div>
   <button type="button" onClick={()=>{void refresh()}} disabled={loading} aria-label="Verificar conexión del Gateway Universal">
    {loading?'Comprobando…':'Verificar conexión'}
   </button>
  </div>
  <p role="status" aria-live="polite">
   {loading?'Comprobando autorización y contrato FACT-001…':
    result?.kind==='ready'?
     'Conexión de lectura acreditada en LAB. El funcionamiento de los motores en producción sigue sin verificarse.':
    result?.kind==='denied'?'Acceso no autorizado a este contexto de laboratorio.':
    result?.kind==='unavailable'?'No hay verificación disponible. La Operativa actual continúa sin cambios.':
    'Preparando verificación de LAB…'}
  </p>
  {result?.kind==='ready'?<div className="op-uni-lab-proof">
   <span>Capacidades consultables: <b>{result.capabilities.length}</b></span>
   <span>Definiciones registradas: <b>{result.registeredDefinitions}</b></span>
   <span>Motores operativos: <b>No verificados</b></span>
   <small>Fuente: {result.source}. No controla ni ejecuta trabajos reales.</small>
  </div>:null}
 </section>;
}
