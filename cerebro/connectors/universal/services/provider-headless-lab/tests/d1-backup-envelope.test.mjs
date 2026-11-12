import test from 'node:test';
import assert from 'node:assert/strict';
import {D1_BACKUP_SCOPE,D1_BACKUP_FORMAT,D1_BACKUP_MAX_BYTES,sealD1Backup,openD1Backup} from '../d1-backup-envelope.mjs';
const bytes=new TextEncoder().encode("CREATE TABLE lab_fixture (id INTEGER PRIMARY KEY, code TEXT); INSERT INTO lab_fixture VALUES (1, 'FIXTURE_ONLY');");
const key=crypto.getRandomValues(new Uint8Array(32));
const args=()=>({scope:D1_BACKUP_SCOPE,keyBytes:key});
const seal=()=>sealD1Backup({...args(),plaintext:bytes});
test('LAB 4D scope and AES-256-GCM format are fixed',()=>{
 assert.equal(D1_BACKUP_SCOPE.environment,'LAB');assert.equal(D1_BACKUP_SCOPE.database_id,'1305f791-7c44-47f9-946b-f330a09c88aa');
 assert.equal(D1_BACKUP_FORMAT,'FACT001-D1-FULL-DATA-AES256GCM-V1');
});
test('synthetic SQL encrypts and decrypts exactly inside backend',async()=>{
 const envelope=await seal();const restored=await openD1Backup({...args(),envelope});
 assert.deepEqual(restored,bytes);assert.equal(envelope.plaintext_bytes,bytes.length);
 assert.equal(envelope.key_material_included,false);
 assert.equal(JSON.stringify(envelope).includes('FIXTURE_ONLY'),false);
 assert.equal(JSON.stringify(envelope).includes(Buffer.from(key).toString('hex')),false);
});
test('independent snapshots use distinct random IV and ciphertext',async()=>{
 const a=await seal(),b=await seal();assert.notEqual(a.iv_b64,b.iv_b64);assert.notEqual(a.ciphertext_b64,b.ciphertext_b64);
});
test('rejects another company',async()=>assert.rejects(sealD1Backup({...args(),scope:{...D1_BACKUP_SCOPE,company_id:'other'},plaintext:bytes}),/SCOPE_DENIED/));
test('rejects another database and PROD on restore',async()=>{
 const envelope=await seal();
 await assert.rejects(openD1Backup({...args(),scope:{...D1_BACKUP_SCOPE,database_id:'other'},envelope}),/SCOPE_DENIED/);
 await assert.rejects(openD1Backup({...args(),scope:{...D1_BACKUP_SCOPE,environment:'PROD'},envelope}),/SCOPE_DENIED/);
});
test('rejects wrong 256-bit key without revealing plaintext',async()=>{
 const envelope=await seal();await assert.rejects(openD1Backup({...args(),keyBytes:new Uint8Array(32),envelope}),/AUTHENTICATION_FAILED/);
});
test('detects ciphertext tampering before decryption',async()=>{
 const envelope=await seal();const x={...envelope,ciphertext_b64:'AQID'+envelope.ciphertext_b64.slice(4)};
 await assert.rejects(openD1Backup({...args(),envelope:x}),/HASH_DENIED/);
});
test('detects forged envelope scope, format, and added fields',async()=>{
 const envelope=await seal();
 await assert.rejects(openD1Backup({...args(),envelope:{...envelope,scope:{...D1_BACKUP_SCOPE,environment:'PROD'}}}),/SCOPE_DENIED/);
 await assert.rejects(openD1Backup({...args(),envelope:{...envelope,format:'other'}}),/METADATA_DENIED/);
 await assert.rejects(openD1Backup({...args(),envelope:{...envelope,api_token:'forbidden'}}),/METADATA_DENIED/);
});
test('rejects invalid key and empty or oversized payload',async()=>{
 await assert.rejects(sealD1Backup({...args(),keyBytes:new Uint8Array(16),plaintext:bytes}),/KEY_INVALID/);
 await assert.rejects(sealD1Backup({...args(),plaintext:new Uint8Array()}),/PAYLOAD_INVALID/);
 await assert.rejects(sealD1Backup({...args(),plaintext:new Uint8Array(D1_BACKUP_MAX_BYTES+1)}),/PAYLOAD_INVALID/);
});
