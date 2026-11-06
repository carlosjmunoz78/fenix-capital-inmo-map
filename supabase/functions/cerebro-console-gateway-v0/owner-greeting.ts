/**
 * CUT45 · owner-only deterministic executive greeting contract.
 * No model access, no runtime changes, no personal details and no impersonation.
 * Kept separate so the exact production-side greeting policy can be unit tested.
 */
export type OwnerGreetingTurn={role:'user'|'cerebro';text:string};

const OWNER_GREETINGS=Object.freeze([
  'A su disposición, señor. ¿Qué desea que revise?',
  'Buenas, señor. Le escucho. ¿En qué debo centrarme?',
  'Aquí estoy, señor. Indíqueme qué necesita comprobar.'
]);

export function closeOwnerGreeting(context:ReadonlyArray<OwnerGreetingTurn>=[]):string {
  const previous=context.filter(turn=>turn?.role==='cerebro'&&
    OWNER_GREETINGS.includes(String(turn.text??'').trim())).length;
  return OWNER_GREETINGS[previous%OWNER_GREETINGS.length];
}
