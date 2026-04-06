# Rollback: Agents Analytics Permissions Compact UI

Fecha: 2026-04-06

## Alcance del cambio

- Se compactó la UI de "Permisos de Analytics entre agentes" en `AgentsPage`:
  - Selector de agente visor (panel izquierdo).
  - Editor del agente seleccionado (panel derecho) con buscador y chips.
  - Se mantuvo la misma lógica de permisos y guardado por agente.
- En edición de agente se habilitó cambio de `username`.

## Archivos impactados

- `client/src/pages/AgentsPage.tsx`

## Rollback rápido

1. Identificar el commit de este cambio en `main`.
2. Ejecutar:

```bash
git revert --no-edit <COMMIT_HASH>
git push origin main
```

## Verificación post-rollback

- En `Agents` vuelve la lista larga de tarjetas por agente para permisos de analytics.
- En edición de agente ya no aparece campo de `username`.
