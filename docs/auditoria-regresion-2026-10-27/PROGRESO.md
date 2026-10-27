# Progreso de la auditoría de regresión (27-10-2026)

## Entorno (montado)
- Worktree aislado, commit 5df7a760 (v1.64.3). node_modules enlazados al checkout principal.
- Build de producción (`npm run build`, VITE_API_URL=/api de .env.production): 26 s, OK.
- Pila local que imita producción: Caddy :5520 (cabeceras y CSP copiadas de deploy/Caddyfile, sin
  `upgrade-insecure-requests` por ser http local) → nginx :5530 (deploy/nginx-web.conf con dist/) y
  API :3510 (ts-node, NODE_ENV=development, BD temporal en el scratchpad, SEED_DEMO_USER, RENTA_DRAFT_OPEN,
  CRYPTO_MARKET=demo, sin Resend/Stripe/Google/IA).
- Arranque de la API (BD nueva, 39 migraciones): ~1,3 s hasta /api/health.
- Sin axe-core ni Lighthouse instalados (no se descarga nada sin permiso): contraste, LCP/CLS/TBT y
  demás se miden con scripts propios de Playwright + CDP (Chrome del sistema).

## Hecho
- Semillas: demo rico (258 tx, 4 cuentas, 6 presupuestos, 2 metas, deudas, reglas, alertas, gastos compartidos),
  vol5k (5.000 tx, 20 cuentas, 100 categorías+presupuestos), vol50k (50.000 tx), usera/userb (IDOR).
  Import de 5.000 filas: ~0,5 s por lote. NOTA: POST /accounts devuelve la LISTA, no la cuenta creada.
- Barrido matriz 1 (scripts en scratchpad/scripts/crawl.mjs + audit-page.js): 22 secciones + 23 rutas públicas
  × {390, 1280, 1920} × {claro, oscuro} × {es, en} = 540 cargas. Resultado en scratchpad/crawl-main.jsonl.
  OJO: con sesión iniciada el idioma lo manda el ajuste de la cuenta (es) → las secciones «en» salieron en
  español: hay que repetir con la cuenta en inglés.
- Seguridad API (security.mjs → scratchpad/security.log): IDOR bien cerrado (404 en todo), 413 con >4 MB,
  JSON roto 400, refresh con gracia de 30 s (diseño), access token válido 15 min tras logout.
- Revisión visual móvil claro de todas las secciones (tiles en scratchpad/tiles).

## Hallazgos en bruto (con evidencia)
- PERF: theme-init.js precarga CSS sin crossorigin → Chrome avisa «preload not used… credentials mode» en las
  22 secciones (5 CSS: Billing, useMediaQuery, LanguageSwitcher, IosInstallHint, DashboardPage) → doble descarga.
- PERF: es.json (527 KB min, 123 KB br) va dentro del chunk de entrada index-*.js (620 KB, 145 KB br) = 85 %
  del chunk inicial; lo descarga también la landing y los usuarios en inglés. Por espacios: tools 128 KB,
  app.autonomo 89 KB, app.crypto 55 KB, hacienda 34 KB, landing 6 KB.
- PERF: peticiones duplicadas al abrir Resumen: /billing x3, /sample-data x2, /category-rules x2, /referral x2,
  /stats/forecast x2; Cuentas: /accounts?year&month x2; Buscar: /transactions/search x2; Tu plan: /referral x2.
