import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const runtime=fs.readFileSync(path.join(process.cwd(),'src/notionRuntime.ts'),'utf8');

test('PROD bank contacts reuse canonical contacts gateway',()=>{
  expect(runtime).toContain("const bankContactMode=path==='/contactos-bancarios'");
  expect(runtime).toContain("const bankContactDetail=path.match(/^\\/contactos-bancarios\\/([^/]+)$/)");
  expect(runtime).toContain("const gatewayPath=contactMode||bankContactMode?'/contactos':path");
  expect(runtime).toContain("fetchAppApi<Record<string,unknown>>(`/contactos/${encodeURIComponent(id)}`)");
  expect(runtime).toContain('envelope.items.filter(isBankContact)');
  expect(runtime).not.toContain("fetchAppApi<unknown>('/contactos-bancarios')");
});
