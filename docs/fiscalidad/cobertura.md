# Mapa de cobertura: qué hace hoy Finanverso frente a la norma

> Información orientativa, no asesoramiento fiscal. Verifica siempre en la fuente oficial. Fecha de comprobación: **19-10-2026 (segunda medición, por la tarde)**, sobre la rama `develop` de ese día, después de las oleadas de IVA, actividades económicas, ganancias e inversiones, deducciones y revisor. La primera medición (mañana del mismo día) queda como referencia en `cobertura.json` → `medicion_anterior`.

Datos legibles por máquina en **[cobertura.json](cobertura.json)**: el estado de cada casilla, los resúmenes, los modelos, las discrepancias (con su estado actual en `estado_19_10_tarde`) y las cifras verificadas. El catálogo de referencia es [renta-casillas.json](renta-casillas.json). El informe para el dueño está en [informe-gestor-real.md](informe-gestor-real.md).

## Cómo se ha medido

Se leyó el código sin modificarlo:

- Renta: `frontend/src/modules/tools/domain/rentaCalc.ts`, `rentaForm.ts`, `rentaDraft.ts`, `rentaCompare.ts`, `rentaJoint.ts`, `rentaWork.ts`, `rentaData.ts`, `rentaExtras.ts`, `rentaCampaign.ts`, `rentaGains.ts` (ahorro, ganancias, integración y compensación), `rentaActivity.ts` (actividades y art. 32), `rentaFromAutonomo.ts`, `rentaOptimizer.ts` (revisor), `rentaReview.ts`, `invest/**` (importador de inversiones) y `frontend/src/modules/tools/data/renta/**`.
- Enlace con Autónomos: `frontend/src/modules/finances/domain/annualActivity.ts` (casillas del apartado D, 0599 y 0604) y `agrarianModules.ts`.
- Autónomo: `backend/src/domain/services/autonomo.ts`, `autonomo-data.ts`, `autonomo-expenses.ts`, `frontend/src/modules/finances/domain/taxModelPdf.ts`, `invoiceBook.ts`, `withholdings.ts`, `frontend/src/modules/tools/domain/retaCalc.ts` y `data/reta2026.ts`.

Cada casilla se clasificó así:

| Estado | Significado |
|---|---|
| **CALCULADO** | El motor la produce con la regla indicada. |
| **LEÍDO** | Se toma de lo que escribe el usuario o del borrador. |
| **PARCIAL** | Se calcula o lee con límites (en el JSON, campo `limites`). |
| **NO SOPORTADO** | La app no la produce (en el JSON, motivo del apartado). |

Los porcentajes **cuentan casillas, no euros ni usuarios**. Un apartado con pocas casillas puede pesar mucho en la práctica: el bloque A lo tienen casi todos los declarantes y el anexo C.3 casi nadie. Por eso se dan tres cifras: el total, el total sin el anexo B y el **núcleo del asalariado** (A, C, H, I, J, K y M, solo importes).

## Resumen de cobertura del modelo 100

| Medida | Casillas | Calculadas + leídas | Con parciales | Antes (mañana del 19-10) |
|---|---|---|---|---|
| Todas las casillas | 2.275 | **9,1 %** (208) | 34,7 % | 3,8 % / 25,5 % |
| Todas, sin el anexo B.1-B.10 de deducciones autonómicas | 1.780 | **11,7 %** | 19,6 % | 4,9 % / 7,9 % |
| Solo casillas de importe | 1.721 | **11,4 %** | 44,3 % | 4,5 % / 32,9 % |
| **Núcleo del asalariado** (A, C, H, I, J, K y M; solo importes) | 259 | **40,2 %** (104) | **59,8 %** | 29,7 % / 46,3 % |

En pocas palabras: además del caso «nómina o pensión + alquiler + mínimos + deducciones por catálogo», la app ya calcula el **capital mobiliario del ahorro**, las **ganancias de fondos, acciones, cripto e inmuebles** (FIFO, permutas, regla de los dos meses y del año, reinversión en vivienda), la **integración y compensación** completa (apartado G al 100 %), las **actividades en estimación directa** que vienen de Autónomos (apartado D-ED al 53 %), las **agrarias en módulos**, las reducciones del art. 32 y los mínimos completos (K al 100 %). Sigue sin cubrir: regímenes especiales (E), exit tax (F3), premios y ayudas públicas con sus casillas propias, DT 9.ª (abatimiento), derechos de suscripción, anexos A (detalle de deducciones estatales), B.11-B.15, C y D, y la regularización (N). Los módulos no agrarios tienen pantalla desde el 19-10-2026 (actividad, 131 y 303 simplificado; pasan a la Renta).

### Por apartado

