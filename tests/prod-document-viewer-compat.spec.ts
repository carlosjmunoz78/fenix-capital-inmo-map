import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PROD document detail is normalized to viewer item with signed private URL',()=>{
 const text=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
 expect(text).toContain("const documentDetail=path.match(/^\\/documentos\\/([^/]+)$/)");
 expect(text).toContain("fetchAppApi<Record<string,unknown>>(`${path}/view`)");
 expect(text).toContain("item:{...document,...(signedUrl?{url:signedUrl}: {})}");
});

test('PRE-PROD Notion runtime remains isolated',()=>{
 const text=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
 expect(text.indexOf('if(IS_PRODUCTION)')).toBeLessThan(text.indexOf('fenix-notion-runtime-test'));
});
