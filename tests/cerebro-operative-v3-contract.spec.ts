import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('CEREBRO V3 uses a horizontal process rail instead of fixed phase timelines',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const css=read('src/cerebro-operative-console-v2.css');
 expect(source).toContain('cerebro-process-strip');
 expect(source).toContain('cerebro-live-progress');
 expect(source).not.toContain('cerebro-process-route');
 expect(source).not.toContain("['En cola','En ejecución'");
 expect(css).toContain('overflow-x:auto');
 expect(css).toContain('flex:0 0 292px');
});

test('CEREBRO V3 shows aliases and never invents a numeric progress value',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('compactAlias(run)');
 expect(source).toContain("run.progress_provenance!=='REAL_GITHUB_JOBS'");
 expect(source).toContain("isIndeterminate=ACTIVE_STATUSES.has(run.status)&&progress===null");
 expect(source).toContain("progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'");
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

test('/cerebro suppresses the global floating voice launcher without changing other routes',async()=>{
 const css=read('src/cerebro-operative-console-v2.css');
 expect(css).toContain("html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']");
 expect(css).toContain("html[data-cerebro-console='1'] .calc-launcher");
 expect(css).toContain("html[data-cerebro-console='1'] .f-offcanvas-trigger");
});

test('composer keeps attach dictation talk send and Enter semantics',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('aria-label="Adjuntar archivo"');
 expect(source).toContain("aria-label={dictating?'Detener dictado':'Dictar'}");
 expect(source).toContain("'Hablar con CEREBRO'");
 expect(source).toContain("event.key==='Enter'&&!event.shiftKey");
 expect(source).toContain('aria-label="Enviar a CEREBRO"');
});

test('automatic activity refresh replaces manual refresh with scalable voice settings',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 const settings=read('src/CerebroVoiceSettings.tsx');
 const css=read('src/cerebro-voice-settings.css');
 expect(source).toContain('window.setInterval(()=>{void refresh()},30_000)');
 expect(source).toContain('<CerebroVoiceSettings/>');
 expect(source).not.toContain('Actualizar procesos');
 expect(settings).toContain("const VOICE_STORAGE_KEY='cerebro_console_voice_id_v1'");
 expect(settings).toContain('spanishVoices()');
 expect(settings).toContain('<strong>Voz {index+1}</strong>');
 expect(settings).toContain('aria-label={`Escuchar Voz ${index+1}`}');
 expect(settings).toContain("speed==='normal'");
 expect(settings).toContain("speed==='fast'");
 expect(settings).not.toContain('JARVIS');
 expect(settings).not.toContain('TONY STARK');
 expect(css).toContain('max-height:228px');
 expect(css).toContain('overflow-y:auto');
});