| Apartado | Casillas | Calculado | Leído | Parcial | No soportado | Plena | Con parcial | Con parcial, solo importes |
|---|---|---|---|---|---|---|---|---|
| ID · Identificación | 70 | 2 | 5 | 4 | 59 | 10,0 % | 15,7 % | — |
| A · Trabajo | 27 | 8 | 5 | 3 | 11 | 48,1 % | 59,3 % | 64,0 % |
| B · Capital mobiliario | 32 | 4 | 3 | 2 | 23 | 21,9 % | 28,1 % | 32,1 % |
| C · Inmuebles | 94 | 6 | 12 | 5 | 71 | 19,1 % | 24,5 % | 34,4 % |
| D · Estimación directa | 62 | 32 | 1 | 8 | 21 | 53,2 % | 66,1 % | 71,4 % |
| D · Módulos ² | 44 | 0 | 0 | 32 | 12 | 0,0 % | 72,7 % | 88,9 % |
| D · Agrarias en módulos | 79 | 12 | 0 | 14 | 53 | 15,2 % | 32,9 % | 43,3 % |
| E · Regímenes especiales | 92 | 0 | 0 | 0 | 92 | 0,0 % | 0,0 % | 0,0 % |
| F · Ganancias sin transmisión | 34 | 0 | 0 | 4 | 30 | 0,0 % | 11,8 % | 12,9 % |
| F · Ganancias por transmisión | 155 | 28 | 3 | 24 | 100 | 20,0 % | 35,5 % | 42,1 % |
| F · Exit tax y fusiones | 14 | 0 | 0 | 0 | 14 | 0,0 % | 0,0 % | 0,0 % |
| G · Integración y compensación | 10 | 10 | 0 | 0 | 0 | 100,0 % | 100,0 % | 100,0 % |
| H · Bases imponibles | 24 | 8 | 0 | 16 | 0 | 33,3 % | 100,0 % | 100,0 % |
| I · Reducciones | 39 | 5 | 4 | 0 | 30 | 23,1 % | 23,1 % | 30,8 % |
| J · Bases liquidables | 13 | 8 | 0 | 1 | 4 | 61,5 % | 69,2 % | 69,2 % |
| K · Mínimos | 14 | 14 | 0 | 0 | 0 | 100,0 % | 100,0 % | 100,0 % |
| L · Datos adicionales | 33 | 0 | 1 | 0 | 32 | 3,0 % | 3,0 % | 3,4 % |
| M · Cuotas, deducciones y resultado | 142 | 27 | 10 | 27 | 78 | 26,1 % | 45,1 % | 65,6 % |
| M · Parte de la CCAA | 3 | 0 | 0 | 0 | 3 | 0,0 % | 0,0 % | 0,0 % |
| N · Regularización y devolución | 16 | 0 | 0 | 0 | 16 | 0,0 % | 0,0 % | 0,0 % |
| Anexos A.1-A.6 · Deducciones estatales (detalle) | 223 | 0 | 0 | 0 | 223 | 0 % | 0 % | 0 % |
| Anexos B.1-B.10 · Deducciones autonómicas ¹ | 495 | 0 | 0 | 441 | 54 | 0,0 % | 89,1 % | 100,0 % |
| Anexos B.11-B.15 · Información autonómica | 220 | 0 | 0 | 0 | 220 | 0,0 % | 0,0 % | 0,0 % |
| Anexos C.1-C.5 · Información adicional ³ | 292 | 0 | 0 | 0 | 292 | 0,0 % | 0,0 % | 0,0 % |
| Anexo D · Gastos de inmuebles | 48 | 0 | 0 | 0 | 48 | 0,0 % | 0,0 % | 0,0 % |

¹ El anexo B se marca PARCIAL en bloque. La app tiene un catálogo de deducciones de las 17 comunidades (`data/renta/ccaa/*.ts`) y calcula las que elige el usuario, pero sin vincular cada una con su casilla ni comprobar todos los requisitos. Es la cifra más optimista del mapa.

² **Módulos no agrarios (D-EO):** `rentaActivity.ts modulesNet` calcula las casillas 1465-1484 con la Orden HAC/1347/2024 (70 actividades, iguales en 2026). Desde el 19-10-2026 la pantalla «Tu actividad en módulos» de Autónomos las lleva a la Renta (contrato anual, actividad `modules`); los porcentajes de esta tabla son de la medición anterior y se actualizan en la próxima.

³ **Anexo C.3:** la app pide los saldos negativos pendientes por año y calcula lo que queda para los 4 años siguientes (`rentaGains.ts carryForward`), pero no rellena el anexo casilla a casilla: se cuenta como no soportado.

### Casillas calculadas o leídas (lo que sí hace la app)

