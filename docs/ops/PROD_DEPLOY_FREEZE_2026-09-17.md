# PROD deploy freeze · 2026-09-17

## Estado

La App visible en `app.fenixcapital.es` queda congelada en el snapshot restaurado de `gh-pages` mientras se integran cambios de seguridad y documentación en `main`.

## Regla

- Un `push` o merge a `main` NO debe publicar automáticamente la App.
- La publicación PROD solo puede ejecutarse mediante `workflow_dispatch` y confirmación explícita `DEPLOY_PROD`.
- `gh-pages` se mantiene como artefacto de publicación y rollback.
- Antes de cualquier promoción: capturar SHA actual de `gh-pages`, ejecutar build/tests/smoke, comparar OLD vs NEW y conservar rollback probado.
- Si falla cualquier gate, no publicar o restaurar el snapshot anterior.

## Snapshot operativo restaurado

- `gh-pages`: `f3cfec750d81bf6a9e6412990786a5a5913d1113`
- source PROD: `d7f270c520417b5aba2ca5ea45c1ceb5def31ac7`

## Incidente de control detectado y corregido

Durante la implantación del freeze, un commit documental en `main` disparó todavía el workflow legacy `PROD Live Deploy #121`. El workflow completó y publicó `main` en `gh-pages`; se restauró inmediatamente `gh-pages` al snapshot operativo anterior y se eliminó el trigger automático `push: main` del workflow. Desde ese cambio, la publicación exige `workflow_dispatch` + confirmación exacta `DEPLOY_PROD`.

## Alcance

Este freeze no modifica CRM, datos, Supabase, Gateway ni permisos legacy. Solo desacopla la evolución de `main` de la publicación automática de la App.
