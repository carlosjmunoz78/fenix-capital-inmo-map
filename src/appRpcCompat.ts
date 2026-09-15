import {fetchAppApi} from './supabase';

type RpcResult<T=any>={data:T|null;error:{message:string}|null};

function body(init:Record<string,unknown>){return JSON.stringify(init)}

export async function gatewayRpc<T=any>(name:string,args:Record<string,any>={}):Promise<RpcResult<T>>{
  let path='';let init:RequestInit|undefined;
  switch(name){
    case 'fenix_prod_chat_list_user':
      path=`/chat?limit=${encodeURIComponent(String(args.p_limit??100))}`;break;
    case 'fenix_prod_chat_send_user':
      path='/chat';init={method:'POST',body:body({body:args.p_body,idempotency_key:args.p_idempotency_key})};break;
    case 'fenix_prod_chat_conversations_user':
      path='/chat/conversations';break;
    case 'fenix_prod_chat_people_user':
      path='/chat/people';break;
    case 'fenix_prod_chat_conversation_create_user':
      path='/chat/conversations';init={method:'POST',body:body({member_actor_codes:args.p_member_actor_codes,title:args.p_title??null})};break;
    case 'fenix_prod_chat_group_create_user':
      path='/chat/groups';init={method:'POST',body:body({member_actor_codes:args.p_member_actor_codes,title:args.p_title})};break;
    case 'fenix_prod_chat_list_v2_user':
      path=`/chat/conversations/${encodeURIComponent(String(args.p_conversation_code||''))}/messages?limit=${encodeURIComponent(String(args.p_limit??100))}`;break;
    case 'fenix_prod_chat_send_v2_user':
      path=`/chat/conversations/${encodeURIComponent(String(args.p_conversation_code||''))}/messages`;init={method:'POST',body:body({body:args.p_body,idempotency_key:args.p_idempotency_key})};break;
    case 'fenix_prod_chat_attachment_add_v2_user':
      path=`/chat/messages/${encodeURIComponent(String(args.p_message_code||''))}/attachments`;init={method:'POST',body:body({storage_path:args.p_storage_path,filename:args.p_filename,mime_type:args.p_mime_type,size_bytes:args.p_size_bytes})};break;
    case 'fenix_prod_contact_create':
      path='/contactos';init={method:'POST',body:body({tipo:args.p_tipo,nombre:args.p_nombre,apellidos:args.p_apellidos,email:args.p_email,telefono:args.p_telefono,cargo:args.p_cargo,entidad_id:args.p_entidad_id,observaciones:args.p_observaciones,consentimiento_comercial:args.p_consentimiento_comercial})};break;
    case 'fenix_prod_exp_create':
      path='/expedientes';init={method:'POST',body:body({cliente_nombre:args.p_cliente_nombre,cliente_apellidos:args.p_cliente_apellidos,cliente_email:args.p_cliente_email,cliente_telefono:args.p_cliente_telefono,localidad:args.p_localidad,precio_vivienda:args.p_precio_vivienda,importe_solicitado:args.p_importe_solicitado,owner_actor_code:args.p_owner_actor_code,inmobiliaria_code:args.p_inmobiliaria_code,payload_operacion:args.p_payload_operacion,consentimiento_comercial:args.p_consentimiento_comercial})};break;
    case 'fenix_prod_exp_update':
      path=`/expedientes/${encodeURIComponent(String(args.p_code||''))}`;init={method:'PATCH',body:body({expected_version:args.p_expected_version,cliente_alias:args.p_cliente_alias,stage:args.p_stage,inmobiliaria_code:args.p_inmobiliaria_code,notas:args.p_notas,proxima_accion:args.p_proxima_accion})};break;
    case 'fenix_prod_notifications_list_user':
      path=`/notificaciones?limit=${encodeURIComponent(String(args.p_limit??100))}`;break;
    case 'fenix_prod_notification_mark_user':
      path=`/notificaciones/${encodeURIComponent(String(args.p_tarea_id||''))}/state`;init={method:'POST',body:body({action:args.p_action})};break;
    case 'fenix_prod_sign_create':
      path='/firmas';init={method:'POST',body:body({expediente_code:args.p_expediente_code,fecha_firma:args.p_fecha_firma,notaria:args.p_notaria,oficial:args.p_oficial,fein_recibida_at:args.p_fein_recibida_at,fein_firmada_at:args.p_fein_firmada_at,fecha_min_notaria:args.p_fecha_min_notaria})};break;
    default:return{data:null,error:{message:`unsupported_gateway_rpc:${name}`}};
  }
  const r=await fetchAppApi<T>(path,init);
  return r.status>=200&&r.status<500?{data:r.data,error:null}:{data:r.data,error:{message:`gateway_http_${r.status}`}};
}
