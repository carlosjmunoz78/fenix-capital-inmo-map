(()=>{
  'use strict';
  // Camera orchestration only. It exposes operational UI state, never hidden model reasoning.
  const api=window.CEREBRO_LAB;
  if(!api||typeof api.setStage!=='function'){console.warn('CEREBRO MOTION V1: base camera API unavailable');return}
  const canvas=document.querySelector('canvas');
  let mode='MANUAL',epoch=0,lastStage=0;
  const qa=location.hash.includes('motionqa=1');
  const badge=document.createElement('div');
  badge.id='motion-qa-badge';
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'62px',zIndex:'21',padding:'6px 9px',border:'1px solid rgba(74,214,248,.22)',borderRadius:'8px',background:'rgba(0,10,15,.70)',color:'#72d9ef',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);
  function show(){badge.textContent='MOTION V1 · '+mode+' · STAGE '+lastStage}
  function setMode(next){mode=next;epoch++;show();return mode}
  function cancel(){setMode('MANUAL')}
  function go(stage,nextMode='CONVERSATIONAL'){
    const s=Math.max(0,Math.min(3,Number(stage)||0));
    mode=nextMode;lastStage=s;epoch++;api.setStage(s);show();return s
  }
  function sequence(stages=[1,2,3],nextMode='AUTONOMOUS'){
    const token=++epoch;mode=nextMode;show();
    let i=0;
    const advance=()=>{
      if(token!==epoch||mode==='MANUAL'||i>=stages.length)return;
      lastStage=stages[i++];api.setStage(lastStage);show();
      if(i<stages.length)setTimeout(advance,qa?1450:620);
    };
    advance();
  }
  const human=()=>{if(mode!=='MANUAL')cancel()};
  addEventListener('wheel',human,{capture:true,passive:true});
  addEventListener('pointerdown',human,{capture:true,passive:true});
  addEventListener('touchstart',human,{capture:true,passive:true});
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key))human()},{capture:true});
  window.CEREBRO_MOTION_V1=Object.freeze({version:'motion-controller-v1.1',prod_authorized:false,getMode:()=>mode,go,sequence,cancel,setMode});
  show();
  if(qa&&location.hash.includes('motion=1')){
    setTimeout(()=>sequence([1,2,3], 'CONVERSATIONAL'),650);
    setTimeout(()=>{
      try{
        const evt=new WheelEvent('wheel',{deltaY:160,bubbles:true,cancelable:true});
        (canvas||window).dispatchEvent(evt);
      }catch(e){human()}
    },5200);
  }
})();