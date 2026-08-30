import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/legacy-document-migration.yml','utf8');
const runner=fs.readFileSync('scripts/execute-legacy-document-migration.mjs','utf8');

test('migración documental solo puede arrancar manualmente y exige confirmación', async () => {
  expect(workflow).toContain('workflow_dispatch:');
  expect(workflow).not.toMatch(/^\s*push:/m);
  expect(workflow).not.toMatch(/^\s*schedule:/m);
  expect(workflow).toContain("inputs.confirm == 'MIGRATE_118'");
  expect(workflow).toContain('EXECUTE_LEGACY_DOCUMENT_MIGRATION: YES');
});

test('workflow refresca URLs, planifica, ejecuta y reconcilia 118 archivos', async () => {
  expect(workflow).toContain('audit-legacy-document-files.mjs');
  expect(workflow).toContain('build-legacy-document-transfer-plan.mjs');
  expect(workflow).toContain('execute-legacy-document-migration.mjs');
  expect(workflow).toContain("!==118");
  expect(workflow).toContain('legacy-document-migration-evidence');
});

test('ejecutor no borra ni modifica adjuntos del CRM legado', async () => {
  expect(runner).not.toContain("method: 'DELETE'");
  expect(runner).not.toContain("method: 'PATCH'");
  expect(runner).not.toContain('/v1/pages/${legacy');
  expect(runner).not.toContain('archive');
  expect(runner).toContain("parent: { type: 'data_source_id', data_source_id: DOCUMENTATION_DATA_SOURCE_ID }");
  expect(runner).toContain("'Clave deduplicación'");
});
