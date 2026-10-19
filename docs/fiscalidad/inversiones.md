# Inversiones: importar archivos de brókers, exchanges y gestoras y llevarlos a la Renta

> **Aviso:** información orientativa, **no asesoramiento fiscal**. Verifica siempre en la fuente oficial. Fecha de comprobación: **19-10-2026**. Ejercicio de referencia: IRPF 2025 (modelo 100 de la Orden HAC/277/2026, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)).

Pantalla: Renta → Inmuebles y ahorro → **«Importar mis inversiones»** (`frontend/src/modules/tools/ui/renta/invest/`). La persona arrastra uno o varios archivos, la app los lee **en el dispositivo** (nada se envía a un servidor), muestra cada operación, avisa de lo raro, deja corregir y con **«Llevar a mi Renta»** rellena el detalle del ahorro del planificador (`SavingsDetail.imported`). La guía **«Cómo declarar esto»** explica paso a paso qué copiar en Renta WEB (también desde el comparador del borrador).

Código:

| Pieza | Archivo |
|---|---|
| Lectura de números, monedas y fechas | `frontend/src/modules/tools/domain/invest/text.ts` |
| Lector genérico (cabeceras, filas, patas de un libro mayor) | `domain/invest/read.ts` |
| Catálogo de formatos | `domain/invest/formats.ts` |
| Reconocimiento (secciones de IBKR, varios bloques, JSON) | `domain/invest/detect.ts` |
| Mapeo guiado de columnas | `domain/invest/mapping.ts` |
| PDF de Quantfury y certificados fiscales | `domain/invest/pdfReports.ts` |
| Tipos de cambio (BCE) | `domain/invest/fx.ts` |
| Motor fiscal | `domain/invest/ledger.ts` y `domain/rentaGains.ts` |
| Tabla para copiar e informe | `domain/invest/report.ts` |
| Guía «Cómo declarar esto» | `domain/invest/guide.ts` y `ui/renta/invest/InvestGuide.tsx` |
| Lectura de archivos, descargas (XLSX/PDF) | `application/investImport.ts` |

## 1. Formatos soportados

**Ninguna columna se ha comprobado con un archivo real actual** (el repositorio es público y los datos de prueba son inventados): todas las entradas son **NO CONFIRMADO** (`confirmed: null`) y la pantalla lo dice junto a cada archivo. Las columnas proceden de la ayuda pública de cada plataforma (enlace en `docs` de cada formato) y de su forma conocida. Si una plataforma cambia su exportación, el archivo cae en el **mapeo guiado** («¿qué columna es la fecha, el activo, la cantidad, el precio, la comisión?»), que se recuerda por cabecera.