| Casillas | Estado | Dónde | Regla y límites |
|---|---|---|---|
| 10, 11, 70, 77, 92 (identificación) | LEÍDO | `rentaDraft.ts` | Edad a 31-12, discapacidad (0/33/65), comunidad, edades de hijos y ascendientes desde el borrador |
| 68/69 | CALCULADO | `rentaJoint.ts` | Compara la declaración individual con la conjunta y recomienda una |
| 0003, 0013-0016 | LEÍDO | `rentaForm.ts` | Bruto, Seguridad Social (6,5 % si se deja vacía), sindicatos, colegios (hasta 500 €), defensa jurídica (hasta 300 €) |
| 0017-0022 | CALCULADO | `rentaCalc.ts workIncome` | 2.000 € de otros gastos, +2.000 € de movilidad, +3.500/7.750 € por discapacidad en activo; en conjunta, regla del Manual (un incremento por discapacidad, el del mayor grado) |
| 0023, 0025 | CALCULADO | `rentaWork.ts` | Art. 20 LIRPF con el límite de 6.500 € de otras rentas |
| 0083-0089, 0155 | LEÍDO / PARCIAL | `rentaForm.ts unrentedOf` | 2 % o 1,1 % del valor catastral, prorrateado por meses |
| 0062-0156 | CALCULADO / PARCIAL | `rentaRentals.ts propertyResult`, `rentaForm.ts rentalOf` | Inmueble a inmueble (19-10-2026): % de titularidad (0063/0064), días alquilado (0101) y a disposición (0085, imputación 0089), ingresos (0102), intereses y reparaciones con su límite y arrastre por inmueble (0103-0108), otros gastos (0109-0117, los anuales por días), amortización del 3 % del mayor entre coste y valor catastral sin suelo (0123-0131), reducción del 23.2 según contrato (0150), 30 % del 23.3 (0151), mínimo del art. 24 (0152), retenciones (0153), neto reducido (0154) y suma (0156). Sin inmuebles accesorios (0133-0147), amortización en casos especiales (0132) ni NIF de inquilinos y referencia catastral (se copian del borrador) |
| 0424/0429/0460 | PARCIAL / CALCULADO | `rentaCalc.ts` | El «ahorro» es una cifra neta que va entera a la base del ahorro |
| 0432, 0435 | CALCULADO | `rentaCalc.ts` | Trabajo + inmuebles + imputaciones |
| 0461, 0491, 0506 | CALCULADO | `rentaCalc.ts` | 3.400 €/2.150 € de la conjunta; el remanente va a la base del ahorro |
| 0465-0469, 0485-0496 | LEÍDO / PARCIAL | `rentaCalc.ts basesOf` | Planes de pensiones (con el error D02), plan del cónyuge (≤ 1.000 €), pensión compensatoria |
| 0500, 0505, 0510 | CALCULADO / PARCIAL | `rentaCalc.ts` | Sin bases negativas de años anteriores ni el 0507 |
| 0511-0524 | CALCULADO / PARCIAL | `rentaCalc.ts computeMinimum` | Mínimos estatales y autonómicos, reparto al 50 %, remanente al ahorro (con el error D01) |
| 0528-0546 | CALCULADO | `rentaCalc.ts applyMinimum` | Escalas estatal y autonómica, general y del ahorro |
| 0547-0571 | PARCIAL / CALCULADO | `rentaCalc.ts` + `state.ts` + `ccaa/*.ts` | Deducciones por catálogo con sus porcentajes, bases y límites de renta (con D06) |
| 0414 | CALCULADO | `rentaCalc.ts lowPayDeduction` | 340 € (DA 61.ª), con D08 |
| 0595, 0609, 0610 | CALCULADO / LEÍDO | `rentaCalc.ts` | Retenciones como una sola cifra |
| 0611-0663 | PARCIAL | `state.ts` (abonables) | 1.200 € por unidad, sin meses ni tope de cotizaciones |
| 0670 | PARCIAL | `rentaCalc.ts` | Con los abonos anticipados; sin las regularizaciones 0664/0666 ni la 0669 |
| 0011 | PARCIAL | `rentaCalc.ts transitionalReduction` | Solo el 40 % de la DT 12.ª (plan cobrado en capital) |
| 0027, 0029, 0031, 0032, 0036-0041 | CALCULADO / LEÍDO | `rentaGains.ts savingsOf`, `invest/**` | Intereses, dividendos, otros activos y seguros tecleados o leídos de los archivos; gastos de administración y depósito. Sin 0028, 0030, 0033-0035 ni DT 4.ª |
| 0103, 0104, 0107, 0108 | LEÍDO / CALCULADO | `rentaRentals.ts` | Intereses y reparaciones: pendiente de 2021-2024 primero, luego 2025, hasta los ingresos de cada inmueble; exceso a 4 años por inmueble |
| 0168, 0171-0224 (28 casillas) | LEÍDO / CALCULADO | `annualActivity.ts` → `rentaFromAutonomo.ts` → `rentaActivity.ts` | Ingresos, gastos por casilla, amortización material e inmaterial, provisiones, 5 % de difícil justificación (máx. 2.000 €), regularización del RETA (0196/0197) desde las facturas de Autónomos. Una sola actividad |
| 0231-0235 | CALCULADO / PARCIAL | `rentaActivity.ts activitiesOf` | Art. 32.2.1.º (2.000 € + 6.498 €), 32.2.3.º (1.620 €, tope conjunto de 3.700 €) e inicio de actividad (20 %, requisitos no comprobados) |
| 1536-1560 | CALCULADO / PARCIAL | `agrarianModules.ts`, `rentaActivity.ts farmNet` | Agrarias en módulos: índices, correctores, 5 % y jóvenes agricultores |
| 0304-0307 | PARCIAL | `rentaGains.ts generalGains` | Ganancias que no derivan de transmisión, en una lista (airdrops: NO CONFIRMADO) |
| 0312-0325 | CALCULADO | `rentaGains.ts fifo`, `invest/**` | Fondos y ETF por fondo; regla de un año en fondos (art. 33.5.g); traspasos sin tributar (art. 94) |
| 0327-0340 | CALCULADO / PARCIAL | ídem | Acciones negociadas: FIFO global por valor, regla de dos meses (art. 33.5.f) |
| 1802-1814 | CALCULADO / PARCIAL | ídem | Monedas virtuales por moneda y clave; permutas; clave F/N NO CONFIRMADA |
| 1826-1845 | LEÍDO / CALCULADO / PARCIAL | `rentaGains.ts propertyGain` | Venta de inmuebles con amortizaciones, exención por reinversión (art. 38.1) y de mayores de 65 (art. 33.4.b); sin DT 9.ª ni el 50 % de la 1641 |
| 1626-1650, 0385-0390 | PARCIAL | `invest/**` | Derivados, CFD y otros resultados (criterio NO CONFIRMADO) |
| 0418-0430 | CALCULADO | `rentaGains.ts savingsOf` | Integración y compensación de los arts. 45-49 |
| 0431-0455 | CALCULADO / PARCIAL | `rentaGains.ts savingsOf`, `generalBaseOf` | Compensación cruzada del 25 % y saldos de 2021-2024 (el total por bloque, no año a año) |
| 0467, 0468, 0492 | CALCULADO | `rentaCalc.ts basesOf` | Planes: propia hasta 1.500 €, empresa hasta 8.500 € más, 30 % por miembro (D02 corregida) |
| 0507 | CALCULADO | `rentaCalc.ts basesOf` | Remanente de la pensión compensatoria a la base del ahorro (D07 corregida) |
| 0517-0520 | CALCULADO | `rentaCalc.ts computeMinimum` | Con los 3.000 € de asistencia (D01) y el mínimo de Baleares > 65 (D04), corregidas |
| 0527 | LEÍDO | `rentaCalc.ts generalQuota` | Anualidades por alimentos a los hijos con escala aparte (arts. 64 y 75), un solo importe |
| 0588 | PARCIAL | `rentaCalc.ts doubleTaxationOf` | Doble imposición del ahorro de los archivos, tras la cuota líquida (D09 corregida); sin límite del convenio |
| 0597, 0599, 0603, 0604, 0609 | CALCULADO | `rentaCalc.ts`, `annualActivity.ts`, `invest/**` | Retenciones del ahorro importado, de actividades y pagos del 130 |
| 0612, 0624, 0637, 0249, 0661, 0663 | LEÍDO | `rentaCalc.ts advanceOf` | Abonos anticipados (140/143) que se suman al resultado (D03 corregida) |

