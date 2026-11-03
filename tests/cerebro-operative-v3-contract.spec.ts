import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('Jarvis and Operativa are physically separated while sharing canonical state infrastructure',async()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 expect(host).toContain("import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';");
 expect(host).toContain("import CerebroOperativeConsole from './CerebroOperativeConsole';");
 expect(host).toContain('<CerebroJarvisWorkConsole surface="JARVIS"/>');
 expect(host).toContain('<CerebroOperativeConsole/>');
 expect(host).toContain("primaryView==='JARVIS'?");
 expect(host).toContain("primaryView==='OPERATIVA'?");
});

test('Operativa consumes real activity and never invents numeric progress',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('fetchCerebroActivity');
 expect(source).toContain("run.progress_provenance!=='REAL_GITHUB_JOBS'");
 expect(source).toContain('No voy a inventar trabajos ni porcentajes.');
 expect(source).toContain('Sin porcentaje fiable');
});

test('Operativa translates technical names and steps to human Spanish',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('Trabajando ahora');
 expect(source).toContain('Esperando turno');
 expect(source).toContain('Necesita revisión');
 expect(source).toContain('Comprobar acceso y sesión');
 expect(source).toContain('Preparar una integración segura');
 expect(source).toContain('Preparando estructura y reglas');
 expect(source).toContain('Revisión independiente');
 expect(source).toContain('humanStep(run.current_step');
 expect(source).toContain('humanStep(selectedRun.next_step');
});

test('Operativa exposes current multi-company scope and protected power modes',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain("fenix:'Fénix Capital'");
 expect(source).toContain("aion:'AION'");
 expect(source).toContain("captacasa:'CAPTACASA'");
 expect(source).toContain("type PowerMode='Suave'|'Normal'|'Alto'|'Máximo'");
 expect(source).toContain('Mantén todas las protecciones, no generes gasto no autorizado');
});

test('Jarvis composer is empty, separates dictation and voice, and reuses canonical voice session',async()=>{
 const source=read('src/CerebroOperativeConsole.tsx');
 expect(source).toContain('className="operativa-jarvis-composer"');
 expect(source).toContain('aria-label="Mensaje para Jarvis"');
 expect(source).not.toContain('placeholder=');
 expect(source).toContain('createVoiceRecognition');
 expect(source).toContain("querySelector<HTMLButtonElement>('.operativa-core-bridge .cerebro-voice-main')");
 expect(source).toContain("dictating?'Detener dictado':'Dictar'");
 expect(source).toContain("snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'");
});

test('attachment bridge reuses existing local extractor from Operativa',async()=>{
 const source=read('src/CerebroAttachmentBridge.tsx');
 expect(source).toContain('.operativa-jarvis-composer');
 expect(source).toContain('extractCerebroAttachment');
 expect(source).toContain('Local · contexto acotado');
 expect(source).toContain('Selector de archivos para Jarvis');
});

test('premium layout removes old rigid three-column Operativa while retaining progressive detail',async()=>{
 const css=read('src/cerebro-operative-console.css');
 expect(css).toContain('.operativa-command-deck');
 expect(css).toContain('.operativa-reactor');
 expect(css).toContain('.operativa-work-row');
 expect(css).toContain('.operativa-inspector');
 expect(css).toContain('@media(prefers-reduced-motion:reduce)');
 expect(css).not.toContain('grid-template-columns:280px minmax(0,1fr) 330px');
});

test('/cerebro isolates global launchers and retains rollback route',async()=>{
 const isolation=read('src/cerebro-route-isolation-v2.css');
 const hostCss=read('src/cerebro-console-host.css');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(isolation).toContain("button[aria-label='Abrir chat interno']");
 expect(hostCss).toContain("html[data-cerebro-console='1'] button[aria-label='Abrir acciones por voz']");
 expect(host).toContain("document.documentElement.dataset.cerebroConsole='1'");
 expect(host).toContain("if(section==='legacy-v0')return'V0'");
 expect(host).toContain('<div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div>');
});

test('activity projection still exposes real GitHub job-step progress',async()=>{
 const edge=read('supabase/functions/cerebro-console-activity-v0/index.ts');
 const api=read('src/cerebroActivityApi.ts');
 expect(edge).toContain('/jobs?per_page=100');
 expect(edge).toContain('REAL_GITHUB_JOBS');
 expect(edge).toContain('progress_completed_steps');
 expect(edge).toContain('workflow_alias');
 expect(api).toContain("progress_provenance:CerebroProgressProvenance");
});

test('canonical Gateway and voice core remain the execution path',async()=>{
 const operative=read('src/CerebroOperativeConsole.tsx');
 const shell=read('src/CerebroConsoleShell.tsx');
 expect(operative).toContain('<CerebroConsoleShell/>');
 expect(operative).toContain(".operativa-core-bridge .cerebro-console");
 expect(shell).toContain('postCerebroConsoleChat');
 expect(shell).toContain('createVoiceRecognition');
 expect(shell).toContain('window.speechSynthesis.speak');
});
