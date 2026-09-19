# Auditoría de riesgo residual — RHM (post hard-delete / Fase 1)

**Alcance:** tip de `main` tras merge de hard-delete admin, Fase 1 asistencia y cleanup.  
**Fecha:** 2026-09-19  
**Método:** revisión de código y scripts de despliegue; `npm test` ejecutado en rama de auditoría.

---

## Resumen ejecutivo

El flujo principal de kiosk (`registro-asistencia.html` + `registro-asistencia.js`) está alineado con el servidor: hora autoritativa en backend, token kiosk, foto obligatoria y tests de jornada en verde. Los riesgos que más pueden volver a tumbar asistencia o seguridad en producción son: **despliegue sin `KIOSK_TOKEN` / sin `NODE_ENV=production`**, **uso de la página legacy `perfil.html`**, **volcados SQLite en el repo (`rhr_base64.txt`)**, y **APIs de empleados abiertas en LAN sin autenticación**.

---

## Bloqueantes

### B1 — `deploy.sh` no fija `NODE_ENV=production` ni `TZ` en PM2

| | |
|---|---|
| **Archivos** | `deploy.sh`, `backend/lib/kiosk-auth.js`, `backend/server.js` |
| **Evidencia** | `requireKiosk` solo rechaza checadas sin token si `KIOSK_TOKEN` está definido **o** `NODE_ENV === 'production'` (`kiosk-auth.js` L31–52). `deploy.sh` arranca PM2 sin exportar `NODE_ENV` ni `TZ` (L69–78). `server.js` pone `TZ` por defecto en el proceso Node, pero PM2 no recibe `NODE_ENV` automáticamente. |
| **Impacto** | En un Droplet “en producción” pero con `NODE_ENV` unset y sin `KIOSK_TOKEN`, **cualquiera en la red puede registrar asistencia sin token** (modo desarrollo). Si luego se define solo `KIOSK_TOKEN` en el archivo de tablet pero no en el proceso PM2, checadas fallan con 401/503. |
| **Fix recomendado** | En despliegue: `export NODE_ENV=production`, `export TZ=America/Mexico_City`, `export KIOSK_TOKEN=...`, y `pm2 start/restart --update-env`. Documentar en README/ecosystem PM2. *(Parche mínimo aplicado en esta rama en `deploy.sh`.)* |

### B2 — Página legacy `perfil.html` / `perfil-empleado.js` (sin kiosk, reloj cliente)

| | |
|---|---|
| **Archivos** | `frontend/empleado/perfil.html`, `frontend/js/perfil-empleado.js` |
| **Evidencia** | `perfil-empleado.js` actualiza fecha/hora con `new Date()` y `toLocaleDateString`/`toLocaleTimeString` (L71–91) y envía `fecha`/`hora` en el POST (L434–435), pero el backend **ignora** el body y usa `fechaHoraServidorMexico()` (`asistencia.js` L199). No carga `kiosk-token-loader.js` ni envía `X-Kiosk-Token` (contrasta con `registro-asistencia.js` L556–565). `main.js` ya redirige a `registro-asistencia.html` (L67), pero **`perfil.html` sigue accesible por URL directa o favoritos**. |
| **Impacto** | Tablets con bookmark viejo: **401/503 en producción** (sin token), UI muestra hora de la tablet (desincronizada respecto a la checada real), confusión operativa. |
| **Fix recomendado** | Redirigir `perfil.html` → `registro-asistencia.html` o eliminar la página; alinear o borrar `perfil-empleado.js`. *(Redirect aplicado en esta rama.)* |

### B3 — Volcado de base de datos en el repositorio

| | |
|---|---|
| **Archivos** | `rhr_base64.txt` (~256 KB), `rhr_activos_base64.txt` (~38 KB) — tracked en git (`git ls-files`) |
| **Evidencia** | Cabecera `U1FMaXRl` = SQLite en base64. |
| **Impacto** | Exposición de **PII** (empleados, asistencia, posibles fotos en BLOB, credenciales admin en texto plano si el dump es de prod). Riesgo legal y de acceso no autorizado si el repo es público o se filtra. |
| **Fix recomendado** | Eliminar del repo, rotar contraseñas admin y `KIOSK_TOKEN`, auditar historial git (`git filter-repo` / BFG). No volver a commitear dumps. |

