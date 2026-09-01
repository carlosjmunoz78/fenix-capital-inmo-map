import {test,expect} from '@playwright/test';
import {buildEconomyProjection} from '../src/economyProjection';

test('26 expedientes activos: 15 inmobiliaria + 11 directos proyectan 74.500 € de margen base',()=>{
  const agency=Array.from({length:15},(_,i)=>({id:`agency-${i}`,stage:'En curso',inmobiliaria_code:`INMO-${i}`}));
  const direct=Array.from({length:11},(_,i)=>({id:`direct-${i}`,stage:'En curso'}));
  const projection=buildEconomyProjection([...agency,...direct]);
  expect(projection.active.count).toBe(26);
  expect(projection.active.grossBaseEur).toBe(91000);
  expect(projection.active.marginBaseEur).toBe(74500);
  expect(projection.untypedCount).toBe(0);
});

test('honorario o comisión canónica específica prevalece sobre el fallback',()=>{
  const projection=buildEconomyProjection([{id:'x',stage:'En curso',inmobiliaria_code:'INMO-X',honorarios_finales_eur:4200,comision_inmobiliaria_eur:1300}]);
  expect(projection.active.grossBaseEur).toBe(4200);
  expect(projection.active.marginBaseEur).toBe(2900);
});
