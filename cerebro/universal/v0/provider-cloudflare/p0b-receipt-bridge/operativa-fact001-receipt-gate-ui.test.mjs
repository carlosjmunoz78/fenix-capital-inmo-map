import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const panel=readFileSync(new URL('../../../../../src/CerebroUniversalOperativaLabPanel.tsx',import.meta.url),'utf8');
test('LAB OPERATIVA never calls unavailable P0-B receipt proof certified or PROD-ready',()=>{
 assert.match(panel,/FACT-001 · recibos de operaciones externas/);
 assert.match(panel,/Certificación desde este Gateway: NO VERIFICADA · Promoción PROD: BLOQUEADA/);
 assert.match(panel,/todavía no recibe un recibo HMAC cotejado por el servidor/);
 assert.match(panel,/No se realizan consultas directas a Cloudflare desde el navegador/);
});
test('P0-B UI gate only appears inside existing authorized LAB ready-state',()=>{
 assert.match(panel,/\{result\?\.kind==='ready'\?<div className="op-uni-lab-work" aria-label="FACT-001 · verificación de recibos firmados del proveedor">/);
 assert.match(panel,/if\(!enabled\)return null/);
 assert.doesNotMatch(panel,/https:\/\/api\.cloudflare\.com/);
 assert.doesNotMatch(panel,/CF_WORKERS_TOKEN|FACT001_RECEIPT_SIGNING_KEY_HEX|FACT001_ROUTES_READ_TOKEN/);
});
