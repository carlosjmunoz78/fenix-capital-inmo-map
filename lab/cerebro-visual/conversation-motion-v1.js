(()=>{
  'use strict';
  // UI conversation phase only. THINK means an operational UI phase, not hidden chain-of-thought telemetry.
  const motion=window.CEREBRO_MOTION_V1;
  const signal=window.CEREBRO_SIGNAL_V1;
  if(!motion){console.warn('CEREBRO CONVERSATION MOTION V1: motion controller unavailable');return}
  let phase='IDLE',runToken=0;
  const qa=location.hash.includes('convqa=1');
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'92px',zIndex:'22',padding:'6px 9px',border:'1px solid rgba(74,214,248,.20)',borderRadius:'8px',background:'rgba(0,10,15,.68)',color:'#8ae6f8',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);
  function show(extra=''){badge.textContent='CONV MOTION V1 · '+phase+(extra?' · '+extra:'')}
  function setPhase(next,extra=''){phase=next;show(extra)}
  function cancel(){runToken++;phase='CANCELLED';motion.cancel();show('HUMAN OVERRIDE')}
  function runScenario(targetCluster=4){
    const token=++runToken;
    setPhase('LISTEN','ATTENTIVE');
    motion.go(0,'CONVERSATIONAL');
    setTimeout(()=>{
      if(token!==runToken||motion.getMode()==='MANUAL')return;
      setPhase('THINK','ROUTE PREP');
      motion.go(1,'CONVERSATIONAL');
      if(signal&&typeof signal.trigger==='function')signal.trigger(targetCluster);
    },qa?900:220);
    setTimeout(()=>{
      if(token!==runToken||motion.getMode()==='MANUAL')return;
      setPhase('RESPOND','ARRIVE BEFORE DATA');
      motion.go(3,'CONVERSATIONAL');
    },qa?2500:720);
    setTimeout(()=>{
      if(token!==runToken||motion.getMode()==='MANUAL')return;
      setPhase('RESPOND','FOCUSED');
    },qa?3600:1050);
  }
  const human=()=>{if(phase!=='IDLE'&&phase!=='CANCELLED')cancel()};
  addEventListener('wheel',human,{capture:true,passive:true});
  addEventListener('pointerdown',human,{capture:true,passive:true});
  addEventListener('touchstart',human,{capture:true,passive:true});
  window.CEREBRO_CONVERSATION_MOTION_V1=Object.freeze({version:'conversation-motion-v1',prod_authorized:false,run:runScenario,cancel,getPhase:()=>phase});
  show();
  if(location.hash.includes('conversation=1'))setTimeout(()=>runScenario(4),420);
})();