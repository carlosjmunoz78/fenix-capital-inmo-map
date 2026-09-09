import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')??'';
const A=Deno.env.get('SUPABASE_ANON_KEY')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const TARGET='fenix-document-auto-ingest';
const ALLOWED=new Set(['https://app.fenixcapital.es']);
const MAX_ITEMS=4;
const MAX_BYTES=20*1024*1024;

type Person={id?:string;contact_code?:string;nombre?:string;apellidos?:string;comprador?:string;dni_nie?:string};
type Rule={type:string;family:string;re:RegExp;personRequired:boolean};
type Candidate={upload_id:string;filename:string;document_id:string;bytes:number};
type Route={upload_id:string;filename:string;document_id:string;type:string;family:string;person:string;contactCode:string};

const RULES:Rule[]=[
 {type:'Vida laboral',family:'work_history',re:/\b(vida\s*laboral|informe\s*vida)\b/i,personRequired:true},
 {type:'Movimientos bancarios',family:'bank_statement',re:/\b(movimientos?|extractos?|cuenta\s*bancaria|banco\s*mov)\b/i,personRequired:true},
 {type:'Certificado bancario',family:'bank_certificate',re:/\b(certificado\s*bancario|titularidad\s*bancaria|certificado\s*cuenta|ahorros?)\b/i,personRequired:true},
 {type:'Nómina',family:'payroll',re:/\b(n[oó]minas?|nominas?|recibo\s*salario)\b/i,personRequired:true},
 {type:'Contrato laboral',family:'employment_contract',re:/\b(contrato\s*(laboral|trabajo)|contrato\s*indefinido|contrato\s*temporal)\b/i,personRequired:true},
 {type:'DNI/NIE',family:'identity',re:/\b(dni|nie|pasaporte|identidad)\b/i,personRequired:true},
 {type:'IRPF',family:'tax_return',re:/\b(irpf|renta|modelo\s*100|declaraci[oó]n\s*renta|imputaciones?)\b/i,personRequired:true},
 {type:'Certificado retenciones',family:'withholding_certificate',re:/\b(retenciones?|certificado\s*retenciones?)\b/i,personRequired:true},
 {type:'CIRBE',family:'loan_debt',re:/\b(cirbe|pr[eé]stamos?|deudas?)\b/i,personRequired:true},
 {type:'Autónomos',family:'self_employed_tax',re:/\b(aut[oó]nomo|modelo\s*130|modelo\s*131|modelo\s*303|modelo\s*390)\b/i,personRequired:true},
 {type:'Certificado Hacienda/SS',family:'tax_ss_certificate',re:/\b(hacienda|seguridad\s*social|corriente\s*de\s*pago|certificado\s*ss)\b/i,personRequired:true},
 {type:'Sentencia divorcio',family:'divorce_judgment',re:/\b(divorcio|sentencia|convenio\s*regulador)\b/i,personRequired:true},
 {type:'Contrato alquiler',family:'rental_contract',re:/\b(alquiler|arrendamiento)\b/i,personRequired:true},
 {type:'Nota simple',family:'land_registry',re:/\b(nota\s*simple|registro\s*propiedad|n\s*s)\b/i,personRequired:false},
 {type:'Arras',family:'sale_contract',re:/\b(arras|compraventa|contrato\s*reserva)\b/i,personRequired:false},
 {type:'Catastro',family:'cadastre',re:/\b(catastro|catastral)\b/i,personRequired:false},
 {type:'Tasación',family:'appraisal',re:/\b(tasaci[oó]n|tasacion|valoraci[oó]n)\b/i,personRequired:false}
];

