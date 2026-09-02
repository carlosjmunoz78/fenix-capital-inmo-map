import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const runtime=fs.readFileSync(path.join(process.cwd(),'src/notionRuntime.ts'),'utf8');
const contactos=fs.readFileSync(path.join(process.cwd(),'src/ContactosShell.tsx'),'utf8');
const inmobiliarias=fs.readFileSync(path.join(process.cwd(),'src/InmobiliariasShell.tsx'),'utf8');

test('production contact rows expose a stable id for detail clickthrough',()=>{
  expect(runtime).toContain("firstId(row,'id','contact_id','contacto_id','contact_key','contacto_code','codigo','código','code')");
  expect(runtime).toContain('.filter(row=>row.tipo===contactMode).map(normalizeContactRow)');
  expect(contactos).toContain("navigate(destino)");
  expect(contactos).toContain("/contactos/${encodeURIComponent(id)}");
});

test('production inmobiliaria rows expose a stable id for detail clickthrough',()=>{
  expect(runtime).toContain("firstId(row,'id','inmobiliaria_id','inmobiliaria_code','codigo','código','code')");
  expect(runtime).toContain('items:envelope.items.map(normalizeInmobiliariaRow)');
  expect(inmobiliarias).toContain("navigate(`/inmobiliarias/${encodeURIComponent(id)}`)");
});
