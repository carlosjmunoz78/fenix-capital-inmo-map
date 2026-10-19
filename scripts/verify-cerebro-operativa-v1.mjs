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
must(operative,'Sin datos ficticios','reality contract');
must(operative,'Sin % fiable','no fake progress contract');
must(operative,'Estimación aún no disponible','no fake ETA contract');
must(operative,'REAL · orden observada','REAL conversational provenance');
must(operative,'DERIVED · evento observado','DERIVED conversational provenance');
must(operative,'fetchCerebroActivity','real activity projection client');
must(operative,'Dictar','separate dictation control');
must(operative,'Hablar con CEREBRO','separate voice conversation control');
must(operative,"event.key==='Enter'&&!event.shiftKey",'Enter send Shift+Enter newline contract');
must(operative,'Adjuntar archivo · POR AUDITAR: todavía no existe contrato real de subida','attachments fail-closed');
mustNot(operative,'cerebro-composer-actions">','legacy extra composer action row');
must(cssV2,"html[data-cerebro-console='1'] .ops-mobile-menu-button",'CEREBRO-only mobile chrome suppression');
must(activityApi,'cerebro-console-activity-v0','activity gateway endpoint');
must(activityGateway,'source:"GITHUB_ACTIONS"','real source declaration');
must(activityGateway,'company_provenance:"DERIVED_REPOSITORY_SCOPE"','derived company provenance');
must(activityGateway,'https://api.github.com/repos/','public zero-cost activity source');
mustNot(operative,'68%','reference demo percentage');
mustNot(operative,'80%','reference demo percentage');
mustNot(operative,'60%','reference demo percentage');
mustNot(operative,'45%','reference demo percentage');
mustNot(operative,'70%','reference demo percentage');
mustNot(operative,'90%','reference demo percentage');

console.log('CEREBRO OPERATIVA V2 contracts: OK');
