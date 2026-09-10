import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Bancos usa bank_code canónico PROD en listado y detalle',()=>{
 const list=fs.readFileSync('src/BancosShell.tsx','utf8');
 const detail=fs.readFileSync('src/BancoDetailShell.tsx','utf8');
 expect(list).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
 expect(detail).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
 expect(detail).toContain("'bank_code','banco_code','banco_id','id_banco'");
});

test('Alta de banco usa únicamente API PROD con revisión previa y deduplicación',()=>{
 const create=fs.readFileSync('src/BankCreateShell.tsx','utf8');
 expect(create).toContain("fetchEnvironmentApi<CreateBankResponse>('fenix-bank-api'");
 expect(create).toContain('Revisar antes de crear');
 expect(create).toContain('Ese banco ya existe. No se ha creado un duplicado.');
 expect(create).not.toContain('fenix-bank-actions');
 expect(create).not.toContain('IS_PRODUCTION');
 expect(create).not.toContain('PRE-PROD');
});
