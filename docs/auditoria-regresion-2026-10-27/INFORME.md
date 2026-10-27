# Auditoría de regresión de Finanverso (27-10-2026)

Versión auditada: commit `5df7a760` (v1.64.3), la que está en producción. Todo se probó en una **pila local** que copia la de producción (build de producción servido por nginx con `deploy/nginx-web.conf` detrás de Caddy con las cabeceras y la CSP de `deploy/Caddyfile`, API con SQLite en una base temporal). Datos 100 % ficticios. No se tocó finanverso.app ni se envió ningún correo ni pago. No se ha cambiado código de la app.

Ficheros: este informe, `HALLAZGOS.csv`, `PROGRESO.md` (bitácora con hallazgos en bruto) y `capturas/` (56 JPG, ~4 MB). Los scripts de medición están fuera del repo (scratchpad de la sesión) y se describen en el apartado (g).

## (a) Resumen ejecutivo

1. La app está sana en lo funcional: **0 excepciones de JavaScript** en 724 cargas de pantalla (los únicos errores de consola son el 400 y el 404 que se provocaron a propósito con un token falso y una ruta inexistente), **los 51 e2e del proyecto pasan** en local y los **3.547 casos prácticos** de Renta/Autónomos pasan (0 fallos, 386 pendientes ya conocidos).
2. Las regresiones de hoy funcionan: signo «−» y cabecera del banco al importar, saldos tras importar, tour corto/completo, menú de 2 columnas sin scroll, iconos de redes, tecla N, contraste apagado en Renta/Autónomos, confirmación de «Iniciar nueva declaración», páginas de contraseña/verificación y pie no-reply.
3. No hay bloqueantes. Hay **5 hallazgos de gravedad alta**: 1 de accesibilidad y 4 de rendimiento.
4. **Alta (accesibilidad):** con «Contraste» activado, las etiquetas de categoría de la tabla de escritorio son invisibles: el texto tiene el mismo color que el fondo. Se arregla con una línea de CSS en `index.css`.
5. **Alta (rendimiento):** el Resumen mensual, que es la pantalla de inicio, «salta» al cargar: CLS 0,94–1,06 en móvil y 0,68 en escritorio, cuando lo bueno es menos de 0,1. Cuentas da 0,30.
6. **Alta (servidor):** previsión, dinero perdido y suscripciones leen todos los movimientos del usuario. Con 50.000 movimientos tardan 0,2–0,5 s cada una y bloquean la API para todos los usuarios: medido, 3,7 s de espera para un usuario ligero.
7. **Alta (peso):** el diccionario español (123 KB brotli) va dentro del JS inicial (85 % de él). Además, el service worker hace que una primera visita a la landing descargue **1,57 MB** en lugar de 350 KB.
8. Medias: avisos y doble descarga de 5 CSS precargados, peticiones repetidas (`/billing` ×3…), scroll lateral en Análisis a 390 px, pestañas truncadas en el Resumen, duplicado al importar el PDF, «180 €/mes» para una regla anual, metas que comparten categoría y cuentan el mismo ahorro dos veces, y textos engañosos sin conexión.
9. En seguridad básica todo está bien cerrado: IDOR (25 intentos, todos 404), XSS, fórmulas CSV, 413 si el cuerpo pasa de 4 MB, límites de login, sin enumeración por tiempo. Quedan mejoras menores: CSP aún en Report-Only, sin `Cache-Control: no-store` y sin `Retry-After`.
10. Plan propuesto: una oleada 1 de un día (A01, M01, M03, M04, M06, B01–B06), una oleada 2 de 3–4 días (CLS, i18n por trozos, SW, deduplicación de peticiones) y una oleada 3 de servidor (agregados y caché de las estadísticas).

## (b) Hallazgos por gravedad

Leyenda de esfuerzo: XS < 1 h · S ≈ medio día · M ≈ 1–2 días · L > 2 días. «Hecho» = visto o medido; «a confirmar» = deducido del código o no reproducible aquí.

### Bloqueantes
Ninguno encontrado.

### Alta