| Plataforma | Archivo | Columnas que se usan | Notas |
|---|---|---|---|
| Binance | Historial de transacciones | `UTC_Time`, `Operation`, `Coin`, `Change` | Patas agrupadas por momento; sin precios: el precio se deduce de otra fila del día (±3 días) o se pide |
| Binance | Trade history spot | `Date(UTC)`, `Pair`, `Side`, `Executed`, `Amount`, `Fee` | «0.5BTC», «15000USDT» |
| Coinbase | Transaction history | `Timestamp`, `Transaction Type`, `Asset`, `Quantity Transacted`, `Price Currency`, `Subtotal`, `Fees and/or Spread`, `Notes` | «Convert» lee lo recibido de las notas |
| Coinbase Pro / Advanced | Fills | `product`, `side`, `created at`, `size`, `price`, `fee`, `price/fee/total unit` | |
| Kraken | Ledgers | `refid`, `time`, `type`, `subtype`, `asset`, `amount`, `fee` | Códigos XXBT/ZEUR/ETH2.S; comisión en la pata |
| Kraken | Trades | `pair`, `time`, `type`, `cost`, `fee`, `vol` | |
| Bitpanda | Historial (CSV) | `Timestamp`, `Transaction Type`, `In/Out`, `Amount Fiat`, `Fiat`, `Amount Asset`, `Asset`, `Asset class`, `Fee`, `Fee asset` | Acciones fraccionadas de Bitpanda como derivado (NO CONFIRMADO) |
| Bit2Me | Movimientos | `Fecha`, `Tipo`, `Moneda/Cantidad origen`, `Moneda/Cantidad destino`, `Comisión` | Columnas NO CONFIRMADAS (sin ayuda pública detallada) |
| Crypto.com App | Historial | `Timestamp (UTC)`, `Currency`, `Amount`, `To Currency`, `To Amount`, `Native Currency`, `Native Amount`, `Transaction Kind` | Conversiones de «polvo» (dust) se ignoran |
| Nexo | Transacciones | `Type`, `Input/Output Currency/Amount`, `USD Equivalent`, `Date / Time (UTC)` | EURX/USDX como euros/dólares |
| KuCoin | Order history (nuevo y antiguo) | `Symbol`, `Side`, `Filled Amount`, `Filled Volume`, `Fee`, `Fee Currency` | |
| Bybit | Spot trade history | `Spot Pairs`, `Direction`, `Filled Value`, `Filled Quantity`, `Fees` | Comisión en la moneda comprada (NO CONFIRMADO) |
| OKX | Trading history | `Symbol`, `Action`, `Amount`, `Filled Price`, `Fee`, `Fee Unit` | |
| Bitvavo | Historial | `Date`, `Time`, `Type`, `Currency`, `Amount`, `Received / Paid Amount`, `Fee amount` | |
| Bitstamp | Transacciones (RFC 4180 y anterior) | `Type`, `Subtype`, `Datetime`, `Amount`, `Value`, `Fee` (+ monedas) | Fechas «Jan. 05, 2021» del formato antiguo: NO SOPORTADAS |
| Gemini | Transaction history | `Date`, `Time (UTC)`, `Type`, `Symbol`, `<X> Amount <X>`, `Trading Fee (<Q>) <Q>` | |
| Ledger Live | Operaciones | `Operation Date`, `Status`, `Currency Ticker`, `Operation Type`, `Operation Amount`, `Operation Fees`, `Countervalue …` | Cartera propia: no cuenta para el 721 |
| Etherscan (MetaMask y otras) | Transacciones y transferencias ERC-20 | `Transaction Hash`, `UnixTimestamp`, `Value_IN/OUT(ETH)`, `TxnFee(ETH)`, `Historical $Price/Eth`; `TokenValue`, `TokenSymbol`, `From`, `To` | La dirección propia es la que más aparece; dos movimientos de una transacción = permuta (DeFi, NO CONFIRMADO) |
| Revolut | Extracto de cripto | `Symbol`, `Type`, `Quantity`, `Price`, `Value`, `Fees`, `Date` | |
| Revolut | Extracto anterior (cripto y materias primas) | `Type`, `Product`, `Completed Date`, `Description`, `Amount`, `Currency`, `State` | Hay que subir también el extracto en euros para emparejar el lado del dinero |
| Revolut | Extracto de acciones | `Date`, `Ticker`, `Type`, `Quantity`, `Total Amount`, `Currency` | Desdoblamientos: aviso, no se ajustan |
| Revolut | Informe de ganancias y pérdidas | `Date acquired`, `Date sold`, `Symbol`, `ISIN`, `Quantity`, `Cost basis`, `Gross proceeds`; `Gross amount`, `Withholding tax` | Se recalcula con FIFO |
| Revolut | Ahorro / fondos monetarios | `Date`, `Description`, `Value`, `Quantity of shares` | Los «intereses» de un fondo monetario se tratan como reparto del fondo, casilla 0029 (NO CONFIRMADO) |
| eToro | Extracto (Closed Positions, Dividends) | `Action`, `Long / Short`, `Amount`, `Units`, `Open/Close Date`, `Leverage`, `Profit(USD)`, `Type`, `ISIN`; `Net Dividend Received`, `Withholding Tax Amount` | CFD, apalancadas y cortas como derivados |
| Degiro | Transacciones (es/en) y Estado de cuenta | `Fecha`, `Hora`, `Producto`, `ISIN`, `Número`, `Valor`, `Costes de transacción`; `Descripción`, `Variación` | ETF por el nombre (UCITS, iShares…) |
| Interactive Brokers | Activity Statement (CSV) y Flex Query | Secciones `Trades`, `Dividends`, `Withholding Tax`, `Interest`; Flex: `TradeDate`, `AssetClass`, `Quantity`, `Proceeds`, `IBCommission`, `Buy/Sell` | Forex se ignora |
| Trading 212 | Historial | `Action`, `Time`, `ISIN`, `Ticker`, `No. of shares`, `Total`, `Withholding tax`, `Currency conversion fee` | |
| Scalable Capital | Transacciones | `date`, `status`, `assetType`, `type`, `isin`, `shares`, `amount`, `fee`, `tax` | Solo filas «Executed» |
| Lightyear | Extracto | `Date`, `Ticker`, `ISIN`, `Type`, `Quantity`, `CCY`, `Gross Amount`, `Fee`, `Tax Amt.` | |
| XTB | Operaciones de caja | `Type`, `Time`, `Comment`, `Symbol`, `Amount` | Unidades del comentario «OPEN BUY 10 @ 150»; posiciones CFD: NO SOPORTADAS |
| Freedom24 | Operaciones | `Trade date`, `Ticker`, `ISIN`, `Operation`, `Quantity`, `Amount`, `Commission` | |
| Charles Schwab | Historial (CSV y JSON) | `Date`, `Action`, `Symbol`, `Quantity`, `Fees & Comm`, `Amount` | Fechas mes/día/año; RSU y planes de empleados: NO SOPORTADOS |
| Fidelity | Historial | `Run Date`, `Action`, `Symbol`, `Quantity`, `Amount ($)` | |
| Quantfury | Informe del historial de trading (PDF) | Filas de cada posición y su «Total ±X» | Ver §3; validado solo con un informe inventado |
| MyInvestor, Indexa, Finizens, Renta 4, Openbank, BBVA, Santander, CaixaBank, ING, Inversis, Trade Republic | Movimientos de fondos y valores (Excel/CSV) | `Fecha`, `Fondo/Producto`, `ISIN`, `Tipo de operación`, `Participaciones`, `Importe`, `Retención`, `Coste fiscal`, `Fecha de adquisición` | Un solo lector con los nombres habituales: NO CONFIRMADO por entidad |
| Certificados fiscales (PDF) | Información fiscal, certificado de retenciones | Líneas con «Intereses», «Dividendos», «Retenciones», «Ganancia/Pérdida patrimonial», «Valor de transmisión/adquisición», «Gastos de custodia» | La persona marca cada línea antes de llevarla |

