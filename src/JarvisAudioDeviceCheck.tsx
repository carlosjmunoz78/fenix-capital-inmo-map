import {useEffect,useRef,useState} from 'react';
import {browserJarvisAudioEnvironment,inspectJarvisAudioDevice,type JarvisMicProbeResult} from './jarvisAudioDeviceProbe';

/** CUT47 · Device check only on explicit click. Does not record or synthesize any audio. */
export default function JarvisAudioDeviceCheck({disabled=false}:{disabled?:boolean}){
 const[checking,setChecking]=useState(false);
 const[report,setReport]=useState<JarvisMicProbeResult|null>(null);
 const inFlight=useRef(false);
 const alive=useRef(true);
 useEffect(()=>()=>{alive.current=false},[]);
 async function check(){
  if(inFlight.current||disabled)return;
  inFlight.current=true;
  setChecking(true);
  try{
   const result=await inspectJarvisAudioDevice(browserJarvisAudioEnvironment());
   if(alive.current)setReport(result);
  }finally{
   inFlight.current=false;
   if(alive.current)setChecking(false);
  }
 }
 return <div className="jarvis-device-check" aria-label="Diagnóstico local de micrófono de JARVIS">
  <button type="button" disabled={checking||disabled} onClick={()=>void check()}
   aria-label="Comprobar micrófono local de JARVIS">
   {checking?'Comprobando micrófono…':'Comprobar micrófono'}
  </button>
  {report?<div role="status" aria-live="polite">
   <strong>{report.status==='MIC_GRANTED'?'Entrada de audio disponible':'Micrófono sin validar'}</strong>
   <p>{report.message}</p>
   <small>Reconocimiento de voz: {report.speech_recognition_api_present?'API detectada':'API no disponible'}.
    Voz de salida del navegador: {report.speech_synthesis_api_present?'API detectada':'API no disponible'}.
    Voces españolas detectadas: {report.spanish_voice_count}.
   </small>
   <p>Esta comprobación NO demuestra que JARVIS entienda dictados, que se oigan los altavoces o que esté conectada la voz clonada V2.</p>
  </div>:null}
 </div>;
}
