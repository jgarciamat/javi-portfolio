# Deuda pública española en «Aprende a invertir»: fuentes y decisiones

Documento interno. Respaldo de los capítulos de deuda pública del curso (texto servido por la API
en `backend/src/infrastructure/learn/chaptersTreasury.ts`; catálogo en
`frontend/src/modules/invest/domain/premiumChapters.ts`), de la calculadora «Letra del Tesoro»
(`frontend/src/modules/invest/domain/treasury.ts`), de la ficha «Renta fija» del mapa
(`assetClassesA.ts`) y de las guías públicas `/guias/como-comprar-letras-del-tesoro` y
`/guias/letras-del-tesoro-renta` (`guidesDeudaPublica.ts`).

Fuentes consultadas el **20 de octubre de 2026**.

## Capítulos

| id | Título | Nivel | Acceso | Calculadora / gráfico | Vídeo |
|---|---|---|---|---|---|
| `letras-del-tesoro` | Letras del Tesoro: qué son y cómo funcionan | Para empezar | Premium | `letra` | 39 |
| `bonos-obligaciones-estado` | Bonos y Obligaciones del Estado: cupones, precio y vencimiento | Nivel medio | Premium | `bondCurve`, `bond` | — |
| `comprar-deuda-publica` | Cómo comprar deuda pública paso a paso: Tesoro, banco y mercado secundario | Para empezar | Premium | — | 39 |
| `deuda-publica-renta` | Deuda pública y Renta: cómo tributa y cómo se declara | Nivel medio | Premium | `tax` | — |
| `letras-depositos-monetarios` | Letras, depósitos y fondos monetarios: diferencias para elegir | Para empezar | Premium | `letra` | — |

Van detrás de `renta-fija-bonos` (tema `bonds`). El vídeo 39 («Letras del Tesoro para tontos») es
Premium (oculto en YouTube): el capítulo lo muestra bloqueado a quien no tiene Premium y su id solo
llega del servidor. No existe un vídeo 113 en la videoteca.

**Por qué todos son Premium.** La regla del producto es «los dos primeros capítulos gratis y el
resto Premium» (tests `premiumGate.test.tsx` y la API de `learn`). Hacer gratis las Letras
obligaría a ponerlas en los dos primeros puestos o a cambiar la regla. El gancho gratuito está en la
ficha «Renta fija» del mapa (gratis), que ya explica los productos del Tesoro, cómo se compran y su
fiscalidad, y en las dos guías públicas. Si el dueño quiere el capítulo de Letras gratis, hay que
decidir cambiar la regla (mover el capítulo a `FREE_CHAPTERS` y permitir capítulos gratuitos fuera
de los dos primeros).

## Datos y su fuente

