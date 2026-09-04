import {test,expect} from '@playwright/test';
import {reconcileDocuments} from '../src/documentCrossChecks';

test('vida laboral nomina y contrato detectan empresa inconsistente sin sobrescribir',()=>{
 const result=reconcileDocuments([
  {id:'n1',type:'Nómina',fields:{titular:'Ana Ruiz Pérez',empresa:'FENIX CAPITAL SL',neto:1850}},
  {id:'v1',type:'Vida laboral',fields:{titular:'Ana Ruiz Pérez',empresa_actual:'FENIX CAPITAL SL'}},
  {id:'c1',type:'Contrato de trabajo',fields:{trabajador:'Ana Ruiz Pérez',empresa:'OTRA EMPRESA SL'}}
 ]);
 expect(result.status).toBe('conflict');
 expect(result.conflicts.some(x=>x.field==='Empresa')).toBe(true);
 expect(result.conflicts.find(x=>x.field==='Empresa')?.message).toContain('no debe sobrescribirse nada automáticamente');
});

test('titular consistente entre renta nomina y vida laboral queda respaldado',()=>{
 const result=reconcileDocuments([
  {type:'Nómina',fields:{titular:'Ana Ruiz Pérez'}},
  {type:'Vida laboral',fields:{titular:'ANA RUIZ PEREZ'}},
  {type:'Declaración de la Renta / IRPF',fields:{titular:'Ana Ruiz Perez'}}
 ]);
 expect(result.conflicts).toHaveLength(0);
 expect(result.supports.some(x=>x.field==='Titular')).toBe(true);
});

test('nómina y movimientos solo preparan contraste económico y no inventan equivalencia',()=>{
 const result=reconcileDocuments([
  {type:'Nómina',fields:{neto:1850}},
  {type:'Movimientos bancarios',fields:{nominas:'Ingreso nómina 1.850,00 EUR'}}
 ]);
 const income=result.checks.find(x=>x.field==='Ingresos');
 expect(income?.kind).toBe('support');
 expect(income?.message).toContain('no se asume automáticamente');
});

test('con un solo documento no fabrica conflictos ni apoyos',()=>{
 const result=reconcileDocuments([{type:'Nómina',fields:{titular:'Ana Ruiz Pérez',empresa:'FENIX CAPITAL SL'}}]);
 expect(result.status).toBe('insufficient');
 expect(result.checks).toHaveLength(0);
});
