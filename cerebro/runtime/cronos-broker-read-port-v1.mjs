import { isDeepStrictEqual } from 'node:util';
import { SOURCE, normalizeCronosCloudflareResponseV1 } from './cronos-workflow-read-port-v1.mjs';

const BROKER_REQUEST = Object.freeze({
  method: 'GET',
  path: '/v1/cronos/evidence/live005',
  redirect: 'manual',
  cache: 'no-store',
});

// Supply a host-owned transport bound to the Access-protected broker.
// The transport owns machine identity and signing. Jobs only select the pinned source.
export function createCronosBrokerReadPortV1({ request } = {}) {
  if (typeof request !== 'function') throw new Error('CRONOS_MACHINE_TRANSPORT_REQUIRED');

  return async function readback(source, { signal } = {}) {
    if (!isDeepStrictEqual(source, SOURCE)) throw new Error('CRONOS_SOURCE_DENIED');
    if (signal?.aborted) throw new Error('CRONOS_ABORTED');

    let response;
    try {
      response = await request({ ...BROKER_REQUEST, signal });
    } catch {
      throw new Error(signal?.aborted ? 'CRONOS_ABORTED' : 'CRONOS_BROKER_READ_FAILED');
    }

    if (signal?.aborted) throw new Error('CRONOS_ABORTED');
    const evidence = await normalizeCronosCloudflareResponseV1(response);
    if (signal?.aborted) throw new Error('CRONOS_ABORTED');
    return evidence;
  };
}
