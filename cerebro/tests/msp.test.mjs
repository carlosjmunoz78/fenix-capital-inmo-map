import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {auditEngine,completeEngine,MSP_COMPONENTS} from '../factory/msp.mjs';

const context={company_id:'fenix',engine_id:'VOICE-001',environment:'PREPROD',version:'0.1.0'};

test('MSP audits and completes only missing artifacts',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-msp-'));fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'manifest.json'),'existing','utf8');const before=auditEngine(root,context);assert.equal(before.status,'PARTIAL');assert.ok(before.missing.includes('health_checks'));const r=completeEngine(root,context);assert.equal(r.status,'STRUCTURAL_COMPLETE');assert.ok(!r.created.includes('manifest'));assert.equal(fs.readFileSync(path.join(root,'manifest.json'),'utf8'),'existing');for(const rel of Object.values(MSP_COMPONENTS))assert.equal(fs.existsSync(path.join(root,rel)),true);});

test('MSP is idempotent and never promotes PROD',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-msp-'));completeEngine(root,context);const again=completeEngine(root,context);assert.equal(again.created.length,0);assert.equal(again.prod_promotion,false);assert.throws(()=>auditEngine(root,{...context,environment:'PROD'}));});
