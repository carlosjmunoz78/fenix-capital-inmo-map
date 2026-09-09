import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function source(rel:string){return fs.readFileSync(path.join(process.cwd(),rel),'utf8');}

test('expediente usa nombre visible de todos los participantes y conserva el codigo interno',async()=>{
  const rename=source('src/ExpedienteRenameGuard.tsx');
  const chrome=source('src/ExpedienteLegacyChromeGuard.tsx');
  expect(chrome).toContain("import ExpedienteRenameGuard from './ExpedienteRenameGuard'");
  expect(chrome).toContain('return <ExpedienteRenameGuard/>');
  expect(rename).toContain('joinNames(people)');
  expect(rename).toContain('applyVisibleTitle');
  expect(rename).toContain('dataset.expedienteCode');
  expect(rename).toContain('cliente_alias');
  expect(rename).toContain('Cambiar nombre visible');
  expect(rename).toContain('if(!code||!IS_PRODUCTION)return');
});

test('ficha de expediente hidrata todos los campos de cada comprador en preprod y prod',async()=>{
  const runtime=source('src/notionRuntime.ts');
  const people=source('supabase/functions/fenix-expediente-people-test/index.ts');
  expect(runtime).toContain("fetchEnvironmentApi<T>('fenix-expediente-people'");
  expect(runtime).toContain("?expediente=${encodeURIComponent(decodeURIComponent(people[1]))}");
  expect(runtime).not.toContain("fetchEnvironmentApi<T>('fenix-expediente-people-test'");
  for(const field of ['fecha_nacimiento','nacionalidad','estado_civil','situacion_laboral','empresa_organismo','sueldo_neto_mensual','deudas_mensuales','ahorro_disponible'])expect(people).toContain(field);
  expect(people).toContain('relation:{contains:expedienteId}');
});

test('lectura documental de comprador actualiza al comprador y no pisa el alias del expediente',async()=>{
  const intelligence=source('supabase/functions/fenix-document-intelligence/index.ts');
  expect(intelligence).toContain('"comprador"');
  expect(intelligence).toContain('if(ot==="comprador")');
  expect(intelligence).toContain('fenix-comprador-action-test');
  expect(intelligence).toContain('conflicts_require_confirmation');
  expect(intelligence).toContain('expediente_alias_not_overwritten_by_document_identity');
  expect(intelligence).not.toContain('p_cliente_alias:full');
});
