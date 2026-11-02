(()=>{
  const cleanPath=location.pathname.replace(/\/+$/,'')||'/';
  const params=new URLSearchParams(location.search);
  if(cleanPath!=='/cerebro'||(params.get('section')&&params.get('section')!=='operativa')) return;
  const FLAG='operativaV4LiveMounted';
  if(document.documentElement.dataset[FLAG]==='1') return;
  const byText=(root,text)=>[...root.querySelectorAll('button')].find(b=>(b.textContent||'').trim()===text);
  const nativeSet=(el,value)=>{const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;setter?setter.call(el,value):el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
  const toast=(msg)=>{let t=document.querySelector('.op4-toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2200)};
  const findCore=()=>document.querySelector('main[aria-label="CEREBRO JARVIS Work"]');
  const readNumber=(txt,pattern)=>{const m=txt.match(pattern);return m?Number(m[1]):0};
  const mount=()=>{
    const core=findCore();
    if(!core) return false;
    if(document.body.innerText.includes('Acceso seguro')) return false;
    document.documentElement.dataset[FLAG]='1';
    document.title='Fénix Capital · Operativa';
    const sourceText=core.innerText||'';
    const active=readNumber(sourceText,/(\d+)\s+en curso/i)||readNumber(sourceText,/(\d+)\s+trabajando/i);
    const queued=readNumber(sourceText,/(\d+)\s+en cola/i);
    const oldTextarea=core.querySelector('textarea')||core.querySelector('input[placeholder*="CEREBRO"]');
    const oldSend=byText(core,'Enviar');
    const oldVoice=byText(core,'Hablar con CEREBRO');
    const oldSelect=core.querySelector('select');
    const oldLauncher=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Abrir chat interno');
    core.style.display='none';core.setAttribute('aria-hidden','true');if(oldLauncher)oldLauncher.style.display='none';
    const shell=document.createElement('main');shell.id='operativa-v4-live';shell.setAttribute('aria-label','Operativa');
    const activityLabel=active>0?`${active} trabajo${active===1?'':'s'} avanzando`:queued>0?`${queued} trabajo${queued===1?'':'s'} esperando`:'Sin trabajos activos';
    const summary=active>0?'Hay actividad real en curso.':queued>0?'Hay trabajo real esperando turno.':'No hay actividad real que mostrar ahora mismo.';
    shell.innerHTML=`
      <div class="op4-grid" aria-hidden="true"></div>
      <header class="op4-topbar"><nav class="op4-nav" aria-label="Interfaces"><button data-go="/inicio">Inicio</button><button data-go="/cerebro?section=jarvis">Jarvis</button><button class="is-active" aria-pressed="true">Operativa</button><button data-go="/cerebro?section=neuronal">Neuronal</button><button data-go="/cerebro?section=browser">Navegador</button></nav></header>
      <section class="op4-context"><div class="op4-selects"><label><span style="position:absolute;left:-9999px">Empresa</span><select id="op4-company" aria-label="Empresa"><option>Fénix Capital</option><option disabled>AION · pendiente de conexión</option><option disabled>CAPTACASA · pendiente de conexión</option></select></label><span class="op4-slash">/</span><button class="op4-project" type="button">General</button></div><div class="op4-live"><i></i>Sesión autenticada</div></section>
      <section class="op4-deck"><div><div class="op4-eyebrow"><span>Ahora</span><div class="op4-views"><button class="is-active">Ahora</button><button>Hoy</button><button>Esta noche</button><button>Próximamente</button><button>Terminado</button></div></div><h1>${active||queued?'Trabajo en marcha.':'Todo preparado.'}</h1><div class="op4-summary"><span class="op4-summary-orb ${active>0?'is-active':''}"></span><div><strong>${activityLabel}</strong><p>${summary}</p></div></div><div class="op4-modes"><button data-command="Trabaja en modo concentración y prioriza solo lo importante.">Concentración</button><button data-command="Esta noche prioriza el trabajo pendiente sin publicar nada sensible sin los controles necesarios.">Esta noche</button><button data-command="Activa modo emergencia solo para incidencias críticas y conserva todas las protecciones.">Emergencia</button></div></div>
      <div class="op4-reactor"><span>Potencia</span><div class="op4-reactor-shell"><i></i><b></b><em></em></div><div class="op4-power"><button data-power="suave">Suave</button><button class="is-active" data-power="normal">Normal</button><button data-power="alto">Alto</button><button data-power="máximo">Máximo</button></div></div></section>
      <section class="op4-stage"><div><div class="op4-section-head"><div><span class="op4-kicker">Trabajo</span><h2>En marcha</h2></div><small>Datos de la sesión real</small></div><div id="op4-work"></div></div><aside class="op4-side"><section><div class="op4-side-title"><span>Para ti</span><b>0</b></div><h3>No necesitas intervenir</h3><p>Solo aparecerá aquí una excepción humana real cuando esté conectada a esta vista.</p></section><section><div class="op4-side-title"><span>Lo siguiente</span><b>→</b></div><h3>Seguir mejorando Operativa</h3><p>Esta vista usa la sesión real y conserva el núcleo anterior debajo para rollback.</p></section><section><div class="op4-side-title"><span>Estado</span><b>✓</b></div><h3>Canary visual en PROD</h3><p>Sin datos inventados. La conversación reutiliza el transporte autenticado existente.</p></section></aside></section>
      <div class="op4-dock"><button class="op4-attach" type="button" disabled aria-label="Añadir archivo" title="Adjuntos pendientes de la integración completa">＋</button><textarea id="op4-message" rows="1" aria-label="Mensaje para Jarvis"></textarea><button type="button" disabled aria-label="Dictar" title="Dictado pendiente de integración">⌁</button><button class="op4-voice" type="button" aria-label="Hablar con Jarvis">◉</button><button class="op4-send" type="button" aria-label="Enviar">➤</button></div><div class="op4-toast" role="status"></div>`;
    core.parentElement?.insertBefore(shell,core.nextSibling);
    const work=shell.querySelector('#op4-work');
    if(active>0||queued>0){work.innerHTML=`<article class="op4-work-row"><div class="op4-work-line"><i></i><div><strong>Actividad real detectada</strong><small>${active} en curso · ${queued} en cola</small></div><em>${active>0?'Trabajando ahora':'Esperando turno'}</em></div></article>`}else{work.innerHTML='<div class="op4-empty"><i></i><strong>Sin trabajos activos</strong><span>No se inventan trabajos ni estados.</span></div>'}
    shell.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{location.href=b.dataset.go}));
    const sendCommand=(text)=>{if(!oldTextarea||!oldSend){toast('La conversación real no está disponible en esta sesión.');return}nativeSet(oldTextarea,text);oldSend.click();toast('Orden enviada a Jarvis.');};
    shell.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>sendCommand(b.dataset.command)));
    shell.querySelectorAll('[data-power]').forEach(b=>b.addEventListener('click',()=>{shell.querySelectorAll('[data-power]').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');sendCommand(`Pon la potencia de trabajo en nivel ${b.dataset.power}, sin saltarte seguridad, permisos ni límites de coste.`)}));
    const msg=shell.querySelector('#op4-message'),send=shell.querySelector('.op4-send');
    const sendMessage=()=>{const text=msg.value.trim();if(!text)return;if(!oldTextarea||!oldSend){toast('La conversación real no está disponible en esta sesión.');return}nativeSet(oldTextarea,text);oldSend.click();msg.value='';toast('Mensaje enviado a Jarvis.');};
    send.addEventListener('click',sendMessage);msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
    const voice=shell.querySelector('.op4-voice');voice.disabled=!oldVoice;voice.addEventListener('click',()=>{if(oldVoice){oldVoice.click();toast('Conversación por voz activada desde el control real.')}});
    if(oldSelect){const opt=[...oldSelect.options].find(o=>/Fénix/i.test(o.text));if(opt)shell.querySelector('#op4-company').value='Fénix Capital'}
    return true;
  };
  if(mount())return;
  const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>observer.disconnect(),20000);
})();
