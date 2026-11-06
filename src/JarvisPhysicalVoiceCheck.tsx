import {useEffect,useRef,useState} from 'react';
import {applyVoiceContextHints,createVoiceRecognition,spanishVoices,speechSynthesisSupported,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {preferredJarvisSpanishVoice,jarvisDictationProblem} from './jarvisVoicePolicy';

/**
 * CUT48: REAL device trial only when the owner clicks, under the authenticated
 * /cerebro surface. Never sends chat, records files, or uses remote vidIQ.
 *
 * Web Speech Recognition may be processed by the BROWSER vendor outside the
 * device. Display this fact before requesting recognition.
 *
 * onend/success means only that the browser signaled completion, NOT
 * that the audio was physically heard or that JARVIS V2 was used.
 */
const TEST_GREETING='A su disposición, señor. Le escucho.';
type PlaybackState='NOT_RUN'|'SPEAKING'|'BROWSER_FINISHED'|'BROWSER_ERROR';
type RecognitionState='NOT_RUN'|'LISTENING'|'TRANSCRIBED'|'STT_ERROR';
type Heard='UNCONFIRMED'|'YES'|'NO';

export default function JarvisPhysicalVoiceCheck({disabled=false}:{disabled?:boolean}){
 const [playback,setPlayback]=useState<PlaybackState>('NOT_RUN');
 const [heard,setHeard]=useState<Heard>('UNCONFIRMED');
 const [recognitionState,setRecognitionState]=useState<RecognitionState>('NOT_RUN');
 const [recognised,setRecognised]=useState('');
 const [error,setError]=useState('');
 const active=useRef(true);
 const mic=useRef<CerebroSpeechRecognition|null>(null);
 const generation=useRef(0);

 useEffect(()=>()=>{active.current=false;generation.current++;
  try{mic.current?.abort()}catch{/* no-op */}
  if(speechSynthesisSupported())try{window.speechSynthesis.cancel()}catch{/* no-op */}
 },[]);
 useEffect(()=>{if(!disabled)return;generation.current++;
  try{mic.current?.abort()}catch{/* no-op */}
  mic.current=null;
  if(speechSynthesisSupported())try{window.speechSynthesis.cancel()}catch{/* no-op */}
  setPlayback(value=>value==='SPEAKING'?'NOT_RUN':value);
  setRecognitionState(value=>value==='LISTENING'?'NOT_RUN':value);
 },[disabled]);

 function tryPlayback(){
  if(disabled||playback==='SPEAKING'||recognitionState==='LISTENING')return;
  setError('');setHeard('UNCONFIRMED');
  if(!speechSynthesisSupported()){
   setPlayback('BROWSER_ERROR');
   setError('Este navegador no permite sintetizar voz para comprobar los altavoces.');
   return;
  }
  const attempt=++generation.current;
  try{
   window.speechSynthesis.cancel();
   const utterance=new SpeechSynthesisUtterance(TEST_GREETING);
   const chosen=preferredJarvisSpanishVoice(spanishVoices());
   utterance.lang=chosen?.lang||'es-ES';
   if(chosen)utterance.voice=chosen;
   utterance.rate=1.10;
   utterance.pitch=0.98; // Provisional native TTS; NOT approved cloned +0.6 semitones.
   utterance.volume=1;
   utterance.onend=()=>{
    if(active.current&&generation.current===attempt)setPlayback('BROWSER_FINISHED');
   };
   utterance.onerror=()=>{
    if(active.current&&generation.current===attempt){
     setPlayback('BROWSER_ERROR');
     setError('El navegador no ha podido completar la prueba de voz.');
    }
   };
   setPlayback('SPEAKING');
   window.speechSynthesis.speak(utterance);
  }catch{
   setPlayback('BROWSER_ERROR');
   setError('No ha sido posible activar la síntesis de voz.');
  }
 }

 function stopPlayback(){
  generation.current++;
  if(speechSynthesisSupported())try{window.speechSynthesis.cancel()}catch{/* no-op */}
  setPlayback('NOT_RUN');setHeard('UNCONFIRMED');
 }

 function tryRecognition(){
  if(disabled||playback==='SPEAKING')return;
  if(mic.current){
   try{mic.current.abort()}catch{/* no-op */}
   mic.current=null;setRecognitionState('NOT_RUN');return;
  }
  setError('');setRecognised('');
  if(!voiceRecognitionSupported()){
   setRecognitionState('STT_ERROR');
   setError('Este navegador no proporciona reconocimiento de voz; puede utilizar el dictado del teclado.');
   return;
  }
  const recognizer=createVoiceRecognition();
  if(!recognizer){
   setRecognitionState('STT_ERROR');
   setError('No se ha podido iniciar el reconocimiento del navegador.');
   return;
  }
  const attempt=++generation.current;
  mic.current=recognizer;
  recognizer.lang='es-ES';
  recognizer.continuous=false;
  recognizer.interimResults=false;
  recognizer.maxAlternatives=1;
  applyVoiceContextHints(recognizer);
  recognizer.onstart=()=>{if(active.current&&generation.current===attempt)setRecognitionState('LISTENING')};
  recognizer.onresult=event=>{
   if(!active.current||generation.current!==attempt)return;
   const chunk=event.results[event.results.length-1];
   const text=String(chunk?.[0]?.transcript||'').trim().slice(0,180);
   setRecognised(text);
   setRecognitionState(text?'TRANSCRIBED':'STT_ERROR');
   if(!text)setError('No se ha recibido ninguna palabra transcrita.');
   try{recognizer.stop()}catch{/* no-op */}
  };
  recognizer.onerror=event=>{
   if(active.current&&generation.current===attempt){
    setRecognitionState('STT_ERROR');
    setError(jarvisDictationProblem(String(event.error||'')));
   }
  };
  recognizer.onend=()=>{
   if(mic.current===recognizer)mic.current=null;
   if(active.current&&generation.current===attempt)
    setRecognitionState(value=>value==='LISTENING'?'STT_ERROR':value);
  };
  try{setRecognitionState('LISTENING');recognizer.start()}
  catch{
   mic.current=null;setRecognitionState('STT_ERROR');
   setError('No se ha podido abrir el micrófono desde el navegador.');
  }
 }

 const busy=playback==='SPEAKING'||recognitionState==='LISTENING';
 return <section className="jarvis-physical-voice-check" aria-label="Prueba física voluntaria de voz y dictado JARVIS">
  <strong>Diagnóstico de voz y dictado</strong>
  <p>Pruebas del dispositivo, independientes del Gateway. El audio de salida usa una voz provisional del navegador, no el clon JARVIS V2 aprobado.</p>
  <div>
   <button type="button" disabled={disabled||recognitionState==='LISTENING'} onClick={()=>playback==='SPEAKING'?stopPlayback():tryPlayback()}
    aria-label="Probar voz de salida JARVIS">{playback==='SPEAKING'?'Detener prueba de voz':'Probar altavoces'}</button>
   <button type="button" disabled={disabled||playback==='SPEAKING'} onClick={tryRecognition}
    aria-label="Probar transcripción real JARVIS">{recognitionState==='LISTENING'?'Detener prueba de dictado':'Probar dictado'}</button>
  </div>
  {playback==='BROWSER_FINISHED'?<div>
   <p>El navegador terminó de sintetizar. ¿Ha oído claramente la frase?</p>
   <button type="button" onClick={()=>setHeard('YES')}>Sí, la he oído</button>
   <button type="button" onClick={()=>setHeard('NO')}>No, no la he oído</button>
  </div>:null}
  {heard==='YES'?<p role="status">Audio confirmado por usted. No acredita que se haya usado la voz clonada V2.</p>:null}
  {heard==='NO'?<p role="status">Sin salida audible confirmada. Revise volumen, dispositivo de audio y permisos del navegador.</p>:null}
  {recognitionState==='LISTENING'?<p role="status">Escuchando. Diga: «Jarvis, prueba de voz».</p>:null}
  {recognitionState==='TRANSCRIBED'?<p role="status">Reconocimiento recibido, sin enviarlo: «{recognised}».</p>:null}
  {error?<p role="alert">{error}</p>:null}
  {busy?<small>Puede detener la prueba con el botón correspondiente.</small>:null}
  <small>El dictado utiliza el reconocimiento del navegador; según el proveedor, podría procesar audio fuera del dispositivo. El resultado de la prueba no se envía a JARVIS, al CRM ni a DeepSeek.</small>
 </section>;
}
