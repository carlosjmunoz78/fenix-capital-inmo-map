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
 expect(host).toContain('cerebro-browser-entry-button');
 expect(host).toContain("onClick={()=>setView('NAVEGADOR')}");
 expect(host).not.toContain('createPortal');
 expect(host).not.toContain('OperativeBrowserTab');
});

test('browser surface has no application left sidebar and makes viewport dominant',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 const css=read('src/cerebro-browser-console.css');
 expect(source).toContain('cerebro-browser-frame');
 expect(source).toContain('cerebro-browser-viewport');
 expect(source).not.toContain('sidebar');
 expect(source).not.toContain('left-menu');
 expect(css).toContain('grid-template-rows:72px 66px minmax(0,1fr) 78px');
 expect(css).toContain('.cerebro-browser-frame{position:relative;min-height:0');
});

test('technical interface renders a direct visible Navegador access without DOM injection',async()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 const css=read('src/cerebro-console-host.css');
 expect(host).toContain('aria-label="Abrir interfaz Navegador"');
 expect(host).toContain('>NAVEGADOR</button>');
 expect(css).toContain('.cerebro-browser-entry-button{position:fixed');
 expect(css).toContain('z-index:90');
});

test('Phase 3 takeover controls are real, governed and reversible',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain('SIN SESIÓN VISUAL');
 expect(source).toContain('Parada de emergencia');
 expect(source).toContain('Tomar control');
 expect(source).toContain('Devolver a CEREBRO');
 expect(source).toContain("browserAction('/owner/takeover'");
 expect(source).toContain("browserAction('/owner/handback'");
 expect(source).toContain("browserAction('/owner/stop'");
 expect(source).toContain("browserSession.state==='HUMAN_CONTROLLED'");
 expect(source).toContain('human_lease_expires_at');
 expect(source).toContain('No se simula navegación');
});

test('browser chrome exposes governed navigation and explicit multitab controls',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain("humanInput('NAVIGATE'");
 expect(source).toContain("humanInput('BACK'");
 expect(source).toContain("humanInput('FORWARD'");
 expect(source).toContain("humanInput('RELOAD'");
 expect(source).toContain("humanInput('OPEN_TAB'");
 expect(source).toContain("humanInput('CLOSE_TAB'");
 expect(source).toContain("humanInput('SWITCH_TAB'");
 expect(source).toContain('Pestañas de Browser 1');
 expect(source).toContain('Dirección del navegador');
 expect(source).toContain('tabs.length} / 8');
});

test('browser composer reuses canonical hidden Console Gateway and voice transport',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 expect(source).toContain("document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console')");
 expect(source).toContain("core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea')");
 expect(source).toContain("core?.querySelector<HTMLFormElement>('.cerebro-chat-form')");
 expect(source).toContain("document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main')");
 expect(source).toContain('createVoiceRecognition()');
 expect(source).toContain("event.key==='Enter'&&!event.shiftKey");
 expect(source).toContain('Adjuntos: contrato de chat aún no habilitado; no se simula');
});

test('frontend browser traffic goes through Console Browser Gateway, never directly to V3 edge',async()=>{
 const api=read('src/cerebroBrowserInteractive.ts');
 expect(api).toContain("const BROWSER_GATEWAY='cerebro-console-browser-gateway-v1'");
 expect(api).toContain('${BROWSER_GATEWAY}/${route}');
 expect(api).not.toContain('/functions/v1/cerebro-browser-interactive-v3');
 expect(api).toContain("company_id:'fenix'");
 expect(api).toContain("environment:'PROD'");
});

test('browser shell keeps governed capacity visible without introducing a paid runtime',async()=>{
 const source=read('src/CerebroBrowserConsole.tsx');
 const runtime=read('cerebro/runtime/browser-interactive-session-v3.mjs');
 expect(source).toContain('<strong>Browser 1</strong>');
 expect(source).toContain('tabs.length} / 8');
 expect(source).not.toContain('Browserbase');
 expect(source).not.toContain('Browserless');
 expect(source).not.toContain('new WebSocket');
 expect(runtime).toContain("incremental_cost_eur:0");
});
