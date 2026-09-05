import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const upload=fs.readFileSync(path.join(process.cwd(),'src/ContextEvidenceUpload.tsx'),'utf8');
const preview=fs.readFileSync(path.join(process.cwd(),'src/ExtractedDocumentPreview.tsx'),'utf8');

test('PDF extraction opens structured preview and keeps automatic apply visible',()=>{
 expect(upload).toContain("import ExtractedDocumentPreview from './ExtractedDocumentPreview'");
 expect(upload).toContain('showPreview(file.name,x.data,x.status)');
 expect(upload).toContain('window.location.reload()');
 expect(upload).toContain('Audio y contextos sin contrato productivo permanecen bloqueados');
 expect(preview).toContain('VISTA PREVIA INTELIGENTE');
 expect(preview).toContain('data-testid="document-extraction-preview"');
 expect(preview).toContain('Los datos válidos se han aplicado automáticamente a la ficha.');
 expect(preview).toContain('Hay conflictos: no se ha sobrescrito ningún dato existente.');
 expect(preview).toContain('DNI / NIE / Pasaporte');
 expect(preview).toContain('Ingresos netos / mes');
 expect(preview).toContain('Ver ficha ya actualizada');
});

test('legacy backfill can return extracted fields to the same preview',()=>{
 expect(upload).toContain("mode:'legacy_batch'");
 expect(upload).toContain('item.extraction?.fields');
 expect(upload).toContain('setPreview(lastPreview)');
});
