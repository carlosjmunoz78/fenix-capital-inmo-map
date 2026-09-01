import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('Herencia y Obra Nueva conservan recorrido por fases con fase actual y guía de Ana',()=>{
 const src=fs.readFileSync(path.resolve('src/SpecialCaseDetailExperience.tsx'),'utf8');
 expect(src).toContain("RECORRIDO DE LA HERENCIA");
 expect(src).toContain("RECORRIDO DE LA OBRA NUEVA");
 expect(src).toContain("ACTUAL: {currentLabel}");
 expect(src).toContain("aria-current={i===idx?'step':undefined}");
 expect(src).toContain("ANA · SIGUIENTE MEJOR ACCIÓN");
 expect(src).toContain("Siguiente fase prevista: ${nextLabel}");
});
