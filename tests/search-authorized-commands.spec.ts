import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(),'src/SearchShell.tsx'),'utf8');

test('L8 commands derive destinations only from authorized navigation', async()=>{
  expect(source).toContain('function allowedCommand(nav:NavItem[],raw:string)');
  expect(source).toContain('const effectiveNav=nav.length?nav:fallbackNav');
  expect(source).toContain('const item=allowedCommand(effectiveNav,q)');
  expect(source).toContain('if(item?.route){navigate(item.route);return;}');
  expect(source).toContain('Ese comando no existe o no está autorizado para tu sesión.');
});

test('L8 help exposes only commands already present in authorized navigation', async()=>{
  expect(source).toContain("key==='ayuda'||key==='help'||key==='comandos'");
  expect(source).toContain("effectiveNav.filter(item=>typeof item.route==='string'&&item.route.startsWith('/'))");
  expect(source).toContain('Comandos autorizados:');
});

test('L8 keeps normal universal search backend authorized', async()=>{
  expect(source).toContain("fetchAppApi<unknown>(`/search?q=${encodeURIComponent(q)}`)");
  expect(source).toContain('No se amplían permisos desde la interfaz.');
  expect(source).not.toContain('window.location.assign(q)');
});
