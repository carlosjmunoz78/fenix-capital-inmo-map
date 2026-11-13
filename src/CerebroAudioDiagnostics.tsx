import {useEffect,useRef,useState} from 'react';
import {Mic,Volume2,Stethoscope} from 'lucide-react';
import {createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-audio-diagnostics.css';

/** Local, consent-based diagnostics. No audio upload, retention, external requests or chat sends. */
export default function CerebroAudioDiagnostics(){
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [micStatus,setMicStatus]=useState('Sin comprobar');
 const [speechStatus,setSpeechStatus]=useState('Sin comprobar');
 const [outputStatus,setOutputStatus]=useState('Sin comprobar');
 const [ttsStatus,setTtsStatus]=useState('Sin comprobar');
 const stream=useRef<MediaStream|null>(null);
 const context=useRef<AudioContext|null>(null);
 const recognition=useRef<CerebroSpeechRecognition|null>(null);
 const recognitionTimeout=useRef<number|null>(null);
 const token=useRef(0);
 const voiceTestRunning=useRef(false);
 const available=voiceRecognitionSupported();
 function stop(){
  if(voiceTestRunning.current&&'speechSynthesis'in window){window.speechSynthesis.cancel();voiceTestRunning.current=false}
  recognition.current?.abort();recognition.current=null;
  if(recognitionTimeout.current!==null){clearTimeout(recognitionTimeout.current);recognitionTimeout.current=null}
  stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
  const ctx=context.current;context.current=null;
  if(ctx){void ctx.close().catch(()=>{})}
 }
 useEffect(()=>()=>{token.current++;stop()},[]);
 async function checkMic(){
  if(busy)return;
  const current=++token.current;stop();setBusy(true);
  setMicStatus('Solicitando permiso; pulsa Permitir si aparece el aviso.');
  if(!navigator.mediaDevices?.getUserMedia){setMicStatus('Este navegador no permite capturar audio.');setBusy(false);return}
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(token.current!==current){input.getTracks().forEach(track=>track.stop());return}
   stream.current=input;
   const ctx=new AudioContext();context.current=ctx;
   await ctx.resume();
   const source=ctx.createMediaStreamSource(input);
   const analyser=ctx.createAnalyser();analyser.fftSize=2048;source.connect(analyser);
   const values=new Float32Array(analyser.fftSize);
   let peak=0;
   setMicStatus('Escuchando 3 segundos. Di una frase en voz normal…');
   for(let i=0;i<30&&token.current===current;i++){
    analyser.getFloatTimeDomainData(values);
    let sum=0;for(const v of values)sum+=v*v;
    peak=Math.max(peak,Math.sqrt(sum/values.length));
    await new Promise<void>(resolve=>setTimeout(resolve,100));
   }
   if(token.current===current)setMicStatus(peak>=0.009
    ?'Micrófono abierto: se ha detectado sonido. Si no hay dictado, falla el reconocimiento, no la captura.'
    :'Micrófono abierto pero sin voz detectable. Comprueba el micrófono elegido, el silencio y el volumen de entrada en Windows.');
  }catch(err){
   if(token.current!==current)return;
   const code=err instanceof DOMException?err.name:'UNKNOWN';
   setMicStatus(code==='NotAllowedError'||code==='PermissionDeniedError'
    ?'Permiso denegado: habilita el micrófono para app.fenixcapital.es en el navegador y en Windows.'
    :code==='NotFoundError'?'No se ha encontrado un micrófono. Revisa el dispositivo de entrada de Windows.'
    :code==='NotReadableError'?'El micrófono no se puede abrir: quizá otra aplicación lo está utilizando.'
    :'No se ha podido abrir el micrófono: '+code);
  }finally{if(token.current===current){stop();setBusy(false)}}
 }
 function checkRecognition(){
  if(busy)return;
  if(!available){setSpeechStatus('No hay SpeechRecognition en este navegador. Se necesita un motor de transcripción alternativo.');return}
  const rec=createVoiceRecognition();
  if(!rec){setSpeechStatus('El navegador anuncia reconocimiento, pero no se ha podido iniciarlo.');return}
  const current=++token.current;stop();
  recognition.current=rec;
  rec.lang='es-ES';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=1;
  rec.onstart=()=>{if(token.current===current)setSpeechStatus('Reconocimiento iniciado. Di una frase corta…')};
  rec.onresult=event=>{
   if(token.current!==current||recognition.current!==rec)return;
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   setSpeechStatus(transcript?'Transcripción detectada: «'+transcript.slice(0,100)+'». No se ha enviado a CEREBRO.':'No se ha detectado ninguna palabra.');
   stop();
  };
  rec.onerror=event=>{
   if(token.current!==current||recognition.current!==rec)return;
   setSpeechStatus('Error de reconocimiento: '+String(event.error||'desconocido')+'. La captura de audio y el reconocimiento son pruebas diferentes.');
   stop();
  };
  rec.onend=()=>{if(token.current!==current||recognition.current!==rec)return;recognition.current=null;
   if(recognitionTimeout.current!==null){clearTimeout(recognitionTimeout.current);recognitionTimeout.current=null}
   setSpeechStatus(s=>s==='Reconocimiento iniciado. Di una frase corta…'?'Terminó sin transcribir. Prueba de nuevo o revisa el permiso.':s);
  };
  setSpeechStatus('Solicitando reconocimiento de voz…');
  try{rec.start();recognitionTimeout.current=window.setTimeout(()=>{
    if(token.current===current&&recognition.current===rec){setSpeechStatus('Tiempo agotado: no hubo transcripción.');stop()}
   },9000)}catch(err){setSpeechStatus('No pudo iniciarse SpeechRecognition: '+(err instanceof Error?err.name:'error'));stop()}
 }
 function checkOutput(){
  try{
   const ctx=new AudioContext();context.current=ctx;
   void ctx.resume().then(()=>{
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.frequency.value=440;oscillator.type='sine';
    gain.gain.setValueAtTime(0.0001,ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12,ctx.currentTime+0.035);
    gain.gain.linearRampToValueAtTime(0.0001,ctx.currentTime+0.55);
    oscillator.connect(gain);gain.connect(ctx.destination);
    oscillator.start();oscillator.stop(ctx.currentTime+0.6);
    oscillator.onended=()=>{void ctx.close().catch(()=>{});if(context.current===ctx)context.current=null};
    setOutputStatus('Se ha emitido el sonido de prueba. ¿Escuchas el pitido?');
   }).catch(()=>{setOutputStatus('No se pudo iniciar el altavoz.');void ctx.close().catch(()=>{})});
  }catch{setOutputStatus('No se ha podido acceder a la salida de audio.')}
 }
 function checkSpeechOutput(){
  if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){
   setTtsStatus('El navegador no ofrece lectura de texto en voz alta.');return;
  }
  try{
   const utterance=new SpeechSynthesisUtterance('Hola. Soy CEREBRO. Esta es una prueba de la voz del navegador.');
   utterance.lang='es-ES';utterance.rate=1;
   utterance.onstart=()=>{voiceTestRunning.current=true;setTtsStatus('Reproduciendo la voz. ¿La escuchas?')};
   utterance.onend=()=>{voiceTestRunning.current=false;setTtsStatus('La reproducción terminó. Confirma si escuchaste la voz.')};
   utterance.onerror=e=>{voiceTestRunning.current=false;setTtsStatus('Error de síntesis de voz: '+String(e.error||'desconocido'))};
   window.speechSynthesis.cancel();
   voiceTestRunning.current=true;
   setTtsStatus('Iniciando la voz del navegador…');
   window.speechSynthesis.speak(utterance);
  }catch{voiceTestRunning.current=false;setTtsStatus('No se pudo iniciar la voz del navegador.')}
 }
 function close(){token.current++;stop();setBusy(false);setOpen(false)}
 if(!open)return <button type="button" className="op3-audio-diagnostic-toggle" onClick={()=>setOpen(true)}><Stethoscope size={15}/> Diagnóstico de micrófono y voz</button>;
 return <section className="op3-audio-diagnostic" aria-label="Diagnóstico local de audio">
  <div className="op3-audio-head"><strong>Comprobar voz y micrófono</strong><button type="button" onClick={close}>Cerrar</button></div>
  <p>Son pruebas locales: no graban ni guardan audio, ni envían instrucciones. Solo solicitan acceso cuando pulsas una prueba.</p>
  <div className="op3-audio-test"><button type="button" disabled={busy} onClick={()=>void checkMic()}><Mic size={15}/> Comprobar micrófono</button><span role="status">{micStatus}</span></div>
  <div className="op3-audio-test"><button type="button" disabled={busy} onClick={checkRecognition}><Mic size={15}/> Comprobar dictado</button><span role="status">{speechStatus}</span></div>
  <div className="op3-audio-test"><button type="button" disabled={busy} onClick={checkOutput}><Volume2 size={15}/> Comprobar altavoces</button><span role="status">{outputStatus}</span></div>
  <div className="op3-audio-test"><button type="button" disabled={busy} onClick={checkSpeechOutput}><Volume2 size={15}/> Comprobar voz hablada</button><span role="status">{ttsStatus}</span></div>
  <p className="op3-audio-note">Si ambos navegadores fallan, revisa también Configuración de Windows → Privacidad y seguridad → Micrófono, y Configuración → Sistema → Sonido → Entrada.</p>
 </section>;
}
