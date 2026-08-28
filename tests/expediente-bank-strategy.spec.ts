import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-bank-strategy',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,expediente:'JORGE Y ALEX',cliente:'JORGE Y ALEX',fase:'Tasación',riesgo:'Medio',proxima_accion:'Confirmar documentación pendiente'};
const advice={ok:true,status:200,action:'Confirmar documentación pendiente',why:'Falta documentación crítica.',evidence:{phase:'Tasación'},human:{instruction:'Confirmar documentación.',must_record:'resultado real'},ana:{would_do:'Preparar comunicación.',can_execute:false,blocked_by:'Revisión necesaria.'},client:{name:'Jorge',email:'jorge@example.test',phone:'600000000'},people:{count:1,titulares:1,avalistas:0,missing_data:0,missing_docs:0,items:[{id:'p1',name:'Jorge',role:'Titular comprador',docs_complete:true,reviewed:true}]},execution_modes:{ana:false,help:true,manual:true},channels:{llamada:{guion:'Hola Jorge',preguntas:[],resultado_esperado:'Confirmar'},whatsapp:{texto:'Hola Jorge'},email:{asunto:'Seguimiento',cuerpo:'Hola Jorge'}}};
const strategyResponse={ok:true,status:200,ranking:[
 {bank_id:'bank-1',bank:'Banco Uno',score:91,reasons:['Tiene financiación alta informada.','Funcionario figura como perfil fuerte.'],risks:[],confidence:90},
 {bank_id:'bank-2',bank:'Banco Dos',score:78,reasons:['LTV habitual compatible.'],risks:['Condiciones sin revisión reciente; revalidar antes de enviar.'],confidence:75},
 {bank_id:'bank-3',bank:'Banco Tres',score:66,reasons:['Admite el perfil.'],risks:['Criterio por confirmar.'],confidence:65}
],strategy:[
 {order:1,bank_id:'bank-1',bank:'Banco Uno',score:91,label:'Primera opción para estudiar',why:['Tiene financiación alta informada.'],verify_before:['Confirmar que la documentación del expediente está completa y actualizada antes de presentarlo.','Verificar que el porcentaje solicitado (100 %) sigue encajando en las condiciones actuales del banco.'],move_to_next_when:'Pasar a la siguiente opción solo si existe rechazo o incompatibilidad documentada, cambian las condiciones del banco, o Belén decide que esta alternativa ya no es la adecuada para el caso.',stop_and_escalate:'Belén valida la estrategia antes de cualquier presentación bancaria.',requires_belen:true},
 {order:2,bank_id:'bank-2',bank:'Banco Dos',score:78,label:'Segunda opción si la primera no encaja',why:['LTV habitual compatible.'],verify_before:['Revalidar con la entidad las condiciones actuales antes de presentar el expediente.'],move_to_next_when:'Pasar a la siguiente opción solo si existe rechazo o incompatibilidad documentada, cambian las condiciones del banco, o Belén decide que esta alternativa ya no es la adecuada para el caso.',stop_and_escalate:'Escalar a Belén ante una excepción, una duda financiera material, condiciones no verificadas o si ninguna alternativa mantiene un encaje suficiente.',requires_belen:true},
 {order:3,bank_id:'bank-3',bank:'Banco Tres',score:66,label:'Tercera opción de respaldo',why:['Admite el perfil.'],verify_before:['Revalidar con la entidad las condiciones actuales antes de presentar el expediente.'],move_to_next_when:null,stop_and_escalate:'Escalar a Belén ante una excepción, una duda financiera material, condiciones no verificadas o si ninguna alternativa mantiene un encaje suficiente.',requires_belen:true}
],strategy_status:'proposed_for_belen_review',policy:'No equivale a aprobación bancaria ni autoriza una presentación.',requires_belen_gate:true};

test('expediente muestra plan bancario A → B → C sin autorizar envíos',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:1,titulares:1,avalistas:0,items:[{id:'p1',nombre:'Jorge',rol_operacion:'Titular comprador',documentacion_completa:true,datos_revisados_financiero:true}]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(advice)}));
 await page.route('**/functions/v1/fenix-belen-financial-context-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,baseline:[],approved_rules:[]})}));
 await page.route(`**/functions/v1/fenix-bank-ranking-test/expedientes/${id}/ranking`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(strategyResponse)}));
 await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:true,can_correct_ana:true,can_view_learning_inbox:true}})}));
 await page.goto(`/expedientes/${id}`);
 const plan=page.getByTestId('expediente-bank-strategy');
 await expect(plan).toBeVisible();
 await expect(plan.getByText('Plan bancario recomendado',{exact:true})).toBeVisible();
 await expect(plan.getByText(/PASO 1 · Primera opción para estudiar/)).toBeVisible();
 await expect(plan.getByText(/PASO 2 · Segunda opción si la primera no encaja/)).toBeVisible();
 await expect(plan.getByText(/PASO 3 · Tercera opción de respaldo/)).toBeVisible();
 await expect(plan.getByText(/Cuándo pasar a la siguiente opción:/).first()).toBeVisible();
 await expect(plan.getByText(/rechazo o incompatibilidad documentada/).first()).toBeVisible();
 await expect(plan.getByText(/Revalidar con la entidad las condiciones actuales/).first()).toBeVisible();
 await expect(plan.getByText(/Escalar a Belén ante una excepción/).first()).toBeVisible();
 await expect(plan.getByText(/no para enviar el expediente automáticamente/)).toBeVisible();
 await expect(plan.getByText(/Belén revisa la secuencia y decide antes de cualquier presentación bancaria/)).toBeVisible();
});
