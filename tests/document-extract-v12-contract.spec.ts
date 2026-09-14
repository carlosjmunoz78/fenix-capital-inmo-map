import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const LIVE_BUNDLE_SHA='54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2';
const VERSIONED_SOURCE_SHA='c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9';

test('live v12 extractor snapshot preserves rollback and governance contract',async()=>{
 const snapshot=read('docs/contracts/fenix-document-extract-v12-snapshot.md');
 expect(snapshot).toContain('Version PROD auditada: `12`');
 expect(snapshot).toContain('`verify_jwt`: `true`');
 expect(snapshot).toContain('Supabase bundle `ezbr_sha256`');
 expect(snapshot).toContain(LIVE_BUNDLE_SHA);
 expect(snapshot).toContain(VERSIONED_SOURCE_SHA);
 expect(snapshot).toContain('fenix_prod_session_context');
 expect(snapshot).toContain('fenix_prod_document_extract_resolve_server');
 expect(snapshot).toContain('fenix_prod_runtime_policy_server(document_auto_ingest_min_confidence)');
 expect(snapshot).toContain('`POLICY_CONFLICT`');
 expect(snapshot).toContain('`LOW_CONFIDENCE`');
 expect(snapshot).toContain('legacy_status');
 expect(snapshot).toContain('legacy_batch');
});

test('versioned extractor source stays pinned to the audited v12 snapshot',async()=>{
 const source=read('supabase/functions/fenix-document-extract/index.ts');
 const sha=crypto.createHash('sha256').update(source).digest('hex');
 expect(sha).toBe(VERSIONED_SOURCE_SHA);
 expect(source).toContain('fenix_prod_document_extract_resolve_server');
 expect(source).toContain("p_policy_key:'document_auto_ingest_min_confidence'");
 expect(source).toContain("human_reason:'POLICY_CONFLICT'");
 expect(source).toContain("human_reason:'LOW_CONFIDENCE'");
 expect(source).toContain('body.mode==="legacy_status"');
 expect(source).toContain('body.mode==="legacy_batch"');
 expect(source).toContain('"tipo_contrato"');
});

test('candidate builder is minimal and labor projection scope is explicit',async()=>{
 const snapshot=read('docs/contracts/fenix-document-extract-v12-snapshot.md');
 const builder=read('scripts/build-fenix-document-extract-candidate.mjs');
 for(const field of ['tipo_contrato','modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']){
  expect(snapshot).toContain('`'+field+'`');
 }
 for(const field of ['modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']){
  expect(builder).toContain(field);
 }
 expect(builder).toContain('EXPECTED_SOURCE_SHA');
 expect(builder).toContain('missing anchor');
 expect(builder).toContain('ambiguous anchor');
 expect(builder).toContain('provider endpoint');
 expect(builder).toContain('confidence policy');
 expect(snapshot).toContain('No modificar OCR/clasificación/modelo/proveedor');
 expect(snapshot).toContain('No desplegar una variante si no existe forma de volver a esta versión funcional.');
});

test('original document rollback and RBAC contract remains enforced inside the promotion gate',async()=>{
 const ui=read('src/UniversalDocumentIntelligenceGuardV2.tsx');
 const contract=read('docs/contracts/document-original-rbac-contract.md');
 const verifier=read('scripts/verify-fenix-document-extract-candidate.mjs');
 expect(ui).toContain('uploadToSignedUrl');
 expect(ui).not.toContain('.download(');
 expect(ui).not.toContain('getPublicUrl');
 expect(ui).not.toContain('createSignedUrl');
 expect(contract).toContain('fenix_prod_document_get_server');
 expect(contract).toContain('fenix_prod_document_extract_resolve_server');
 expect(contract).toContain('fenix_prod_document_view_path_server');
 expect(contract).toContain('Dirección');
 expect(contract).toContain('Financiero propietario');
 expect(contract).toContain('Financiero ajeno');
 expect(contract).toContain('DENY');
 expect(contract).toContain('URL firmada');
 expect(contract).toContain('corta duración');
 expect(verifier).toContain('candidate contains changes outside the permitted labor-field additions');
});
