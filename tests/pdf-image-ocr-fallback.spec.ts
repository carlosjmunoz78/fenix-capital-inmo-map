import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const session={access_token:'qa-test-token',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}};

test('PDF usa todas las páginas y valida la capa de texto antes de omitir OCR',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'src/browserDocumentOcr.ts'),'utf8');
 expect(src).toContain("mime==='application/pdf'");
 expect(src).toContain('const pages=Number(pdf.numPages||0)');
 expect(src).not.toContain('Math.min(Number(pdf.numPages||0),12)');
 expect(src).toContain('embeddedTextFromContent');
 expect(src).toContain('usableEmbeddedText');
 expect(src).not.toContain('embedded.length>80');
 expect(src).toContain("page.getViewport({scale:1.8})");
 expect(src).toContain('page.render({canvasContext:ctx,viewport})');
 expect(src).toContain('await recognize(canvas)');
 expect(src).toContain("T.recognize(source,'spa')");
});

test('PDF sin capa de texto recorre el flujo real y OCRiza las páginas en español',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript((s:any)=>{
  localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));
  localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
  localStorage.setItem('fenix-remember-device','true');
  const w=window as any;w.__ocrRenderPages=[];w.__ocrLanguages=[];
  w.pdfjsLib={GlobalWorkerOptions:{workerSrc:''},getDocument:()=>({promise:Promise.resolve({numPages:2,getPage:async(pageNumber:number)=>({getTextContent:async()=>({items:[]}),getViewport:()=>({width:240,height:320}),render:({canvasContext}:any)=>{canvasContext.canvas.dataset.ocrPage=String(pageNumber);w.__ocrRenderPages.push(pageNumber);return{promise:Promise.resolve()};}})})})};
  w.Tesseract={recognize:async(source:any,lang:string)=>{w.__ocrLanguages.push(lang);const n=source?.dataset?.ocrPage||'?';return{data:{text:`DOCUMENTO NACIONAL DE IDENTIDAD\nAPELLIDOS: GARCIA LOPEZ\nNOMBRE: FRANCISCO\nNACIMIENTO: 12/05/1987\n12345678Z\nPAGINA ${n}`,confidence:91}};}};
 },session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});if(u.endsWith('/contactos/c1'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,contacto:{id:'c1',nombre:'Paco'}})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes/c1',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id:'c1',cliente:'Paco',estado:'Seguimiento',tipo:'Titular',relacion:'Cliente'}})}));
 await page.goto('/contactos/c1');
 await page.getByTestId('intelligent-document-open').click();
 const dialog=page.getByRole('dialog',{name:'Lectura inteligente de documento'});
 await dialog.locator('input[type=file]').setInputFiles({name:'DNI Francisco Garcia Lopez.pdf',mimeType:'application/pdf',buffer:Buffer.from([1,2,3])});
 await expect(page.getByText('12345678Z',{exact:true})).toBeVisible();
 const runtime=await page.evaluate(()=>({renderPages:(window as any).__ocrRenderPages,languages:(window as any).__ocrLanguages}));
 expect(runtime.renderPages).toEqual([1,2]);
 expect(runtime.languages).toEqual(['spa','spa']);
});
