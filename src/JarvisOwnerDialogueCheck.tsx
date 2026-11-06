import {useEffect,useRef,useState} from 'react';
import {postCerebroConsoleChat} from './cerebroConsoleApi';
import {inspectJarvisGreeting,type JarvisGreetingProbe} from './jarvisOwnerDialogueProbe';

/**
 * Explicit click only. Not an automatic chat request or microphone test.
 * Uses the user's existing Supabase session; never reads/displays raw JWT.
 */
export default function JarvisOwnerDialogueCheck({ready}:{ready:boolean}){
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<JarvisGreetingProbe|null>(null);
 const inFlight=useRef(false);
 const generation=useRef(0);
 const alive=useRef(true);
 useEffect(()=>()=>{alive.current=false;generation.current++},[]);
 useEffect(()=>{if(!ready){generation.current++;inFlight.current=false;setResult(null);setBusy(false)}},[ready]);

 async function check(){
  if(!ready||inFlight.current)return;
  const attempt=++generation.current;
  inFlight.current=true;
  setBusy(true);
  try{
   const observed=await inspectJarvisGreeting(postCerebroConsoleChat);
   if(alive.current&&attempt===generation.current)setResult(observed);
  }finally{
   if(alive.current&&attempt===generation.current){inFlight.current=false;setBusy(false)}
  }
 }
 return <div className="jarvis-dialogue-self-check" aria-label="Prueba real de saludo JARVIS">
  <button type="button" disabled={!ready||busy} onClick={()=>void check()}
   aria-label="Probar saludo real con JARVIS">
   {busy?'Comprobando saludo…':'Probar saludo real'}
  </button>
  {result?<p role="status" aria-live="polite">
   {result.status==='PASS'?'Saludo JARVIS correcto':result.status==='AUTH_REQUIRED'?'Sesión no autorizada':
    result.status==='PERSONA_MISMATCH'?'Saludo aún no conforme':'Conexión no disponible'}.
   {' '}{result.reason}
  </p>:null}
  <small>Solo envía «hola» al Gateway autenticado cuando pulse el botón. No prueba ni activa operaciones, dictado o voz.</small>
 </div>;
}
