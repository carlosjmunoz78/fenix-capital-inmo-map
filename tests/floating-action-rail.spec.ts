import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');

test.describe('Fénix · rail flotante de acciones',()=>{
 test('mantiene Micro → Calculadora → Chat, iconos sin texto visible y separación uniforme',()=>{
  const css=read('src/calculator-no-pro.css');
  const chat=read('src/ChatShell.tsx');
  expect(css).toContain('bottom:130px!important');
  expect(css).toContain("content:'🎤'");
  expect(css).toContain('bottom:74px!important');
  expect(css).toContain('.calc-launcher::after{content:none!important}');
  expect(chat).toContain('className="fenix-chat-launcher"');
  expect(chat).toContain('bottom:18px');
  expect(chat).toContain('aria-label="Abrir chat de equipo"');
  expect(chat).toContain("navigate('/chat')");
 });
 test('los tres controles comparten eje y tamaño de 46px',()=>{
  const css=read('src/calculator-no-pro.css');
  const chat=read('src/ChatShell.tsx');
  expect(css).toContain('right:18px!important');
  expect(css).toContain('width:46px!important');
  expect(css).toContain('height:46px!important');
  expect(chat).toContain('right:18px');
  expect(chat).toContain('width:46px');
  expect(chat).toContain('height:46px');
 });
});
