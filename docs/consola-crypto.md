# Consola crypto

Sección del menú **Aprender** para aprender a comprar y vender criptomonedas con **dinero
ficticio** y ver si se habría ganado o perdido. Es un simulador educativo: nunca opera con dinero
real, no da señales, predicciones ni recomendaciones y no enlaza a exchanges ni a afiliados.
Disponible en todos los planes.

## Qué se copió del proyecto de cripto del dueño (solo conceptos)

Del frontend del proyecto privado de cripto se tomaron **ideas de interfaz**, no código del motor:

- La gráfica de velas con **TradingView Lightweight Charts** (la misma librería, v5.2.1): velas y
  volumen, marcos de 5 min, 15 min, 30 min, 1 h, 4 h, 1 día y 1 semana, arrastrar para moverse,
  rueda o pellizco para ampliar, «Lo más reciente», «Ver todo», pantalla completa, lectura de
  apertura/máximo/mínimo/cierre/volumen de la vela señalada, cambio del periodo visible y líneas de
  precio de las posiciones y órdenes.
- El selector de moneda con las principales monedas.
- Los paneles de operaciones **abiertas**, **pendientes** (órdenes límite) y **cerradas**, con la
  idea de cerrar al momento o con una orden programada (allí, TP/SL).

## Qué se dejó fuera a propósito

- Todo el motor de estrategias y el trading automático: señales, «campeones», puntuaciones,
  admisión, indicadores de estrategia (Bollinger, estocástico, perfil de volumen, FVG, order
  blocks, patrones), la proyección «sombra», el botón «Sugerir TP/SL» y la autopsia de pérdidas.
  Son señales o predicciones, que esta sección no puede dar.
- Carteras y ejecución reales (Solana/Phantom, Jupiter, Hyperliquid), WebSocket directo a
  Binance desde el navegador, claves, `.env`, datos y configuración privada.
- **Ventas en corto y apalancamiento.** El proyecto original las tiene (en simulación), pero
  añadirían liquidaciones, préstamos y costes por hora difíciles de explicar a personas mayores.
  Queda solo **spot**: comprar y después vender. Si se quieren, hay que diseñar antes los avisos.

## Datos de mercado

- **Fuente**: datos públicos de Binance, sin clave ni cuenta. Primero
  `https://data-api.binance.vision/api/v3` (el host para datos públicos) y, si falla,
  `https://api.binance.com/api/v3`. Todas las monedas tienen **par real en EUR**, así que no hay
  conversión de divisas.
- **Monedas** (20): BTC, ETH, BNB, XRP, SOL, ADA, DOGE, TRX, LINK, DOT, LTC, BCH, AVAX, XLM, SHIB,
  ATOM, NEAR, SUI, APT y POL (`backend/src/domain/services/crypto-market.ts`).
- **Proxy en el backend** (`/api/crypto/coins` y `/api/crypto/candles`, con sesión): el navegador
  nunca llama a terceros (la CSP `connect-src` no cambia). Caché compartida por moneda y marco:
  15 s para el último precio y de 15 s a 10 min para las velas según el marco; una sola petición
  aunque muchas pantallas pidan a la vez. Se guardan 1.000 velas por serie (500 van a la gráfica).
- **Tolerancia a fallos**: si la fuente cae se sirve la última copia (hasta 6 h) marcada
  «con retraso»; sin copia, 503 `MARKET_UNAVAILABLE` y la pantalla lo explica con «Reintentar».
  Siempre se muestra «Datos con retraso y solo orientativos» y la hora de la última actualización.
- **Demo**: `CRYPTO_MARKET=demo` inventa precios suaves y deterministas en el servidor para
  desarrollo y E2E (sin Internet). En producción se fuerza siempre la fuente real.
- **Límites de uso**: Binance permite 6.000 de peso por minuto e IP; con la caché, como mucho unas
  pocas peticiones por minuto. El API limita a 120 lecturas y 30 acciones por minuto y usuario.

## Simulador

- **Cartera por usuario** (la persona que ha iniciado sesión, también dentro de un hogar):
  10.000 € ficticios al empezar; «Empezar de nuevo» con 1.000, 10.000 o 100.000 €.
