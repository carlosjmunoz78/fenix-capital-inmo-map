import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('browser never exposes a direct document-original download path',async()=>{
 const ui=read('src/UniversalDocumentIntelligenceGuardV2.tsx');
 expect(ui).toContain("uploadToSignedUrl");
 expect(ui).not.toContain('.download(');
 expect(ui).not.toContain('getPublicUrl');
 expect(ui).not.toContain('createSignedUrl');
 expect(ui).not.toContain('fenix-prod-documents/');
});

test('original-document RBAC contract stays server mediated',async()=>{
 const contract=read('docs/contracts/document-original-rbac-contract.md');
 expect(contract).toContain('fenix_prod_document_get_server');
 expect(contract).toContain('fenix_prod_document_extract_resolve_server');
 expect(contract).toContain('fenix_prod_document_view_path_server');
 expect(contract).toContain('Dirección');
 expect(contract).toContain('Financiero propietario');
 expect(contract).toContain('Financiero ajeno');
 expect(contract).toContain('DENY');
 expect(contract).toContain('URL firmada');
 expect(contract).toContain('corta duración');
 expect(contract).toContain('fenix-prod-documents');
});

test('rollback contract pins v12 baseline before any extractor promotion',async()=>{
 const snapshot=read('docs/contracts/fenix-document-extract-v12-snapshot.md');
 const builder=read('scripts/build-fenix-document-extract-candidate.mjs');
 const verifier=read('scripts/verify-fenix-document-extract-candidate.mjs');
 expect(snapshot).toContain('Version PROD auditada: `12`');
 expect(snapshot).toContain('rollback');
 expect(builder).toContain('EXPECTED_SOURCE_SHA');
 expect(verifier).toContain('EXPECTED_SOURCE_SHA');
 expect(verifier).toContain('candidate contains changes outside the permitted labor-field additions');
});
