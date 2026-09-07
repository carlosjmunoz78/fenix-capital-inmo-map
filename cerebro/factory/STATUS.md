# FACT-001 · Estado V0

- Estado funcional: DEFINED_NOT_BUILT → SCAFFOLD_CREATED.
- Entorno: PREPROD/aislado.
- PROD: no modificado.
- Registry: creado.
- Schema: creado.
- Specimens: FACT-001 y APP-001.
- Dependency map: inicial, no completo.
- Validator: creado.
- Tests: creados.
- CI: configurado; requiere resultado verde antes de considerar V0 validada.
- Merge: bloqueado por política hasta CI verde + caller inventory crítico.
- Coste adicional introducido: 0 €.

## Próximo gate
1. Confirmar CI del HEAD de esta rama.
2. Inventariar callers de endpoints solapados y de tablas con RLS desactivado.
3. Extender Registry con motores existentes sin modificar sus runtimes.
4. Solo entonces valorar Shared Runtime y contratos comunes.