- PERF: precache PWA 194 entradas / 6,85 MB.
- LAYOUT: Análisis en 390 px tiene scroll horizontal (scrollWidth 433): table.sr-only del gráfico de patrimonio.
- LAYOUT: Resumen 390 px: pestañas «Por semana»/«Calendario» truncadas a «P…»/«C…».
- LAYOUT: Asesor IA en móvil: texto «Pulsa "✨ Analizar mes"…» cortado por abajo.
- DATOS: «¿Y si quito un gasto recurrente?» muestra «Sin Seguro hogar (180,00 €/mes)» para una regla ANUAL.
- DATOS: dos metas con la misma categoría cuentan el mismo ahorro dos veces (2.100 € en ambas).
- DATOS?: reglas recurrentes crean movimientos futuros (nov/dic) que suman en Balance anual y Buscar (confirmar diseño).
- FORMATO: Salud «16.3 meses» (punto decimal en es); «7%» y «20 %» mezclados; meses «Febrero 2028» en mayúscula
  en Deudas frente a «abril de 2027» en Metas; signo menos: «-1.371,74 €» (guion) en Cuentas/Resumen/Anual/Automáticas
  frente a «−» (U+2212) en la lista de movimientos.
- COPY: Renta paso 1 dice «pulsa «No sé / no aplica»» pero ese botón no existe en ese paso.
- COPY: alerta «"Ocio" Ocio por encima de 150 € supera los 150,00 €» (repetido, comillas rectas).
- A11Y: contraste bajo: iconos de monedas de la consola (blanco sobre verde, 3,2–3,6:1, 9 px), «⚠ Activa ahora»
  (3,6–4,0:1), pistas de logros cripto (4,0:1). En total 94 nodos de 22.161 por tema (0,4 %).
- A11Y: enlace vacío sin nombre en Renta / calculadora-renta (small.renta-field-hint > a), botón sin nombre en
  «Requisitos» del borrador de Renta; botones de mes del Balance anual de 17 px de alto en móvil; select de año de
  calculadora-renta 19 px; enlaces del pie de la landing 17 px.
- A11Y ALTA: modo «Contraste» → insignias de categoría de la tabla de escritorio invisibles (texto = fondo,
  rgb(51,65,85) sobre rgb(51,65,85)); causa: index.css remapea --slate-700→--slate-500→--slate-300. Captura hc-catbadge-light.jpg.
- PERF ALTA: CLS del Resumen en móvil 0,94–1,06 (slow4G, CPU×4) y 0,68 en 1280; Cuentas 0,30. Fuentes: MonthActions
  pinta sus botones solo cuando hay movimientos (74→152 px), QuickAdd card 199→267, tarjetas que aparecen/desaparecen.
- PERF ALTA: /stats/forecast 455 ms p50 con 50k tx (listAllByUser + JS), money-leaks 221 ms, subscriptions 265 ms; 8 forecasts
  en paralelo bloquean el event loop: un /billing ligero de otro usuario tardó 3.681 ms.
- PERF: primera visita a la landing con SW: 208 peticiones, 1,57 MB (precache de casillas Renta, formPdf, en.json…) frente a 350 KB de la página.
- PERF: LCP landing = /landing/home.webp inyectada por React (2,5 s slow4G; 8,6 s slow3G); FCP de la app con sesión 2,57 s slow4G (nada pinta hasta el JS).
- IMPORT: PDF del mismo extracto → 1 duplicado: la última fila absorbe el pie del PDF («SUPERMERCADO LOS OLIVOS - Documento de
  ejemplo con datos inventados.»), y «Ya cubierto» no lo reconoce. «Se importarán 1 movimientos» (plural).
- IMPORT OK: CSV 10/10, repetido 0/10 nuevos, XLSX 0/10 nuevos, pegar texto con «−» y cabecera de banco 3/3, captura con cabecera 10/10 en 1,4 s,
  saldo de cuenta = suma de la lista (1.236,88).
- OFFLINE: el aviso dice «Lo que hagas ahora no se guardará hasta que vuelva la red» (sugiere cola) pero el alta falla; Presupuestos
  sin red muestra 0,00 € y «Sin límite» en todas (estado engañoso).
