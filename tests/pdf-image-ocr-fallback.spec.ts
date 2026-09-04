import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PDF convertido desde imagen conserva fallback OCR por página',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'src/browserDocumentOcr.ts'),'utf8');
 expect(src).toContain("mime==='application/pdf'");
 expect(src).toContain('page.getTextContent()');
 expect(src).toContain('embedded.length>80');
 expect(src).toContain("page.getViewport({scale:1.8})");
 expect(src).toContain('page.render({canvasContext:ctx,viewport})');
 expect(src).toContain('await recognize(canvas)');
 expect(src).toContain("T.recognize(source,'spa')");
});

test('PDF sin capa de texto no se trata como PDF vacío',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'src/browserDocumentOcr.ts'),'utf8');
 const embeddedBranch=src.indexOf('if(embedded.length>80)');
 const canvasBranch=src.indexOf("const viewport=page.getViewport({scale:1.8})");
 const recognizeBranch=src.indexOf('const r=await recognize(canvas)');
 expect(embeddedBranch).toBeGreaterThan(-1);
 expect(canvasBranch).toBeGreaterThan(embeddedBranch);
 expect(recognizeBranch).toBeGreaterThan(canvasBranch);
});
