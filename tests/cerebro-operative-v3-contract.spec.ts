import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('CEREBRO V4 keeps one horizontal live process rail without fixed timelines',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const css=read('src/cerebro-operative-console-v2.css');
 expect(source).toContain('cerebro-process-strip');
 expect(source).toContain('cerebro-live-progress');
 expect(source).not.toContain('cerebro-process-route');
 expect(css).toContain('overflow-x:auto');
 expect(css).toContain('flex:0 0 268px');
});

test('CEREBRO V4 shows aliases and never invents a numeric progress value',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('compactAlias(run)');
 expect(source).toContain("run.progress_provenance!=='REAL_GITHUB_JOBS'");
 expect(source).toContain("isIndeterminate=ACTIVE_STATUSES.has(run.status)&&progress===null");
 expect(source).toContain("progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'");
 expect(source).toContain("'Estimación aún no disponible'");
});

test('each real process opens a transparent inspector explaining what it does',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const css=read('src/cerebro-operative-console-v2.css');
 expect(source).toContain('function processPurpose(run:CerebroActivityRun)');
 expect(source).toContain('Toca para saber qué hace');
 expect(source).toContain('cerebro-process-inspector');
 expect(source).toContain('¿Para qué sirve?');
 expect(source).toContain('Ver evidencia');
 expect(css).toContain('.cerebro-process-inspector');
 expect(css).toContain('backdrop-filter:blur(28px)');
});

test('activity projection exposes real GitHub job-step progress when authenticated',async()=>{
 const edge=read('supabase/functions/cerebro-console-activity-v0/index.ts');
 const api=read('src/cerebroActivityApi.ts');
 expect(edge).toContain('/jobs?per_page=100');
 expect(edge).toContain('REAL_GITHUB_JOBS');
 expect(edge).toContain('progress_completed_steps');
 expect(edge).toContain('workflow_alias');
 expect(api).toContain("progress_provenance:CerebroProgressProvenance");
});

test('/cerebro suppresses global launchers even before owner session is ready',async()=>{
 const css=read('src/cerebro-operative-console-v2.css');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(css).toContain("html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']");
 expect(css).toContain("html[data-cerebro-console='1'] .calc-launcher");
 expect(css).toContain("html[data-cerebro-console='1'] .f-offcanvas-trigger");
 expect(host).toContain("document.documentElement.dataset.cerebroConsole='1'");
 expect(host).toContain("if(ownerAccess!=='allowed')return <CerebroConsoleShell/>");
});

test('OPERATIVA integrates view switch and settings into one compact header',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(source).toContain('cerebro-inline-view-switch');
 expect(source).toContain('<CerebroVoiceSettings/>');
 expect(source).not.toContain('cerebro-top-metrics');
 expect(host).toContain("view==='V0'?<div className=\"cerebro-host-topbar\"");
 expect(host).toContain('<CerebroOperativeConsole onViewChange={setView}/>');
});

test('composer keeps attach dictation talk send and Enter semantics',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('aria-label="Adjuntar archivo"');
 expect(source).toContain("aria-label={dictating?'Detener dictado':'Dictar'}");
 expect(source).toContain("'Hablar con CEREBRO'");
 expect(source).toContain("event.key==='Enter'&&!event.shiftKey");
 expect(source).toContain('aria-label="Enviar a CEREBRO"');
});

test('automatic activity refresh remains and settings stay scalable',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const settings=read('src/CerebroVoiceSettings.tsx');
 const css=read('src/cerebro-voice-settings.css');
 expect(source).toContain('window.setInterval(()=>{void refresh()},30_000)');
 expect(source).not.toContain('Actualizar procesos');
 expect(settings).toContain("const VOICE_STORAGE_KEY='cerebro_console_voice_id_v1'");
 expect(settings).toContain('function availableVoices()');
 expect(settings).toContain('window.speechSynthesis.getVoices()');
 expect(settings).toContain("const USER_VOICE_ALIASES:Record<number,string>={1:'Bipi',2:'Trasta',3:'Pablo',4:'Marcos'}");
 expect(settings).toContain('voice.name||`Voz ${index+1}`');
 expect(settings).toContain('aria-label={`Escuchar ${alias||voice.name||`Voz ${index+1}`}`}');
 expect(settings).toContain("speed==='normal'");
 expect(settings).toContain("speed==='fast'");
 expect(settings).not.toContain('JARVIS');
 expect(settings).not.toContain('TONY STARK');
 expect(css).toContain('max-height:228px');
 expect(css).toContain('overflow-y:auto');
});
