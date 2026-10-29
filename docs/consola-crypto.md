# Consola crypto

Sección del menú **Aprender** para aprender a operar con criptomonedas con **dinero ficticio** y
ver si se habría ganado o perdido. Es un simulador educativo: nunca opera con dinero real, no da
señales, predicciones ni recomendaciones y no enlaza a exchanges ni a afiliados. Disponible en
todos los planes.

## Qué se copió del proyecto de cripto del dueño (solo conceptos)

Del frontend del proyecto privado se tomaron **ideas de interfaz**, no código del motor:

- La gráfica de velas con **TradingView Lightweight Charts** (misma librería, v5.2.1): velas y
  volumen, marcos de 5 min a 1 semana, arrastrar, rueda o pellizco para ampliar, «Lo más reciente»,
  «Ver todo», pantalla completa, lectura de la vela señalada y líneas de precio de las posiciones.
- La disposición: columna de monedas con icono, nombre, par y variación; cabecera con la moneda y
  el precio, cambio del periodo visible, caja con mejor oferta de compra y venta (bid/ask), volumen
  de 24 h y hora de actualización; temporalidades arriba; cuenta atrás del cierre de la vela;
  botones-chip para las capas.
- La caja de operar: franjas de capital inicial, disponible, reservado, resultado no realizado y
  patrimonio; dirección **Toros · Long / Osos · Short**; tipo de orden; capital por operación con
  atajos de 25/50/75/100 %; precio de entrada automático a mercado; take profit y stop loss;
  paneles de abiertas, pendientes y cerradas.

## Qué se dejó fuera a propósito

- Todo el motor: estrategias, señales, «campeones», puntuaciones, admisión, FVG, order blocks,
  barridos de liquidez, patrones automáticos, proyección «sombra», «Sugerir TP/SL», autopsia de
  pérdidas, «Exportar muestra global JSON» y el «Reiniciar» global del motor.
- Carteras y ejecución reales (Solana/Phantom, Jupiter, Hyperliquid), WebSocket directo a Binance
  desde el navegador, claves, `.env`, datos y configuración privada.
- **Apalancamiento**: no se implementa. Solo se explica en la guía (qué es, por qué multiplica
  ganancias y pérdidas, liquidación) y se dice que Finanverso no lo ofrece. Siempre **1x**.

## Escala compacta (estilo terminal)

- Tipografía de la consola a 14 px de base; etiquetas a 12 px (mínimo), valores a 14 px; precio
  principal con `clamp()` (24 px en el móvil, 36 px en escritorio). Controles compactos con ratón
  (26-28 px) y de **32 px como mínimo** en el móvil o con pantalla táctil (`pointer: coarse`).
- **Monedas**: todas las que da el backend, en **páginas** en escritorio. La columna es tan alta
  como el precio y la gráfica (`contain: size` en la rejilla) y **sin scroll interno**: se mide su
  alto y el de una fila (44 px, con 6 px de aire entre filas) y cada página lleva solo las filas
  **enteras** que caben (`rowsThatFit` en `ui/CoinList.tsx`; se vuelve a medir con
  `ResizeObserver` y al cambiar el tamaño de la ventana; 8 filas hasta medir). Si hay más monedas
  que filas aparecen «Ant.» y «Sig.» pequeños con «1 / 2» (mínimo 2 páginas); se abre en la página
  de la moneda elegida. En el móvil y en horizontal, todas en una fila deslizable, con la elegida
  centrada sin mover la página.
- **Cabecera**: precio, cambio de 24 h y del periodo visible a la izquierda; temporalidades
  (5 min … 1 sem.) y «€ EUR | $ USD» como botoncitos en la misma fila a la derecha; debajo, **una
  fila** de celdas con bid, ask, máx./mín./volumen de 24 h y actualizado (3 por fila en el móvil).
- **Vela**: «Ap. / Máx. / Mín. / Cie. / Vol.» en una línea pequeña (nombre completo al pasar el
  ratón, `<abbr>`) y una pastilla con la cuenta atrás del cierre y las **velas a la vista**.
- **Zoom**: barra pequeña bajo la gráfica con iconos: «− Alejar», «+ Acercar», «Reciente» (rango
  lógico de las últimas 70 velas), «Todo» (`fitContent`) y «Pantalla completa»; cada botón lleva
  su atajo en `title` y `aria-keyshortcuts` (−, +, Fin, Inicio; Esc para salir).
- **Capas**: chips pequeños (12 px, 24 px de alto con ratón) **justo encima de la gráfica**, en
  el sitio de la antigua leyenda, uno junto a otro en una barra que se ajusta a varias líneas (en
  horizontal, fila deslizable): rayita del color de la capa, nombre corto en versalitas
  (EMA 20, EMA 50, EMA 200, Bollinger, VWAP, Perfil vol., Sop./Resist., Fibonacci) y
  `aria-pressed`. Al pulsarlo la capa se dibuja y el chip queda marcado con borde y fondo de su
  color; si la capa tiene un solo valor lo lleva dentro en pequeño («EMA 50 · 93,70 €») y si tiene
  varios van en el `title` y en texto para lectores de pantalla. Sin etiquetas de grupo, sin «?»
  en cada chip, sin leyenda aparte ni frase larga al lado. Al final de la barra, el botón de
  acento pequeño **«Aprende antes de jugar»** (la frase «Son herramientas para aprender…» queda
  en su `title` y como subtítulo del panel). La barra de capas grande de debajo de la gráfica
  desaparece.
- **Tabla de velas**: «Ver las últimas 30 velas en una tabla» es un enlace pequeño (12 px, sin
  negrita) al pie del bloque de la gráfica, cerrado por defecto.
- Resumen de cartera, caja de operar, paneles y tabla usan la misma escala (celdas de 12/16 px,
  campos de 40 px, botón de abrir de 44 px).

## Datos de mercado

- **Fuente**: datos públicos de Binance, sin clave ni cuenta (`data-api.binance.vision` y, si
  falla, `api.binance.com`). 22 monedas (las 20 primeras más PEPE y BONK). Cada una sale de **un
  solo par**, fijado por versión (ver «Fuente por moneda»): BTC y ETH de su par en euros; el resto
  de su par en **USDT convertido a euros** al cambio de referencia del BCE.
- **Proxy en el backend** (`/api/crypto/coins` y `/api/crypto/candles`, con sesión): el navegador
  nunca llama a terceros (la CSP no cambia). Caché compartida de 15 s a 10 min según el marco, una
  sola petición aunque muchas pantallas pidan a la vez; 1.000 velas por serie, 500 a la gráfica.
  `/crypto/coins` incluye **bid, ask y volumen de 24 h en euros** del ticker público.
- Si la fuente cae se sirve la última copia (hasta 6 h) marcada «con retraso»; sin copia, 503
  `MARKET_UNAVAILABLE` y la pantalla lo explica con «Reintentar».
- `CRYPTO_MARKET=demo` inventa precios suaves y deterministas para desarrollo y E2E (sin
  Internet). En producción se fuerza la fuente real.

### Fuente por moneda (versión 2, octubre de 2026)

**Problema.** Los pares en euros de casi todas las monedas apenas tienen operaciones: muchas velas
salían planas (apertura = máximo = mínimo = cierre, sin volumen) y otras sueltas con saltos. Es
lo que hay en Binance, no un fallo de la gráfica.

**Medición** (API pública de Binance, 23-10-2026, % de velas vacías: sin volumen o con un único
precio; volumen de 24 h del par en euros):

| Moneda | Vol. 24 h en EUR | EUR 5 min | EUR 15 min | EUR 1 h | USDT 15 min |
| --- | ---: | ---: | ---: | ---: | ---: |
| BTC | 7,6 M€ | 0 % | 0 % | 0 % | 0 % |
| ETH | 4,0 M€ | 0,3 % | 0 % | 0 % | 0 % |
| SOL | 1,0 M€ | 1,5 % | 0 % | 0 % | 0 % |
| XRP | 1,1 M€ | 16 % | 1 % | 0 % | 0 % |
| DOGE | 140 k€ | 30 % | 7 % | 0,5 % | 0 % |
| TRX | 50 k€ | 62 % | 8-14 % | 0 % | 0 % |
| BNB | 173 k€ | 55 % | 17 % | 2 % | 0 % |
| ADA | 161 k€ | 68 % | 35 % | 2,5 % | 0 % |
| LINK | 50 k€ | — | 69 % | 21,5 % | 0 % |
| DOT | 15 k€ | — | 68,5 % | 12 % | 0 % |
| LTC | 32 k€ | — | 82 % | 27,5 % | 0 % |
| BCH | 2 k€ | — | 88,5 % | 56 % | 0 % |
| AVAX | 60 k€ | — | 39,5 % | 39,5 % | 0 % |
| XLM | 10 k€ | — | 79,5 % | 44,5 % | 0 % |
| SHIB | 7 k€ | — | 89 % | 47 % | 0 % |
| ATOM | 7 k€ | — | 94,5 % | 82 % | 0 % |
| NEAR | 22 k€ | — | 59,5 % | 23,5 % | 0,5 % |
| SUI | 39 k€ | — | 64,5 % | 20,5 % | 0 % |
| APT | 8 k€ | — | 90,5 % | 46 % | 0 % |
| POL | 15 k€ | — | 85 % | 59 % | 0,5 % |
| PEPE | 36 k€ | — | 85 % | 28 % | 0 % |
| BONK | sin par en EUR | — | — | — | 0,5 % |