| Id | Pantalla | Descripción | Evidencia | Causa probable | Solución propuesta | Esfuerzo |
|---|---|---|---|---|---|---|
| A01 | Resumen (tabla de escritorio) y Consola crypto, modo **Contraste** | Las etiquetas de categoría de la tabla se ven como píldoras oscuras **sin texto**. En la consola, la moneda seleccionada baja a 2,1–2,9:1 | `capturas/hc-catbadge-light.jpg`, `hc-crypto-coin-dark.jpg`; color y fondo calculados: `rgb(51,65,85)` y `rgb(51,65,85)`, ratio 1:1 | **Hecho:** `frontend/src/index.css:434` hace `--slate-700: var(--slate-500)` y, a la vez, `--slate-500: var(--slate-300)`. Por eso `.tx-cat-badge {background: var(--slate-700); color: var(--slate-300)}` acaba con el mismo color en texto y fondo | No encadenar variables: dar valores literales en `:root.app-contrast` o crear tokens semánticos (`--text-muted`, `--border-strong`) y usarlos en lugar de la escala. Añadir un test (jest/e2e) que active el contraste y compruebe que el ratio de `.tx-cat-badge` es al menos 4,5 | S |
| A02 | Resumen mensual (inicio) y Cuentas | Saltos de maquetación al cargar. CLS mediano: **0,941** en móvil (Slow 4G, CPU×4; 3 repeticiones: 0,94/1,06/0,94), **0,68** en 1280 px sin limitar la red, **0,84** con 50k movimientos; Cuentas **0,303** | `PROGRESO.md` y la tabla de (c); los saltos medidos son `div.month-actions 74→152 px`, `form.card 199→267→0`, `section.card 176→0` y `form.inline-form 181→0` | **Hecho:** `MonthActions.tsx` solo pinta Exportar/PDF/Resumen cuando ya han llegado movimientos (`hasMovements`). La tarjeta de alta rápida y otras tarjetas cambian de alto al llegar los datos. El e2e `layout.spec.ts` pone el CLS a 0 tras `.summary-card` y no ve estos saltos | Pintar los botones deshabilitados mientras `loading` (o reservar `min-height`), dar altura fija a los esqueletos de QuickAdd y de las tarjetas, y medir el CLS en el e2e desde la navegación hasta que la red queda en reposo | M |
| A03 | API de estadísticas (Resumen, Dinero perdido) | Con 50.000 movimientos: `/stats/forecast` **455 ms p50** (483 p95), `/stats/money-leaks` 221 ms, `/stats/subscriptions` 265 ms, `/business/tax` 100 ms. Con 8 previsiones en paralelo, un `/billing` de otro usuario **tardó 3.681 ms**: el event loop se queda bloqueado | `bench.log` y `block.mjs` (ver (c)) | **Hecho:** `InsightsServices.detectSubscriptions`, `TaxService.movements` y `SettingsService` llaman a `listAllByUser` (83 ms solo la consulta de 50k filas) y procesan en JS de forma síncrona. Además la previsión se pide 2 veces al abrir el Resumen | Ventana de 24 meses y agregados en SQL; caché por usuario invalidada al escribir movimientos o reglas; detector de suscripciones incremental; `worker_threads` como red de seguridad. Quitar la doble llamada | M-L |
| A04 | Todas (JS inicial) | El chunk de entrada `index-*.js` pesa 605 KB (142 KB br), y 527 KB (123 KB br) de eso son `es.json`. La landing (que necesita unos 6 KB de textos) y los usuarios en inglés también lo descargan | Build: tabla de (c); `I18nContext.tsx:3` importa `@locales/es.json` de forma estática | **Hecho:** import estático del idioma por defecto | Partir los textos por espacio (`landing`, `auth`, `app.*`, `app.autonomo` 89 KB, `app.crypto` 55 KB, `tools` 128 KB, `hacienda` 34 KB, legales) y cargarlos con `import()` como ya se hace con `en.json`. En el entry deben quedar solo los comunes, la landing y auth | M |
| A05 | Landing, primera visita | El SW se registra para cualquier visitante y precachea 194 ficheros (6,85 MB sin comprimir). En 15 s, una primera visita a `/` hizo **208 peticiones y 1,57 MB**, frente a los 350 KB de la página (lo más pesado: formPdf 161 KB, en.json 115 KB, casillas 2023–2025 ~160 KB) | Log de acceso de nginx (`sw.mjs`) | **Hecho:** `vite.config.ts`, `workbox.globPatterns` con `**/*.{js,…}` | Precachear solo el shell; `runtimeCaching` para los chunks lazy; añadir `casillas-*`, `formPdf-*`, `en-*` y `rentaProgress-*` a `globIgnores`; registrar el SW solo con sesión o tras `requestIdleCallback` | S-M |

### Media

