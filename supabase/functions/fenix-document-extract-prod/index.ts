import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")??"",A=Deno.env.get("SUPABASE_ANON_KEY")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",OPENAI=Deno.env.get("OPENAI_API_KEY")??"";
const BUCKET="fenix-prod-documents",APPLY="fenix-document-intelligence",ALLOWED=new Set(["https://app.fenixcapital.es"]),SUPPORTED=new Set(["application/pdf","image/png","image/jpeg","image/webp"]),MAX=12*1024*1024;
const FAMILIES=["identity","payroll","employment_contract","work_history","land_registry","tax_return","withholding_certificate","bank_statement","bank_certificate","loan_debt","sale_contract","cadastre","self_employed_tax","tax_ss_certificate","divorce_judgment","rental_contract","other"];
const NUMBER_FIELDS=new Set(["ingresos_netos_mensuales","otros_ingresos_mensuales","cuotas_deuda_mensuales","ahorros","precio_vivienda","salario_base","complementos_salariales","pagas_extra_prorrata","total_devengado","irpf_porcentaje","retencion_irpf","cotizacion_ss","otras_deducciones","base_cotizacion","salario_pactado","rendimientos_trabajo","rendimientos_capital","rendimientos_inmuebles","rendimientos_actividades","base_imponible_general","base_imponible_ahorro","base_liquidable","cuota_resultante","retribucion_integra","gastos_deducibles","saldo_inicial","saldo_final","ingresos_recurrentes","nominas_detectadas","cuotas_prestamos_detectadas","capital_pendiente","cuota_deuda_mensual","tipo_interes","importe_arras","gastos_operacion","superficie_construida","superficie_parcela","coeficiente_participacion","ingresos_actividad","gastos_actividad","rendimiento_neto","resultado_modelo","iva_devengado","iva_deducible","importe_deuda","pension_alimentos","pension_compensatoria","renta_mensual","fianza","importe_solicitado","importe_principal"]);
const FIELD_KEYS=["nombre","apellidos","documento_identidad","fecha_nacimiento","telefono","email","domicilio","codigo_postal","localidad","provincia","nacionalidad","estado_civil","profesion","empresa","tipo_contrato","antiguedad_laboral","ingresos_netos_mensuales","otros_ingresos_mensuales","cuotas_deuda_mensuales","ahorros","precio_vivienda","importe_solicitado","fecha_caducidad_documento","fecha_expedicion_documento","numero_soporte","sexo","lugar_nacimiento","mrz","empresa_cif","periodo_nomina","categoria_profesional","salario_base","complementos_salariales","pagas_extra_prorrata","total_devengado","irpf_porcentaje","retencion_irpf","cotizacion_ss","otras_deducciones","base_cotizacion","fecha_inicio_contrato","fecha_fin_contrato","jornada","horas_semanales","salario_pactado","periodo_prueba","convenio","naf","situacion_laboral_actual","fecha_alta_actual","regimen_ss","grupo_cotizacion","dias_totales_alta","resumen_periodos_laborales","direccion_inmueble","registro_propiedad","finca_registral","cru","referencia_catastral","titulares_registrales","porcentajes_titularidad","derechos_titularidad","descripcion_finca","cargas_registrales","hipotecas_registrales","embargos","servidumbres","afecciones","restricciones_disposicion","ejercicio_fiscal","tipo_declaracion","rendimientos_trabajo","rendimientos_capital","rendimientos_inmuebles","rendimientos_actividades","base_imponible_general","base_imponible_ahorro","base_liquidable","cuota_resultante","resultado_declaracion","retribucion_integra","gastos_deducibles","titular_cuenta","entidad_bancaria","iban","periodo_extracto","saldo_inicial","saldo_final","ingresos_recurrentes","nominas_detectadas","cuotas_prestamos_detectadas","descubiertos_detectados","devoluciones_detectadas","transferencias_significativas","fecha_certificado","condicion_titular","entidad_acreedora","tipo_prestamo","capital_pendiente","cuota_deuda_mensual","fecha_vencimiento_deuda","tipo_interes","impagos","compradores","vendedores","importe_arras","fecha_limite_firma","cargas_declaradas","condiciones_suspensivas","inmobiliaria","gastos_operacion","uso_inmueble","superficie_construida","superficie_parcela","ano_construccion","titulares_catastrales","coeficiente_participacion","modelo_fiscal","periodo_fiscal","ingresos_actividad","gastos_actividad","rendimiento_neto","resultado_modelo","iva_devengado","iva_deducible","organismo_emisor","situacion_corriente_pago","importe_deuda","fecha_validez_certificado","csv","intervinientes","organo_judicial","fecha_resolucion","hijos_menores","pension_alimentos","pension_compensatoria","custodia","vivienda_familiar","obligaciones_economicas","arrendador","arrendatario","renta_mensual","duracion_contrato","fianza","fecha_documento","importe_principal"];
const fieldProperties=Object.fromEntries(FIELD_KEYS.map(k=>[k,{type:NUMBER_FIELDS.has(k)?["number","null"]:["string","null"]}]));
const schema={type:"object",additionalProperties:false,properties:{document_family:{type:"string",enum:FAMILIES},document_type:{type:"string"},person:{type:"string"},confidence:{type:"number",minimum:0,maximum:1},summary:{type:"string"},fields:{type:"object",additionalProperties:false,properties:fieldProperties,required:FIELD_KEYS}},required:["document_family","document_type","person","confidence","summary","fields"]};