(5 min sobre 1.000 velas; 15 min y 1 h sobre 200.) Los pares en USDT mueven de cientos de miles a
miles de millones de dólares al día y no tienen velas vacías en ninguna temporalidad.

**Criterio.** Se queda en euros solo la moneda cuyo par en euros tiene menos de un 1 % de velas
vacías a 5 min (la temporalidad más corta de la gráfica) y millones de euros al día: **BTC y ETH**.
SOL pasa por poco (1,5 %) pero se ve peor que en USDT; se puede volver a euros sin tocar código.
El resto, **USDT**. Configurable con `CRYPTO_EURO_PAIRS` (`BTC,ETH` por defecto, `none` para
todas en USDT; una moneda desconocida impide arrancar). El plan está en
`backend/src/domain/services/crypto-market.ts` (`EURO_PAIRS`, `MARKET_SOURCE_VERSION = 2`).

**Por qué fijo y no decidido sobre la marcha.** Una decisión automática (por volumen o velas
vacías) cambiaría de par al reiniciar el servidor (Render reinicia a menudo) o entre peticiones:
el precio saltaría ~0,2-0,5 % (el par en euros y el USDT al cambio del BCE no coinciden del todo)
y podría disparar TP/SL que el mercado no alcanzó. Por eso el par de cada moneda es fijo durante
la vida del proceso y solo cambia con una nueva versión del plan. Sí hay vigilancia: si una moneda
en euros mueve menos de 250.000 € en 24 h, el servidor lo anota en el log una vez al día
(«consider quoting it in USDT»), sin cambiar nada.

**Conversión (una sola función de precio).** `BinanceMarketData` guarda en caché los números del
par (USDT) y los convierte **al leer** con `toEuros(usdt, usdPerEur) = usdt / tasa` (redondeo a
10 cifras significativas, que mantiene máximo ≥ apertura/cierre ≥ mínimo). Lo usan igual las
velas, el precio, bid/ask y el volumen de 24 h, y de ahí beben la gráfica, la lista de monedas,
las órdenes a mercado, límite y stop, los TP/SL, la resolución de pendientes con velas, las
alertas, el cierre de temporada y el ranking: todos ven los mismos euros en el mismo momento. El
volumen de cada vela sigue en monedas; el % de 24 h es el del par (con una tasa fija coincide).

- **Tasa**: el cambio de referencia del BCE de hoy (dólares por euro) del mismo `FrankfurterRates`
  que sirve `/api/rates` (una sola instancia en el contenedor, caché de 12 h). Se toma **1 USDT =
  1 US$** y se dice en la nota. Si el servicio de tasas falla se usa la última tasa obtenida
  hasta 7 días (el BCE no publica en fin de semana); sin ninguna, las monedas en USDT salen **sin
  precio** y sus velas dan 503 `MARKET_UNAVAILABLE`: nunca se inventa un precio ni se cambia de
  par.
- **Dólares sin doble conversión**: `/api/crypto/coins` y `/api/crypto/candles` devuelven
  `market.usdPerEur` (la tasa usada) y cada moneda o serie su `quote` (`EUR` o `USDT`). El
  frontend usa esa misma tasa para mostrar dólares (`DisplayChoice.adopt`), así que en USD una
  moneda en USDT muestra exactamente su precio en USDT (euros × la misma tasa).
- **Huecos**: no se rellenan. Si a la fuente le falta una vela, falta en la gráfica.
- **Límite conocido**: la conversión usa la tasa de hoy también para las velas antiguas (en 1 d y
  1 sem. el euro frente al dólar ha variado hasta ~10 % en años). Para aprender es suficiente y lo
  dice la nota; convertir cada vela con la tasa de su día es posible (serie histórica del BCE) si
  el dueño lo pide.
- **Cambio de tasa diario**: cuando el BCE publica la tasa nueva (~16:00), todas las velas en
  USDT se mueven a la vez lo que se mueva el euro (normalmente < 0,5 %). Equivale a un movimiento
  real para quien mide en euros; puede ejecutar un TP/SL que estuviera a esa distancia.
- **Datos existentes**: la consola aún no está en producción (no hay operaciones reales de
  usuarios). En bases de desarrollo, las posiciones y órdenes guardadas siguen en euros; al pasar
  una moneda a USDT, sus pendientes se resuelven en la siguiente lectura con la serie nueva
  convertida (la caché va por par, así que nunca se mezclan series), y el precio puede moverse una
  vez ~0,2-0,5 %.

**Nota de datos (por moneda).** Con la moneda de la gráfica en USDT, el aviso dice en euros
«SHIB: precio convertido desde USDT al cambio de referencia del BCE de hoy (1 € = X US$; tomamos
1 USDT = 1 US$), porque en euros apenas tiene operaciones o no cotiza» y en dólares «precio en USDT
mostrado en dólares sin más conversión (…); el simulador lo guarda en euros, convertido desde
USDT al cambio de referencia del BCE de hoy». Con los datos de ejemplo (`demo`) no se habla de
USDT: son inventados en euros.

**Aviso de poco volumen.** Si más del 30 % de las velas a la vista (mínimo 10) están vacías, bajo
la gráfica (también a pantalla completa) aparece «Poco volumen en esta moneda: prueba una
temporalidad mayor (1 h o 4 h)» (las dos siguientes de 1 h o más; en 1 sem., «muchas velas de
este tramo no tienen operaciones»). Con USDT casi nunca saldrá.

PUNTO PARA ABOGADO: uso de los datos públicos de Binance (precios de pares en USDT) convertidos a
euros con la tasa del BCE y mostrados a usuarios en una app con plan de pago. Ya se usaban los
pares en euros; la novedad es mostrar precios derivados (conversión propia). Revisar las
condiciones de uso de la API pública de Binance y la atribución, y que el texto «convertido desde
USDT … tomamos 1 USDT = 1 US$» basta como aviso.

## Moneda de visualización (EUR / USD)

- Control «€ EUR | $ USD» junto a las temporalidades. El simulador **sigue en euros**; los dólares
  son una **conversión de visualización** con el cambio del BCE del día (la tasa con la que el
  servidor convirtió los precios en USDT, o el `/api/rates` que ya usa la app). BTC y ETH vienen de
  su par en euros y en dólares se convierten; las monedas en USDT se guardan en euros y en dólares
  vuelven a su precio en USDT (ver «Fuente por moneda»). Un **único aviso discreto** (`DataNotice`) reúne
  retraso, fuente, frescura y, en USD, «Los importes en dólares son una conversión informativa al
  cambio de referencia del BCE de hoy (1 € = X US$); el simulador guarda y calcula en euros».
  `/api/rates` no devuelve fecha, por eso se dice «de hoy». Sin cambio disponible se muestra en
  euros y el mismo aviso lo dice.
- Todo pasa por `frontend/src/modules/crypto/domain/currency.ts` y `format.ts`: precios, gráfica y
  capas (se convierten las velas), cabecera, bid/ask, volumen, monedas, caja de operar, cartera,
  paneles e informe Premium de temporada (cabeceras con € o $). Lo tecleado en dólares se pasa a euros antes de
  enviarlo (importes al céntimo, precios sin redondear), con tests de ida y vuelta.
- Preferencia por dispositivo en `mm_crypto_currency`; la primera vez, la moneda de la app.

## Capas de la gráfica (solo visualización didáctica)

Funciones puras (`domain/indicators.ts` y `domain/layers.ts`) sobre las velas cargadas: **EMA 20,
50 y 200**, **Bandas de Bollinger (20, 2)**, **VWAP** (desde la primera vela cargada), **perfil de
volumen** (POC, VAH y VAL de las velas en pantalla, zona de valor del 70 %), **soportes y
resistencias** (giros con 3 velas a cada lado, agrupados al 0,5 %, hasta 3 de cada) y
**Fibonacci** (0 a 100 % del último tramo alto-bajo visible). Cada capa: chip con
`aria-pressed`, su color, su valor (dentro del chip o en el `title`) y preferencia en
`mm_crypto_layers`. Nada de flechas, señales ni proyecciones.

## Herramientas de dibujo (octubre de 2026)

Barra fija encima de la gráfica (también en pantalla completa): **línea de tendencia** (arrastrar
o dos toques), **línea horizontal** (un toque, con su precio), **zona** (rectángulo: arrastrar o
dos toques), **nota de texto** (toque y escribir, 60 caracteres), **goma** (borra el dibujo que
se toque o, con teclado, cada dibujo es un botón), **deshacer** (también Ctrl+Z / ⌘Z, 30 pasos
por moneda mientras la consola está abierta), **borrar todo** (se puede deshacer) y una paleta
de 5 colores con nombre (`aria-pressed`). Botones de 32 px con `aria-label` y `title`; la barra
mide siempre lo mismo y el esqueleto de carga la reserva (sin saltos).

