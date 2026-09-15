import fs from 'node:fs';
import {expect,test} from '@playwright/test';
import {createExpedientePerson,getExpedientePeople,updateExpedientePerson,type GatewaySender} from '../src/expedientePeopleContract';
import {executeTaskBulkAction,type TaskBulkAction,type TaskBulkSender} from '../src/taskActionsContract';

type Captured={path:string;init?:RequestInit};
let captured:Captured[]=[];
let status=200;
let responseBody:unknown={ok:true,status:200};
const taskSend:TaskBulkSender=async(path,init)=>{captured.push({path,init});return{status,data:responseBody as any}};
const gatewaySend:GatewaySender=async<T>(path:string,init?:RequestInit)=>{captured.push({path,init});return{status,data:responseBody as T}};

test.describe.configure({mode:'serial'});
test.beforeEach(()=>{
 captured=[];status=200;responseBody={ok:true,status:200};
});

test('task actions conserva 1, 5 y N items para complete, reopen, state y reassign',async()=>{
 const actions:TaskBulkAction[]=['complete','reopen','state','reassign'];
 for(const count of [1,5,37])for(const action of actions){
  captured=[];
  const items=Array.from({length:count},(_,i)=>({task_code:`TASK-${i+1}`,expected_version:i+3}));
  const input={items,action,target_state:action==='state'?'En curso':null,new_actor_code:action==='reassign'?'FIN-002':null,comment:`qa-${action}-${count}`};
  const result=await executeTaskBulkAction(taskSend,input);
  expect(result.status).toBe(200);
  expect(captured).toHaveLength(1);
  expect(captured[0].path).toBe('/tareas/actions');
  expect(JSON.parse(String(captured[0].init?.body))).toEqual(input);
 }
});

test('task actions propaga 409 por expected_version incorrecta y no reintenta parcialmente',async()=>{
 status=409;responseBody={ok:false,status:409,error:'version_conflict',task_code:'TASK-2'};
 const items=[{task_code:'TASK-1',expected_version:8},{task_code:'TASK-2',expected_version:1}];
 const result=await executeTaskBulkAction(taskSend,{items,action:'complete',comment:'atomic-check'});
 expect(result).toEqual({status:409,data:responseBody});
 expect(captured).toHaveLength(1);
 expect(JSON.parse(String(captured[0].init?.body))).toMatchObject({items,action:'complete'});
});

test('task actions propaga 403 sin fallback permisivo',async()=>{
 status=403;responseBody={ok:false,status:403,error:'forbidden'};
 expect(await executeTaskBulkAction(taskSend,{items:[{task_code:'TASK-1',expected_version:8}],action:'reopen'})).toEqual({status:403,data:responseBody});
 expect(captured).toHaveLength(1);
});

test('people GET conserva participantes, documentos y perfil laboral por Gateway',async()=>{
 responseBody={ok:true,status:200,count:1,items:[{id:'CLI-1',nombre:'Laura',situacion_laboral:'Indefinida',empresa_organismo:'Fenix SL',documentos:[{document_code:'DOC-1',title:'DNI',analysis_state:'Validado'}]}]};
 const result=await getExpedientePeople(gatewaySend,'EXP 001');
 expect(result).toEqual({status:200,data:responseBody});
 expect(captured[0].path).toBe('/expedientes/EXP%20001/people');
 expect(captured[0].init).toBeUndefined();
});

test('people create y update conservan payload, identidad y códigos',async()=>{
 status=201;responseBody={ok:true,status:201,id:'CLI-9'};
 expect(await createExpedientePerson(gatewaySend,'EXP-9',{nombre:'Ana',rol_operacion:'Avalista'})).toEqual({status:201,data:responseBody});
 expect(JSON.parse(String(captured[0].init?.body))).toEqual({action:'create',payload:{nombre:'Ana',rol_operacion:'Avalista'}});
 captured=[];status=200;responseBody={ok:true,status:200,id:'CLI-9'};
 expect(await updateExpedientePerson(gatewaySend,'EXP-9','CLI-9',{situacion_laboral:'Autónoma'})).toEqual({status:200,data:responseBody});
 expect(JSON.parse(String(captured[0].init?.body))).toEqual({action:'update',client_code:'CLI-9',changes:{situacion_laboral:'Autónoma'}});
});

test('people propaga 403 y 409 sin reintentos ni escrituras alternativas',async()=>{
 status=403;responseBody={ok:false,status:403,error:'forbidden'};
 expect(await createExpedientePerson(gatewaySend,'EXP-1',{nombre:'Sin permiso'})).toEqual({status:403,data:responseBody});
 captured=[];status=409;responseBody={ok:false,status:409,error:'identity_conflict',existing_id:'CLI-1'};
 expect(await updateExpedientePerson(gatewaySend,'EXP-1','CLI-2',{dni_nie:'11111111A'})).toEqual({status:409,data:responseBody});
 expect(captured).toHaveLength(1);
});

test('Gateway usa contrato bulk canónico y envuelve people sin duplicar su dominio',()=>{
 const gateway=fs.readFileSync('supabase/functions/fenix-app-gateway/index.ts','utf8');
 const taskRuntime=fs.readFileSync('src/taskActionsRuntime.ts','utf8');
 const peopleRuntime=fs.readFileSync('src/ExpedientePeopleProdGuard.tsx','utf8');
 const peopleContract=fs.readFileSync('src/expedientePeopleContract.ts','utf8');
 expect(gateway).toContain("contract_version:4");
 expect(gateway).toContain("p_items:Array.isArray(b.items)?b.items:[]");
 expect(gateway).toContain("fenix_prod_task_bulk_action_server");
 expect(gateway).toContain("delegate(req,'fenix-expediente-people'");
 expect(gateway).toContain("authorization,apikey:c.ANON");
 expect(gateway).not.toContain('fenix_prod_exp_people_server');
 expect(taskRuntime).toContain('executeTaskBulkAction(fetchAppApi,input)');
 expect(taskRuntime).not.toContain('items.length!==1');
 expect(taskRuntime).not.toContain('/functions/v1/fenix-task-actions');
 expect(peopleContract).toContain('/people`');
 expect(peopleRuntime).not.toContain('/functions/v1/fenix-expediente-people');
});