**No soportado:** `.xls` y `.ods` antiguos (se pide guardarlos como .xlsx o .csv), PDF escaneados sin texto, el «Binance Tax Report», PDF de Trade Republic, posiciones CFD de XTB, préstamos y liquidaciones de Nexo, opciones y futuros con su liquidación diaria, NFTs (se tratan como «otro activo» si se mapean a mano), precios de mercado en línea (decisión del dueño, §6).

## 2. Reglas fiscales aplicadas

| Regla | Fuente | Cómo |
|---|---|---|
| Cada venta, y cada **permuta** de una cripto por otra, es una transmisión | LIRPF arts. 33.1 y 37.1.h; [ayuda Renta 2025 de monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html) | Valor de transmisión = el **mayor** de los valores de mercado de lo entregado y lo recibido; ese valor es el coste de lo recibido |
| **FIFO** por activo homogéneo | Art. 37.2; la ayuda de la AEAT lo aplica a las monedas compradas en «distintas casas de cambio» | Una cola por activo para **todas** las plataformas (ISIN en valores, símbolo en cripto) |
| Comisiones | Art. 35.1.b y 35.2 | Suben el coste de la compra y bajan el valor de la venta; en la moneda comprada, bajan las unidades |
| Transferencias entre carteras propias | No hay transmisión | Se emparejan (misma moneda, ±2 %, 10 días); las sueltas se avisan (un pago o una donación sí tributa) |
| Comisión pagada en monedas (red, BNB) | NO CONFIRMADO | Las monedas salen sin calcular ganancia |
| Staking y lending | DGT V1766-22, V0648-24, V0612-26 (capital mobiliario por cesión de capitales, art. 25.2); base del ahorro (art. 46.a) | Valor de mercado del día de cobro; casilla 0027 **NO CONFIRMADA** (la DGT no dice la casilla) |
| Airdrops, cashback en cripto, «learn», invitaciones | NO CONFIRMADO (sin criterio único de la DGT) | Ganancia que no deriva de una transmisión (art. 33.1), base general (art. 45), casilla 0304 |
| Hard fork | NO CONFIRMADO | Coste cero, sin renta al recibirlas |
| Minería y trading organizado | Actividad económica | Fuera del ahorro, aviso para declararlo en Autónomos |
| DeFi (pools, wrapping, staking en contrato) | NO CONFIRMADO | Como permuta; aviso |
| Plataforma quebrada o monedas perdidas | Manual Renta 2025 (art. 14.2.k): no es pérdida automática | Aviso; la pérdida va a la base general solo en los supuestos de la ley |
| **Traspasos entre fondos** | Art. 94.1.a | Sin tributar; las nuevas participaciones conservan coste y fechas; no vale para ETF (aviso) |
| **Regla antiaplicación de pérdidas** | Art. 33.5.f (dos meses, valores cotizados) y 33.5.g (un año, no cotizados) | Acciones y ETF: 2 meses; **fondos: 1 año** (participaciones no admitidas a negociación); cripto: solo aviso (NO CONFIRMADO) |
| Letras del Tesoro y bonos | Art. 25.2.b | Rendimiento del capital (casilla 0031) con FIFO |
| Derivados, CFD, posiciones apalancadas | Arts. 46.b y 49 (NO CONFIRMADO) | Una ganancia o pérdida por posición, del año del cierre, en la base del ahorro |
| Dividendos e intereses | Casillas 0029 y 0027; retenciones españolas 0597; de fondos 0603 | Retención en origen como impuesto extranjero |
| Doble imposición internacional | Art. 80; casilla 0588 | La menor de lo pagado fuera y el tipo medio efectivo del ahorro sobre esa renta (la cuota líquida del ahorro en la parte que dejan las deducciones). El límite del convenio (a menudo el 15 %) se avisa, no se aplica por país |
| Gastos de custodia | Art. 26.1.a; casilla 0037 | Solo los de administración y depósito |
| Divisas | Art. 35 (valor de cada operación en su día) | Tipo del BCE del día (o del último publicado); la persona carga el archivo `eurofxref-hist` del BCE o teclea un tipo. Stablecoins como 1 $ o 1 € (aviso) |
| Compensación | Art. 49 | La hace `rentaGains.savingsOf` (25 % cruzado, 4 años) |
| Modelos 721 y 720 | Orden HFP/886/2023 (721) y Orden HAP/72/2013 (720) | Aviso cuando lo guardado en el extranjero (último precio de los archivos, no el de 31-12) supera 50.000 €. Carteras propias y entidades españolas no cuentan |
| Años anteriores | LGT art. 66 (4 años) | Resultados de cada año encontrados en los archivos; aviso de que debían declararse en su año y de que solo se compensan pérdidas declaradas |

