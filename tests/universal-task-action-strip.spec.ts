import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-universal-task-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};

test('la franja universal crea una tarea con origen, canal, contexto, Ana y corrección humana',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes/c1',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id:'c1',cliente:'CARMELO',estado:'Seguimiento',tipo:'Titular',relacion:'Cliente'}})}));
 await page.route('**/functions/v1/fenix-ana-canonical-test/rules?domain=Hipotecas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'r1',rule:'Confirmar siempre el siguiente paso antes de prometer una fecha.',approved:true,state:'Aprobada'}]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/prepare-message',r=>r.fulfill({status:404,contentType:'application/json',body:'{}'}));
 let created:any=null;
 await page.route('**/functions/v1/fenix-notion-actions-test/tareas/create',async r=>{created=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'task|qa',destino:'/tareas/task%7Cqa'})})});
 await page.goto('/contactos/c1');
 const strip=page.getByTestId('universal-task-action-strip');await expect(strip).toBeVisible();
 await strip.getByLabel('QUÉ HA PASADO').fill('El cliente confirma que ya tiene la documentación.');
 await strip.getByLabel('QUÉ HAY QUE HACER').fill('pedir que envíe el PDF por WhatsApp');
 await strip.getByRole('button',{name:'Que lo prepare Ana'}).click();
 await expect(page.getByTestId('task-action-ana-draft')).toBeVisible();
 await strip.getByLabel('CORRECCIÓN / MATIZ DEL USUARIO').fill('Pedirlo con tono cercano y sin prometer plazo.');
 await strip.getByRole('button',{name:'Revisar tarea'}).click();
 await expect(page.getByTestId('task-action-preview')).toBeVisible();
 await strip.getByRole('button',{name:'Confirmar y crear tarea'}).click();
 await expect(strip.getByRole('status')).toContainText('Tarea creada y vinculada al contexto');
 expect(created).toMatchObject({origin_type:'contacto',origin_code:'c1',action_channel:'whatsapp',happened:'El cliente confirma que ya tiene la documentación.',planned_action:'pedir que envíe el PDF por WhatsApp',user_correction:'Pedirlo con tono cercano y sin prometer plazo.'});
 expect(typeof created.ana_draft).toBe('string');expect(created.ana_draft.length).toBeGreaterThan(10);
});

test('el contrato universal cubre expedientes, obra nueva, herencia y todos los interlocutores pedidos',()=>{
 const ui=fs.readFileSync('src/UniversalTaskActionStrip.tsx','utf8');
 for(const token of ['expedientes','herencias','obras-nuevas','bancos','contactos','inmobiliarias','tasaciones','tasadores','notarias','registros-propiedad','tareas'])expect(ui).toContain(token);
 for(const token of ["'whatsapp'","'email'","'llamada'","'tarea'",'QUÉ HA PASADO','QUÉ HAY QUE HACER','CORRECCIÓN / MATIZ DEL USUARIO','Que lo prepare Ana'])expect(ui).toContain(token);
 const sql=fs.readFileSync('supabase/task_context_migration_20260903.sql','utf8');
 for(const token of ['origin_type','origin_code','action_channel','happened','planned_action','ana_draft','user_correction','expediente_id','inmobiliaria_id'])expect(sql).toContain(token);
 const edge=fs.readFileSync('supabase/functions/fenix-task-api/index.ts','utf8');
 for(const token of ['p_origin_type','p_origin_code','p_action_channel','p_happened','p_planned_action','p_ana_draft','p_user_correction'])expect(edge).toContain(token);
});
