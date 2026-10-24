(()=>{
  if(window.__CEREBRO_BROWSER_ERGONOMICS_V1__)return;
  window.__CEREBRO_BROWSER_ERGONOMICS_V1__=true;

  const BATCH_MS=85;
  const MAX_DELTA=900;
  const wheelState=new WeakMap();

  const clamp=value=>Math.max(-MAX_DELTA,Math.min(MAX_DELTA,value));
  const getBrowserRoot=()=>document.querySelector('.cerebro-browser-console');

  function ensureWorkspaceStyles(){
    if(document.getElementById('cerebro-browser-workspace-ergonomics'))return;
    const style=document.createElement('style');
    style.id='cerebro-browser-workspace-ergonomics';
    style.textContent=`
body.cerebro-browser-viewer-expanded{overflow:hidden!important;background:#020a10!important}
body.cerebro-browser-viewer-expanded .cerebro-browser-frame.cerebro-browser-frame--expanded{position:fixed!important;inset:8px 8px 92px 8px!important;width:auto!important;height:auto!important;max-width:none!important;max-height:none!important;margin:0!important;z-index:10000!important;border-radius:14px!important;box-shadow:0 20px 80px rgba(0,0,0,.62)!important}
body.cerebro-browser-viewer-expanded .cerebro-browser-composer{position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;width:auto!important;margin:0!important;padding:0!important;z-index:10002!important;background:transparent!important}
body.cerebro-browser-viewer-expanded .cerebro-browser-form{height:76px!important;min-height:76px!important;border-color:rgba(55,217,255,.42)!important;background:rgba(4,18,27,.98)!important;box-shadow:0 14px 44px rgba(0,0,0,.58),0 0 0 1px rgba(55,217,255,.08)!important}
body.cerebro-browser-viewer-expanded .cerebro-browser-form textarea{max-height:60px!important;font-size:14px!important}
body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button{color:#dff8ff!important;background:rgba(35,122,158,.28)!important;border-color:rgba(55,217,255,.48)!important}
.cerebro-browser-expanded-hint{display:none;align-items:center;gap:7px;margin-left:auto;padding:5px 9px;border:1px solid rgba(55,217,255,.2);border-radius:999px;color:#9edbea;background:rgba(9,39,52,.72);font-size:9px;font-weight:850;letter-spacing:.06em;white-space:nowrap}
body.cerebro-browser-viewer-expanded .cerebro-browser-expanded-hint{display:inline-flex}
@media(max-width:760px){body.cerebro-browser-viewer-expanded .cerebro-browser-frame.cerebro-browser-frame--expanded{inset:4px 4px 84px 4px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-composer{left:4px!important;right:4px!important;bottom:4px!important}.cerebro-browser-expanded-hint{display:none!important}}
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
    ensureWorkspaceStyles();
    frame.classList.toggle('cerebro-browser-frame--expanded',expanded);
    document.body.classList.toggle('cerebro-browser-viewer-expanded',expanded);
    const button=frame.querySelector('[data-cerebro-viewer-expand]');
    if(button){
      button.setAttribute('aria-pressed',expanded?'true':'false');
      button.setAttribute('aria-label',expanded?'Reducir visor':'Ampliar visor');
      button.title=expanded?'Reducir visor · Esc':'Ampliar visor';
      button.textContent=expanded?'↙':'⛶';
    }
    const hint=frame.querySelector('[data-cerebro-expanded-hint]');
    if(hint)hint.setAttribute('aria-hidden',expanded?'false':'true');
  }

  function ensureExpandedHint(address){
    let hint=address.querySelector('[data-cerebro-expanded-hint]');
    if(hint)return hint;
    hint=document.createElement('span');
    hint.dataset.cerebroExpandedHint='1';
    hint.className='cerebro-browser-expanded-hint';
    hint.setAttribute('aria-hidden','true');
    hint.textContent='ORDENES ACTIVAS · ESC PARA REDUCIR';
    address.appendChild(hint);
    return hint;
  }

  function ensureExpandButton(root){
    ensureWorkspaceStyles();
    const frame=root.querySelector('.cerebro-browser-frame');
    const address=frame?.querySelector('.cerebro-browser-address');
    if(!frame||!address)return;
    ensureExpandedHint(address);
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
    if(event.key==='Escape'&&frame?.classList.contains('cerebro-browser-frame--expanded')){
      event.preventDefault();
      event.stopPropagation();
      setExpanded(frame,false);
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