- **Modo dibujo explícito**: solo con una herramienta pulsada la capa SVG toma el ratón o el dedo
  (`touch-action: none`); sin herramienta no toca nada y la gráfica se arrastra y amplía como
  siempre. Tras cada dibujo se vuelve al modo normal (la goma sigue hasta salir). Escape o volver
  a pulsar la herramienta salen; Escape con herramienta no cierra la pantalla completa (salvo la
  pantalla completa nativa del navegador, que se queda la tecla). Con el foco en la gráfica,
  Intro dibuja la herramienta en las últimas velas.
- **Anclaje a datos**: cada punto es `{ time, price }`: hora en ms UTC y precio en **euros** (la
  moneda en la que llegan todos los precios de la consola, como el simulador y las alertas). El
  dólar es solo una conversión de pantalla con el mismo cambio que las velas, así que un dibujo
  queda sobre las mismas velas en EUR y en USD. La hora se convierte en índice lógico de la
  gráfica interpolando entre velas (y extrapolando fuera de ellas), por lo que el dibujo sigue en
  su sitio al ampliar, desplazar o cambiar de temporalidad.
- **Rendimiento**: un único SVG del tamaño del panel (máx. 50 dibujos); se recoloca solo cuando
  la gráfica se pinta con otra escala (una primitiva de la serie compara unas pocas coordenadas
  de referencia en cada pintado).
- **Colores**: variables `--cc-draw-*` por tema (contraste de 4,5:1 o más en claro y oscuro);
  «Neutro» es blanco en oscuro y casi negro en claro.
- **Grosor** (líneas y zonas; las notas no tienen): Fino 1 px, Normal 2 px, Grueso 4 px y Muy
  grueso 6 px, botones con `aria-pressed` y una vista previa del trazo en el color elegido. Se
  aplica a los dibujos nuevos (la consola no tiene selección de un dibujo ya hecho), se recuerda
  en el dispositivo (`mm_crypto_draw_width`) y se guarda con cada dibujo (`width`, opcional: solo
  1, 2, 4 o 6, nunca en notas; los guardados antes no lo tienen y se dibujan con el normal, así
  que las horizontales y zonas antiguas pasan de 1,5 a 2 px). Píxeles de pantalla: el zoom no lo
  cambia. La zona de acierto de la goma sigue siendo de 16 px aunque la línea sea de 1 px.
  Deshacer y la exportación de datos lo incluyen.
- **Por moneda y en el servidor**: cada moneda tiene su lista (`GET`/`PUT
/crypto/drawings/:symbol`, la lista entera; vacía borra la fila). La app pide una moneda la
  primera vez que se ve, guarda 0,6 s después de cada cambio y otra vez al salir de la página;
  gana el último guardado. Si no se pueden cargar, las herramientas quedan desactivadas (no se
  pisa lo guardado) con «Reintentar». Gratis para todos, como las capas.
- **Límites**: 50 dibujos por moneda, notas de 1 a 60 caracteres sin caracteres de control, ids
  de la app (`[\w-]{1,40}`), 1 o 2 puntos según el tipo, horas entre 2009 y 2100, precio
  positivo; `zod` estricto. Guardados: 60 por minuto y persona (lecturas aparte, 120).
- Capturas en `docs/consola-dibujo/`.

## Precio y vela en vivo (octubre de 2026)

Mientras la gráfica está en pantalla, la pestaña visible y la persona activa (sin ratón, teclado ni
toques durante 10 min se pausa: «En pausa»), la app pide cada 2 s `GET /crypto/live`: el último
precio y la vela en curso con la anterior (para ver el cierre y la apertura de la siguiente). La vela
se actualiza **en sitio** (`series.update`): ni el zoom, ni el desplazamiento, ni los dibujos se
mueven; un intervalo nuevo añade su vela. El precio de la cabecera y de la lista de la moneda activa
lo sigue (variación 24 h recalculada desde la apertura implícita; ofertas y volumen siguen siendo
los del sondeo de 30 s, que se mantiene como red de seguridad). Marca discreta «● En vivo hh:mm:ss»
junto a la cuenta atrás de la vela (no es región viva: no se lee cada 2 s).

- **Servidor**: `klines limit=2` (peso 2) por par y tamaño, caché compartida de 1,5 s (las peticiones
  concurrentes comparten la llamada), tiempo de espera 2 s, tope global de 600 llamadas/min a Binance
  (1.200 de peso de los 6.000/min por IP). Pasado el tope o con la fuente caída: el último tick o la
  cola de la serie en caché, la más reciente. Mismo tipo de cambio BCE que las velas.
- **Límites**: 60/min por persona (aparte de las 120 lecturas) y 1.200/min por red; no cuenta para
  el límite general de 300/min por IP.
- **Cliente**: una petición cada vez (la siguiente tras la respuesta), reintentos 4 s, 8 s… hasta
  30 s; descarta respuestas de otra moneda o tamaño y ticks más antiguos que la serie.
- **Coste medido** (demo, sin compresión): sondeo completo ≈78 KB cada 30 s (velas 69 KB, monedas
  5 KB, cartera 1 KB, cabeceras ~3 KB) = 156 KB y 6 peticiones/min; el vivo añade 30 peticiones y
  ≈44 KB/min (472 B de cuerpo + ~1 KB de cabeceras). Con 100 personas: +3.000 peticiones/min al
  servidor (respuestas de caché en memoria, ~2 ms), y a Binance como mucho 40 llamadas/min por
  moneda y tamaño en uso, sin depender del número de personas, con un techo de 600/min.
- **Demo** (`CRYPTO_MARKET=demo`): dos ondas rápidas (≈1 min y ≈15 s) mueven el precio; las velas
  se calculan en una rejilla fija de 60 momentos y coinciden con el tick.
- Capturas con hora en `docs/consola-vivo/` (demo y Binance real, incluido el cambio de vela de las
  11:15). e2e: `e2e/crypto-live.spec.ts` (`LIVE_SHOTS=1` guarda las capturas).

## Panel «Aprende antes de jugar»

Ya no es un modal: es un **panel desplegable** bajo la gráfica (`ui/Learn.tsx`, `css/Learn.css`)
con el título grande «Antes de empezar a jugar, aprende todo sobre el análisis de
criptomonedas». Se abre y se cierra con el botón «Aprende antes de jugar» de la barra de capas
(`aria-expanded`, `aria-controls="cc-learn"`), con su botón «Cerrar» o con **Esc** (el foco vuelve
al botón). Al abrirse se desplaza a la vista y deja el foco en el título; cerrado es `inert` y se
oculta al terminar de plegarse (animación de `grid-template-rows`, sin movimiento con «reducir
movimiento»). Los botones «Aprende todas las palabras importantes» (bajo la caja de operar y al
pie) lo abren en la pestaña de palabras.

**Pestañas** (`GUIDE_TABS` en `domain/guide.ts`, patrón de pestañas accesible con flechas, Inicio
y Fin; en el escritorio se reparten en varias líneas y en el móvil y en horizontal se deslizan):
Velas y tiempo · Medias (EMA) · Bandas y precio medio · Niveles (soportes, Fibonacci, volumen) ·
Patrones · Toros y osos, Long y Short · Órdenes (mercado, límite, stop, TP/SL) · Apalancamiento ·
Palabras de la consola · Gratis y Premium. Cada pestaña muestra sus apartados de siempre (una sola
fuente: las claves `app.crypto.guide.*` y `GUIDE_PARAGRAPHS`) en tarjetas con el dibujo SVG grande
al lado del texto (encima en el móvil). El contenido de las pestañas y sus dibujos
(`ui/GuidePanel.tsx`, `css/GuidePanel.css`) se descargan la primera vez que se abre. Las
pestañas: velas y volumen; temporalidades; EMA; Bollinger y VWAP; soportes y resistencias,
Fibonacci y perfil de volumen; patrones (doji, martillo, estrella fugaz, envolventes, doble techo
y suelo, hombro-cabeza-hombro, triángulo, bandera, cuña, rango y cruce de medias) con «Un patrón
no garantiza lo que pasará después; es solo una forma de leer el gráfico»; toros y osos, long y
short (ejemplo con números inventados y la garantía del simulador); órdenes y comisiones con take
profit y stop loss; apalancamiento (cómo funciona, por qué es peligroso y que Finanverso no lo
ofrece); **«Palabras de la consola»**: el glosario completo (`GLOSSARY_TERMS` y las claves
`app.crypto.glossary.*`) con buscador sin acentos ni mayúsculas; y la tarjeta «Gratis y Premium».
La comisión fija del 0,1 % se menciona en la guía (glosario «Comisión») y en el recuadro «Antes de abrir» de la caja de operar.

## Simulador

- **Carteras**: cada persona tiene la **cartera oficial de la temporada** (una por mes natural,
  `YYYY-MM` en hora de Madrid) y, si quiere, **carteras de prácticas** separadas. Todas empiezan
  con **10.000 € virtuales** y una **comisión fija del 0,10 %** al comprar y al vender. Ya no se
  eligen ni el saldo ni la comisión. Con **una sola cartera** se ve una etiqueta informativa
  («Temporada de X · cartera oficial», sin aspecto de botón) y el botón «Cartera de prácticas»
  con su frase (o el motivo si hoy no se puede crear); con **varias**, pestañas
  (`role=tablist/tab`, `aria-selected`).
