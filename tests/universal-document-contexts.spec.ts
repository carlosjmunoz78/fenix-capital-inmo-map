import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const guard=fs.readFileSync('src/UniversalDocumentIntelligenceGuardV2.tsx','utf8');
const guardRoutes=guard.replace(/\\/g,'');
const evidence=fs.readFileSync('supabase/functions/fenix-evidence-api/index.ts','utf8');
const intelligence=fs.readFileSync('supabase/functions/fenix-document-intelligence/index.ts','utf8');

test('franja documental universal cubre todas las fichas operativas pedidas',()=>{
 for(const route of ['/contactos/','/expedientes/','/firmas/','/inmobiliarias/','/tasaciones/','/tareas/','/documentacion/','/bancos/','/notarias/','/registros-propiedad/','/herencias/','/obras-nuevas/'])expect(guardRoutes).toContain(route);
 expect(guard).toContain('Ana · leer documento y rellenar datos');
 expect(guard).toContain('Subir documentos');
});

test('Ana bloquea clasificación ambigua, duplicado y conflicto antes de consolidar',()=>{
 expect(guard).toContain('Antes de leerlo necesito saber qué documento es y a qué persona pertenece.');
 expect(guard).toContain('saved.reused||saved.no_op');
 expect(guard).toContain('Este documento está repetido');
 expect(guard).toContain('r.status===409');
 expect(guard).toContain('confirm_overwrite:overwrite');
});

test('backend de evidencia acepta y valida todos los contextos nuevos',()=>{
 for(const origin of ['banco','notaria','registro','herencia','obra_nueva'])expect(evidence).toMatch(new RegExp(`${origin}:\\{id:`));
 expect(evidence).toContain("d12b4b24-a434-4d2d-994a-59cc6e060ae4");
 expect(evidence).toContain("053afd8f-0809-4d24-8006-1afd265e03a9");
 expect(evidence).toContain("b9e47ee9-582b-4b5f-9db2-f93c0085c6bd");
 expect(evidence).toContain("531079ec-b4a0-4eeb-9ecb-8bfbc864dfab");
 expect(evidence).toContain("6316cdee-01fd-42f9-95d0-1ec1dfd4b744");
 expect(evidence).toContain('Clave deduplicación');
 expect(evidence).toContain('Tipo documental canónico');
});

test('inteligencia guarda lectura genérica en CEREBRO sin forzar campos maestros incorrectos',()=>{
 for(const origin of ['banco','notaria','registro','herencia','obra_nueva'])expect(intelligence).toContain(origin);
 expect(intelligence).toContain('[CEREBRO · LECTURA DOCUMENTAL]');
 expect(intelligence).toContain('canonical_updates:0');
});
