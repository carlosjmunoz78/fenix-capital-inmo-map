import {test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {extractDocumentData} from '../src/operationalDocumentExtraction';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

const dir=process.env.REAL_PRIVATE_DOC_DIR||'';
const enabled=Boolean(dir)&&existsSync(dir);
const physical=enabled?test:test.skip;
function must(ok:unknown,label:string):asserts ok{if(!ok)throw new Error(`PRIVATE_PHYSICAL_GATE_RED=${label}`);}
function usableText(text:string){const compact=text.replace(/\s+/g,' ').trim();if(compact.length<80)return false;const chars=[...compact];const letters=(compact.match(/\p{L}/gu)||[]).length;const alnum=(compact.match(/[\p{L}\p{N}]/gu)||[]).length;const words=compact.split(/\s+/).filter(Boolean);const weird=(compact.match(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g)||[]).length;return words.length>=10&&letters/chars.length>=0.35&&alnum/chars.length>=0.5&&weird===0;}
function ocrPdf(file:string){const work=mkdtempSync(join(tmpdir(),'fenix-private-ocr-'));const prefix=join(work,'page');try{execFileSync('pdftoppm',['-jpeg','-r','180',file,prefix],{stdio:'ignore',timeout:120000});const images=readdirSync(work).filter(x=>x.endsWith('.jpg')).sort();must(images.length>0,'ocr_render_no_pages');let out='';for(const image of images){out+=execFileSync('tesseract',[join(work,image),'stdout','-l','spa','--psm','6'],{encoding:'utf8',maxBuffer:24*1024*1024,timeout:120000})+'\n';}return out;}finally{rmSync(work,{recursive:true,force:true});}}
function textOf(name:string){const file=join(dir,name);must(existsSync(file),`missing_fixture:${name}`);const text=ocrPdf(file);must(usableText(text),`no_readable_text:${name}`);return text;}
function card(type:string,text:string){const result=extractDocumentData(text,99,type);const fields=getDocumentPreviewFields({tipo:type,'tipo-canónico':type,'tipo_canónico':type,...result.fields});return{result,map:new Map(fields.map(x=>[x.label,x.value]))};}
function has(map:Map<string,unknown>,label:string){const v=map.get(label);return v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).trim()!=='—';}
function flags(text:string){const tests:[string,RegExp][]=[['desc',/DESCRIP/i],['finca',/FINCA/i],['ent',/ENTIDAD/i],['acr',/ACREEDOR/i],['banco',/BANCO/i],['prest',/PR[ÉE]STAMO/i],['cap',/CAPITAL/i],['saldo',/SALDO/i],['pend',/PENDIENTE/i],['cuota',/CUOTA/i],['rec',/RECIBO/i],['deuda',/DEUDA/i],['cert',/CERTIFICADO/i]];return tests.filter(([,r])=>r.test(text)).map(([k])=>k).join('.')||'none';}

physical('Notas Simples privadas reales rellenan lo soportado y no inventan',()=>{
 const names=['nota-simple-cristina.pdf','nota-simple-palomar.pdf','nota-simple-roncero.pdf'];let finca=0,cadastral=0,charges=0;
 for(const name of names){const text=textOf(name);const {result,map}=card('Nota simple',text);const diag=flags(text);must(result.documentType==='Nota simple',`nota_family:${name}:flags=${diag}`);must(has(map,'Registro'),`nota_registro:${name}:flags=${diag}`);must(has(map,'Titular/es'),`nota_titulares:${name}:flags=${diag}`);must(has(map,'Descripción de finca'),`nota_descripcion:${name}:flags=${diag}`);if(has(map,'Número de finca'))finca++;if(has(map,'Referencia catastral'))cadastral++;if(has(map,'Cargas')||has(map,'Hipotecas')||has(map,'Embargos'))charges++;}
 must(finca>=2,'nota_finca_across_real_set');must(cadastral>=1,'nota_reference_cadastral_across_real_set');must(charges>=1,'nota_charges_across_real_set');
});

physical('recibo de préstamo privado real respeta ausencia de datos no soportados',()=>{
 const text=textOf('prestamo-personal.pdf');const {result,map}=card('Préstamo / deuda',text);const diag=flags(text);must(result.documentType==='Préstamo / deuda','loan_family');must(has(map,'Vencimiento')||has(map,'Referencia')||has(map,'Entidad')||has(map,'Cuota'),`loan_any_supported_field:flags=${diag}`);
 if(!/cap|saldo/.test(diag))must(!has(map,'Capital pendiente'),`loan_no_fabricated_balance:flags=${diag}`);if(!/cuota|rec/.test(diag))must(!has(map,'Cuota'),`loan_no_fabricated_payment:flags=${diag}`);
});

physical('certificado privado real de deuda rellena acreedor y saldo pendiente',()=>{const text=textOf('certificado-deuda.pdf');const {result,map}=card('Certificado de deuda',text);const diag=flags(text);must(/Préstamo \/ deuda|Documento|Factura \/ recibo/.test(result.documentType),'debt_certificate_family');must(has(map,'Acreedor'),`debt_creditor:flags=${diag}`);must(has(map,'Saldo pendiente'),`debt_balance:flags=${diag}`);});