| Id | Pantalla | Descripción | Evidencia | Causa probable | Solución propuesta | Esfuerzo |
|---|---|---|---|---|---|---|
| M01 | Las 22 secciones con sesión | Chrome avisa «A preload for …css is found, but is not used because the request credentials mode does not match» para 5 CSS (Billing, useMediaQuery, LanguageSwitcher, IosInstallHint, DashboardPage). Esos CSS se descargan dos veces | `crawl-main.jsonl`: 264 cargas con el aviso | **Hecho:** `public/theme-init.js` crea `<link rel=preload as=style>` sin `crossorigin`, mientras Vite los pide con `crossorigin` | `link.crossOrigin = ''` también en los CSS | XS |
| M02 | Resumen, Cuentas, Buscar, Tu plan | Peticiones duplicadas al abrir: `/billing` ×3, `/sample-data` ×2, `/category-rules` ×2, `/referral` ×2, `/stats/forecast` ×2 (10 de 12 combinaciones), `/accounts?year&month` ×2, `/transactions/search` ×2 | `analyze.mjs dup` | **Hecho en parte:** cada componente pide su recurso (por ejemplo `TransactionForm` y `QuickAdd` piden las reglas; `InviteCard` e `InviteeGoal` piden el referido). Del triple `/billing` no se encontró el origen exacto (a confirmar con el servidor de desarrollo) | Deduplicar las peticiones en vuelo y cachear con TTL corto en `shared/hooks/useResource.ts` (clave = endpoint + parámetros), o subir esos recursos a un contexto | S-M |
| M03 | Análisis (390 px, es y en) | Hay scroll horizontal: `scrollWidth` 433 px (417 en inglés) con un viewport de 390 | `capturas/analisis-movil-scroll-horizontal.jpg`; el estilo calculado de la tabla es `absolute, 400px, clip rect(0)` | **Hecho:** la `table.sr-only` del gráfico de patrimonio no encoge (una tabla ignora `width:1px`) | Envolver la tabla en `<div class="sr-only">` o dar `display:block` a `.sr-only` cuando se aplica a una tabla. Test e2e «sin scroll lateral a 390 px» por sección | XS |
| M04 | Resumen (390 px) | Las pestañas de la lista se cortan: «🌟 Por día», «📅 P…» y «🗓️ C…» | `capturas/resumen-movil-pestanas-truncadas.jpg` | **Hecho:** `.tx-tabs .tab-btn` con 80 px y `ellipsis` | Pestañas desplazables o solo icono con `aria-label` por debajo de 400 px | XS-S |
| M05 | Importar (PDF) | Al importar el PDF del mismo extracto que ya estaba importado en CSV, aparece «Se importarán 1 movimientos · 9 ya existían». Esa fila es «SUPERMERCADO LOS OLIVOS - Documento de ejemplo con datos inventados.», 38,45 €: es un **duplicado** | `capturas/import-pdf-duplicado-pie.jpg`, `flow-import.log` | **Hecho:** el lector genérico de PDF une el pie del documento a la última fila, y la deduplicación compara la descripción | Cortar la fila al encontrar un salto vertical o la zona del pie y descartar líneas sin importe. Avisar de «posible duplicado» cuando coinciden fecha e importe aunque cambie el texto | S-M |
| M06 | Resumen › ¿Llegas a fin de mes? | «¿Y si quito un gasto recurrente?» muestra «Sin Seguro hogar (180,00 €/mes)», pero la regla es **anual** | `capturas/resumen-movil-claro.jpg` (3.ª columna) | **Hecho:** `ForecastPanel.tsx:132` usa la clave `app.forecast.without = "Sin {name} ({amount}/mes)"` para cualquier frecuencia | Texto según `rule.frequency` o importe mensual equivalente (15 €/mes) | XS |
| M07 | Metas | Dos metas con la categoría «Ahorro» muestran las dos 2.100 € ahorrados: el mismo dinero cuenta dos veces | `capturas/metas-misma-categoria.jpg` | **Hecho:** el progreso de una meta es el ahorro de su categoría y la API permite repetir categoría | Responder 409 y avisar en la interfaz si la categoría ya pertenece a otra meta activa | S |
| M08 | Sin conexión | El aviso dice «Lo que hagas ahora no se guardará hasta que vuelva la red», que da a entender que se guardará luego, pero el alta falla («No se ha podido conectar…»). Presupuestos, sin red, muestra «0,00 €» y «Sin límite» en todas las categorías | `capturas/sin-conexion-presupuestos-390.jpg`, `sin-conexion-alta-rapida-390.jpg` | **Hecho** | Cambiar el texto («Sin conexión: no se puede guardar ahora») o implementar una cola. Si la carga falla, mostrar el error en lugar del estado vacío y deshabilitar los campos | S |
| M09 | App con sesión y landing | Con sesión, nada se pinta hasta que llega el JS: FCP **2,57 s** (Slow 4G) y **9,4 s** (Slow 3G). En la landing el LCP es `/landing/home.webp`, que pide React: **2,45 s** (4G) y **8,6 s** (3G), cuando el H1 pinta a 0,44 s | `vitals-*.json`; elemento LCP identificado con `lcpel.mjs` | **Hecho** | Splash estático (HTML y CSS en línea) en `index.html` para `.has-session`; `<img>` del héroe en el HTML prerenderizado o `<link rel=preload as=image fetchpriority=high>` | S |
| M10 | Cambio de mes (servidor) | `todayDateOnly()` y `currentPeriod()` usan la hora local del proceso, y `deploy/docker-compose.yml` no fija `TZ` (UTC). Entre las 00:00 y las 01:00/02:00 de Madrid del día 1, el servidor seguiría en el mes anterior: periodo actual, días que quedan, operaciones automáticas | Lectura de `backend/src/domain/shared/period.ts:117`; **a confirmar**: no se pudo probar sin un reloj inyectable | Suposición razonada | `TZ=Europe/Madrid` en el servicio de la API, o calcular el día con `Intl` en Europe/Madrid (como `crypto-season.ts`). Test en la frontera de mes | XS-S |
| M11 | Resumen (1280/1920) | En escritorio, las cifras del mes quedan debajo de 4 alertas y 4 botones; en 1920×1080 el saldo empieza hacia y≈700 px. A 1920 se usa una columna de 1150 px | `capturas/resumen-1920-oscuro.jpg` | Decisión de diseño | Alertas agrupadas y plegables (mostrar solo la más grave), tarjetas de resumen arriba y 2 columnas en pantallas anchas | M |

### Baja
28 hallazgos (B01–B28). Cada uno tiene su evidencia y su solución en `HALLAZGOS.csv`. Los principales:

