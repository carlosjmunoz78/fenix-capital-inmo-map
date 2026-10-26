import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const shell=read('src/CerebroConsoleShell.tsx');
const work=read('src/CerebroJarvisWorkConsole.tsx');
const workCss=read('src/cerebro-jarvis-work.css');
const operative=read('src/CerebroOperativeConsole.tsx');
const route=read('src/RouteAccessGuard.tsx');
const hostCss=read('src/cerebro-console-host.css');
const activityApi=read('src/cerebroActivityApi.ts');
const activityGateway=read('supabase/functions/cerebro-console-activity-v0/index.ts');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'reversible host route');
must(route,'return <CerebroConsoleHost/>;','host mount');
must(host,"return'OPERATIVA'",'JARVIS Work default view');
must(host,"import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';",'Work surface import');
must(host,'<CerebroJarvisWorkConsole','Work surface mount');
must(host,'hidden={browser}','Work stays mounted while Browser is visible');
must(host,'className="cerebro-work-mount cerebro-host-v0"','Browser retains canonical V0 host contract around Work');
must(host,"if(section==='legacy-v0')return'V0'",'legacy V0 rollback route');
must(host,'<div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div>','legacy canonical V0 rollback');
mustNot(host,'CerebroOperativeConsole','parallel Operativa console must not be mounted by host');

must(work,"import CerebroConsoleShell from './CerebroConsoleShell';",'canonical V0 core inside Work');
must(work,'<CerebroConsoleShell/>','canonical V0 rendered directly in Work');
must(work,'fetchCerebroActivity','real activity source consumed directly');
must(work,"progress_provenance!=='REAL_GITHUB_JOBS'",'fail-closed numeric progress');
must(work,"No se inventan trabajos ni estados.",'explicit no-fake-work empty state');
must(work,'Abrir evidencia real','real evidence inspector');
must(work,'HUMAN_REQUIRED','human exception surface');
must(work,'Esta vista no fabrica alertas.','no fake human alerts');
must(work,'Fábrica','Factory work filter');
mustNot(work,'querySelector','Work must not proxy the canonical V0 through DOM selectors');
mustNot(work,'MutationObserver','Work must not inspect hidden V0 DOM');

must(workCss,'--jw-bg:#020a10','blue Browser-compatible background token');
must(workCss,'--jw-blue:#2c9cff','blue Browser-compatible action token');
must(workCss,'--jw-cyan:#37d9ff','cyan Browser-compatible highlight token');
must(workCss,'grid-template-columns:280px minmax(0,1fr) 330px','three-zone Work layout');
must(workCss,'.jarvis-work-core-shell .cerebro-console','Work presentation wraps canonical V0 directly');
must(workCss,'.jarvis-work-list','real work rail');
must(workCss,'.jarvis-work-inspector','evidence inspector');

must(hostCss,"html[data-cerebro-console='1'] .ops-mobile-menu-button",'CEREBRO global App launcher isolation');
must(hostCss,"html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']",'competing global voice launcher suppressed');
must(hostCss,'.cerebro-host-topbar{position:sticky','rollback console chrome');

must(shell,'postCerebroConsoleChat','canonical Gateway chat client');
must(shell,'className="cerebro-voice-main"','canonical voice control');
must(shell,'onClick={toggleVoiceSession}','direct V0 voice session control');
must(shell,"voiceSessionActive?'Finalizar conversación':'Hablar con CEREBRO'",'continuous voice UI');
must(shell,'Decisión humana por excepción','human-by-exception policy visible');

// Historical Operativa remains reference/rollback code only; never visible JARVIS.
must(operative,'fetchCerebroActivity','historical real activity implementation preserved');
mustNot(host,'<CerebroOperativeConsole','historical proxy not mounted');

must(activityApi,'cerebro-console-activity-v0','activity gateway endpoint preserved');
must(activityApi,"progress_provenance:CerebroProgressProvenance",'typed progress provenance');
must(activityGateway,'source:"GITHUB_ACTIONS"','real source declaration');
must(activityGateway,'company_provenance:"DERIVED_REPOSITORY_SCOPE"','derived company provenance');
must(activityGateway,'https://api.github.com/repos/','public zero-cost activity source');
must(activityGateway,'/jobs?per_page=100','GitHub jobs step projection');
must(activityGateway,'REAL_GITHUB_JOBS','real step-level progress provenance');

console.log('CEREBRO JARVIS Work blue contracts: OK');
