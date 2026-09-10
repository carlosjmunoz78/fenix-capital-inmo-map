import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'',A=Deno.env.get('SUPABASE_ANON_KEY')??'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',N=Deno.env.get('NOTION_TOKEN')??'';
const DOC_DS='34037d5e-21e8-4221-b020-b0e6e1a5a14f',NV='2025-09-03';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
const ORIGINS=new Set(['contacto','expediente','comprador','firma','inmobiliaria','tasacion','tarea','documento','contacto_b2b','banco','notaria','registro','herencia','obra_nueva']);
function headers(req:Request){const o=req.headers.get('origin')||'';return{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-fenix-env':'PROD','Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}}
const out=(req:Request,d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:headers(req)});
function route(req:Request){const raw=new URL(req.url).pathname,m='fenix-document-intelligence',i=raw.indexOf(m);return i>=0?(raw.slice(i+m.length)||'/'):raw}
function str(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):''}
function iso(v:unknown){const x=str(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(x)?x:null}
function fields(v:unknown){if(!v||typeof v!=='object'||Array.isArray(v))return{};const o:Record<string,string|number|boolean>={};for(const[k,val]of Object.entries(v as Record<string,unknown>).slice(0,50)){const key=String(k).replace(/[^a-zA-Z0-9_áéíóúüñÁÉÍÓÚÜÑ-]/g,'_').slice(0,80);if(typeof val==='string'&&val.trim())o[key]=val.trim().slice(0,1000);else if(typeof val==='number'&&Number.isFinite(val))o[key]=val;else if(typeof val==='boolean')o[key]=val}return o}
function comparable(v:unknown){return String(v??'').trim().toLocaleLowerCase('es')}
function statusOf(r:any,fallback=403){const n=Number(r?.status);return Number.isInteger(n)&&n>=400&&n<=599?n:fallback}
async function notionPage(id:string){const r=await fetch(`https://api.notion.com/v1/pages/${id}`,{headers:{Authorization:`Bearer ${N}`,'Notion-Version':NV}}),b:any=await r.json().catch(()=>null);if(r.status===404)return null;if(!r.ok)throw new Error(`notion_page_${r.status}`);return b}
async function store(pageId:string,payload:Record<string,unknown>){if(!N||!/^[0-9a-fA-F-]{32,36}$/.test(pageId))return{ok:false,error:'notion_unavailable'};const p=await notionPage(pageId);if(!p)return{ok:false,error:'document_not_found'};if((p.parent?.data_source_id??p.parent?.database_id)!==DOC_DS)return{ok:false,error:'document_scope_mismatch'};const note=`[CEREBRO · LECTURA DOCUMENTAL]\n${JSON.stringify(payload)}`.slice(0,1950);const w=await fetch(`https://api.notion.com/v1/pages/${pageId}`,{method:'PATCH',headers:{Authorization:`Bearer ${N}`,'Notion-Version':NV,'Content-Type':'application/json'},body:JSON.stringify({properties:{Notas:{rich_text:[{type:'text',text:{content:note}}]}}})});return w.ok?{ok:true}:{ok:false,error:`notion_patch_${w.status}`}}
function buyerChanges(all:Record<string,string|number|boolean>){const c:Record<string,unknown>={};const map:Record<string,string>={nombre:'nombre',apellidos:'apellidos',documento_identidad:'dni_nie',fecha_nacimiento:'fecha_nacimiento',nacionalidad:'nacionalidad',empresa:'empresa_organismo',antiguedad_laboral:'antiguedad_laboral',ingresos_netos_mensuales:'sueldo_neto_mensual',otros_ingresos_mensuales:'otros_ingresos_mensuales',cuotas_deuda_mensuales:'deudas_mensuales',ahorros:'ahorro_disponible'};for(const[from,to]of Object.entries(map))if(all[from]!==undefined&&all[from]!==null&&all[from]!=='')c[to]=all[from];const state=str(all.estado_civil,80).toLocaleLowerCase('es');const states:Record<string,string>={'soltero':'Soltero/a','soltera':'Soltero/a','soltero/a':'Soltero/a','casado':'Casado/a','casada':'Casado/a','casado/a':'Casado/a','divorciado':'Divorciado/a','divorciada':'Divorciado/a','divorciado/a':'Divorciado/a','separado':'Separado/a','separada':'Separado/a','separado/a':'Separado/a','viudo':'Viudo/a','viuda':'Viudo/a','viudo/a':'Viudo/a','pareja de hecho':'Pareja de hecho'};if(states[state])c.estado_civil=states[state];return c}
function currentField(row:any,key:string){if(key==='nombre'||key==='apellidos'||key==='dni_nie')return row?.[key];return row?.profile?.[key]}

Deno.serve(async(req:Request)=>{try{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(!U||!A||!S)return out(req,{ok:false,error:'server_config_missing'},503);
 const auth=req.headers.get('authorization')??'';if(!auth.toLowerCase().startsWith('bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 const user=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const c=await user.rpc('fenix_prod_session_context');if(c.error)return out(req,{ok:false,error:'session_context_failed'},500);const ctx:any=c.data;if(!ctx?.actor_code)return out(req,{ok:false,error:'identity_not_linked'},403);
 if(req.method!=='POST'||route(req)!=='/apply')return out(req,{ok:false,error:'not_found'},404);
 const b=await req.json().catch(()=>null);if(!b)return out(req,{ok:false,error:'invalid_json'},400);
 const ot=str(b.origin_type,40),oc=str(b.origin_code,180),all=fields(b.fields);if(!ORIGINS.has(ot)||!oc)return out(req,{ok:false,error:'invalid_scope'},400);
 const declaredType=str(b.declared_document_type,120),declaredPerson=str(b.declared_person,220);if(!declaredType||!declaredPerson)return out(req,{ok:false,error:'classification_required'},422);if(!Object.keys(all).length)return out(req,{ok:false,error:'no_applicable_fields'},422);
 const docPage=str(b.document_page_id,100),summary=str(b.summary,1900),detected=str(b.document_type,120)||'Documento',confidence=Number.isFinite(Number(b.confidence))?Number(b.confidence):null;
 const payload={version:5,environment:'PROD',origin_type:ot,origin_code:oc,declared_document_type:declaredType,declared_person:declaredPerson,detected_document_type:detected,summary,confidence,fields:all,actor_code:ctx.actor_code,processed_at:new Date().toISOString()};

 if(ot==='comprador'){
   const sc=await svc.rpc('fenix_prod_evidence_scope_server',{p_actor_code:ctx.actor_code,p_origin_type:'comprador',p_origin_code:oc});if(sc.error)return out(req,{ok:false,error:'scope_check_failed'},500);if(!sc.data?.ok)return out(req,{ok:false,error:sc.data?.error??'forbidden'},statusOf(sc.data));
   const expCode=String(sc.data.scope_code||'');if(!expCode)return out(req,{ok:false,error:'participant_scope_missing'},409);
   const q=await svc.schema('fenix_prod').from('clientes').select('cliente_code,nombre,apellidos,dni_nie,profile,active').eq('cliente_code',oc).eq('active',true).maybeSingle();if(q.error)return out(req,{ok:false,error:'participant_read_failed'},500);if(!q.data)return out(req,{ok:false,error:'participant_not_found'},404);
   const changes=buyerChanges(all),conflicts:any[]=[];for(const[k,proposed]of Object.entries(changes)){const current=currentField(q.data,k);if(proposed!==null&&proposed!==undefined&&proposed!==''&&current!==null&&current!==undefined&&current!==''&&comparable(current)!==comparable(proposed))conflicts.push({field:k,current:String(current),proposed:String(proposed)})}
   if(conflicts.length&&!Boolean(b.confirm_overwrite))return out(req,{ok:false,status:409,error:'conflicts_require_confirmation',conflicts,extraction:{document_type:detected,person:declaredPerson,confidence,summary,fields:all}},409);
   if(docPage){const st=await store(docPage,payload);if(!st.ok)return out(req,{ok:false,error:st.error},500)}
   if(!Object.keys(changes).length)return out(req,{ok:true,status:200,cerebro_stored:Boolean(docPage),canonical_updates:0,classification:{document_type:declaredType,person:declaredPerson},updated:{}});
   const u=await svc.rpc('fenix_prod_exp_person_update_server',{p_actor_code:ctx.actor_code,p_client_code:oc,p_exp_code:expCode,p_changes:changes});if(u.error)return out(req,{ok:false,error:'participant_update_failed'},500);if(!u.data?.ok)return out(req,u.data,statusOf(u.data,500));
   return out(req,{ok:true,status:200,updated:u.data,cerebro_stored:Boolean(docPage),canonical_updates:Object.keys(changes).length,classification:{document_type:declaredType,person:declaredPerson},conflicts_resolved:conflicts.length});
 }

 const identity={nombre:str((all as any).nombre,120)||null,apellidos:str((all as any).apellidos,180)||null,documento_identidad:str((all as any).documento_identidad,20).toUpperCase()||null,fecha_nacimiento:iso((all as any).fecha_nacimiento)};
 if(ot==='contacto'&&Object.values(identity).some(Boolean)){
   if(!['Direccion','Financiero'].includes(String(ctx.role)))return out(req,{ok:false,error:'forbidden'},403);
   const q=await svc.schema('fenix_prod').from('clientes').select('cliente_code,nombre,apellidos,source_payload,synthetic,active').eq('cliente_code',oc).eq('synthetic',false).maybeSingle();if(q.error)return out(req,{ok:false,error:'contact_read_failed'},500);if(!q.data)return out(req,{ok:false,error:'contact_not_found'},404);
   const row:any=q.data,src=(row.source_payload&&typeof row.source_payload==='object')?row.source_payload:{},conflicts:any[]=[];for(const[f,current,proposed]of [['nombre',row.nombre,identity.nombre],['apellidos',row.apellidos,identity.apellidos],['documento_identidad',src.documento_identidad,identity.documento_identidad],['fecha_nacimiento',src.fecha_nacimiento,identity.fecha_nacimiento]] as any[]){if(proposed&&current&&comparable(current)!==comparable(proposed))conflicts.push({field:f,current:String(current),proposed:String(proposed)})}
   if(conflicts.length&&!Boolean(b.confirm_overwrite))return out(req,{ok:false,status:409,error:'conflicts_require_confirmation',conflicts},409);
   if(docPage){const st=await store(docPage,payload);if(!st.ok)return out(req,{ok:false,error:st.error},500)}
   const nextPayload={...src,...(identity.documento_identidad?{documento_identidad:identity.documento_identidad}:{}),...(identity.fecha_nacimiento?{fecha_nacimiento:identity.fecha_nacimiento}:{}),document_intelligence:{...payload,document_page_id:docPage||null}},patch:any={source_payload:nextPayload,updated_at:new Date().toISOString()};if(identity.nombre)patch.nombre=identity.nombre;if(identity.apellidos)patch.apellidos=identity.apellidos;
   const u=await svc.schema('fenix_prod').from('clientes').update(patch).eq('cliente_code',oc).eq('synthetic',false).select('cliente_code,nombre,apellidos').maybeSingle();if(u.error||!u.data)return out(req,{ok:false,error:'contact_update_failed'},500);return out(req,{ok:true,status:200,updated:u.data,cerebro_stored:Boolean(docPage),classification:{document_type:declaredType,person:declaredPerson},conflicts_resolved:conflicts.length});
 }

 if(ot==='expediente'){
   const sc=await svc.rpc('fenix_prod_evidence_scope_server',{p_actor_code:ctx.actor_code,p_origin_type:'expediente',p_origin_code:oc});if(sc.error)return out(req,{ok:false,error:'scope_check_failed'},500);if(!sc.data?.ok)return out(req,{ok:false,error:sc.data?.error??'forbidden'},statusOf(sc.data));
   if(docPage){const st=await store(docPage,payload);if(!st.ok)return out(req,{ok:false,error:st.error},500)}
   return out(req,{ok:true,status:200,cerebro_stored:Boolean(docPage),canonical_updates:0,classification:{document_type:declaredType,person:declaredPerson},updated:all});
 }

 if(docPage){const st=await store(docPage,payload);if(!st.ok)return out(req,{ok:false,error:st.error},500)}
 return out(req,{ok:true,status:200,cerebro_stored:Boolean(docPage),canonical_updates:0,classification:{document_type:declaredType,person:declaredPerson},updated:all});
}catch(e){console.error('fenix-document-intelligence',e);return out(req,{ok:false,error:'document_intelligence_exception'},500)}});
