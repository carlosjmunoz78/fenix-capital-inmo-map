/**
 * CUT33 · only two exact LAB host origins are allowed for B2 enrollment.
 * No suffix matching, wildcard, arbitrary Host or header-controlled domain.
 * CUT30's original hostname is preserved; CUT32 runs in parallel on a NEW
 * Access-protected Worker. Neither hostname is a PROD endpoint.
 */
const origins=new Set([
 'https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev',
 'https://cerebro-jarvis-cut32-lab-eu.carlosj-munozcabeza.workers.dev'
]);
export function isApprovedJarvisB2LabOrigin(origin){
 return typeof origin==='string'&&origins.has(origin);
}