- **B01** Salud: «16.3 meses» lleva punto decimal en español, y la misma tarjeta mezcla «7%» con «el 20 %». En `HealthView.tsx` el valor se pasa sin formatear.
- **B02** El signo menos no es el mismo en toda la app: «-1.371,74 €» (guion) en Cuentas, Resumen, Anual y Automáticas, frente a «−1,50 €» en la lista de movimientos.
- **B03** «saldada en Febrero 2028» en Deudas, frente a «abril de 2027» en Metas.
- **B04** En el paso 1 de Renta el texto pide pulsar «No sé / no aplica», pero ese botón no existe en ese paso.
- **B05** Alerta: «"Ocio" Ocio por encima de 150 € supera los 150,00 €».
- **B06** «Se importarán 1 movimientos».
- **B07** En móvil, la pista del Asesor IA se ve cortada.
- **B08** Contrastes de 3,2–4,0:1: siglas de las monedas en la consola, «⚠ Activa ahora» y pistas de logros. En total son 94 nodos de 22.161 revisados por tema (0,4 %).
- **B09** Objetivos táctiles de menos de 24 px: meses del Balance anual (17 px), select de año de `/calculadora-renta` (19 px), pie de la landing y enlaces del login.
- **B10** «Crear cuenta» tiene a la vez `disabled` y `aria-disabled="false"`.
- **B11** No hay enlace «saltar al contenido», y hay 4 botones que se llaman igual, «Cerrar alerta».
- **B12** No hay estilos de impresión: el Resumen sale en 7 páginas oscuras.
- **B13** Al texto plano de los correos le falta el pie no-reply, y el pie HTML tiene un contraste de 2,5:1.
- **B14** Las respuestas 429 no llevan `Retry-After`.
- **B15** Las respuestas privadas de `/api` no llevan `Cache-Control: no-store`.
- **B16** CSP completa solo en Report-Only, tokens en localStorage y access token válido 15 min tras cerrar sesión.
- **B17** En inglés: `app.learn.count` sigue en español y la fiscalidad de «Cómo invertir» también (`assetClassesA/B.ts`).
- **B18** El alta rápida manda «nómina» y «café» a «Otros» en un usuario nuevo.
- **B19** En 390 px, la tabla del Balance anual corta «BALANCE» sin indicar que hay scroll.
- **B20** Las tarjetas de Presupuestos en móvil ocupan unos 140 px cada una e incluyen categorías de ingreso.
- **B21** (Decisión del dueño) Los movimientos futuros de las operaciones automáticas (noviembre y diciembre) ya suman en el Balance anual y salen primero en Buscar.
- **B22** Si la sesión caduca, la app vuelve a la landing sin avisar.
- **B23** Cambiar el día de inicio del mes con 50k movimientos tarda 0,9–1,1 s.
- **B24** `POST /accounts` devuelve la lista entera.
- **B25** Las capturas de la landing son de una versión antigua de la interfaz.
- **B26** El build avisa «sitemap out of date for 2 page(s)».
- **B27** (A confirmar en Excel) El CSV usa comas y punto decimal.
- **B28** (A confirmar en un dispositivo) En Android, Ajustes explica cómo instalar la app en iPhone.

### Comprobado y correcto (regresiones de hoy y flujos)

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Signo «−» (U+2212) y «− 12,90 €» al pegar texto; ignora «Hola, Lucía / Saldo disponible 2.186,32 €» | 3/3 movimientos, con los tipos correctos | `import-pegar-texto-signo-menos.jpg` |
| Captura con cabecera del banco (`captura-maqueta-cabecera-390.png`) | 10/10 filas, sin filas falsas, 1,4 s | `import-captura-cabecera-banco.jpg` |
| CSV, CSV repetido, XLSX y «Ya cubierto» | 10 → 0 nuevos/10 existentes → 0/10 | `flow-import.log` |
| Saldos tras importar | Cuenta 1.236,88 € = saldo disponible = suma de la lista | API y `import-resumen-tras-importar-1280.jpg` |
| Totales del demo | Saldo 17.937,49 = 17.134,41 + 803,08 = suma de las 4 cuentas; presupuestos 1.124,12/1.480; Balance anual 22.940/11.466/1.500; patrimonio 20.337,49 cuadra | `resumen-movil-claro.jpg` |
| Tour corto (5 pasos) y completo; menú de 2 columnas sin scroll (390×844: 793/793 px) | OK (e2e `tour.spec.ts`, `layout.spec.ts` y mi recorrido) | `menu-390.jpg`, `primer-uso-390.jpg` |
| Iconos de redes en móvil y PC, y tecla N | OK | Capturas del Resumen; foco en el input |
| Consola crypto con ancho normal (1150 px a 1280) | OK (e2e `crypto.spec.ts:424`) | `consola-crypto-1280-oscuro.jpg` |
| Contraste apagado por defecto en Renta y Autónomos | `aria-pressed=false`, sin `.app-contrast` | `flow-renta` |
| «Iniciar nueva declaración» | Pide confirmación con la lista de lo que borra | `renta-nueva-declaracion-confirmacion-1280.jpg` |
| Borrador demo (`borrador-renta-demo.pdf`) | Madrid; 28.000 €; 1.778 €; 4.200 €; «Coincidimos con tu borrador» | `renta-borrador-demo-leido-1280-oscuro.jpg` |
| Contraseña y verificación | Páginas con estilos; enlace de un solo uso | `nueva-contrasena-*.jpg`, `verificar-correo-*.jpg` |
| Registro → verificación → primer uso → tour → salir | OK | `registro-*.jpg`, `primer-uso-*.jpg` |
| Selección múltiple → borrar → deshacer (390 y 1280) | Barra con totales, confirmación «¿Borrar 5…?», deshacer devuelve 5/5 | `seleccion-multiple-*.jpg` |
| Plan gratis | 4.ª cuenta → 402 y modal «Hazte Premium»; Tendencias y Patrimonio bloqueados con CTA | `plan-gratis-*.jpg` |
| XSS en descripción y nombre de meta | No ejecuta nada ni inyecta `<img>` | `flow-misc.log` |
| CSV con `=HYPERLINK`, `+cmd`, `@SUM` | Neutralizado con `'` | `flow-misc.log` |
| Correos: pie no-reply | Presente en el HTML (ver B13 para el texto plano) | `templates.ts:115` |
| Casos prácticos (motor) | 3.547 pasan, 0 fallos, 386 pendientes | `jest src/__tests__/casos` |
| e2e del proyecto (51) | 51 pasan en 4,1 min | `npx playwright test` |

