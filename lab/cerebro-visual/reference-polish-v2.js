(()=>{
  'use strict';
  // Visual calibration layer for the approved neural-cluster references.
  // It changes presentation only; it is not model-reasoning telemetry.
  if(typeof clusters==='undefined'||typeof P==='undefined'||typeof cam==='undefined'||typeof ctx==='undefined')return;

  const seeded=(seed)=>{let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)};
  const R=seeded(2147);
  const pairs=[];
  try{
    for(let ci=0;ci<clusters.length;ci++){
      const arr=(clusters[ci].pearls&&clusters[ci].pearls.length)?clusters[ci].pearls:clusters[ci].nodes;
      const ps=[];
      for(let i=0;i<112;i++){
        const a=arr[(R()*arr.length)|0],b=arr[(R()*arr.length)|0];
        if(!a||!b||a===b)continue;
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d>.035&&d<.34)ps.push([a,b,R()>.5?1:-1]);
      }
      pairs.push(ps);
    }
  }catch(e){return}

  const clamp01=v=>Math.max(0,Math.min(1,v));
  function curved(a,b,alpha,width,bend){
    const p=P(a),q=P(b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;
    if((p[0]<-70&&q[0]<-70)||(p[0]>W+70&&q[0]>W+70)||(p[1]<-70&&q[1]<-70)||(p[1]>H+70&&q[1]>H+70))return;
    const nx=-dy/len,ny=dx/len,amp=Math.min(58,8+len*.12)*bend;
    const c1x=p[0]+dx*.34+nx*amp,c1y=p[1]+dy*.34+ny*amp;
    const c2x=p[0]+dx*.67-nx*amp*.52,c2y=p[1]+dy*.67-ny*amp*.52;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(6,86,182,${alpha*.42})`;ctx.lineWidth=width*2.15;ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(90,224,252,${alpha})`;ctx.lineWidth=width;ctx.stroke();
    if(alpha>.11){ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);ctx.strokeStyle=`rgba(228,253,255,${alpha*.22})`;ctx.lineWidth=Math.max(.16,width*.34);ctx.stroke()}
  }
  function pearl(n,alpha,rad){
    const p=P(n);if(p[0]<-30||p[0]>W+30||p[1]<-30||p[1]>H+30)return;
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=alpha*.24;ctx.fillStyle='#20c9f3';ctx.beginPath();ctx.arc(p[0],p[1],rad*2.65,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle='#f6feff';ctx.beginPath();ctx.arc(p[0],p[1],rad,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=Math.min(1,alpha*.86);ctx.fillStyle='#aaf9ff';ctx.beginPath();ctx.arc(p[0]-rad*.24,p[1]-rad*.22,Math.max(.50,rad*.38),0,Math.PI*2);ctx.fill();
  }

  function frame(){
    requestAnimationFrame(frame);
    const close=clamp01((cam.zoom-1.55)/2.35),deep=clamp01((cam.zoom-3.45)/1.65);
    if(close<.08)return;
    const c=clusters[selected];if(!c)return;
    ctx.save();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=.006+.012*close+.006*deep;ctx.fillStyle='#00070c';ctx.fillRect(0,0,W,H);

    const ps=pairs[selected]||[];
    ctx.globalCompositeOperation='source-over';
    const step=deep>.32?1:2;
    for(let i=0;i<ps.length;i+=step){const [a,b,s]=ps[i];curved(a,b,(.055+.105*close+.048*deep),.28+.15*close+.09*deep,s)}

    const pearls=c.pearls||[];
    const stride=deep>.32?4:6;
    for(let i=0;i<pearls.length;i+=stride){
      const n=pearls[i],r=(.98+(n.s||1)*.59)*(1+.48*close+.24*deep);
      pearl(n,.28+.39*close+.16*deep,r);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.restore();
  }
  requestAnimationFrame(frame);
  window.CEREBRO_REFERENCE_POLISH_V2=Object.freeze({enabled:true,prod_authorized:false});
})();