- **Long y short a 1x**. Un short guarda su importe como **garantía**: gana si el precio baja y
  pierde si sube; si llega al **doble** de la entrada se cierra solo («garantía agotada»,
  `closeType: liquidation`). Nunca se pierde más de lo puesto.
- **Órdenes** a mercado, límite o stop para abrir long o short; **take profit y stop loss**
  opcionales (largo: TP encima y SL debajo de la entrada; corto: al revés), guardados como órdenes
  de cierre vinculadas; una orden pendiente los deja al ejecutarse. Validación en vivo («Antes de
  abrir», `aria-live`, con la comisión simulada, su porcentaje y una explicación desplegable; ver «Comisión explicada al abrir») y en el
  servidor. Las órdenes vinculadas **no caducan** ni la garantía de un short: duran lo que dure la
  posición (`findFill` recibe `Infinity` como fin); solo caducan las órdenes de entrada.
- **Ejecución determinista sin procesos en segundo plano**: al abrir o refrescar la consola (cada
  30 s a la vista) el servidor revisa órdenes y cortos con las velas desde su creación y con el
  último precio. Con hueco, al precio de apertura. Si en una vela se tocan varias salidas gana la
  más prudente: garantía agotada, stop y después límite.
- Límites por cartera: **20 órdenes pendientes en el plan gratuito y 100 con Premium** (solo
  cuentan las de entrada; el TP y el SL van con su posición, como mucho 2 por cada una de las 50),
  50 posiciones abiertas y 1.000 operaciones; las pendientes de entrada caducan a los 30 días; rate
  limit por usuario.
