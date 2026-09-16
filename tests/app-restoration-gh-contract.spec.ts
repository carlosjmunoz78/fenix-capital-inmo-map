import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

const requiredDedicatedModules=[
  ['Bancos','BancosShell','/bancos'],
  ['Inmobiliarias','InmobiliariasShell','/inmobiliarias'],
  ['Tasaciones','TasacionesShell','/tasaciones'],
  ['Financieros','FinancierosShell','/financieros'],
  ['Visitadores','VisitadoresShell','/visitadores'],
  ['Economía','EconomiaShell','/economia'],
  ['Informes','InformesShell','/informes'],
  ['Buscador avanzado','SearchShell','/buscar'],
  ['Notarías','NotariasShell','/notarias'],
  ['Registros de la Propiedad','RegistrosPropiedadShell','/registros-propiedad'],
] as const;

test('G · módulos obligatorios conservan superficies dedicadas y rutas canónicas',()=>{
  const main=read('src/main.tsx');
  const gate=read('src/OperationalShellGate.tsx');
  const direction=read('tests/visual-direction.spec.ts');

  for(const [label,shell,route] of requiredDedicatedModules){
    expect(main,`${label}: shell montado`).toContain(`<${shell} />`);
    if(route!=='/registros-propiedad')expect(gate,`${label}: ruta dedicada`).toContain(`'${route}'`);
    expect(direction,`${label}: navegación maestra visible`).toContain(label);
  }

  expect(main).toContain('<RegistrosPropiedadShell />');
  expect(direction).toContain("{label:'Registros de la Propiedad',route:'/registros-propiedad'}");
});

test('G · Obras Nuevas y Herencias reutilizan el runtime de casos especiales sin duplicar entidad',()=>{
  const main=read('src/main.tsx');
  const special=read('src/SpecialCasesShell.tsx');
  expect(main).toContain('<SpecialCasesShell />');
  expect(special).toContain("route:'/herencias'");
  expect(special).toContain("route:'/obras-nuevas'");
  expect(special).toContain('fetchSpecialCasesRuntime');
  expect(special).toContain('createSpecialCaseRuntime');
});

test('H · homes operativas de Financiero y Visitador permanecen separadas por ámbito',()=>{
  const roleHome=read('src/RoleHomeShell.tsx');
  expect(roleHome).toContain("r==='visitador'?'visitador':r==='financiero'?'financiero':'otro'");
  expect(roleHome).toContain("kind==='visitador'?'/inmobiliarias':'/expedientes'");
  expect(roleHome).toContain("const listRoute=isVisit?'/inmobiliarias':'/expedientes'");
  expect(roleHome).toContain("status===403");
  expect(roleHome).toContain('Tu perfil no tiene acceso a esta fuente.');
});

test('H · responsive, tema, Dirección y 403 forman parte del gate verificable',()=>{
  const workflow=read('.github/workflows/app-restoration-build.yml');
  const direction=read('tests/visual-direction.spec.ts');
  const informes=read('tests/visual-informes.spec.ts');
  const responsive=read('tests/navigation-responsive-widths.spec.ts');

  expect(workflow).toContain('tests/navigation-responsive-widths.spec.ts');
  expect(workflow).toContain('tests/visual-direction.spec.ts');
  expect(direction).toContain("getByRole('button',{name:'Cambiar tema'})");
  expect(informes).toContain('403');
  for(const width of ['360','390','768','820','1024'])expect(responsive).toContain(width);
});
