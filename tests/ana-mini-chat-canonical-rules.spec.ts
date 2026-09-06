import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Hablar con Ana combines current context with approved canonical rules without generative AI',()=>{
 const src=fs.readFileSync('src/GlobalCommunicationCommandGuard.tsx','utf8');
 expect(src).toContain('fetchAnaCanonicalApi');
 expect(src).toContain('/rules?domain=');
 expect(src).toContain('domainForScope');
 expect(src).toContain('conocimiento canónico aprobado');
 expect(src).toContain('sin API generativa');
 expect(src).toContain('No voy a inventarla');
});