## (c) Rendimiento (cifras medidas antes de cualquier cambio)

**Cómo se midió.** Build de producción servido como en producción (brotli precomprimido, cabeceras de Caddy). Chrome del sistema con Playwright y CDP; no se instaló Lighthouse ni axe para no descargar nada. Móvil 390×844 DPR2, CPU ×4, «Slow 4G» (150 ms RTT, 1,6 Mbps) y caché fría; mediana de 3 repeticiones. Usuario demo con 258 movimientos. «INP aprox.» es la duración del evento al abrir el menú.

| Pantalla | FCP ms | LCP ms | CLS | TBT ms | Tarea más larga ms | KB transferidos | JS KB | CSS KB | API KB | Peticiones | INP aprox. ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| / (landing) | 460 | 2452 | 0,025 | 0 | 0 | 350 | 232 | 11 | 2 | 27 | – |
| /pricing | 452 | 452 | 0,025 | 0 | 0 | 260 | 225 | 11 | 2 | 19 | – |
| /login | 440 | 440 | 0,015 | 0 | 0 | 372 | 338 | 13 | 0 | 25 | – |
| /calculadora-sueldo-neto | 472 | 748 | 0 | 0 | 0 | 349 | 303 | 14 | 0 | 32 | – |
| /guias/gastos-hormiga | 468 | 468 | 0,019 | 0 | 0 | 311 | 273 | 16 | 0 | 26 | – |
| Resumen mensual | 2572 | 2832 | **0,941** | 79 | 129 | 432 | 313 | 55 | 37 | 54 | 88 |
| Balance anual | 2600 | 2600 | 0,011 | 0 | 64 | 420 | 320 | 57 | 15 | 44 | 80 |
| Análisis | 2576 | 2976 | 0,007 | 0 | 57 | 421 | 320 | 57 | 17 | 47 | 72 |
| Buscar | 2576 | 2576 | 0,027 | 0 | 54 | 424 | 319 | 57 | 22 | 47 | 72 |
| Cuentas | 2572 | 2816 | **0,303** | 1 | 52 | 420 | 319 | 57 | 17 | 47 | 72 |
| Renta | 2604 | **4464** | 0 | 0 | 67 | 603 | 487 | 74 | 15 | 62 | 64 |
| Autónomos | 2592 | 3828 | 0 | 1 | 65 | 591 | 483 | 67 | 14 | 55 | 80 |
| Consola crypto | 2564 | 2960 | 0 | 19 | 66 | 530 | 392 | 69 | 42 | 53 | 96 |
| Ajustes | 2572 | 2888 | 0 | 0 | 57 | 433 | 327 | 58 | 21 | 52 | 56 |

**Slow 3G** (400 ms, 400 kbps, CPU×4): landing FCP 1,28 s / LCP **8,6 s**; Resumen FCP **9,4 s** / LCP 10,1 s / CLS 0,94; Renta FCP 9,3 s / LCP **14,8 s**.
**Sin limitar, usuario de 50k movimientos:** Resumen 620 KB (230 KB de API, `/months` de 2.174 movimientos = 931 KB de JSON sin comprimir), CLS 0,84, sin tareas largas (TBT 0).

**Build.** 26 s. 158 JS (7,9 MB sin comprimir, 1,64 MB br), 32 CSS (300 KB, 60 KB br), solo tipografías del sistema y sin fuentes web. Chunks más grandes, br: formPdf 161 KB, index 142 KB, en 115 KB, jspdf 102 KB, form-layout-100 99 KB, pdf 88 KB, rentaProgress 78 KB, react 63 KB, casillas-2025/2024/2023 57/54/51 KB, PriceChart 53 KB. OCR (`/ocr/`): 3 variantes `tesseract-core-*.wasm.js` de 3,9 MB, unos 1,47 MB comprimidas con zstd por Caddy, y se piden solo al usarlo. Caché: `/assets` con `immutable` de 1 año y HTML/SW con `no-cache` (correcto).

**API (p50/p95 en ms, 15 repeticiones, a través de Caddy).**

