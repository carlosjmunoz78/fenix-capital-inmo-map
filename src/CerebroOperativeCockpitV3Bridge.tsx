import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useCerebroOperativaChat} from './useCerebroOperativaChat';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {fetchOwnerUniverseLab,type OwnerUniverseResult,type UniverseCompanyRequest} from './cerebroOperativaLabUniverseApi';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,speechSynthesisSupported,preferredSpanishVoice,spanishVoices,speechText,type CerebroSpeechRecognition} from './cerebroVoice';
import CerebroOperativeCockpitV3 from './CerebroOperativeCockpitV3';
import './cerebro-operative-console.css';

/**
 * LAB preview bridge based on the actual deployed Operativa owner-only chat.
 * Never mount a second gateway, DOM relay, legacy shell, or second voice session.
 * V3 is read-only for AION/CAPTACASA/all; changing a selector grants no access.
 * This component is reachable only with ?visual_lab=cockpit-v3 in a preview build.
 */
type Company=UniverseCompanyRequest;
type FeedStatus='LIVE'|'CACHED'|'UNAVAILABLE';
const EMPTY:OwnerUniverseResult={kind:'loading',data:null};
export default function CerebroOperativeCockpitV3Bridge(){
 const chat=useCerebroOperativaChat();
 const[company,setCompany]=useState<Company>('fenix');
 const[composer,setComposer]=useState('');
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const[ttsActive,setTtsActive]=useState(false);
 const[source,setSource]=useState<FeedStatus>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[ownerResult,setOwnerResult]=useState<{company:Company;result:OwnerUniverseResult}|null>(null);
 const[selectedRun,setSelectedRun]=useState<CerebroActivityRun|null>(null);
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);
 const isOwnerCompany=company==='fenix';
 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{
   try{
    const{status,data}=await fetchCerebroActivity();
    if(cancelled)return;
    if(status===200&&data?.status==='OK'){
     setRuns((data.runs||[]).filter(run=>run.company_id==='fenix'));
     setSource(data.source_status);setObservedAt(data.observed_at);
    }else{setRuns([]);setSource('UNAVAILABLE');setObservedAt('')}
   }catch{if(!cancelled){setRuns([]);setSource('UNAVAILABLE');setObservedAt('')}}
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},30_000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 useEffect(()=>{
  let alive=true;
  const controller=new AbortController();
  setOwnerResult(null);
  const refresh=async()=>{
   const result=await fetchOwnerUniverseLab(company,controller.signal);
   if(alive)setOwnerResult({company,result});
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},60_000);
  return()=>{alive=false;controller.abort();window.clearInterval(timer)};
 },[company]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* stopped */}}},[]);
 async function submit(){
  const text=composer.trim();
  if(!isOwnerCompany||!chat.ready||chat.sending||!text)return;
  const ok=await chat.sendText(text);
  if(ok){
   setComposer(previous=>previous.trim()===text?'':previous);
   setDictationError('');
  }else setDictationError('No se ha confirmado el envío. Se conserva el mensaje para reintentar.');
 }
 function changeCompany(next:Company){
  if(next===company)return;
  if(chat.voiceActive||chat.sending||dictating){
   setDictationError('Finaliza la conversación o el dictado antes de cambiar de empresa.');
   return;
  }
  setDictationError('');setComposer('');setSelectedRun(null);setCompany(next);
 }
 function toggleVoice(){
  if(!isOwnerCompany||dictating||!chat.ready||chat.sending)return;
  if(!voiceRecognitionSupported()){
   setDictationError('Este Opera no admite conversación por reconocimiento de voz. Para dictar, coloca el cursor en el campo y pulsa Windows + H. Revisa el texto antes de pulsar Enviar.');
   composerRef.current?.focus();return;
  }
  setDictationError('');chat.toggleVoice();
 }
 function readLastReply(){
  if(!isOwnerCompany||dictating||chat.voiceActive)return;
  const latest=[...chat.lines].reverse().find(line=>line.role==='cerebro')?.text||'';
  if(!latest)return;
  if(!speechSynthesisSupported()){
   setDictationError('La voz de salida tampoco está disponible en este navegador; el texto sigue visible.');return;
  }
  try{
   const utterance=new SpeechSynthesisUtterance(speechText(latest,650));
   utterance.lang='es-ES';utterance.rate=1;
   utterance.voice=preferredSpanishVoice(spanishVoices())||null;
   utterance.onstart=()=>{setTtsActive(true);setDictationError('')};
   utterance.onend=()=>setTtsActive(false);
   utterance.onerror=()=>{setTtsActive(false);setDictationError('No se ha podido reproducir la respuesta; el texto permanece visible.')};
   window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
  }catch{setTtsActive(false);setDictationError('No se ha podido iniciar el altavoz del navegador.')}
 }
 function toggleDictation(){
  if(dictating){
   try{dictationRef.current?.stop()}catch{/* stopped */}
   dictationRef.current=null;setDictating(false);return;
  }
  if(!isOwnerCompany||!chat.ready||chat.sending||chat.voiceActive)return;
  if(!voiceRecognitionSupported()){
   setDictationError('Opera no tiene dictado integrado. Pulsa Windows + H con el cursor en este campo para dictar. El texto no se envía hasta que tú pulses Enviar.');
   composerRef.current?.focus();return;
  }
  const recognition=createVoiceRecognition();
  if(!recognition){setDictationError('Dictado no disponible.');return}
  dictationRef.current=recognition;
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=3;
  applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   if(transcript){setComposer(current=>current+(current.trim()?' ':'')+transcript);composerRef.current?.focus()}
  };
  recognition.onerror=event=>{
   const reason=String(event.error||'');
   const label=reason==='not-allowed'||reason==='service-not-allowed'?'Falta permiso de micrófono en el navegador.'
     :reason==='audio-capture'?'No se ha detectado un micrófono.'
     :reason==='network'?'El servicio de reconocimiento del navegador no responde.'
     :reason==='no-speech'?'No se ha detectado voz.':'No se pudo completar el dictado.';
   setDictationError(label+' Alternativa: pulsa Windows + H con el cursor en el campo.');
   setDictating(false);
  };
  recognition.onend=()=>{dictationRef.current=null;setDictating(false)};
  try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}
 }
 const browserStt=voiceRecognitionSupported();
 const voiceFeedback=!browserStt
   ?'Dictado integrado no disponible en Opera. Para dictar gratis, pulsa Windows + H con el cursor en el campo.'
   :chat.voiceActive?(chat.voiceListening?'Micrófono escuchando…':chat.voiceSpeaking?'CEREBRO está hablando…':'Preparando micrófono; comprueba el permiso del navegador.')
   :/micrófono|reconocimiento de voz|audio no|voz no/i.test(chat.statusMessage)?chat.statusMessage:'';
 const snapshot={ready:chat.ready,sending:chat.sending,voiceActive:chat.voiceActive,
  voiceListening:chat.voiceListening,voiceSpeaking:chat.voiceSpeaking};
 return <CerebroOperativeCockpitV3
  snapshot={snapshot}
  composer={composer} onComposerChange={setComposer}
  onSubmit={()=>{void submit()}} onToggleVoice={toggleVoice} onToggleDictation={toggleDictation}
  dictating={dictating} dictationSupported={browserStt} dictationError={dictationError}
  voiceFeedback={voiceFeedback} onReadLastReply={readLastReply} ttsActive={ttsActive}
  composerRef={composerRef}
  source={isOwnerCompany?source:'UNAVAILABLE'} observedAt={isOwnerCompany?observedAt:''}
  company={company} onCompanyChange={changeCompany} scopeCanExecute={isOwnerCompany}
  runs={isOwnerCompany?runs:[]} onOpenRun={setSelectedRun}
  ownerUniverse={ownerResult?.company===company?ownerResult.result:EMPTY}
  chatLines={isOwnerCompany?chat.lines:[]}
 >
  {selectedRun?<div className="operativa-inspector-backdrop"
   onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedRun(null)}}>
   <aside className="operativa-inspector" role="dialog" aria-modal="true" aria-label="Detalle del trabajo">
    <header><div><span>Detalle verificado</span><h2>{selectedRun.workflow_name}</h2></div>
     <button type="button" onClick={()=>setSelectedRun(null)} aria-label="Cerrar"><X size={18}/></button>
    </header>
    <section><span>Estado</span><p>{selectedRun.status}</p></section>
    <section><span>Paso observado</span><p>{selectedRun.current_step||'Sin paso publicado'}</p></section>
    <section><span>Después</span><p>{selectedRun.next_step||'Sin siguiente paso publicado'}</p></section>
    {selectedRun.html_url?.startsWith('https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/')?
     <a href={selectedRun.html_url} target="_blank" rel="noreferrer">Abrir evidencia en GitHub</a>:null}
   </aside>
  </div>:null}
 </CerebroOperativeCockpitV3>;
}
