import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('operational chrome guard explicitly owns reported overlap routes',()=>{
 const guard=fs.readFileSync('src/OperationalRouteScrollReset.tsx','utf8');
 for(const route of ['/perfil','/expedientes/nuevo','/contactos/nuevo','/documentacion/nuevo']){
  expect(guard).toContain(`'${route}'`);
 }
 expect(guard).toContain("document.documentElement.dataset.operationalChrome='1'");
 expect(guard).toContain("delete document.documentElement.dataset.operationalChrome");
});

test('legacy App sidebar and header/main are hard hidden on operational chrome routes',()=>{
 const css=fs.readFileSync('src/operational-route-isolation.css','utf8');
 expect(css).toContain("html[data-operational-chrome='1'] .app-shell .sidebar");
 expect(css).toContain("html[data-operational-chrome='1'] .app-shell .main");
 expect(css).toContain('display:none!important');
 expect(css).toContain("html[data-operational-chrome='1'] .app-shell > .calc-launcher");
});

test('dedicated shells exist for all four reported screens',()=>{
 const expediente=fs.readFileSync('src/ExpedienteCreateShell.tsx','utf8');
 const contacto=fs.readFileSync('src/ContactCreateShell.tsx','utf8');
 const documento=fs.readFileSync('src/DocumentCreateShell.tsx','utf8');
 const perfil=fs.readFileSync('src/ProfileShell.tsx','utf8');
 for(const source of [expediente,contacto,documento,perfil]){
  expect(source).toContain('OperationalShellFrame');
 }
 expect(expediente).toContain("location.pathname==='/expedientes/nuevo'");
 expect(contacto).toContain("location.pathname==='/contactos/nuevo'");
 expect(documento).toContain("location.pathname==='/documentacion/nuevo'");
 expect(perfil).toContain("location.pathname==='/perfil'");
});
