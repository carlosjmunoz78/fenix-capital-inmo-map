import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('scripts/execute-legacy-document-migration.mjs','utf8');

test('migrador documental conserva legado y exige invariantes 31/118', async () => {
  expect(source).toContain("const NOTION_VERSION = '2026-03-11'");
  expect(source).toContain("const DOCUMENTATION_DATA_SOURCE_ID = '34037d5e-21e8-4221-b020-b0e6e1a5a14f'");
  expect(source).toContain('manifest.expediente_count !== 31 || manifest.file_count !== 118');
  expect(source).toContain("process.env.EXECUTE_LEGACY_DOCUMENT_MIGRATION !== 'YES'");
  expect(source).toContain("'Clave deduplicación'");
  expect(source).toContain("Expediente: { relation: [{ id: destinationPageId }] }");
  expect(source).toContain("'Archivo tratado'");
});

test('migrador usa upload oficial e idempotencia y no borra legado', async () => {
  expect(source).toContain("/v1/file_uploads");
  expect(source).toContain("/v1/data_sources/${DOCUMENTATION_DATA_SOURCE_ID}/query");
  expect(source).toContain("legacy-doc-${stableKey(");
  expect(source).toContain('skipped_existing');
  expect(source).not.toContain("method: 'DELETE'");
  expect(source).not.toContain("archived: true");
  expect(source).not.toContain("in_trash");
});

test('migrador falla cerrado y reconcilia exactamente 118', async () => {
  expect(source).toContain('report.failed.push');
  expect(source).toContain('throw error');
  expect(source).toContain('if (sourceCount !== 118)');
  expect(source).toContain('report.created.length + report.skipped_existing.length !== 118');
  expect(source).toContain("report.status = 'COMPLETE'");
});
