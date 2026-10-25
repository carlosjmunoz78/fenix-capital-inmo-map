(()=>{
  if(window.__CEREBRO_BROWSER_ERGONOMICS_V1__)return;
  window.__CEREBRO_BROWSER_ERGONOMICS_V1__=true;

  const BATCH_MS=85;
  const MAX_DELTA=900;
  const wheelState=new WeakMap();

  const clamp=value=>Math.max(-MAX_DELTA,Math.min(MAX_DELTA,value));
  const getBrowserRoot=()=>document.querySelector('.cerebro-browser-console');

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
      button.setAttribute('aria-label',expanded?'Salir del visor ampliado':'Ampliar visor');
      button.title=expanded?'Salir del visor ampliado':'Ampliar visor';
      button.textContent=expanded?'✕':'⛶';
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
    if(event.key==='Escape'&&frame?.classList.contains('cerebro-browser-frame--expanded')&&event.shiftKey){
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