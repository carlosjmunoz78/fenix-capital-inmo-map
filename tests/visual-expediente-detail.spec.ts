import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-detail-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,expediente:'JORGE Y ALEX',cliente:'JORGE Y ALEX',fase:'Tasación',riesgo:'Medio',proxima_accion:'Confirmar documentación pendiente'};
const advice={
 ok:true,status:200,action:'Confirmar documentación pendiente',why:'Porque falta documentación crítica antes de poder avanzar de fase.',
 evidence:{task_id:'task-1',phase:'Tasación',blocking_reason:'Falta vida laboral actualizada'},
 human:{instruction:'Llama al cliente y confirma qué documentación puede aportar hoy.',must_record:'resultado real + compromiso + una sola siguiente acción'},
 ana:{would_do:'Puedo preparar una comunicación idempotente, pero no la enviaré ni cerraré la tarea sin un gate posterior.',can_execute:true,execution_kind:'prepare_contact'},
 client:{name:'JORGE Y ALEX',email:'jorge@example.test',phone:'600000000'},
 people:{count:3,titulares:2,avalistas:1,missing_docs:1,items:[{id:'p1',name:'Jorge',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p2',name:'Alex',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p3',name:'María',role:'Avalista',docs_complete:false,reviewed:true}]},
 execution_modes:{ana:true,help:true,manual:true},
 channels:{
  llamada:{canal:'Llamada',objetivo:'Confirmar documentación pendiente',guion:'Hola, Jorge y Alex. Soy de Fénix Capital y os llamo para confirmar la documentación pendiente del expediente.',preguntas:['¿Tenéis ya la vida laboral actualizada?','¿Cuándo podéis enviarla?'],resultado_esperado:'Confirmar disponibilidad y fijar una sola siguiente acción.'},
  whatsapp:{canal:'WhatsApp',texto:'Hola, Jorge y Alex. Para avanzar con vuestro expediente necesitamos confirmar la documentación pendiente.'},
  email:{canal:'Email',asunto:'Fénix Capital · documentación pendiente',cuerpo:'Hola, Jorge y Alex:\n\nNecesitamos confirmar la documentación pendiente para seguir avanzando.'}
 }
};
const memory={ok:true,status:200,items:[{id:'m1',detail:'El cliente indicó que puede aportar la documentación mañana y pidió que se le recuerde.',memory_class:'Compromiso',source_actor:'FIN-A',created_at:'2026-08-22T10:00:00Z',evidence_count:1}]};

test.describe('Fénix PRE-PROD · ficha maestra de expediente',()=>{
 test('Ana usa datos vivos y prepara contacto idempotente sin enviar',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:3,titulares:2,avalistas:1,items:advice.people.items})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
  await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(advice)}));
  let prepCalls=0;
  await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/prepare-contact`,async r=>{prepCalls++;return r.fulfill({status:prepCalls===1?201:200,contentType:'application/json',body:JSON.stringify({ok:true,status:prepCalls===1?201:200,reused:prepCalls>1,no_op:prepCalls>1,communication_page_id:'comm-page-1',channel:'Llamada',external_sent:false,requires_approval:true})});});
  await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(memory)}));
  await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:true,can_correct_ana:true,can_view_learning_inbox:true}})}));
  await page.goto(`/expedientes/${id}`);
  await expect(page.getByText('FICHA MAESTRA')).toBeVisible();
  await expect(page.getByRole('heading',{name:'JORGE Y ALEX',exact:true})).toBeVisible();
  await expect(page.getByText('RECORRIDO DEL EXPEDIENTE')).toBeVisible();
  await expect(page.locator('.detail-phase-track small').filter({hasText:'Tasación'})).toBeVisible();
  await expect(page.getByTestId('expediente-ana-runtime')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Confirmar documentación pendiente',exact:true})).toBeVisible();
  await expect(page.getByText('Porque falta documentación crítica antes de poder avanzar de fase.')).toBeVisible();
  await expect(page.getByText('3 intervinientes',{exact:true})).toBeVisible();
  await expect(page.getByText('2 titulares · 1 avalista · 1 con documentación pendiente',{exact:true})).toBeVisible();
  await expect(page.getByText('Lo que recuerdo de este expediente',{exact:true})).toBeVisible();
  const doAna=page.getByRole('button',{name:'Que lo haga Ana',exact:true});
  await expect(doAna).toBeEnabled();
  await doAna.click();
  await expect(page.getByText('Ana ha preparado la comunicación en Fénix Uno. No se ha enviado: queda pendiente del gate correspondiente.',{exact:true})).toBeVisible();
  await doAna.click();
  await expect(page.getByText('Ana ya había preparado esta comunicación; no la he duplicado.',{exact:true})).toBeVisible();
  expect(prepCalls).toBe(2);
  await page.getByRole('button',{name:'WhatsApp',exact:true}).click();
  await expect(page.getByText('Hola, Jorge y Alex. Para avanzar con vuestro expediente necesitamos confirmar la documentación pendiente.')).toBeVisible();
  await page.getByRole('button',{name:'Email',exact:true}).click();
  await expect(page.getByText('Fénix Capital · documentación pendiente',{exact:true})).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('ficha-expediente-master-1600',{body:shot,contentType:'image/png'});
 });
});
