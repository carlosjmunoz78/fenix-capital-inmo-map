'use strict';
(()=>{
  const seedRand=(seed)=>{let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)};
  const R=seedRand(14702);
  const curvePairs=[];
  try{
    for(let ci=0;ci<clusters.length;ci++){
      const c=clusters[ci], arr=c.pearls&&c.pearls.length?c.pearls:c.nodes;
      const pairs=[];
      for(let i=0;i<96;i++){
        const a=arr[(R()*arr.length)|0], b=arr[(R()*arr.length)|0];
        if(!a||!b||a===b)continue;
        const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
        if(d>.055&&d<.40)pairs.push([a,b,R()>.5?1:-1]);
      }
      curvePairs.push(pairs);
    }
  }catch(e){return}
  function organic(a,b,alpha,width,bend){
    const p=P(a),q=P(b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;
    if((p[0]<-90&&q[0]<-90)||(p[0]>W+90&&q[0]>W+90)||(p[1]<-90&&q[1]<-90)||(p[1]>H+90&&q[1]>H+90))return;
    const nx=-dy/len,ny=dx/len,amp=Math.min(68,9+len*.15)*bend;
    const c1x=p[0]+dx*.31+nx*amp,c1y=p[1]+dy*.31+ny*amp;
    const c2x=p[0]+dx*.70-nx*amp*.52,c2y=p[1]+dy*.70-ny*amp*.52;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(4,102,194,${alpha*.58})`;ctx.lineWidth=width*2.2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);
    ctx.strokeStyle=`rgba(106,232,255,${alpha})`;ctx.lineWidth=width;ctx.stroke();
    if(alpha>.12){ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,q[0],q[1]);ctx.strokeStyle=`rgba(224,253,255,${alpha*.30})`;ctx.lineWidth=Math.max(.16,width*.32);ctx.stroke()}
  }
  function pearl(n,alpha,rad){
    const p=P(n);if(p[0]<-35||p[0]>W+35||p[1]<-35||p[1]>H+35)return;
    ctx.globalAlpha=alpha*.15;ctx.fillStyle='#159fd9';ctx.beginPath();ctx.arc(p[0],p[1],rad*3.0,0,6.283);ctx.fill();
    ctx.globalAlpha=alpha*.55;ctx.fillStyle='#8cf4ff';ctx.beginPath();ctx.arc(p[0],p[1],rad*1.55,0,6.283);ctx.fill();
    ctx.globalAlpha=Math.min(1,alpha*1.16);ctx.fillStyle='#f8ffff';ctx.beginPath();ctx.arc(p[0],p[1],rad*.78,0,6.283);ctx.fill();
  }
  function polish(){
    requestAnimationFrame(polish);
    let z=0;try{z=cam.zoom}catch(e){return}
    const close=Math.max(0,Math.min(1,(z-1.28)/2.05));
    const deep=Math.max(0,Math.min(1,(z-3.00)/2.15));
    if(close<.04)return;
    const c=clusters[selected];if(!c)return;
    ctx.save();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=.065+.075*deep;ctx.fillStyle='#001018';ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    const pairs=curvePairs[selected]||[];
    const step=deep>.28?1:2;
    for(let i=0;i<pairs.length;i+=step){const [a,b,s]=pairs[i];organic(a,b,(.055+.105*close)*(1+.25*deep),.30+.16*deep,s)}
    const pearls=c.pearls||[];
    const stride=deep>.35?2:4;
    for(let i=0;i<pearls.length;i+=stride){const n=pearls[i];pearl(n,.22+.28*close+.10*deep,.62+.56*deep+(n.s||1)*.17)}
    ctx.globalAlpha=1;ctx.restore();
  }
  requestAnimationFrame(polish);
  window.CEREBRO_REFERENCE_POLISH_V1={enabled:true,revision:'v2',prod_authorized:false};
})();