- **Dos operaciones por moneda, numeradas** (`MAX_PER_COIN = 2`, `freeSlot` en
  `domain/services/crypto-sim.ts`; `CryptoSimService.coinSlot`). Por cartera y moneda caben como
  mucho **2 operaciones a la vez**, sumando las posiciones abiertas y las órdenes pendientes de
  entrada (su TP y su SL no cuentan). La tercera se rechaza con **409 `CRYPTO_COIN_FULL`**
  («Ya tienes 2 operaciones de SOL: cierra o cancela una para abrir otra.», con `symbol` y
  `limit` en `details`, traducido en `app.apiError.CRYPTO_COIN_FULL`). Cada operación guarda su
  **número** (`slot`, #1 o #2): el **hueco libre más bajo** al abrirla; una pendiente se lo pasa
  a su posición al ejecutarse; al cerrarse o cancelarse el número queda libre (las cerradas lo
  conservan para el historial). La API lo devuelve en `open`, `pending` (el TP y el SL llevan el
  de su posición), `closed` y `fills`, y el límite en `limits.perCoin`. Los límites globales (50
  abiertas, 20/100 pendientes) siguen igual. Una cartera que ya tenía más de 2 de una moneda las
  conserva (como #3 y siguientes), pero no abre más de esa moneda hasta bajar de 2.

## Paneles de operaciones (Abiertas, Pendientes, Cerradas)

Código: `frontend/src/modules/crypto/ui/TradePanels.tsx` y `domain/orders.ts` (`exitResult`,
`exitProblem`); backend `CryptoSimService.setExits`.

- **Pendientes** solo muestra las **órdenes de entrada** que aún no se han ejecutado (límite o
  stop para abrir un long o un short, `positionId === null`): esperan a que el precio llegue y
  entonces pasan a «Abiertas». El TP y el SL de una posición abierta **ya no salen ahí**: el
  backend los sigue guardando como órdenes vinculadas (y la API los sigue devolviendo en
  `pending`, para las apps antiguas), pero el frontend los muestra en la tarjeta de su operación.
  El texto del panel y los «¿Qué es…?» (orden pendiente, take profit, stop loss) lo explican.
- **Una fila por operación** (Abiertas, Pendientes y Cerradas; `TradePanels.tsx`, estilos
  `.cc-table`, `.cc-trade`, `.cc-cell--*` en `Crypto.css`): rejilla con las **cabeceras de columna
  una sola vez** sobre la lista (decorativas, `aria-hidden`; cada celda lleva su propia etiqueta
  para el lector de pantalla). Abiertas: **Operación** (▲Long / ▼Short + moneda; debajo, cantidad ·
  fecha de entrada) · **Precios** (Entrada / Ahora apilados) · **Importe** (con la comisión de
  entrada pequeña) · **TP / SL** (TP en verde y SL en rojo apilados, con su distancia % en pequeño;
  «—» si no hay) · **Resultado** (neto grande en verde/rojo con su % debajo y, pequeño, «Precio ±X ·
  Comisiones −Y») · botones **Cerrar**, **Editar TP/SL** y ▾ **Detalles**. Pendientes: operación y
  tipo · Orden / Ahora · Reservado · TP / SL · Creada / Caduca · Cancelar. Cerradas: operación ·
  Entrada / Salida · Importe y comisiones · Cierre (tipo y fecha) · Resultado.
- **Detalles** (botón ▾, `aria-expanded` + `aria-controls`): abre una **segunda línea** de la fila
  con lo secundario: «Si cerraras ahora recibirías», «Se cerraría sola a» (shorts), para el TP y el
  SL puestos su distancia en palabras («(el precio debe subir/bajar)», con tooltip) y el
  **resultado si llega** (mismas cuentas que el servidor, comisión incluida, `.pnl-pos` /
  `.pnl-neg`), y el desglose del resultado. El formulario de **Editar TP/SL** también sale en una
  segunda línea. **Cerrar** mantiene la confirmación de 2 pasos («¿Seguro? Sí, cerrar», 4 s).
- **Responsive por contenedor**: con el panel de 1.100 px o menos la fila pasa a 3-4 líneas
  compactas en dos columnas (operación | resultado, precios | importe, TP/SL, botones; sin scroll
  lateral) y las etiquetas de las celdas se ven encima de cada dato.
- **Desglose del resultado** (`Breakdown` y `openBreakdown` en `domain/orders.ts`): el titular es
  el **resultado neto** con su color y, pequeño, el **resultado del precio** («Precio: +7,26 €»,
  verde o rojo) y las comisiones. En Detalles, tres filas:
  _Resultado del precio_ (lo que da solo el movimiento del precio: un long gana si sube, un short
  si baja) · _Comisiones (entrada + salida estimada)_ · _Resultado neto_ (con el %, siempre sobre
  lo pagado: importe + comisión de entrada). Siempre: neto = precio − comisión de entrada −
  comisión de salida estimada. Si el precio va a favor pero el neto es negativo sale la frase «El
  precio ya juega a tu favor, pero las comisiones aún no están cubiertas». El «Si cerraras ahora
  recibirías» = garantía (short) o valor (long) + resultado del precio − comisión de salida. El
  resumen añade una nota: «Resultado de lo que aún tienes» ya descuenta las comisiones, por eso un
  short con el precio a favor puede verse en rojo hasta cubrirlas. Revisión de cuentas (tests con
  números inventados en `crypto-sim.test.ts`, `crypto.test.ts` y `domain.test.ts`): longs y
  shorts dan el mismo resultado en espejo; no había error de cálculo, solo de presentación.
- **Distancia del TP y del SL**: en la fila, «+9,09 %»; en Detalles, «+9,09 % del precio actual»
  seguido, en gris, de «(el precio debe subir)» o «(el precio debe bajar)» (con tooltip): TP de un long y SL de un short, subir; TP de un
  short y SL de un long, bajar (`needsRise`).
- **«Editar TP/SL»** abre un formulario con las dos casillas rellenas: cambiar el precio lo mueve
  y dejarla vacía lo quita. Se comprueba en vivo contra el **precio actual** (long: TP por encima
  y SL por debajo; short: al revés; sin precio decide el servidor) y solo se envía lo que cambió.
  `PUT /crypto/sim/positions/:id/exits` con `{ takeProfit?, stopLoss? }` (número para poner o
  mover, `null` para quitar, ausente para dejarlo igual) repite la comprobación
  (`CRYPTO_TAKE_PROFIT_SIDE`, `CRYPTO_STOP_LOSS_SIDE`, `CRYPTO_PRICE_OUT_OF_RANGE`), resuelve antes
  las órdenes alcanzadas (si la posición se acaba de cerrar responde `CRYPTO_POSITION_NOT_FOUND`)
  y lo guarda todo o nada; uno sin cambios conserva su orden y su fecha.
- **«Cerrar operación»** cierra al instante a precio de mercado (último precio) con la venta a
  mercado de siempre (`POST /crypto/sim/orders` con `type: 'market'`): aplica la comisión, cancela
  sus TP/SL y la pasa a «Cerradas». Confirmación ligera de un paso: el primer toque convierte el
  botón en **«¿Seguro? Sí, cerrar»** (en rojo) durante 4 s y lo anuncia por `aria-live`; el
  segundo cierra y un `role="status"` dice «Operación de BTC cerrada al precio de mercado». Sustituye
  a «Cerrar ahora (simulado)» y a «Programar el cierre» (que hacía lo mismo que el TP/SL).
- **Paginación** en los tres paneles: 10 operaciones por página, en el cliente (el backend no
  pagina y el límite de operaciones lo permite), con «Ant. / Página X de Y / Sig.» pequeños al
  pie (`nav` con nombre por panel), solo si hay más de 10. La página se conserva al refrescar los
  datos y, si desaparecen filas, vuelve a la última que exista (`usePage`). Sustituye a «Ver más»
  de «Cerradas».
- **Lo que se quitó de la interfaz** (decisión del dueño): el selector de comisión
  (0/0,1/0,25/0,5/1 %), el selector de saldo (1.000/10.000/100.000 €) y el botón «Empezar de
  nuevo» de la cartera oficial. La tarjeta «Tu historial y ajustes» desaparece. Después se quitan
  también (y después se **recuperaron**, ver «Comisión explicada al abrir») el enlace «¿Qué es la
  comisión?» y el aviso de comisión de «Antes de abrir»; y se quitó el botón **«Exportar CSV»** gratis del historial (panel de cerradas): no hay CSV gratis en la
  pantalla. Siguen el **informe Premium de temporada** en PDF y CSV y la exportación RGPD de la
  cuenta (que incluye todo el simulador). En el backend se elimina
  `PATCH /crypto/sim/settings` y `POST /crypto/sim/reset` solo sirve para **carteras de
  prácticas**: acepta e ignora `initial` y `feeBps` que mandaban versiones anteriores de la app y,
  sin cartera de prácticas, responde `CRYPTO_SEASON_NO_RESET`.

### Comisión explicada al abrir

En «Antes de abrir», con un importe válido, se ve la línea **«Comisión simulada: 1,00 € (0,1 %) al
abrir + otra similar al cerrar (≈1,00 €)»** (en la moneda elegida) y un desplegable
**«¿Por qué hay comisión y de qué tipo es?»** (`aria-expanded`, `aria-controls`). Lo que dice
refleja el servidor (`crypto-sim.ts`: `feeCents(importe, 10 bps)` al abrir, sumada al importe;
`sale()` al cerrar, sobre el valor de la posición en ese momento, restada de lo recibido; igual para
largos y cortos; sin comisión por mantener):

- **Tipo**: comisión porcentual fija sobre cada operación, del tipo «taker» de los mercados reales.
- **Porqué**: operar tiene coste y el resultado neto lo resta; una operación debe ganar más que las
  comisiones para salir en positivo.
- **Simulada y fija**: no depende del plan y no se cobra dinero real. Ejemplo inventado con 1.000 €.
- El botón **«¿Qué es la comisión?»** vive solo dentro del desplegable y abre la guía en «Palabras».
  El glosario dice «0,1 % fijo por compra y por venta», sin elegir porcentaje.
- Al armar el botón **Cerrar**, el aviso para lectores de pantalla añade la comisión de cierre
  estimada. El porcentaje sale de `account.feeBps` (siempre 10 bps = 0,1 %).

## Temporada mensual

- Código: `backend/src/domain/services/crypto-season.ts` (reglas puras), `CryptoSimService`
  (carteras, órdenes y cierre de temporada) y `CryptoRankingService.run()` (job horario de
  `main.ts`).
- Cada temporada va del **día 1 a las 00:00** al **último día a las 23:59:59** (hora peninsular
  española, con los cambios de horario). Todo se calcula con `Europe/Madrid`, sea cual sea la zona
  horaria del servidor o de CI.
- **Cierre idempotente** de dos formas: **perezoso** (la primera vez que la persona abre la
  consola en el mes nuevo) y con el **job horario**, que cierra también a quien no vuelve. Repetir
  el job o leer a la vez no duplica nada (`UNIQUE(user_id, season)` y comprobación de
  `closed_at` dentro de la transacción).
- Al cerrar: las órdenes alcanzadas **antes de medianoche** se ejecutan solo con las velas
  anteriores al fin; el resto se **cancela** y el dinero reservado vuelve; las posiciones abiertas
  se cierran (`closeType: 'season'`, hora 23:59:59 del último día) al **cierre de la última vela
  horaria antes de medianoche** (el mismo precio para todos), si no al último precio y, si no hay
  ningún precio, se **espera hasta 24 h**; pasado ese plazo se usa el precio de entrada (solo
  pierde las comisiones).
- Se congela el **resultado** (patrimonio final, operaciones, aciertos, días con actividad (solo
  informativos),
  alias en ese momento, insignia Premium; desde octubre de 2026 todos los resultados entran en el
  ranking). Una cartera sin ninguna
  operación se cierra sin generar resultado.
- La temporada oficial **nunca se recarga a mitad de mes**: quien se queda sin saldo puede seguir
  en una cartera de prácticas hasta el día 1.
- Avisos: «Nueva temporada en X días» siempre, aviso destacado los **3 últimos días**
  (`endingSoon`) y, al empezar el mes, el **resumen de tu temporada anterior** (`season.history`,
  hasta 12 temporadas).
- **Retención**: las operaciones de una temporada terminada se guardan **12 meses** y después el
  job las borra; los resultados congelados (y el top 5) se guardan mientras exista la cuenta.

## Cartera de prácticas

- **1 a la vez en el plan gratuito** (402 `PLAN_LIMIT` si se pide otra) y **hasta 5 con
  Premium**. Siempre 10.000 € y comisión del 0,10 %.
- Separada de la temporada: **no puntúa** en el ranking ni da resultado de temporada, y sigue
  igual cuando cambia el mes.
- Se reinicia con su propio botón, dentro de su tarjeta (siempre 10.000 €). Límite anti-abuso:
  **5 creaciones o reinicios al día** por persona (día de Madrid, `CRYPTO_PRACTICE_DAILY`).
  Se puede borrar.
- Si se pide una cartera que ya no existe, la lectura muestra la oficial y las escrituras
  responden `CRYPTO_PORTFOLIO_NOT_FOUND`.

## Ranking mensual (participan todos)

- **Sin interruptor** (decisión del dueño, octubre de 2026): participan **todas las carteras
  oficiales** del mes con al menos 5 operaciones cerradas, cada una con su alias. Antes era voluntario y
  apagado por defecto; la columna `crypto_sim_profiles.ranking_opt_in` se conserva en la tabla
  (compatibilidad con servidores anteriores) pero **ya no se lee ni se escribe**, y no sale en la
  exportación.
- **Alias por defecto**: el que haya elegido la persona; si no, el **nombre de pila** del perfil
  (si es un alias válido); si no, **«Jugador» y cuatro cifras** que salen del id del usuario
  (parecen al azar pero no cambian y no dicen nada de la persona). Solo se guarda en
  `crypto_sim_profiles.alias` cuando la persona lo cambia; el resto se calcula al vuelo
  (`rankingAlias` en `domain/services/crypto-season.ts`), también al congelar el resultado.
- La persona solo puede **cambiar el alias**. Validación: 3 a 20 caracteres, letras, números,
  espacios, puntos y guiones; sin correos, enlaces, teléfonos ni palabras ofensivas básicas
  (`CRYPTO_ALIAS_INVALID`).
- **Aviso** junto al alias: «Si estás en el ranking del mes, se ve tu alias con tu
  rentabilidad y tu número de operaciones. Puedes cambiarlo cuando quieras; nunca se muestra tu
  correo ni tu nombre completo». La primera vez que se entra en la consola sale además un aviso
  descartable arriba («En el ranking del mes saldrás como «…»», con lo que hace falta para entrar,
  «Cambiar mi alias» y «Entendido»; se recuerda en el dispositivo con `mm_crypto_ranking_intro`).
- La API del ranking solo devuelve **alias, rentabilidad, nº de operaciones e insignia Premium**:
  nunca correo, nombre completo ni identificadores. Tu posición y lo que te falta solo te los
  devuelve a ti.
- Compatibilidad con versiones antiguas de la app: `PUT /crypto/ranking/settings` acepta y
  **ignora** `optIn`, y la respuesta trae siempre `settings.optIn: true` (su interruptor sale
  encendido).
- **Métrica**: rentabilidad = patrimonio final / saldo inicial − 1 (10.000 €; las posiciones
  abiertas se valoran a mercado).
- **Único requisito para entrar** (decisión del dueño, 25 de octubre de 2026): **5 operaciones
  cerradas** en el mes en la cartera oficial (sin contar las cerradas por el fin de la temporada;
  las carteras de prácticas no cuentan). Valen las cinco en un mismo día: ya **no hay mínimo de
  días con actividad** (antes eran 3). Los días se siguen contando y guardando (`activeDays`,
  `active_days` del resultado) pero no deciden nada, tampoco en los desempates.
- **Textos**: la tarjeta dice «Para entrar necesitas al menos 5 operaciones cerradas este mes en
  tu cartera oficial. Las carteras de prácticas no cuentan.» y, mientras falten, «Te faltan N
  operaciones para entrar al ranking» («Te falta 1 operación…» con una) con una barra «3 de 5
  operaciones cerradas». Quien ya tiene las 5 y aún no sale (no hay precio de mercado de lo que
  tiene abierto) lee por qué en lugar de lo que le falta. Al cerrar la quinta, la tabla en vivo se
  recalcula aunque la caché tenga menos de 60 s, para que el puesto salga a la primera.
- **Compatibilidad con apps instaladas**: la respuesta de `GET /crypto/ranking` mantiene
  `me.activeDays` (real), `me.missing.days` (siempre **0**) y `rules.minDays` (siempre **0**).
  Las apps antiguas solo añaden «N días con actividad» a lo que falta cuando `missing.days` no es
  0, así que nunca dicen «te faltan 0 días»; en sus bases (texto antiguo, empaquetado en la app)
  se lee «… y 0 días con actividad en el mes», que no exige nada. La app nueva no lee ninguno de
  los dos campos.
- **Desempates**: más operaciones; después, quien cerró antes su última operación (llegó antes a
  ese resultado); por último, una clave estable interna (nunca se muestra).
- La tabla en vivo del mes se calcula con los precios actuales y se guarda en caché **60 s**
  (cambiar el alias la borra).
- **Cierre el día 1**: cuando todas las carteras oficiales de ese mes están cerradas, se congela
  el **top 5** (una sola vez, tabla `crypto_sim_season_closes`) y el ganador recibe **30 días de
  Premium** con el mecanismo de regalo existente (`grantDays` con `afterPaidPeriod`: se suma
  después de la prueba o del periodo ya pagado; quien tiene Premium de por vida no recibe nada
  más). Se le avisa con una notificación push de servicio «Has ganado 1 mes de Premium» y en el
  resumen de su temporada.
- **Insignias** sencillas que se conservan entre temporadas: primera operación (`firstTrade`),
  primer take profit alcanzado (`firstTakeProfit`), 10 operaciones (`tenTrades`) y mes en
  positivo (`positiveMonth`).

## Invitar desde la consola

Un empujón al programa «Invita a un amigo» del menú, **sin sistema nuevo**: el mismo enlace
(`inviteLink`, `https://finanverso.app/?ref=CÓDIGO`, solo el código aleatorio, nada de la persona),
los mismos contadores y la misma recompensa, leídos de `GET /referral` (`ReferralService`).

- **Recompensa real** (la del programa, sin inventar nada): si el amigo se registra con el enlace y
  completa los primeros pasos de la app (3 movimientos, un presupuesto, una meta y una
  automatización), recibe 30 días de Premium (`rewardDays`), y quien invita suma meses según los
  amigos que lo consiguen: 1 mes con el primero, 2 con 5, 3 con 20, 4 con 40 y 5 con 50
  (`tiers`, máximo `maxRewards`). **Operar en la consola no cuenta** para la invitación, y la
  tarjeta lo dice.
- **Tarjeta «Invita a un amigo y competid»** (`ui/InvitePanel.tsx`), debajo del ranking del mes:
  la recompensa con las cifras del servidor, el enlace, «Copiar enlace», «Compartir» (Web Share;
  donde el navegador no comparte, copia) y «Tus invitaciones: completadas · en camino · meses
  conseguidos». Si el portapapeles falla, dice cómo copiarlo a mano. Si `/referral` no responde,
  no se muestra nada (no hay interruptor del programa en el servidor: se trata como apagado).
- **Aviso puntual** (no modal, no bloqueante, se cierra con «Ahora no»), tras algo bueno:
  la primera operación cerrada con resultado neto positivo (`pnl > 0`, ya con comisiones), al
  conseguir puesto en el ranking del mes (`me.place`) y con el resumen de la temporada que acaba
  de terminar (mientras ese resumen sigue sin cerrar). Reglas (`domain/invite.ts`):
  - como mucho **un aviso cada 7 días por dispositivo**; cada suceso cuenta una sola vez y, si
    llega dentro de esos 7 días, se gasta sin aviso (no vuelve más tarde con un texto viejo);
  - el aviso abierto sigue hasta cerrarlo (7 días como mucho); usar su enlace también lo da por
    visto;
  - nunca si la persona ya invitó a alguien (`qualified + pending > 0`), si `/referral` falla o
    mientras el primer aviso del ranking («Apareces en el ranking del mes…») sigue abierto, para
    no juntar dos avisos.
  - Se recuerda en `localStorage` (`mm_crypto_invite_nudge`: `at`, `done`, `open`), siempre con
    el envoltorio `storage` que nunca lanza errores.
- **Estilo**: el mismo arcoíris de «Invita a un amigo» del menú y del premio (`--rainbow-stops`)
  en el borde, moviéndose despacio; quieto con `prefers-reduced-motion` y un marco claro liso en
  Contraste. El texto va siempre sobre el color de la tarjeta.
- **Textos**: lenguaje claro, sin presión, sin lenguaje de apuesta ni promesas
  (`__tests__/crypto/wording.test.ts` lo comprueba en español e inglés).
- **Analítica** (la propia y anónima de `docs/analitica.md`, tabla `funnel_daily` de la
  migración 034): `cons_invite_view` (tarjeta vista, una vez por visita a la consola),
  `cons_invite_copy` (enlace copiado) y `cons_invite_share` (compartido de verdad; cancelar no
  cuenta). Sin el enlace, el código ni ningún dato de la persona. El aviso no tiene evento propio.

## Premium en la consola (comodidades, sin ventaja en el ranking)

Función de plan `cryptoPro`, comprobada en el servidor como las demás funciones Premium. Todos
empiezan cada mes con lo mismo y la métrica del ranking no cambia con el plan.

- **Estadísticas avanzadas** de la cartera: % de operaciones ganadas, mejor y peor operación,
  ganancia y pérdida media, **evolución diaria del patrimonio** (se guarda cada hora y al mirar) y
  **comparación con mantener** la moneda más usada desde el inicio (sin comisiones). El % de
  operaciones ganadas sigue visible gratis en el resumen, porque ya lo era.
- **Alertas de precio** por push de servicio: hasta 10 a la vez, revisadas cada 5 minutos, cada
  una se envía una vez con un texto neutro («Es solo un aviso, no una recomendación»); las
  enviadas se borran a los 30 días. Sin Premium no se envían.
- **Hasta 5 carteras de prácticas** y **100 órdenes pendientes** (20 en el gratuito).
- **Informe de temporada** en PDF y CSV (`GET /crypto/seasons/:season/report`): todas las
  operaciones cerradas, el resultado congelado y las estadísticas.
- **Insignia Premium** estética junto al alias en el ranking.

## Migración 039

- De una cuenta por usuario a **carteras** (`crypto_sim_portfolios`). Cada cuenta existente pasa
  a ser la **cartera oficial del mes en curso** (calculado en hora de Madrid al migrar), con sus
  operaciones y órdenes pendientes (`portfolio_id`).
- La comisión se **normaliza al 0,10 %** para lo que venga (las operaciones pasadas conservan la
  suya). El saldo inicial existente (por ejemplo 100.000 €) se conserva hasta el día 1 y la
  rentabilidad del ranking se mide sobre él; desde el mes siguiente todos empiezan con 10.000 €.
- Tablas nuevas: `crypto_sim_profiles` (alias elegido, contador diario de prácticas; la columna
  `ranking_opt_in` ya no se usa),
  `crypto_sim_season_results`, `crypto_sim_season_closes`, `crypto_sim_badges`,
  `crypto_sim_equity_days` y `crypto_sim_alerts`. `close_type` admite `season`.

## Migración 040

- `slot INTEGER` (nulo o mayor que 0) en `crypto_sim_positions` y `crypto_sim_orders`. Las
  operaciones en curso (posiciones abiertas y pendientes de entrada) se numeran por cartera y
  moneda en el orden en que empezaron; las cerradas y el TP/SL vinculados quedan en `NULL`.

## Migración 043

- `crypto_drawings (user_id, symbol, drawings JSON, updated_at)`, clave `(user_id, symbol)`,
  `ON DELETE CASCADE`. Aditiva.

## Persistencia y datos personales

- Todo con `ON DELETE CASCADE`: se borra con la cuenta.
- La exportación RGPD (`cryptoSimulator`) incluye `portfolios` (con operaciones, órdenes
  pendientes y patrimonio diario), `ranking` (alias elegido y contador de prácticas),
  `seasonResults`, `badges` y
  `priceAlerts`.
- Los dibujos de la gráfica salen aparte, en `cryptoDrawings` (moneda, dibujos y fecha).

## API

| Método y ruta                                                            | Qué hace                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `GET /crypto/sim?portfolio=<id>`                                         | Cartera (la oficial si falta o ya no existe), temporada, plan, insignias, estadísticas (Premium) |
| `POST /crypto/sim/orders`                                                | Comprar o vender; `portfolioId` opcional (por defecto la oficial)                                |
| `DELETE /crypto/sim/orders/:id`                                          | Cancelar una orden pendiente                                                                     |
| `PUT /crypto/sim/positions/:id/exits`                                    | Poner, mover o quitar el TP y el SL de una posición abierta (`null` quita)                       |
| `POST /crypto/sim/practice`                                              | Nueva cartera de prácticas (1 gratis, 5 Premium)                                                 |
| `POST /crypto/sim/reset`                                                 | Reiniciar una cartera de prácticas (`portfolioId`)                                               |
| `DELETE /crypto/sim/practice/:id`                                        | Borrar una cartera de prácticas                                                                  |
| `GET /crypto/ranking`                                                    | Top 5 del mes, tu posición, reglas, ganadores del mes anterior                                   |
| `PUT /crypto/ranking/settings`                                           | `{ alias }` (cambia el alias; `optIn` de apps antiguas se acepta y se ignora)                    |
| `GET /crypto/seasons/:season/report`                                     | Informe de temporada (Premium)                                                                   |
| `GET /crypto/alerts`, `POST /crypto/alerts`, `DELETE /crypto/alerts/:id` | Alertas de precio (Premium)                                                                      |
| `GET /crypto/drawings/:symbol`, `PUT /crypto/drawings/:symbol`           | Dibujos de la gráfica de una moneda (`{ drawings }`, la lista entera; gratis)                    |
| `GET /crypto/live?symbol=&interval=`                                     | Tick en vivo: último precio y vela en curso con la anterior (≈470 B; `no-store`)                 |

## Interfaz

- **Número de cada operación** (`SlotBadge` en `TradePanels.tsx`, `withSlot` y `coinSlots` en
  `domain/orders.ts`): insignia «#1» / «#2» junto a la moneda en Abiertas, Pendientes y Cerradas
  (la #2 con borde discontinuo; el lector de pantalla oye «(operación 2)»), y el número en los
  botones para lector de pantalla («Cerrar operación (Short de SOL #2)») y en los avisos de
  órdenes ejecutadas. En la **gráfica** (`chartLines`, `useCandleChart`) las líneas llevan el
  número en la etiqueta («Entrada short #1», «TP #1», «SL #1», «Pendiente long #2»); las de la #1
  son continua (entrada) y discontinuas (TP, SL, pendiente), y las de la #2 de rayas largas y
  puntos en un tono más claro (verde para el TP y rojo para el SL siempre). Las etiquetas de
  precios cercanos se separan solas (`alignLabels` de la escala de precios: la librería desplaza
  la etiqueta y su título). Debajo, la leyenda «Tus operaciones: ━ #1 ┅ #2» y, para el lector de
  pantalla, la lista de líneas de arriba abajo con su precio en la descripción de la gráfica.
  Las líneas se vuelven a dibujar al cambiar de tema. En la **caja de operar**, bajo el botón,
  «Ya tienes 1 de 2 operaciones de SOL; esta será la #2» y, con 2 de 2, el botón desactivado con
  el motivo (`aria-describedby`). Término del glosario «Operación #1 y #2».
- **Selector de carteras**: temporada oficial del mes y carteras de prácticas, con «Nueva
  cartera de prácticas»; cada cartera de prácticas tiene su botón para reiniciar y para borrar.
- **Cuenta atrás** «Nueva temporada en X días», **aviso 3 días antes** y **resumen de tu
  temporada anterior** al empezar la siguiente (con el aviso del premio si se ganó).
- Aviso **«Te has quedado sin saldo»** en la temporada, que ofrece la cartera de prácticas.
- Tarjeta **«Ranking del mes»**: podio del top 5 (medallas, alias, % en verde o rojo, nº de
  operaciones), tu posición solo visible para ti, cuenta atrás, premio que brilla con el arcoíris
  de «Invita a un amigo», ganadores del mes anterior y el alias con su aviso (sin interruptor).
- Tarjeta **«Gratis y Premium en la consola»** (dos columnas, iconos, frases cortas, por qué el
  ranking es justo y botón a Premium), accesible desde la consola y desde la guía.
- Cada función Premium bloqueada muestra una **maqueta con datos de ejemplo** y qué desbloquea,
  sin presión ni lenguaje de apuesta.

## Carga: esqueleto azul y nada a medias (octubre de 2026)

- **Primera carga** (y al volver a la consola o cambiar de cartera: pestañas de temporada y
  prácticas, crear o borrar una de prácticas): mientras falte algo del primer pintado solo se ve
  el aviso de riesgo y el **esqueleto** (`ConsoleSkeleton.tsx`, `css/Skeleton.css`): la silueta del
  panel «Gráfica de precios» con el marco, la columna de monedas con filas de contorno, la
  cabecera (icono, nombre, precio), las temporalidades y la moneda, la caja de datos del día y la
  gráfica con su rejilla y velas inventadas, más los chips de capas, «Aprende», la barra de zoom y
  las notas. Solo **contornos finos** en el azul de acento (`--accent-400`, el de los chips
  activos), sin texto ni cifras. Un brillo lento recorre los bordes (un pulso cada 1,8 s, en
  cascada por filas y chips); con «reducir movimiento» queda quieto con un azul tenue; en
  Contraste el borde es azul sólido (2 px en las cajas); con colores forzados usa `CanvasText`.
- **Qué se espera** (`useMarketReady` y `allThere` en `CryptoConsoleView.tsx`): lista de monedas
  (o su fallo: entonces la consola sigue sin lista), velas de la moneda y temporalidad elegidas,
  el chunk de la gráfica (`loadChart` en `MarketPanel.tsx`, pedido al abrir la consola y pintado
  sin `Suspense`, así la gráfica sale en el mismo pintado), cartera, ranking (o su error) e
  invitaciones. Cuando todo está, se pasa **de golpe** a la consola real; no hay «Cargando…» suelto
  ni datos parciales (`DataNotice` ya no tiene estado «Cargando precios…»).
- **Mismas medidas**: el esqueleto usa la rejilla real (`cc-market-grid`, `cc-coins`,
  `cc-market-head`, `cc-stats`) y la altura de la gráfica es una sola variable
  (`--cc-canvas-h`: 420 px, 480 px desde 1680 px, 320 px en móvil y el alto disponible en
  horizontal) que comparten la gráfica y su marco. Diferencia medida entre esqueleto y panel:
  4 px en 1440, 2 px en 390 y 4 px en 844x390 (6–8 px en Contraste). Guarda también el hueco de
  «Gira el móvil» mientras no se haya descartado. Lo que va encima del panel (nota de datos,
  temporada, resumen) aparece a la vez que él.
- **Accesibilidad**: el contenedor lleva `role="status"` y `aria-busy="true"` con el texto oculto
  «Cargando la consola…» / «Loading the console…» (`app.crypto.skeleton.label`); el dibujo es
  `aria-hidden` y no hay nada enfocable, así que no atrapa el foco. Tras cambiar de cartera el foco
  vuelve a la pestaña de la cartera elegida.
- **Errores**: si falla la primera respuesta de velas o de la cartera se muestra su mensaje con
  «Reintentar» en lugar del esqueleto; si en **20 s** (`FIRST_PAINT_MS`) no ha llegado todo, se
  muestra «No se han podido cargar los precios.» (o «No se ha podido cargar tu simulador.» si lo
  que falta es la cartera). «Reintentar» vuelve a montar la consola: pide todo otra vez y reinicia
  la espera.
- **Dentro del panel ya montado** (otra moneda, temporalidad o divisa, también en pantalla
  completa) no vuelve el esqueleto: la gráfica sigue montada y vacía y encima se pone un **velo**
  con el mismo marco azul (`cc-chart-veil`, `aria-busy` en la gráfica) hasta que llegan las
  velas, sin mezclar velas antiguas. El aviso de error de velas con «Reintentar» dentro del panel
  se mantiene.

## Móvil y accesibilidad

- 390 px sin desplazamiento lateral; en horizontal (844x390) la gráfica ocupa casi todo el alto y
  monedas, capas y pestañas de la guía pasan a filas deslizables.
- **Pantalla completa**: diálogo (`role="dialog"`, `aria-modal`, foco atrapado con Tab/Mayús+Tab,
  Esc sale y el foco vuelve al botón que la abrió). Barra superior compacta con moneda, precio y
  variación, desplegable «Cambiar de moneda», temporalidades (5 min … 1 sem.) y «€ EUR | $ USD»;
  debajo, los chips de capas; la gráfica ocupa el resto; y abajo la barra de zoom (Alejar, Acercar,
  Reciente, Todo) con el botón destacado «Salir de pantalla completa». En móvil vertical la barra
  pasa a tres filas cortas y los chips a una fila deslizable; en horizontal (844x390) la barra va
  en una fila y se oculta la línea de la vela señalada. «Aprende antes de jugar» queda oculto. La
  elección de temporalidad, moneda, moneda del mercado y capas es la misma de fuera, así que se
  conserva al salir; la gráfica sigue montada (vacía) mientras llegan las velas nuevas para no
  salir de pantalla completa al cambiar. Las líneas y etiquetas de operaciones (#1/#2) no cambian.
- «Pantalla completa» usa la Fullscreen API y `screen.orientation.lock('landscape')` cuando el
  navegador lo deja; si no (iPhone Safari, algunos WebView) la gráfica ocupa la pantalla con CSS.
  Sin plugins nuevos de Capacitor.
- Aviso único y descartable «Gira el móvil para ver mejor la gráfica» con un móvil que gira
  (respeta «reducir movimiento»), recordado en `mm_crypto_rotate_hint`.
- Gráfica con nombre y resumen para lectores de pantalla, teclado, tabla de las últimas 30 velas,
  botones de 32 px como mínimo en pantallas táctiles, temas claro y oscuro y modo Contraste.
- La librería de gráficos va en un chunk aparte fuera de la precaché offline; las pestañas de la
  guía y sus dibujos también se cargan diferidos.

## Disposición

La consola usa el mismo contenedor centrado que el resto de pantallas (unos 1.200 px, márgenes
iguales; la barra superior va a todo el ancho). La gráfica va arriba y debajo la caja de órdenes y
los paneles, a cualquier ancho; el esqueleto de carga tiene la misma disposición. Capturas en
`docs/auditoria-recorrido-2026-10-26/despues/*-consola-centrada.jpg`.

## Pruebas

Backend (dominio, mercado con `fetch` simulado, integración con mercado falso, contrato), frontend
al 100 % (`src/__tests__/crypto/*`, con un doble de Lightweight Charts) y E2E
(`frontend/e2e/crypto.spec.ts`, `CRYPTO_MARKET=demo`). Capturas de revisión en `/tmp/gf65-shots/`
y, de la escala compacta, en `/tmp/gf66-shots/` (1440, 1920, 390 vertical y 844x390; claro, oscuro
y Contraste). Chips de capas encima de la gráfica, monedas en páginas y panel «Aprende antes de
jugar» (cerrado y abierto en dos pestañas) en `/tmp/gf67-shots/` (1440, 390 y 844x390; claro,
oscuro y Contraste). Paneles con TP/SL en la tarjeta, formulario de edición y «¿Seguro? Sí,
cerrar» en `/tmp/gf69-shots/` (1280 y 390; claro, oscuro y Contraste). Filas compactas (una por
operación, con y sin Detalles) en `/tmp/gf70-shots/` (1440 y 390; claro, oscuro y Contraste).
Operaciones numeradas (#1 y #2 en filas, líneas de la gráfica con precios cercanos y aviso de la
caja de operar con 2 de 2) en `/tmp/gf71-shots/` (1440 y 390; claro, oscuro y Contraste).
Esqueleto de carga, panel real y velo de la gráfica (`*-loading`, `*-panel`, `*-veil`, más el velo
en pantalla completa) en `/tmp/gf77-shots/` (1440, 390 y 844x390; claro, oscuro y Contraste); el
E2E «shows only the blue outline of the panel until everything is there» retiene las velas y
comprueba que no asoma ninguna cifra ni «Cargando» hasta que el panel llega entero.

Fuente por moneda (USDT convertido): `backend/src/tests/infrastructure/market.test.ts` (plan de
pares, conversión y redondeo, caché por par convertida al leer, tasa de reserva de 7 días, sin
tasa no hay precio en USDT, plan configurable, aviso en el log), `integration/crypto-usdt.test.ts`
(adaptador real con HTTP simulado: precio de la lista, compra, gráfica y stop loss resuelto con
las velas convertidas, todo con los mismos euros), `adapters.test.ts` (`CRYPTO_EURO_PAIRS`),
contrato con `quote` y `market.usdPerEur`; en el frontend, nota por moneda (EUR, USD, sin tasa,
demo), tasa del servidor para los dólares y aviso de poco volumen (`chart.test.tsx`,
`domain.test.ts`), y E2E con una moneda en USDT y velas vacías. Capturas con la API real de
Binance, antes (todas en euros) y después, en `/tmp/gf74-shots/` (`before-*` y `after-*`: NEAR,
PEPE, BONK y SOL en 15 min y 1 h, DOGE y TRX en 5 min; EUR y USD).

Temporadas y ranking (datos inventados):

- `backend/src/tests/domain/crypto-season.test.ts`: inicio y fin de mes en Madrid en invierno y
  en verano (31 de octubre a las 23:00 UTC ya es noviembre), días que faltan, rentabilidad,
  mínimos, orden y desempates (rentabilidad, operaciones, quien llegó antes, clave estable),
  actividad por días de Madrid y alias (longitud, correos, enlaces, teléfonos, palabras).
- `backend/src/tests/integration/crypto-seasons.test.ts`: cierre del mes al cierre de la última
  vela horaria, pendientes canceladas con reembolso y las alcanzadas antes de medianoche
  ejecutadas, idempotencia (job varias veces y lecturas a la vez), cambio a las 00:00 de Madrid
  con el reloj del servidor en UTC, espera de precios y precio de entrada tras 24 h, carteras
  vacías, retención de 12 meses, patrimonio diario, prácticas (límites gratis/Premium, 5 al día,
  aislamiento), ranking en vivo (solo alias, sin correos ni ids), congelación del top 5, premio
  una sola vez (también tras un periodo de pago y nada extra para quien tiene Premium de por vida),
  push al ganador, Premium (estadísticas, informe, alertas) y exportación/borrado RGPD, y la
  migración 039 con datos de la 038.
- Los tests del frontend se ejecutan con `TZ=UTC` como en CI (`src/__tests__/crypto/domain.test.ts`
  depende de la zona horaria local).

## BASES DEL RANKING (propuesta pendiente de revisión legal)

Texto en lenguaje claro para mostrar en la app cuando un abogado lo revise. Los puntos marcados
«A REVISAR POR UN ABOGADO» necesitan su opinión antes de publicar.

1. **Organizador**: Finanverso (datos del titular y contacto: support@finanverso.app).
2. **Qué es**: un concurso **gratuito de habilidad** dentro de la Consola crypto, un simulador
   educativo. No hace falta comprar nada ni pagar para participar. Se usa **solo dinero
   virtual**: no se invierte, no se gana ni se pierde dinero real.
3. **Participación**: participan todas las temporadas oficiales del mes que cumplan los mínimos,
   sin tener que activar nada. Cada persona aparece con su alias y puede cambiarlo cuando quiera.
4. **Alias**: los demás solo ven tu alias, tu rentabilidad, tu número de operaciones y, si
   tienes Premium, una pequeña insignia. Nunca tu correo ni tu nombre completo. Al empezar, el
   alias es tu nombre de pila (o «Jugador» y cuatro cifras si no se puede usar). El alias no puede
   llevar correos, enlaces, teléfonos ni palabras ofensivas.
   PUNTO PARA ABOGADO: la participación es automática y el alias por defecto es el nombre de pila,
   un dato personal que se publica sin que la persona haga nada. Esto cambia la base del
   tratamiento (de consentimiento a ejecución del servicio o interés legítimo) y exige explicarlo
   con claridad en la política de privacidad (y valorar si hace falta poder salir del ranking).
   También: la insignia Premium junto al alias revela que pagas Premium. Ver
   `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`.
5. **Quién puede participar**: personas con una cuenta registrada en Finanverso.
   A REVISAR POR UN ABOGADO: edad mínima para participar y recibir el premio (la app admite
   cuentas desde 14 años) y territorialidad (si se limita a residentes en España o en la UE).
6. **Fechas**: cada mes es una temporada, del día 1 a las 00:00 al último día a las 23:59:59,
   hora peninsular española. El día 1 todas las carteras oficiales vuelven a 10.000 € virtuales,
   en el plan gratuito y en Premium.
7. **Cómo se mide**: rentabilidad = patrimonio final / 10.000 € − 1. Lo que siga abierto al final
   del mes se cierra al último precio de la última hora del mes, el mismo para todos. Las
   carteras de prácticas no cuentan.
8. **Requisito para entrar**: al menos 5 operaciones cerradas este mes en tu cartera oficial (valen
   en un mismo día; no se piden días con actividad). Las carteras de prácticas no cuentan.
9. **Empates**: gana quien hizo más operaciones; si sigue el empate, quien cerró antes su última
   operación.
10. **Premio**: quien queda primero recibe **1 mes de Premium**. No se puede cambiar por dinero
    ni por otra cosa, ni pasar a otra persona. Se suma al Premium que ya tenga (después de su
    prueba o del periodo ya pagado). Quien tiene Premium de por vida no recibe nada adicional.
    A REVISAR POR UN ABOGADO: naturaleza del premio promocional (si encaja como concurso o
    sorteo promocional, requisitos de bases, depósito o comunicación) y su fiscalidad como premio
    en especie.
11. **Aviso al ganador**: el día 1 se avisa en la propia app (resumen de la temporada) y con una
    notificación, si la tiene activada.
12. **Descalificación por abuso**: se puede excluir a quien use varias cuentas, programas o
    automatismos, alias ofensivos o que suplanten a otros, o aproveche fallos del simulador.
13. **Historial**: el top 5 de cada mes y tu resultado se guardan mientras tengas la cuenta; las
    operaciones de cada temporada, 12 meses. Todo se borra al eliminar la cuenta y va en la
    exportación de tus datos.
    A REVISAR POR UN ABOGADO: plazos de retención de resultados y del top 5 histórico.
14. **Cambios**: Finanverso puede cambiar o terminar el ranking avisando en la app; los cambios no
    afectan a una temporada ya empezada salvo por abuso o fallo técnico.
15. **Recuerda**: es un simulador educativo. Los resultados con dinero virtual no garantizan
    nada en el mercado real y no son una recomendación de inversión.
