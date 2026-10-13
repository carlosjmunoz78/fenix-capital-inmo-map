(()=>{
  'use strict';
  // Operational conversation phases only. THINK is a visible UI phase, not hidden chain-of-thought telemetry.
  const motion=window.CEREBRO_MOTION_V2;
  const signal=window.CEREBRO_SIGNAL_V2||window.CEREBRO_SIGNAL_V1;
  if(!motion){console.warn('CEREBRO CONVERSATION MOTION V2: motion controller unavailable');return}
  let phase='IDLE',runToken=0,pendingArrival=Promise.resolve(true),lastTarget=4,lastArtifactGate=null;
  const qa=location.hash.includes('convqa=1');
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'92px',zIndex:'22',padding:'6px 9px',border:'1px solid rgba(74,214,248,.20)',borderRadius:'8px',background:'rgba(0,10,15,.68)',color:'#8ae6f8',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  if(qa)document.body.appendChild(badge);
  function show(extra=''){if(qa)badge.textContent='CONV MOTION V2.1 · '+phase+(extra?' · '+extra:'')}
  function setPhase(next,extra=''){phase=next;show(extra);return phase}
  function cancel(){runToken++;phase='CANCELLED';pendingArrival=Promise.resolve(false);motion.cancel();show('HUMAN OVERRIDE');return true}
  function beginListen(){
    const token=++runToken;lastArtifactGate=null;setPhase('LISTEN','ATTENTIVE');motion.go(0,'CONVERSATIONAL');pendingArrival=motion.whenSettled?.()||Promise.resolve(true);return token
  }
  function onIntent(targetCluster=4){
    const token=runToken||++runToken;lastTarget=Number.isFinite(targetCluster)?targetCluster:4;setPhase('THINK','ROUTE PREP');
    motion.go(1,'CONVERSATIONAL');pendingArrival=motion.whenSettled?.()||Promise.resolve(true);
    if(signal&&typeof signal.trigger==='function')signal.trigger(lastTarget);
    return token
  }
  function waitSignalDestination(token,maxSafetyMs=3200){
    if(!signal||typeof signal.getState!=='function'||!signal.getState().active)return Promise.resolve(true);
    const started=performance.now();show('WAITING SIGNAL DESTINATION');
    return new Promise(resolve=>{
      const tick=now=>{
        if(token!==runToken||motion.getMode()==='MANUAL'){resolve(false);return}
        if(!signal.getState().active){resolve(true);return}
        if(now-started>=maxSafetyMs){resolve(false);return}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  function onResponseStart(){
    const token=runToken||++runToken;setPhase('RESPOND','DESTINATION SYNC');
    pendingArrival=waitSignalDestination(token).then(signalReady=>{
      if(!signalReady||token!==runToken||motion.getMode()==='MANUAL')return false;
      setPhase('RESPOND','CAMERA MOVING');
      return motion.goAndWait(3,'CONVERSATIONAL');
    }).then(ok=>{
      if(token!==runToken||motion.getMode()==='MANUAL')return false;
      if(ok)setPhase('RESPOND','CAMERA ARRIVED');else show('ARRIVAL NOT PROVEN');
      return Boolean(ok);
    });
    return pendingArrival
  }
  async function onArtifactReady(reveal){
    const token=runToken;const arrived=await pendingArrival;
    if(token!==runToken||motion.getMode()==='MANUAL'||!arrived){lastArtifactGate={revealed:false,reason:'CAMERA_NOT_ARRIVED_OR_HUMAN_OVERRIDE',at:performance.now()};show('ARTIFACT HELD');return false}
    setPhase('RESPOND','DATA REVEAL');
    if(typeof reveal==='function')await reveal();
    lastArtifactGate={revealed:true,reason:'CAMERA_ARRIVED',at:performance.now()};show('ARTIFACT REVEALED');return true
  }
  function end(){runToken++;phase='IDLE';pendingArrival=Promise.resolve(true);motion.setMode('MANUAL');show('END');return true}
  function runScenario(targetCluster=4){
    beginListen();
    const token=runToken;
    setTimeout(()=>{if(token===runToken&&motion.getMode()!=='MANUAL')onIntent(targetCluster)},qa?650:180);
    setTimeout(()=>{if(token===runToken&&motion.getMode()!=='MANUAL')onResponseStart()},qa?1600:500);
    return token;
  }
  const human=()=>{if(!['IDLE','CANCELLED'].includes(phase))cancel()};
  addEventListener('wheel',human,{capture:true,passive:true});
  addEventListener('pointerdown',human,{capture:true,passive:true});
  addEventListener('touchstart',human,{capture:true,passive:true});
  window.CEREBRO_CONVERSATION_MOTION_V2=Object.freeze({
    version:'conversation-motion-v2.1',environment:'LAB_PREPROD',prod_authorized:false,
    beginListen,onIntent,onResponseStart,onArtifactReady,end,run:runScenario,cancel,
    getPhase:()=>phase,getPendingArrival:()=>pendingArrival,getLastTarget:()=>lastTarget,getLastArtifactGate:()=>lastArtifactGate?{...lastArtifactGate}:null
  });
  show();
  if(location.hash.includes('conversation=1'))setTimeout(()=>runScenario(4),320);
})();