import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const jarvis=read('src/CerebroJarvisWorkConsole.tsx');
const css=read('src/cerebro-jarvis-work.css');
const host=read('src/CerebroConsoleHost.tsx');
const nav=read('src/CerebroInterfaceBar.tsx');

assert.match(jarvis,/CerebroConsoleShell/,'Jarvis must reuse the existing Console/Gateway surface');
assert.match(jarvis,/fetchCerebroActivity/,'Jarvis may show activity only from the existing evidence API');
assert.doesNotMatch(jarvis,/HUMAN_REQUIRED/,'Jarvis wrapper must not manufacture a generic HUMAN_REQUIRED panel');
assert.doesNotMatch(jarvis,/FÉNIX · GENERAL/,'Jarvis wrapper must not hardcode company/context');
assert.doesNotMatch(jarvis,/<aside/,'Jarvis V1 must not restore permanent technical side rails');
assert.match(css,/cerebro-chat-cerebro strong:after\{content:"JARVIS"/,'Assistant messages must be visibly identified as JARVIS');
assert.match(css,/@media\(max-width:760px\)/,'Jarvis must retain a narrow viewport layout');
assert.match(host,/primaryView==='JARVIS'.*CerebroJarvisWorkConsole/s,'Host must route Jarvis through its isolated wrapper');
assert.match(host,/primaryView==='OPERATIVA'.*CerebroOperativeConsole/s,'Operativa route must remain independently mounted');
for(const label of ['Inicio','Jarvis','Operativa','Neuronal','Navegador'])assert.ok(nav.includes(label),`Primary navigation must retain ${label}`);

console.log('JARVIS_V1_CONTRACT_GREEN');
