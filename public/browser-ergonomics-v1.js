(()=>{
  if(window.__CEREBRO_BROWSER_ERGONOMICS_V1__)return;
  window.__CEREBRO_BROWSER_ERGONOMICS_V1__=true;

  const BATCH_MS=85;
  const MAX_DELTA=900;
  const STYLE_ID='cerebro-browser-workmode-v2';
  const wheelState=new WeakMap();

  const clamp=value=>Math.max(-MAX_DELTA,Math.min(MAX_DELTA,value));
  const getBrowserRoot=()=>document.querySelector('.cerebro-browser-console');

  function injectWorkModeStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body.cerebro-browser-viewer-expanded{overflow:hidden!important}
      body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded{
        position:fixed!important;
        inset:8px 8px 90px 8px!important;
        width:auto!important;
        height:auto!important;
        max-width:none!important;
        margin:0!important;
        z-index:9998!important;
        border-radius:14px!important;
        box-shadow:0 28px 90px rgba(0,0,0,.72),0 0 0 1px rgba(55,217,255,.18)!important;
      }
      body.cerebro-browser-viewer-expanded .cerebro-browser-composer{
        position:fixed!important;
        left:8px!important;
        right:8px!important;
        bottom:8px!important;
        width:auto!important;
        max-width:none!important;
        margin:0!important;
        padding:0!important;
        overflow:visible!important;
        z-index:10000!important;
        background:transparent!important;
      }
      body.cerebro-browser-viewer-expanded .cerebro-browser-form{
        height:72px!important;
        min-height:72px!important;
        border-color:rgba(55,217,255,.42)!important;
        background:rgba(3,16,24,.97)!important;
        box-shadow:0 18px 60px rgba(0,0,0,.58),0 0 0 1px rgba(55,217,255,.08)!important;
        backdrop-filter:blur(24px) saturate(135%)!important;
      }
      body.cerebro-browser-viewer-expanded .cerebro-browser-form textarea{
        max-height:56px!important;
        font-size:14px!important;
      }
      body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button{
        width:auto!important;
        min-width:118px!important;
        padding:0 12px!important;
        color:#dff8ff!important;
        border-color:rgba(55,217,255,.34)!important;
        background:rgba(12,42,56,.9)!important;
        font-size:11px!important;
        font-weight:900!important;
      }
      body.cerebro-browser-viewer-expanded .cerebro-browser-composer::before{
        content:'ORDEN A CEREBRO · ENTER ENVÍA · ESC SALE DE PANTALLA GRANDE';
        position:absolute;
        left:16px;
        bottom:74px;
        padding:5px 8px;
        border:1px solid rgba(55,217,255,.18);
        border-radius:8px 8px 0 0;
        background:rgba(3,16,24,.94);
        color:#86cfe0;
        font-size:9px;
        font-weight:900;
        letter-spacing:.06em;
        pointer-events:none;
      }
      @media(max-width:900px){
        body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded{inset:4px 4px 82px 4px!important}
        body.cerebro-browser-viewer-expanded .cerebro-browser-composer{left:4px!important;right:4px!important;bottom:4px!important}
        body.cerebro-browser-viewer-expanded .cerebro-browser-form{height:68px!important;min-height:68px!important}
        body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button{min-width:46px!important;padding:0 9px!important;font-size:0!important}
        body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button::after{content:'✕';font-size:16px}
        body.cerebro-browser-viewer-expanded .cerebro-browser-composer::before{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function flushWheel(viewport,state){
    state.timer=0;
    const deltaX=clamp(state.x);
    const deltaY=clamp(state.y);
    state.x=0;
    state.y=0;
    if(!deltaX&&!deltaY)return;
    const batched=new WheelEvent('wheel',{deltaX,deltaY,deltaMode:0,bubbles:true,cancelable:true});
    Object.defineProperty(batched,'__cerebroBatched',{value:true});
    viewport.dispatchEvent(batched);
  }

  document.addEventListener('wheel',event=>{
    if(event.__cerebroBatched)return;
    const target=event.target instanceof Element?event.target.closest('.cerebro-browser-viewport'):null;
    if(!target)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    let state=wheelState.get(target);
    if(!state){state={x:0,y:0,timer:0};wheelState.set(target,state);}
    state.x+=Number(event.deltaX)||0;
    state.y+=Number(event.deltaY)||0;
    if(!state.timer)state.timer=window.setTimeout(()=>flushWheel(target,state),BATCH_MS);
  },{capture:true,passive:false});

  function setExpanded(frame,expanded){
    frame.classList.toggle('cerebro-browser-frame--expanded',expanded);
    document.body.classList.toggle('cerebro-browser-viewer-expanded',expanded);
    const button=frame.querySelector('[data-cerebro-viewer-expand]');
    if(button){
      button.setAttribute('aria-pressed',expanded?'true':'false');
      button.setAttribute('aria-label',expanded?'Salir de pantalla grande':'Ampliar visor');
      button.title=expanded?'Salir de pantalla grande · Esc':'Ampliar visor';
      button.textContent=expanded?'✕  Pequeño':'⛶';
    }
  }

  function ensureExpandButton(root){
    const frame=root.querySelector('.cerebro-browser-frame');
    const address=frame?.querySelector('.cerebro-browser-address');
    if(!frame||!address)return;
    let button=address.querySelector('[data-cerebro-viewer-expand]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.cerebroViewerExpand='1';
      button.className='cerebro-browser-expand-button';
      button.setAttribute('aria-label','Ampliar visor');
      button.setAttribute('aria-pressed','false');
      button.title='Ampliar visor';
      button.textContent='⛶';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        setExpanded(frame,!frame.classList.contains('cerebro-browser-frame--expanded'));
      });
      const status=address.lastElementChild;
      if(status)address.insertBefore(button,status);else address.appendChild(button);
    }
  }

  function sync(){
    injectWorkModeStyles();
    const root=getBrowserRoot();
    if(!root){document.body.classList.remove('cerebro-browser-viewer-expanded');return;}
    ensureExpandButton(root);
    const tabs=root.querySelector('.cerebro-browser-tabs');
    if(tabs){
      const count=tabs.querySelectorAll('[role="button"]').length;
      tabs.style.setProperty('--cerebro-browser-tab-count',String(Math.max(1,count)));
    }
  }

  document.addEventListener('keydown',event=>{
    const root=getBrowserRoot();
    if(!root)return;
    const frame=root.querySelector('.cerebro-browser-frame');
    const expanded=frame?.classList.contains('cerebro-browser-frame--expanded');
    if(event.key==='Escape'&&expanded){
      event.preventDefault();
      event.stopPropagation();
      setExpanded(frame,false);
      return;
    }
    const typing=event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLInputElement||event.target?.isContentEditable;
    if(event.key==='/'&&!typing){
      const composer=root.querySelector('.cerebro-browser-form textarea');
      if(composer instanceof HTMLTextAreaElement&&!composer.disabled){
        event.preventDefault();
        composer.focus();
      }
      return;
    }
    if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey)return;
    const digit=Number(event.key);
    if(!Number.isInteger(digit)||digit<1||digit>8)return;
    const tab=root.querySelectorAll('.cerebro-browser-tabs [role="button"]')[digit-1];
    if(tab instanceof HTMLElement&&tab.getAttribute('aria-disabled')!=='true'){
      event.preventDefault();
      tab.click();
    }
  },true);

  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
