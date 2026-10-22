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
- La disposición: columna de monedas con icono, nombre, par y páginas «Ant./Sig.»; cabecera con la
  moneda y el precio grande, cambio del periodo visible, caja con mejor oferta de compra y venta
  (bid/ask), volumen de 24 h y hora de actualización; temporalidades arriba; cuenta atrás del
  cierre de la vela; botones-chip para las capas.
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

## Datos de mercado

- **Fuente**: datos públicos de Binance, sin clave ni cuenta (`data-api.binance.vision` y, si
  falla, `api.binance.com`). Las 20 monedas tienen **par real en EUR**: no hay conversión.
- **Proxy en el backend** (`/api/crypto/coins` y `/api/crypto/candles`, con sesión): el navegador
  nunca llama a terceros (la CSP no cambia). Caché compartida de 15 s a 10 min según el marco, una
  sola petición aunque muchas pantallas pidan a la vez; 1.000 velas por serie, 500 a la gráfica.
  `/crypto/coins` incluye **bid, ask y volumen de 24 h en euros** del ticker público.
- Si la fuente cae se sirve la última copia (hasta 6 h) marcada «con retraso»; sin copia, 503
  `MARKET_UNAVAILABLE` y la pantalla lo explica con «Reintentar».
- `CRYPTO_MARKET=demo` inventa precios suaves y deterministas para desarrollo y E2E (sin
  Internet). En producción se fuerza la fuente real.

## Moneda de visualización (EUR / USD)

- Control «€ EUR | $ USD» junto a las temporalidades. El simulador **sigue en euros**; los dólares
  son una **conversión de visualización** con el cambio del BCE del día (el `/api/rates` que ya usa
  la app), con el aviso «Conversión informativa al cambio del BCE de hoy; el simulador usa euros».
  Sin cambio disponible se muestra en euros con un aviso.
- Todo pasa por `frontend/src/modules/crypto/domain/currency.ts` y `format.ts`: precios, gráfica y
  capas (se convierten las velas), cabecera, bid/ask, volumen, monedas, caja de operar, cartera,
  paneles e historial CSV (cabeceras con € o $). Lo tecleado en dólares se pasa a euros antes de
  enviarlo (importes al céntimo, precios sin redondear), con tests de ida y vuelta.
- Preferencia por dispositivo en `mm_crypto_currency`; la primera vez, la moneda de la app.

## Capas de la gráfica (solo visualización didáctica)

Funciones puras (`domain/indicators.ts` y `domain/layers.ts`) sobre las velas cargadas: **EMA 20,
50 y 200**, **Bandas de Bollinger (20, 2)**, **VWAP** (desde la primera vela cargada), **perfil de
volumen** (POC, VAH y VAL de las velas en pantalla, zona de valor del 70 %), **soportes y
resistencias** (giros con 3 velas a cada lado, agrupados al 0,5 %, hasta 3 de cada) y
**Fibonacci** (0 a 100 % del último tramo alto-bajo visible). Cada capa: botón con
`aria-pressed`, color, leyenda con su valor, «?» que abre la guía en su apartado y preferencia en
`mm_crypto_layers`. Nada de flechas, señales ni proyecciones.

## Guía «¿Qué es cada cosa?»

Modal accesible (diálogo, foco atrapado, Esc, clic fuera, botón grande de cerrar, desplazable, a
pantalla completa en el móvil), cargado aparte con sus dibujos SVG propios: velas y volumen;
temporalidades; toros y osos, long y short (ejemplo con números inventados y la garantía del
simulador); órdenes y comisiones; take profit y stop loss para largo y corto; apalancamiento (cómo
funciona, por qué es peligroso y que Finanverso no lo ofrece); EMA; Bollinger; VWAP; perfil de
volumen; soportes y resistencias; Fibonacci; y patrones (doji, martillo, estrella fugaz,
envolventes, doble techo y suelo, hombro-cabeza-hombro, triángulo, bandera, cuña, rango y cruce de
medias) con «Un patrón no garantiza lo que pasará después; es solo una forma de leer el gráfico».

## Simulador

