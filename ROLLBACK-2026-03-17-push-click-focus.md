# Rollback 2026-03-17 - Push click focus sin recarga completa

## Objetivo del cambio
- Evitar que al tocar una notificacion push (OneSignal) se vuelva a abrir/cargar toda la PWA con splash.
- Si la app ya esta abierta: enfocar ventana existente y abrir el chat correcto sin recarga.
- Si la app no esta abierta: abrir normalmente con URL de conversacion.

## Archivos modificados
- `client/public/OneSignalSDKWorker.js`
- `client/src/main.tsx`
- `client/src/components/KanbanView.tsx`

## Rollback rapido (recomendado)
1. Identificar el commit de este cambio:
   - `git log --oneline -n 10`
2. Revertir ese commit:
   - `git revert <commit_sha>`
3. Subir:
   - `git push origin main`

## Rollback manual por archivos
Si prefieres rollback puntual:
- Restaurar solo estos archivos al estado anterior:
  - `git checkout <sha_previo> -- client/public/OneSignalSDKWorker.js client/src/main.tsx client/src/components/KanbanView.tsx`
- Commit + push:
  - `git commit -m "Rollback push click focus behavior"`
  - `git push origin main`

## Riesgo funcional al rollback
- Vuelve el comportamiento anterior: al tocar push puede recargar app completa y mostrar splash.
- No afecta el enrutamiento de entrega de notificaciones (admin/agentes), solo el click/open behavior.
