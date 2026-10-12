(()=>{
  'use strict';
  // Additive visual calibration against the approved CEREBRO references.
  // Presentation only; never hidden reasoning telemetry.
  if(typeof clusters==='undefined'||typeof shell==='undefined'||typeof brainWeb==='undefined'||typeof P==='undefined'||typeof cam==='undefined'||typeof ctx==='undefined')return;
  const clamp01=v=>Math.max(0,Math.min(1,v));
  const globalPearls=[];for(let i=3;i<shell.length;i+=14)globalPearls.push(shell[i]);
  const clusterPearls=[];for(let ci=0;ci<clusters.length;ci++){const a=clusters[ci].pearls||[];const out=[];for(let i=(ci%4);i<a.length;i+=6)out.push(a[i]);clusterPearls.push(out)}
  const closePairs=[];for(let ci=0;ci<clusters.length;ci++){const arr=(clusters[ci].pearls&&clusters[ci].pearls.length)?clusters[ci].pearls:clusters[ci].nodes,ps=[];let s=(0x9e3779b9^(ci*2654435761))>>>0;const rnd=()=>((s=(1664525*s+1013904223)>>>0)/4294967296);for(let i=0;i<118;i++){const a=arr[(rnd()*arr.length)|0],b=arr[(rnd()*arr.length)|0];if(!a||!b||a===b)continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d>.035&&d<.34)ps.push([a,b,rnd()>.5?1:-1])}closePairs.push(ps)}

  function crisp(n,alpha,rad){const p=P(n);if(p[0]<-25||p[0]>W+25||p[1]<-25||p[1]>H+25)return;const h=n.h||.4;let core=h>.67?'246,255,255':h>.32?'107,229,250':'34,154,224';let rim=h>.67?'76,224,249':h>.32?'18,175,229':'8,102,191';ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha*.18;ctx.fillStyle=`rgb(${rim})`;ctx.beginPath();ctx.arc(p[0],p[1],rad*2.45,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.fillStyle=`rgb(${core})`;ctx.beginPath();ctx.arc(p[0],p[1],rad,0,Math.PI*2);ctx.fill();if(h>.55){ctx.globalAlpha=alpha*.76;ctx.fillStyle='rgb(255,255,255)';ctx.beginPath();ctx.arc(p[0]-rad*.22,p[1]-rad*.20,Math.max(.42,rad*.32),0,Math.PI*2);ctx.fill()}}
  function link(a,b,alpha,width,bend){const p=P(a),q=P(b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;if((p[0]<-70&&q[0]<-70)||(p[0]>W+70&&q[0]>W+70)||(p[1]<-70&&q[1]<-70)||(p[1]>H+70&&q[1]>H+70))return;const nx=-dy/len,ny=dx/len,amp=Math.min(54,7+len*.11)*bend;const c1x=p[0]+dx*.34+nx*amp,c1y=p[1]+dy*.34+ny*amp,c2x=p[0]+dx*.67-nx*amp*.48,c2y=p[1]+dy*.67-ny*amp*.48;ctx.globalCompositeOperation='source-over';ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);ctx.strokeStyle=`rgba(9,90,183,${alpha*.43})`;ctx.lineWidth=width*2;ctx.stroke();ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);ctx.strokeStyle=`rgba(91,224,252,${alpha})`;ctx.lineWidth=width;ctx.stroke()}

  function globalLayer(g){
    if(g<=.01)return;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.055*g;ctx.fillStyle='#00070c';ctx.fillRect(0,0,W,H);
    // sparse organic web: only enough to imply structure, never polygon soup
    for(let i=1;i<brainWeb.length;i+=11){const e=brainWeb[i];link(e[0],e[1],.030*g,.24,(i&1)?1:-1)}
    for(let i=0;i<globalPearls.length;i++){const n=globalPearls[i],r=.70+(n.s||1)*.70+(n.h||0)*1.55;crisp(n,.26*g,r)}
    for(let ci=0;ci<clusterPearls.length;ci++)for(let i=0;i<clusterPearls[ci].length;i++){const n=clusterPearls[ci][i],r=1.15+(n.s||1)*.78+(n.h||0)*1.35;crisp(n,(.43+.20*(n.h||0))*g,r)}
  }

  function closeLayer(close,deep){
    if(close<.08)return;const c=clusters[selected];if(!c)return;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.004+.008*close+.004*deep;ctx.fillStyle='#00070c';ctx.fillRect(0,0,W,H);
    const ps=closePairs[selected]||[],step=deep>.30?1:2;for(let i=0;i<ps.length;i+=step){const[a,b,s]=ps[i];link(a,b,.058+.112*close+.050*deep,.28+.15*close+.09*deep,s)}
    const pearls=c.pearls||[],stride=deep>.28?4:6;for(let i=0;i<pearls.length;i+=stride){const n=pearls[i],r=(1.02+(n.s||1)*.62)*(1+.48*close+.25*deep);crisp(n,.30+.40*close+.17*deep,r)}
  }

  function frame(){requestAnimationFrame(frame);const global=1-clamp01((cam.zoom-1.02)/1.22),close=clamp01((cam.zoom-1.55)/2.35),deep=clamp01((cam.zoom-3.45)/1.65);ctx.save();globalLayer(global);closeLayer(close,deep);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.restore()}
  requestAnimationFrame(frame);
  window.CEREBRO_REFERENCE_POLISH_V3=Object.freeze({enabled:true,prod_authorized:false,scope:'GLOBAL+ACTIVE_REGION+CLOSE+DEEP'});
})();
