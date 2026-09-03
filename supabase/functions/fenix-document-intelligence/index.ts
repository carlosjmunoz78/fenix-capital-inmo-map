import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'',A=Deno.env.get('SUPABASE_ANON_KEY')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
function headers(req:Request){const o=req.headers.get('origin')||'';return{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-fenix-env':'PROD','Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}}
const out=(req:Request,d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:headers(req)});
function pathOf(req:Request){const raw=new URL(req.url).pathname;const marker=raw.includes('fenix-document-intelligence-test')?'fenix-document-intelligence-test':'fenix-document-intelligence';const i=raw.indexOf(marker);return i>=0?(raw.slice(i+marker.length)||'/'):raw;}
function isTest(req:Request){return new URL(req.url).pathname.includes('fenix-document-intelligence-test')}
function s(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):''}
function isoDate(v:unknown){const x=s(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(x)?x:null}

Deno.serve(async(req:Request)=>{try{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(!U||!A||!S)return out(req,{ok:false,error:'server_config_missing'},503);
 const auth=req.headers.get('authorization')??'';if(!auth.toLowerCase().startsWith('bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 const user=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false}}),svc=createClient(U,S,{auth:{persistSession:false}});
 const c=await user.rpc('fenix_prod_session_context');if(c.error)return out(req,{ok:false,error:'session_context_failed'},500);const ctx:any=c.data;if(!ctx?.actor_code)return out(req,{ok:false,error:'identity_not_linked'},403);
 const path=pathOf(req);if(req.method!=='POST'||path!=='/apply')return out(req,{ok:false,error:'not_found'},404);
 const b=await req.json().catch(()=>null);if(!b)return out(req,{ok:false,error:'invalid_json'},400);
 const ot=s(b.origin_type,40),oc=s(b.origin_code,180),f=b.fields&&typeof b.fields==='object'?b.fields:{};if(!['contacto','expediente'].includes(ot)||!oc)return out(req,{ok:false,error:'invalid_scope'},400);
 const declaredType=s(b.declared_document_type,120),declaredPerson=s(b.declared_person,220);if(!declaredType||!declaredPerson)return out(req,{ok:false,error:'classification_required'},422);
 const fields={nombre:s(f.nombre,120)||null,apellidos:s(f.apellidos,180)||null,documento_identidad:s(f.documento_identidad,20).toUpperCase()||null,fecha_nacimiento:isoDate(f.fecha_nacimiento)};
 if(!Object.values(fields).some(Boolean))return out(req,{ok:false,error:'no_applicable_fields'},422);
 if(isTest(req))return out(req,{ok:true,status:200,test:true,classification:{document_type:declaredType,person:declaredPerson},updated:fields});
 if(ot==='contacto'){
   if(!['Direccion','Financiero'].includes(String(ctx.role)))return out(req,{ok:false,error:'forbidden'},403);
   const q=await svc.schema('fenix_prod').from('clientes').select('cliente_code,nombre,apellidos,source_payload,synthetic,active').eq('cliente_code',oc).eq('synthetic',false).maybeSingle();
   if(q.error)return out(req,{ok:false,error:'contact_read_failed'},500);if(!q.data)return out(req,{ok:false,error:'contact_not_found'},404);
   const row:any=q.data,payload=(row.source_payload&&typeof row.source_payload==='object')?row.source_payload:{};const conflicts:Array<{field:string;current:string;proposed:string}>=[];
   const checks:[string,unknown,unknown][]=[['nombre',row.nombre,fields.nombre],['apellidos',row.apellidos,fields.apellidos],['documento_identidad',payload.documento_identidad,fields.documento_identidad],['fecha_nacimiento',payload.fecha_nacimiento,fields.fecha_nacimiento]];
   for(const[field,current,proposed]of checks){if(proposed&&current&&String(current).trim().toLocaleLowerCase('es')!==String(proposed).trim().toLocaleLowerCase('es'))conflicts.push({field,current:String(current),proposed:String(proposed)});}
   if(conflicts.length&&!Boolean(b.confirm_overwrite))return out(req,{ok:false,status:409,error:'conflicts_require_confirmation',conflicts},409);
   const intelligence={declared_document_type:declaredType,declared_person:declaredPerson,detected_document_type:s(b.document_type,80)||'Documento',summary:s(b.summary,1900),document_page_id:s(b.document_page_id,100)||null,confidence:Number.isFinite(Number(b.confidence))?Number(b.confidence):null,updated_by:ctx.actor_code,updated_at:new Date().toISOString()};
   const nextPayload={...payload,...(fields.documento_identidad?{documento_identidad:fields.documento_identidad}:{}),...(fields.fecha_nacimiento?{fecha_nacimiento:fields.fecha_nacimiento}:{}),document_intelligence:intelligence};
   const patch:any={source_payload:nextPayload,updated_at:new Date().toISOString()};if(fields.nombre)patch.nombre=fields.nombre;if(fields.apellidos)patch.apellidos=fields.apellidos;
   const u=await svc.schema('fenix_prod').from('clientes').update(patch).eq('cliente_code',oc).eq('synthetic',false).select('cliente_code,nombre,apellidos').maybeSingle();if(u.error||!u.data)return out(req,{ok:false,error:'contact_update_failed'},500);
   return out(req,{ok:true,status:200,updated:u.data,classification:{document_type:declaredType,person:declaredPerson},conflicts_resolved:conflicts.length});
 }
 if(!['Direccion','Financiero'].includes(String(ctx.role)))return out(req,{ok:false,error:'forbidden'},403);
 const g=await svc.rpc('fenix_prod_get_expediente_server',{p_actor_code:ctx.actor_code,p_code:oc});if(g.error||!g.data)return out(req,{ok:false,error:'expediente_read_failed'},500);const exp:any=g.data;
 const full=[fields.nombre,fields.apellidos].filter(Boolean).join(' ').trim();if(!full)return out(req,{ok:false,error:'no_expediente_fields'},422);
 const current=String(exp.cliente_alias??exp.cliente??'').trim();if(current&&current.toLocaleLowerCase('es')!==full.toLocaleLowerCase('es')&&!Boolean(b.confirm_overwrite))return out(req,{ok:false,status:409,error:'conflicts_require_confirmation',conflicts:[{field:'nombre',current,proposed:full}]},409);
 const version=Number(exp.version??exp.row_version??b.expected_version);if(!Number.isInteger(version))return out(req,{ok:false,error:'missing_version'},409);
 const r=await svc.rpc('fenix_prod_exp_update_server',{p_actor_code:ctx.actor_code,p_code:oc,p_expected_version:version,p_cliente_alias:full,p_stage:exp.stage??exp.fase??null,p_inmobiliaria_code:exp.inmobiliaria_code??null,p_notas:exp.notas??null,p_proxima_accion:exp.proxima_accion??null});
 if(r.error)return out(req,{ok:false,error:'expediente_update_failed'},500);return out(req,{...r.data,classification:{document_type:declaredType,person:declaredPerson}},Number(r.data?.status??200));
}catch(e){console.error('fenix-document-intelligence',e);return out(req,{ok:false,error:'document_intelligence_exception'},500)}});
