import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Bancos usa bank_code canónico PROD en listado y detalle',()=>{
 const list=fs.readFileSync('src/BancosShell.tsx','utf8');
 const detail=fs.readFileSync('src/BancoDetailShell.tsx','utf8');
 expect(list).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
 expect(detail).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
 expect(detail).toContain("'bank_code','banco_code','banco_id','id_banco'");
});
