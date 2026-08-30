import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const mapping = JSON.parse(fs.readFileSync('data/legacy-expediente-destination-map.json', 'utf8'));

test('mapeo documental legacy cubre exactamente los 31 expedientes auditados', async () => {
  expect(mapping.source).toBe('Expedientes · Fénix Capital');
  expect(mapping.data_source).toBe('collection://993423d0-8d3e-411e-bd2c-dceae3cb893b');
  expect(mapping.expediente_count).toBe(31);
  expect(mapping.expedientes).toHaveLength(31);

  const dedupe = mapping.expedientes.map((row: any) => row.dedupe_key);
  const destinationIds = mapping.expedientes.map((row: any) => row.destination_page_id);

  expect(new Set(dedupe).size).toBe(31);
  expect(new Set(destinationIds).size).toBe(31);
  for (const row of mapping.expedientes) {
    expect(row.dedupe_key).toMatch(/^exp-legado-[0-9a-f]{32}$/);
    expect(row.destination_page_id).toMatch(/^[0-9a-f]{32}$/);
    expect(row.expediente.trim().length).toBeGreaterThan(0);
  }
});
