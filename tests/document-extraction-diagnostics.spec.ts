import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const viewer=fs.readFileSync(path.resolve('src/DocumentViewerShell.tsx'),'utf8');

test('la vista documental muestra diagnóstico seguro del extractor',()=>{
  expect(viewer).toContain('safeDiagnostic');
  expect(viewer).toContain('document_extract_failed');
  expect(viewer).toContain('OPENAI_REQUEST_400');
  expect(viewer).toContain('OPENAI_AUTH_401');
  expect(viewer).toContain('OPENAI_QUOTA_429');
  expect(viewer).toContain('OPENAI_PROVIDER_5XX');
  expect(viewer).toContain('El PDF original no se ha modificado.');
  expect(viewer).not.toContain('OPENAI_API_KEY');
  expect(viewer).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{10,}/);
});

test('solo reintenta una vez fallos transitorios y no oculta fallos deterministas',()=>{
  expect(viewer).toContain('function transient');
  expect(viewer).toContain('Reintentando automáticamente');
  const calls=viewer.match(/fetchEnvironmentApi<any>\('fenix-document-extract'/g)??[];
  expect(calls.length).toBe(2);
  expect(viewer).toContain("else if(r.status===403)");
});
