(()=>{
  'use strict';
  // Camera orchestration only. Operational UI state only; never hidden model reasoning telemetry.
  const api=window.CEREBRO_LAB;
  if(!api||typeof api.setStage!=='function'){console.warn('CEREBRO MOTION V2: base camera API unavailable');return}
  const canvas=document.querySelector('canvas');
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const forceReduce=location.hash.includes('motionreduceqa=1');
  const reduced=()=>forceReduce||media.matches;
  const hasCamera=()=>typeof cam!=='undefined'&&typeof want!=='undefined';
  let mode='MANUAL',epoch=0,lastStage=0,lastArrival={stage:0,settled:true,at:performance.now()};
  const qa=location.hash.includes('motionqa=1');
  const badge=document.createElement('div');
  badge.id='motion-qa-badge-v2';
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'62px',zIndex:'21',padding:'6px 9px',border:'1px solid rgba(74,214,248,.22)',borderRadius:'8px',background:'rgba(0,10,15,.70)',color:'#72d9ef',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  if(qa)document.body.appendChild(badge);
  function show(extra=''){if(qa)badge.textContent='MOTION V2 · '+mode+' · STAGE '+lastStage+(reduced()?' · REDUCED':'')+(extra?' · '+extra:'')}
  function setMode(next){mode=next;epoch++;show();return mode}
  function cancel(){setMode('MANUAL');return true}
  function cameraError(){
    if(!hasCamera())return null;
    return{position:Math.hypot(cam.cx-want.cx,cam.cy-want.cy),zoom:Math.abs(cam.zoom-want.zoom),targetZoom:want.zoom};
  }
  function isSettled(){
    const e=cameraError();
    if(!e)return true;
    return e.position<=0.010&&e.zoom<=Math.max(0.012,e.targetZoom*0.008);
  }
  function snapReduced(){
    if(!reduced()||!hasCamera())return false;
    cam.cx=want.cx;cam.cy=want.cy;cam.zoom=want.zoom;return true;
  }
  function go(stage,nextMode='CONVERSATIONAL'){
    const s=Math.max(0,Math.min(3,Number(stage)||0));
    mode=nextMode;lastStage=s;epoch++;api.setStage(s);snapReduced();
    if(isSettled())lastArrival={stage:s,settled:true,at:performance.now()};
    show();return s
  }
  function whenSettled(token=epoch,maxSafetyMs=5000){
    if(reduced())snapReduced();
    if(isSettled()){lastArrival={stage:lastStage,settled:true,at:performance.now()};show('ARRIVED');return Promise.resolve(true)}
    const started=performance.now();
    return new Promise(resolve=>{
      const tick=now=>{
        if(token!==epoch||mode==='MANUAL'){show('CANCELLED');resolve(false);return}
        if(isSettled()){
          lastArrival={stage:lastStage,settled:true,at:now};show('ARRIVED');resolve(true);return
        }
        if(now-started>=maxSafetyMs){lastArrival={stage:lastStage,settled:false,at:now};show('SAFETY TIMEOUT');resolve(false);return}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  function goAndWait(stage,nextMode='CONVERSATIONAL'){go(stage,nextMode);const token=epoch;return whenSettled(token)}
  async function sequence(stages=[1,2,3],nextMode='AUTONOMOUS'){
    const clean=stages.map(s=>Math.max(0,Math.min(3,Number(s)||0)));
    const token=++epoch;mode=nextMode;show();
    for(const s of clean){
      if(token!==epoch||mode==='MANUAL')return false;
      lastStage=s;api.setStage(s);snapReduced();show();
      const ok=await whenSettled(token);
      if(!ok)return false;
    }
    return true;
  }
  const human=()=>{if(mode!=='MANUAL')cancel()};
  addEventListener('wheel',human,{capture:true,passive:true});
  addEventListener('pointerdown',human,{capture:true,passive:true});
  addEventListener('touchstart',human,{capture:true,passive:true});
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key))human()},{capture:true});
  media.addEventListener?.('change',()=>{if(reduced())snapReduced();show()});
  window.CEREBRO_MOTION_V2=Object.freeze({
    version:'motion-controller-v2',environment:'LAB_PREPROD',prod_authorized:false,
    getMode:()=>mode,getStage:()=>lastStage,isReducedMotion:reduced,isSettled,cameraError,
    getLastArrival:()=>({...lastArrival}),go,goAndWait,whenSettled,sequence,cancel,setMode
  });
  show();
  if(qa&&location.hash.includes('motion=1'))setTimeout(()=>sequence([1,2,3],'CONVERSATIONAL'),250);
})();