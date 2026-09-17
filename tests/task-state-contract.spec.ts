import {test,expect} from '@playwright/test';
import {isCancelledTaskState,isCompletedTaskState,isTerminalTaskState,normalizeTaskState} from '../src/taskState';

test.describe('Fénix · contrato canónico de estados de tarea',()=>{
 test('terminales excluyen canceladas, anuladas y bajas del trabajo activo',()=>{
  for(const state of ['Cancelada','CANCELADO','Anulada','Baja','Completada','Cerrada','Hecha','Finalizada']){
   expect(isTerminalTaskState(state),state).toBe(true);
  }
  for(const state of ['Pendiente','En curso','Esperando tercero','Aplazada','Sin estado']){
   expect(isTerminalTaskState(state),state).toBe(false);
  }
 });

 test('cancelada es terminal pero nunca completada',()=>{
  expect(isCancelledTaskState('Cancelada')).toBe(true);
  expect(isTerminalTaskState('Cancelada')).toBe(true);
  expect(isCompletedTaskState('Cancelada')).toBe(false);
 });

 test('normaliza mayúsculas y acentos sin cambiar la semántica',()=>{
  expect(normalizeTaskState('  COMPLETÁDA  ')).toBe('completada');
  expect(isCompletedTaskState('Completáda')).toBe(true);
 });
});
