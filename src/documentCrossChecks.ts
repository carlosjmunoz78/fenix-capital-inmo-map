export type DocumentSnapshot={id?:string;type:string;fields:Record<string,unknown>;status?:string};
export type DocumentConflict={field:string;kind:'conflict'|'support';message:string;sources:string[];values:string[]};

function norm(v:unknown){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function first(doc:DocumentSnapshot,keys:string[]){for(const key of keys){const value=doc.fields?.[key];if(value!==undefined&&value!==null&&String(value).trim())return String(value).trim();}return'';}
function source(doc:DocumentSnapshot){return doc.id?`${doc.type} · ${doc.id}`:doc.type;}
function comparable(values:{doc:DocumentSnapshot;value:string}[],field:string){const nonEmpty=values.filter(x=>x.value);if(nonEmpty.length<2)return[] as DocumentConflict[];const groups=new Map<string,{raw:string;sources:string[]}>();for(const x of nonEmpty){const key=norm(x.value);const current=groups.get(key);if(current)current.sources.push(source(x.doc));else groups.set(key,{raw:x.value,sources:[source(x.doc)]});}if(groups.size===1){const only=[...groups.values()][0];return[{field,kind:'support' as const,message:`${field}: dato consistente entre documentos.`,sources:only.sources,values:[only.raw]}];}return[{field,kind:'conflict' as const,message:`${field}: existen valores distintos entre documentos; requiere revisión humana y no debe sobrescribirse nada automáticamente.`,sources:nonEmpty.map(x=>source(x.doc)),values:[...groups.values()].map(x=>x.raw)}];}

export function reconcileDocuments(docs:DocumentSnapshot[]){
 const payroll=docs.filter(d=>/n[oó]mina/i.test(d.type));
 const life=docs.filter(d=>/vida laboral/i.test(d.type));
 const contracts=docs.filter(d=>/contrato.*trabajo|contrato laboral/i.test(d.type));
 const renta=docs.filter(d=>/renta|irpf/i.test(d.type));
 const movements=docs.filter(d=>/movimientos|extracto bancario/i.test(d.type));
 const checks:DocumentConflict[]=[];
 checks.push(...comparable([...payroll.map(doc=>({doc,value:first(doc,['titular','trabajador'])})),...life.map(doc=>({doc,value:first(doc,['titular'])})),...contracts.map(doc=>({doc,value:first(doc,['titular','trabajador'])})),...renta.map(doc=>({doc,value:first(doc,['titulares','titular'])}))],'Titular'));
 checks.push(...comparable([...payroll.map(doc=>({doc,value:first(doc,['empresa','empresa_pagador'])})),...life.map(doc=>({doc,value:first(doc,['empresa_actual','empresa'])})),...contracts.map(doc=>({doc,value:first(doc,['empresa'])}))],'Empresa'));
 const payrollIncome=payroll.map(doc=>({doc,value:first(doc,['neto'])}));
 const movementPayrolls=movements.map(doc=>({doc,value:first(doc,['nominas','ingresos_recurrentes'])}));
 if(payrollIncome.some(x=>x.value)&&movementPayrolls.some(x=>x.value))checks.push({field:'Ingresos',kind:'support',message:'Ingresos: existen datos de nómina y movimientos para contraste; la equivalencia económica exacta requiere reglas de periodo y no se asume automáticamente.',sources:[...payrollIncome.filter(x=>x.value).map(x=>source(x.doc)),...movementPayrolls.filter(x=>x.value).map(x=>source(x.doc))],values:[...payrollIncome.filter(x=>x.value).map(x=>x.value),...movementPayrolls.filter(x=>x.value).map(x=>x.value)]});
 return{status:checks.some(x=>x.kind==='conflict')?'conflict':checks.length?'consistent':'insufficient',checks,conflicts:checks.filter(x=>x.kind==='conflict'),supports:checks.filter(x=>x.kind==='support')};
}
