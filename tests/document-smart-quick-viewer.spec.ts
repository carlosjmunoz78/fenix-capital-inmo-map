import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const viewer=fs.readFileSync(path.join(process.cwd(),'src/DocumentViewerShell.tsx'),'utf8');

test('smart quick viewer stays modal, contextual and non-destructive',async()=>{
 expect(viewer).toContain('VISTA RÁPIDA INTELIGENTE');
 expect(viewer).toContain('role="dialog"');
 expect(viewer).toContain('aria-modal="true"');
 expect(viewer).toContain('position:fixed;inset:0');
 expect(viewer).toContain('height:min(88vh,980px)');
 expect(viewer).toContain('Datos exactos del documento');
 expect(viewer).toContain('Completitud · inferencia');
 expect(viewer).toContain('Requiere validación humana antes de cualquier corrección.');
 expect(viewer).toContain('Relaciones');
 expect(viewer).toContain('Acciones seguras');
 expect(viewer).toContain('Abrir original');
 expect(viewer).toContain("u.protocol==='https:'||u.protocol==='http:'");
 expect(viewer).toContain("event.key==='Escape'");
 expect(viewer).not.toMatch(/authenticatedEdgeFetch\([^)]*['\"]fenix-[^'\"]*(?<!-test)['\"]/);
});