- SESIÓN caducada: vuelve a la landing sin mensaje.
- ALTA RÁPIDA: «+1.200 nómina» y «café 1,50» van a «Otros» en un usuario nuevo (sin reglas). «1,234.56 compra» rechazado.
- OK: XSS (sin alertas), CSV con fórmulas neutralizadas (prefijo '), límites plan gratis (402 + modal), registro→verificación→tour 5 pasos,
  menú móvil 2 columnas sin scroll, tecla N, reset de contraseña y enlace de un solo uso, Renta: contraste apagado por defecto y
  confirmación de «Iniciar nueva declaración», borrador demo leído (Madrid, 28.000 €, 1.778 €, 4.200 €, coincide).
- Casos prácticos (jest src/__tests__/casos): 3.547 pasan, 386 todo, 0 fallos.
- Fugas: 55 navegaciones → heap +2,5 MB, nodos estables (3.357 / 10.070 con 50k): sin fuga apreciable.
- Rate limit (API aparte con límites): login 10/15 min, forgot 5; sin cabecera Retry-After. Enumeración por tiempo: 251 vs 252 ms (OK).
- Zona horaria (lectura de código, no probado en vivo): todayDateOnly usa la hora local del proceso y el contenedor no fija TZ → UTC.
- 1920: el Resumen deja los números debajo de 4 alertas y 4 botones; sin estilos de impresión (7 páginas en oscuro).
- EMAIL: pie no-reply presente en HTML (regresión OK) pero falta en la versión de texto plano; color #9ca3af sobre
  #f9fafb = 2,5:1.

## Estado final
- TERMINADO: informe en INFORME.md, hallazgos en HALLAZGOS.csv, 56 capturas en capturas/.
- e2e del proyecto: 51/51 en local (4,1 min). Casos prácticos: 3.547 pasan, 386 todo.
- Pendiente (ver INFORME (f)): Stripe test, Android/PWA real, Excel, borrar cuenta en UI, modelos 349/390/347/111/115 a mano.

## Arreglos (27-10-2026, rama develop, sin desplegar)

### Cerrados
| Id | Qué se hizo | Comprobación |
|---|---|---|
| A01 | `index.css`: en modo Contraste, `--slate-700` tiene un valor literal por tema (#475569 en oscuro y #a7b3c4 en claro), en vez de `var(--slate-500)`, que ya estaba redefinido. Insignias: 5,1:1 en oscuro y 4,9:1 en claro (antes 1:1). La moneda seleccionada de la consola usa el mismo token y deja de quedar oscura sobre oscura | e2e `regression.spec.ts`: ratio ≥ 4,5 en claro y oscuro |
| A02 (Resumen) | El mes empieza en «cargando» (antes se veía un instante el panel de mes vacío); los botones de MonthActions se pintan deshabilitados mientras carga; hueco reservado para la fila de categorías del alta rápida y para las tarjetas de cifras; alertas del mes debajo de las cifras (también ayuda con M11); esqueleto de «¿Llegas a fin de mes?» ajustado a lo medido (cuerpo de 1324/929 px con Premium, 1149/793 px con el plan gratis) y según el plan | CLS del Resumen con Slow 4G y CPU×4, desde la recarga hasta la red en reposo, 3 repeticiones: **390 px 0,779 → 0,000**; **1280 px 0,555 → 0,000**. Con los datos de toda la batería e2e (alertas, cuentas…): 0,000 y 0,020. e2e nuevo que mide desde la recarga con el mes retrasado 1 s; el de `layout.spec.ts` sigue pasando |
| A03 (parcial) | `detectSubscriptions`: agrupa en el sitio (antes copiaba el grupo en cada cargo: cuadrático), comprueba la cadencia con salida temprana y ordena sin `localeCompare`. El servidor ya no carga todos los movimientos para la previsión ni para las suscripciones: usa `listSubscriptionCandidates` (solo los gastos sin regla, con 4 columnas) y `firstDate`/`count` en SQL. La previsión solo se pide cuando ha llegado el mes (antes se pedía 2 veces) | Banco de pruebas con 50.000 movimientos (p50 de 7): **previsión 355 → 205 ms (−42 %)**, **suscripciones 237 → 74 ms (−69 %)**. JSON de las dos respuestas **idéntico byte a byte** antes y después. Test unitario: `forecast` se llama 1 vez |
| A05 | El SW se registra solo con sesión (`sessionSignal.ts` + `UpdatePrompt`); la app nativa no cambia | Build de producción con `vite preview`, primera visita a `/` durante 15 s: **223 peticiones y 7,7 MB sin comprimir → 25 peticiones y 0,9 MB** (el informe medía 1,57 MB → 350 KB con brotli). Con sesión se registra 1 SW (comprobado). Tests unitarios de UpdatePrompt |
| M01 | `theme-init.js`: `crossOrigin = ''` en los preload de CSS | — |
| M03 | La tabla `sr-only` del gráfico de patrimonio va dentro de un `div.sr-only` | e2e: `scrollWidth` ≤ 390 en Análisis |
| M04 | Pestañas de la lista con su nombre entero en móvil (desplazables si no caben) | e2e: ninguna pestaña recortada a 390 px |
| M06 | «Sin Seguro hogar (180,00 €/año)», «/trimestre» y «cada 2 meses», según la frecuencia | Test unitario |
| M07 | Se permite, pero se avisa (formulario y tarjetas) | Test unitario |
| M10 | `TZ=Europe/Madrid` en `docker-compose.yml`, `Dockerfile` y `.env.example`. Llegará al servidor en la próxima subida | — |
| B01 | «16,3 meses» con coma; los porcentajes de la app como «7 %» (espacio duro) en español y «7%» en inglés | Tests |
| B02 | El `money()` de la interfaz escribe el signo menos tipográfico (U+2212) en toda la app (los PDF ya lo convertían con `winAnsi`) | Test |
| B03 | Deudas: «saldada en febrero de 2028» | Test |
| B04 | El aviso del asistente nombra el botón que tiene esa pantalla («No lo tengo, sigo sin él»), o solo «Elige una respuesta» si no hay ninguno | Tests |
| B05 | «Ocio por encima de 150 €: el gasto en «Ocio» supera los 150,00 €» (antes con comillas rectas y la categoría delante del nombre) | — |
| B06 | «Se importará 1 movimiento» | Test |
| B07 | Asesor IA en móvil: sin la franja de texto cortado con el panel cerrado; comillas «» | — |
| B13 | Pie no-reply también en la parte de texto plano de los 6 tipos de correo; color del pie #6b7280 (4,6:1) | Test del backend |
| B16 | Sin cambios. Queda escrito el criterio para pasar a enforce (INFORME, apartado h) | — |
| B21 | Tarjeta «Recibos y cargos de este mes»; aviso en el Balance anual (campo `scheduled`); «Programada» en Buscar (INFORME, apartado h) | Tests unitarios, de integración del backend y e2e con capturas `despues/recibos-y-cargos-390.png` y `-1280.png` |
| Extra | «¿Borrar 1 transacción?» en singular; la selección se vacía al aplicar un cambio en bloque (como al borrar) | Tests |

### Cerrados después (27-10-2026, tarde)
| Id | Qué se hizo | Comprobación |
|---|---|---|
| A04 | Los textos de cada idioma van en dos partes. `scripts/i18n/split.cjs` recorre el código desde `src/main.tsx` (importaciones estáticas y dinámicas) y pone en el **núcleo** las claves que puede usar lo que se pinta antes de cualquier página que espere al resto. Son la portada, el login, los planes, verificar correo, nueva contraseña, la pantalla de bloqueo, errores, avisos y categorías: 391 claves. Un literal que empieza claves, como `` t(`app.apiError.${code}`) ``, las incluye todas. El núcleo en español va en el chunk de entrada; el inglés es un chunk aparte. El **resto** es un chunk por idioma, y lo esperan con `withAllTexts` el panel, las calculadoras, las guías, Hacienda, la videoteca y los textos legales antes de pintarse. Si una clave del resto se pidiera antes de llegar, sale en blanco (nunca la clave en bruto), se descarga y se repinta. `theme-init.js` precarga el resto con sesión y el núcleo inglés en `/en/` | Build: chunk de entrada **142,4 → 29,5 KB br**; JS inicial de la portada **205,6 → 92,7 KB br**; núcleo es 7,3 KB br, resto 114,8 KB br. Primera carga (Slow 4G, CPU×4, 390 px, mediana de 3, servidor con brotli): portada es FCP 2.008 → 1.448 ms, LCP 2.312 → 1.732 ms, 316 → 204 KB; portada en FCP 1.596 → 1.080 ms, LCP 3.056 → 1.776 ms, 428 → 207 KB; Resumen con sesión FCP 2.192 → 1.544 ms, LCP 2.500 → 2.360 ms, mismos bytes (354 KB). Tests: reparto sin pérdidas y con las mismas claves en es/en; páginas que esperan; **todas las claves de los `t()` estáticos y dinámicos existen en es y en**; red de seguridad (en blanco y repinta). e2e `i18n.spec.ts` (18): sin claves en bruto en la portada, el login y los planes (es/en, sin pedir el resto); calculadoras, guías, Hacienda, legales y videoteca (piden el resto); de la portada a una calculadora sin recargar; y **todas las secciones de la app** |
| A02 (Cuentas) | La lista guarda su sitio mientras llega: la altura medida en la última visita con el mismo ancho, o una estimación (62 px por fila; con menos de 600 px, 76 la principal y 106 las demás) con las cuentas que ya trajo el Resumen o las de la última vez. El formulario de traspasos no cambia por el aviso «necesitas dos cuentas». Exportar sigue desactivado, sin el «aún no hay datos» que luego desaparecía. «Cargando…» de una sección sin el margen que la movía 16 px | CLS de Cuentas (Slow 4G, CPU×4, de la recarga a la red en reposo, 4 cuentas, 3 repeticiones). **Visita repetida: 390 px 0,284 → 0,000; 1280 px 0,112 → 0,000.** Primera visita en el dispositivo (no sabe cuántas cuentas hay): 0,284 → 0,123 y 0,112 → 0,073. e2e nuevo en `regression.spec.ts` a 390 y 1280; sin el arreglo falla (0,18 y 0,09) |
| A03 (resto) | Caché por usuario con sello de versión (`infrastructure/sqlite/dataVersions.ts`, `application/shared/VersionedCache.ts`): la previsión, la detección de suscripciones y el dinero perdido se guardan hasta que cambian los datos de ese usuario. Cada método de los repositorios está clasificado como lectura o escritura; uno sin clasificar invalida a todos, y un test obliga a clasificarlo. La clave lleva el usuario, el día de Madrid, el idioma, el plan, los meses y las exclusiones. LRU de 500 entradas. No guarda lo calculado si hubo escrituras durante el cálculo. Los efectos de dinero perdido (decisiones recuperadas, embudo) se siguen ejecutando en cada petición. `/business/tax/:year` lee de SQL solo los movimientos profesionales del año (4 columnas). Se descartaron los agregados SQL para la previsión: usa medianas y textos normalizados, que no se reproducen exactos con SUM/GROUP BY | Banco con 50.000 movimientos en 24 meses, p50/p95 en ms, con las estadísticas del planificador como en `main.ts`. **Previsión 135/147 → 0,8/1,3** en lecturas repetidas; la primera tras escribir sigue en ~136. **Dinero perdido 145/164 → 0,5/0,8. Suscripciones 70/84 → 0,4/0,5. Impuestos 77/123 → 2,9/3,9**, también tras escribir. Respuestas idénticas byte a byte (sha256) antes y después. Tests de integración, uno por cada escritura (movimientos, importación, recurrentes y su generación, cuentas, traspasos, categorías, reglas, presupuestos, metas, decisiones, datos de ejemplo, inicio de mes, cambio de día y de plan). Comparan la API, de la caché, con el cálculo sin caché. Más aislamiento entre usuarios y en un hogar, y una prueba de mutación: quitar cada invalidación hace fallar el test |
| Extra | Renta: la frase «En tus cuentas de Finanverso, en {año} entraron… y salieron…» pasa a ser una nota de referencia aparte, con el rótulo «Referencia (no es tu declaración)» (es/en) y un estilo secundario. No se borra al «Iniciar nueva declaración» | Test unitario y e2e con la captura `despues/renta-referencia-1280.png` |

**Nota sobre la medida de la previsión:** sin las estadísticas del planificador (`optimize`), `listByPeriod` usa el índice por fecha y tarda 28 ms en lugar de 5. Por eso los «205 ms» de la mañana eran probablemente sin estadísticas. Producción las tiene, porque `main.ts` ejecuta `optimize` al arrancar.

### Pendientes
- **A03:** la primera lectura de la previsión tras una escritura sigue en ~135 ms y bloquea el event loop ese tiempo. Se reparte en suscripciones (18 + 48 ms), los 6 `listByPeriod` del historial (27 ms) y `netBefore` (17 ms). Lo bajaría el índice cubriente `(user_id, year, month, type, amount_cents)`, que necesita una migración, o mover el cálculo a `worker_threads`, que no es simple con better-sqlite3. `POST /business/draft` sigue con `listAllByUser`: el orden de entrada decide el de las partidas. Una escritura desde otro proceso con la API en marcha (CLI o SQL a mano) no invalida la caché, así que hay que reiniciar después.
- **A02 (Resumen con el mes vacío):** con un mes sin movimientos (usuario nuevo), el Resumen todavía da **0,111 (390 px) y 0,086 (1280 px)**. La tarjeta de alta rápida baja 3 veces por el panel del mes vacío y la previsión «aún no». El caso con datos sigue en 0.
- **A04:** el núcleo depende de que las claves se escriban como literales. Una clave que llegue del servidor o se construya sin un literal que la empiece no entra en el núcleo. Si se usa en la portada o el login, la red de seguridad la deja en blanco un instante y descarga el resto; el e2e de la portada fallaría porque pide el resto.
- M02, M05, M08, M09, M11 (resto), B08–B12, B14, B15, B17–B20, B22–B28: sin cambios.

### Batería
- Frontend: 7.247 tests y 386 pendientes, todos pasan; cobertura al 100 % (sentencias, ramas, funciones y líneas); `tsc`, ESLint sin errores (sin avisos nuevos) y Prettier.
- Backend: 1.165 tests pasan; cobertura 98,6 / 93,7 / 98,5 / 99,0 (umbrales 97 / 89 / 98 / 98); `tsc`, ESLint y Prettier. Contrato regenerado con `UPDATE_CONTRACT=1` (solo se añade `scheduled` a `annualSummary`).
- e2e: 57 en total (51 + 6 nuevos en `regression.spec.ts`). Pasan 56. Falla `public.spec.ts › shows the plans to anyone`: busca «3,49», y el `backend/.env` local fija `PRICE_MONTHLY=2.99`. Es un problema del entorno local, no del código (en CI vale el 3,49 por defecto).
- Build de producción correcto (el aviso del sitemap, B26, sigue).

### Batería (tarde, tras A04, A02 Cuentas, A03 y la nota de la Renta)
- Frontend: 7.264 tests y 386 pendientes, todos pasan; cobertura al 100 % (sentencias, ramas, funciones y líneas); `tsc`, ESLint sin errores ni avisos nuevos, y Prettier.
- Backend: 1.182 tests pasan; cobertura 98,63 / 93,77 / 98,56 / 99,0 (umbrales 97 / 89 / 98 / 98); `tsc`. El contrato de la API no cambia.
- e2e: 78 en total (57 + 18 de `i18n.spec.ts` + 2 de Cuentas + 1 de la Renta). Pasan 77. Falla solo `public.spec.ts › shows the plans to anyone`, el mismo problema del entorno local de la mañana (`PRICE_MONTHLY=2.99` en `backend/.env`).
- `npm run build` completo correcto: `test:seo` 9/9, prerender de 80 páginas y 404, y los chunks `texts-*` con sus `.br` y `.gz`. Sigue el aviso del sitemap (B26).
