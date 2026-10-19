# Informe de calidad de Finanverso

**Fecha:** 20-10-2026 · **Rama auditada:** `develop` (commit `ea61351`, v1.47.0) · **Alcance:** rendimiento, arquitectura (React y SOLID), tests y seguridad, producto.

**Método:** todo lo que aparece aquí se ha medido en una copia aparte del repositorio (un *worktree* en `/tmp/audit`). Se usó una pila local de producción: el build de Vite servido con compresión brotli, la API compilada en el puerto 3917 y una base de datos de demo inventada con 10.600 movimientos. No se tocó ningún servidor del dueño. Los comandos para repetir cada medición están en el [Anexo](#anexo-cómo-reproducir-cada-medición).

---

## Resumen ejecutivo

| Área | Nota | En una frase |
|---|---|---|
| Rendimiento | **7/10** | Las páginas públicas cargan rápido (Lighthouse en móvil: 83-91). El panel con muchos movimientos se resiente: 17.600 nodos en la página, saltos de diseño (CLS 0,68 en móvil) y unos 350 ms de bloqueo cada vez que marcas una fila en un móvil medio. |
| Arquitectura / SOLID | **7/10** | El backend está muy limpio: capas bien separadas y ninguna dependencia circular. El frontend tiene la lógica fiscal en un dominio puro, pero arrastra 22 ciclos de importación, varias funciones «dios» (`buildLedger`, con complejidad 79) y un contexto global que redibuja demasiado. |
| Tests | **7,5/10** | Hay 7.583 tests. El 100 % del frontend es honesto: no hay exclusiones tramposas. Pero la prueba de mutación muestra que los tests no detectan 1 de cada 5 errores en el cálculo del 130 y el 303. Además, 401 casos fiscales están marcados como pendientes (`todo`), solo hay 10 tests E2E, no hay tests de contrato entre frontend y backend y un test falla cuando la máquina va cargada. |
| Seguridad | **7/10** | No hay secretos en el repositorio. En producción, el backend no tiene vulnerabilidades y el frontend tiene 1 moderada (fflate). Hay helmet, límites de peticiones y validación con zod. Lo débil: la CSP de la web está solo en modo informe y los tokens de sesión se guardan en `localStorage`. |
| Producto | **7/10** | Es muy completo en Renta, Autónomos e inversiones. Faltan monitorización y alertas, la analítica de producto real, los recordatorios de plazos fiscales, el RGPD formal (registro de actividades, contratos con proveedores, evaluación de impacto) y la revisión de un gestor colegiado. |

**Las 10 acciones de mayor retorno** (esfuerzo: S = horas o 1 día, M = 1 semana, L = 1 mes):

1. **(S) Corregir un fallo del backend que duplica los datos del mes.** El resumen de la respuesta de `/api/months` vuelve a incluir todos los movimientos. Es `presentSummary(o.summary, o)` en `presenters.ts:94`. El mes pesa el doble (265 kB en lugar de 131 kB).
2. **(S) Que la imagen principal de la landing se cargue con prioridad.** Hoy es la imagen que marca el LCP y lleva `loading="lazy"`. Hay que ponerle `fetchpriority="high"` y quitar el lazy.
3. **(S) Reservar el alto del panel de previsión** (`data-tour="forecast"`) para eliminar el salto de diseño (CLS de 0,68 a menos de 0,1). Y corregir el contraste del contador de cada día (`.tx-day-count`, 1,47:1).
4. **(S) Activar la CSP de verdad** (`Content-Security-Policy` en lugar de `-Report-Only` en el `Caddyfile`), con un `report-to`.
5. **(S) Monitorización externa de la web y de `/api/health`**, Sentry o GlitchTip alojado en la UE, y límites de memoria en Docker.
6. **(M) Partir las traducciones.** `es.json` (436 kB, 4.789 claves) va dentro del paquete JS principal: es la mayor parte de sus 483 kB. Hay que cargarlo por secciones.
7. **(M) Virtualizar la tabla de movimientos y memoizar las filas** (`React.memo`; hoy no se usa en ninguna parte). Marcar una fila no debe redibujar 600.
8. **(M) Escribir tests de contrato entre frontend y backend:** pasar los cuerpos que envía el frontend por los esquemas zod del backend. Un esquema estricto ya rompió una vez el guardado en la cuenta. Añadir también unos 15 tests de límites en el 130 y el 303: hoy sobreviven el 20 % de los mutantes.
9. **(M) Ampliar los E2E de 10 a unos 25.** Hoy no cubren importar, el asistente de la Renta, Autónomos, los pagos ni el 2FA.
10. **(M/L) Ponerse con los pendientes fiscales:** versionar las reglas por ejercicio (P0-1) antes de abril de 2027, conseguir la revisión de un gestor colegiado y cerrar los 401 casos `todo`.

---

## A. Rendimiento

### A.1 Tamaño del build

Se ejecutó `npm run build` (93 s; incluye `tsc`, los tests de SEO, `vite build`, el prerender de 76 páginas y la compresión):

- 519 archivos en `dist/assets`.
- **JS: 7,2 MB** sin comprimir.
- **CSS: 25 archivos, 199 kB** (41 kB en brotli).
- Total comprimido: 1.853 kB en brotli y 2.282 kB en gzip.
- Vite avisa de **6 chunks de más de 500 kB**.

**Los 20 archivos mayores (kB):**

| # | Archivo | Sin comprimir | gzip | brotli | Qué es |
|---|---|---:|---:|---:|---|
| 1 | casillas-2025 | 711 | 81 | 57 | Datos de casillas de la AEAT |
| 2 | form-layout-100 | 671 | 138 | 98 | Plano del modelo 100 (fuera de la precaché) |
| 3 | casillas-2024 | 651 | 76 | 53 | Datos de la AEAT |
| 4 | casillas-2023 | 605 | 72 | 51 | Datos de la AEAT |
| 5 | formPdf | 514 | 204 | 161 | pdf-lib para rellenar modelos |
| 6 | **index (entrada)** | **483** | **140** | **115** | Aplicación más **`es.json` completo** |
| 7 | en (traducciones) | 389 | 110 | 90 | Inglés |
| 8 | jspdf.es.min | 375 | 120 | 102 | jsPDF |
| 9 | pdf (pdf.js) | 356 | 104 | 88 | Lector de PDF |
| 10 | rentaProgress | 289 | 90 | 75 | Motor de la Renta |
| 11 | CampaignDates | 288 | 86 | 74 | Fechas y guías |
| 12 | react | 228 | 72 | 63 | React y router |
| 13 | 390 | 174 | 39 | 29 | Modelo 390 |
| 14 | DashboardPage | 130 | 39 | 33 | Panel |
| 15 | InvestView | 121 | 39 | 34 | Inversiones |
| 16 | signupWall | 112 | 33 | 29 | |
| 17 | 303 | 105 | 25 | 20 | Modelo 303 |
| 18 | 349 | 92 | 18 | 11 | Modelo 349 |
| 19 | BusinessView | 88 | 24 | 21 | Autónomos |
| 20 | DashboardPage.css | 49 | 9 | 8 | |

**Qué descarga cada primera visita** (datos de `dist/index.html` y de Lighthouse):

- **Landing:**
  - Archivos: `index.js` (115 kB brotli), `react.js` (63 kB) y `index.css` (2 kB).
  - Lighthouse: unos 320 kB transferidos, imágenes incluidas.
  - Cobertura de Chrome: 724 kB de JS que hay que interpretar, y se usa el 51 % del CSS de la landing.
- **Login:** lo mismo que la landing más el chunk de `AuthPage`. Total: 342 kB.
- **Panel tras iniciar sesión:**
  - `theme-init.js` precarga 15 archivos más: 255 kB sin comprimir, 63 kB en brotli.
  - En total se pidieron 29 *assets*.
  - Del CSS cargado (98 kB) se usa el 30 %.

**El hallazgo principal es que `es.json` está dentro del chunk de entrada.** El archivo tiene 436 kB y 4.789 claves, y lo importa de forma estática `core/i18n/I18nContext.tsx:3`. Por eso `index.js` pesa 483 kB. Un visitante de la landing descarga y analiza todos los textos de Renta, Autónomos e inversiones.

El inglés sí está bien: se carga aparte (`en-*.js`) y solo cuando hace falta.

**Code-splitting:**

- Hay 124 `import()` dinámicos.
- Las rutas usan `lazyNamed` en `App.tsx`.
- pdf.js, jsPDF, pdf-lib, tesseract (en `public/ocr`, 14 MB, fuera de la precaché) y fflate se cargan bajo demanda.

Está bien resuelto. El problema son las traducciones y los datos de la AEAT.

### A.2 Precaché del service worker

- 176 entradas.
- 6.223 kB sin comprimir. Pero nginx sirve `.br`, así que **la transferencia real es de unos 1,3 MB**.

| Grupo | Entradas | Sin comprimir (kB) | brotli (kB) | ¿Imprescindible sin conexión? |
|---|---:|---:|---:|---|
| casillas-2023/2024/2025 | 3 | 1.968 | 162 | No: solo hacen falta en la Renta. Bastaría el ejercicio en curso, y bajo demanda |
| Resto de JS | 141 | 3.975 | 1.034 | Parcialmente: `en.js` (90 kB br) solo hace falta a quien usa inglés |
| CSS | 25 | 199 | 41 | Sí |
| Imágenes y fuentes | 6 | 66 | 66 | Sí |
| HTML | 1 | 14 | 14 | Sí |

**Estimación:** lo imprescindible para el uso diario sin conexión (núcleo, panel, CSS e iconos) son unos **600-700 kB en brotli**. Si se sacan de la precaché las casillas de años anteriores, `en.js` y los motores fiscales (que se guardarían en caché la primera vez que se usen, con `runtimeCaching` y `StaleWhileRevalidate`), la instalación baja aproximadamente a la mitad.

### A.3 Imágenes y fuentes

- No hay fuentes web: se usa la tipografía del sistema. Bien.
- Las imágenes de la landing ya son WebP y la mayor pesa 21 kB.
- Los PNG mayores están en `public/`: `logo-512.png`, `og-image.png` e `icon-512.png`, de 108-127 kB cada uno, y `logo-mark.png`, de 69 kB. Quedan fuera de la precaché, así que no afectan a la carga normal.
- **Fallo detectado:** la imagen de la landing que marca el LCP lleva `loading="lazy"`. Lighthouse la señala (`lcp-lazy-loaded`).

### A.4 Lighthouse

Medido con Lighthouse 12 sobre la pila local. Móvil = 4G lenta simulada y CPU 4 veces más lenta. Escritorio = preset `desktop`.

| Página | Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS | TTI |
|---|---|---:|---:|---:|---:|---|---|---|---|---|
| `/` (landing) | móvil | 91 | 100 | 100 | 100 | 2,3 s | 3,0 s | 0 ms | 0,026 | 3,1 s |
| `/` | escritorio | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,016 | 0,7 s |
| `/login` | móvil | 85 | 100 | 100 | 66¹ | 2,0 s | 4,2 s | 0 ms | 0,016 | 4,2 s |
| `/login` | escritorio | 100 | 100 | 100 | 66¹ | 0,4 s | 0,6 s | 0 ms | 0,01 | 0,6 s |
| `/guias` | móvil | 90 | 100 | 100 | 100 | 2,1 s | 3,3 s | 0 ms | 0,026 | 3,3 s |
| `/calculadora-renta` | móvil | 83 | 100 | 100 | 100 | 2,0 s | 4,4 s | 20 ms | 0,026 | 4,4 s |
| `/calculadora-renta` | escritorio | 99 | 94 | 100 | 100 | 0,4 s | 1,0 s | 0 ms | 0,016 | 1,0 s |
| **Panel** (600 movimientos en el mes)² | móvil | **63** | 97 | 100 | — | 0,1 s | 0,8 s | **560 ms** | **0,676** | 1,0 s |
| **Panel**² | escritorio | **81** | 97 | 100 | — | 0,0 s | 0,3 s | 50 ms | **0,393** | 0,3 s |

¹ La puntuación de SEO del login es baja porque la página lleva `noindex` a propósito. Es correcto.

² Medido con la sesión iniciada y la caché caliente. Por eso FCP y LCP son tan bajos.

**Qué falla en el panel:**

- **CLS:** el salto lo provoca el panel de previsión (`<div class="card collapsible-panel" data-tour="forecast">`), con desplazamientos de 0,45 y 0,22.
- **TBT:** hay 6 tareas largas (343, 235, 124, 120 y 52 ms).
- **DOM:** entre 14.500 y 17.600 nodos.
- **Contraste:** 19 elementos `.tx-day-count` con contraste de 1,47:1 (color `#cdd5e1` sobre blanco).
- **Accesible:** el nombre de algunos botones no coincide con su texto visible (`label-content-name-mismatch`).

El aviso de que «no se usa compresión de texto» viene de mi servidor local, que no comprime el HTML. En producción, Caddy sí lo hace (`encode zstd gzip`).

### A.5 Rendimiento mientras se usa la app

Medido con Playwright y el Chrome instalado, sobre un mes con 600 movimientos:

| Medida | Resultado |
|---|---|
| De iniciar sesión a ver el panel | 3,5 s (3,9 s con la CPU 4 veces más lenta) |
| Nodos del DOM del panel | 17.620 (632 filas y 620 casillas de selección) |
| Marcar una fila de la tabla (CPU normal) | Tareas largas de 59-82 ms |
| **Marcar una fila (CPU 4 veces más lenta, un móvil medio)** | **Tareas largas de 320-385 ms.** Google considera «mala» la respuesta a una interacción (INP) por encima de 200 ms |
| Memoria JS | 26-27 MB |

**Diagnóstico** (de la lectura del código):

- **No hay virtualización.** Ninguna librería ni técnica la usa (ni `content-visibility` ni `IntersectionObserver`). `TransactionTable` dibuja todas las filas del mes.
- **No se usa `React.memo` en ninguna parte del frontend** (0 resultados). Por eso marcar una casilla vuelve a dibujar todas las filas.
- **`FinancesContext` es un único contexto** (`modules/finances/application/FinancesContext.tsx:184-232`). Junta el estado (movimientos, cargando, error, cuentas…) y las acciones en un solo objeto memoizado del que dependen 18 valores. Cualquier cambio (`loading`, la recarga de cuentas, la navegación) vuelve a dibujar los 19 componentes que usan `useFinances()`.
- **Hay ausencias de memoización:** 50 `useMemo` y 41 `useCallback` en 94.600 líneas de producción. Es poco para pantallas de este tamaño.
- **La importación de inversiones está bien:** pagina de 20 en 20 (`InvestTables.tsx:127`). Con más de 400 operaciones no hay problema de DOM. Sí lo hay de CPU en `buildLedger` (complejidad 79), pero se ejecuta una sola vez.
- **Asistente de la Renta:** no se pudo perfilar en el navegador (exige completar el flujo). Sus tests son los más lentos de la suite (`rentaDraftStep`: 78 s, con tests de 13-15 s cada uno). Indica un árbol muy grande que se vuelve a dibujar entero en cada paso. Conviene perfilarlo con el React Profiler en desarrollo (ver el plan B.3).

### A.6 Backend con 10.600 movimientos

- **Arranque en frío** (base nueva y 15 migraciones): **0,72 s** hasta que `/api/health` responde. Memoria tras la prueba de carga: 196 MB.

**Tiempos** (mediana de 7 peticiones seguidas, en local):

| Endpoint | Mediana | Peor | Tamaño de la respuesta |
|---|---:|---:|---:|
| `GET /months/2024/6` (312 movimientos) | 8,3 ms | 10,0 ms | **265 kB** (26 kB en gzip) |
| `GET /months/2026/10` (600 movimientos) | 26,8 ms | — | **517 kB** |
| `GET /transactions?year&month` | 6,7 ms | 7,9 ms | 131 kB |
| `GET /transactions/summary` | 6,0 ms | 14,5 ms | 333 B (pero calcula el mes completo) |
| `GET /transactions/annual/2024` | 3,9 ms | 4,1 ms | 905 B |
| `GET /transactions/search?q=MERCADONA` | 4,7 ms | 5,5 ms | 21 kB |
| `GET /export` (todo, en JSON) | 34 ms | 41 ms | 2,0 MB |
| `POST /transactions/import`, 5.000 filas | 188-204 ms | | |
| `PATCH /transactions/bulk`, 100 y 500 filas | 51 y 172 ms | | |
| 500 peticiones a `/months`, 20 a la vez | **54 peticiones/s**; p50 264 ms, p95 604 ms, **p99 2,0 s** | | |

**Hallazgos:**

1. **Fallo: el mes viaja dos veces** (`backend/src/infrastructure/http/presenters.ts:94`). `presentSummary(o.summary, o)` pasa toda la vista del mes como «periodo», y `presentSummary` la mezcla con `...(period ?? {})`. Así, `summary` vuelve a contener los 312 movimientos en su forma interna (en céntimos), `carryoverCents`, `budgets`…

   - **Arreglo (S):** `presentSummary(o.summary, { year: o.year, month: o.month })`, más un test que compruebe que `summary` no tiene `transactions`.
   - **Efecto:** la respuesta baja a la mitad y deja de exponer la forma interna.

2. **Con concurrencia el rendimiento cae a la mitad.** En serie da unas 110 peticiones/s; con 20 a la vez, 54/s y picos de 2 s. La causa probable es construir y serializar 265 kB de JSON por petición en un único hilo, más la recolección de basura. Con el arreglo 1 debería mejorar en torno a un 50 %.

3. **Índices de SQLite: están bien.** Con `EXPLAIN QUERY PLAN`:

   | Consulta | Plan |
   |---|---|
   | Movimientos del mes | `idx_transactions_user_period` (tras `ANALYZE`) |
   | Totales por mes | Rango sobre `(user_id, year, month)` |
   | Recurrentes | `idx_transactions_rule_period` |
   | Búsqueda de texto | `LIKE '%…%'`: recorre los movimientos del usuario con `idx_transactions_user_date`. 2,2 ms con 10.000 filas; bien hasta unas 100.000 por usuario |
   | Orden por importe | Ordena en un árbol temporal (9 ms) |

   - **Matiz:** en una base nueva sin estadísticas, el mes usaba `idx_transactions_user_date` y recorría los 10.000 movimientos. `main.ts` ya ejecuta `PRAGMA optimize=0x10002` al arrancar y al parar, así que en producción se corrige solo. Para más seguridad, añadir el índice `(user_id, year, month, date)`.

4. **Consultas N+1:** no se han encontrado. El repositorio hace las uniones en SQL (`VIEW_SELECT`) y las acciones en bloque usan una sola transacción.

5. **`/transactions/summary` y `/budget/carryover` calculan el mes completo** (`getMonth`) para devolver unas pocas cifras. Mejora M: una consulta agregada propia.

6. **Compresión:**
   - Express no comprime, pero Caddy sí (`encode zstd gzip`): 265 kB pasan a 26 kB.
   - Los *assets* van precomprimidos (`scripts/compress.mjs`) con caché `immutable` de 1 año.

7. **ETag:** Express lo genera (débil) y `If-None-Match` devuelve 304 (comprobado con curl). Pero las respuestas de `/api` no llevan `Cache-Control: private, no-cache` (solo `learn` y `videos` llevan `no-store`). Se recomienda ponerlo de forma explícita.

8. **Límites:**
   - Petición: `express.json({ limit: '4mb' })`; Caddy permite 5 MB.
   - Importación: 5.000 filas como máximo y 30 por hora.
   - Acciones en bloque: 500 como máximo.
   - Rate limit global: 300 por minuto, más 24 limitadores específicos.

9. **Detalle menor:** `db.prepare()` se ejecuta en cada llamada; no hay caché de sentencias. Cuesta poco hoy; se puede cachear si hace falta.

---

## B. React y SOLID

### B.1 Tamaño y complejidad

**ESLint del frontend** (la configuración ya incluye `complexity: 10` y `max-lines-per-function: 150`): **42 avisos** (37 de complejidad y 5 de longitud). Los peores:

| Función | Archivo | Complejidad o líneas |
|---|---|---|
| `buildLedger` | `tools/domain/invest/ledger.ts` | **complejidad 79**, 258 líneas |
| `reportPdfBytes` | `tools/application/reportPdf.ts` | 387 líneas |
| `InvestImport` | `tools/ui/renta/invest/InvestImport.tsx` | 308 líneas, complejidad 18 |
| `guideSteps` | `tools/domain/invest/guide.ts` | complejidad 35 |
| `row` (parsers de brókers) | `tools/domain/invest/formats.ts` | 8 funciones de complejidad 11-20 |
| `baseOf` | `tools/domain/invest/read.ts` | complejidad 22 |
| `residenceScope` | `rentaResidence.ts` | complejidad 18 |
| `InviteCard` | `billing/ui/InviteCard.tsx` | complejidad 17 |

**El backend no tiene estas reglas.** Activándolas a mano salen **27 avisos**:

| Función | Archivo | Complejidad o líneas |
|---|---|---|
| `buildContainer` | `container.ts` | 328 líneas |
| `userRoutes` | `user.routes.ts` | 367 líneas |
| `draft390` | `autonomo-390.ts` | 291 líneas |
| `planningRoutes` | `planning.routes.ts` | 243 líneas |
| `loadConfig` | `env.ts` | complejidad 31 |
| `BillingService.apply` | `BillingService.ts` | complejidad 30 |
| `StripeGateway.parseWebhook` | `StripeGateway.ts` | complejidad 27 |
| `quarter303` | `autonomo-vat.ts` | complejidad 21 |
| `addMovement` | `autonomo-vat.ts` | complejidad 18 |

**Archivos más grandes (líneas):**

| Frontend (`src`, sin tests) | Líneas | Backend (`src`, sin tests) | Líneas |
|---|---:|---|---:|
| tools/domain/invest/formats.ts | 2.076 | infrastructure/http/schemas.ts | 1.005 |
| tools/domain/rentaCalc.ts | 1.135 | domain/services/autonomo-vat.ts | 756 |
| finances/domain/invoicePdf.ts | 1.121 | domain/ports/repositories.ts | 535 |
| finances/application/aeatFiles/designs.ts | 1.063 | infrastructure/container.ts | 479 |
| finances/domain/types.ts | 950 | infrastructure/mail/templates.ts | 476 |
| tools/data/renta/modulos-2025.ts | 892 | application/insights/InsightsServices.ts | 471 |
| finances/application/aeatFiles/models.ts | 681 | migrations/002-core-v2.ts | 467 |
| finances/domain/vatModules2025.ts | 677 | application/billing/BillingService.ts | 459 |
| tools/domain/rentaActivity.ts | 674 | http/routes/user.routes.ts | 442 |
| tools/data/renta/ccaa/comunitat-valenciana.ts | 672 | domain/services/autonomo.ts | 433 |
| tools/domain/invest/ledger.ts | 668 | application/auth/AuthService.ts | 410 |
| finances/domain/taxModelPdf.ts | 665 | domain/services/autonomo-390.ts | 398 |
| tools/ui/renta/RentaWizard.tsx | 658 | http/presenters.ts | 394 |
| finances/domain/invoiceBook.ts | 646 | sqlite/repositories/SqliteTransactionRepository.ts | 390 |
| finances/ui/components/AutonomoManual.tsx | 623 | sqlite/repositories/SqlitePlanningRepositories.ts | 381 |
| finances/ui/components/AutonomoActivity.tsx | 618 | application/data/DataServices.ts | 376 |
| guides/domain/guidesTramites.ts | 589 | application/auth/TwoFactorService.ts | 326 |
| finances/ui/components/autonomoSync.ts | 588 | domain/services/rule-based-advisor.ts | 322 |
| tools/domain/rentaGains.ts | 586 | application/transactions/TransactionService.ts | 315 |
| guides/domain/guides.ts | 571 | http/routes/planning.routes.ts | 312 |
| wizard/ui/Wizard.tsx | 559 | learn/chaptersFunds.ts | 310 |
| finances/domain/annualActivity.ts | 556 | learn/chaptersCrypto2.ts | 281 |
| finances/ui/components/... (DeductionsStep) | 543 | config/env.ts | 279 |
| tools/application/reportPdf.ts | 539 | sqlite/repositories/SqlitePersonalDataReader.ts | 271 |
| tools/ui/renta/GuidedInterview.tsx | 526 | learn/chaptersCrypto.ts | 246 |

**Volumen total:**

- Frontend: 94.600 líneas de producción y 56.600 de tests.
- Backend: 22.600 líneas de producción y 13.200 de tests.

**Duplicación** (jscpd, mínimo 70 tokens): **0,2 %** (237 líneas en 16 clones). Es muy baja. El clon que importa:

- Las tablas de IVA de `backend/src/domain/services/autonomo-vat-data.ts:23` y `:153` están copiadas en `frontend/src/modules/finances/domain/types.ts:642` y `:716` (80 líneas).
- **Riesgo:** que se desincronicen cuando cambie la normativa.

**Código muerto** (knip):

- Frontend: 13 archivos sin uso. 11 están en `scripts/` (generadores antiguos de casos, `derive-115/180.mjs`, `extract-layout.mjs`…). Los otros 2 son falsos positivos: `public/push-sw.js` lo usa Workbox y `stubs/jspdf-optional.js` es un alias de Vite.
- Exportaciones sin uso: 63 en el frontend y 35 en el backend. Casi todas son constantes exportadas solo para los tests. Hay algún falso positivo, como `AutonomoWizard`, que sí está en uso.
- Dependencias de desarrollo sin uso: `@testing-library/user-event`, `lint-staged` (se usa desde husky), `@types/bcryptjs` en el backend (bcryptjs 3 ya trae sus tipos) y `baseline-browser-mapping`.

**Tipado:**

| Medida | Frontend | Backend |
|---|---:|---:|
| `any` | 4 | 1 |
| `as X` | 270 | 107 |
| `as unknown` | 12 | 4 |
| `@ts-ignore` / `@ts-expect-error` | **0** | **0** |
| `eslint-disable` | 18 | 1 |

`no-explicit-any` está como error. Es un tipado muy bueno.

**Prop drilling:** es bajo. Solo 3 de los 53 tipos `*Props` tienen 10 o más propiedades (`DeductionReview.ReviewProps` tiene 15).

### B.2 Arquitectura del backend (hexagonal)

| Comprobación | Resultado |
|---|---|
| El dominio importa de `application` o `infrastructure` | **0** |
| `application` importa de `infrastructure`, Express, SQLite, Stripe o Resend | **0** |
| Dependencias circulares (madge, 244 archivos) | **0** |
| Rutas que acceden a `c.repos.*` saltándose la capa de aplicación | **9** (user ×4, auth ×2, billing, finance, household) |
| Puertos | `domain/ports/repositories.ts` (535 líneas, 52 interfaces) |

**Violaciones de SOLID y plan:**

| Hallazgo | Por qué importa | Esfuerzo y prioridad | Plan |
|---|---|---|---|
| `container.ts` (`buildContainer`, 328 líneas): composición de todo en un solo sitio | Cada módulo nuevo toca este archivo. Es frágil y difícil de leer | M · P2 | 1) Crear `compose/finance.ts`, `compose/billing.ts`, `compose/tax.ts`…, cada uno con su `buildX(db, config, shared)`. 2) `buildContainer` solo los une. 3) Mantener la misma forma de `Container`, así no se toca ningún test |
| `BillingService.apply` (complejidad 30) y `StripeGateway.parseWebhook` (27): un `switch` por tipo de evento | Incumple abierto/cerrado: cada evento nuevo modifica la misma función | M · P2 | Un mapa `Record<EventType, Handler>` con una clase o función por evento (`onCheckoutCompleted`, `onSubscriptionUpdated`…). Mover los tests de cada caso a su manejador |
| `autonomo-vat.ts` (756 líneas; `quarter303` 21, `addMovement` 18) y `draft390` (291 líneas) | La lógica fiscal más delicada está en funciones enormes | M · P1 | 1) Extraer funciones puras por régimen y operación (`intraEu`, `import`, `reverseCharge`, `prorrata`). 2) `addMovement` reparte con una tabla de estrategias por `op`. 3) `draft390` se compone a partir de `quarter303` por bloques de casillas. Los tests oficiales actuales sirven de red de seguridad |
| `TransactionRepository` (19 métodos) y una sola interfaz `Container` gigante | Incumple la segregación de interfaces: los servicios dependen de más de lo que usan | S-M · P3 | Partir en `TransactionReader`, `TransactionWriter` y `TransactionStats`. La clase SQLite puede seguir implementando las tres |
| `userRoutes` (367 líneas) y `planningRoutes` (243 líneas) | Rutas con lógica y acceso directo a repositorios | S · P3 | Un archivo de rutas por recurso (`profile`, `settings`, `export`, `push`…), y mover los accesos a `c.repos` a servicios de aplicación |
| `loadConfig` (complejidad 31) | Validación y reglas de producción mezcladas | S · P3 | Separar `parseEnv` (zod) de `assertProductionSecrets` y `buildAppConfig` |
| ReferralService (196 líneas) | Está bien acotado. La prueba de mutación lo valida (ver C.5) | — | — |
| Tablas de IVA duplicadas entre frontend y backend | Riesgo de desincronización | S · P2 | Un test que compare las dos tablas (como ya se hace con la tabla del RETA) o un paquete `shared/` común |

