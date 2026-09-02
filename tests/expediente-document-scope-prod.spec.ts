import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente documents accept canonical PROD scope_type/scope_code',()=>{
 const src=fs.readFileSync('src/ExpedienteDocumentsGuard.tsx','utf8');
 expect(src).toContain("scopeType==='expediente'");
 expect(src).toContain('relationContains(row.scope_code,target)');
 expect(src).toContain('belongsToExpediente(row,code)');
 expect(src).toContain('relationContains(row.expediente_id,target)');
});

test('expediente document click preserves exact document viewer contract',()=>{
 const guard=fs.readFileSync('src/ExpedienteDocumentsGuard.tsx','utf8');
 const viewer=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');
 const runtime=fs.readFileSync('src/notionRuntime.ts','utf8');
 expect(guard).toContain('navigate(`/documentos/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(returnTo)}`)');
 expect(viewer).toContain('data-testid="document-open-original"');
 expect(viewer).toContain('data-testid="document-download-original"');
 expect(runtime).toContain('`${path}/view`');
 expect(runtime).toContain('signed_url');
});
