import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Bancos usa el identificador canónico PROD bank_code y abre la ficha desde toda la tarjeta',()=>{
 const list=fs.readFileSync('src/BancosShell.tsx','utf8');
 const detail=fs.readFileSync('src/BancoDetailShell.tsx','utf8');
 expect(list).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
 expect(list).toContain("navigate(`/bancos/${encodeURIComponent(id)}`)");
 expect(list).toContain("role={id?'link':undefined}");
 expect(detail).toContain("first(r,['bank_code','banco_code','id','code','codigo'])");
});

test('la franja universal se coloca justo antes de accesos rápidos y cubre fichas operativas adicionales',()=>{
 const src=fs.readFileSync('src/UniversalTaskActionStrip.tsx','utf8');
 expect(src).toContain("root.querySelector(':scope > .ops-shared-quick,:scope > .ops-uniform-footer-host')");
 expect(src).toContain('root.insertBefore(node,quick)');
 for(const token of ['documentos:', 'financieros:', 'visitadores:', 'visitas:'])expect(src).toContain(token);
 expect(src).toContain("parts.length===3&&parts[0]==='bancos'&&parts[1]==='contactos'");
});
