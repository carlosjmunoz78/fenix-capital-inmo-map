import fs from 'node:fs';
function read(path){return fs.readFileSync(path,'utf8')}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}
function mustNot(text,needle,label){if(text.includes(needle))throw new Error(`Forbidden ${label}: ${needle}`)}

const host=read('src/CerebroConsoleHost.tsx');
const bar=read('src/CerebroInterfaceBar.tsx');
const shell=read('src/CerebroConsoleShell.tsx');
const work=read('src/CerebroJarvisWorkConsole.tsx');
const neural=read('src/CerebroNeuralView.tsx');
const neuralLoader=read('public/cerebro-visual/candidate-v1425.html');
const workCss=read('src/cerebro-jarvis-work.css');
const technicalCss=read('src/cerebro-technical-surface.css');
const hostCss=read('src/cerebro-console-host.css');
const browser=read('src/CerebroBrowserConsole.tsx');
const route=read('src/RouteAccessGuard.tsx');

must(route,"import CerebroConsoleHost from './CerebroConsoleHost';",'SPA host route');
must(host,"type CerebroView=CerebroPrimaryView|'LEGACY'",'four-view host type');
must(host,"return'JARVIS'",'JARVIS default');
must(host,"section==='operativa'",'OPERATIVA route');
must(host,"section==='neuronal'",'neuronal route');
must(host,"section==='browser'",'browser route');
must(host,"section==='legacy-v0'",'legacy rollback');
must(host,'<CerebroInterfaceBar view={view} onViewChange={changeView}/>','shared bar');
must(host,'cerebro-jarvis-surface','independent JARVIS panel');
must(host,'cerebro-host-v0 cerebro-technical-surface','independent OPERATIVA canonical surface');
must(host,'<CerebroNeuralView/>','independent Neuronal panel');
must(host,'<CerebroBrowserConsole','independent Browser panel');

for(const label of ['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR','VOLVER A APP'])must(bar,label,`shared bar ${label}`);
mustNot(bar,'TÉCNICA','obsolete visible label');
must(bar,"navigate('/inicio')",'return to App');

must(work,'fetchCerebroActivity','JARVIS real work source');
must(work,"progress_provenance!=='REAL_GITHUB_JOBS'",'fail-closed JARVIS progress');
must(work,'No se inventan trabajos ni estados.','no fake work');
must(work,'Abrir evidencia real','real evidence');
must(work,'HUMAN_REQUIRED','human exception policy');
mustNot(work,"import CerebroConsoleShell",'JARVIS must not embed OPERATIVA console');
mustNot(work,'<CerebroConsoleShell','JARVIS must not render OPERATIVA console');
mustNot(work,'querySelector','JARVIS must not proxy OPERATIVA DOM');
must(workCss,'--jw-blue:#2c9cff','Browser blue language');
must(workCss,'grid-template-columns:280px minmax(0,1fr) 310px','Work layout');

must(shell,'postCerebroConsoleChat','canonical OPERATIVA Gateway chat');
must(shell,'className="cerebro-voice-main"','canonical OPERATIVA voice');
must(host,'<CerebroConsoleShell/>','canonical shell preserved');
must(technicalCss,'.cerebro-technical-surface .cerebro-console','OPERATIVA blue theme');
must(technicalCss,'#020a10','OPERATIVA dark blue background');

// NEURONAL remains fail-closed until the historical loader is replaced by governed real neuronal data.
must(neural,'/cerebro-visual/candidate-v1425.html','Neuronal candidate frame');
must(neuralLoader,'HISTORICAL_GITHUB_SHA','Neural historical provenance still detectable');

must(browser,"document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console')",'Browser canonical OPERATIVA dependency preserved');
must(hostCss,'.cerebro-browser-surface .cerebro-browser-header{display:none!important}','duplicate Browser header hidden under shared bar');
must(hostCss,"html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']",'global competing voice launcher suppressed');

console.log('CEREBRO UI4 exact surface contracts: OK; NEURONAL promotion remains separately gated');