function headers(req:Request){const o=req.headers.get("origin")||"";return{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-fenix-env":"PROD","Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://app.fenixcapital.es","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function out(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
function b64(bytes:Uint8Array){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function cleanString(v:unknown,max=1000){return typeof v==="string"?v.trim().slice(0,max):""}
function cleanFields(v:unknown){if(!v||typeof v!=="object"||Array.isArray(v))return{};const o:Record<string,string|number|boolean>={};for(const[k,x]of Object.entries(v as Record<string,unknown>)){if(x===null||x===undefined||x==="")continue;if(typeof x==="string")o[k]=x.trim().slice(0,3000);else if(typeof x==="number"&&Number.isFinite(x))o[k]=x;else if(typeof x==="boolean")o[k]=x}return o}
function outputText(r:any){if(typeof r?.output_text==="string"&&r.output_text.trim())return r.output_text;for(const item of r?.output??[])for(const c of item?.content??[])if(c?.type==="output_text"&&typeof c.text==="string")return c.text;return""}
const CANONICAL_KEYS=new Set(["nombre","apellidos","documento_identidad","fecha_nacimiento","telefono","email","domicilio","codigo_postal","localidad","provincia","nacionalidad","estado_civil","profesion","empresa","tipo_contrato","antiguedad_laboral","ingresos_netos_mensuales","otros_ingresos_mensuales","cuotas_deuda_mensuales","ahorros","precio_vivienda","importe_solicitado"]);
function canonicalFields(src:Record<string,unknown>){return Object.fromEntries(Object.entries(src).filter(([k])=>CANONICAL_KEYS.has(k)))}

type Ctx={actor_code:string;role:string};
type Resolved={upload:any;origin_type:string;origin_code:string;document_id:string|null;legacy:boolean};

async function resolveUpload(svc:any,ctx:Ctx,uploadId:string):Promise<{ok:boolean,status:number,error?:string,data?:Resolved}>{
  const {data,error}=await svc.rpc("fenix_prod_document_extract_resolve_server",{p_actor_code:ctx.actor_code,p_upload_id:uploadId});
  if(error)return{ok:false,status:500,error:"upload_resolve_failed"};
  if(!data?.ok)return{ok:false,status:Number(data?.status)||500,error:String(data?.error||"upload_resolve_failed")};
  return{ok:true,status:200,data:{upload:data.upload,origin_type:String(data.origin_type),origin_code:String(data.origin_code),document_id:data.document_id?String(data.document_id):null,legacy:Boolean(data.legacy)}};
}

async function markProcessing(svc:any,r:Resolved,ctx:Ctx,uploadId:string){
  if(!r.document_id)return;
  const {error}=await svc.rpc("fenix_prod_document_extract_run_upsert_server",{p_upload_id:uploadId,p_document_id:r.document_id,p_expediente_code:r.origin_code,p_actor_code:ctx.actor_code});
  if(error)throw new Error("run_upsert_failed");
}
async function markRun(svc:any,uploadId:string,status:string,extraction:any=null,errorText:string|null=null){
  const {data,error}=await svc.rpc("fenix_prod_document_extract_run_update_server",{p_upload_id:uploadId,p_status:status,p_extraction:extraction,p_error:errorText});
  if(error||data?.ok===false)throw new Error("run_update_failed");
}

async function extractOne(req:Request,svc:any,ctx:Ctx,auth:string,uploadId:string,body:any){
  const resolved=await resolveUpload(svc,ctx,uploadId);
  if(!resolved.ok||!resolved.data)return{status:resolved.status,body:{ok:false,error:resolved.error}};
  const r=resolved.data,us=r.upload,mime=String(us.mime_type||"").toLowerCase();
  if(!SUPPORTED.has(mime))return{status:415,body:{ok:false,error:"unsupported_document"}};
  const dl=await svc.storage.from(BUCKET).download(us.storage_path);
  if(dl.error||!dl.data)return{status:404,body:{ok:false,error:"document_missing"}};
  if(dl.data.size>MAX)return{status:413,body:{ok:false,error:"document_too_large"}};
  try{await markProcessing(svc,r,ctx,uploadId)}catch{return{status:500,body:{ok:false,error:"run_persist_failed"}}}

  const bytes=new Uint8Array(await dl.data.arrayBuffer()),dataUrl=`data:${mime};base64,${b64(bytes)}`,fileContent=mime==="application/pdf"?{type:"input_file",filename:String(us.filename||"documento.pdf"),file_data:dataUrl}:{type:"input_image",image_url:dataUrl,detail:"high"};
  const instructions=`Eres el extractor documental hipotecario de Fénix Capital. Lee visualmente TODAS las páginas, incluso PDFs que sean solo imágenes escaneadas o exportadas desde Canva. Primero clasifica document_family en una de: ${FAMILIES.join(', ')}. Después rellena únicamente los campos realmente demostrados por ese documento; el resto debe ser null. No deduzcas tipo de contrato desde una nómina si no aparece. Fechas YYYY-MM-DD. Importes numéricos. Conserva DNI/NIE/pasaporte tal como aparece. Para una vida laboral prioriza titular, apellidos, NAF, situación laboral actual, empresa actual si figura, fecha de alta actual, antigüedad calculable solo si está demostrada, régimen, tipo de contrato y jornada si constan, grupo de cotización, días totales en alta y resumen de periodos/empleadores. Para nóminas prioriza neto, bruto, empresa, periodo y antigüedad; para nota simple titulares, finca/CRU y cargas; para identidad incluye expedición y caducidad; para extractos resume magnitudes hipotecariamente relevantes, no cada compra menor. No inventes.`;

  const ai=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${OPENAI}`,"content-type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",store:false,temperature:0,instructions,input:[{role:"user",content:[{type:"input_text",text:`Analiza este archivo para una vista financiera inmediata. Nombre de archivo: ${String(us.filename||"")}`},fileContent]}],text:{format:{type:"json_schema",name:"fenix_mortgage_document_extract",strict:true,schema}}})});
  const raw=await ai.text();let parsed:any=null;
  try{const x=JSON.parse(raw),t=outputText(x);parsed=t?JSON.parse(t):null}catch{}
  if(!ai.ok||!parsed){
    try{await markRun(svc,uploadId,"failed",null,"document_extract_failed")}catch{}
    return{status:502,body:{ok:false,error:"document_extract_failed",provider_status:ai.status}};
  }
  const extracted=cleanFields(parsed.fields);
  if(!Object.keys(extracted).length){
    try{await markRun(svc,uploadId,"failed",parsed,"no_fields_detected")}catch{}
    return{status:422,body:{ok:false,error:"no_fields_detected"}};
  }
  const declaredType=cleanString(body?.declared_document_type,120)||cleanString(parsed.document_type,120)||"Documento",
        declaredPerson=cleanString(body?.declared_person,220)||cleanString(parsed.person,220)||"Persona no identificada",
        family=FAMILIES.includes(String(parsed.document_family))?String(parsed.document_family):"other";
  const applyPayload={origin_type:r.origin_type,origin_code:r.origin_code,declared_document_type:declaredType,declared_person:declaredPerson,document_type:declaredType,confidence:Number(parsed.confidence)||0,summary:cleanString(parsed.summary,1900),fields:canonicalFields(extracted),document_page_id:r.legacy?"":cleanString(body?.document_page_id,100),confirm_overwrite:Boolean(body?.confirm_overwrite)};
  const applied=await fetch(`${U}/functions/v1/${APPLY}/apply`,{method:"POST",headers:{Authorization:auth,apikey:A,"content-type":"application/json"},body:JSON.stringify(applyPayload)}),appliedText=await applied.text();
  let appliedBody:any=null;try{appliedBody=JSON.parse(appliedText)}catch{appliedBody={raw:appliedText.slice(0,400)}}
  let fieldApply:any=null;
  if(r.origin_type==="expediente"){
    const f=await svc.rpc("fenix_prod_document_intelligence_fields_server",{p_actor_code:ctx.actor_code,p_exp_code:r.origin_code,p_fields:canonicalFields(extracted)});
    fieldApply=f.error?{ok:false,error:"field_apply_failed"}:f.data;
  }
  const review=applied.status===409,ok=(applied.ok||review)&&(!fieldApply||fieldApply.ok!==false),
        fullExtraction={document_family:family,document_type:declaredType,person:declaredPerson,confidence:Number(parsed.confidence)||0,summary:cleanString(parsed.summary,1900),fields:extracted,canonical_fields:fieldApply};
  try{await markRun(svc,uploadId,review?"needs_review":ok?"applied":"failed",fullExtraction,ok?null:(appliedBody?.error||fieldApply?.error||"apply_failed"))}
  catch{return{status:500,body:{ok:false,error:"run_persist_failed"}}}
  return{status:review?409:ok?200:(applied.status>=400?applied.status:500),body:{ok:ok&&!review,status:review?409:ok?200:500,review_required:review,legacy:r.legacy,upload_id:uploadId,origin_type:r.origin_type,origin_code:r.origin_code,extraction:fullExtraction,applied:appliedBody,canonical_fields:fieldApply}};
}

Deno.serve(async(req:Request)=>{try{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
  if(req.method!=="POST")return out(req,{ok:false,error:"method_not_allowed"},405);
  const auth=req.headers.get("authorization")??"";
  if(!auth.toLowerCase().startsWith("bearer "))return out(req,{ok:false,error:"unauthorized"},401);
  if(!U||!A||!S||!OPENAI)return out(req,{ok:false,error:"server_config_missing",openai_configured:Boolean(OPENAI)},503);
  const user=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),
        svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}}),
        c=await user.rpc("fenix_prod_session_context");
  if(c.error||!c.data?.actor_code)return out(req,{ok:false,error:"identity_not_linked"},403);
  const ctx:Ctx={actor_code:String(c.data.actor_code),role:String(c.data.role||"")},body=await req.json().catch(()=>null);
  if(!body)return out(req,{ok:false,error:"invalid_json"},400);

  if(body.mode==="legacy_status"){
    if(ctx.role!=="Direccion")return out(req,{ok:false,error:"forbidden"},403);
    const {data,error}=await svc.rpc("fenix_prod_document_extract_legacy_status_server",{p_actor_code:ctx.actor_code});
    if(error)return out(req,{ok:false,error:"legacy_status_failed"},500);
    return out(req,data,Number(data?.status)||200);
  }
  if(body.mode==="legacy_batch"){
    if(ctx.role!=="Direccion")return out(req,{ok:false,error:"forbidden"},403);
    const limit=Math.max(1,Math.min(2,Number(body.limit)||2));
    const {data,error}=await svc.rpc("fenix_prod_document_extract_legacy_candidates_server",{p_actor_code:ctx.actor_code,p_limit:limit});
    if(error||!data?.ok)return out(req,{ok:false,error:"legacy_candidates_failed"},500);
    const ids=Array.isArray(data.upload_ids)?data.upload_ids.map(String):[],results=[] as any[];
    for(const id of ids){const z=await extractOne(req,svc,ctx,auth,id,body);results.push({upload_id:id,status:z.status,ok:z.body?.ok,review_required:z.body?.review_required,error:z.body?.error,origin_code:z.body?.origin_code,extraction:z.body?.extraction})}
    return out(req,{ok:true,attempted:ids.length,results});
  }
  const uploadId=cleanString(body.upload_id,80);
  if(!uploadId)return out(req,{ok:false,error:"upload_id_required"},400);
  const z=await extractOne(req,svc,ctx,auth,uploadId,body);
  return out(req,z.body,z.status);
}catch(e){console.error("fenix-document-extract-prod",e);return out(req,{ok:false,error:"document_extract_exception"},500)}});
