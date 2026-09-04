import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');

test('historical documents with empty master fields reread the existing original automatically',()=>{
  expect(source).toContain("import {ocrFile} from './browserDocumentOcr'");
  expect(source).toContain("import {extractDocumentData} from './operationalDocumentExtraction'");
  expect(source).toContain('AUTO_RELECTURA_DOCUMENTO_HISTORICO');
  expect(source).toContain('fetch(original');
  expect(source).toContain('ocrFile(file');
  expect(source).toContain('extractDocumentData(o.text,o.confidence,hint)');
  expect(source).toContain('setRecoveredPreview');
  expect(source).toContain('sin modificar ni duplicar el archivo');
});

test('automatic reread stays preview-only and never performs canonical writes',()=>{
  expect(source).not.toContain("method:'POST'");
  expect(source).not.toContain('method:"POST"');
});