---

## Mayores

### M1 — Credenciales admin: texto plano + documentación incorrecta

| | |
|---|---|
| **Archivos** | `backend/routes/auth.js` (L140–142), `backend/scripts/init-database.js` (L34–38), `README.md` (L95) |
| **Evidencia** | Login compara `password` en claro con la columna `administradores.password`. `init-database.js` crea `admin` / `RhmAdmin!2026#`. README aún dice `admin123`. |
| **Impacto** | Lockout o uso de contraseña débil documentada; compromiso de DB expone admin inmediato. |
| **Fix recomendado** | bcrypt/argon2; alinear README con `init-database.js`; forzar `npm run set-admin-password` post-deploy. |

### M2 — APIs kiosk sin autenticación (solo red LAN / HTTPS)

| | |
|---|---|
| **Archivos** | `backend/routes/empleados.js` (L40–116, antes de `router.use(requireAdmin)`) |
| **Evidencia** | `GET /api/empleados/listar` y `GET /api/empleados/listar-con-cargos` son públicos; el segundo expone `vence_induccion`, `mandar_a_curso`, `vigencia_de`, flags de exámenes médicos. |
| **Impacto** | Cualquier cliente en la red puede enumerar personal y datos de salud/capacitación sin token kiosk ni JWT. |
| **Fix recomendado** | Exigir `requireKiosk` o JWT en `listar-con-cargos`; endpoint mínimo para kiosk solo con campos necesarios para alertas de curso. |

### M3 — Despliegue PM2 vs README / scripts auxiliares

| | |
|---|---|
| **Archivos** | `README.md`, `deploy.sh`, `CONFIGURAR_HTTPS_SIMPLE.sh` (nginx+certbot) |
| **Evidencia** | README y `deploy.sh` asumen **Node HTTPS directo** en :3000 y redirect :3080 (`server.js` L118–151). No hay Caddy en el repo; `CONFIGURAR_HTTPS_SIMPLE.sh` instala **nginx** (otro camino). `deploy.sh` no crea `ecosystem.config.js` ni persiste env en PM2 tras `restart`. |
| **Impacto** | Operador mezcla nginx/Caddy con cert en :443 y Node en :3000 → tablets abren URL incorrecta, cert distinto, o HTTP sin cámara. `pm2 restart` sin `--update-env` pierde variables nuevas. |
| **Fix recomendado** | Un solo runbook (HTTPS terminado dónde, qué puerto abre firewall). `pm2 ecosystem` con `env: { NODE_ENV, KIOSK_TOKEN, TZ }`. |

### M4 — Columna `anulado` (soft-delete legacy) vs hard-delete actual

| | |
|---|---|
| **Archivos** | `backend/routes/asistencia.js` (filtros `anulado IS NULL OR anulado = 0` en listar/cargar), `backend/database/db.js` (`migrateAsistenciaPhase1`), admin DELETE hace `DELETE FROM asistencia` (L575) |
| **Evidencia** | Registros antiguos con `anulado = 1` siguen en SQLite pero **invisibles** en UI y nómina; el admin ya no crea nuevos anulados. |
| **Impacto** | Datos “fantasma” en DB; informes SQL crudos pueden contar mal; confusión si alguien esperaba auditoría soft-delete. |
| **Fix recomendado** | Migración one-shot: `DELETE FROM asistencia WHERE anulado = 1` o documentar; eventualmente quitar columna/filtros. |

### M5 — SQLite + fotos base64 en la misma tabla

| | |
|---|---|
| **Archivos** | `backend/routes/asistencia.js` (INSERT `foto`), `backend/server.js` (`bodyParser` 5mb) |
| **Evidencia** | Fotos en columna `TEXT`; listado admin no incluye foto salvo `incluir_foto`; endpoint dedicado `/registro/:id/foto`. |
| **Impacto** | DB crece rápido; backups lentos; riesgo de `SQLITE_BUSY` bajo carga (mitigado con WAL, `busy_timeout`, locks en memoria y PM2 `-i 1`). |
| **Fix recomendado** | Almacenar archivos en disco/object storage; guardar solo path en DB. |