| Endpoint | demo (258) | 5k | 50k |
|---|---|---|---|
| /months/2026/10 | 1,3 / 2,2 | 4,9 / 5,9 | 58 / 60 (931 KB) |
| /transactions/search?q=caf | 1,1 / 1,4 | 2,6 / 2,9 | 27 / 28 |
| /transactions/search?sort=amount_desc | – | – | 55 / 57 |
| /transactions/annual/2026 | 0,7 / 1,1 | 2,1 / 2,5 | 25 / 27 |
| /accounts?year&month | 0,7 / 1,0 | 2,7 / 3,2 | 33 / 34 |
| **/stats/forecast?months=6** | 2,6 / 2,9 | 28 / 39 | **455 / 483** |
| /stats/money-leaks | 1,8 / 3,0 | 26 / 29 | 221 / 235 |
| /stats/subscriptions | 1,2 / 1,6 | 14 / 14 | 265 / 279 |
| /business/tax/2026 | 0,8 / 0,9 | 6,3 / 9 | 100 / 108 |
| /export (JSON) | 2,7 | 23 (1 MB) | 243 (10 MB) |
| /budgets (100 presupuestos) | 0,6 | 0,7 | 0,8 |

`EXPLAIN QUERY PLAN` con 50k: todas las consultas usan índices (`idx_transactions_user_period`, `idx_transactions_user_date`), sin N+1. Las sumas recorren todas las filas del usuario: carryover 18,5 ms, total de la búsqueda 19,6 ms, saldos por cuenta 28,5 ms. Ordenar por importe hace un `TEMP B-TREE` (20,6 ms). `listAllByUser` tarda 83 ms. El arranque del backend con base nueva y 39 migraciones es de unos 1,3 s. Con 8 previsiones en paralelo, la espera de otro usuario fue de **3.681 ms**.

**Memoria.** 55 cambios de sección: heap 10,2 → 12,8 MB y nodos DOM estables (3.357, o 10.070 con 50k). No se aprecia una fuga.

### Los 10 mayores cuellos de botella
1. Estadísticas O(N) síncronas: previsión, fugas, suscripciones e impuestos bloquean el event loop (A03).
2. CLS del Resumen y de Cuentas (A02).
3. `es.json` dentro del chunk de entrada: 123 KB br para todo el mundo (A04).
4. Precache del SW en la primera visita: 1,57 MB (A05).
5. App con sesión sin pintar hasta el JS: FCP 2,6 s en 4G y 9,4 s en 3G (M09).
6. LCP de la landing por la imagen inyectada: 2,5 s en 4G y 8,6 s en 3G (M09).
7. Renta y Autónomos: unos 485 KB de JS (rentaProgress, CampaignDates y BusinessView), LCP de 4,5 y 3,8 s.
8. Peticiones duplicadas (M02) y CSS descargados dos veces por el preload (M01).
9. `/months` devuelve el mes entero sin paginar (931 KB con 2.174 movimientos).
10. Sumas sin índice cubriente (carryover, saldos, total de la búsqueda: unos 20–30 ms con 50k) y reescritura fila a fila al cambiar el inicio de mes (B23).

### Mejoras ordenadas por impacto/esfuerzo
| Orden | Mejora | Impacto esperado | Esfuerzo |
|---|---|---|---|
| 1 | `crossorigin` en los preloads CSS (M01) | –5 descargas duplicadas por carga con sesión | XS |
| 2 | Reservar espacio en MonthActions, QuickAdd y Cuentas (A02) | CLS de ~0,9 a <0,1 en inicio | S |
| 3 | Precache solo del shell y SW diferido (A05) | –1,2 MB en la primera visita | S |
| 4 | Splash estático y preload de la imagen del héroe (M09) | FCP con sesión de ~2,6 s a ~0,5 s; LCP de la landing –2 s en 4G | S |
| 5 | Deduplicar en `useResource` (M02) y una sola petición de previsión | –7 peticiones en el Resumen | S-M |
| 6 | i18n por espacios (A04) | –110 KB br en el JS inicial (≈ –0,6 s en 4G) | M |
| 7 | Caché y agregados SQL de las estadísticas (A03) | De 455 a <50 ms con 50k; sin bloqueo | M-L |
| 8 | Índice cubriente `(user_id, year, month, type, account_id, amount_cents)` | Sumas a <5 ms con 50k | XS + migración |
| 9 | Paginar o virtualizar el mes con más de 500 movimientos | –900 KB de JSON en cuentas muy grandes | M |
| 10 | Dividir rentaProgress/CampaignDates por paso | LCP de Renta –1 s en 4G | M |

## (d) Matriz de cobertura

✓ = se cargó con comprobaciones automáticas (errores de consola y red, desbordes, textos cortados, contraste WCAG por nodo, nombres accesibles, tamaños táctiles, IDs duplicados, tokens rotos, formato de importes y textos en español dentro del inglés), más la captura completa. «en» en las secciones con sesión = cuenta configurada en inglés (2.ª pasada). **La revisión visual a ojo** se hizo en móvil claro (todas las secciones), en 1280 y 1920 oscuro (Resumen, Consola, Renta, landing) y en las capturas de los flujos. El resto de combinaciones se revisó solo con las comprobaciones automáticas.

