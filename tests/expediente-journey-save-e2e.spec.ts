import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-expediente-journey',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST',role:'Direccion'},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,expediente:'JORGE Y ALEX',cliente:'JORGE Y ALEX',fase:'Tasación',riesgo:'Medio',proxima_accion:'Revisar tasación'};
const advice={
 ok:true,status:200,action:'Revisar tasación',why:'El expediente está en revisión operativa.',
 evidence:{task_id:'task-journey',phase:'Tasación'},
 human:{instruction:'Revisar el expediente.',must_record:'resultado y siguiente acción'},
 ana:{would_do:'Preparar la siguiente acción.',can_execute:false,execution_kind:'help'},
 client:{name:'JORGE Y ALEX',email:'jorge@example.test',phone:'600000000'},
 people:{count:0,titulares:0,avalistas:0,missing_data:0,missing_docs:0,items:[]},
 execution_modes:{ana:false,help:true,manual:true},
 channels:{llamada:{canal:'Llamada',objetivo:'Revisar expediente',guion:'Revisar expediente',preguntas:[],resultado_esperado:'Siguiente acción'},whatsapp:{canal:'WhatsApp',texto:'Revisar expediente'},email:{canal:'Email',asunto:'Revisar expediente',cuerpo:'Revisar expediente'}}
};

test.describe('Fénix PRE-PROD · recorrido del expediente',()=>{
 test('mantiene cambio pendiente, controla 409/error, guarda una sola vez por click y no desborda',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);

  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));

  let currentStage='Tasación';
  let version=7;
  let writerMode:'conflict'|'error'|'success'='conflict';
  const writes:Array<{expediente_code?:string;expected_version?:number;stage?:string}>=[];

  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
   const u=r.request().url();
   if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
   if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});
   if(u.endsWith(`/expedientes/${id}/workspace`))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,expediente:{stage:currentStage,version,proxima_accion:'Revisar expediente'},lifecycle:{recorded_stage:currentStage,effective_stage:currentStage,stage_inconsistent:false,workflow_closed:false},qa:{blockers:[],warnings:[]},counts:{documentos:0,envios_banco:0,ofertas:0,tasaciones:0,firma:0}})});
   return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:0,titulares:0,avalistas:0,items:[]})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
  await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(advice)}));
  await page.route('**/functions/v1/fenix-belen-financial-context-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,source:'QA',authority:'Belén',approved_count:0,baseline:[],approved_rules:[],requires_belen_gate:true})}));
  await page.route(`**/functions/v1/fenix-bank-ranking-test/expedientes/${id}/ranking`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,ranking:[],policy:'QA',requires_belen_gate:true})}));
  await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[]})}));
  await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:true,can_correct_ana:true,can_view_learning_inbox:true}})}));
  await page.route('**/functions/v1/fenix-expediente-stage-test',async r=>{
   const body=r.request().postDataJSON() as {expediente_code?:string;expected_version?:number;stage?:string};
   writes.push(body);
   if(writerMode==='conflict'){
    expect(body).toEqual(expect.objectContaining({expediente_code:id,expected_version:7,stage:'Oferta'}));
    currentStage='FEIN';version=8;writerMode='error';
    return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'version_conflict'})});
   }
   if(writerMode==='error'){
    expect(body).toEqual(expect.objectContaining({expediente_code:id,expected_version:8,stage:'Notaría'}));
    writerMode='success';
    return r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'qa_forced_error'})});
   }
   expect(body).toEqual(expect.objectContaining({expediente_code:id,expected_version:8,stage:'Notaría'}));
   currentStage=String(body.stage||currentStage);version=9;
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200})});
  });

  await page.goto(`/expedientes/${id}`);
  const journey=page.getByTestId('expediente-journey');
  await expect(journey).toBeVisible();
  await expect(journey.locator('[aria-label="Fases del expediente"] > div')).toHaveCount(10);
  await expect(journey.locator('[aria-current="step"] small')).toHaveText('Tasación');

  const select=page.getByTestId('expediente-stage-select');
  const save=page.getByTestId('expediente-stage-save');
  await expect(select).toHaveValue('Tasación');
  await expect(save).toBeDisabled();

  await select.selectOption('Oferta');
  expect(writes).toHaveLength(0);
  await expect(journey.locator('[aria-current="step"] small')).toHaveText('Tasación');
  await expect(save).toBeEnabled();

  await save.click();
  await expect.poll(()=>writes.length).toBe(1);
  await expect(page.getByRole('status')).toContainText('sin sobrescribirlo');
  await expect(select).toHaveValue('FEIN');
  await expect(journey.locator('[aria-current="step"] small')).toHaveText('FEIN');
  await expect(save).toBeDisabled();

  await select.selectOption('Notaría');
  await save.click();
  await expect.poll(()=>writes.length).toBe(2);
  await expect(page.getByRole('status')).toHaveText('No se pudo cambiar el estado. No se ha aplicado ningún cambio.');
  await expect(journey.locator('[aria-current="step"] small')).toHaveText('FEIN');
  await expect(select).toHaveValue('Notaría');
  await expect(save).toBeEnabled();

  await save.click();
  await expect.poll(()=>writes.length).toBe(3);
  await expect(page.getByRole('status')).toContainText('Estado actualizado a Notaría');
  await expect(select).toHaveValue('Notaría');
  await expect(journey.locator('[aria-current="step"] small')).toHaveText('Notaría');
  await expect(save).toBeDisabled();

  const desktopShot=await journey.screenshot();
  await testInfo.attach('recorrido-expediente-desktop',{body:desktopShot,contentType:'image/png'});

  await page.setViewportSize({width:900,height:900});
  const trackBox=await journey.locator('[aria-label="Fases del expediente"]').boundingBox();
  const buttonBox=await save.boundingBox();
  expect(trackBox).not.toBeNull();expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y).toBeGreaterThan(trackBox!.y);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const responsiveShot=await journey.screenshot();
  await testInfo.attach('recorrido-expediente-responsive-900',{body:responsiveShot,contentType:'image/png'});
 });
});
