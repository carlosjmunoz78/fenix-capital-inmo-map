(()=>{
  'use strict';
  const panel=document.createElement('div');
  panel.id='pc-qa-panel';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  Object.assign(panel.style,{position:'fixed',right:'18px',bottom:'54px',zIndex:'70',width:'286px',padding:'10px 12px',border:'1px solid rgba(70,204,235,.22)',borderRadius:'12px',background:'rgba(0,9,14,.88)',color:'#8ed8e8',font:'9px/1.5 monospace',pointerEvents:'none'});
  document.body.appendChild(panel);
  const start=performance.now(),deltas=[];let prev=start,frames=0,done=false;
  function bool(v){return v?'PASS':'FAIL'}
  function audit(){
    const baseline=window.CEREBRO_LAB?.version||'missing';
    const modules={signal:!!window.CEREBRO_SIGNAL_V1,motion:!!window.CEREBRO_MOTION_V1,affect:!!window.CEREBRO_AFFECT_V1,conversation:!!window.CEREBRO_CONVERSATION_MOTION_V1,interaction:!!window.CEREBRO_CLUSTER_INTERACTION_V2,artifact:!!window.CEREBRO_ARTIFACT_VIEWER_V2,voiceAdapter:!!window.CEREBRO_VOICE_001_ADAPTER};
    const buttons=[...document.querySelectorAll('button')];
    const namedControls=buttons.filter(b=>(b.textContent||b.getAttribute('aria-label')||'').trim()).length===buttons.length;
    const a11yNav=!!document.querySelector('nav[aria-label*="clúster"]');
    const canvasHidden=document.querySelector('canvas')?.getAttribute('aria-hidden')==='true';
    const reducedPref=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedAware=typeof window.CEREBRO_MOTION_V1?.isReducedMotion==='function';
    const prodSafe=[window.CEREBRO_LAB,window.CEREBRO_SIGNAL_V1,window.CEREBRO_MOTION_V1,window.CEREBRO_AFFECT_V1,window.CEREBRO_CONVERSATION_MOTION_V1,window.CEREBRO_CLUSTER_INTERACTION_V2,window.CEREBRO_ARTIFACT_VIEWER_V2,window.CEREBRO_VOICE_001_ADAPTER].filter(Boolean).every(x=>x.prod_authorized===false);
    const elapsed=performance.now()-start,fps=frames/(elapsed/1000),sorted=[...deltas].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]||0,max=sorted[sorted.length-1]||0,long=deltas.filter(d=>d>50).length;
    const perfPass=fps>=45&&p95<=34;
    const modulePass=Object.values(modules).every(Boolean);
    const a11yPass=namedControls&&a11yNav&&canvasHidden;
    const gate=perfPass&&modulePass&&a11yPass&&reducedAware&&prodSafe;
    panel.innerHTML=`<b style="color:${gate?'#bafee8':'#ffe19a'}">PC QA V1 · ${gate?'PASS':'CHECK'}</b><br>baseline&nbsp; ${baseline}<br>fps&nbsp; ${fps.toFixed(1)} · p95 ${p95.toFixed(1)}ms · max ${max.toFixed(1)}ms · >50ms ${long}<br>performance&nbsp; ${bool(perfPass)}<br>modules&nbsp; ${bool(modulePass)}<br>a11y controls/nav&nbsp; ${bool(a11yPass)}<br>reduced-motion aware&nbsp; ${bool(reducedAware)} · pref ${reducedPref?'ON':'OFF'}<br>prod_authorized false&nbsp; ${bool(prodSafe)}<br>VOICE live&nbsp; ${window.CEREBRO_VOICE_001_ADAPTER?.live_connected?.()?'CONNECTED':'UNBOUND / EXPECTED'}<br><span style="color:#5c9cac">QA runtime only · no PROD mutation</span>`;
    window.CEREBRO_PC_QA_V1=Object.freeze({version:'pc-qa-v1',gate,metrics:{fps,p95,max,long},checks:{modules,a11yPass,reducedAware,reducedPref,prodSafe,perfPass},prod_authorized:false});
  }
  function tick(now){frames++;deltas.push(now-prev);prev=now;if(!done&&now-start<3200)requestAnimationFrame(tick);else{done=true;audit()}}
  panel.textContent='PC QA V1 · MEASURING 3.2s…';requestAnimationFrame(tick);
})();