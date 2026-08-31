#!/usr/bin/env node

/**
 * Builds an idempotent DRY-RUN transfer plan from the read-only legacy file manifest.
 *
 * This script performs NO network requests and NO mutations.
 * It does not download binaries, upload files, create Notion pages, or update relations.
 * Its only output is a JSON plan that can later be consumed by an explicitly authorized
 * migration runner after the destination environment and write contract are approved.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifestPath = process.argv[2] || 'legacy-document-files-manifest.json';
const mappingPath = process.argv[3] || 'legacy-expediente-destination-map.json';
const outputPath = process.argv[4] || 'legacy-document-transfer-plan.json';

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));

if (manifest.mode !== 'READ_ONLY_METADATA') {
  throw new Error(`Unexpected manifest mode: ${manifest.mode}`);
}
if (manifest.expediente_count !== 31 || manifest.file_count !== 118) {
  throw new Error(`Legacy manifest must be exactly 31 expedientes / 118 files; got ${manifest.expediente_count}/${manifest.file_count}`);
}
if (!Array.isArray(mapping.expedientes)) {
  throw new Error('Destination mapping must contain an expedientes array.');
}

const byDedupe = new Map();
for (const row of mapping.expedientes) {
  if (!row?.dedupe_key || !row?.destination_page_id) {
    throw new Error('Every destination mapping row requires dedupe_key and destination_page_id.');
  }
  if (byDedupe.has(row.dedupe_key)) {
    throw new Error(`Duplicate destination dedupe key: ${row.dedupe_key}`);
  }
  byDedupe.set(row.dedupe_key, row);
}

function stableKey({ dedupeKey, index, name }) {
  return createHash('sha256')
    .update(`${dedupeKey}\u0000${index}\u0000${name || ''}`)
    .digest('hex');
}

const transfers = [];
for (const expediente of manifest.expedientes) {
  const destination = byDedupe.get(expediente.dedupe_key);
  if (!destination) {
    throw new Error(`No destination mapping for ${expediente.expediente} (${expediente.dedupe_key})`);
  }
  if (destination.expediente && destination.expediente !== expediente.expediente) {
    throw new Error(`Destination title mismatch for ${expediente.dedupe_key}: ${destination.expediente} != ${expediente.expediente}`);
  }

  expediente.files.forEach((file, index) => {
    if (!file.name) throw new Error(`${expediente.expediente}: file ${index + 1} has no name.`);
    if (!file.signed_url && !file.external_url) {
      throw new Error(`${expediente.expediente}: ${file.name} has no retrievable source URL.`);
    }
    transfers.push({
      transfer_key: stableKey({ dedupeKey: expediente.dedupe_key, index, name: file.name }),
      expediente: expediente.expediente,
      legacy_page_id: expediente.legacy_page_id,
      expediente_dedupe_key: expediente.dedupe_key,
      destination_expediente_page_id: destination.destination_page_id,
      source_index: index,
      original_filename: file.name,
      source_type: file.type,
      source_url: file.signed_url || file.external_url,
      source_url_expires_at: file.expiry_time || null,
      intended_destination: 'Documentación · Fénix Capital',
      intended_relation: 'Expediente',
      intended_file_property: 'Archivo tratado',
      intended_dedupe_key: `legacy-doc-${stableKey({ dedupeKey: expediente.dedupe_key, index, name: file.name })}`,
      status: 'PLANNED_NOT_EXECUTED',
    });
  });
}

if (transfers.length !== 118) {
  throw new Error(`Transfer total mismatch: ${transfers.length}`);
}
const uniqueKeys = new Set(transfers.map((row) => row.transfer_key));
if (uniqueKeys.size !== transfers.length) {
  throw new Error('Transfer keys are not unique.');
}

const plan = {
  generated_at: new Date().toISOString(),
  mode: 'DRY_RUN_ONLY',
  source_manifest: manifestPath,
  destination_mapping: mappingPath,
  expediente_count: 31,
  file_count: 118,
  invariant: 'No binary transfer or Notion write has been executed.',
  execution_requirements: [
    'Explicit authorization for real migration execution',
    'Fresh signed source URLs generated immediately before transfer',
    'Approved destination environment and credentials',
    'Idempotency check on intended_dedupe_key before every create',
    'Post-transfer validation: 118/118 files accessible and related to the exact expediente',
    'No deletion or replacement of legacy attachments during coexistence period',
  ],
  transfers,
};

await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`DRY RUN: ${plan.expediente_count} expedientes / ${plan.file_count} files -> ${outputPath}`);