---

## Menores

### N1 — `perfil-empleado.js` envía `fecha`/`hora` innecesarios

| | |
|---|---|
| **Evidencia** | POST incluye campos ignorados por el servidor. |
| **Impacto** | Solo confusión en debugging; no altera la checada si se usa la página correcta. |

### N2 — Admin UI: carrera entre `admin-auth.js` y scripts de página

| | |
|---|---|
| **Archivos** | `frontend/js/admin-auth.js`, `frontend/js/admin-asistencia.js` |
| **Evidencia** | `verificarSesionAdmin()` y `cargarAsistencia()` arrancan en paralelo en `DOMContentLoaded`; el fetch global añade token si existe en `localStorage`. |
| **Impacto** | Raro 401 flash antes de redirect si sesión expirada. |

### N3 — Listado admin limitado a 500 filas

| | |
|---|---|
| **Archivos** | `backend/routes/asistencia.js` L381 |
| **Evidencia** | `ORDER BY a.id DESC LIMIT 500` |
| **Impacto** | Rangos amplios con muchas checadas ocultan registros recientes/antiguos según orden. |

### N4 — `kiosk-config` consultado cada 1 s

| | |
|---|---|
| **Archivos** | `frontend/js/registro-asistencia.js` L29–30 |
| **Impacto** | Carga marginal; hora en UI podría interpolarse localmente entre polls. |

### N5 — Filtro de fechas admin usa reloj del navegador

| | |
|---|---|
| **Archivos** | `frontend/js/admin-asistencia.js` L15–17 (`fechaISOLocal(new Date())`) |
| **Impacto** | “Hoy” en admin puede diferir de medianoche México si el PC del admin está en otra zona (el servidor ordena por `claveFechaOrden` en MX en checadas). |

---

## Deuda técnica

| ID | Tema | Notas |
|----|------|--------|
| D1 | `package-lock.json` en `.gitignore` | `npm audit` requiere lockfile; builds no reproducibles. |
| D2 | Dependencias (`sqlite3` → `node-gyp` → `tar`) | `npm audit`: hallazgos **critical** en cadena de instalación; riesgo principalmente en **build**, no runtime. |
| D3 | CORS abierto (`app.use(cors())`) | Amplifica impacto de XSS/token robado en otro origen. |
| D4 | Código muerto | `perfil-empleado.js`, scripts ngrok/HTTPS alternativos, QR en empleados (README dice sin QR en kiosk). |
| D5 | JWT admin en `localStorage` | Patrón estándar pero vulnerable a XSS en cualquier página admin. |
| D6 | Locks `locksEmpleado` en memoria | Correcto solo con **una** instancia PM2 (documentado en README). |

---

## Módulo asistencia — checklist verificado

| Área | Estado | Notas |
|------|--------|--------|
| Registro POST | OK | `fechaHoraServidorMexico`, transacción, lock por empleado, foto requerida |
| Token kiosk | OK si ops correctas | Falla cerrada con `KIOSK_TOKEN` + header; ver B1 |
| Jornada FIFO / 9.5 h | OK | Tests incl. auto-cierre, doble entrada, salida sin entrada |
| Admin listar / foto | OK | `requireAdmin`; foto vía endpoint separado |
| Admin delete | OK (hard-delete) | Cascada ENTRADA+SALIDA vía `resolverIdsEliminacionAsistencia` |
| Nómina | OK | Filtra `anulado`; misma lib `asistencia-jornada` |

---

## npm test

En entorno con `npm install`, `npm test` pasa (18 aserciones incl. hard-delete y kiosk-auth).

---

## Cambios en esta rama (auditoría)

1. `AUDIT_RESIDUAL.md` (este documento).  
2. Redirect `perfil.html` → `registro-asistencia.html`.  
3. `deploy.sh`: export por defecto `NODE_ENV=production` y `TZ=America/Mexico_City`; `pm2 restart --update-env`.  
4. README: contraseña inicial alineada con `init-database.js`.
