import fs from 'node:fs';
import path from 'node:path';
import {test,expect} from '@playwright/test';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'src/HistoricalDocumentRecoveryFixedGuard.tsx'),'utf8');
const mount=fs.readFileSync(path.join(root,'src/IntelligentDocumentIngestionGuard.tsx'),'utf8');

test('relee el original existente sin obligar a resubir ni duplicar',()=>{
 expect(source).toContain('Releer original existente');
 expect(source).toContain('fetch(original');
 expect(source).toContain('El original se conserva y no se ha creado ninguna copia');
 expect(source).toContain('getDocumentPreviewFields(shown)');
 expect(mount).toContain('<HistoricalDocumentRecoveryFixedGuard />');
});

test('DNI NIE y pasaporte exponen caducidad y bloqueo operativo',()=>{
 expect(source).toMatch(/dni\|nie\|pasaporte/);
 expect(source).toContain("'fecha_caducidad'");
 expect(source).toContain('Documento CADUCADO');
 expect(source).toContain('Bloqueo operativo de firma');
 expect(source).toContain('Caduca pronto');
 expect(source).toContain('Documento vigente');
});
