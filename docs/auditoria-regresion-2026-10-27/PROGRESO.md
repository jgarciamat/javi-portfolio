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

### Pendientes
- **A02 (Cuentas):** el CLS de 0,30 no se ha tocado.
- **A03 (resto):** caché por usuario o agregados en SQL de la previsión (todavía ~200 ms con 50.000 movimientos, sobre todo los 6 `listByPeriod` del historial), dinero perdido, impuestos y `worker_threads`. Va en la oleada 3.
- **A04:** no se ha hecho; el riesgo no es bajo (motivo y propuesta en INFORME, apartado h).
- M02, M05, M08, M09, M11 (resto), B08–B12, B14, B15, B17–B20, B22–B28: sin cambios.

### Batería
- Frontend: 7.247 tests y 386 pendientes, todos pasan; cobertura al 100 % (sentencias, ramas, funciones y líneas); `tsc`, ESLint sin errores (sin avisos nuevos) y Prettier.
- Backend: 1.165 tests pasan; cobertura 98,6 / 93,7 / 98,5 / 99,0 (umbrales 97 / 89 / 98 / 98); `tsc`, ESLint y Prettier. Contrato regenerado con `UPDATE_CONTRACT=1` (solo se añade `scheduled` a `annualSummary`).
- e2e: 57 en total (51 + 6 nuevos en `regression.spec.ts`). Pasan 56. Falla `public.spec.ts › shows the plans to anyone`: busca «3,49», y el `backend/.env` local fija `PRICE_MONTHLY=2.99`. Es un problema del entorno local, no del código (en CI vale el 3,49 por defecto).
- Build de producción correcto (el aviso del sitemap, B26, sigue).