**Acoplamiento entre módulos:** `finances`, `tools` y `billing` no se importan entre sí en el backend: todo pasa por `container`. En el frontend sí:

| Dependencia | Importaciones |
|---|---:|
| finances → billing | 35 |
| finances → guides | 17 |
| finances → tools | 15 |
| taxforms → finances | 9 |
| tools → finances | 7 |
| tools → billing | 7 |

Hay ciclos entre módulos: finances ↔ tools, finances ↔ taxforms y auth ↔ billing.

### B.3 Frontend

**Separación de capas:**

- Ningún archivo de `*/domain` importa React, `ui` ni `application` (0 coincidencias). La lógica fiscal está en dominio puro, y eso está muy bien.
- Excepción: `finances/domain/recapImage.ts` usa `document.createElement('canvas')`. Debería ir en `application` o `ui`.

**Dependencias circulares (madge): 22.** Las más relevantes:

- `finances/domain/types.ts → objectiveModules → module131 → types`.
- `tools/domain/rentaCalc ↔ rentaData ↔ rentaRequirements`, y `rentaCalc ↔ rentaDonations`.
- `billing/application/PlanContext ↔ billing/ui/UpgradeModal`: la capa de aplicación importa la interfaz.
- `AutonomoManual → AutonomoImport → importFiles → importForm / withholdingForm → …`: 7 ciclos entre componentes de Autónomos.
- `guides.ts ↔ guidesAutonomos / guidesRenta* / guidesTramites`: 4 ciclos.
- `core/i18n/I18nContext ↔ localeUrl`.

