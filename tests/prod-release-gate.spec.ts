import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('gate PROD exige promoción explícita y entorno separado',()=>{
  const gate=fs.readFileSync(path.resolve('docs/PROD_RELEASE_GATE.md'),'utf8');
  expect(gate).toContain('Ninguna versión pasa a PROD por automatismo');
  expect(gate).toContain('orden explícita');
  expect(gate).toContain('configuración PROD, dominio/hosting, backend, secretos y almacenamiento');
  expect(gate).toContain('No tocar `main`, PROD, WordPress ni Supabase PROD');
  expect(gate).toContain('No fusionar PR #2 sin orden explícita');
});

test('workflow PRE-PROD permanece parado y solo admite lanzamiento manual',()=>{
  const workflow=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(workflow).toContain('workflow_dispatch:');
  expect(workflow).not.toMatch(/^\s+push:\s*$/m);
  expect(workflow).not.toMatch(/^\s+pull_request:\s*$/m);
  expect(workflow).not.toMatch(/git push[^\n]*HEAD:main/);
  expect(workflow).not.toMatch(/git push[^\n]*\bmain\b/);
});

test('Contactos PROD abre fichas con identificadores canónicos y usa el gateway',()=>{
  const detail=fs.readFileSync(path.resolve('src/ContactDetailShell.tsx'),'utf8');
  const runtime=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
  expect(detail).toContain("const active=Boolean(match&&id&&id!=='nuevo')");
  expect(runtime).toContain("pathname.match(/^\\/clientes\\/([^/]+)$/)");
  expect(runtime).toContain("fetchAppApi<T>(`/contactos/${encodeURIComponent(id)}`)");
});

test('Contactos PROD conserva todos los teléfonos y correos y abre la ficha creada',()=>{
  const create=fs.readFileSync(path.resolve('src/ContactCreateShell.tsx'),'utf8');
  const detail=fs.readFileSync(path.resolve('src/ContactDetailShell.tsx'),'utf8');
  expect(create).toContain("supabase.rpc('fenix_prod_contact_create_v2'");
  expect(create).toContain('p_emails:Array.isArray(payload.emails)?payload.emails:[]');
  expect(create).toContain('p_telefonos:Array.isArray(payload.telefonos)?payload.telefonos:[]');
  expect(detail).toContain("textList(row||undefined,['telefonos']");
  expect(detail).toContain("textList(row||undefined,['emails']");
});

test('Tasaciones PROD acepta el contrato canónico y no presenta Notion como fuente PROD',()=>{
  const list=fs.readFileSync(path.resolve('src/TasacionesShell.tsx'),'utf8');
  expect(list).toContain('Array.isArray(d.tasaciones)');
  expect(list).toContain("text(r,['tasacion_code'");
  expect(list).toContain("IS_PRODUCTION?'Fuente canónica Fénix':'Fuente canónica Notion'");
  expect(list).toContain("IS_PRODUCTION?'Sin conexión':'PRE-PROD'");
});

test('Tasaciones PROD expone histórico, informe y validación Dirección con preview',()=>{
  const guard=fs.readFileSync(path.resolve('src/TasacionLifecycleGuard.tsx'),'utf8');
  const gate=fs.readFileSync(path.resolve('src/OperationalRecordDetailGate.tsx'),'utf8');
  expect(guard).toContain('`/tasaciones/${encodeURIComponent(id)}/history`');
  expect(guard).toContain('`/tasaciones/${encodeURIComponent(id)}/report`');
  expect(guard).toContain('`/tasaciones/${encodeURIComponent(id)}/validacion-belen`');
  expect(guard).toContain("ctx?.role==='Direccion'");
  expect(guard).toContain('tasacion-validation-preview');
  expect(gate).toContain("match?.[1]==='tasaciones'&&<TasacionLifecycleGuard/>");
});

test('Firmas PROD mantiene histórico canónico y acciones reales en el detalle',()=>{
  const guard=fs.readFileSync(path.resolve('src/FirmaLifecycleGuard.tsx'),'utf8');
  const gate=fs.readFileSync(path.resolve('src/OperationalRecordDetailGate.tsx'),'utf8');
  const detail=fs.readFileSync(path.resolve('src/OperationalRecordDetail.tsx'),'utf8');
  expect(guard).toContain('`/firmas/${encodeURIComponent(id)}/history`');
  expect(gate).toContain("match?.[1]==='firmas'&&<FirmaLifecycleGuard/>");
  expect(detail).toContain('`/firmas/${encodeURIComponent(id)}/schedule`');
  expect(detail).toContain('`/firmas/${encodeURIComponent(id)}/confirm`');
  expect(detail).toContain('`/firmas/${encodeURIComponent(id)}/close`');
});

test('Informes PROD expone actividad diaria auditada y preserva aislamiento por rol',()=>{
  const ui=fs.readFileSync(path.resolve('src/InformesDailyActivityGuard.tsx'),'utf8');
  const migration=fs.readFileSync(path.resolve('supabase/migrations/20260910150425_daily_activity_reports_audit_v2.sql'),'utf8');
  expect(ui).toContain('Dirección ve la actividad consolidada de empresa');
  expect(ui).toContain('Financiero y Visitador reciben únicamente su ámbito autorizado');
  expect(ui).toContain('daily-activity-reports');
  expect(migration).toContain("r not in ('Direccion','Financiero','Visitador')");
  expect(migration).toContain("case when r='Direccion' then 'company' else 'actor' end");
  expect(migration).toContain('activity_refresh_report_trigger_v1');
  expect(migration).toContain("time zone 'Europe/Madrid'");
});
