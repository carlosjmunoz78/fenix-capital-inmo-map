import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const operative=read('src/CerebroOperativeConsole.tsx');
const route=read('src/RouteAccessGuard.tsx');
const css=read('src/cerebro-console-host.css');
const cssV2=read('src/cerebro-operative-console-v2.css');
const activityApi=read('src/cerebroActivityApi.ts');
const activityGateway=read('supabase/functions/cerebro-console-activity-v0/index.ts');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'reversible host route');
must(route,'return <CerebroConsoleHost/>;','host mount');
must(host,"return'OPERATIVA'",'OPERATIVA default');
must(host,'<CerebroConsoleShell/>','preserved V0 core');
must(host,"view==='V0'?'is-visible':'is-hidden'",'reversible V0 visibility');
must(host,'NEURAL · POR AUDITAR','neural recovery gate');
must(host,'cerebro-host-topbar','integrated interface selector');
must(css,'.cerebro-host-v0.is-hidden','V0 hidden-but-mounted wrapper');
must(css,'.cerebro-host-topbar{position:sticky','non-floating fixed console chrome');

must(operative,'fetchCerebroActivity','real activity projection client');
must(operative,'cerebro-process-strip','single horizontal process rail');
must(operative,'cerebro-live-progress','live process progress bar');
must(operative,'compactAlias(run)','compact process aliases');
must(operative,"run.progress_provenance!=='REAL_GITHUB_JOBS'",'ETA only derives from real GitHub steps');
must(operative,"progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'",'fail-closed progress display');
mustNot(operative,'cerebro-process-route','fixed phase timeline removed');
mustNot(operative,"['En cola','En ejecución'",'fixed phase labels removed');

must(operative,'Dictar','separate dictation control');
must(operative,'Hablar con CEREBRO','separate voice conversation control');
must(operative,"event.key==='Enter'&&!event.shiftKey",'Enter send Shift+Enter newline contract');
must(operative,'Adjuntar archivo · pendiente de contrato real','attachments fail-closed');
mustNot(operative,'cerebro-composer-actions">','legacy extra composer action row');

must(cssV2,"html[data-cerebro-console='1'] .ops-mobile-menu-button",'CEREBRO-only mobile chrome suppression');
must(cssV2,"html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']",'CEREBRO-only floating voice launcher suppression');
must(cssV2,'.cerebro-process-strip{display:flex','horizontal rail layout');
must(cssV2,'overflow-x:auto','horizontal scroll contract');

must(activityApi,'cerebro-console-activity-v0','activity gateway endpoint');
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

console.log('CEREBRO OPERATIVA V3 contracts: OK');
