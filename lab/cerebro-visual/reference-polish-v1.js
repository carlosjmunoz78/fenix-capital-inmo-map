'use strict';
(()=>{
  const seedRand=(seed)=>{let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)};
  const R=seedRand(14701);
  const curvePairs=[];
  try{
    for(let ci=0;ci<clusters.length;ci++){
      const c=clusters[ci], arr=c.pearls&&c.pearls.length?c.pearls:c.nodes;
      const pairs=[];
      for(let i=0;i<72;i++){
        const a=arr[(R()*arr.length)|0], b=arr[(R()*arr.length)|0];
        if(!a||!b||a===b)continue;
        const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
        if(d>.06&&d<.46)pairs.push([a,b,R()>.5?1:-1]);
      }
      curvePairs.push(pairs);
    }
  }catch(e){return}
  function organic(a,b,alpha,width,bend){
    const p=P(a),q=P(b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;
    if((p[0]<-80&&q[0]<-80)||(p[0]>W+80&&q[0]>W+80)||(p[1]<-80&&q[1]<-80)||(p[1]>H+80&&q[1]>H+80))return;
    const nx=-dy/len,ny=dx/len,amp=Math.min(72,10+len*.16)*bend;
    const c1x=p[0]+dx*.33+nx*amp,c1y=p[1]+dy*.33+ny*amp;
    const c2x=p[0]+dx*.68-nx*amp*.55,c2y=p[1]+dy*.68-ny*amp*.55;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(17,151,224,${alpha*.46})`;ctx.lineWidth=width*2.4;ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(97,226,255,${alpha})`;ctx.lineWidth=width;ctx.stroke();
  }
  function pearl(n,alpha,rad){
    const p=P(n);if(p[0]<-30||p[0]>W+30||p[1]<-30||p[1]>H+30)return;
    ctx.globalAlpha=alpha*.22;ctx.fillStyle='#48dffb';ctx.beginPath();ctx.arc(p[0],p[1],rad*2.6,0,6.283);ctx.fill();
    ctx.globalAlpha=alpha;ctx.fillStyle='#eefdff';ctx.beginPath();ctx.arc(p[0],p[1],rad,0,6.283);ctx.fill();
  }
  function polish(){
    requestAnimationFrame(polish);
    let z=0;try{z=cam.zoom}catch(e){return}
    const close=Math.max(0,Math.min(1,(z-1.35)/2.2));
    const deep=Math.max(0,Math.min(1,(z-3.15)/2.2));
    if(close<.04)return;
    const c=clusters[selected];if(!c)return;
    ctx.save();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=.05+.045*deep;ctx.fillStyle='#001018';ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    const pairs=curvePairs[selected]||[];
    const step=deep>.45?1:2;
    for(let i=0;i<pairs.length;i+=step){const [a,b,s]=pairs[i];organic(a,b,(.045+.085*close)*(1+.28*deep),.28+.18*deep,s)}
    const pearls=c.pearls||[];
    const stride=deep>.42?3:5;
    for(let i=0;i<pearls.length;i+=stride){const n=pearls[i];pearl(n,.20+.30*close+.10*deep,.55+.50*deep+(n.s||1)*.16)}
    ctx.globalAlpha=1;ctx.restore();
  }
  requestAnimationFrame(polish);
  window.CEREBRO_REFERENCE_POLISH_V1={enabled:true,prod_authorized:false};
})();