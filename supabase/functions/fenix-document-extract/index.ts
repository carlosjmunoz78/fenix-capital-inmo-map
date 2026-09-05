import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")??"";
const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const OPENAI=Deno.env.get("OPENAI_API_KEY")??"";
const BUCKET="fenix-preprod-documents-test";
const APPLY="fenix-document-intelligence-test";
const ALLOWED=new Set(["https://carlosjmunoz78.github.io","https://app.fenixcapital.es"]);
const SUPPORTED=new Set(["application/pdf","image/png","image/jpeg","image/webp"]);

function headers(req:Request){const o=req.headers.get("origin")||"";return{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-fenix-env":"PREPROD_TEST","Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://carlosjmunoz78.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function out(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
function b64(bytes:Uint8Array){let s="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(s)}
function cleanString(v:unknown,max=1000){return typeof v==="string"?v.trim().slice(0,max):""}
function cleanFields(v:unknown){if(!v||typeof v!=="object"||Array.isArray(v))return{};const src=v as Record<string,unknown>,o:Record<string,string|number|boolean>={};for(const[k,val]of Object.entries(src)){if(val===null||val===undefined||val==="")continue;if(typeof val==="string")o[k]=val.trim().slice(0,1000);else if(typeof val==="number"&&Number.isFinite(val))o[k]=val;else if(typeof val==="boolean")o[k]=val}return o}
function outputText(r:any){if(typeof r?.output_text==="string"&&r.output_text.trim())return r.output_text;for(const item of r?.output??[])for(const c of item?.content??[])if(c?.type==="output_text"&&typeof c.text==="string")return c.text;return""}

const schema={type:"object",additionalProperties:false,properties:{document_type:{type:"string"},person:{type:"string"},confidence:{type:"number",minimum:0,maximum:1},summary:{type:"string"},fields:{type:"object",additionalProperties:false,properties:{nombre:{type:["string","null"]},apellidos:{type:["string","null"]},documento_identidad:{type:["string","null"]},fecha_nacimiento:{type:["string","null"]},telefono:{type:["string","null"]},email:{type:["string","null"]},domicilio:{type:["string","null"]},codigo_postal:{type:["string","null"]},localidad:{type:["string","null"]},provincia:{type:["string","null"]},nacionalidad:{type:["string","null"]},estado_civil:{type:["string","null"]},profesion:{type:["string","null"]},empresa:{type:["string","null"]},tipo_contrato:{type:["string","null"]},antiguedad_laboral:{type:["string","null"]},ingresos_netos_mensuales:{type:["number","null"]},otros_ingresos_mensuales:{type:["number","null"]},cuotas_deuda_mensuales:{type:["number","null"]},ahorros:{type:["number","null"]},precio_vivienda:{type:["number","null"]},importe_solicitado:{type:["number","null"]}},required:["nombre","apellidos","documento_identidad","fecha_nacimiento","telefono","email","domicilio","codigo_postal","localidad","provincia","nacionalidad","estado_civil","profesion","empresa","tipo_contrato","antiguedad_laboral","ingresos_netos_mensuales","otros_ingresos_mensuales","cuotas_deuda_mensuales","ahorros","precio_vivienda","importe_solicitado"]}},required:["document_type","person","confidence","summary","fields"]};

Deno.serve(async(req:Request)=>{try{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=="POST")return out(req,{ok:false,error:"method_not_allowed"},405);
 if(!U||!A||!S||!OPENAI)return out(req,{ok:false,error:"server_config_missing",openai_configured:Boolean(OPENAI)},503);
 const auth=req.headers.get("authorization")??"";if(!auth.toLowerCase().startsWith("bearer "))return out(req,{ok:false,error:"unauthorized"},401);
 const token=auth.slice(7),user=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}}),svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:ud,error:ue}=await user.auth.getUser(token);if(ue||!ud.user)return out(req,{ok:false,error:"unauthorized"},401);
 const{data:ctx,error:ce}=await svc.rpc("preprod_test_actor_context_by_auth_server",{p_auth_user_id:ud.user.id});if(ce)return out(req,{ok:false,error:"identity_resolution_failed"},500);if(!ctx?.ok||!ctx?.actor_code)return out(req,{ok:false,error:"identity_not_linked"},403);
 const body=await req.json().catch(()=>null);if(!body)return out(req,{ok:false,error:"invalid_json"},400);
 const uploadId=cleanString(body.upload_id,80);if(!uploadId)return out(req,{ok:false,error:"upload_id_required"},400);
 const q=await svc.schema("preprod_test").from("document_upload_sessions").select("id,actor_code,origin_type,origin_code,storage_path,mime_type,filename,status").eq("id",uploadId).eq("actor_code",ctx.actor_code).maybeSingle();
 if(q.error||!q.data)return out(req,{ok:false,error:"upload_not_found"},404);const us:any=q.data;
 if(us.status!=="completed")return out(req,{ok:false,error:"upload_not_completed"},409);
 const mime=String(us.mime_type||"").toLowerCase();if(!SUPPORTED.has(mime))return out(req,{ok:false,error:"unsupported_document",mime_type:mime},415);
 const dl=await svc.storage.from(BUCKET).download(us.storage_path);if(dl.error||!dl.data)return out(req,{ok:false,error:"document_missing"},404);
 if(dl.data.size>12*1024*1024)return out(req,{ok:false,error:"document_too_large"},413);
 const bytes=new Uint8Array(await dl.data.arrayBuffer()),dataUrl=`data:${mime};base64,${b64(bytes)}`;
 const fileContent=mime==="application/pdf"?{type:"input_file",filename:String(us.filename||"documento.pdf"),file_data:dataUrl}:{type:"input_image",image_url:dataUrl,detail:"high"};
 const ai=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${OPENAI}`,"content-type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",store:false,temperature:0,instructions:"Eres un extractor documental para Fénix Capital. El archivo puede ser un PDF cuyo contenido sea únicamente una imagen escaneada o exportada desde Canva. Debes leer visualmente todas las páginas, no asumir que existe texto embebido. Extrae solo datos realmente visibles. No inventes ni completes por contexto. Usa null cuando un dato no sea legible o no aparezca. Fechas YYYY-MM-DD. Conserva DNI/NIE/pasaporte tal como aparece. Importes como números. person debe ser el nombre visible o 'Persona no identificada'.",input:[{role:"user",content:[{type:"input_text",text:"Lee visualmente este documento/perfil y devuelve los datos estructurados."},fileContent]}],text:{format:{type:"json_schema",name:"fenix_profile_extract",strict:true,schema}}})});
 const raw=await ai.text();let parsed:any=null;try{const r=JSON.parse(raw),t=outputText(r);parsed=t?JSON.parse(t):null}catch{}
 if(!ai.ok||!parsed)return out(req,{ok:false,error:"document_extract_failed",status:ai.status,detail:raw.slice(0,800)},502);
 const extracted=cleanFields(parsed.fields),declaredType=cleanString(body.declared_document_type,120)||cleanString(parsed.document_type,120)||"Documento",declaredPerson=cleanString(body.declared_person,220)||cleanString(parsed.person,220)||"Persona no identificada";
 if(!Object.keys(extracted).length)return out(req,{ok:false,error:"no_fields_detected",extraction:parsed},422);
 const applyPayload={origin_type:us.origin_type,origin_code:us.origin_code,declared_document_type:declaredType,declared_person:declaredPerson,document_type:cleanString(parsed.document_type,120)||declaredType,confidence:Number(parsed.confidence)||0,summary:cleanString(parsed.summary,1900),fields:extracted,document_page_id:cleanString(body.document_page_id,100),confirm_overwrite:Boolean(body.confirm_overwrite)};
 const applied=await fetch(`${U}/functions/v1/${APPLY}/apply`,{method:"POST",headers:{Authorization:auth,apikey:A,"content-type":"application/json"},body:JSON.stringify(applyPayload)});const appliedText=await applied.text();let appliedBody:any=null;try{appliedBody=JSON.parse(appliedText)}catch{appliedBody={raw:appliedText.slice(0,500)}};
 return out(req,{ok:applied.ok,status:applied.status,extraction:{document_type:applyPayload.document_type,person:declaredPerson,confidence:applyPayload.confidence,summary:applyPayload.summary,fields:extracted},applied:appliedBody},applied.status);
 }catch(e){console.error("fenix-document-extract",e);return out(req,{ok:false,error:"document_extract_exception"},500)}});
