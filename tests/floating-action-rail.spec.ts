import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');

test.describe('Fénix · rail flotante de acciones',()=>{
 test('mantiene Calculadora → Micro → Chat, iconos sin texto visible y separación compacta',()=>{
  const css=read('src/calculator-no-pro.css');
  const chat=read('src/ChatShell.tsx');
  const voice=read('src/GlobalCommunicationCommandGuard.tsx');
  expect(css).toContain('.calc-launcher{');
  expect(css).toContain('bottom:118px!important');
  expect(css).toContain('.fenix-voice-hub{right:18px!important;bottom:68px!important}');
  expect(css).toContain('.fenix-chat-launcher{right:18px!important;bottom:18px!important');
  expect(css).toContain('.fenix-voice-main{width:46px!important;height:46px!important');
  expect(voice).toContain('aria-label="Abrir acciones por voz"');
  expect(css).toContain('.calc-launcher::after{content:none!important}');
  expect(chat).toContain('className="fenix-chat-launcher"');
  expect(chat).toContain('aria-label="Abrir chat de equipo"');
  expect(chat).toContain('onClick={()=>setMiniOpen(v=>!v)}');
  expect(chat).toContain('aria-label="Expandir chat"');
  expect(chat).toContain("setMiniOpen(false);navigate('/chat')");
 });
 test('los tres controles comparten eje tamaño forma y color de fondo de la calculadora',()=>{
  const css=read('src/calculator-no-pro.css');
  const chat=read('src/ChatShell.tsx');
  expect(css).toContain('right:18px!important');
  expect(css).toContain('width:46px!important');
  expect(css).toContain('height:46px!important');
  expect(css).toContain('border-radius:14px!important');
  expect(css).toContain('.fenix-voice-main{width:46px!important;height:46px!important;border-radius:14px!important;padding:0!important;background:var(--orange)!important');
  expect(css).toContain('.fenix-chat-launcher{right:18px!important;bottom:18px!important;width:46px!important;height:46px!important;border-radius:14px!important;background:var(--orange)!important');
  expect(chat).toContain('right:18px');
  expect(chat).toContain('width:46px');
  expect(chat).toContain('height:46px');
 });
});
