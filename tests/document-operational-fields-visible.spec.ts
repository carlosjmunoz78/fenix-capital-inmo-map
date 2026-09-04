import {expect,test} from '@playwright/test';
import fs from 'node:fs';
const viewer=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');
test('la ficha documental visible monta las casillas financieras derivadas',()=>{expect(viewer).toContain("getDocumentOperationalFields");expect(viewer).toContain('data-testid="document-operational-fields"');expect(viewer).toContain('Lectura financiera útil');});
test('las casillas derivadas no sustituyen la evidencia exacta',()=>{const profile=fs.readFileSync('src/documentOperationalFieldProfile.ts','utf8');expect(profile).toContain('Años totales cotizados');expect(profile).toContain('Antigüedad empleo actual');expect(profile).toContain('Media mensual trabajo (anual / 12)');expect(profile).toContain('Alertas registrales');expect(profile).toContain('Vinculaciones que revisar');expect(profile).not.toMatch(/row\.total_dias\s*=/);});