function cors(req:Request){const o=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ALLOWED.has(o)?o:'https://app.fenixcapital.es','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','content-type':'application/json; charset=utf-8','cache-control':'no-store','x-fenix-env':'PROD','Vary':'Origin'}}
const out=(req:Request,d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors(req)});
function clean(v:unknown,max=220){return typeof v==='string'?v.trim().slice(0,max):''}
function words(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9ñ]+/g,' ').trim()}
function dni(v:unknown){return clean(v,32).toUpperCase().replace(/[^A-Z0-9]/g,'')}
function normalizeRole(v:unknown){return clean(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function aliases(p:Person){const full=words(`${p.nombre??''} ${p.apellidos??''}`),display=words(p.comprador??''),first=words(p.nombre??'').split(' ')[0]??'';return [...new Set([full,display,first].filter(x=>x.length>=2))].sort((a,b)=>b.length-a.length)}
function personFor(name:string,people:Person[]){const n=` ${words(name)} `;const ranked=people.map(person=>({person,score:Math.max(0,...aliases(person).filter(alias=>n.includes(` ${alias} `)).map(alias=>alias.length))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);return ranked.length&&(!ranked[1]||ranked[0].score>ranked[1].score)?ranked[0].person:null}
function personByExistingDni(run:any,people:Person[]){const documentDni=dni(run?.extraction?.fields?.documento_identidad||run?.extraction?.canonical_fields?.document_dni);if(!documentDni)return null;const matches=people.filter(p=>dni(p.dni_nie)===documentDni);return matches.length===1?matches[0]:null}
function routedPerson(name:string,people:Person[],run:any){return personFor(name,people)||personByExistingDni(run,people)||(people.length===1?people[0]:null)}
function ruleFor(name:string,people:Person[]){const n=words(name);const direct=RULES.find(r=>r.re.test(n));if(direct)return direct;const person=personFor(name,people);if(person&&/\bcontrato\b/i.test(n)&&!/(arras|compraventa|reserva|alquiler|arrendamiento)/i.test(n))return{type:'Contrato laboral',family:'employment_contract',re:/contrato/i,personRequired:true};return null}

Deno.serve(async(req:Request)=>{try{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=='POST')return out(req,{ok:false,error:'method_not_allowed'},405);
 const auth=req.headers.get('authorization')??'';if(!auth.toLowerCase().startsWith('bearer '))return out(req,{ok:false,error:'unauthorized'},401);
 if(!U||!A||!S)return out(req,{ok:false,error:'server_config_missing'},503);
 const user=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const ctxRes=await user.rpc('fenix_prod_session_context');if(ctxRes.error||!ctxRes.data?.actor_code)return out(req,{ok:false,error:'identity_not_linked'},403);
 const actor=String(ctxRes.data.actor_code),role=normalizeRole(ctxRes.data.role||'');if(!['direccion','financiero'].includes(role))return out(req,{ok:false,error:'forbidden'},403);
 const body=await req.json().catch(()=>null);const expCode=clean(body?.expediente_code,120);if(!expCode)return out(req,{ok:false,error:'expediente_code_required'},400);
 const peopleRes=await svc.rpc('fenix_prod_exp_people_server',{p_actor_code:actor,p_exp_code:expCode});if(peopleRes.error||!peopleRes.data?.ok)return out(req,{ok:false,error:'expediente_people_failed'},500);
 const people=(Array.isArray(peopleRes.data.items)?peopleRes.data.items:[]) as Person[];if(!people.length)return out(req,{ok:false,error:'expediente_people_required'},409);
 const exp=await svc.schema('fenix_prod').from('expedientes').select('id').eq('expediente_code',expCode).maybeSingle();if(exp.error||!exp.data?.id)return out(req,{ok:false,error:'expediente_not_found'},404);
 const docs=await svc.schema('fenix_prod').from('documentos').select('id,current_version,title').eq('expediente_id',exp.data.id).eq('synthetic',false).order('created_at',{ascending:true});if(docs.error)return out(req,{ok:false,error:'documents_list_failed'},500);
 const docIds=(docs.data??[]).map((d:any)=>String(d.id));if(!docIds.length)return out(req,{ok:true,status:200,processed:0,remaining:0,items:[]});
 const versions=await svc.schema('fenix_prod').from('document_versions').select('document_id,version_no,storage_path,bytes').in('document_id',docIds);if(versions.error)return out(req,{ok:false,error:'versions_list_failed'},500);
 const current=new Map<string,{storage_path:string;bytes:number}>();for(const d of docs.data??[]){const hit=(versions.data??[]).find((v:any)=>String(v.document_id)===String(d.id)&&Number(v.version_no)===Number(d.current_version));if(hit)current.set(String(d.id),{storage_path:String(hit.storage_path||''),bytes:Number(hit.bytes)||0})}
 const paths=[...current.values()].map(v=>v.storage_path).filter(Boolean);if(!paths.length)return out(req,{ok:true,status:200,processed:0,remaining:0,items:[]});
 const sessions=await svc.schema('fenix_prod').from('document_upload_sessions').select('id,storage_path,filename,status,origin_type,origin_code').in('storage_path',paths).eq('status','completed');if(sessions.error)return out(req,{ok:false,error:'upload_sessions_failed'},500);
 const uploadIds=(sessions.data??[]).map((s:any)=>String(s.id));const runs=uploadIds.length?await svc.schema('fenix_prod').from('document_intelligence_runs').select('upload_id,status,extraction,updated_at').in('upload_id',uploadIds).order('updated_at',{ascending:false}):{data:[],error:null};if(runs.error)return out(req,{ok:false,error:'runs_list_failed'},500);
 const latest=new Map<string,any>();for(const r of runs.data??[]){const id=String((r as any).upload_id);if(!latest.has(id))latest.set(id,r)}
 const byPath=new Map((sessions.data??[]).map((s:any)=>[String(s.storage_path),s]));const candidates:Candidate[]=[];for(const d of docs.data??[]){const v=current.get(String(d.id));if(!v||v.bytes>MAX_BYTES)continue;const s:any=byPath.get(v.storage_path);if(!s)continue;const run=latest.get(String(s.id));if(run?.status==='applied')continue;candidates.push({upload_id:String(s.id),filename:String(s.filename||d.title||''),document_id:String(d.id),bytes:v.bytes})}
 const routes:Route[]=[],skipped:any[]=[];for(const c of candidates){const run=latest.get(c.upload_id);const rule=ruleFor(c.filename,people);if(!rule){skipped.push({file:c.filename,error:'unrecognized_filename'});continue}const person=rule.personRequired?routedPerson(c.filename,people,run):null;if(rule.personRequired&&!person){skipped.push({file:c.filename,error:'ambiguous_person'});continue}const contactCode=String(person?.id||person?.contact_code||'');const personName=person?String(person.comprador||[person.nombre,person.apellidos].filter(Boolean).join(' ')):'Expediente';routes.push({...c,type:rule.type,family:rule.family,person:personName,contactCode})}
 const batch=routes.slice(0,MAX_ITEMS);const headers={Authorization:auth,apikey:A,'content-type':'application/json'};const results=await Promise.all(batch.map(async route=>{try{const r=await fetch(`${U}/functions/v1/${TARGET}`,{method:'POST',headers,body:JSON.stringify({upload_id:route.upload_id,document_family:route.family,declared_document_type:route.type,declared_person:route.person,declared_contact_code:route.contactCode||null})});const data=await r.json().catch(()=>null);return{file:route.filename,ok:r.ok&&data?.ok===true,status:r.status,error:data?.error??null,type:route.type,person:route.person}}catch{return{file:route.filename,ok:false,status:0,error:'auto_ingest_unreachable',type:route.type,person:route.person}}}));
 const succeeded=results.filter(x=>x.ok).length;return out(req,{ok:true,status:200,processed:batch.length,succeeded,failed:batch.length-succeeded,remaining:Math.max(0,routes.length-batch.length),skipped,items:results});
}catch(e){console.error('fenix-document-existing-backfill',e);return out(req,{ok:false,error:'existing_backfill_exception'},500)}});