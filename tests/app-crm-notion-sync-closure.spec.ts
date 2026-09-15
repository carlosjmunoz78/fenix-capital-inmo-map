import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('PROD operational detail writes never fall through to Notion test runtime',async()=>{
 const detail=read('src/OperationalRecordDetail.tsx');
 const router=read('src/operationalRecordActions.ts');
 expect(detail).toContain("runOperationalRecordAction(def.resource,id,item,clean)");
 expect(detail).not.toContain('fenix-notion-actions-test');
 expect(router).toContain('if(!IS_PRODUCTION)return legacyTestAction(resource,id,changes)');
 expect(router).toContain("if(resource==='documentos')return unsupported('document_detail_write_requires_canonical_contract')");
 expect(router).toContain("if(resource==='firmas')return unsupported('signature_detail_write_requires_explicit_lifecycle_mapping')");
});

test('task PROD lifecycle executes canonical complete reopen state and reassign through gateway',async()=>{
 const router=read('src/operationalRecordActions.ts');
 const taskRuntime=read('src/taskActionsRuntime.ts');
 const gateway=read('supabase/functions/fenix-app-gateway/index.ts');
 expect(router).toContain("action:'reassign'");
 expect(router).toContain("action:'state'");
 expect(router).toContain("action:changes[key]===true?'complete':'reopen'");
 expect(router).toContain('expected_version:version');
 expect(taskRuntime).toContain("fetchAppApi<TaskBulkResponse>('/tareas/actions'");
 expect(taskRuntime).toContain("if(input.action==='state'");
 expect(taskRuntime).toContain("if(input.action==='reassign'");
 expect(taskRuntime).not.toContain('/functions/v1/fenix-task-actions');
 expect(taskRuntime).not.toContain('fenix-notion-actions-test');
 expect(gateway).toContain("p==='/tareas/actions'&&req.method==='POST'");
 expect(gateway).toContain("fenix_prod_task_bulk_action_server");
 expect(gateway).toContain('p_items:Array.isArray(b.items)?b.items:[]');
 expect(gateway).toContain('p_action:b.action');
 expect(gateway).toContain("p_target_state:typeof b.target_state==='string'?b.target_state:null");
 expect(gateway).toContain("p_new_actor_code:typeof b.new_actor_code==='string'?b.new_actor_code:null");
});

test('appraisal PROD status uses gateway canonical route and unmapped fields fail closed',async()=>{
 const router=read('src/operationalRecordActions.ts');
 expect(router).toContain("fetchAppApi(`/tasaciones/${encodeURIComponent(id)}/status`");
 expect(router).toContain("unsupported('appraisal_only_status_is_mapped')");
 expect(router).toContain("unsupported('appraisal_version_required')");
});

test('PROD runtime reads use canonical gateway while Notion runtime remains test-only',async()=>{
 const notion=read('src/notionRuntime.ts');
 expect(notion).toContain('if(IS_PRODUCTION)return fetchProdCompatibility<T>(path)');
 expect(notion).toContain("const result=await fetchAppApi<unknown>(gatewayPath)");
 expect(notion).toContain('/functions/v1/fenix-notion-runtime-test');
});

test('expediente create and update contracts are gateway-backed in PROD',async()=>{
 const create=read('src/ExpedienteCreateShell.tsx');
 const compat=read('src/appRpcCompat.ts');
 expect(create).toContain("gatewayRpc<CreateResponse>('fenix_prod_exp_create'");
 expect(create).toContain('if(IS_PRODUCTION)');
 expect(compat).toContain("case 'fenix_prod_exp_create'");
 expect(compat).toContain("path='/expedientes'");
 expect(compat).toContain("case 'fenix_prod_exp_update'");
 expect(compat).toContain("method:'PATCH'");
});

test('operational detail labels the real canonical source instead of claiming Notion live in PROD',async()=>{
 const detail=read('src/OperationalRecordDetail.tsx');
 expect(detail).toContain("IS_PRODUCTION?'Fuente canónica PROD");
 expect(detail).toContain("IS_PRODUCTION?'PROD canónico':'Notion TEST'");
 expect(detail).not.toContain("status===200?'Notion vivo':'PRE-PROD'");
});
