import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const fromRoot=relative=>fs.readFileSync(new URL('../../../'+relative,import.meta.url),'utf8');
const view=fromRoot('src/CerebroNeuralView.tsx');
const css=fromRoot('src/cerebro-neural-view.css');
const client=fromRoot('src/cerebroActivityApi.ts');
const gateway=fromRoot('api/cerebro-preview-gateway.ts');
const host=fromRoot('src/CerebroConsoleHost.tsx');

test('neuronal LAB uses only exact protected stable Preview alias; never silently falls back to direct production feed there',()=>{
 const stable='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects';
 assert.ok(client.includes(stable));assert.ok(gateway.includes(stable));assert.ok(host.includes(stable));
 assert.ok(!client.includes('fenix-capital-prep-git-326d86'));
 assert.match(client,/const endpoint=isPreview\?'\/api\/cerebro-preview-gateway\?resource=activity':activityEndpoint\(\)/);
 assert.match(client,/get\('visual_lab'\)==='cockpit-v3'/);
 assert.match(gateway,/if\(process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(gateway,/identity\?\.actor_code!=='CARLOS-ADMIN'/);
});
test('no phantom live jobs on telemetry errors, missing source or unsupported status',()=>{
 assert.match(view,/setRuns\(\[\]\);setSource\('UNAVAILABLE'\);setObservedAt\(''\)/);
 assert.match(view,/data\.source_status==='LIVE'\|\|data\.source_status==='CACHED'/);
 assert.match(view,/Array\.isArray\(data\.runs\)/);
 assert.match(view,/validSource\?running\.length:'—'/);
 assert.match(view,/source==='CACHED'\?'Última captura guardada/);
});
test('neuronal nodes are evidence-based, capped, Fénix-scoped and not invented',()=>{
 assert.match(view,/run\.company_id==='fenix'/);
 assert.match(view,/Number\.isSafeInteger\(run\.run_id\)/);
 assert.match(view,/\.slice\(0,12\)/);
 assert.match(view,/nodes\.map\(/);
 assert.match(view,/No se generan nodos ficticios/);
 assert.match(view,/GitHub Actions no certifica por sí mismo/);
 assert.ok(!view.includes('staging.fenixcapital.es/wp-json'));
});
test('selected node links cannot become arbitrary external URLs',()=>{
 assert.match(view,/url\.hostname==='github\.com'/);
 assert.match(view,/\/actions\/runs\/'\+run\.run_id/);
 assert.match(view,/safeGithubRunUrl\(selected\.run\)/);
 assert.match(view,/rel="noopener noreferrer"/);
});
test('neural energy treatment is accessible and honest',()=>{
 assert.match(view,/aria-pressed=\{selectedId===run\.run_id\}/);
 assert.match(view,/aria-label="Actualizar actividad"/);
 assert.match(view,/onClick=\{\(\)=>setAnimated/);
 assert.match(view,/Aprendizaje no acreditada|Autonomía no acreditada/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/button:focus-visible/);
 assert.match(css,/neural-frag-a/);
 assert.match(css,/neural-frag-b/);
 assert.match(css,/neural-frag-c/);
});
test('no production writes or staging probes introduced by neural view',()=>{
 assert.ok(!view.includes("from './supabase'"));
 assert.ok(!view.includes('service_role'));
 assert.ok(!view.includes('net.http_get'));
 assert.ok(!view.includes('fetch('));
 assert.ok(!view.includes('submit_command'));
 const vercel=JSON.parse(fromRoot('vercel.json'));
 assert.equal(vercel.git.deploymentEnabled,false);
});
