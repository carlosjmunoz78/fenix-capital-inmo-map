import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const hub=fs.readFileSync(path.join(process.cwd(),'src/GlobalCommunicationCommandGuard.tsx'),'utf8');
const tasks=fs.readFileSync(path.join(process.cwd(),'src/TaskCreateShell.tsx'),'utf8');
const comms=fs.readFileSync(path.join(process.cwd(),'src/CommunicationsShell.tsx'),'utf8');

test('micro universal ofrece cuatro acciones y Hablar con Ana consulta CEREBRO sin API de IA',()=>{
 expect(hub).toContain('Tarea');
 expect(hub).toContain('Corrección');
 expect(hub).toContain('Dar conocimiento');
 expect(hub).toContain('Hablar con Ana');
 expect(hub).toContain("type VoiceMode='task'|'correction'|'knowledge'|'chat'");
 expect(hub).toContain("fetchAppApi<unknown>(`/search?q=${encodeURIComponent(value)}`)");
 expect(hub).toContain('sin API generativa');
 expect(hub).toContain('No voy a inventarla');
});

test('micro universal mantiene contraste legible en modo claro y oscuro sin panel blanco brillante',()=>{
 expect(hub).toContain('--voice-accent:#c97845');
 expect(hub).toContain('--voice-panel:#f3dfcf');
 expect(hub).toContain('--voice-text:#17120f');
 expect(hub).toContain("html[data-theme='dark'] .fenix-voice-hub");
 expect(hub).toContain('--voice-panel:#1d1815');
 expect(hub).toContain('--voice-text:#f7f2ee');
 expect(hub).toContain("html[data-theme='dark'] .fenix-voice-main{color:#fff");
 expect(hub).toContain('.fenix-voice-main{width:50px;height:50px');
});

test('tarea dictada se precarga y comunicaciones siguen usando Brevo/WhatsApp con revisión previa',()=>{
 expect(tasks).toContain("get('instruction')");
 expect(tasks).toContain('Revisar antes de crear');
 expect(comms).toContain("canal==='WhatsApp'");
 expect(comms).toContain('WhatsApp todavía no está operativo en Meta/Supabase. No se ha enviado nada.');
 expect(comms).toContain("mode:'REAL'");
 expect(comms).toContain('Envío real completado y registrado.');
});
