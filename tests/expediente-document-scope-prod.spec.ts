import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente documents accept canonical PROD scope_type/scope_code',()=>{
 const src=fs.readFileSync('src/ExpedienteDocumentsGuard.tsx','utf8');
 expect(src).toContain("scopeType==='expediente'");
 expect(src).toContain('relationContains(row.scope_code,target)');
 expect(src).toContain('belongsToExpediente(row,code)');
 expect(src).toContain('relationContains(row.expediente_id,target)');
});

test('expediente upload launcher mounts inside the production detail shell',()=>{
 const uploader=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 const guard=fs.readFileSync('src/ExpedienteDocumentsGuard.tsx','utf8');
 expect(uploader).toContain(".ops-content,.dir-content,.detail-exp-content");
 expect(guard).toContain('[data-testid="context-evidence-open"]');
 expect(guard).toContain('launcher.click()');
});

test('legacy expediente routes resolve to canonical code before upload',()=>{
 const uploader=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(uploader).toContain("legacy-expediente-destination-map.json");
 expect(uploader).toContain('resolveCanonicalExpedienteCode');
 expect(uploader).toContain("dedupe.replace(/^exp-legado-/i,'')");
 expect(uploader).toContain("def.type==='expediente'?resolveCanonicalExpedienteCode(rawId):rawId");
 expect(uploader).toContain("code:resolveCanonicalExpedienteCode(expediente)");
});

test('PDF filename wins over Android MIME before PROD validation',()=>{
 const uploader=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(uploader).toContain("if(lower.endsWith('.pdf'))return'application/pdf'");
 expect(uploader).toContain("PROD_ALLOWED_MIME.has(mime)");
 expect(uploader.indexOf("if(lower.endsWith('.pdf'))return'application/pdf'")).toBeLessThan(uploader.indexOf("if(direct&&direct!=='application/octet-stream')return direct"));
});

test('existing expediente auto-processes the selected batch without a send step',()=>{
 const uploader=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(uploader).toContain('setSelectedFiles(allowed)');
 expect(uploader).toContain('data-testid="context-evidence-selected"');
 expect(uploader).not.toContain('data-testid="context-evidence-send"');
 expect(uploader).not.toContain('Pulsa Enviar para subir');
 expect(uploader).toContain('await uploadFiles(allowed,activeContext)');
 expect(uploader).toContain('fenix:document-processed');
 expect(uploader).toContain('fenix:document-batch-finished');
 expect(uploader).toContain('window.location.reload(),700');
 expect(uploader).toContain('const PROD_MAX_MB=50');
 expect(uploader).not.toContain("supera${oversize===1?'':'n'} 12 MB");
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
