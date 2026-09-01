import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('altas de notaría y registro usan solo el endpoint de directorio PRE-PROD',async()=>{
 const src=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
 expect(src).toContain('fenix-directory-actions-test/');
 expect(src).toContain("def.kind==='notaria'?'notarias/create':'registros/create'");
});

test('PROD mantiene bloqueadas notarías y registros hasta promoción backend',async()=>{
 const guard=fs.readFileSync('src/ProductionWriteSafetyGuard.tsx','utf8');
 expect(guard).toContain("'/notarias/nueva'");
 expect(guard).toContain("'/registros-propiedad/nuevo'");
});
