import {test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {extractDocumentData} from '../src/operationalDocumentExtraction';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

const dir=process.env.REAL_PRIVATE_DOC_DIR||'';
const enabled=Boolean(dir)&&existsSync(dir);
const physical=enabled?test:test.skip;

function must(ok:unknown,label:string):asserts ok{
 if(!ok)throw new Error(`PRIVATE_PHYSICAL_GATE_RED=${label}`);
}
function textOf(name:string){
 const file=join(dir,name);
 must(existsSync(file),`missing_fixture:${name}`);
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8',maxBuffer:24*1024*1024});
 must(text.trim().length>120,`no_embedded_text:${name}`);
 return text;
}
function card(type:string,text:string){
 const result=extractDocumentData(text,99,type);
 const fields=getDocumentPreviewFields({tipo:type,'tipo_canónico':type,...result.fields});
 const map=new Map(fields.map(x=>[x.label,x.value]));
 return{result,map};
}
function has(map:Map<string,unknown>,label:string){
 const v=map.get(label);return v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).trim()!=='—';
}

physical('tres Notas Simples privadas reales rellenan la ficha registral crítica',()=>{
 const names=['nota-simple-cristina.pdf','nota-simple-palomar.pdf','nota-simple-roncero.pdf'];
 let cadastral=0,charges=0;
 for(const name of names){
  const {result,map}=card('Nota simple',textOf(name));
  must(result.documentType==='Nota simple',`nota_family:${name}`);
  must(has(map,'Registro'),`nota_registro:${name}`);
  must(has(map,'Número de finca'),`nota_finca:${name}`);
  must(has(map,'Titular/es'),`nota_titulares:${name}`);
  must(has(map,'Descripción de finca'),`nota_descripcion:${name}`);
  if(has(map,'Referencia catastral'))cadastral++;
  if(has(map,'Cargas')||has(map,'Hipotecas')||has(map,'Embargos'))charges++;
 }
 must(cadastral>=1,'nota_reference_cadastral_across_real_set');
 must(charges>=1,'nota_charges_across_real_set');
});

physical('recibo de préstamo privado real rellena deuda pendiente y cuota sin inventar',()=>{
 const {result,map}=card('Préstamo / deuda',textOf('prestamo-personal.pdf'));
 must(result.documentType==='Préstamo / deuda',`loan_family`);
 must(has(map,'Entidad'),`loan_entity`);
 must(has(map,'Capital pendiente'),`loan_balance`);
 must(has(map,'Cuota'),`loan_payment`);
});

physical('certificado privado real de deuda rellena acreedor y saldo pendiente',()=>{
 const {result,map}=card('Certificado de deuda',textOf('certificado-deuda.pdf'));
 must(/Préstamo \/ deuda|Documento|Factura \/ recibo/.test(result.documentType),`debt_certificate_family`);
 must(has(map,'Acreedor'),`debt_creditor`);
 must(has(map,'Saldo pendiente'),`debt_balance`);
});
