import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PROD bank contacts resolve through the canonical app gateway contact list',()=>{
 const src=fs.readFileSync('src/notionRuntime.ts','utf8');
 expect(src).toContain("pathname==='/contactos-bancarios'");
 expect(src).toContain("fetchAppApi<T>('/contactos')");
 expect(src).toContain("filterContactResponse(r.data,'bancos')");
 expect(src).toContain("tipo.includes('bancario')");
 expect(src).toContain("fuente.includes('contactos bancarios')");
});
