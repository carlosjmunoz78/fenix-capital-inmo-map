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
 people:{count:3,titulares:2,avalistas:1,missing_data:1,missing_docs:1,next_person_data:{person_id:'p3',person_name:'María',field:{key:'situacion_laboral',label:'Situación laboral'}},items:[{id:'p1',name:'Jorge',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p2',name:'Alex',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p3',name:'María',role:'Avalista',docs_complete:false,reviewed:false,next_missing_field:{key:'situacion_laboral',label:'Situación laboral'}}]},
 execution_modes:{ana:true,help:true,manual:true},
 channels:{
  llamada:{canal:'Llamada',objetivo:'Confirmar documentación pendiente',guion:'Hola, Jorge y Alex. Soy de Fénix Capital y os llamo para confirmar la documentación pendiente del expediente.',preguntas:['¿Tenéis ya la vida laboral actualizada?','¿Cuándo podéis enviarla?'],resultado_esperado:'Confirmar disponibilidad y fijar una sola siguiente acción.'},
  whatsapp:{canal:'WhatsApp',texto:'Hola, Jorge y Alex. Para avanzar con vuestro expediente necesitamos confirmar la documentación pendiente.'},
  email:{canal:'Email',asunto:'Fénix Capital · documentación pendiente',cuerpo:'Hola, Jorge y Alex:\n\nNecesitamos confirmar la documentación pendiente para seguir avanzando.'}
 }
};
const adviceAfterSave={...advice,people:{...advice.people,next_person_data:{person_id:'p3',person_name:'María',field:{key:'sueldo_neto_mensual',label:'Sueldo neto mensual'}},items:[{id:'p1',name:'Jorge',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p2',name:'Alex',role:'Titular comprador',docs_complete:true,reviewed:true},{id:'p3',name:'María',role:'Avalista',docs_complete:false,reviewed:false,next_missing_field:{key:'sueldo_neto_mensual',label:'Sueldo neto mensual'}}]}};
const memory={ok:true,status:200,items:[{id:'m1',detail:'El cliente indicó que puede aportar la documentación mañana y pidió que se le recuerde.',memory_class:'Compromiso',source_actor:'FIN-A',created_at:'2026-08-22T10:00:00Z',evidence_count:1}]};
const financialContext={ok:true,status:200,source:'Base Maestra Belén · Motor financiero CEREBRO',authority:'Belén',approved_count:0,baseline:[
 {id:'BEL-DOC-001',category:'Documentación',text:'Antes de banco, documentación mínima operativa: vida laboral actualizada, contrato, 3 nóminas, movimientos bancarios, DNI y recibos de préstamos cuando existan.'},
 {id:'BEL-TAS-001',category:'Tasación',text:'Pre-tasación con nota simple y fotos. Si la expectativa se separa del patrón de zona, bloquear y pedir autorización antes de continuar. La validación técnica final corresponde al banco.',requires_belen:true},
 {id:'BEL-GOV-001',category:'Gobierno',text:'Un caso aislado no crea una regla general. Las decisiones financieras, legales, contractuales y de firma mantienen validación humana; Belén conserva la autoridad financiera final mientras el aprendizaje no esté suficientemente validado.',requires_belen:true}
],approved_rules:[],requires_belen_gate:true};

test.describe('Fénix PRE-PROD · ficha maestra de expediente',()=>{
 test('Ana usa datos vivos, contexto de Belén, comunicación empática, recalcula sin recarga y prepara contacto idempotente',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  let personSaved=false,personWrites=0;
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:3,titulares:2,avalistas:1,items:[{id:'p1',nombre:'Jorge',rol_operacion:'Titular comprador',documentacion_completa:true,datos_revisados_financiero:true},{id:'p2',nombre:'Alex',rol_operacion:'Titular comprador',documentacion_completa:true,datos_revisados_financiero:true},{id:'p3',nombre:'María',rol_operacion:'Avalista',situacion_laboral:personSaved?'Funcionario':null,documentacion_completa:false,datos_revisados_financiero:false}]})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
  await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(personSaved?adviceAfterSave:advice)}));
  await page.route('**/functions/v1/fenix-belen-financial-context-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(financialContext)}));
  await page.route('**/functions/v1/fenix-comprador-action-test/compradores/p3/action',async r=>{personWrites++;personSaved=true;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200})});});
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
  await expect(page.getByTestId('expediente-belen-financial-context')).toBeVisible();
  await expect(page.getByText('Criterios de Belén que Ana está usando',{exact:true})).toBeVisible();
  await expect(page.getByText(/documentación mínima operativa: vida laboral actualizada/)).toBeVisible();
  await expect(page.getByText(/Si hay una excepción, una duda financiera material o un criterio bancario que pueda haber cambiado/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Confirmar documentación pendiente',exact:true})).toBeVisible();
  await expect(page.getByText('Porque falta documentación crítica antes de poder avanzar de fase.')).toBeVisible();
  await expect(page.getByText('3 intervinientes',{exact:true})).toBeVisible();
  await expect(page.getByText('2 titulares · 1 avalista · 1 con datos pendientes · 1 con documentación pendiente',{exact:true})).toBeVisible();
  await expect(page.getByText('Siguiente dato pendiente: Situación laboral de María.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Completar este dato',exact:true}).dispatchEvent('click');
  const maria=page.getByTestId('exp-person-p3');
  await expect(maria).toBeVisible();
  await expect(maria.getByTestId('save-person-p3')).toBeVisible();
  await maria.locator('label').filter({hasText:'Situación laboral'}).locator('select').selectOption('Funcionario');
  await page.evaluate(()=>{(window as any).__fenixAnaNoReload='alive';});
  await maria.getByTestId('save-person-p3').dispatchEvent('click');
  expect(personWrites).toBe(0);
  await expect(maria.getByTestId('edit-person-preview-p3')).toBeVisible();
  await expect(maria.getByTestId('save-person-p3')).toContainText('Confirmar y guardar');
  await maria.getByTestId('save-person-p3').dispatchEvent('click');
  await expect.poll(()=>personWrites).toBe(1);
  await expect(page.getByText('Datos de la persona guardados y auditados.',{exact:true})).toBeVisible();
  await expect(page.getByText('Siguiente dato pendiente: Situación laboral de María.',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Siguiente dato pendiente: Sueldo neto mensual de María.',{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).__fenixAnaNoReload)).toBe('alive');
  await expect(page.getByText('Lo que recuerdo de este expediente',{exact:true})).toBeVisible();
  const doAna=page.getByRole('button',{name:'Que lo haga Ana',exact:true});
  await expect(doAna).toBeEnabled();
  await doAna.click();
  await expect(page.getByText('Ana ha preparado la comunicación en Fénix Uno. No se ha enviado: queda pendiente de revisión.',{exact:true})).toBeVisible();
  await doAna.click();
  await expect(page.getByText('Ana ya había preparado esta comunicación; no la he duplicado.',{exact:true})).toBeVisible();
  expect(prepCalls).toBe(2);
  await page.getByRole('button',{name:'WhatsApp',exact:true}).click();
  await expect(page.getByText(/Espero que estés bien\. Para seguir avanzando con tu expediente/)).toBeVisible();
  await expect(page.getByText(/Si necesitas ayuda o ahora no te viene bien/)).toBeVisible();
  await page.getByRole('button',{name:'Email',exact:true}).click();
  await expect(page.getByText('Fénix Capital · documentación pendiente',{exact:true})).toBeVisible();
  await expect(page.getByText(/Queremos que el proceso te resulte lo más claro y sencillo posible/)).toBeVisible();
  await expect(page.getByText(/dínoslo y buscamos contigo la mejor forma de resolverlo/)).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('ficha-expediente-master-1600',{body:shot,contentType:'image/png'});
 });
});
