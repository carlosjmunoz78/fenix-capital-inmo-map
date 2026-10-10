import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const probe=read('cerebro/voice/runtime/physical_lab_probe.py');
const bench=read('cerebro/voice/runtime/physical_lab_benchmark.py');
const install=read('cerebro/voice/runtime/windows/Install-VoiceLab.ps1');
const start=read('cerebro/voice/runtime/windows/Start-VoiceLab.ps1');
const register=read('cerebro/voice/runtime/windows/Register-And-Benchmark-Voice.ps1');
const doc=read('cerebro/voice/runtime/PHYSICAL_LAB_V0.md');
const req=read('cerebro/voice/runtime/requirements.txt');

test('physical LAB automation is explicitly non-PROD and private',()=>{
  assert.match(probe,/refuses PROD/);
  assert.match(probe,/physical LAB evidence must remain outside Git\/repository/);
  assert.match(bench,/physical benchmark refuses PROD/);
  assert.match(bench,/generated voice evidence must remain outside Git\/repository/);
  assert.match(start,/--host 127\.0\.0\.1/);
  assert.match(doc,/MODEL_NOT_PHYSICALLY_BENCHMARKED/);
  assert.match(doc,/cannot jump directly to PROD/);
});

test('Windows installer protects token and private storage outside the repository',()=>{
  assert.match(install,/LOCALAPPDATA.*CEREBRO\\voice-private/);
  assert.match(install,/ConvertFrom-SecureString/);
  assert.match(install,/Set-Acl/);
  assert.match(install,/Remove-Item Env:CEREBRO_VOICE_RUNTIME_TOKEN/);
  assert.doesNotMatch(install,/Write-Host.*plainToken/);
  assert.match(start,/ConvertTo-SecureString/);
  assert.doesNotMatch(start,/Write-Host.*plainToken/);
});

test('reference registration requires provenance and benchmark never auto-promotes',()=>{
  assert.match(register,/ConsentRef is mandatory for a recorded real speaker/);
  assert.match(register,/Provide ConsentRef or License/);
  assert.match(register,/MEASURED_NOT_ACCEPTED/);
  assert.match(bench,/"automatic_promotion": False/);
  assert.match(bench,/"accent_es_es": "REVIEW"/);
  assert.match(bench,/Physical listening review is mandatory before PREPROD_READY/);
});

test('benchmark covers exact fixed QA corpus and records resource evidence',()=>{
  for(let i=1;i<=10;i++) assert.match(bench,new RegExp(`"Q${i}"`));
  assert.match(bench,/ResourceMonitor/);
  assert.match(bench,/cpu_peak_pct/);
  assert.match(bench,/ram_peak_mb/);
  assert.match(bench,/gpu_vram_peak_mb/);
  assert.match(bench,/real_time_factor/);
  assert.match(req,/psutil>=6,<8/);
});

test('physical LAB scripts do not create a production or public cloning surface',()=>{
  const joined=[probe,bench,install,start,register].join('\n');
  assert.doesNotMatch(joined,/0\.0\.0\.0/);
  assert.doesNotMatch(joined,/\/clone/);
  assert.doesNotMatch(joined,/automatic_promotion["']?\s*[:=]\s*True/);
  assert.doesNotMatch(joined,/CEREBRO_ENVIRONMENT\s*=\s*["']PROD["']/);
});
