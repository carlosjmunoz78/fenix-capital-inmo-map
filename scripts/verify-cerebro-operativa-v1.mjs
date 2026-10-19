import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const operative=read('src/CerebroOperativeConsole.tsx');
const route=read('src/RouteAccessGuard.tsx');
const css=read('src/cerebro-console-host.css');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'reversible host route');
must(route,'return <CerebroConsoleHost/>;','host mount');
must(host,"return'OPERATIVA'",'OPERATIVA default');
must(host,'<CerebroConsoleShell/>','preserved V0 core');
must(host,"view==='V0'?'is-visible':'is-hidden'",'reversible V0 visibility');
must(host,'NEURAL · POR AUDITAR','neural recovery gate');
must(css,'.cerebro-host-v0.is-hidden','V0 hidden-but-mounted wrapper');
must(operative,'Sin datos ficticios','reality contract');
must(operative,'Sin métrica fiable','no fake progress contract');
must(operative,'REAL · orden observada','REAL provenance');
must(operative,'DERIVED · evento observado','DERIVED provenance');
must(operative,'x-cerebro','',);
mustNot(operative,'68%','reference demo percentage');
mustNot(operative,'80%','reference demo percentage');
mustNot(operative,'60%','reference demo percentage');
mustNot(operative,'45%','reference demo percentage');
mustNot(operative,'70%','reference demo percentage');
mustNot(operative,'90%','reference demo percentage');

console.log('CEREBRO OPERATIVA V1 contracts: OK');
