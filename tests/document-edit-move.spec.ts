import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
const viewer=fs.readFileSync(path.resolve('src/DocumentViewerShell.tsx'),'utf8');
const action=fs.readFileSync(path.resolve('supabase/functions/fenix-document-actions/index.ts'),'utf8');
const migration=fs.readFileSync(path.resolve('supabase/migrations/20260905183715_prod_document_edit_move_audit.sql'),'utf8');

test('documento permite editar y cambiar expediente con confirmación',()=>{
 expect(viewer).toContain('Editar / cambiar expediente');
 expect(viewer).toContain('Guardar cambios');
 expect(viewer).toContain('new_expediente_code');
 expect(viewer).toContain('window.confirm');
 expect(viewer).toContain('El original nunca se sustituye');
 expect(viewer).toContain('expected_version');
});

test('backend exige versión, audita y restringe el movimiento a Dirección',()=>{
 expect(action).toContain('expected_version_required');
 expect(action).toContain('fenix_prod_document_edit_server');
 expect(migration).toContain('document_change_history');
 expect(migration).toContain('move_requires_direction');
 expect(migration).toContain('version_conflict');
 expect(migration).toContain('before_values');
 expect(migration).toContain('after_values');
 expect(migration).toContain('current_version=current_version+1');
});