**Plan:**

1. Pasar los tipos compartidos a archivos `*.types.ts` sin lógica.
2. Mover las constantes que causan los ciclos (por ejemplo, el índice de guías) a un archivo hoja.
3. `PlanContext` solo debe exponer estado; el modal lo pinta un componente de la interfaz.
4. Añadir `madge --circular` a la CI con un tope que solo pueda bajar.

**Esfuerzo:** M · P2.

**Estado global:**

- Hay 8 contextos (`stableContext`).
- El problema es `FinancesContext` (ver A.5). Plan (M · P1):
  1. Separarlo en `FinancesStateContext` y `FinancesActionsContext` (las acciones son estables).
  2. Sacar `loading` y `error` a un contexto aparte o a un selector.
  3. Medir con React Profiler en desarrollo: marcar una fila no debe redibujar el resumen ni el menú.
  4. A más largo plazo, un store con selectores (`useSyncExternalStore` o zustand) para `transactions`.

**Tabla de movimientos** (M · P1):

1. `React.memo` en la fila, con `onToggle` estable (`useCallback`) y `selected` como booleano por fila.
2. La selección en un `Set` dentro de un `useRef` más un contador de versión, o un store con selectores por id.
3. Virtualizar las listas de más de 100 filas (`@tanstack/react-virtual`, unos 5 kB) o, como mínimo, `content-visibility: auto` en los grupos por día.
4. Un test que mida que marcar una fila dibuja una sola fila: `Profiler` de React en Jest más el contador `onRender`.

