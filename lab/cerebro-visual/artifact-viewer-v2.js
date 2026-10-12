(()=>{
  'use strict';
  // Generic LAB artifact viewer. QA payloads are explicitly DEMO and are never production data claims.
  const supported=['social_post','image','video','document','report','landing','email','crm_record'];
  let current=null;
  const root=document.createElement('div');
  Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'40',display:'none',alignItems:'center',justifyContent:'center',background:'rgba(0,5,9,.46)',backdropFilter:'blur(3px)',pointerEvents:'auto'});
  root.innerHTML='<div id="av-card" style="width:min(680px,86vw);max-height:78vh;overflow:auto;border:1px solid rgba(75,210,242,.24);border-radius:18px;background:rgba(1,12,18,.94);box-shadow:0 28px 90px rgba(0,0,0,.48);padding:18px 20px;color:#bcebf4;font:11px/1.5 Inter,system-ui,sans-serif"></div>';
  document.body.appendChild(root);
  const card=root.firstElementChild;
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function close(){root.style.display='none';current=null}
  root.addEventListener('click',e=>{if(e.target===root)close()});
  function render(a){
    current=a;const isDemo=a.demo===true;
    card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start"><div><div style="font:700 9px monospace;letter-spacing:.13em;color:#59cfe9">ARTIFACT VIEWER V2 · ${esc(a.type).toUpperCase()}${isDemo?' · DEMO QA':''}</div><h2 style="margin:8px 0 4px;color:#f1feff;font-size:20px">${esc(a.title)}</h2><div style="color:#5e9eaf">${esc(a.channel||'')} ${a.status?'· '+esc(a.status):''}</div></div><button id="av-close" style="border:1px solid rgba(86,204,233,.2);background:#06151c;color:#94d9e8;border-radius:999px;padding:7px 11px;cursor:pointer">CERRAR</button></div>
    <div style="margin-top:16px;padding:14px;border:1px solid rgba(65,191,222,.15);border-radius:12px;background:rgba(0,22,31,.58)"><div style="font-size:13px;color:#e7fcff;white-space:pre-wrap">${esc(a.copy||a.summary||'')}</div></div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin-top:14px;font:10px/1.5 monospace;color:#79bdcd"><div>scheduled_at<br><b style="color:#d8f8ff">${esc(a.scheduled_at||'—')}</b></div><div>cta<br><b style="color:#d8f8ff">${esc(a.cta||'—')}</b></div><div>campaign<br><b style="color:#d8f8ff">${esc(a.campaign||'—')}</b></div><div>artifact_id<br><b style="color:#d8f8ff">${esc(a.id||'qa-demo')}</b></div></div>
    ${isDemo?'<div style="margin-top:16px;color:#e9b35b;font:700 10px monospace">DEMO QA · NO ES UN POST REAL NI ESTÁ PROGRAMADO EN FACEBOOK</div>':''}`;
    card.querySelector('#av-close').onclick=close;root.style.display='flex';return a
  }
  function open(a){if(!a||!supported.includes(a.type))throw Error('artifact type not supported');return render(a)}
  const demoFacebook={demo:true,type:'social_post',id:'fb-qa-demo-001',title:'Próxima publicación Facebook · QA',channel:'Facebook · Fénix Capital',status:'DRAFT_QA',copy:'¿Cuánto necesitas ahorrar realmente para comprar vivienda?\n\nEste contenido es únicamente una muestra visual del Artifact Viewer.',scheduled_at:'2026-10-14 10:00 · QA',cta:'Solicita revisión gratuita',campaign:'QA · Hipoteca 100%'};
  window.CEREBRO_ARTIFACT_VIEWER_V2=Object.freeze({version:'artifact-viewer-v2',prod_authorized:false,supported:[...supported],open,close,getCurrent:()=>current,demoFacebook:()=>open({...demoFacebook})});
  if(location.hash.includes('artifactqa=1'))setTimeout(()=>open({...demoFacebook}),650);
})();