El JSON detalla una a una las **208** casillas calculadas o leídas y las **581** parciales (antes, 87 y 494).

## Cobertura de los modelos del autónomo

| Modelo | Estado | Dónde | Casillas | Cobertura | Qué falta |
|---|---|---|---|---|---|
| **130** | CALCULADO (secciones I y II) | `backend/.../autonomo.ts draft130`; amortizaciones y subvenciones en `frontend/.../domain/{depreciation,subsidies}.ts` | 01-15, 17, 19 (con amortización, provisiones de la normal, subvenciones y compensaciones del REAGP desde el 19-10-2026) | 17/19 = **89 %** | Vivienda (16), complementaria (18), 0,8 % de Ceuta, Melilla y La Palma, reducción del art. 32.1; NO CONFIRMADO si la compensación del REAGP entra en la 08 (se deja fuera) |
| **303** | CALCULADO (régimen general) | `autonomo-vat.ts vatYear`; lectura de todas sus casillas en `taxModelPdf.ts` | 150-152, 01-15, 156-158, 168-170, 19-27, 28-46, 59, 60, 120, 122-124, 62-63, 74-75, 76, 64-66, 77, 110, 78, 87, 69, 71, 72, 73 | 74/106 = **70 %** (antes 22 = 21 %); **100 % de las aplicables** al régimen general | No aplican en 2026: 153-155, 165-167 y 16-18 (sin tipo vigente), página 2 (simplificado: solo aviso), 68 (foral), 112 (hidrocarburos), 70/108/109/111 (rectificativa) y página 4 (exonerados del 390). Prorrata general y especial, bienes de inversión, criterio de caja, inversión del sujeto pasivo y arrastre de cuotas a compensar entre trimestres; casos 303-01 a 303-04 del Manual de IVA 2025 al céntimo |
| **111** | PARCIAL | `frontend/.../withholdings.ts` | 01-09, 28-30 | 12/30 = **40 %** | Especie, premios, ganancias forestales, derechos de imagen |
| **115** | CALCULADO | `withholdings.ts` | 01-05 | **100 %** | Complementaria con importe |
| **RETA** | CALCULADO (estimación) | `autonomo.ts retaFor`, `retaCalc.ts` | Tramo, bases, cuota al 31,50 %, tarifa plana | — | Regularización anual, pluriactividad, colaboradores y societarios (1.424,40 €) |
| **390** | CALCULADO (régimen general) | `autonomo-390.ts draft390` | Devengado, deducible por canal y tipo, 64-65, 84-86, 95, 97, 98, 662, volumen 99-108, prorrata 115/116/118, 232, 523 y conciliación con los 303 | Diseño de 2025 (el de 2026 no está publicado); casos 390-01 y 390-02 al céntimo | Simplificado, sectores diferenciados, foral, grupos. Vista previa (19-10-2026) con el anexo IV de BOE-A-2026-1761 junto al borrador del 4.º trimestre |
| **349** | CALCULADO | `autonomo-349.ts draft349` | Registros por operador y clave, rectificaciones, resumen, periodicidad mensual, coherencia con 59 y 10 | Casos 349-01 y 349-02 | NIF-IVA validado solo por prefijo. Vista previa (19-10-2026) con el facsímil de BOE-A-2010-5098: resumen, operadores y rectificaciones |
| **190** | CALCULADO (19-10-2026) | `frontend/.../annualSummaries.ts summary190`, panel `AutonomoAnnual.tsx` | Resumen 01-03; un registro por profesional (clave G, subclave 01/03) y lo tecleado (clave A) | Instrucciones del 190 de 2025 (GI10) | Registro por empleado (hoy los empleados se teclean en total), subclaves distintas de 01/03, reducciones, especie detallada. Vista previa (19-10-2026) con el facsímil de BOE-A-2009-18567: resumen y un bloque por perceptor ([documentos-oficiales.md §2.2](documentos-oficiales.md#22-vistas-previas-añadidas-19-10-2026)) |
| **180** | CALCULADO (19-10-2026) | `annualSummaries.ts summary180` | Un registro por arrendador (base, último %, retención) y totales | Diseño de registro 2023 | Situación y referencia catastral (aviso), modalidad en especie. Vista previa **aproximada** (19-10-2026): reconstruida sobre la del 190 porque el facsímil es un escaneo |
| **347** | CALCULADO (19-10-2026) | `annualSummaries.ts summary347` | Por persona y clave A/B, IVA incluido, por trimestre, > 3.005,06 €; fuera importaciones, exportaciones e intracomunitarias | RD 1065/2007 arts. 31-35 | **NO CONFIRMADO** si las facturas con retención de IRPF salen del 347 (se dejan y se avisa); no sujetas por localización (aviso); cobros en metálico > 6.000 €, anexo del arrendador, SII. Vista previa (19-10-2026) con el facsímil de BOE-A-2014-9740: resumen 01-02 y un bloque por declarado con sus 4 trimestres |
| **131** | CALCULADO (19-10-2026) | `objectiveModules.ts instalments131`, pantalla «Tu actividad en módulos», `modulesView.ts` | 01-15 | Instrucciones del 131 (AEAT) y anexo II de la orden | Rendimiento con los módulos de la orden, temporada, inicio y cese, sin datos-base; vista previa y fichero DR131_2026. Varias actividades: no |
| **720, 721, 714** | AVISOS (19-10-2026) | `wealthWarnings.ts`, panel `AutonomoAnnual.tsx` | — | RGAT 42 bis/ter/quater y 54 bis; Ley 19/1991 arts. 4.Nueve, 28.Dos y 37 | No se calcula el impuesto (mínimos y bonificaciones autonómicas) |
| **102, 309, 369, 036** | NO SOPORTADO | — | — | 0 % | Ver [modelos.md](modelos.md) y [hoja-de-ruta.md](hoja-de-ruta.md) |

**Ficheros para la sede y vistas previas (19-10-2026):** la app genera en el dispositivo el fichero con el diseño de registro de 303, 130, 111, 115, 349, 390, 190, 180 y 347 (`frontend/src/modules/finances/application/aeatFiles/`) y vistas previas con la maquetación del impreso de 111, 115, 123, 130, 131, 180, 190, 303, 309, 347, 349 y 390 (`frontend/src/modules/taxforms/`). **Ningún fichero se ha probado todavía importándolo en la sede** (lista en [documentos-oficiales.md §7](documentos-oficiales.md#7-ficheros-para-importar-en-la-sede-19-10-2026)). No hay vista previa ni fichero del modelo 100: la Renta se copia a mano en Renta WEB con la tabla «Lo que tienes que copiar».

**Enlace entre modelos (19-10-2026, tarde):** hecho. El botón «Preparar mi declaración de la renta» de Autónomos (`PrepareRenta.tsx`) pasa el contrato anual (`annualActivity.ts`) por `rentaFromAutonomo.ts` al motor de la Renta: ingresos y gastos del apartado D, retenciones de los clientes (0599) y pagos del 130 (0604). Las retenciones del 111/115 que practica el autónomo no van al 100 (son de terceros: correcto). Límites: una sola actividad; los módulos no agrarios no pasan (`null`); las agrarias pasan como rendimiento neto ya calculado.

## Discrepancias encontradas (de mayor a menor gravedad)

Estado comprobado en el código de `develop` el 19-10-2026 por la tarde: **D01, D02, D03, D04, D05, D06, D07, D09 y D15 corregidas**; D12 y D19 en parte; el resto, abiertas. Severidad: **bug probable** (la app da un resultado distinto del que exige la norma en casos reales), **duda** (simplificación que puede dar un resultado distinto en algunos casos) y **mejora** (exactitud, trazabilidad o normativa futura).

| Id | Estado (19-10 tarde) | Severidad | Área | Qué pasa | Norma y fuente | Impacto | Propuesta |
|---|---|---|---|---|---|---|---|
| D01 | **corregida** | **bug probable** | Renta · 0517/0518 | El mínimo por discapacidad no suma los **3.000 € de gastos de asistencia** (obligatorios con ≥ 65 %, o con ayuda de terceros o movilidad reducida). `rentaCalc.ts` y `rentaCompare.ts` no usan `assistance`, aunque `salaryCalc.ts` sí. | LIRPF art. 60.1-60.2 ([BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); [cuadro de mínimos del Manual 2025](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/cuadro-minimos-personales-familiares-estatal-autonomicos.html) | Unos 570 € más de cuota por persona con ≥ 65 % en el primer tramo; la comparación con el borrador atribuye la diferencia a otra causa | Sumar la asistencia, preguntar por la ayuda de terceros o la movilidad reducida y aplicar también los 7.750 € de gastos del trabajo en ese caso |
| D02 | **corregida** | **bug probable** | Renta · planes de pensiones | La aportación **propia** no se limita a 1.500 €: se suman propia y empresa y se limita el total a 10.000 €. | LIRPF art. 52.1.b) | Con 5.000 € propios sin empresa se reducen 3.500 € de más (≈ 1.050 € al 30 %) | Límite propio de 1.500 € + tabla del 8.500 €; base del 30 % con actividades; exceso a 5 años |
| D03 | **corregida** | **bug probable** | Renta · 0670 | El resultado no suma los **abonos anticipados** cobrados (modelos 140/143): casillas 0612, 0624, 0637, 0249, 0661 y 0663. | Fórmula impresa de 0670 ([BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf), página 25); LIRPF arts. 81 y 81 bis | Devolución inflada en hasta 1.200 € (2.400 €) por deducción | Preguntar si se cobra cada mes y leer esas casillas del borrador |
| D04 | **corregida** | **bug probable** | Renta · Baleares | Mínimo del contribuyente **mayor de 65 años: 6.105 €** (más 1.265 €). La app usa 5.550 € + 1.265 €. | [Manual 2025, mínimos de Baleares](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/comunidad-autonoma-illes-balears.html) (DLeg 1/2014 de Baleares, art. 2) | ≈ 50 € de cuota autonómica | Añadir `personalOver65` a los mínimos autonómicos |
| D05 | **corregida** | bug probable | Autónomo · 303 | Las ventas sin IVA se llevan a la **casilla 150 (tipo 0 %)**. Las intracomunitarias van a la 59, las exportaciones a la 60, las no sujetas a la 120/123 y las de inversión del sujeto pasivo a la 122. El lector de PDF hace lo contrario (lee 59 + 60 como «0 %»). | [Instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html) | 303 mal cumplimentado para profesionales con clientes extranjeros o con servicios exentos | Pedir el motivo de la ausencia de IVA y mapearlo a su casilla |
| D06 | **corregida** | **bug probable** | Renta · deducciones del art. 68 | Donativos, interés cultural, incentivos empresariales, Ceuta y Melilla, La Palma y alquiler transitorio se restan **100 % de la cuota estatal**; la ley y el modelo las reparten 50/50 (parejas de casillas estatal y autonómica). | LIRPF art. 68; modelo 100, página 22 | Tope por cuota mal aplicado cuando una cuota no alcanza; desglose distinto del borrador | Campo «parte estatal» en cada deducción |
| D07 | **corregida** | **bug probable** | Renta · 0507 | El remanente de la pensión compensatoria no reduce la base del ahorro. | LIRPF art. 50.2 | Raro | Llevarlo a la base del ahorro, como la 0506 |
| D08 | abierta | duda | Renta · 0414 | El tope de los 340 € es la cuota restante, no la «parte de cuota proporcional a los rendimientos del trabajo»; en conjunta con dos perceptores se omite. | [Manual 2025, DA 61.ª](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion/deducciones-cuota-liquida-total/deduccion-obtencion-rendimientos-trabajo.html) | Pequeño, con otras rentas | Tope proporcional |
| D09 | **corregida** | duda | Renta · 0588 | La doble imposición internacional se resta de la cuota íntegra estatal, no de la cuota líquida total. | LIRPF art. 80 | Orden y tope | Paso propio tras 0587 |
| D10 | **corregida** (19-10-2026, `rentaRentals.ts`; personas p5-120 a p5-122) | duda | Renta · apartado C | Todos los inmuebles arrendados van **agregados**: los topes de gastos y la reducción del 23.2 son por inmueble; la amortización solo usa el coste de construcción (la ley dice el mayor de coste o valor catastral, sin suelo). | LIRPF art. 23 | Errores con varios pisos o con pérdidas | Modelar cada inmueble |
| D11 | abierta | duda | Renta · 0151 | La reducción del 30 % por irregularidad figura como alternativa a la del 23.2; son casillas y reglas distintas. | Modelo 100, página 7 | Raro | Separarlas |
| D12 | **en parte** | duda | Renta · 0085/0089 | La imputación se prorratea por meses (la ley, por días) y no se aplica el 50 % del valor de adquisición cuando no hay valor catastral. | LIRPF art. 85 | Euros | Usar días |
| D13 | abierta | duda | Renta · 0008 | La contribución empresarial al plan reduce la base pero no se suma como rendimiento del trabajo. | Modelo 100 (0008 dentro de 0012) | Base infravalorada si el bruto no la incluye | Pedirla como especie o avisar |
| D14 | abierta | duda | Renta · lectura del borrador | «0010/0011/0077/0092» son casillas de identificación del **borrador**; en el impreso, esos números con 4 cifras son otras casillas. | Modelo 100, páginas 1-2 y 4-6 | Lectura errónea si se sube otro documento | Validar la etiqueta junto al número |
| D15 | **corregida** | mejora | Renta · comparación | `ourBoxes` mezcla 0019 con 0020/0021. | Modelo 100, página 4 | Diferencias falsas | Comparar por separado |
| D16 | abierta | mejora | Renta · 0013 | Seguridad Social estimada al 6,5 % (en 2025 era el 6,48 %). | [Orden PJC/297/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296) (2026) | Céntimos | Tipo por ejercicio |
| D17 | **corregida** (19-10-2026, `rentaDonations.ts`: se pide lo donado, 80/40/45 %, +5 puntos en prioritarias, 10 % fuera de la Ley 49/2002 y límite del 10-15 % de la base liquidable) | mejora | Renta · donativos | El usuario escribe la deducción, no lo donado, y no se aplica el límite del 10 % de la base liquidable. | Ley 49/2002 arts. 19-20 | Riesgo de deducir el 100 % | Pedir lo donado y calcular |
| D18 | abierta | mejora | Autónomo · gastos | Atenciones a clientes deducibles al 100 % en el IRPF, sin el tope del 1 % de la cifra de negocios. | LIS art. 15.e (aplicable por el art. 28 LIRPF; no reverificado) | Gastos sobrestimados | Tope anual |
| D19 | **en parte** | mejora | Autónomo · calendario | Falta el **180** entre los resúmenes y no se consideran festivos. | [Calendario 2026](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html) | Aviso ausente | Añadir 180 (y 349) |
| D20 | abierta | mejora | RETA · cita | El código cita el «art. 15» de la Orden PJC/297/2026; la tabla del RETA está en el **art. 18.1**. | Orden PJC/297/2026 | Trazabilidad | Corregir el comentario |
| D21 | abierta | mejora | RETA · tarifa plana | 80 €/mes para 2026 sin fuente de 2026 (la cuantía la fija la LPGE, prorrogada). | LETA art. 38 ter | Probablemente correcto | Confirmar y citar. 19-10-2026: 80 € confirmado solo para 2023-2025 (RDL 13/2022, DT 5.ª, BOE-A-2022-12482); para 2026 y 2027 sigue NO CONFIRMADO (`fiscalFigures.ts` lo deja en null) |
| D22 | abierta | mejora | Normativa futura | **Art. 23.2 LIRPF** modificado en octubre de 2026: reducciones de 100, 95, 90, 85, 70 y 50 % (y de 40 a 15 % según la subida de la renta). Régimen transitorio NO CONFIRMADO. | LIRPF art. 23, historial de versiones | Renta 2026 en adelante | Versionar las reducciones por fecha de contrato |
| D23 | abierta | mejora | Normativa futura | **Art. 85 LIRPF desde el 1-1-2027**: imputación por escala sobre la suma de valores catastrales (1,1 / 1,5 / 2 / 3 %). | LIRPF art. 85 (redacción no vigente aún) | Renta 2027 | Escala por ejercicio |
| D24 | abierta | mejora | Normativa futura | **DA 61.ª en 2026**: 590,89 € hasta 17.094 €, a cero en 20.048,45 €. Las constantes de 340 € están en el código. | LIRPF DA 61.ª (redacción desde el 20-2-2026) | Escenario «año siguiente» | Mover a los datos del ejercicio |

## Cifras fijas de la app comprobadas contra la fuente oficial

| Cifra | Archivo | Resultado | Fuente |
|---|---|---|---|
| Escala estatal 2025 (9,5-24,5 %) | `state.ts` | ✅ | LIRPF art. 63 |
| Escala del ahorro 2025 (19 / 21 / 23 / 27 / 30 %) | `estado-extra.ts` | ✅ | LIRPF arts. 66 y 76 |
| **Escalas autonómicas 2025 de las 15 CCAA** y supletoria de Ceuta y Melilla | `ccaa/*.ts` | ✅ las 15, tramo a tramo | [Manual 2025, gravamen autonómico](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico.html) |
| Mínimos estatales | `state.ts` | ✅ los importes; ❌ no se aplica la asistencia (D01) | LIRPF arts. 57-60 |
| Mínimos autonómicos | `ccaa/*.ts` | ✅ Andalucía, Asturias, Canarias, Galicia, Madrid, Comunitat Valenciana, La Rioja; ✅ Cataluña y Castilla y León (= Estado); ❌ Baleares mayores de 65 (D04). No revisados en detalle: Aragón, Cantabria, Castilla-La Mancha, Extremadura y Murcia (sin mínimos propios en el cuadro del Manual) | [Cuadro del Manual](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/cuadro-minimos-personales-familiares-estatal-autonomicos.html) |
| Reducción por rendimientos del trabajo (7.302 / 14.852 / 17.673,52 / 19.747,5) | `state.ts`, `rentaWork.ts` | ✅ | LIRPF art. 20 |
| Gastos del trabajo (2.000 / 3.500 / 7.750; colegios 500; defensa 300) | `state.ts`, `estado-extra.ts` | ✅ | LIRPF art. 19 |
| Deducción de 340 € (16.576 / 18.276) | `rentaCalc.ts` | ✅ (tope: D08) | Manual 2025, DA 61.ª |
| Conjunta 3.400 / 2.150 € | `conjunta.ts` | ✅ | LIRPF art. 84.2.4.º |
| Imputación 2 % / 1,1 % | `inmuebles.ts` | ✅ para 2025 | LIRPF art. 85 y DA 55.ª |
| RETA 2026: tramos y 31,50 % | `autonomo-data.ts`, `reta2026.ts` | ✅ | Orden PJC/297/2026, arts. 18 y 37 |
| 130: 20 %, minoración 100/75/50/25, exoneración del 70 % | `autonomo-data.ts` | ✅ | [Instrucciones del 130](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html) |
| Difícil justificación: 5 %, máximo 2.000 € | `autonomo-data.ts` | ✅ (el 7 % fue solo para 2023: DA 56.ª) | LIRPF DA 56.ª |
| Retenciones del 19 % (alquiler) y del 15/7 % (profesionales) | `withholdings.ts` | ✅ | LIRPF art. 101 |
| Campaña de Renta 2025 (8-4 a 30-6; domiciliación hasta el 25-6) | `rentaCampaign.ts` | ✅ | Orden HAC/277/2026 art. 7; calendario AEAT |
| Plazos trimestrales y anuales (303/130 día 20 y 30-1; 111/115 día 20; 390 30-1; 190 2-2; 347 2-3) | `autonomo.ts` | ✅ (sin festivos) | Calendario AEAT 2026 |

## Lo que no se pudo confirmar

- **Diseño de registro (DR100)** del modelo 100: no obtenido. Los tipos de dato del catálogo son heurísticos.
- **Régimen transitorio del nuevo art. 23.2** (qué contratos se acogen a cada porcentaje) y la convalidación de los reales decretos-leyes de septiembre y octubre de 2026 que lo modifican.
- **Tarifa plana 2026**: la cuantía de 80 € no aparece en la Orden PJC/297/2026.
- Mínimos autonómicos de Aragón, Cantabria, Castilla-La Mancha, Extremadura y Murcia: no figuran en el cuadro del Manual, por lo que se presumen iguales a los estatales, sin revisión individual.
- Deducciones autonómicas: no se han auditado una a una en esta revisión (las mantienen otros trabajos del repositorio).