**Errores:** hay `ErrorBoundary` global y `/api/client-errors`. Los errores del cliente terminan en `console.warn` del servidor y se pierden con la rotación de logs (30 MB). Falta un servicio de seguimiento de errores.

**Accesibilidad:**

- Lighthouse da 100 en las páginas públicas y 97 en el panel.
- Fallos: el contraste de `.tx-day-count` (1,47:1, 19 elementos), `label-content-name-mismatch` en botones con `aria-label` distinto del texto visible y `heading-order` y `target-size` en la calculadora de la Renta.
- No hay `eslint-plugin-jsx-a11y` ni axe en los tests.

**i18n:**

- `es.json` y `en.json` tienen las mismas 4.789 claves (0 que falten en uno de los dos).
- Mi heurística solo encuentra 3 claves probablemente huérfanas: `app.tax.personal`, `app.tax.professional` y `app.tax.estimate`.
- 107 textos en español idénticos (de más de 12 caracteres) se repiten en varias claves. Se pueden unificar.

### B.4 Plan de refactor por pasos (sin romper tests)

Cada paso es un PR pequeño con la suite en verde:

1. **(S)** Corregir `presentSummary` y añadir el test del payload.
2. **(S)** Añadir `complexity` y `max-lines-per-function` al ESLint del backend como avisos, con el tope actual (27) en la CI.
3. **(M)** Separar `FinancesContext` en estado y acciones, y memoizar las filas de `TransactionTable`. Medir antes y después con el script de A.5.
4. **(M)** Partir `es.json` por secciones (`landing`, `app`, `renta`, `autonomos`, `invest`, `guides`). `I18nContext` carga la sección al entrar en ella, igual que ya hace con `en.json`. Un test comprueba que ninguna clave se queda fuera.
5. **(M)** Romper `buildLedger` (complejidad 79) en un *pipeline*: `normalize → groupByAsset → applyFifo → applyTwoMonthRule → valueInEur`, con un test por etapa. Los tests actuales de `ledger` sirven de red.
6. **(M)** Pasar `formats.ts` (2.076 líneas) a un registro de parsers (`formats/<broker>.ts`), cada uno con su `row()`. Abierto/cerrado: un bróker nuevo es un archivo nuevo.
7. **(M)** Webhooks de Stripe y Play con manejadores por evento.
8. **(M)** Dividir `container.ts` por módulos.
9. **(M)** Eliminar los ciclos de madge y ponerlos en la CI.

