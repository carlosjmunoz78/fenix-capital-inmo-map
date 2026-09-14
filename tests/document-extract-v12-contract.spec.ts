import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('live v12 extractor snapshot preserves rollback and governance contract',async()=>{
 const snapshot=read('docs/contracts/fenix-document-extract-v12-snapshot.md');
 expect(snapshot).toContain('Version PROD: `12`');
 expect(snapshot).toContain('`verify_jwt`: `true`');
 expect(snapshot).toContain('54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2');
 expect(snapshot).toContain('fenix_prod_session_context');
 expect(snapshot).toContain('fenix_prod_document_extract_resolve_server');
 expect(snapshot).toContain('fenix_prod_runtime_policy_server(document_auto_ingest_min_confidence)');
 expect(snapshot).toContain('`POLICY_CONFLICT`');
 expect(snapshot).toContain('`LOW_CONFIDENCE`');
 expect(snapshot).toContain('legacy_status');
 expect(snapshot).toContain('legacy_batch');
});

test('candidate labor projection scope is explicit before extractor promotion',async()=>{
 const snapshot=read('docs/contracts/fenix-document-extract-v12-snapshot.md');
 for(const field of ['tipo_contrato','modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']){
  expect(snapshot).toContain('`'+field+'`');
 }
 expect(snapshot).toContain('No modificar OCR/clasificación/modelo/proveedor');
 expect(snapshot).toContain('No desplegar una variante si no existe forma de volver a esta versión funcional.');
});
