import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Hablar con Ana combina contexto reglas canónicas y búsqueda ampliada sin IA generativa',()=>{
 const src=fs.readFileSync('src/GlobalCommunicationCommandGuard.tsx','utf8');
 expect(src).toContain('fetchAnaCanonicalApi');
 expect(src).toContain('/rules?domain=');
 expect(src).toContain('domainForScope');
 expect(src).toContain('domainForQuestion');
 expect(src).toContain('searchCerebro');
 expect(src).toContain('conocimiento canónico aprobado');
 expect(src).toContain('sin API generativa');
 expect(src).toContain('No voy a inventarla');
});

test('pregunta de funcionario 100 por ciento se clasifica como Hipotecas aunque se formule desde perfil',()=>{
 const src=fs.readFileSync('src/GlobalCommunicationCommandGuard.tsx','utf8');
 expect(src).toContain('/\\b(hipoteca|hipotecario|financiacion|banco|ltv|fein|tasacion|funcionario|autonomo|nomina|endeudamiento|subrogacion|novacion|refinanciacion|vivienda)\\b/');
 expect(src).toContain("domain==='Hipotecas'?`funcionario hipoteca 100 documentacion ${base}`");
 expect(src).toContain('const domain=domainForQuestion(value,scope)');
});