---

## C. Tests y cobertura

### C.1 Cifras

Ejecutado con `TZ=UTC` y cobertura, en una máquina de 12 núcleos:

| | Suites | Tests | Tiempo | Sentencias | Ramas | Funciones | Líneas |
|---|---:|---:|---:|---:|---:|---:|---:|
| Backend | 67 | 787 aprobados | 48 s (46 s de Jest) | **98,36 %** (6083/6184) | **91,52 %** (2128/2325) | **98,43 %** (1568/1593) | **98,79 %** (5555/5623) |
| Frontend | 242 | 6.394 aprobados, **1 fallido**, **401 todo** | 96 s (94 s de Jest) | **100 %** (23394/23394) | **100 %** (11629/11629) | **100 %** (7025/7025) | **100 %** (20117/20117) |

**El fallo del frontend fue intermitente.** Era `views.test.tsx` › «sends the income, the expenses and the other data the person types», que agotó el tiempo de 5 s mientras el build se ejecutaba en paralelo. Es exactamente el tipo de test que falla cuando la máquina va cargada.

### C.2 ¿Es honesto el 100 % del frontend?

**Sí, en lo que mide:**

- Hay 0 comentarios `istanbul ignore`, `c8 ignore` o `v8 ignore` en todo el código.
- `collectCoverageFrom` solo excluye `main.tsx` (arranque), `api.config.ts` (lee `import.meta.env`), los `.d.ts`, `setupTests`, `__mocks__` y `test-utils`. Son exclusiones razonables.
- Hay 0 `it.skip`, `it.only` y `xit`, y 0 snapshots.
- No hay archivos de test con menos `expect` que tests.

**Pero hay que matizarlo:**

- **401 tests `todo`** en `__tests__/casos/` (`casosAutonomos` 331, `casosOficiales` 53, `casosRenta` 16, `casosModulos` 1). No son cobertura falsa. Son casos prácticos fiscales que el motor del frontend no comprueba:
  - 300 «los calcula el backend; los compara `npm run casos`», un script fuera de la CI.
  - 26 «resumen anual que Finanverso todavía no prepara».
  - Unos 25 apartados de la Renta que el motor no calcula (ganancias, capital inmobiliario y mobiliario, mínimos…).

  Son deuda funcional visible, y está bien que se vean. Pero **`npm run casos` debería ejecutarse en la CI** para que esos 300 casos se comprueben de verdad.
- Que una línea esté cubierta no significa que se haya comprobado su valor. Para eso está la prueba de mutación (C.5).

### C.3 Backend: lo que falta para llegar al 100 %

Quedan **197 ramas y 101 sentencias** sin cubrir en 71 archivos. Ordenados por tamaño, con las líneas de las ramas que faltan:

| Archivo (líneas) | Ramas | Sentencias | Líneas sin cubrir | Qué hacer |
|---|---:|---:|---|---|
| infrastructure/http/schemas.ts (1006) | 4 | 0 | 176, 965 | Test de validación con los casos límite |
| domain/services/autonomo-vat.ts (757) | 1 | 0 | 722 | Test unitario |
| **infrastructure/container.ts (480)** | **24** | 3 | 124-199 | Ramas de configuración (proveedor de IA o pagos presente o ausente). Test de `buildContainer` con varias configuraciones |
| mail/templates.ts (477) | 3 | 1 | 65, 387-404 | Plantillas en inglés y con datos opcionales |
| insights/InsightsServices.ts (472) | 6 | 4 | 154, 222-390 | Respaldos de la IA. Tests con un fake que falle |
| **migrations/002-core-v2.ts (468)** | **12** | 5 | 241-402 | Migración de datos antiguos. Test con una base v1 que tenga datos raros, o marcarla como inalcanzable si ya no hay bases v1 |
| billing/BillingService.ts (460) | 2 | 0 | 247, 367 | |
| routes/user.routes.ts (443) | 7 | 2 | 104, 416, 431 | Tests de integración del caso de error |
| domain/services/autonomo.ts (434) | 4 | 2 | 144, 159, 361, 420 | Test unitario (ver C.5: además hay mutantes vivos) |
| auth/AuthService.ts (411) | 2 | 1 | 246, 271 | |
| autonomo-390.ts (399) | 2 | 0 | 99, 174 | |
| SqliteTransactionRepository.ts (391) | 5 | 8 | 139, 194-203, 341-344 | Filtros de búsqueda poco usados (orden por importe, cuenta) |
| SqlitePlanningRepositories.ts (382) | 2 | 1 | 344, 374 | |
| data/DataServices.ts (377) | 4 | 3 | 202-362 | |
| rule-based-advisor.ts (323) | 2 | 1 | 41, 50 | |
| config/env.ts (280) | 5 | 1 | 153-274 | Tests de `loadConfig` con más combinaciones |
| autonomo-expenses.ts (232) | 4 | 0 | 127, 128, 211 | |
| routes/auth.routes.ts (232) | 4 | 0 | 113-185 | |
| ai/prompts.ts (197) | 6 | 1 | 53-190 | |
| SqliteAccountRepository.ts (189) | 5 | 5 | 64-67, 154-158 | |
| ai/CloudflareAi.ts (155) | 5 | 4 | 93, 137-144 | Errores HTTP del proveedor. Test con un `fetch` falso |
| **auth/GoogleIdentityVerifier.ts (86)** | **8** | **8** | 32-82 | Adaptador real de Google sin test. Simular `google-auth-library` |
| **ai/AiCategorizer.ts (78)** | 5 | **7** | 33-75 | Test unitario con un `AiClient` falso |
| **backup/BackupService.ts (63)** | 5 | **10** | 21-60 | Poda de copias antiguas y errores. Test con un directorio temporal |
| Otros 47 archivos | 1-3 cada uno | | | Ramas `?? valor por defecto` y errores |

**Plan para llegar al 100 % real (unas 2 semanas):**

1. **Adaptadores sin tests** (BackupService, GoogleIdentityVerifier, AiCategorizer, CloudflareAi): unos 30 tests. Suben unas 30 ramas y 30 sentencias.
2. **`container.ts` y `env.ts`:** un test parametrizado con 4-5 configuraciones (sin IA, Cloudflare, Gemini, con o sin Stripe, Play). Unas 30 ramas.
3. **Migración 002:** construir una base v1 con datos incompletos y migrarla. Si los datos que cubren esas ramas ya no pueden existir, documentarlo y excluir solo esas líneas con un comentario justificado.
4. **Resto:** casos de error de las rutas con supertest (unos 60 tests).
5. **Al terminar:** subir los umbrales de `jest.config.js` a `100/100/100/100`, como en el frontend.

Código muerto que borrar en vez de testear: `ConsoleEmailSender.sent` solo lo usan los tests. Y las constantes exportadas sin uso que da knip (sección B.1) se pueden dejar de exportar.

### C.4 Tests lentos e intermitentes

**Los 10 archivos de test más lentos del frontend:**

| Archivo | Tiempo |
|---|---:|
| `rentaDraftStep` | **77,8 s** |
| `rentaGuided` | 31,8 s |
| `rentaPlanner` | 26,6 s |
| `views` | 25,7 s |
| `autonomoCloud` | 23,8 s |
| `rentaPlannerExtras` | 23,4 s |
| `rentaReviewFlow` | 17,9 s |
| `rentaDraftCompare` | 16,6 s |
| `monthlyView` | 14,4 s |
| `investView` | 14,2 s |

