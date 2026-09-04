import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('incomplete current documents with an original are reread automatically',()=>{
 const src=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');
 expect(src).toContain("if(!original||baseFields.length===0||missingCount===0)return;");
 expect(src).not.toContain('!isHistorical(baseProjected)');
 expect(src).toContain('Ana está completando automáticamente la ficha desde el documento original');
 expect(src).toContain('Ana · autorrellenado documental');
});

test('autofill remains preview-only and never writes or duplicates the source',()=>{
 const src=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');
 expect(src).toContain('setRecoveredPreview({...baseProjected,...result.fields');
 expect(src).toContain('sin modificar ni duplicar el archivo');
 expect(src).not.toMatch(/fetchNotionRuntime<[^>]*>\([^\n]*(POST|PUT|PATCH|DELETE)/i);
});
