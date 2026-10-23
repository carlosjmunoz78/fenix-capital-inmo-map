import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('NAVEGADOR is additive and preserves V0 plus OPERATIVA',async()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 expect(host).toContain("type CerebroView='V0'|'OPERATIVA'|'NAVEGADOR'");
 expect(host).toContain('<CerebroConsoleShell/>');
 expect(host).toContain('<CerebroOperativeConsole onViewChange={setView}/>');
 expect(host).toContain('<CerebroBrowserConsole onViewChange={setView}/>');
 expect(host).toContain('OperativeBrowserTab');
 expect(host).toContain('NAVEGADOR');
});

test('browser surface has no application left sidebar and makes viewport dominant',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 const css=read('src/cerebro-browser-console.css');
 expect(source).toContain('cerebro-browser-frame');
 expect(source).toContain('cerebro-browser-viewport');
 expect(source).not.toContain('sidebar');
 expect(source).not.toContain('left-menu');
 expect(css).toContain('grid-template-rows:72px 66px minmax(0,1fr) 78px');
 expect(css).toContain('.cerebro-browser-frame{min-height:0');
});

test('takeover controls are truthful and fail closed until Phase 3 transport exists',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain('SIN SESIÓN VISUAL');
 expect(source).toContain('Parada de emergencia');
 expect(source).toContain('Tomar control');
 expect(source).toContain('Devolver a CEREBRO');
 expect(source).toContain('No se simula navegación');
 expect(source).toContain('Control humano bloqueado');
 expect(source).toContain('disabled title="Se activará con el canal físico de control de Fase 3"');
 expect(source).toContain('disabled title="Se activará cuando exista una sesión Browser 1 con takeover gobernado"');
});

test('browser composer reuses canonical hidden Console Gateway and voice transport',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain("document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console')");
 expect(source).toContain("core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea')");
 expect(source).toContain("core?.querySelector<HTMLFormElement>('.cerebro-chat-form')");
 expect(source).toContain("document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main')");
 expect(source).toContain('createVoiceRecognition()');
 expect(source).toContain("event.key==='Enter'&&!event.shiftKey");
});

test('browser shell keeps current governed capacity visible without introducing a new runtime',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain('<strong>Browser 1</strong>');
 expect(source).toContain('<strong>8 / 4 / 2</strong>');
 expect(source).not.toContain('Browserbase');
 expect(source).not.toContain('Browserless');
 expect(source).not.toContain('new WebSocket');
});
