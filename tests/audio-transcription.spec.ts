import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('L5 audio transcription is isolated from canonical writes', async () => {
  const source = read('src/AudioTranscriptionGuard.tsx');
  expect(source).toContain("recognition.lang = 'es-ES'");
  expect(source).toContain('continuous = true');
  expect(source).toContain('interimResults = true');
  expect(source).toContain('navigator.clipboard.writeText');
  expect(source).toContain('no modifica expedientes, contactos ni otros registros automáticamente');
  expect(source).not.toContain('fetchAppApi');
  expect(source).not.toContain('supabase.from');
});

test('L5 audio transcription has permission and unsupported-browser fallbacks', async () => {
  const source = read('src/AudioTranscriptionGuard.tsx');
  expect(source).toContain('webkitSpeechRecognition');
  expect(source).toContain("error === 'not-allowed'");
  expect(source).toContain("error === 'no-speech'");
  expect(source).toContain('Dictado automático no disponible en este navegador.');
});

test('L5 audio transcription is globally mounted without reopening main routing', async () => {
  const main = read('src/main.tsx');
  const wrapper = read('src/IntelligentDocumentIngestionGuard.tsx');
  expect(main).toContain('<IntelligentDocumentIngestionGuard />');
  expect(wrapper).toContain("import AudioTranscriptionGuard from './AudioTranscriptionGuard';");
  expect(wrapper).toContain('<AudioTranscriptionGuard />');
});
