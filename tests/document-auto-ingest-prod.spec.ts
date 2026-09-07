import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente batch upload routes by filename and interviniente before AI',()=>{
 const ui=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(ui).toContain('const DOC_RULES:DocRule[]');
 expect(ui).toContain('fenix-expediente-people?expediente=');
 expect(ui).toContain('personForFile(file.name,people)');
 expect(ui).toContain('declared_contact_code:route.contactCode||null');
 expect(ui).toContain('document_family:route.family');
 expect(ui).toContain('PROD_CONCURRENCY=3');
 expect(ui).toContain('Promise.all(Array.from({length:Math.min(PROD_CONCURRENCY');
 expect(ui).toContain("window.dispatchEvent(new CustomEvent('fenix:document-processed'");
});

test('upload automatically analyzes without per-document Releer click',()=>{
 const ui=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(ui).toContain("await reread(prepared.data.upload_id,route,done.data.document_page_id)");
 expect(ui).toContain('await uploadFiles(allowed,activeContext)');
 expect(ui).not.toContain('Pulsa Enviar para subir');
 expect(ui).toContain('window.location.reload(),700');
});

test('server-side auto ingest trusts native route and only asks AI to read',()=>{
 const edge=fs.readFileSync('supabase/functions/fenix-document-auto-ingest/index.ts','utf8');
 expect(edge).toContain("error:'native_route_required'");
 expect(edge).toContain('NO clasifiques, NO decidas a quién pertenece');
 expect(edge).toContain("fenix_prod_exp_people_server");
 expect(edge).toContain("fenix_prod_exp_person_update_server");
 expect(edge).toContain("contact_not_in_expediente");
 expect(edge).toContain("native_route:true");
});
