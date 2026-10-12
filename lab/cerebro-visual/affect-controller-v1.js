(()=>{
  'use strict';
  // Expressive shell only. This never changes engine semantic colors or exposes hidden reasoning telemetry.
  const profiles={
    CALM:{speed:.00010,amp:.28,span:.12,halo:5,breath:.18,line:.08},
    ATTENTIVE:{speed:.00018,amp:.42,span:.15,halo:7,breath:.28,line:.12},
    CURIOUS:{speed:.00023,amp:.46,span:.14,halo:7,breath:.34,line:.13},
    FOCUSED:{speed:.00016,amp:.52,span:.10,halo:8,breath:.24,line:.14},
    POSITIVE:{speed:.00020,amp:.48,span:.16,halo:8,breath:.38,line:.13},
    CONCERNED:{speed:.00029,amp:.48,span:.11,halo:7,breath:.22,line:.14},
    URGENT:{speed:.00036,amp:.58,span:.10,halo:8,breath:.20,line:.16}
  };
  let profile='CALM',direction=1,phase=0,last=performance.now();
  const qa=location.hash.includes('affectqa=1');
  const canvas=document.createElement('canvas');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'5'});
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  let W=0,H=0,DPR=1,pts=[];
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'122px',zIndex:'23',padding:'6px 9px',border:'1px solid rgba(74,214,248,.18)',borderRadius:'8px',background:'rgba(0,10,15,.64)',color:'#79cfe2',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);
  function brainPerimeter(t){
    const a=t*Math.PI*2,rx=W*.305,ry=H*.39,cx=W*.5,cy=H*.51;
    const wobble=1+.055*Math.sin(a*3.2)+.035*Math.sin(a*7.1+.8);
    let x=cx+Math.cos(a)*rx*wobble,y=cy+Math.sin(a)*ry*(1+.04*Math.sin(a*4.7));
    if(Math.sin(a)>.62)x+=Math.sin(a*2.1)*W*.022;
    return{x,y,a};
  }
  function rebuild(){
    DPR=Math.min(devicePixelRatio||1,1.6);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
    pts=[];for(let i=0;i<180;i++)pts.push(brainPerimeter(i/180));
  }
  addEventListener('resize',rebuild,{passive:true});rebuild();
  function setProfile(next){if(!profiles[next])return profile;profile=next;badge.textContent='AFFECT V1 · '+profile+' · SHELL ≤ 16%';return profile}
  function waveDistance(a,b){let d=Math.abs(a-b)%(Math.PI*2);return Math.min(d,Math.PI*2-d)}
  function frame(now){
    const dt=Math.min(50,now-last);last=now;const p=profiles[profile];phase=(phase+dt*p.speed*direction)%(Math.PI*2);
    ctx.clearRect(0,0,W,H);const breath=1+p.breath*Math.sin(now*.0012);
    ctx.save();ctx.globalCompositeOperation='lighter';
    let prev=null;
    for(let i=0;i<pts.length;i++){
      const q=pts[i],d=waveDistance(q.a,phase),active=Math.max(0,1-d/(Math.PI*2*p.span));
      if(active<=0){prev=null;continue}
      const env=active*active*p.amp*breath,r=.70+env*1.55;
      if(prev){ctx.globalAlpha=p.line*(.35+.65*env);ctx.strokeStyle='#39bfe9';ctx.lineWidth=.55+env*.35;ctx.shadowColor='rgba(35,202,240,.18)';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(q.x,q.y);ctx.stroke()}
      prev=q;
      ctx.globalAlpha=.09+.18*env;ctx.fillStyle='#1598ca';ctx.shadowColor='rgba(35,202,240,.38)';ctx.shadowBlur=p.halo;ctx.beginPath();ctx.arc(q.x,q.y,r*2.35,0,6.283);ctx.fill();
      if(i%3===0){ctx.globalAlpha=.18+.30*env;ctx.fillStyle='#aef5ff';ctx.shadowBlur=2;ctx.beginPath();ctx.arc(q.x,q.y,.62+r*.34,0,6.283);ctx.fill()}
    }
    ctx.restore();requestAnimationFrame(frame)
  }
  window.CEREBRO_AFFECT_V1=Object.freeze({version:'affect-controller-v1.2',prod_authorized:false,setProfile,getProfile:()=>profile,setDirection:(v)=>{direction=v<0?-1:1;return direction},profiles:Object.keys(profiles)});
  const forced=(location.hash.match(/affectprofile=([A-Z]+)/)||[])[1];setProfile(forced&&profiles[forced]?forced:'CALM');
  if(qa&&location.hash.includes('affect=1')&&!forced){const seq=['CALM','ATTENTIVE','FOCUSED','CONCERNED','CALM'];let i=0;const tick=()=>{setProfile(seq[i++%seq.length]);if(i<seq.length)setTimeout(tick,1400)};setTimeout(tick,350)}
  requestAnimationFrame(frame);
})();