| Pantalla | 390 cl es | 390 cl en | 390 os es | 390 os en | 1280 cl es | 1280 cl en | 1280 os es | 1280 os en | 1920 cl es | 1920 cl en | 1920 os es | 1920 os en | Letra grande + Contraste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Resumen mensual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Balance anual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Análisis | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Tu dinero perdido | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Salud financiera | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Buscar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Cuentas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Presupuestos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Metas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Gastos compartidos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Inversiones y deudas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Operaciones automáticas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Alertas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Autónomos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Renta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Hacienda paso a paso | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Aprende a ahorrar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Cómo invertir | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Consola crypto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| Videoteca (sección) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Tu plan / Invita | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Ajustes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| / (landing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| /pricing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| /login (+ registro, recuperar) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 390 cl/os, 1280 cl/os |
| /verify-email, /reset-password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| /privacy, /terms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 9 calculadoras y simulador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| /guias, 2 guías | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| /hacienda-paso-a-paso (+ 130) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| /videoteca | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |

Flujos (390 o 1280 claro, es): registro → verificación → primer uso → tour → salir; recuperar y nueva contraseña; alta rápida (8 entradas) y tecla N; importar con CSV, XLSX, PDF, pegar texto y captura; selección múltiple → borrar → deshacer; plan gratis; sin conexión; sesión caducada; exportar CSV y PDF del mes; teclado (Tab, menú, Escape); impresión; borrador de Renta y confirmación; cambio de inicio de mes y de moneda (API). 2FA, Long/Short, TP/SL, carteras de práctica, ranking, EUR/USD, pantalla completa, asistente de Renta de 9 pasos, Autónomos 303/130 con PDF y vista previa, instalación PWA, guías por sección y pago de prueba con el servidor de Stripe simulado: cubiertos por los **51 e2e del proyecto, que pasan en esta pila**, no repetidos a mano.

## (e) Plan de acción por oleadas

**Oleada 1: arreglos rápidos (≈1 día, sin riesgo de datos).** A01 (CSS de contraste y test), M01 (`crossorigin`), M03 (`sr-only` en tabla), M04 (pestañas), M06 (frecuencia), B01–B07 (formatos y textos), B10, B11, B13, B17, B26. Comprobación: tests unitarios de formato, e2e de no-scroll a 390 px y de contraste.

**Oleada 2: rendimiento del frontend (3–4 días).** A02 (CLS, ampliando el e2e para medir desde la navegación), M09 (splash y héroe), A05 (precache y SW), M02 (deduplicar `useResource`), A04 (i18n por espacios con test de claves), M08 (estado sin conexión). Objetivo: CLS <0,1 en todas las secciones, JS inicial de la landing por debajo de 120 KB br y primera visita por debajo de 450 KB.

**Oleada 3: servidor y datos (3–5 días).** A03 (agregados, caché y una sola previsión), M10 (`TZ` o `Intl` Madrid, con test en la frontera de mes), M05 (lector de PDF y duplicado aproximado), M07 (metas con categoría única), índice cubriente con migración, B23, B15, B14. Objetivo: p95 <100 ms con 50k y sin bloqueo del event loop.

**Oleada 4: UX y pulido (según prioridad del dueño).** M11 (escritorio ancho), B18–B22, B12 (impresión), B16 (CSP a enforcing tras revisar los informes), B25 (capturas de la landing), B27–B28 (comprobar en Excel y Android).

## (f) Lo que NO se pudo probar y por qué

- **Lighthouse/axe:** no están instalados y no se descargó nada sin permiso. Se usaron mediciones equivalentes con CDP (LCP, CLS, TBT con longtasks, FCP, bytes) y un comprobador WCAG propio. Este comprobador **omite el texto sobre degradados o imágenes**: 6–8 nodos por pantalla, como el botón «Aprende todo…» o las cabeceras con degradado.
- **Pago con Stripe en modo test:** no hay claves de Stripe en local (las variables están vacías). La interfaz dice «Los pagos todavía no están disponibles». El e2e `payments.spec.ts` lo cubre con un servidor simulado.
- **Google Sign-In y correo real (Resend):** desactivados a propósito. Los enlaces de verificación y de recuperación se leyeron del log de la API en desarrollo.
- **Zona horaria en el cambio de mes (M10):** sin reloj inyectable en el backend no se puede simular el 1 de noviembre a las 00:30 de Madrid. Queda como deducción del código.
- **IA (Asesor IA, categorías con IA):** `AI_PROVIDER=none`.
- **Precios reales de la consola crypto:** `CRYPTO_MARKET=demo`, con precios inventados.
- **Android/Capacitor, PWA instalada de verdad, «Compartir con Finanverso» desde otra app y notificaciones push:** requieren un dispositivo o emulador. Sí se comprobaron el manifiesto (`share_target` con imágenes, PDF, CSV, XLSX y N43) y que el SW se registra.
- **Excel real** para abrir el CSV (B27) e **iOS Safari** real.
- **Autónomos 349/390/347/111/115 y los ficheros de la sede:** no se recorrieron a mano. Los casos prácticos del motor (jest) y el e2e de 303/130 pasan, pero el resto de modelos no se ha visto en pantalla.
- **Borrar cuenta:** no se ejecutó en la interfaz. Por API, en local: sin contraseña devuelve 403; con contraseña, 204. Después, el access token antiguo, el login y el refresh devuelven 401 (correcto).
- **Revisión a ojo de las 540 + 132 + 52 capturas:** solo un subconjunto (ver (d)). El resto pasó únicamente por las comprobaciones automáticas.
- **Falsos positivos descartados:** «enlace sin nombre» en la campaña de Renta y «botón sin nombre» en Requisitos están dentro de `<details>` cerrados, donde `innerText` sale vacío. No se reportan.

## (g) Reproducir

Los scripts quedaron en el scratchpad de la sesión (fuera del repo):
- `crawl.mjs` + `audit-page.js`: matriz de pantallas.
- `analyze.mjs`: resumen de errores, duplicados, desbordes, contraste y accesibilidad.
- `vitals.mjs` y `vsum.mjs`: vitales web.
- `bench.mjs`, `block.mjs` y `explain.mjs`: latencia de la API, bloqueo del event loop y planes de consulta.
- `flow-*.mjs`: flujos.
- `sw.mjs`: precache.
- `leak.mjs`: memoria.
- `keyboard.mjs`: teclado.
- `security.mjs` y `ratelimit.mjs`: seguridad básica.

La pila se monta así:
1. `npm run build` del frontend con `.env.production` (`VITE_API_URL=/api`).
2. nginx con `deploy/nginx-web.conf` apuntando a `dist/`.
3. Caddy con el bloque `(app)` de `deploy/Caddyfile` (`reverse_proxy` a localhost y sin `upgrade-insecure-requests`).
4. API con `ts-node` y la base temporal, con `SEED_DEMO_USER=true`, `RENTA_DRAFT_OPEN=true`, `CRYPTO_MARKET=demo`, `RATE_LIMIT_DISABLED=true` y una segunda instancia con los límites activos.

## (h) Arreglos aplicados en `develop` (27-10-2026) y decisiones

Detalle y cifras en `PROGRESO.md` (apartado «Arreglos»). Capturas nuevas en `despues/`.

**Decisiones del dueño, aplicadas:**

- **B21. Operaciones automáticas con fecha futura.** No se mezclan con los movimientos reales del mes: hay una tarjeta aparte en el Resumen mensual, «Recibos y cargos de este mes» (`MonthCharges.tsx`). Lista los gastos de operaciones automáticas del mes por fecha, cada uno como «Cobrado» o «Pendiente», con el **total del mes** y lo que **queda pendiente** (importe y número de cargos). Si no hay ninguno, la tarjeta no aparece. Los pendientes (fecha posterior a hoy) salen de la lista de transacciones y entran en ella el día que se cobran; pulsar una fila abre el movimiento para cambiarlo o borrarlo. Los totales del mes **no cambian**: el saldo disponible ya los restaba (como explica «¿Llegas a fin de mes?»), y la tarjeta lo dice.
  - **Balance anual y Buscar: con aviso, sin cambiar las cifras.** Es lo más coherente con el modelo de saldos de la app: los totales siguen incluyendo lo programado (para ver cómo cierra el año), pero ya no «sin aviso». El Balance anual muestra una línea («Incluye N operaciones automáticas con fecha posterior a hoy…») con los datos de `scheduled`, un campo nuevo de `/transactions/annual/:year` (contrato ampliado, solo se añade el campo). En Buscar, cada operación automática con fecha futura lleva la etiqueta «Programada», y una nota explica que ya cuenta en los totales. Se descartó quitarlas de los totales: el saldo del año dejaría de cuadrar con los meses, y eso rompería el Resumen.
  - Aclaración: el servidor anota cada operación automática el día 1 de su mes. En el mes actual, solo queda «pendiente» la que la persona movió a una fecha posterior (el día real del cargo). En los meses siguientes, todas están pendientes.
- **M07. Dos metas con la misma categoría:** se permite, pero se avisa. Al elegir en el formulario una categoría que ya tiene otra meta activa, sale un aviso (`app.goals.categoryTaken`): se puede usar, pero el mismo ahorro contará en las dos metas. Cada tarjeta que comparte categoría también lo dice (`app.goals.sharedCategory`). La API no cambia.
- **A05. Service worker:** se registra solo con sesión (o mientras se restaura). La portada, las guías y las calculadoras ya no lo instalan. En Android no cambia nada: la app nativa sigue sin SW. La PWA sigue igual para quien entra en la app.
- **B16. CSP:** se mantiene en Report-Only. **Criterio para pasar a enforce:** 14 días seguidos sin informes en `/api/csp-report` de orígenes propios (`docker compose logs api | grep '\[csp\]'` vacío o solo con extensiones), más las 3 pruebas manuales de `deploy/CSP.md` (login con Google, un vídeo y una compra de Stripe en modo prueba). Después se cambia una línea del `Caddyfile` (pasos 3 a 5 de `deploy/CSP.md`).
- **M10. Zona horaria:** `TZ=Europe/Madrid` en `deploy/docker-compose.yml` (servicio `api`), en `backend/Dockerfile` y en `backend/.env.example`. El servidor real lo recibirá en la próxima subida (el despliegue reconstruye la imagen y recrea el contenedor). No se ha tocado el servidor. Node lleva los datos de zona en su ICU, así que no hace falta `tzdata` en la imagen.

**A04 (dividir el diccionario de i18n): no se ha hecho.** El riesgo no es bajo. `t()` es síncrono y hay muchas claves dinámicas (`app.health.detail.${id}`…). Además, hay claves comunes que usan pantallas de varios espacios (`app.common.*`, los nombres de las categorías…). Si un trozo no ha llegado, se vería la clave en bruto, y los 7.600 tests unitarios dependen de que todo el español esté cargado. Propuesta para hacerlo con seguridad: `translate()` que, ante una clave de un espacio sin cargar, lo pida y vuelva a pintar; los `lazyNamed` de Dashboard, calculadoras y Hacienda que esperen a su espacio; y un test que recorra los `t('…')` estáticos de cada chunk. Esfuerzo M.
