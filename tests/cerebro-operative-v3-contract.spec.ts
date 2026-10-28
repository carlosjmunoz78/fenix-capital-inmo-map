import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('historical Operativa keeps one horizontal live process rail without fixed timelines as rollback reference',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const css=read('src/cerebro-operative-console-v2.css');
 expect(source).toContain('cerebro-process-strip');
 expect(source).toContain('cerebro-live-progress');
 expect(source).not.toContain('cerebro-process-route');
 expect(css).toContain('overflow-x:auto');
 expect(css).toContain('flex:0 0 268px');
});

test('JARVIS Work shows aliases and never invents a numeric progress value',async()=>{
 const source=read('src/CerebroJarvisWorkConsole.tsx');
 expect(source).toContain('compactAlias(run)');
 expect(source).toContain("run.progress_provenance!=='REAL_GITHUB_JOBS'");
 expect(source).toContain("run.status==='in_progress'?'LIVE':'—'");
 expect(source).toContain('No se inventan trabajos ni estados.');
});

test('shared JARVIS/OPERATIVA work inspector explains real work and links its evidence',async()=>{
 const source=read('src/CerebroJarvisWorkConsole.tsx');
 const css=read('src/cerebro-jarvis-work.css');
 expect(source).toContain('function processPurpose(run:CerebroActivityRun,surface:SurfaceName)');
 expect(source).toContain("type SurfaceName='JARVIS'|'OPERATIVA'");
 expect(source).toContain("surface==='OPERATIVA'?'OPERATIVA · CONTROL':'JARVIS · WORK'");
 expect(source).toContain('QUÉ ESTÁ HACIENDO');
 expect(source).toContain('PASO ACTUAL');
 expect(source).toContain('SIGUIENTE');
 expect(source).toContain('Abrir evidencia real');
 expect(css).toContain('.jarvis-work-inspector');
 expect(css).toContain('.jarvis-work-big-progress');
});

test('activity projection still exposes real GitHub job-step progress when authenticated',async()=>{
 const edge=read('supabase/functions/cerebro-console-activity-v0/index.ts');
 const api=read('src/cerebroActivityApi.ts');
 expect(edge).toContain('/jobs?per_page=100');
 expect(edge).toContain('REAL_GITHUB_JOBS');
 expect(edge).toContain('progress_completed_steps');
 expect(edge).toContain('workflow_alias');
 expect(api).toContain("progress_provenance:CerebroProgressProvenance");
});

test('/cerebro suppresses global launchers from the retained host stylesheet even before owner session is ready',async()=>{
 const css=read('src/cerebro-console-host.css');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(css).toContain("html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']");
 expect(css).toContain("html[data-cerebro-console='1'] .calc-launcher");
 expect(css).toContain("html[data-cerebro-console='1'] .f-offcanvas-trigger");
 expect(host).toContain("document.documentElement.dataset.cerebroConsole='1'");
 expect(host).toContain("if(ownerAccess!=='allowed')return <CerebroConsoleShell/>");
});

test('JARVIS Work mounts canonical V0 directly and stays mounted while Browser is visible',async()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 const work=read('src/CerebroJarvisWorkConsole.tsx');
 const shell=read('src/CerebroConsoleShell.tsx');
 const css=read('src/cerebro-jarvis-work.css');
 expect(host).toContain("import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';");
 expect(host).toContain('hidden={browser}');
 expect(host).toContain('className="cerebro-work-mount cerebro-host-v0"');
 expect(host).toContain('<CerebroJarvisWorkConsole');
 expect(host).not.toContain('CerebroOperativeConsole');
 expect(work).toContain("import CerebroConsoleShell from './CerebroConsoleShell';");
 expect(work).toContain('<CerebroConsoleShell/>');
 expect(work).not.toContain('querySelector');
 expect(work).not.toContain('MutationObserver');
 expect(shell).toContain('className="cerebro-voice-main"');
 expect(shell).toContain('postCerebroConsoleChat');
 expect(css).toContain('--jw-blue:#2c9cff');
 expect(css).toContain('--jw-cyan:#37d9ff');
 expect(css).toContain('grid-template-columns:280px minmax(0,1fr) 330px');
});

test('JARVIS Work exposes active history Factory and HUMAN_REQUIRED without fabricated alerts',async()=>{
 const source=read('src/CerebroJarvisWorkConsole.tsx');
 expect(source).toContain("type WorkFilter='ACTIVE'|'HISTORY'|'FACTORY'");
 expect(source).toContain('Activo');
 expect(source).toContain('Historial');
 expect(source).toContain('Fábrica');
 expect(source).toContain('HUMAN_REQUIRED');
 expect(source).toContain('Esta vista no fabrica alertas.');
});

test('canonical voice remains the only conversational voice implementation',async()=>{
 const work=read('src/CerebroJarvisWorkConsole.tsx');
 const shell=read('src/CerebroConsoleShell.tsx');
 expect(work).not.toContain('SpeechRecognition');
 expect(work).not.toContain('speechSynthesis');
 expect(shell).toContain('createVoiceRecognition');
 expect(shell).toContain('window.speechSynthesis.speak');
});

test('historical Operativa remains preserved as reference but is not mounted',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(source).toContain('aria-label="Adjuntar archivo"');
 expect(source).toContain('window.setInterval(()=>{void refresh()},30_000)');
 expect(host).not.toContain('<CerebroOperativeConsole');
});
