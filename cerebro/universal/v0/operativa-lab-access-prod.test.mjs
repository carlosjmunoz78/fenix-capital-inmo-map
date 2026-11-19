import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('../../../src/CerebroOperativeCockpitV3.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../../../src/cerebro-operative-cockpit-v3.css',import.meta.url),'utf8');
test('lab access is explicit and isolated from PROD',()=>{
 assert.match(file,/Mandos reales de LAB/);
 assert.match(file,/company==='fenix'&&scopeCanExecute/);
 assert.match(file,/target="_blank" rel="noopener noreferrer"/);
 assert.match(file,/href="https:\/\/fenix-capital-preprod-operativa\.vercel\.app\/cerebro\?section=operativa&op3_panel=motores"/);
 assert.doesNotMatch(file,/\/api\/cerebro-operativa-controls/);
});
test('deep links allow specified panels only',()=>{
 assert.match(file,/p\.get\('section'\)==='operativa'\?p\.get\('op3_panel'\):null/);
 assert.match(file,/\['resumen','entidades','proyectos','motores','agentes','trabajos','evidencias','decisiones'\]/);
});
test('controls are not injected into production rendering',()=>{
 assert.doesNotMatch(file,/import CerebroOperativaControlsLab/);
 assert.match(file,/aria-label="Acceso a mandos diagnósticos LAB"/);
 assert.match(css,/\.op3-lab-access\{/);
});