- **Cartera por usuario**, 10.000 € ficticios al empezar; «Empezar de nuevo» con 1.000, 10.000 o
  100.000 €, gratis.
- **Long y short a 1x**. Un short guarda su importe como **garantía**: gana si el precio baja y
  pierde si sube; si llega al **doble** de la entrada se cierra solo («garantía agotada»,
  `closeType: liquidation`). Nunca se pierde más de lo puesto.
- **Órdenes** a mercado, límite o stop para abrir long o short; **take profit y stop loss**
  opcionales (largo: TP encima y SL debajo de la entrada; corto: al revés), guardados como órdenes
  de cierre vinculadas; una orden pendiente los deja al ejecutarse. Validación en vivo («Antes de
  abrir», `aria-live`) y en el servidor.
- **Ejecución determinista sin procesos en segundo plano**: al abrir o refrescar la consola (cada
  30 s a la vista) el servidor revisa órdenes y cortos con las velas desde su creación y con el
  último precio. Con hueco, al precio de apertura. Si en una vela se tocan varias salidas gana la
  más prudente: garantía agotada, stop y después límite.
- Comisión 0-1 %; límites de 20 pendientes, 50 abiertas y 1.000 operaciones; pendientes caducan a
  los 30 días; rate limit por usuario.
- **Persistencia**: migraciones `037` y `038` (dirección, TP/SL de las pendientes,
  `liquidation`), con `ON DELETE CASCADE` y en la exportación RGPD (`cryptoSimulator`).

## Móvil y accesibilidad

- 390 px sin desplazamiento lateral; en horizontal (844x390) la gráfica ocupa casi todo el alto y
  monedas y capas pasan a filas deslizables.
- «Pantalla completa» usa la Fullscreen API y `screen.orientation.lock('landscape')` cuando el
  navegador lo deja; si no (iPhone Safari, algunos WebView) la gráfica ocupa la pantalla con CSS.
  Sin plugins nuevos de Capacitor.
- Aviso único y descartable «Gira el móvil para ver mejor la gráfica» con un móvil que gira
  (respeta «reducir movimiento»), recordado en `mm_crypto_rotate_hint`.
- Gráfica con nombre y resumen para lectores de pantalla, teclado, tabla de las últimas 30 velas,
  botones de 44-56 px, temas claro y oscuro y modo Contraste.
- La librería de gráficos va en un chunk aparte fuera de la precaché offline; la guía y sus
  dibujos también se cargan diferidos.

## Pruebas

Backend (dominio, mercado con `fetch` simulado, integración con mercado falso, contrato), frontend
al 100 % (`src/__tests__/crypto/*`, con un doble de Lightweight Charts) y E2E
(`frontend/e2e/crypto.spec.ts`, `CRYPTO_MARKET=demo`). Capturas de revisión en `/tmp/gf65-shots/`.

## Pendiente (aprobado por el dueño, para la siguiente entrega)

1. **Temporada mensual**: el día 1 (hora de Madrid, job horario idempotente de `main.ts`) se
   congela el resultado, se cierran posiciones a último precio, se cancelan pendientes y todos
   vuelven a 10.000 €; historial marcado con su mes; avisos «Nueva temporada en X días», aviso 3
   días antes y resumen de la temporada anterior. La temporada oficial no se recarga nunca.
2. **Ranking mensual** voluntario (alias editable, nunca el correo), rentabilidad sobre 10.000 €,
   mínimos (≥5 operaciones cerradas, ≥3 días con actividad), desempates, top 5 en histórico y 1 mes
   de Premium al ganador (aviso in-app y push de servicio); insignias ligeras; bases del ranking.
3. **Cartera de prácticas** gratuita (separada, no puntúa, reiniciable con límites) para quien se
   quede sin saldo.
4. **Premium sin ventaja en el ranking**: estadísticas avanzadas, alertas de precio (push), hasta 5
   carteras de prácticas, 100 órdenes pendientes, informe de temporada en PDF/CSV completo,
   insignia estética; tarjeta «Gratis y Premium en la consola» con vistas previas.

La recarga Premium a mitad de mes que se llegó a programar se **retiró** al cambiar la decisión.
