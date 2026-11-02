import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const shell=read('src/CerebroConsoleShell.tsx');
const jarvis=read('src/CerebroJarvisWorkConsole.tsx');
const operative=read('src/CerebroOperativeConsole.tsx');
const operativeCss=read('src/cerebro-operative-console.css');
const isolationCss=read('src/cerebro-route-isolation-v2.css');
const attachment=read('src/CerebroAttachmentBridge.tsx');
const route=read('src/RouteAccessGuard.tsx');
const hostCss=read('src/cerebro-console-host.css');
const activityApi=read('src/cerebroActivityApi.ts');
const activityGateway=read('supabase/functions/cerebro-console-activity-v0/index.ts');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'reversible host route');
must(route,'return <CerebroConsoleHost/>;','host mount');
must(host,"import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';",'Jarvis surface import');
must(host,"import CerebroOperativeConsole from './CerebroOperativeConsole';",'Operativa surface import');
must(host,"primaryView==='JARVIS'?",'Jarvis view routing');
must(host,"primaryView==='OPERATIVA'?",'Operativa view routing');
must(host,'<CerebroJarvisWorkConsole surface="JARVIS"/>','Jarvis dedicated mount');
must(host,'<CerebroOperativeConsole/>','Operativa dedicated mount');
must(host,"if(section==='legacy-v0')return'V0'",'legacy V0 rollback route');
must(host,'<div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div>','legacy canonical V0 rollback');
must(host,"document.documentElement.dataset.cerebroConsole='1'",'route isolation marker');

// Jarvis remains intact and keeps the canonical core available on its own surface.
must(jarvis,"import CerebroConsoleShell from './CerebroConsoleShell';",'canonical V0 core inside Jarvis');
must(jarvis,'<CerebroConsoleShell/>','canonical V0 rendered in Jarvis');
must(jarvis,'fetchCerebroActivity','real activity source retained in Jarvis');

// Operativa is now a dedicated executive surface but still consumes only real activity provenance.
must(operative,'fetchCerebroActivity','real activity source consumed by Operativa');
must(operative,"progress_provenance!=='REAL_GITHUB_JOBS'",'fail-closed numeric progress');
must(operative,'No voy a inventar trabajos ni porcentajes.','explicit no-fake-work empty state');
must(operative,'Fénix Capital','human company selector');
must(operative,'CAPTACASA','multi-company selector');
must(operative,"type PowerMode='Suave'|'Normal'|'Alto'|'Máximo'",'human power control');
must(operative,'Mantén todas las protecciones, no generes gasto no autorizado','power policy guard');
must(operative,'className="operativa-jarvis-composer"','global Jarvis composer');
must(operative,'aria-label="Añadir archivo"','attachment control');
must(operative,'aria-label="Mensaje para Jarvis"','empty Jarvis composer textarea');
mustNot(operative,'placeholder=','Operativa composer must stay visually empty');
must(operative,'createVoiceRecognition','dictation uses canonical voice helper');
must(operative,"querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main')",'voice delegates to canonical voice session');
must(operative,'<CerebroConsoleShell/>','canonical gateway and voice core preserved behind Operativa');
must(operative,'Para ti','human decision surface');
must(operative,'Lo siguiente','next-work surface');
must(operative,'Resultado reciente','result surface');

must(operativeCss,'.operativa-command-deck','executive command deck');
must(operativeCss,'.operativa-reactor','power reactor');
must(operativeCss,'.operativa-work-row','clean work rows');
must(operativeCss,'.operativa-jarvis-composer','floating Jarvis composer');
must(operativeCss,'.operativa-inspector','progressive detail inspector');
must(operativeCss,'@media(prefers-reduced-motion:reduce)','reduced-motion accessibility');
mustNot(operativeCss,'grid-template-columns:280px minmax(0,1fr) 330px','old technical three-column layout removed from Operativa');

must(isolationCss,"html[data-cerebro-console='1'] button[aria-label='Abrir chat interno']",'private chat launcher isolated on /cerebro');
must(hostCss,"html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']",'competing global voice launcher suppressed');
must(hostCss,"html[data-cerebro-console='1'] .calc-launcher",'global calculator launcher suppressed');

must(attachment,".operativa-jarvis-composer",'attachment bridge targets Operativa');
must(attachment,"textarea[aria-label=\"Mensaje para Jarvis\"]",'attachment bridge targets Jarvis composer');
must(attachment,'extractCerebroAttachment','existing local/private extractor reused');

must(shell,'postCerebroConsoleChat','canonical Gateway chat client');
must(shell,'className="cerebro-voice-main"','canonical voice control');
must(shell,'onClick={toggleVoiceSession}','canonical continuous voice control');

must(activityApi,'cerebro-console-activity-v0','activity gateway endpoint preserved');
must(activityApi,"progress_provenance:CerebroProgressProvenance",'typed progress provenance');
must(activityGateway,'source:"GITHUB_ACTIONS"','real source declaration');
must(activityGateway,'company_provenance:"DERIVED_REPOSITORY_SCOPE"','derived company provenance');
must(activityGateway,'https://api.github.com/repos/','public zero-cost activity source');
must(activityGateway,'/jobs?per_page=100','GitHub jobs step projection');
must(activityGateway,'REAL_GITHUB_JOBS','real step-level progress provenance');

console.log('Operativa premium separation contracts: OK');
