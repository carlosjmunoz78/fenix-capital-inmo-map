import {useEffect,useMemo,useRef,useState,type FormEvent, type KeyboardEvent} from 'react';
import {Activity,AlertTriangle,ArrowRight,BrainCircuit,CheckCircle2,CircleDot,Clock3,Gauge,Globe2,ListTodo,MessageSquareText,Mic,Paperclip,Send,ShieldCheck,Square,Target,Zap} from 'lucide-react';
import './cerebro-operative-console.css';

type CoreLine={key:string;role:'user'|'cerebro';text:string;observedAt:string};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;title:string;detail:string;lines:CoreLine[]};

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,title:'Verificando CEREBRO Gateway…',detail:'Esperando evidencia del transporte autenticado.',lines:[]};

function hhmm(date=new Date()){
 return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}

function short(text:string,limit=170){
 const clean=text.replace(/\s+/g,' ').trim();
 return clean.length>limit?`${clean.slice(0,limit-1)}…`:clean;
}

export default function CerebroOperativeConsole(){
 const [composer,setComposer]=useState('');
 const [snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const observedAtRef=useRef(new Map<string,string>());
 const composerRef=useRef<HTMLTextAreaElement|null>(null);

 useEffect(()=>{
  let raf=0;
  const inspect=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const root=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
    if(!root){setSnapshot(EMPTY);return}
    const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'CEREBRO';
    const detail=root.querySelector<HTMLElement>('.cerebro-panel > p')?.textContent?.trim()||'';
    const ready=title.includes('Transporte autenticado verificado');
    const sendButton=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');
    const voiceButton=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');
    const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';
    const sending=Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando'));
    const voiceActive=voiceButton?.getAttribute('aria-pressed')==='true';
    const voiceListening=voiceStatus.includes('escuchando');
    const voiceSpeaking=voiceStatus.includes('hablando');
    const lineNodes=Array.from(root.querySelectorAll<HTMLElement>('.cerebro-chat-line'));
    const lines:CoreLine[]=lineNodes.slice(-12).map((node,index)=>{
     const role=node.classList.contains('cerebro-chat-user')?'user':'cerebro';
     const strong=node.querySelector('strong');
     const clone=node.cloneNode(true) as HTMLElement;
     clone.querySelector('strong')?.remove();
     clone.querySelector('.cerebro-media-link')?.remove();
     const text=(clone.textContent||node.textContent||'').replace(strong?.textContent||'','').trim();
     const key=`${lineNodes.length-12+index}:${role}:${text}`;
     if(!observedAtRef.current.has(key))observedAtRef.current.set(key,hhmm());
     return{key,role,text,observedAt:observedAtRef.current.get(key)||hhmm()};
    });
    setSnapshot({ready,sending,voiceActive,voiceListening,voiceSpeaking,title,detail,lines});
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);

 const activity=useMemo(()=>snapshot.lines.slice(-6).map(line=>{
  const lower=line.text.toLowerCase();
  const isError=lower.includes('no he podido contactar')||lower.includes('error');
  const needsHuman=line.role==='cerebro'&&(lower.includes('confirm')||lower.includes('elige el número')||lower.includes('human_required'));
  return{
   ...line,
   kind:isError?'error':needsHuman?'human':line.role==='user'?'user':'response',
   title:isError?'Incidencia comunicada':needsHuman?'CEREBRO necesita tu decisión':line.role==='user'?'Orden enviada':'Respuesta de CEREBRO',
   detail:short(line.text)
  };
 }),[snapshot.lines]);

 const lastLine=snapshot.lines.at(-1);
 const activeCount=snapshot.sending?1:0;
 const statusLabel=snapshot.sending?'Trabajando':snapshot.ready?'Listo':'Sin conexión';
 const nextPrimary=!snapshot.ready?'Restablecer conexión segura con CEREBRO Gateway':snapshot.sending?'Esperar el resultado de la ejecución actual':lastLine?.role==='cerebro'?'Continuar la conversación o dar una nueva orden':'Dar una orden a CEREBRO';

 function submit(event?:FormEvent){
  event?.preventDefault();
  const clean=composer.trim();
  if(!clean||!snapshot.ready||snapshot.sending)return;
  const core=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
  const textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');
  const form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');
  if(!textarea||!form)return;
  setReactTextareaValue(textarea,clean);
  window.setTimeout(()=>form.requestSubmit(),0);
  setComposer('');
 }

 function toggleVoice(){
  const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');
  if(button&&!button.disabled)button.click();
 }

 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}
 }

 return <main className="cerebro-operative" aria-label="CEREBRO · Vista operativa">
  <header className="cerebro-operative-header">
   <div className="cerebro-operative-brand">
    <span className="cerebro-operative-logo"><BrainCircuit size={34}/></span>
    <div><h1>CEREBRO</h1><p>Asistente operativo</p></div>
   </div>
   <div className={`cerebro-work-state ${snapshot.sending?'is-working':snapshot.ready?'is-ready':'is-offline'}`}><CircleDot size={18}/><strong>{statusLabel}</strong></div>
   <div className="cerebro-top-metrics" aria-label="Estado operativo">
    <div className="cerebro-metric"><CheckCircle2 size={22}/><span><small>Estado general</small><strong>{snapshot.ready?'Todo en orden':'Conexión pendiente'}</strong></span></div>
    <div className="cerebro-metric"><ListTodo size={22}/><span><small>Tareas activas</small><strong>{activeCount}</strong></span></div>
    <div className="cerebro-metric cerebro-metric-progress"><Gauge size={22}/><span><small>Progreso</small><strong>Sin métrica fiable</strong></span></div>
    <div className="cerebro-owner-badge" title="Superficie owner autenticada"><ShieldCheck size={20}/><span>OWNER</span></div>
   </div>
  </header>

  <div className="cerebro-operative-grid">
   <section className="cerebro-surface cerebro-timeline" aria-labelledby="cerebro-timeline-title">
    <div className="cerebro-section-title"><Activity size={30}/><div><h2 id="cerebro-timeline-title">Qué está haciendo CEREBRO</h2><p>Actividad observada sobre el hilo real de la Console. Sin datos simulados.</p></div></div>
    <div className="cerebro-timeline-list" aria-live="polite">
     {activity.length===0?<div className="cerebro-empty-state"><Clock3 size={24}/><div><strong>{snapshot.ready?'Conexión verificada. Esperando tu primera orden.':'Todavía no hay actividad verificable.'}</strong><span>{snapshot.ready?'Escribe, dicta o da una orden desde el compositor inferior.':snapshot.title}</span></div></div>:activity.map((item,index)=><article key={item.key} className={`cerebro-event is-${item.kind}`}>
      <time>{item.observedAt}</time>
      <span className="cerebro-event-node">{item.kind==='error'?<AlertTriangle size={22}/>:item.kind==='human'?<ShieldCheck size={22}/>:item.role==='user'?<Zap size={22}/>:<BrainCircuit size={22}/>}</span>
      <div className="cerebro-event-card"><div className="cerebro-event-meta"><strong>{item.title}</strong><small>{item.role==='user'?'REAL · orden observada':'DERIVED · evento observado'}</small></div><p>{item.detail}</p></div>
      {index<activity.length-1?<span className="cerebro-event-line"/>:null}
     </article>)}
     {snapshot.sending?<div className="cerebro-working-tail"><span className="cerebro-pulse-dots"><i/><i/><i/></span>CEREBRO sigue trabajando…</div>:null}
    </div>
   </section>

   <aside className="cerebro-operative-side">
    <section className="cerebro-surface cerebro-now" aria-labelledby="cerebro-now-title">
     <div className="cerebro-section-title compact"><Target size={28}/><h2 id="cerebro-now-title">En marcha ahora</h2></div>
     {snapshot.sending?<div className="cerebro-now-row is-running"><span className="cerebro-now-icon"><BrainCircuit size={22}/></span><div><strong>Procesando tu petición</strong><small>REAL · petición en curso</small></div><span className="cerebro-state-chip">En curso</span></div>:snapshot.voiceActive?<div className="cerebro-now-row"><span className="cerebro-now-icon"><Mic size={22}/></span><div><strong>Conversación por voz activa</strong><small>{snapshot.voiceListening?'Escuchando':snapshot.voiceSpeaking?'Respondiendo':'Preparada'}</small></div><span className="cerebro-state-chip">Activa</span></div>:<div className="cerebro-empty-side"><CircleDot size={24}/><div><strong>Sin ejecución activa verificada</strong><span>CEREBRO está preparado para recibir una orden.</span></div></div>}
     <div className="cerebro-now-row"><span className="cerebro-now-icon"><Globe2 size={22}/></span><div><strong>CEREBRO Gateway</strong><small>{snapshot.ready?'Transporte autenticado verificado':'No disponible'}</small></div><span className={`cerebro-state-chip ${snapshot.ready?'is-ok':'is-error'}`}>{snapshot.ready?'Conectado':'Bloqueado'}</span></div>
    </section>

    <section className="cerebro-surface cerebro-next" aria-labelledby="cerebro-next-title">
     <div className="cerebro-section-title compact"><ArrowRight size={28}/><h2 id="cerebro-next-title">Siguiente</h2></div>
     <ol>
      <li><span>1</span><strong>{nextPrimary}</strong></li>
      <li><span>2</span><strong>Las acciones sensibles conservarán propuesta y confirmación humana</strong></li>
     </ol>
    </section>

    <section className="cerebro-surface cerebro-reality" aria-label="Contrato de datos de la vista">
     <div><ShieldCheck size={20}/><strong>Sin datos ficticios</strong></div>
     <p>Los porcentajes del diseño de referencia no se muestran mientras no exista una métrica real del Gateway.</p>
    </section>
   </aside>
  </div>

  <section className="cerebro-composer-shell" aria-label="Compositor de órdenes">
   <span className="cerebro-composer-mark"><BrainCircuit size={30}/></span>
   <form onSubmit={submit} className="cerebro-operative-form">
    <div className="cerebro-composer-main">
     <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe o habla con CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
     <button type="button" className="cerebro-icon-button" disabled title="Adjuntos: pendiente de contrato real de subida"><Paperclip size={20}/><span className="sr-only">Adjuntar archivo</span></button>
     <button type="button" className={`cerebro-icon-button ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready} title={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}>{snapshot.voiceActive?<Square size={19}/>:<Mic size={20}/>}<span className="sr-only">{snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}</span></button>
     <button type="submit" className="cerebro-send-button" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar a CEREBRO"><Send size={22}/></button>
    </div>
    <div className="cerebro-composer-actions">
     <button type="button" disabled><Paperclip size={17}/> Subir archivo <small>POR AUDITAR</small></button>
     <button type="button" onClick={toggleVoice} disabled={!snapshot.ready}><Mic size={17}/> {snapshot.voiceActive?'Finalizar voz':'Dictar'}</button>
     <button type="button" onClick={()=>{setComposer('¿Qué puedes hacer por mí desde esta Console?');composerRef.current?.focus()}}><MessageSquareText size={17}/> Pedir ayuda</button>
     <button type="button" onClick={()=>composerRef.current?.focus()}><Zap size={17}/> Dar una orden</button>
    </div>
   </form>
  </section>
 </main>;
}
