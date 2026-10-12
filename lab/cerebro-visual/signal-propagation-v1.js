(()=>{
  'use strict';
  // Operational visualization only. Never represents hidden model reasoning telemetry.
  const names=['OPS','AUTOMATION','KNOWLEDGE','GROWTH','COMMS','FINANCE','SECURITY','SUPERVISION','FACTORY','CORE'];
  const centers=[[-1.34,.48],[-.82,1.02],[.12,.92],[.88,.48],[.78,-.18],[.64,-.86],[-.42,-1.08],[-1.35,-.34],[-.30,.30],[-.05,.05]];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const qaMode=location.hash.includes('signalqa=1');
  const stateEl=document.getElementById('state');
  const follow=document.getElementById('follow');
  if(!stateEl||!follow){console.warn('CEREBRO SIGNAL V1: base UI unavailable');return}
  const baseFollow=follow.onclick;

  const badge=document.createElement('div');
  badge.id='signal-qa-badge';badge.textContent='SIGNAL V1 · ARMED';
  Object.assign(badge.style,{position:'fixed',right:'18px',top:'62px',zIndex:'20',padding:'6px 9px',border:'1px solid rgba(74,214,248,.28)',borderRadius:'8px',background:'rgba(0,10,15,.72)',color:'#77def4',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);

  const overlay=document.createElement('canvas');
  Object.assign(overlay.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'6'});
  document.body.appendChild(overlay);
  const ox=overlay.getContext('2d',{alpha:true});
  let W=0,H=0,DPR=1;
  function resize(){DPR=Math.min(devicePixelRatio||1,1.6);W=innerWidth;H=innerHeight;overlay.width=Math.round(W*DPR);overlay.height=Math.round(H*DPR);ox.setTransform(DPR,0,0,DPR,0,0)}
  addEventListener('resize',resize,{passive:true});resize();

  function stageFromText(){const t=stateEl.textContent||'';if(t.includes('SUBCLUSTER'))return 3;if(t.includes('NEURAL CLUSTER'))return 2;if(t.includes('ACTIVE REGION'))return 1;return 0}
  function selectedFromText(fallback=9){const t=stateEl.textContent||'';for(let i=0;i<names.length;i++)if(t.includes(names[i]))return i;return fallback}
  let selectedLocal=selectedFromText(9);
  const signal={active:false,from:9,to:0,start:0,duration:qaMode?2600:760};
  let reaction=-1,reactionStart=0,reactionUntil=0;

  function projectWorld(x,y){
    const stage=stageFromText(), focus=centers[selectedLocal];
    const zoom=[1,1.90,3.55,5.55][stage]||1;
    const cx=stage===0?0:focus[0],cy=stage===0?0:focus[1];
    const base=Math.min(W/4.35,H/3.28)*zoom;
    return[W*.5+(x-cx)*base,H*.5-(y-cy)*base]
  }
  function centerP(i){return projectWorld(centers[i][0],centers[i][1])}
  function geometry(from,to){
    const a=centerP(from),b=centerP(to),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const amp=Math.min(76,14+len*.13)*(((from+to)&1)?-1:1);
    return{a,b,c:[(a[0]+b[0])*.5+nx*amp,(a[1]+b[1])*.5+ny*amp]}
  }
  function qPoint(g,t){const u=1-t;return[u*u*g.a[0]+2*u*t*g.c[0]+t*t*g.b[0],u*u*g.a[1]+2*u*t*g.c[1]+t*t*g.b[1]]}
  function route(g,alpha){ox.save();ox.globalCompositeOperation='lighter';ox.beginPath();ox.moveTo(...g.a);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);ox.strokeStyle=`rgba(0,102,215,${alpha*.34})`;ox.lineWidth=3.2;ox.shadowColor='rgba(0,155,255,.26)';ox.shadowBlur=12;ox.stroke();ox.beginPath();ox.moveTo(...g.a);ox.quadraticCurveTo(g.c[0],g.c[1],g.b[0],g.b[1]);ox.strokeStyle=`rgba(83,231,255,${alpha})`;ox.lineWidth=.72;ox.shadowBlur=3;ox.stroke();ox.restore()}
  function pulse(x,y,e){const r=2.4+e*2.1;ox.save();ox.globalCompositeOperation='lighter';ox.shadowColor='rgba(32,212,255,.95)';ox.shadowBlur=16+e*10;ox.fillStyle=`rgba(30,202,255,${.32+.42*e})`;ox.beginPath();ox.arc(x,y,r*2.1,0,6.283);ox.fill();ox.shadowBlur=7;ox.fillStyle=`rgba(245,255,255,${.84+.16*e})`;ox.beginPath();ox.arc(x,y,r*.70,0,6.283);ox.fill();ox.restore()}
  function drawReaction(now){if(reaction<0||now>=reactionUntil)return;const p=centerP(reaction),life=clamp((reactionUntil-now)/(reactionUntil-reactionStart),0,1),phase=1-life,p=.45+.55*Math.sin(phase*Math.PI);ox.save();ox.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const rr=18+i*16+phase*26;ox.strokeStyle=`rgba(${i===0?'210,255,255':'35,206,255'},${(.14-.025*i)*p})`;ox.lineWidth=i===0?1.2:.6;ox.shadowColor='rgba(45,211,255,.55)';ox.shadowBlur=12;ox.beginPath();ox.arc(centerP(reaction)[0],centerP(reaction)[1],rr,0,6.283);ox.stroke()}ox.restore()}
  function setBadge(t){badge.textContent=t}
  function finish(now){if(!signal.active)return;signal.active=false;reaction=signal.to;reactionStart=now;reactionUntil=now+(qaMode?1600:900);if(typeof baseFollow==='function')baseFollow();selectedLocal=signal.to;setBadge('SIGNAL V1 · ARRIVED · '+names[selectedLocal])}
  function trigger(to=(selectedLocal+1)%names.length){const target=((Number(to)||0)%names.length+names.length)%names.length;if(target===selectedLocal)return false;signal.active=true;signal.from=selectedLocal;signal.to=target;signal.start=performance.now();signal.duration=qaMode?2600:760;reaction=-1;stateEl.textContent='SIGNAL · '+names[signal.from]+' → '+names[signal.to];setBadge('SIGNAL V1 · ACTIVE · '+names[signal.from]+' → '+names[signal.to]);return true}
  function frame(now){ox.clearRect(0,0,W,H);if(signal.active){const t=clamp((now-signal.start)/signal.duration,0,1),g=geometry(signal.from,signal.to),env=Math.sin(Math.PI*Math.min(.999,t));route(g,.12+.22*env);for(let i=0;i<6;i++){const pt=t*1.42-i*.115;if(pt<0||pt>1)continue;const q=qPoint(g,pt),e=(1-i/8)*(.74+.26*Math.sin(Math.PI*pt));pulse(q[0],q[1],e)}if(t>=1)finish(now)}drawReaction(now);requestAnimationFrame(frame)}
  follow.onclick=()=>trigger((selectedLocal+1)%names.length);
  follow.title='Propagar una señal operacional al siguiente clúster lógico';
  window.CEREBRO_SIGNAL_V1=Object.freeze({version:'signal-propagation-v1.1',prod_authorized:false,trigger,getState:()=>({active:signal.active,from:names[signal.from],to:names[signal.to],reaction:reaction>=0?names[reaction]:null})});
  if(location.hash.includes('signal=1'))setTimeout(()=>trigger((selectedLocal+1)%names.length),qaMode?1200:550);
  requestAnimationFrame(frame);
})();