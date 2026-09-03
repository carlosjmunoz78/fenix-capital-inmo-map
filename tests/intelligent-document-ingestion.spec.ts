import {test,expect} from '@playwright/test';
import {extractDocumentData} from '../src/browserDocumentOcr';

const session={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-intelligent-doc-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}};

test('parser DNI extrae identidad y fecha sin inventar',()=>{
 const r=extractDocumentData(`DOCUMENTO NACIONAL DE IDENTIDAD\nAPELLIDOS / SURNAME\nGARCIA LOPEZ\nNOMBRE / NAME\nFRANCISCO\nNACIMIENTO / DATE OF BIRTH\n12/05/1987\n12345678Z`,94);
 expect(r.documentType).toBe('DNI/NIE');expect(r.fields.documento_identidad).toBe('12345678Z');expect(r.fields.nombre).toBe('Francisco');expect(r.fields.apellidos).toBe('Garcia Lopez');expect(r.fields.fecha_nacimiento).toBe('1987-05-12');expect(r.summary).toContain('12345678Z');
});

test('documento ambiguo no fabrica datos personales',()=>{const r=extractDocumentData('FOTOCOPIA BORROSA SIN CAMPOS IDENTIFICABLES',40);expect(r.fields).toEqual({});expect(r.summary).toContain('no hay datos personales suficientemente claros');});

test('ficha contacto lee imagen, previsualiza y no escribe antes de confirmar',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');(window as any).Tesseract={recognize:async()=>({data:{text:'DOCUMENTO NACIONAL DE IDENTIDAD\nAPELLIDOS\nGARCIA LOPEZ\nNOMBRE\nFRANCISCO\nNACIMIENTO\n12/05/1987\n12345678Z',confidence:96}})};},session);
 let applyCalls=0,evidenceCalls=0;
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});if(u.endsWith('/contactos/c1'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,contacto:{id:'c1',nombre:'Paco'}})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes/c1',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id:'c1',cliente:'Paco',estado:'Seguimiento',tipo:'Titular',relacion:'Cliente'}})}));
 await page.route('**/functions/v1/fenix-evidence-universal-test/**',async r=>{evidenceCalls++;if(r.request().url().endsWith('/prepare'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,upload_id:'u1',storage_path:'DIR/evidence/c1/dni.jpg',token:'tok',max_bytes:12000000})});return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,document_page_id:'doc1'})});});
 await page.route('**/storage/v1/object/upload/sign/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.route('**/functions/v1/fenix-document-intelligence-test/apply',async r=>{applyCalls++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,updated:{nombre:'Francisco',apellidos:'Garcia Lopez'}})});});
 await page.goto('/contactos/c1');await page.getByTestId('intelligent-document-open').click();
 const input=page.getByRole('dialog',{name:'Lectura inteligente de documento'}).locator('input[type=file]');await input.setInputFiles({name:'dni.jpg',mimeType:'image/jpeg',buffer:Buffer.from('fake-image')});
 await expect(page.getByText('Francisco',{exact:true})).toBeVisible();await expect(page.getByText('12345678Z',{exact:true})).toBeVisible();expect(applyCalls).toBe(0);expect(evidenceCalls).toBe(0);
 await page.getByRole('button',{name:'Confirmar y aplicar datos'}).click();await expect.poll(()=>applyCalls).toBe(1);expect(evidenceCalls).toBeGreaterThanOrEqual(2);
});
