import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import CerebroOperativeConsole from '../src/CerebroOperativeConsole';
import '../src/cerebro-operative-console-v2.css';
import '../src/cerebro-operative-console-v3.css';
import '../src/cerebro-operative-console-v3-fixes.css';

const source=document.createElement('div');
source.className='cerebro-host-v0';
source.setAttribute('aria-hidden','true');
source.style.display='none';
source.innerHTML=`
  <div class="cerebro-console">
    <section class="cerebro-panel"><h2>Transporte autenticado verificado</h2><p>QA visual aislada: shell técnico preparado.</p></section>
    <div class="cerebro-chat-line cerebro-chat-user"><strong>CARLOS</strong> Supervisa FACT-001 y enséñame la evidencia.</div>
    <div class="cerebro-chat-line cerebro-chat-cerebro"><strong>CEREBRO</strong> FACT-001 está en PREPROD; mostraré solo evidencia disponible.</div>
    <form class="cerebro-chat-form"><textarea aria-label="QA hidden composer"></textarea><button type="submit">Enviar</button></form>
    <button type="button" class="cerebro-voice-main" aria-pressed="false">Voz</button>
    <div class="cerebro-voice-status">Listo</div>
  </div>`;
document.body.appendChild(source);

const qaMark=document.createElement('div');
qaMark.id='cerebro-visual-qa-mark';
qaMark.textContent='QA VISUAL · SINTÉTICO · PREPROD · NO PROD';
Object.assign(qaMark.style,{
  position:'fixed',right:'12px',bottom:'82px',zIndex:'9999',
  padding:'4px 9px',font:'700 9px/1.35 ui-monospace,monospace',letterSpacing:'.06em',
  color:'#051419',background:'rgba(246,211,74,.9)',borderRadius:'8px',pointerEvents:'none',
  boxShadow:'0 6px 18px rgba(0,0,0,.28)'
});
document.body.appendChild(qaMark);

const root=document.createElement('div');
root.id='root';
document.body.appendChild(root);

createRoot(root).render(
  <StrictMode>
    <CerebroOperativeConsole onViewChange={(view)=>{document.documentElement.dataset.qaRequestedView=view}}/>
  </StrictMode>
);
