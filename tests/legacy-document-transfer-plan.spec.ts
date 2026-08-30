import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/build-legacy-document-transfer-plan.mjs', 'utf8');

test('planificador documental sigue siendo dry-run sin red ni escrituras', async () => {
  expect(source).toContain("mode: 'DRY_RUN_ONLY'");
  expect(source).toContain("status: 'PLANNED_NOT_EXECUTED'");
  expect(source).toContain('No binary transfer or Notion write has been executed.');
  expect(source).not.toContain('fetch(');
  expect(source).not.toContain('https://api.notion.com');
  expect(source).not.toContain('/v1/file_uploads');
  expect(source).not.toContain("method: 'POST'");
  expect(source).not.toContain("method: 'PATCH'");
  expect(source).not.toContain("method: 'DELETE'");
});

test('planificador falla cerrado y exige 31 expedientes / 118 archivos', async () => {
  expect(source).toContain('manifest.expediente_count !== 31 || manifest.file_count !== 118');
  expect(source).toContain('if (transfers.length !== 118)');
  expect(source).toContain('Duplicate destination dedupe key');
  expect(source).toContain('No destination mapping for');
  expect(source).toContain('Destination title mismatch');
  expect(source).toContain('Transfer keys are not unique');
});

test('planificador conserva destino, relación e idempotencia explícitos', async () => {
  expect(source).toContain("intended_destination: 'Documentación · Fénix Capital'");
  expect(source).toContain("intended_relation: 'Expediente'");
  expect(source).toContain("intended_file_property: 'Archivo tratado'");
  expect(source).toContain('intended_dedupe_key');
  expect(source).toContain('destination_expediente_page_id');
});
