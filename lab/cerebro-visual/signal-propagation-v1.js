(()=>{
  'use strict';

  // Operational signal visualization only. This is not hidden model-reasoning telemetry.
  if(typeof cam==='undefined'||typeof centers==='undefined'||typeof names==='undefined'||typeof setStage==='undefined'){
    console.warn('CEREBRO SIGNAL V1: visual base bindings unavailable');
    return;
  }

  const overlay=document.createElement('canvas');
  overlay.id='signal-overlay';
  Object.assign(overlay.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'6'});
  document.body.appendChild(overlay);
  const ox=overlay.getContext('2d',{alpha:true});
  let OW=0,OH=0,ODPR=1;

  function resizeOverlay(){
    ODPR=Math.min(devicePixelRatio||1,1.6);
    OW=innerWidth; OH=innerHeight;
    overlay.width=Math.round(OW*ODPR); overlay.height=Math.round(OH*ODPR);
    ox.setTransform(ODPR,0,0,ODPR,0,0);
  }
  addEventListener('resize',resizeOverlay,{passive:true});
  resizeOverlay();

  const signal={active:false,from:9,to:0,start:0,duration:760};
  let reactionCluster=-1,reactionStart=0,reactionUntil=0;

  function centerObj(i){return{x:centers[i][0],y:centers[i][1]}}

  function quadraticGeometry(from,to){
    const a=P(centerObj(from)),b=P(centerObj(to));
    let c;
    if(from!==9&&to!==9){
      const core=P(centerObj(9));
      c=[core[0],core[1]];
    }else{
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len,amp=Math.min(74,14+len*.13)*(((from+to)&1)?-1:1);
      c=[(a[0]+b[0])*.5+nx*amp,(a[1]+b[1])*.5+ny*amp];
    }
    return{a,b,c};
  }

  function qPoint(g,t){
    const u=1-t;
    return[
      u*u*g.a[0]+2*u*t*g.c[0]+t*t*g.b[0],
      u*u*g.a[1]+2*u*t*g.c[1]+t*t*g.b[1]
    ];
  }

  function drawRoute(g,alpha){
    ox.save();
    ox.globalCompositeOperation='lighter';
    ox.beginPath();ox.moveTo(g.a[0],g.a[1]);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);
    ox.strokeStyle=`rgba(0,102,215,${alpha*.36})`;ox.lineWidth=3.2;ox.shadowColor='rgba(0,155,255,.28)';ox.shadowBlur=12;ox.stroke();
    ox.beginPath();ox.moveTo(g.a[0],g.a[1]);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);
    ox.strokeStyle=`rgba(78,229,255,${alpha})`;ox.lineWidth=.72;ox.shadowBlur=3;ox.stroke();
    ox.restore();
  }

  function drawPulse(x,y,energy){
    const r=2.6+energy*2.2;
    ox.save();
    ox.globalCompositeOperation='lighter';
    ox.shadowColor='rgba(32,212,255,.95)';ox.shadowBlur=18+energy*10;
    ox.fillStyle=`rgba(30,202,255,${.34+.44*energy})`;
    ox.beginPath();ox.arc(x,y,r*2.15,0,Math.PI*2);ox.fill();
    ox.shadowBlur=8;
    ox.fillStyle=`rgba(235,255,255,${.82+.18*energy})`;
    ox.beginPath();ox.arc(x,y,r*.72,0,Math.PI*2);ox.fill();
    ox.restore();
  }

  function drawReaction(now){
    if(reactionCluster<0||now>=reactionUntil)return;
    const p=P(centerObj(reactionCluster));
    const life=clamp((reactionUntil-now)/(reactionUntil-reactionStart),0,1);
    const phase=1-life;
    const pulse=.45+.55*Math.sin(phase*Math.PI);
    ox.save();ox.globalCompositeOperation='lighter';
    for(let i=0;i<3;i++){
      const rr=18+i*16+phase*26;
      ox.strokeStyle=`rgba(${i===0?'210,255,255':'35,206,255'},${(.14-.025*i)*pulse})`;
      ox.lineWidth=i===0?1.2:.6;
      ox.shadowColor='rgba(45,211,255,.55)';ox.shadowBlur=12;
      ox.beginPath();ox.arc(p[0],p[1],rr,0,Math.PI*2);ox.stroke();
    }
    ox.restore();
  }

  function finishSignal(now){
    if(!signal.active)return;
    signal.active=false;
    selected=signal.to;
    reactionCluster=signal.to;
    reactionStart=now;
    reactionUntil=now+(location.hash.includes('signalqa=1')?1600:900);
    setStage(stage);
  }

  function triggerSignal(to=(selected+1)%centers.length){
    const target=((Number(to)||0)%centers.length+centers.length)%centers.length;
    if(target===selected)return false;
    signal.active=true;
    signal.from=selected;
    signal.to=target;
    signal.start=performance.now();
    signal.duration=location.hash.includes('signalqa=1')?2600:760;
    reactionCluster=-1;
    state.textContent='SIGNAL · '+names[signal.from]+' → '+names[signal.to];
    return true;
  }

  function renderSignal(now){
    ox.clearRect(0,0,OW,OH);
    if(signal.active){
      const t=clamp((now-signal.start)/signal.duration,0,1);
      const g=quadraticGeometry(signal.from,signal.to);
      const envelope=Math.sin(Math.PI*Math.min(.999,t));
      drawRoute(g,.12+.20*envelope);
      for(let i=0;i<6;i++){
        const pt=t*1.42-i*.115;
        if(pt<0||pt>1)continue;
        const q=qPoint(g,pt);
        const energy=(1-i/8)*(.74+.26*Math.sin(Math.PI*pt));
        drawPulse(q[0],q[1],energy);
      }
      if(t>=1)finishSignal(now);
    }
    drawReaction(now);
    requestAnimationFrame(renderSignal);
  }

  const follow=document.getElementById('follow');
  if(follow){
    follow.onclick=()=>triggerSignal((selected+1)%centers.length);
    follow.title='Propagar una señal operacional al siguiente clúster lógico';
  }

  window.CEREBRO_SIGNAL_V1=Object.freeze({
    version:'signal-propagation-v1',
    prod_authorized:false,
    trigger:triggerSignal,
    getState:()=>({active:signal.active,from:names[signal.from],to:names[signal.to],reaction:reactionCluster>=0?names[reactionCluster]:null})
  });

  if(location.hash.includes('signal=1'))setTimeout(()=>triggerSignal((selected+1)%centers.length),location.hash.includes('signalqa=1')?1200:550);
  requestAnimationFrame(renderSignal);
})();
