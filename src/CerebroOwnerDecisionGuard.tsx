import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const APPROVAL_RE=/^APR-\d{8}-[A-F0-9]{8}$/;
const DECISIONS=['AUTORIZO','NO AUTORIZO','EXPLICAME','APARCO'] as const;
type Decision=(typeof DECISIONS)[number];

const LABEL:Record<Decision,{title:string;button:string;detail:string}>={
  AUTORIZO:{title:'Autorizar',button:'Confirmar AUTORIZAR',detail:'CEREBRO recibirá tu autorización y la reconciliará con la solicitud pendiente.'},
  'NO AUTORIZO':{title:'Rechazar',button:'Confirmar RECHAZAR',detail:'CEREBRO registrará que no autorizas esta solicitud.'},
  EXPLICAME:{title:'Pedir explicación',button:'Confirmar EXPLICAR',detail:'CEREBRO preparará una explicación más clara antes de que decidas.'},
  APARCO:{title:'Aparcar',button:'Confirmar APARCAR',detail:'CEREBRO dejará esta decisión aparcada sin autorizarla.'},
};

function validDecision(value:string):value is Decision{return (DECISIONS as readonly string[]).includes(value);}

export default function CerebroOwnerDecisionGuard(){
  const isRoute=window.location.pathname==='/cerebro/decision';
  const params=useMemo(()=>new URLSearchParams(window.location.search),[]);
  const approvalId=(params.get('approval_id')||'').trim().toUpperCase();
  const decisionRaw=(params.get('intent')||'').trim().toUpperCase();
  const decision=validDecision(decisionRaw)?decisionRaw:null;
  const valid=APPROVAL_RE.test(approvalId)&&Boolean(decision);
  const [session,setSession]=useState<Session|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [result,setResult]=useState<'idle'|'accepted'|'error'>('idle');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!isRoute)return;
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setAuthReady(true);}});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(mounted){setSession(next);setAuthReady(true);}});
    return()=>{mounted=false;data.subscription.unsubscribe();};
  },[isRoute]);

  if(!isRoute||!authReady||!session)return null;

  async function confirm(){
    if(!valid||!decision||submitting)return;
    setSubmitting(true);setError('');setResult('idle');
    const {data,error:invokeError}=await supabase.functions.invoke('cerebro-owner-decision-gateway-v0',{
      body:{approval_id:approvalId,decision},
    });
    setSubmitting(false);
    if(invokeError||!data?.ok){
      setError('No se pudo registrar la decisión. No se ha autorizado ni ejecutado nada.');
      setResult('error');
      return;
    }
    setResult('accepted');
  }

  const card:CSSProperties={maxWidth:620,width:'calc(100% - 32px)',background:'var(--card-bg, #fff)',color:'var(--text, #151515)',borderRadius:20,padding:'28px',boxShadow:'0 24px 80px rgba(0,0,0,.22)'};
  const button:CSSProperties={width:'100%',border:0,borderRadius:12,padding:'14px 16px',fontWeight:800,cursor:'pointer',fontSize:16};

  return <div data-cerebro-owner-decision="v0" style={{position:'fixed',inset:0,zIndex:100000,display:'grid',placeItems:'center',background:'rgba(12,17,24,.72)',backdropFilter:'blur(5px)'}}>
    <section style={card} aria-live="polite">
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',opacity:.65}}>CEREBRO · DECISIÓN SEGURA</div>
      {!valid&&<><h1>Enlace no válido</h1><p>Este enlace no contiene una solicitud CEREBRO válida. No se ha realizado ningún cambio.</p><button style={button} onClick={()=>window.location.assign('/cerebro')}>Volver a CEREBRO</button></>}
      {valid&&decision&&result==='idle'&&<>
        <h1 style={{marginBottom:8}}>{LABEL[decision].title}</h1>
        <p style={{marginTop:0}}>{LABEL[decision].detail}</p>
        <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(127,127,127,.12)',margin:'18px 0'}}><strong>Solicitud:</strong> {approvalId}</div>
        <p style={{fontSize:14,opacity:.72}}>Abrir el correo o este enlace no ejecuta nada. La decisión solo se envía al pulsar el botón de confirmación estando autenticado.</p>
        {error&&<p role="alert">{error}</p>}
        <button style={{...button,background:'#111',color:'#fff'}} disabled={submitting} onClick={confirm}>{submitting?'Registrando…':LABEL[decision].button}</button>
        <button style={{...button,marginTop:10,background:'transparent',border:'1px solid rgba(127,127,127,.4)'}} onClick={()=>window.location.assign('/cerebro')}>Cancelar y volver</button>
      </>}
      {result==='accepted'&&<>
        <h1>Decisión recibida</h1>
        <p>CEREBRO la ha recibido de forma autenticada y la reconciliará con la solicitud pendiente.</p>
        <p><strong>No se ha ejecutado una acción de negocio desde el enlace.</strong></p>
        <button style={button} onClick={()=>window.location.assign('/cerebro')}>Volver a CEREBRO</button>
      </>}
      {result==='error'&&<>
        <h1>No se ha registrado</h1><p>{error}</p><button style={button} onClick={()=>setResult('idle')}>Volver a intentar</button>
      </>}
    </section>
  </div>;
}
