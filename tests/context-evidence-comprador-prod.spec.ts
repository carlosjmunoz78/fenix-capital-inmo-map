import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PROD permite evidencia contextual de comprador y conserva extracción',()=>{
 const src=fs.readFileSync(path.resolve('src/ContextEvidenceUpload.tsx'),'utf8');
 expect(src).toContain("new Set(['expediente','comprador','contacto','firma'])");
 expect(src).toContain("if(comprador)return{type:'comprador'");
 expect(src).toContain("EXTRACT_FUNCTION=IS_PRODUCTION?'fenix-document-extract'");
});