Apartados del modelo 100 de 2025 (impreso del BOE, `renta-casillas.json`): IIC 0310-0325 (fondos y ETF), acciones negociadas 0326-0340, monedas virtuales 1800-1814 (1802 denominación, 1803 clave de contraprestación, 1804 transmisión, 1806 adquisición, 1807-1814), otros elementos patrimoniales 1624-1640 (derivados y oro: NO CONFIRMADO). Claves de la casilla 1803: **F** moneda de curso legal, **N** otra moneda virtual (fuente secundaria: **NO CONFIRMADO**, hay que mirar el desplegable de Renta WEB).

## 3. Quantfury

El informe PDF «Informe del historial de trading» trae las **posiciones cerradas** en dos secciones («Acciones y ETFs» y «Pares de criptomonedas»). Cada posición son varias filas (`COMPRAR (abrir)`, `VENDER (abrir)` en cortas, `COMPRAR (añadir)`, `VENDER (reducir)`, cierre) y termina con «Total ±X», que es su resultado. La cuenta es apalancada en un bróker de Bahamas: cada posición se trata como **derivado** (ganancia o pérdida de la base del ahorro, NO CONFIRMADO), del año de la fecha de **cierre**, en dólares (acciones) o USDT (cripto, valorado como dólar), con el tipo del BCE del día del cierre. Las posiciones abiertas no vienen en el informe. Se avisa de los años anteriores (debían declararse en su año y solo se compensan pérdidas declaradas) y del 721.

