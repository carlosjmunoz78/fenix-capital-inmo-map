import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useCerebroOperativaChat} from './useCerebroOperativaChat';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {fetchOwnerUniverseLab,type OwnerUniverseResult,type UniverseCompanyRequest} from './cerebroOperativaLabUniverseApi';
import {createVoiceRecognition,voiceRecognitionSupported,speechSynthesisSupported,preferredSpanishVoice,spanishVoices,speechText,type CerebroSpeechRecognition} from './cerebroVoice';
import CerebroOperativeCockpitV3 from './CerebroOperativeCockpitV3';
import {answerFleetQuestion,classifyFleetQuestion,readFleetLab} from './cerebroFleetObserveApi';
import {readUniversalOperativaLab} from './cerebroUniversalOperativaLabApi';
import {readLabWorkerState,applyLabWorkerAction,type LabWorkerAction} from './cerebroLabWorkerControlApi';
import {readCloudflareFleet,answerCloudflareFleet,resolveCloudflareWorkerMention} from './cerebroCloudflareFleetApi';
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
 const[operatorAnswer,setOperatorAnswer]=useState<{question:string;text:string}|null>(null);
 const[fleetSending,setFleetSending]=useState(false);
 const[labPending,setLabPending]=useState<{action:LabWorkerAction;revision:number;priority:number|null}|null>(null);
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
  if(!isOwnerCompany||chat.sending||fleetSending||!text)return;
  const host=typeof window!=='undefined'?window.location.hostname:'';
  const preview=host==='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app'||/^fenix-capital-preprod-[a-z0-9]+[.]vercel[.]app$/.test(host);
  const question=preview?classifyFleetQuestion(text):null;
  if(preview&&/(?:^|[^A-Z0-9])LAB-DEMO-001(?:$|[^A-Z0-9])/i.test(text)){
   setFleetSending(true);
   try{
    const read=await readLabWorkerState();
    if(read.kind!=='ready'||!read.data){setOperatorAnswer({question:text,text:'El estado del worker LAB no es verificable: '+read.reason+'. Sin ejecución.'});return;}
    if(question?.kind==='control'){
     const action=question.action as LabWorkerAction;
     const priorityText=text.match(/(?:prioridad\s*|\bal\s*)([1-5])\b/i)?.[1];
     const priority=action==='PRIORITIZE'?(priorityText?Number(priorityText):null):null;
     if(action==='PRIORITIZE'&&priority===null){setOperatorAnswer({question:text,text:'Indica una prioridad exacta entre 1 y 5 (por ejemplo: «priorizar LAB-DEMO-001 al 4»). Ningún cambio aplicado.'});return;}
     setLabPending({action,revision:read.data.revision,priority});
     setOperatorAnswer({question:text,text:'PROPUESTA, NO EJECUTADA: '+action+' sobre LAB-DEMO-001, empresa Fénix, entorno LAB, revisión '+read.data.revision+(priority!==null?', prioridad '+priority:'')+'. Confirma la operación exacta o cancela. No afecta a otros motores.'});
    }else{
     setLabPending(null);
     setOperatorAnswer({question:text,text:'LAB-DEMO-001 · lectura actual: '+read.data.desired_state+', prioridad '+read.data.priority+', revisión '+read.data.revision+', '+read.data.work_units+' pasos realizados. Observado: '+read.data.observed_at+'. Worker manual y aislado, no implica actividad de otros motores.'});
    }
    setComposer('');
   }finally{setFleetSending(false)}
   return;
  }
  if(question&&(/cloudflare|workers?/i.test(text)||/LAB-CF-CANARY-001/i.test(text)||/cerebro-(?:instagram|facebook|jarvis|fact001|ums001|linkedin|social|model)-[a-z0-9-]+/i.test(text))){
   setFleetSending(true);
   try{
    if(question.kind==='control'){
     setOperatorAnswer({question:text,text:'ORDEN NO EJECUTADA. El conector Cloudflare disponible en Operativa es estrictamente de solo lectura. Antes de pausar o reactivar este Worker se necesitan su contrato, snapshot, permisos específicos, rollback y confirmación verificable.'});
    }else{
     const read=await readCloudflareFleet({refresh:true});
     const matched=resolveCloudflareWorkerMention(text,read)||undefined;
     setOperatorAnswer({question:text,text:answerCloudflareFleet(read,matched)});
    }
    setComposer('');
   }finally{setFleetSending(false)}
   return;
  }
  if(question){
   setFleetSending(true);
   try{
    const read=question.kind==='query'?await readFleetLab():{kind:'unavailable',snapshot:null,reason:'CONTROL_PREFLIGHT_ONLY'} as const;
    let answer=answerFleetQuestion(read,question);
    const engine=question.kind==='query'?text.toUpperCase().match(/(?:^|[^A-Z0-9])([A-Z]{2,12}-[0-9]{3})(?=$|[^A-Z0-9])/)?.[1]:null;
    if(engine){
     const proof=await readUniversalOperativaLab();
     const job=proof.job001;
     const state=job?.engineBindings.find(x=>x.engine_id===engine);
     const controls=job?.controlEngineBindings.find(x=>x.engine_id===engine);
     answer='Motor '+engine+': '+(state?'estado DECLARADO '+state.declared_state+' ('+(state.freshness==='STALE_CONFIG'?'configuración antigua':'configuración reciente')+', '+state.observed_config_at.slice(0,10)+')':'sin estado individual acreditado')+'. '+
      (controls?'Controles configurados: '+controls.configured_controls+', habilitados: '+controls.enabled_controls+', antiguos: '+controls.stale_controls+'.':'Sin controles individuales acreditados en esta fuente.')+
      ' Ejecución real del motor: NO VERIFICADA. '+(job?.state==='OK'?'Fuente: metadatos PREPROD de JOB-001.':'Fuente JOB-001 no disponible; no se infiere un estado activo.');
    }
    setOperatorAnswer({question:text,text:answer});
    setComposer('');
   }finally{setFleetSending(false)}
   return;
  }
  if(!chat.ready){
   setOperatorAnswer({question:text,text:'El Gateway conversacional general no está verificado. La consulta no se ha enviado ni ha ejecutado cambios.'});
   return;
  }
  setOperatorAnswer(null);
  const ok=await chat.sendText(text);
  if(ok){
   setComposer(previous=>previous.trim()===text?'':previous);
   setDictationError('');
  }else setDictationError('No se ha confirmado el envío. Se conserva el mensaje para reintentar.');
 }
 async function confirmLabControl(){
  if(!labPending||fleetSending)return;
  const expected=labPending;
  setLabPending(null);setFleetSending(true);
  try{
   const receipt=await applyLabWorkerAction({action:expected.action,priority:expected.priority,
    expected_revision:expected.revision,idempotency_key:'labctrl-'+crypto.randomUUID()});
   if(receipt.kind!=='ready'||!receipt.data){setOperatorAnswer({question:'Control LAB-DEMO-001',text:'Operación NO CERTIFICADA: '+receipt.reason+'. Comprobar estado y recibos antes de reintentar.'});return;}
   const post=await readLabWorkerState();
   const a=receipt.data.after,p=post.data;
   const confirmed=post.kind==='ready'&&!!p&&p.revision===a.revision&&p.desired_state===a.desired_state&&
    p.priority===a.priority&&p.work_units===a.work_units&&p.last_receipt_id===receipt.data.receipt_id;
   setOperatorAnswer({question:'Control '+expected.action+' LAB-DEMO-001',text:confirmed?
    'CONTROL REAL LAB VERIFICADO: '+expected.action+' · antes '+receipt.data.before.desired_state+' / revisión '+receipt.data.before.revision+', después '+a.desired_state+' / revisión '+a.revision+', prioridad '+a.priority+', pasos '+a.work_units+'. Recibo '+receipt.data.receipt_id+'.':
    'Recibo '+receipt.data.receipt_id+' recibido pero lectura posterior NO COINCIDE; no se declara éxito. Se requiere revisión.'});
  }finally{setFleetSending(false)}
 }
 function changeCompany(next:Company){
  if(next===company)return;
  if(chat.voiceActive||chat.sending||dictating){
   setDictationError('Finaliza la conversación o el dictado antes de cambiar de empresa.');
   return;
  }
  setDictationError('');setComposer('');setOperatorAnswer(null);setLabPending(null);setSelectedRun(null);setCompany(next);
 }
 function toggleVoice(){
  if(!isOwnerCompany||dictating||!chat.ready||chat.sending)return;
  if(!voiceRecognitionSupported()){
   setDictationError('Este Opera no admite conversación por reconocimiento de voz. Para dictar, coloca el cursor en el campo y pulsa Windows + H. Revisa el texto antes de pulsar Enviar.');
   composerRef.current?.focus();return;
  }
  setDictationError('');chat.toggleVoice();
 }
 function stopAllAudio(){
  if(speechSynthesisSupported())window.speechSynthesis.cancel();
  chat.stopVoice();
  if(dictationRef.current){try{dictationRef.current.abort()}catch{/* stopped */}dictationRef.current=null}
  setDictating(false);setTtsActive(false);setDictationError('');
 }
 useEffect(()=>{
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&(chat.voiceActive||chat.voiceSpeaking||ttsActive)){
    event.preventDefault();stopAllAudio();
   }
  };
  window.addEventListener('keydown',keydown);
  return()=>window.removeEventListener('keydown',keydown);
 },[chat.voiceActive,chat.voiceSpeaking,ttsActive]);
 function readLastReply(){
  if(!isOwnerCompany||dictating||chat.voiceActive)return;
  const latest=[...chat.lines].reverse().find(line=>line.role==='cerebro')?.text||'';
  if(!latest)return;
  if(!speechSynthesisSupported()){
   setDictationError('La voz de salida tampoco está disponible en este navegador; el texto sigue visible.');return;
  }
  try{
   const utterance=new SpeechSynthesisUtterance(speechText(latest,650));
   utterance.lang='es-ES';utterance.rate=1.15;
   utterance.voice=preferredSpanishVoice(spanishVoices())||null;
   utterance.onstart=()=>{setTtsActive(true);setDictationError('')};
   utterance.onend=()=>setTtsActive(false);
   utterance.onerror=event=>{
    setTtsActive(false);
    if(!['interrupted','canceled'].includes(String(event.error||'')))setDictationError('No se ha podido reproducir la respuesta; el texto permanece visible.');
   };
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
  /* No contextual phrase list: Chrome can expose SpeechRecognitionPhrase but reject it with phrases-not-supported. */
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   if(transcript){setComposer(current=>current+(current.trim()?' ':'')+transcript);composerRef.current?.focus()}
  };
  recognition.onerror=event=>{
   const reason=String(event.error||'');
   const label=reason==='phrases-not-supported'?'El servicio rechaza las frases opcionales del reconocimiento. Actualiza la App y prueba de nuevo.'
     :reason==='not-allowed'||reason==='service-not-allowed'?'Falta permiso de micrófono en el navegador.'
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
 const snapshot={ready:chat.ready,sending:chat.sending||fleetSending||!!labPending,voiceActive:chat.voiceActive,
  voiceListening:chat.voiceListening,voiceSpeaking:chat.voiceSpeaking};
 return <CerebroOperativeCockpitV3
  snapshot={snapshot}
  composer={composer} onComposerChange={setComposer}
  onSubmit={()=>{void submit()}} onToggleVoice={toggleVoice} onToggleDictation={toggleDictation}
  dictating={dictating} dictationSupported={browserStt} dictationError={dictationError}
  voiceFeedback={voiceFeedback} onReadLastReply={readLastReply} ttsActive={ttsActive}
  onStopVoice={stopAllAudio}
  composerRef={composerRef}
  source={isOwnerCompany?source:'UNAVAILABLE'} observedAt={isOwnerCompany?observedAt:''}
  company={company} onCompanyChange={changeCompany} scopeCanExecute={isOwnerCompany}
  runs={isOwnerCompany?runs:[]} onOpenRun={setSelectedRun}
  ownerUniverse={ownerResult?.company===company?ownerResult.result:EMPTY}
  chatLines={isOwnerCompany?chat.lines:[]}
  operatorAnswer={isOwnerCompany?operatorAnswer:null}
  labProposal={isOwnerCompany?labPending:null}
  onConfirmLabProposal={()=>{void confirmLabControl()}}
  onCancelLabProposal={()=>{setLabPending(null);setOperatorAnswer({question:'Control LAB',text:'Orden cancelada sin ejecución.'})}}
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
