import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const shell=read('src/CerebroConsoleShell.tsx');
const operative=read('src/CerebroOperativeConsole.tsx');
const route=read('src/RouteAccessGuard.tsx');
const css=read('src/cerebro-console-host.css');
const cssV2=read('src/cerebro-operative-console-v2.css');
const activityApi=read('src/cerebroActivityApi.ts');
const activityGateway=read('supabase/functions/cerebro-console-activity-v0/index.ts');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'reversible host route');
must(route,'return <CerebroConsoleHost/>;','host mount');
must(host,"return'OPERATIVA'",'JARVIS/default compatibility view');
must(host,'<CerebroConsoleShell/>','canonical V0 core mounted directly');
must(host,"const jarvis=view==='OPERATIVA'",'JARVIS presentation selector');
must(host,"const browser=view==='NAVEGADOR'",'browser selector');
must(host,"${browser?'is-hidden':'is-visible'} ${jarvis?'cerebro-jarvis-shell':''}",'V0 visible as JARVIS and hidden only for Browser');
must(host,"if(section==='legacy-v0')return'V0'",'legacy V0 rollback route');
mustNot(host,'CerebroOperativeConsole','parallel Operativa console must not be mounted by host');
must(css,'.cerebro-host-v0.is-hidden','Browser hidden-but-mounted V0 wrapper');
must(css,'.cerebro-jarvis-shell .cerebro-console','JARVIS styles wrap canonical V0');
must(css,'JARVIS · NÚCLEO CEREBRO V0','explicit JARVIS-on-V0 provenance');
must(css,'.cerebro-host-topbar{position:sticky','rollback console chrome');

must(shell,'postCerebroConsoleChat','canonical Gateway chat client');
must(shell,'className="cerebro-voice-main"','canonical voice control');
must(shell,'onClick={toggleVoiceSession}','direct V0 voice session control');
must(shell,"voiceSessionActive?'Finalizar conversación':'Hablar con CEREBRO'",'continuous voice UI');
must(shell,'Decisión humana por excepción','human-by-exception policy visible');

// Preserve the previous Operativa implementation and its real-data contracts as rollback/reference code,
// but it must no longer be the visible JARVIS surface.
must(operative,'fetchCerebroActivity','real activity projection client preserved');
must(operative,'cerebro-process-strip','single horizontal process rail preserved');
must(operative,'cerebro-live-progress','live process progress bar preserved');
must(operative,'compactAlias(run)','compact process aliases preserved');
must(operative,"run.progress_provenance!=='REAL_GITHUB_JOBS'",'ETA only derives from real GitHub steps');
must(operative,"progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'",'fail-closed progress display');
mustNot(operative,'cerebro-process-route','fixed phase timeline removed');
mustNot(operative,"['En cola','En ejecución'",'fixed phase labels removed');

must(cssV2,"html[data-cerebro-console='1'] .ops-mobile-menu-button",'CEREBRO-only mobile chrome suppression preserved');
must(cssV2,"html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']",'CEREBRO-only floating voice launcher suppression preserved');
must(cssV2,'.cerebro-process-strip{display:flex','horizontal rail layout preserved');
must(cssV2,'overflow-x:auto','horizontal scroll contract preserved');

must(activityApi,'cerebro-console-activity-v0','activity gateway endpoint preserved');
must(activityApi,"progress_provenance:CerebroProgressProvenance",'typed progress provenance');
must(activityGateway,'source:"GITHUB_ACTIONS"','real source declaration');
must(activityGateway,'company_provenance:"DERIVED_REPOSITORY_SCOPE"','derived company provenance');
must(activityGateway,'https://api.github.com/repos/','public zero-cost activity source');
must(activityGateway,'/jobs?per_page=100','GitHub jobs step projection');
must(activityGateway,'REAL_GITHUB_JOBS','real step-level progress provenance');
must(activityGateway,'workflow_alias','compact alias projection');

mustNot(operative,'68%','reference demo percentage');
mustNot(operative,'80%','reference demo percentage');
mustNot(operative,'60%','reference demo percentage');
mustNot(operative,'45%','reference demo percentage');
mustNot(operative,'70%','reference demo percentage');
mustNot(operative,'90%','reference demo percentage');

console.log('CEREBRO JARVIS-on-V0 contracts: OK');