El lector se escribió a partir de la estructura que describió el dueño; **no se pudo validar con su informe real** (lectura denegada por el sistema de permisos al llevar datos personales). Está probado con líneas inventadas y con un PDF inventado del mismo formato (persona p4-115). En ese PDF de prueba el signo ₮ se escribe «USDT» porque las fuentes estándar del PDF no lo tienen; el lector acepta las dos formas.

## 4. Lo que la persona ve

- Tabla de operaciones con euros, tipo de activo y «Cuenta» editables, y filas sin precio resaltadas.
- Avisos en palabras sencillas: ventas sin compra («faltan compras de años anteriores»), activos sin precio, tipos de cambio que faltan, transferencias sin pareja, permutas DeFi, recompras, 720/721, años anteriores.
- «Añadir una compra o venta que no está en los archivos».
- Casilla «Hago esto como actividad económica».
- Tabla «Lo que tienes que copiar en tu Renta» con el número de casilla de cada columna, agrupada como Renta WEB: por fondo, por emisor, por moneda y clave.
- Informe descargable en Excel y PDF: ventas con las compras usadas (auditoría FIFO), rendimientos, posiciones cerradas y resultado por año.
- «Llevar a mi Renta» y, en el detalle del ahorro, «Quitar lo importado».
- Guía «Cómo declarar esto» (§5).

## 5. Guía «Cómo declarar esto»

Pasos (solo los que aplican a lo importado; todos si no hay nada): papeles; borrador y datos fiscales; fondos y ETF; traspasos que no se declaran; acciones; criptomonedas (qué pide Renta WEB: denominación, clave, valores; no hay forma oficial de importar un fichero de ganancias, **NO CONFIRMADO**); derivados y otros; intereses, dividendos y staking; airdrops y recompensas; impuesto pagado fuera; pérdidas de este año y de años anteriores; ventas de años anteriores; modelo 721 (1 de enero a 31 de marzo del año siguiente, informativo, solo custodios extranjeros); modelo 720; si se hace como negocio; plazos de la campaña; autoliquidación rectificativa; qué guardar 4 años (LGT art. 66); revisión con un gestor colegiado. Cada paso cita su fuente.

## 6. NO CONFIRMADOS y decisiones para el dueño

1. **Columnas de cada plataforma**: ninguna comprobada con una exportación real actual. Propuesta: que el dueño (o usuarios beta) exporte un archivo de cada plataforma que use, se compruebe en local y se marque `confirmed` con la fecha. No subir nunca esos archivos al repositorio.
2. **Precios de mercado**: los libros mayores (Binance, Kraken, Etherscan) no traen euros. Hoy se deduce el precio de otra fila del día o se pide a la persona. Consultar una API pública de precios (CoinGecko u otra) enviaría a un tercero qué monedas y qué días: rompe «nada sale del dispositivo». Decidir si se ofrece como opción explícita.
3. **Tipos de cambio del BCE**: no se incluyen en la app; la persona descarga `eurofxref-hist` del BCE. Alternativa: un script del dueño que lo descargue y lo versione en `data/` por ejercicio.
4. **FIFO global frente a FIFO por bróker** en valores: se aplica global por ISIN (art. 37.2 habla de valores homogéneos, no de cuentas); el encargo pedía «por activo y por cuenta». Confirmar con un gestor; el informe muestra la plataforma de cada operación.
5. **Staking en la casilla 0027, airdrops/cashback en la 0304, derivados en 1624-1640, clave F/N de la 1803, intereses de fondos monetarios de Revolut en la 0029**: criterios razonados, no confirmados en fuente oficial.
6. **Regla de un año a los fondos** (art. 33.5.g): aplicada por el texto literal de la ley; antes la app solo avisaba.
7. **Límite del convenio** en la deducción 0588: no se aplica por país; se avisa del 15 % habitual.
8. **Quantfury**: validar con el informe real del dueño en local (la lectura del agente fue denegada).
9. **Trading profesional**: hoy solo aparta recompensas y derivados del ahorro; falta llevarlo como actividad económica al motor de Autónomos.
10. **Modelo 100 «informativo» de monedas virtuales**: no se encontró en el impreso de 2025 un apartado informativo de saldos distinto de las casillas 1800-1814 (NO CONFIRMADO).

