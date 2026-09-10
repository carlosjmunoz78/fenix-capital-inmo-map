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

test('workflow APP PRE-PROD retirado y gate activo usa candidato PROD aislado',()=>{
  expect(fs.existsSync(path.resolve('.github/workflows/preprod-build.yml'))).toBe(false);
  const workflow=fs.readFileSync(path.resolve('.github/workflows/prod-preparation-build.yml'),'utf8');
  expect(workflow).toContain('Build isolated PROD candidate');
  expect(workflow).toContain('PROD candidate browser QA');
  expect(workflow).toContain('VITE_FENIX_ENV: prod');
  expect(workflow).not.toContain('Browser QA PRE-PROD');
  expect(workflow).not.toContain("VITE_FUNCTION_SUFFIX: '-test'");
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

test('Calculadora avanzada expone capacidad modalidad y escenarios sin predecir tipos futuros',()=>{
  const ui=fs.readFileSync(path.resolve('src/CalculatorProEnhancement.tsx'),'utf8');
  const engine=fs.readFileSync(path.resolve('src/calculator.ts'),'utf8');
  const main=fs.readFileSync(path.resolve('src/main.tsx'),'utf8');
  expect(main).toContain('<CalculatorProEnhancement />');
  expect(ui).toContain('calculator-pro-advanced');
  expect(ui).toContain('Modalidad hipotecaria');
  expect(ui).toContain('<option value="mixed">Mixta</option>');
  expect(ui).toContain('<option value="variable">Variable</option>');
  expect(ui).toContain('Gastos compra €');
  expect(ui).toContain('Ahorro disponible €');
  expect(ui).toContain('Esfuerzo objetivo %');
  expect(ui).toContain('Fondos propios necesarios');
  expect(ui).toContain('Principal máximo objetivo');
  expect(ui).toContain('Comparador de escenarios');
  expect(ui).toContain('Los escenarios no predicen tipos futuros');
  expect(ui).toContain('calculator-pro-assumptions');
  expect(engine).toContain("projectionStatus: 'calculated' | 'assumptions_required'");
  expect(engine).toContain("if (type !== 'fixed')");
});

test('Controles flotantes respetan orden micrófono calculadora chat e iconos sin texto',()=>{
  const css=fs.readFileSync(path.resolve('src/calculator-no-pro.css'),'utf8');
  const labels=fs.readFileSync(path.resolve('src/CalculatorLabelGuard.tsx'),'utf8');
  const chat=fs.readFileSync(path.resolve('src/ChatShell.tsx'),'utf8');
  expect(css).toContain('bottom:130px!important');
  expect(css).toContain('bottom:74px!important');
  expect(chat).toContain('bottom:18px');
  expect(css).toContain('width:46px!important');
  expect(chat).toContain('width:46px;height:46px');
  expect(labels).toContain('if(node.nodeType===Node.TEXT_NODE)node.remove()');
  expect(chat).toContain('aria-label="Abrir chat de equipo"');
});

test('Chat de equipo permite imagen documento y audio con storage privado e identidad autenticada',()=>{
  const chat=fs.readFileSync(path.resolve('src/ChatShell.tsx'),'utf8');
  const migration=fs.readFileSync(path.resolve('supabase/migrations/20260910151705_team_chat_attachments_v1.sql'),'utf8');
  expect(chat).toContain("const BUCKET='fenix-prod-chat'");
  expect(chat).toContain('Adjuntar imagen, documento o audio');
  expect(chat).toContain("supabase.rpc('fenix_prod_chat_attachment_add_user'");
  expect(chat).toContain('createSignedUrl(a.storage_path,300)');
  expect(chat).toContain('supabase.storage.from(BUCKET).remove([storagePath])');
  expect(migration).toContain("false,20971520");
  expect(migration).toContain("(storage.foldername(name))[1]=auth.uid()::text");
  expect(migration).toContain('message_not_owned');
  expect(migration).toContain('fenix_prod_chat_attachment_add_user');
});