| Dato | Fuente |
|---|---|
| Letras a 3, 6, 9 y 12 meses; nominal 1.000 €; mínimo 1.000 € y múltiplos; sin retención | [Tesoro: Letras del Tesoro](https://www.tesoro.es/deuda-publica/los-valores-del-tesoro/letras-del-tesoro); [CNMV: renta fija pública](https://www.cnmv.es/portal/inversor/rentafija-publica) |
| En 2026 no hay Letras a 18 meses; subastas en martes (6 y 12 meses la semana de la amortización; 3 y 9 meses el martes siguiente); no competitivas al tipo medio ponderado, hasta 5 millones por postor | [Resolución de 13 de enero de 2026, BOE-A-2026-830](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-830) |
| Interés simple para plazo ≤ 1 año, compuesto si es mayor (art. 14.1); mínimo 1.000 € (art. 10.4); no competitivas a precio medio (art. 12.4.d); cuentas directas (art. 11.6) | [Orden ECM/2/2026, BOE-A-2026-678](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-678) |
| Convención ACTUAL/360; requisitos del Servicio de Compra y Venta de Valores (residente, persona física, no menores; DNIe, certificado o Cl@ve); depósito previo del 100 % en Letras; plazo online 7 días naturales antes (Letras) y 2 días (Bonos y Obligaciones); fondos 2 días hábiles antes; sin comisión de compra, custodia, apertura y mantenimiento; 1,5 ‰ (mín. 0,90 €, máx. 200 €) por transferir amortizaciones y cupones; reinversión hasta 7 días antes; Bonos y Obligaciones el 1.º y 3.º jueves | [Tesoro: preguntas frecuentes](https://www.tesoro.es/deuda-publica/preguntas-frecuentes); [Sede del Tesoro: compra y venta de valores](https://www.tesoro.es/web/sedetesoro/w/servicios/compra-y-venta-de-valores) |
| Calendario 2026 (p. ej. Letras 6 y 12 meses el 03.11.2026; 3 y 9 meses el 10.11.2026) | [Tesoro: calendario de subastas](https://www.tesoro.es/deuda-publica/subastas/calendario) |
| Bonos 3 y 5 años; Obligaciones 10, 15, 30 y 50 años; cupón anual; mínimo 1.000 € | [Tesoro: Bonos y Obligaciones](https://www.tesoro.es/deuda-publica/los-valores-del-tesoro/bonos-y-obligaciones-del-estado) |
| Indexados a la inflación europea (IPCA sin tabaco); bonos verdes desde 2021 | [Tesoro: emisiones indexadas](https://www.tesoro.es/deuda-publica/valores-del-tesoro/emisiones-indexadas); [Tesoro: programa de bonos verdes](https://www.tesoro.es/deuda-publica/el-programa-de-bonos-verdes-soberanos) |
| Mercado secundario: Mercado de Deuda Pública en Anotaciones (Banco de España), AIAF; venta desde la web del Tesoro | CNMV (arriba); BOE-A-2026-830 (apartado 9); FAQ del Tesoro (29) |
| Comprobación de la fórmula con datos reales: 84 días al 2,366 % → 99,451; 266 días al 2,623 % → 98,099 | [BOE-A-2026-16644](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16644) (test `treasury.test.tsx`) |
| Rendimiento del capital mobiliario (Letras, cupones, transmisión y amortización); regla de los dos meses para rendimientos negativos | [LIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) art. 25.2 |
| Escala del ahorro 2025: 19/21/23/27/30 % (la del Estado llega al 15 % desde 300.000 €) | LIRPF art. 66 y 76 (la app usa la de `taxes.ts`) |
| Compensación: saldo negativo de rendimientos compensa hasta el 25 % de ganancias, 4 años | LIRPF art. 49 |
| Sin retención en Letras (art. 75.3 b) ni en transmisión o amortización de activos con rendimiento explícito negociados en mercado oficial (art. 75.3 e); 19 % en cupones | [RIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) art. 75.3; LIRPF art. 101; [Tesoro: tributación de Bonos y Obligaciones](https://www.tesoro.es/deuda-publica/los-valores-del-tesoro/fiscalidad/residentes/impuesto-sobre-la-renta-de-las-personas-fisicas/tributacion-de-los-bonos-y-obligaciones-del-estado) |
| Casillas Renta 2025: 0027 intereses de activos financieros; 0030 Letras del Tesoro; 0031 otros activos financieros | Esquema oficial de la Renta 2025 (`frontend/src/modules/tools/data/renta/xml/casillas-2025.json`) |
| Comisión del Banco de España deducible como gasto | DGT V0983-25 (citada por terceros); LIRPF art. 25.2.b |

Notas:

- La página del Tesoro sobre tributación todavía muestra la escala con el 28 % como último tramo;
  desde 2025 es el 30 % (el contenido usa el 30 %).
- La comisión de venta antes del vencimiento por cuentas directas no figura en una página oficial
  consultada: el contenido dice que la hay y remite a la tarifa vigente.
- No se dan tipos actuales: los ejemplos usan tipos redondos (2 %, 3 %) y se remite a
  «Resultado últimas subastas» de tesoro.es.

## Pendiente fuera de este trabajo

- `frontend/src/modules/tools/domain/invest/ledger.ts` y `rentaGains.ts` (Renta, de otro agente)
  llevan las Letras a la casilla 0031; el esquema oficial de 2025 tiene la 0030 para Letras. Y
  `docs/fiscalidad/inversiones.md` (línea de «Letras del Tesoro y bonos») dice 0031.
