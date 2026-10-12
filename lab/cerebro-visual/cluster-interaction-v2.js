(()=>{
  'use strict';
  // LAB interaction metadata only. Values below are QA/demo state, never production claims.
  const api=window.CEREBRO_LAB;
  const follow=document.getElementById('follow');
  const baseCanvas=document.querySelector('canvas');
  if(!api||typeof api.setStage!=='function'||!follow||!baseCanvas){console.warn('CEREBRO INTERACTION V2: base bindings unavailable');return}
  const names=['OPS','AUTOMATION','KNOWLEDGE','GROWTH','COMMS','FINANCE','SECURITY','SUPERVISION','FACTORY','CORE'];
  const centers=[[-1.34,.48],[-.82,1.02],[.12,.92],[.88,.48],[.78,-.18],[.64,-.86],[-.42,-1.08],[-1.35,-.34],[-.30,.30],[-.05,.05]];
  const meta=names.map((n,i)=>({company_id:'fenix',engine_id:n.toLowerCase()+'-qa',cluster_id:n,environment:'LAB_PREPROD',version:'qa-v2',enabled:true,phase:'OPERATIVE_QA',activity_level:5,health_state:'QA_DEMO',current_job:'visual-interaction-qa',last_event:'synthetic-selection',signal_in:0,signal_out:0,artifact_ids:[],confidence:null,updated_at:'QA_RUNTIME'}));
  let selected=9,stage=0,visible=true;
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',left:'18px',top:'152px',zIndex:'25',padding:'6px 9px',border:'1px solid rgba(74,214,248,.18)',borderRadius:'8px',background:'rgba(0,10,15,.68)',color:'#79d9ed',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);
  const panel=document.createElement('div');
  Object.assign(panel.style,{position:'fixed',right:'18px',top:'96px',zIndex:'24',width:'258px',padding:'12px 14px',border:'1px solid rgba(78,205,235,.18)',borderRadius:'12px',background:'rgba(0,8,13,.82)',boxShadow:'0 12px 40px rgba(0,0,0,.22)',color:'#9edbe8',font:'10px/1.45 monospace',pointerEvents:'none'});
  document.body.appendChild(panel);
  function renderPanel(){const m=meta[selected];badge.textContent='INTERACTION V2 · '+names[selected]+' · QA METADATA';panel.innerHTML='<b style="color:#e7fbff;font-size:11px">'+names[selected]+'</b><div style="margin-top:6px;color:#4c8fa3">LAB / PREPROD · DEMO STATE</div><div style="margin-top:8px">engine_id&nbsp; '+m.engine_id+'<br>environment&nbsp; '+m.environment+'<br>phase&nbsp; '+m.phase+'<br>activity&nbsp; '+m.activity_level+'/10<br>health&nbsp; '+m.health_state+'<br>artifact_ids&nbsp; []</div>';panel.style.display=visible?'block':'none'}
  function baseProject(i){const W=innerWidth,H=innerHeight,c=centers[i],base=Math.min(W/4.35,H/3.28);return[W*.5+c[0]*base,H*.5-c[1]*base]}
  function focus(target,deep=2){target=((Number(target)||0)%names.length+names.length)%names.length;const steps=(target-selected+names.length)%names.length;for(let i=0;i<steps;i++)follow.onclick();selected=target;stage=Math.max(1,Math.min(3,deep));api.setStage(stage);visible=true;renderPanel();return meta[selected]}
  function hitTest(x,y){let best=-1,bd=72;for(let i=0;i<centers.length;i++){const p=baseProject(i),d=Math.hypot(x-p[0],y-p[1]);if(d<bd){bd=d;best=i}}return best}
  baseCanvas.addEventListener('dblclick',e=>{if(stage!==0)return;const i=hitTest(e.clientX,e.clientY);if(i>=0)focus(i,2)});
  document.getElementById('home')?.addEventListener('click',()=>{stage=0;visible=false;renderPanel()});
  window.CEREBRO_CLUSTER_INTERACTION_V2=Object.freeze({version:'cluster-interaction-v2',prod_authorized:false,focus,getSelected:()=>meta[selected],getAll:()=>meta.map(x=>({...x})),hide:()=>{visible=false;renderPanel()}});
  renderPanel();
  if(location.hash.includes('interactionqa=1'))setTimeout(()=>focus(5,2),650);
})();