import fs from 'node:fs';

const targets=[
 'src/ChatShell.tsx','src/ContactCreateShell.tsx','src/DetailShell.tsx','src/ExpedienteCreateShell.tsx',
 'src/ExpedienteManualPhaseGuard.tsx','src/ExpedienteRenameGuard.tsx','src/FirmaCreateShell.tsx','src/NotificationsShell.tsx'
];
const rpcs=new Set([
 'fenix_prod_chat_list_user','fenix_prod_chat_send_user','fenix_prod_contact_create','fenix_prod_exp_create',
 'fenix_prod_exp_update','fenix_prod_notification_mark_user','fenix_prod_notifications_list_user','fenix_prod_sign_create'
]);
for(const file of targets){
 let s=fs.readFileSync(file,'utf8');
 let changed=false;
 s=s.replace(/supabase\.rpc\('([^']+)'/g,(m,name)=>{if(!rpcs.has(name))return m;changed=true;return `gatewayRpc('${name}'`;});
 if(changed&&!s.includes("from './appRpcCompat'")){
   const lines=s.split('\n');
   const at=lines.findIndex(x=>x.startsWith("import "));
   lines.splice(Math.max(0,at),0,"import {gatewayRpc} from './appRpcCompat';");
   s=lines.join('\n');
 }
 fs.writeFileSync(file,s);
}

const gateway='supabase/functions/fenix-app-gateway/index.ts';
let g=fs.readFileSync(gateway,'utf8');
function inject(anchor,block){if(!g.includes(block.trim())){if(!g.includes(anchor))throw new Error(`anchor_missing:${anchor}`);g=g.replace(anchor,`${block}\n${anchor}`)}}
inject("if(p==='/expedientes'&&req.method==='GET')",`if(p==='/expedientes'&&req.method==='POST')return result(req,await rpc('fenix_prod_exp_create_server',{p_actor_code:a,p_cliente_nombre:b.cliente_nombre,p_cliente_apellidos:b.cliente_apellidos||null,p_cliente_email:b.cliente_email||null,p_cliente_telefono:b.cliente_telefono||null,p_localidad:b.localidad||null,p_precio_vivienda:b.precio_vivienda??null,p_importe_solicitado:b.importe_solicitado??null,p_owner_actor_code:b.owner_actor_code||null,p_inmobiliaria_code:b.inmobiliaria_code||null,p_payload_operacion:b.payload_operacion||{},p_consentimiento_comercial:Boolean(b.consentimiento_comercial)}));`);
inject("if(s[0]==='expedientes'&&s[1]&&!s[2]&&req.method==='GET')",`if(s[0]==='expedientes'&&s[1]&&!s[2]&&req.method==='PATCH')return result(req,await rpc('fenix_prod_exp_update_server',{p_actor_code:a,p_code:s[1],p_expected_version:b.expected_version,p_cliente_alias:b.cliente_alias??null,p_stage:b.stage??null,p_inmobiliaria_code:b.inmobiliaria_code??null,p_notas:b.notas??null,p_proxima_accion:b.proxima_accion??null}));`);
inject("if(p==='/contactos'&&req.method==='GET')",`if(p==='/contactos'&&req.method==='POST')return result(req,await rpc('fenix_prod_contact_create_server',{p_actor_code:a,p_tipo:b.tipo,p_nombre:b.nombre,p_apellidos:b.apellidos||null,p_email:b.email||null,p_telefono:b.telefono||null,p_cargo:b.cargo||null,p_entidad_id:b.entidad_id||null,p_observaciones:b.observaciones||null,p_consentimiento_comercial:Boolean(b.consentimiento_comercial)}));`);
inject("if(p==='/firmas'&&req.method==='GET')",`if(p==='/firmas'&&req.method==='POST')return result(req,await rpc('fenix_prod_sign_create_server',{p_actor_code:a,p_expediente_code:b.expediente_code,p_fecha_firma:b.fecha_firma||null,p_notaria:b.notaria||null,p_oficial:b.oficial||null,p_fein_recibida_at:b.fein_recibida_at||null,p_fein_firmada_at:b.fein_firmada_at||null,p_fecha_min_notaria:b.fecha_min_notaria||null}));`);
inject("if(p==='/personal'&&req.method==='GET')",`if(p==='/chat'&&req.method==='GET')return result(req,await rpc('fenix_prod_chat_list_server',{p_actor_code:a,p_limit:Number(u.searchParams.get('limit')||100)}));
if(p==='/chat'&&req.method==='POST')return result(req,await rpc('fenix_prod_chat_send_server',{p_actor_code:a,p_body:b.body,p_idempotency_key:b.idempotency_key||req.headers.get('idempotency-key')||''}));
if(p==='/notificaciones'&&req.method==='GET')return result(req,await rpc('fenix_prod_notifications_list_server',{p_actor_code:a,p_limit:Number(u.searchParams.get('limit')||100)}));
if(s[0]==='notificaciones'&&s[1]&&s[2]==='state'&&req.method==='POST')return result(req,await rpc('fenix_prod_notification_mark_server',{p_actor_code:a,p_tarea_id:s[1],p_action:b.action}));`);
fs.writeFileSync(gateway,g);
console.log(JSON.stringify({ok:true,migrated_files:targets.length,target_rpc_count:rpcs.size,gateway_routes:8}));
