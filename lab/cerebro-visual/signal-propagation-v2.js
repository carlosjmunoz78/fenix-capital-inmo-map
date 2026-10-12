(()=>{
  'use strict';
  // Operational signal visualization only. This is not hidden model-reasoning telemetry.
  if(typeof cam==='undefined'||typeof centers==='undefined'||typeof names==='undefined'||typeof setStage==='undefined'||typeof P==='undefined'){
    console.warn('CEREBRO SIGNAL V2: visual base bindings unavailable');
    return;
  }

  const qaMode=location.hash.includes('signalqa=1');
  const badge=document.createElement('div');
  badge.id='signal-qa-badge-v2';
  Object.assign(badge.style,{position:'fixed',right:'18px',top:'62px',zIndex:'20',padding:'6px 9px',border:'1px solid rgba(74,214,248,.20)',borderRadius:'8px',background:'rgba(0,10,15,.66)',color:'#76d9ef',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  if(qaMode){badge.textContent='SIGNAL V2 · READY';document.body.appendChild(badge)}

  const overlay=document.createElement('canvas');
  overlay.id='signal-overlay-v2';
  Object.assign(overlay.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'6'});
  document.body.appendChild(overlay);
  const ox=overlay.getContext('2d',{alpha:true});
  let OW=0,OH=0,ODPR=1;
  function resizeOverlay(){ODPR=Math.min(devicePixelRatio||1,1.6);OW=innerWidth;OH=innerHeight;overlay.width=Math.round(OW*ODPR);overlay.height=Math.round(OH*ODPR);ox.setTransform(ODPR,0,0,ODPR,0,0)}
  addEventListener('resize',resizeOverlay,{passive:true});resizeOverlay();

  const signal={active:false,from:9,to:0,start:0,duration:700};
  let reactionCluster=-1,reactionStart=0,reactionUntil=0;
  const centerObj=i=>({x:centers[i][0],y:centers[i][1]});
  const clamp01=v=>Math.max(0,Math.min(1,v));

  function geometry(from,to){
    const a=P(centerObj(from)),b=P(centerObj(to));
    const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len;
    let c;
    if(from!==9&&to!==9){const core=P(centerObj(9));c=[core[0],core[1]]}
    else{const amp=Math.min(56,10+len*.09)*(((from+to)&1)?-1:1);c=[(a[0]+b[0])*.5+nx*amp,(a[1]+b[1])*.5+ny*amp]}
    return{a,b,c};
  }
  function qPoint(g,t){const u=1-t;return[u*u*g.a[0]+2*u*t*g.c[0]+t*t*g.b[0],u*u*g.a[1]+2*u*t*g.c[1]+t*t*g.b[1]]}

  function route(g,alpha){
    ox.save();ox.globalCompositeOperation='lighter';
    ox.beginPath();ox.moveTo(g.a[0],g.a[1]);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);
    ox.strokeStyle=`rgba(24,176,232,${alpha*.18})`;ox.lineWidth=1.7;ox.shadowColor='rgba(0,151,235,.16)';ox.shadowBlur=8;ox.stroke();
    ox.beginPath();ox.moveTo(g.a[0],g.a[1]);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);
    ox.strokeStyle=`rgba(120,235,255,${alpha*.52})`;ox.lineWidth=.42;ox.shadowBlur=2;ox.stroke();
    ox.restore();
  }

  function pearl(x,y,energy,rank){
    const core=1.0+energy*.85-rank*.035, halo=3.5+energy*3.2-rank*.12;
    ox.save();ox.globalCompositeOperation='lighter';
    ox.shadowColor='rgba(35,207,255,.58)';ox.shadowBlur=7+energy*6;
    ox.fillStyle=`rgba(44,203,248,${.18+.24*energy})`;ox.beginPath();ox.arc(x,y,Math.max(1.4,halo),0,Math.PI*2);ox.fill();
    ox.shadowBlur=2.5;ox.fillStyle=`rgba(239,255,255,${.72+.24*energy})`;ox.beginPath();ox.arc(x,y,Math.max(.7,core),0,Math.PI*2);ox.fill();
    ox.restore();
  }

  function destinationReaction(now){
    if(reactionCluster<0||now>=reactionUntil)return;
    const p=P(centerObj(reactionCluster));
    const life=clamp01((reactionUntil-now)/(reactionUntil-reactionStart));
    const phase=1-life, pulse=Math.sin(Math.PI*phase);
    ox.save();ox.globalCompositeOperation='lighter';
    const rngBase=reactionCluster*17+3;
    for(let i=0;i<18;i++){
      const a=i*2.3999632297+rngBase*.071;
      const rr=8+((i*13)%17)+phase*(9+(i%5)*2.2);
      const x=p[0]+Math.cos(a)*rr,y=p[1]+Math.sin(a)*rr*.72;
      const alpha=(.12+.18*(1-i/18))*pulse;
      ox.fillStyle=`rgba(${i%4===0?'236,255,255':'69,214,250'},${alpha})`;
      ox.beginPath();ox.arc(x,y,.8+(i%3)*.35,0,Math.PI*2);ox.fill();
    }
    ox.shadowColor='rgba(67,221,255,.38)';ox.shadowBlur=20;
    ox.fillStyle=`rgba(87,223,255,${.07*pulse})`;ox.beginPath();ox.arc(p[0],p[1],18+phase*8,0,Math.PI*2);ox.fill();
    ox.restore();
  }

  function setBadge(text){if(qaMode)badge.textContent=text}
  function finish(now){
    if(!signal.active)return;
    signal.active=false;selected=signal.to;reactionCluster=signal.to;reactionStart=now;reactionUntil=now+(qaMode?1500:820);setStage(stage);
    setBadge('SIGNAL V2 · ARRIVED · '+names[signal.to]);
  }
  function trigger(to=(selected+1)%centers.length){
    const target=((Number(to)||0)%centers.length+centers.length)%centers.length;if(target===selected)return false;
    signal.active=true;signal.from=selected;signal.to=target;signal.start=performance.now();signal.duration=qaMode?2500:700;reactionCluster=-1;
    state.textContent='SIGNAL · '+names[signal.from]+' → '+names[signal.to];setBadge('SIGNAL V2 · ACTIVE · '+names[signal.from]+' → '+names[signal.to]);return true;
  }
  function frame(now){
    ox.clearRect(0,0,OW,OH);
    if(signal.active){
      const t=clamp01((now-signal.start)/signal.duration),g=geometry(signal.from,signal.to),env=Math.sin(Math.PI*Math.min(.999,t));
      route(g,.16+.26*env);
      for(let i=0;i<9;i++){
        const pt=t*1.30-i*.072;if(pt<0||pt>1)continue;
        const q=qPoint(g,pt),e=(1-i/12)*(.68+.28*Math.sin(Math.PI*pt));pearl(q[0],q[1],e,i);
      }
      if(t>=1)finish(now);
    }
    destinationReaction(now);requestAnimationFrame(frame);
  }

  const follow=document.getElementById('follow');if(follow){follow.onclick=()=>trigger((selected+1)%centers.length);follow.title='Propagar una señal operacional al siguiente clúster lógico'}
  window.CEREBRO_SIGNAL_V2=Object.freeze({version:'signal-propagation-v2',prod_authorized:false,trigger,getState:()=>({active:signal.active,from:names[signal.from],to:names[signal.to],reaction:reactionCluster>=0?names[reactionCluster]:null})});
  if(location.hash.includes('signal=1'))setTimeout(()=>trigger((selected+1)%centers.length),qaMode?900:450);
  requestAnimationFrame(frame);
})();