`edgeCases` tarda 12,7 s.

**Los tests más lentos uno a uno:** tres de `rentaDraftStep` tardan 15,5 s, 14,5 s y 13,1 s, y uno de `rentaPlannerExtras`, 11,5 s.

`rentaDraftStep` sube su tiempo límite con `jest.setTimeout(60000)`. Los demás usan el de por defecto, 5 s. Por eso los tests que en una ejecución normal ya se acercan a ese límite fallan en cuanto la máquina va cargada. Es lo que pasó con `views.test.tsx` (5,5 s).

**Las causas probables** (por cómo están escritos):

- Montan el asistente completo.
- Recorren todos los pasos con `user-event`.
- Esperan con `findBy*`, que por defecto espera hasta 1 s.
- El árbol de React se vuelve a dibujar entero en cada paso (ver A.5).

**Arreglos:**

1. Fijar `testTimeout: 15000` de forma global en `jest.config.cjs` como red mínima, y marcar los tests de más de 5 s.
2. Pasar a `userEvent.setup({ delay: null })` y sustituir `findBy` por `getBy` cuando el dato ya está.
3. Empezar los tests de un paso concreto en ese paso, con un estado inicial *fixture*, en lugar de recorrer el asistente entero.
4. Separar los tests de integración de UI largos (`rentaDraftStep`) en un proyecto de Jest propio, que se ejecute con `--maxWorkers=50%`.
5. En la CI, `--ci --maxWorkers=2` y reintentar una vez solo los tests marcados como lentos.

**Backend:** los tests de integración tardan 33-36 s cada uno, pero corren en paralelo. La suite completa tarda 48 s. Aviso de Jest: «A worker process has failed to exit gracefully». Hay temporizadores sin `unref()` o bases sin cerrar en algún test. Se busca con `--detectOpenHandles`.

### C.5 Prueba de mutación (Stryker)

Se ejecutó Stryker 8 (jest-runner, `perTest`, `ignoreStatic`) sobre 3 módulos críticos del backend: el dominio fiscal del 130 y el 303, el 349 y los referidos. Tardó 18 minutos y probó 569 mutantes.

**Cómo leer la tabla:**

- Un **mutante** es una copia del código con un fallo introducido a propósito (por ejemplo, cambiar `<=` por `<`).
- Si algún test falla, el mutante queda **eliminado**: los tests detectan ese error. Si todos pasan, el mutante **sobrevive**: ese error llegaría a producción sin que nadie lo notara.
- La **puntuación** es el porcentaje de mutantes eliminados.

| Módulo | Eliminados | Sobreviven | Sin cobertura | Error de ejecución | Puntuación |
|---|---:|---:|---:|---:|---:|
| `application/referrals/ReferralService.ts` | 84 (incluidos 10 por tiempo agotado) | 4 | 2 | 0 | **93,3 %** |
| `domain/services/autonomo-349.ts` | 84 | 21 | 2 | 0 | **78,5 %** |
| `domain/services/autonomo.ts` (130 y 303) | 274 (incluidos 8 por tiempo agotado) | **70** | 1 | 27 | **79,4 %** |

En `autonomo.ts`, los 27 mutantes que dieron error de ejecución no cuentan en la puntuación.

**Conclusión:** los módulos tienen entre el 98 y el 100 % de líneas cubiertas, pero **1 de cada 5 errores que se introdujeran en el cálculo fiscal no lo detectaría ningún test**. Los referidos sí están bien protegidos.

**Mutantes vivos preocupantes en `autonomo.ts`:**

- **L165:** `Math.round(item.base * ((item.vat - taken) / item.vat))`, el reparto de la base al aplicar el tope. Sobreviven 3 cambios aritméticos (`*` por `/`, `-` por `+`…). **Ningún test comprueba la base resultante en ese caso.**
- **L156 y L159:** los límites `cap <= 0` y `left <= 0` se pueden cambiar a `<` sin que falle nada. Falta un test con el tope exactamente en cero.
- **L174:** `priorYearNet <= r.upTo` (reducción por rendimientos bajos). El caso justo en el límite del tramo no está probado.
- **L144:** el filtro por ejercicio (`m.date.startsWith(year)`) se puede quitar sin que falle nada. Falta un test con movimientos de otro año.
- **L203:** la suma de subvenciones y compensaciones.

**En `autonomo-349.ts`:** sobreviven 11 mutantes de textos (nombres por defecto `'—'`, `trim()`) y 5 de comparaciones. Los NIF vacíos y los nombres con espacios no están probados.

**Plan:**

1. Escribir tests de valores exactos en los límites (0, el tope exacto, el último euro del tramo) para las líneas anteriores. Son unos 15 tests y deberían subir la puntuación por encima del 90 %.
2. Ejecutar Stryker cada semana en la CI sobre `domain/services/autonomo*.ts` y `tools/domain/renta*.ts`, con un umbral `break: 85`.

No dio tiempo a ejecutar Stryker en el frontend (`rentaCalc.ts` y `rentaSavings.ts`). Con este resultado, es lo siguiente que conviene medir.

### C.6 E2E, contrato, accesibilidad y rendimiento

**E2E con Playwright:** hay **10 tests** en `frontend/e2e`, que corren en la CI con el Chrome instalado:

- *app* (5): alta y edición de un movimiento, carga de secciones, aviso sin conexión, primeros pasos.
- *tour* (1).
- *public* (4): landing, precios, `robots.txt` y sitemap, botón «atrás» de las páginas legales.

**Faltan estos flujos críticos:**

| Flujo | Qué comprobar |
|---|---|
| Registro y verificación de email | Con el `ConsoleEmailSender` |
| Login con 2FA | |
| Importar un extracto CSV y Norma 43 | Con duplicados |
| Asistente de la Renta | Del borrador XML al resultado |
| Autónomos | 303 y 130 de un trimestre, y guardar en la cuenta cifrado |
| Inversiones | Importar un CSV de bróker y ver el informe |
| Pagos | Stripe en modo test, de checkout a webhook (`stripe-mock` o un fake), y la restauración en Play con un fake |
| Hogar compartido | Invitar y unirse |
| Borrado de cuenta y exportación | |
| Móvil | Viewport pequeño |

**Contrato entre frontend y backend:** **no hay ninguno.** Los esquemas zod del backend (`schemas.ts`, 34 objetos `.strict()`) no se comprueban contra lo que envía el frontend. El historial lo muestra: *commit* `e6011b9`, «la copia en la cuenta guarda el IVA…». Plan (M):

1. Exportar los esquemas del backend a un paquete `shared/contracts` (o generar JSON Schema con `zod-to-json-schema`).
2. En el frontend, un test por cliente de la API que construya el cuerpo real con las funciones del dominio y lo valide contra el esquema.
3. En el backend, un test que valide las respuestas de los *presenters* contra los tipos del frontend. Con eso se habría detectado el fallo de A.6.

**Accesibilidad automática:** no hay axe ni `jsx-a11y`. Recomendado:

- `@axe-core/playwright` en los E2E, sobre el panel, la Renta y Autónomos.
- `eslint-plugin-jsx-a11y` como aviso.

**Rendimiento automático:** no hay nada. Recomendado:

- Lighthouse CI (`@lhci/cli`) sobre `/`, `/login` y `/guias`, con un presupuesto de rendimiento ≥ 85 en móvil y un tamaño de entrada ≤ 130 kB en brotli.
- Un test de Playwright que falle si marcar una fila genera una tarea larga de más de 100 ms.

### C.7 Seguridad

**`npm audit`:**

| Paquete | Total | Producción (`--omit=dev`) | Detalle |
|---|---|---|---|
| Frontend | 38 (29 altas, 9 moderadas) | **1 moderada** | `fflate` 0.8.2: bucle infinito con ZIP64 mal formado, en `unzipSync`. **Se usa** para leer los Excel y ZIP que sube el usuario (`spreadsheet.ts`, `investImport.ts`). Solo afecta a su propio navegador, pero conviene actualizar a 0.8.3 (S) |
| Backend | 41 (34 altas, 7 moderadas) | **0** | |

El resto son herramientas de desarrollo: Jest 29 (micromatch y braces), `ts-node-dev`, `tsc-alias` y `lint-staged`. No llegan a producción. Se resuelven con Jest 30 y lint-staged 17.

**Dependencias obsoletas (`npm outdated`):** las de mayor salto, pendientes de valorar:

