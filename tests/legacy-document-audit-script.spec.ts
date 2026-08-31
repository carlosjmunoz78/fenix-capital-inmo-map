import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('scripts/audit-legacy-document-files.mjs','utf8');

test('extractor documental legacy es solo lectura y fija el inventario auditado', async () => {
  expect(source).toContain("const NOTION_VERSION = '2026-03-11'");
  expect(source).toContain("const LEGACY_FILES_PROPERTY = '📎 Documentación adjunta'");
  expect(source).toContain('audited.length !== 31 || expectedTotal !== 118');
  expect(source).toContain("mode: 'READ_ONLY_METADATA'");
  expect(source).not.toContain('/v1/file_uploads');
  expect(source).not.toContain("method: 'POST'");
  expect(source).not.toContain("method: 'PATCH'");
  expect(source).not.toContain("method: 'DELETE'");
});

test('extractor falla cerrado si cambia el número de archivos por expediente', async () => {
  expect(source).toContain('if (files.length !== expectedCount)');
  expect(source).toContain('if (resolvedTotal !== 118)');
  expect(source).toContain('NOTION_TOKEN is required. This script performs read-only GET requests.');
});