## 6 bis. Resumen, pérdidas de otros años y validación local (19-10-2026)

- **Panel de resumen** al final de «Mis inversiones»: resultado por año (el de esta Renta destacado; los demás «es de otro año»), por tipo y «Lo que supone en tu Renta» (el motor con y sin lo importado). En el resultado (paso 9 y modo experto): sueldo bruto como en Renta WEB (0003, 0012, 0013, 0019), ganancias y pérdidas de inversiones, intereses y dividendos, y explicación de las pérdidas del año.
- **«Pasar a pérdidas pendientes de compensar»**: lleva las pérdidas de años anteriores halladas en los archivos (las que aún están en plazo) a las pérdidas pendientes del planificador, solo tras confirmar la persona que las incluyó en la declaración de ese año.
- **«¿Puedo recuperar ese dinero?»** (`domain/invest/recover.ts`): por cada año con pérdidas, compensación hasta la Renta del año + 4 (LIRPF art. 49) con lo que mejora esta Renta según el motor; autoliquidación rectificativa de ese año (LGT art. 120.3) hasta cuatro años después del fin de su plazo de presentación (LGT arts. 66 y 67; fecha de `rentaCampaign.ts`), con el máximo que podría devolver (escala del ahorro de esta Renta sobre la pérdida: es un tope, depende de las ganancias que hubiera aquel año); si prescribió, se dice. Si no estaba obligado a declarar: declaración fuera de plazo (LGT art. 122); no se encontró consulta de la DGT ni resolución del TEAC para ese caso, y así se dice al usuario recomendando hablarlo con un gestor (seguimiento interno: NO CONFIRMADO).
- **Posicionamiento**: los textos dicen que Finanverso prepara datos y cálculos y no presenta ni representa; la revisión por un gestor colegiado se recomienda.
- **Validación con archivos reales** (sin subir nada): `cd frontend && npm run validar-archivo -- <ruta>`. Lee CSV, XLSX, JSON o PDF con el mismo importador (y los tipos del BCE de `public/ecb-rates.json`) y muestra solo el formato detectado, operaciones por tipo y clase, resultado por año, avisos y las columnas de lo no reconocido. Nunca imprime nombres, identificadores ni filas. Lógica en `domain/invest/validate.ts`.

## 7. Pruebas

- `frontend/src/__tests__/tools/invest/`: un archivo inventado por plataforma (`formats.test.ts`), el motor con cifras a mano (`ledger.test.ts`), lectores, mapeo, PDF, informe y guía (`readers.test.ts`), lectura de archivos y descargas (`investImport.test.ts`) y la pantalla (`investImportUi.test.tsx`).
- Banco de casos: 10 personas inventadas **p4-109 a p4-118** en `docs/casos-practicos/personas/` con sus archivos de ejemplo de Binance, Ledger Live, Coinbase, Kraken, Revolut, Degiro, una gestora española, un banco, Quantfury (PDF), eToro (Excel), Bitpanda, Crypto.com, Interactive Brokers y Trading 212. `casosRenta.test.ts` compara sus casillas con el cálculo a mano y `casosInversiones.test.ts` vuelve a leer los archivos del disco. Se regeneran con `node scripts/casos/run-personas4.mjs` (desde `frontend/`), que también deja una copia privada en `~/Downloads/pruebas finanverso/personas/109 - …` con su LEEME.txt.