| Dependencia | Versión actual | Última |
|---|---|---|
| Express | 4.22 | 5.3 |
| zod | 3.25 | 4.6 |
| Stripe | 18 | 23 |
| better-sqlite3 | 12.6 | 13 |
| pdfjs-dist | 4.10 | 6.4 |
| Vite | 6 | 8 |
| ESLint | 8 | 10 |
| TypeScript | 5.9 | 7 |
| Jest | 29 | 30 |

De ellas, Stripe 18 → 23 y pdf.js son las más relevantes, por seguridad y compatibilidad con la API. **Prettier 2 y ESLint 8 ya no tienen soporte.**

**Secretos:**

- `git grep` con patrones de claves (Stripe `sk_live` y `whsec`, Resend, Google `AIza`, AWS, claves privadas PEM, tokens de GitHub o Slack) da **0 coincidencias**.
- `git log --all` no muestra que se haya versionado nunca un `.env`, una base de datos ni un *keystore*.
- Los únicos `.env` versionados son `frontend/.env.production` y `frontend/.env.android`. Contienen el ID de cliente OAuth de Google y la clave pública del SDK de RevenueCat. Son identificadores públicos por diseño: van dentro de la app y no son secretos.

**Cabeceras:**

- La API usa helmet: CSP estricta, HSTS, `nosniff`, `frame-ancestors`, COOP y CORP.
- Caddy añade HSTS, `nosniff`, `X-Frame-Options DENY`, `Referrer-Policy` y `Permissions-Policy`.
- **La CSP de la web va como `Content-Security-Policy-Report-Only` y sin `report-uri`/`report-to`** (`deploy/Caddyfile`). No protege ni avisa de nada.
- Además, el bloque `www.winjgm.com` (la API heredada) no importa las cabeceras.

**Tokens:**

- El token de acceso y el de refresco se guardan en `localStorage` (`core/api/http.ts:28-37`). Si hubiera un XSS, se podrían robar. Por eso la CSP en modo bloqueante es importante.
- A medio plazo, el refresco debería ir en una cookie `HttpOnly; Secure; SameSite=Strict` (salvo en la app nativa).

**Otros controles:**

| Control | Estado |
|---|---|
| Rate limit | 300 por minuto global, más 24 limitadores (login, importación, 2FA…) |
| Validación | zod en todas las entradas, con 34 esquemas estrictos |
| CORS | Lista blanca (`CORS_ORIGINS`) |
| Contraseñas | bcrypt con coste 12 en `worker_threads` |
| 2FA | TOTP, con el secreto cifrado con AES (`AesSecretBox`) |
| Base de datos | `secure_delete` |
| Logs | `ConsoleEmailSender` escribe el email y el enlace con el token en la consola, pero solo sin `RESEND_API_KEY`, y producción lo exige (`env.ts:191`). No he encontrado otros logs con datos personales en producción |

---

## D. Producto y mejoras

(Los resultados se han verificado contra el código. En la tabla: H = hecho, P = parcial, F = falta.)

| Área | Hecho | Parcial | Falta |
|---|---|---|---|
| Movimientos y presupuestos | **H:** CRUD, acciones en bloque, búsqueda y filtros, vistas mensual, anual, semanal y calendario, mes que empieza el día que elijas, recurrentes, importación CSV y Norma 43 con duplicados y autocategorización, alertas y arrastre | **P:** la IA al importar es opcional | — |
| Cuentas | **H:** saldo inicial y transferencias | — | **F:** moneda propia por cuenta (`UserSettings` tiene una sola moneda) |
| Metas | **H** | — | — |
| Hogar compartido y gastos divididos | **H:** invitación por código y el miembro ve los datos del titular. Gastos divididos con grupos y liquidaciones | **P:** si el titular se da de baja, el miembro pierde el acceso, también a lo que él añadió | **F:** permisos por miembro (solo lectura) |
| Autónomos | **H:** 303, 130, 111, 115, 390, 349, 190, 180, 347, 131 y módulos; ficheros para la sede de 9 modelos; libros de facturas desde Excel o PDF; OCR; facturas por email; RETA | **P:** 111 al 40 %; IVA simplificado solo con aviso; una sola actividad; **ningún fichero probado en la sede** | **F:** emitir facturas (numeración, PDF, VeriFactu); 036/037 (solo guía) |
| Renta | **H:** asistente, lectura del borrador PDF y XML, comparación casilla a casilla, conjunta frente a individual, alquileres, 366 deducciones autonómicas, optimizador, pase de 10 € | **P:** modelo 100 al 40 % del núcleo del asalariado y 9 % del total; forales solo con aviso | **F:** fichero o vista previa del 100 (se copia a mano); **reglas versionadas por ejercicio (P0-1)** |
| Inversiones | **H:** 46 formatos, lectura en el dispositivo, FIFO, regla de los 2 meses, staking, tipos del BCE, informe | **P:** **ningún formato probado con una exportación real (P0-5)** | **F:** 720/721 (solo avisos) |
| Premium y precios | **H:** Stripe (Checkout, Portal, webhook idempotente), Play con RevenueCat, prueba de 14 días, plan fundador de 59 €, referidos por tramos | **P:** factura con datos fiscales solo por email | **F:** compra dentro de la app en iOS |
| Onboarding | **H:** tour, primeros pasos y asistentes | — | **F:** onboarding por perfil (asalariado, autónomo, inversor) |
| Retención | **H:** resumen semanal por email (hay que activarlo), push con VAPID (víspera de cobros y lunes), notificaciones locales, avisos de presupuesto, recap y petición de valoración | — | **F:** **avisos de plazos fiscales (303, 130 y Renta)**; recuperación por inactividad o fin de la prueba |
| iOS / PWA | **H:** PWA con actualización bajo petición y proyecto `ios/` | — | **F:** publicación en la App Store y compra dentro de la app |
| Android / Play | **H:** publicada, RevenueCat, lectura de notificaciones bancarias, petición de valoración | — | — |
| i18n | **H:** es/en con 4.789 claves cada uno | — | — |
| Accesibilidad | **H:** unos 550 `aria-*` y `prefers-reduced-motion` | **P:** contraste en el panel | **F:** axe o `jsx-a11y`, enlace para saltar al contenido, auditoría WCAG |
| SEO y landing | **H:** prerender de 76 páginas, sitemap con `hreflang`, tests de SEO en el build | **P:** el build avisa de que el sitemap está desactualizado en 66 páginas («run `npm run sitemap`») | — |
| Analítica | **H:** contadores diarios anónimos (`metrics`) y `npm run stats` | **P:** el informe del 14-10 no encontró datos en producción | **F:** embudo, cohortes, activación y bajas, panel |
| Soporte | **H:** email de soporte y `/client-errors` | **P:** FAQ solo en la landing | **F:** formulario o tickets, centro de ayuda, página de estado |
| Copias y exportación | **H:** exportación JSON v3 y CSV; copia diaria y antes de cada migración; copia externa cifrada con restic en R2, probada el 17-10 | **P:** RPO de 24 h | **F:** **importar la exportación JSON**; copia continua (Litestream) |
| RGPD | **H:** borrado de cuenta, exportación, política con proveedores, casilla de 14 años, `secure_delete` | **P:** el consentimiento de la IA no se registra en el servidor; los textos no están validados por un abogado | **F:** **registro de actividades de tratamiento (art. 30), contratos de encargo firmados con los proveedores, evaluación de impacto, procedimiento de brechas** (pendientes según `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`) |
| Observabilidad | **H:** `/api/health`, *healthcheck* de Docker, logs rotados, healthchecks.io para la copia externa | — | **F:** Sentry, uptime externo, alertas de 5xx, disco y memoria, logs estructurados |
| Escalado (Hetzner de 4 GB) | **H:** WAL, `synchronous=NORMAL`, `busy_timeout`, bcrypt en hilos | **P:** un solo proceso de Node con las tareas programadas dentro | **F:** `mem_limit` en Docker, plan de crecimiento documentado |

**Documentación desactualizada:** el README dice que el plan gratuito permite 1/3/1/3/3 (cuentas, presupuestos, metas, recurrentes, alertas). `backend/src/domain/services/plans.ts:41-44` tiene 3/5/2/5/….

### D.1 Riesgos