- **Órdenes manuales**: compra a mercado (al último precio) o pendiente **límite** (si el precio
  baja hasta X) o **stop** (cuando sube hasta X); venta de cada compra a mercado o programada,
  límite (si sube a X) o stop (si baja a X). El importe de una compra pendiente (más comisión)
  queda **reservado** hasta que se ejecuta, se cancela o caduca (30 días).
- **Ejecución determinista, sin procesos en segundo plano**: cada vez que se abre o se refresca la
  consola (cada 30 s mientras está a la vista) el servidor revisa las órdenes pendientes con las
  velas desde que se crearon, en el marco más fino que llega hasta esa fecha (1 min, 5 min, 15 min
  o 1 h), y después con el último precio. Una orden se ejecuta a su precio o, si la vela abre ya
  más allá (hueco), al precio de apertura. Si el stop y el límite de una misma compra se alcanzan
  en la misma vela, gana el stop (lo prudente). La vela en la que se creó la orden no cuenta.
- **Comisión simulada** configurable (0 %, 0,1 %, 0,25 %, 0,5 % o 1 %), cobrada al comprar y al
  vender y mostrada en cada paso.
- **Resultados**: abiertas con ganancia o pérdida **no realizada** en € y % (ya con la comisión de
  venta), cerradas con el resultado **realizado**, resumen (valor total, realizado, no realizado,
  operaciones, % de aciertos) e historial en **CSV** con `ExportButtons` (`exportRowsCSV`).
- **Límites**: 20 órdenes pendientes, 50 compras abiertas y 1.000 operaciones guardadas por
  usuario (después hay que descargar el CSV y empezar de nuevo).
- **Persistencia**: migración `037` (`crypto_sim_accounts`, `crypto_sim_positions`,
  `crypto_sim_orders`), todo con `ON DELETE CASCADE` desde `users`; sección `cryptoSimulator` en
  la exportación RGPD. Validación zod estricta en `backend/src/infrastructure/http/schemas.ts`.

## Interfaz y accesibilidad

- Aviso fijo, sin botón de cerrar: «Simulador educativo con dinero ficticio. No es asesoramiento
  financiero ni una recomendación de inversión. Rentabilidades pasadas no garantizan
  rentabilidades futuras. Invertir en criptoactivos conlleva riesgo de perder todo lo invertido».
- Botones «¿Qué es…?» junto a cada concepto y un glosario al final. Textos neutros, comprobados por
  `frontend/src/__tests__/crypto/wording.test.ts`.
- La gráfica es un elemento con nombre y un resumen en texto para lectores de pantalla, se maneja
  con teclado (flechas, + y −, Inicio, Fin) y botones, y tiene una **tabla** con las últimas 30
  velas. Botones de al menos 48 px, móvil de 390 px sin desplazamiento lateral, temas claro y
  oscuro y modo contraste (`html.wiz-contrast`). En el móvil, deslizar en vertical sobre la gráfica
  mueve la página.
- La librería de gráficos va en un **chunk aparte** (`PriceChart-*.js`, ~57 KB gzip) que solo se
  descarga al abrir la consola y queda fuera de la precaché offline.
- **Atribución** (licencia Apache 2.0 de TradingView): logo de TradingView en la gráfica y texto
  «Gráfica dibujada con TradingView Lightweight Charts™ · Copyright © 2025 TradingView, Inc.» con
  enlace a https://www.tradingview.com/.

## Pruebas

- Backend: `src/tests/domain/crypto-sim.test.ts`, `src/tests/infrastructure/market.test.ts`
  (con `fetch` simulado) y `src/tests/integration/crypto.test.ts` (mercado falso
  `FakeCryptoMarket`, límites, aislamiento entre usuarios, exportación y borrado).
- Contrato: `cryptoCoins`, `cryptoCandles`, `cryptoSim`, `cryptoSimFilled` y las peticiones
  `crypto*` de `requests.json`.
- Frontend: `src/__tests__/crypto/*` con un doble de Lightweight Charts
  (`src/__mocks__/lightweightCharts.ts`).
- E2E: `frontend/e2e/crypto.spec.ts`, con `CRYPTO_MARKET=demo` (sin Internet).

## Propuestas para el dueño (no aplicadas)

- **Premium**: todo es gratis. Candidatos si se quiere: varias carteras a la vez, historial de más
  de 1.000 operaciones o de más de un año, más monedas, comisiones a medida o un informe en PDF.
- Textos legales: ver los puntos 31-39 de `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`.
