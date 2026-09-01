import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('altas de notaría y registro conservan endpoint aislado en PRE-PROD',async()=>{
 const src=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
 expect(src).toContain("IS_PRODUCTION?'fenix-directory-actions':'fenix-directory-actions-test'");
 expect(src).toContain("def.kind==='notaria'?'notarias/create':'registros/create'");
});

test('PROD usa el gateway canónico y ya no necesita bloqueo temporal',async()=>{
 const src=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
 const guard=fs.readFileSync('src/ProductionWriteSafetyGuard.tsx','utf8');
 expect(src).toContain("'fenix-directory-actions'");
 expect(guard).not.toContain("'/notarias/nueva'");
 expect(guard).not.toContain("'/registros-propiedad/nuevo'");
});