1. **Fiscales y de confianza:**
   - Solo se reproducen 17 de 62 casos oficiales.
   - No se ha probado ningún fichero en la sede de la AEAT.
   - Hay 30 criterios NO CONFIRMADOS (`docs/fiscalidad/informe-gestor-real.md` §7).
   - Sin versionado por ejercicio (P0-1), la Renta 2026 saldrá con las reglas de 2025.

   Un error en un fichero que el usuario presenta es el mayor riesgo reputacional.
2. **Legales:**
   - Las condiciones dicen «orientativo», pero no las ha revisado un abogado.
   - El RGPD formal está incompleto.
   - La IA se ejecuta en proveedores de EE. UU. con texto libre (`/ai/ask`).
   - `mm_acq` se guarda sin consentimiento (LSSI art. 22.2).
   - En iOS, remitir a la web para pagar puede chocar con la guía 3.1.1 de Apple.
3. **Operativos:**
   - Un solo servidor y un solo proceso, sin límites de memoria ni alertas. Una caída o un disco lleno se descubren cuando se quejan los usuarios.
   - RPO de 24 h en datos financieros.
4. **Seguridad:** CSP sin aplicar y tokens en `localStorage`.
5. **Coste:** hoy es muy bajo (Hetzner, la IA dentro del cupo gratuito de Cloudflare). SQLite aguanta con holgura miles de usuarios activos en esta máquina: 110 peticiones/s en serie para la pantalla más pesada. El límite real llegará antes por la memoria (196 MB tras la carga, sin tope) o por las tareas programadas dentro del proceso que por la base de datos.

### D.2 Hoja de ruta por impacto y esfuerzo

**Quick wins (1 día cada uno):**

1. Arreglar `presentSummary` (payload ×2).
2. Imagen del LCP sin `lazy` y con `fetchpriority`.
3. Reservar el alto del panel de previsión (CLS) y corregir el contraste de `.tx-day-count`.
4. `testTimeout` global de 15 s y `--detectOpenHandles` en el backend.
5. Actualizar `fflate` a 0.8.3.
6. `Cache-Control: private, no-cache` en `/api`.
7. Uptime externo (UptimeRobot o Better Stack) de la web y de `/api/health`, con alerta por email.
8. `mem_limit` en `docker-compose.yml` y `--max-old-space-size` en Node.
9. Corregir el README (límites del plan gratuito) y ejecutar `npm run sitemap`.
10. Ejecutar `npm run casos` en la CI.

**1 semana:**

1. CSP en modo bloqueante con `report-to`, tras una semana en modo informe con un endpoint que recoja los informes.
2. Sentry o GlitchTip (en la UE) para el frontend y el backend.
3. Partir `es.json` por secciones.
4. `FinancesContext` en estado y acciones, y filas memoizadas.
5. Tests de contrato con zod.
6. Recordatorios de plazos fiscales (303 y 130: del 1 al 20 de abril, julio, octubre y enero; Renta) por push y email.
7. Métricas de activación y conversión con un informe semanal al dueño.

**1 mes:**

1. Virtualizar las tablas grandes.
2. E2E de los flujos críticos (unos 15 tests nuevos), axe en Playwright y Lighthouse CI.
3. Backend al 100 % de cobertura y umbrales a 100.
4. Refactor de `buildLedger`, `formats.ts`, los webhooks y `container.ts`.
5. Quitar los 22 ciclos.
6. RGPD formal: registro de actividades, contratos de encargo, evaluación de impacto, brechas y registro del consentimiento de la IA.
7. Litestream a R2 (RPO de segundos).
8. Importar la exportación JSON.

**Trimestre:**

1. Versionado normativo por ejercicio (antes de enero y abril de 2027).
2. Revisión de un gestor colegiado (15-20 casos y los 30 NO CONFIRMADOS).
3. Probar los 9 ficheros en la sede y los formatos de bróker con exportaciones reales (el dueño, §8).
4. Emisión de facturas preparada para VeriFactu.
5. Compra dentro de la app en iOS y publicación.
6. Valorar open banking (PSD2) con un agregador de la UE.
7. Actualizar las dependencias grandes (Stripe 23, Express 5, zod 4, Vite 7-8, ESLint 9 y Prettier 3).

---

## Anexo: cómo reproducir cada medición

Preparación (sin tocar el repositorio principal):

```bash
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
git -C ~/javi-portfolio worktree add --detach /tmp/audit origin/develop
ln -s ~/javi-portfolio/frontend/node_modules /tmp/audit/frontend/node_modules
ln -s ~/javi-portfolio/backend/node_modules  /tmp/audit/backend/node_modules
mkdir -p /tmp/audit-tools && cd /tmp/audit-tools && npm init -y && \
  npm i lighthouse@12 knip jscpd madge @stryker-mutator/core@8 @stryker-mutator/jest-runner@8
```

| Medición | Comando |
|---|---|
| Build y tamaños | `cd /tmp/audit/frontend && npm run build`. Luego `ls -S dist/assets` y los `.br`/`.gz` que genera `scripts/compress.mjs` |
| Precaché | Leer las entradas `url:"…"` de `dist/sw.js` y sumar sus tamaños y los de sus `.br` (script en Node) |
| Cobertura del backend | `cd backend && TZ=UTC npx jest --coverage --json --outputFile=be.json` |
| Cobertura del frontend | `cd frontend && TZ=UTC npx jest --config jest.config.cjs --coverage --json --outputFile=fe.json`. Los tiempos por archivo están en `testResults[].endTime-startTime` |
| Ramas sin cubrir del backend | `--coverageReporters=json` y recorrer `coverage-final.json` (`b`, `branchMap`) |
| ESLint del frontend | `npx eslint . --ext ts,tsx -f json` |
| ESLint del backend con complejidad | `npx eslint src --ext .ts --rule '{"complexity":["warn",10],"max-lines-per-function":["warn",{"max":150,"skipBlankLines":true,"skipComments":true}]}'` |
| Ciclos | `madge --circular --extensions ts,tsx --ts-config tsconfig.json src` (en cada paquete) |
| Duplicación | `jscpd frontend/src backend/src --ignore "**/__tests__/**,**/tests/**,**/*.test.*,**/*.json,**/data/**" --min-tokens 70` |
| Código muerto | `knip --include files,exports,types,dependencies` (en cada paquete) |
| Pila local | `cd backend && npm run build`, y luego `NODE_ENV=development PORT=3917 DATABASE_PATH=/tmp/demo.db JWT_SECRET=<aleatorio> RATE_LIMIT_DISABLED=true SEED_DEMO_USER=true SEED_DEMO_EMAIL=demo@example.test SEED_DEMO_PASSWORD=<aleatorio> AI_PROVIDER=none node dist/main.js`. Servidor estático de `frontend/dist` en el puerto 4917 que sirve los `.br` y redirige `/api` al 3917 (un script de Node de 20 líneas) |
| Datos de demo | `POST /api/transactions/import` ×2 con 5.000 filas inventadas (2023-2025) y 600 en el mes actual |
| Tiempos de la API | `fetch` en un bucle de 7 peticiones (mediana) y 20 clientes concurrentes × 25 peticiones |
| Planes de consulta | `sqlite3 demo.db "EXPLAIN QUERY PLAN SELECT … WHERE t.user_id=? AND t.year=? AND t.month=? ORDER BY t.date DESC"` (antes y después de `ANALYZE`) |
| ETag | `curl -H "If-None-Match: <etag>" …/api/months/2024/6` → 304 |
| Lighthouse público | `CHROME_PATH=…/Google\ Chrome lighthouse http://127.0.0.1:4917/ [--preset=desktop] --only-categories=performance,accessibility,best-practices,seo` |
| Lighthouse del panel | Chrome con `--remote-debugging-port`, login con Playwright (`connectOverCDP`) y `lighthouse(url, {port, disableStorageReset:true})` |
| Rendimiento en uso | Playwright (`channel:'chrome'`), `PerformanceObserver('longtask')`, `Emulation.setCPUThrottlingRate {rate:4}` por CDP y clic en casillas de la tabla |
| Cobertura CSS/JS | `page.coverage.startCSSCoverage()/startJSCoverage()` en Playwright |
| Seguridad | `npm audit [--omit=dev] --json`, `npm outdated`, `git grep -nIE "(sk_live_|whsec_|AIza|BEGIN .*PRIVATE KEY|ghp_|AKIA)"`, `git log --all --diff-filter=A --name-only` |
| Mutación | `stryker run` con `jest-runner`, `coverageAnalysis: perTest`, `ignoreStatic: true` y `mutate` limitado a los archivos de C.5 (los tests de Autónomos leen `docs/casos-practicos`, así que hay que enlazar `docs` junto a `.stryker-tmp`) |
