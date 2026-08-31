#!/usr/bin/env node

/**
 * Builds the exact 31-row destination mapping for the controlled legacy document migration.
 * Reads the refreshed legacy manifest and resolves each exp-legado-* key against
 * Expedientes · Fénix Capital. Read-only: no Notion mutations.
 */

import { readFile, writeFile } from 'node:fs/promises';

const NOTION_VERSION = '2026-03-11';
const EXPEDIENTES_DATA_SOURCE_ID = '993423d0-8d3e-411e-bd2c-dceae3cb893b';
const manifestPath = process.argv[2] || 'legacy-document-files-manifest.json';
const outputPath = process.argv[3] || 'legacy-expediente-destination-map.json';
const token = process.env.NOTION_TOKEN;
if (!token) throw new Error('NOTION_TOKEN is required.');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.expedientes) || manifest.expedientes.length !== 31 || manifest.file_count !== 118) {
  throw new Error(`Legacy manifest invariant failed: ${manifest.expedientes?.length || 0}/31 expedientes, ${manifest.file_count}/118 files`);
}

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function queryByDedupeKey(dedupeKey) {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${EXPEDIENTES_DATA_SOURCE_ID}/query`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filter: { property: 'Clave deduplicación', rich_text: { equals: dedupeKey } },
      page_size: 2,
    }),
  });
  if (!response.ok) throw new Error(`Notion destination query failed: ${response.status} ${await response.text()}`);
  return response.json();
}

function titleOf(page) {
  const titleProp = page.properties?.Expediente;
  if (!titleProp || titleProp.type !== 'title') return '';
  return (titleProp.title || []).map((part) => part.plain_text || '').join('').trim();
}

const expedientes = [];
for (const source of manifest.expedientes) {
  const result = await queryByDedupeKey(source.dedupe_key);
  const rows = result.results || [];
  if (rows.length !== 1) {
    throw new Error(`${source.expediente}: expected exactly 1 destination for ${source.dedupe_key}, received ${rows.length}`);
  }
  const destination = rows[0];
  const destinationTitle = titleOf(destination);
  if (destinationTitle !== source.expediente) {
    throw new Error(`${source.dedupe_key}: destination title mismatch: ${destinationTitle} != ${source.expediente}`);
  }
  expedientes.push({
    expediente: source.expediente,
    dedupe_key: source.dedupe_key,
    legacy_page_id: source.legacy_page_id,
    destination_page_id: destination.id.replaceAll('-', ''),
  });
}

if (expedientes.length !== 31 || new Set(expedientes.map((row) => row.destination_page_id)).size !== 31) {
  throw new Error('Destination mapping invariant failed: expected 31 unique destinations.');
}

const mapping = {
  generated_at: new Date().toISOString(),
  mode: 'READ_ONLY_DESTINATION_RESOLUTION',
  destination_data_source_id: EXPEDIENTES_DATA_SOURCE_ID,
  expediente_count: 31,
  expedientes,
};

await writeFile(outputPath, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');
console.log(`OK: resolved ${expedientes.length}/31 exact destination expedientes -> ${outputPath}`);
