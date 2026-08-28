import {test,expect} from '@playwright/test';
import {applyAnaRelationalStyle} from '../src/anaCommunicationStyle';

test('Ana mantiene ambos nombres cuando el expediente tiene dos clientes',async({},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  const styled=applyAnaRelationalStyle({
    name:'JORGE Y ALEX',
    action:'Confirmar documentación pendiente',
    why:'Porque falta documentación crítica antes de avanzar',
    channels:{
      llamada:{objetivo:'Confirmar documentación',guion:'',preguntas:[],resultado_esperado:''},
      whatsapp:{texto:''},
      email:{asunto:'Documentación pendiente',cuerpo:''}
    }
  });
  expect(styled.channels?.whatsapp?.texto).toContain('Hola, Jorge y Alex.');
  expect(styled.channels?.email?.cuerpo).toContain('Hola, Jorge y Alex:');
  expect(styled.channels?.llamada?.guion).toContain('Hola, Jorge y Alex.');
  expect(styled.channels?.whatsapp?.texto).not.toContain('Hola, Jorge.');
});
