# Auditoría de los cálculos: Renta (modelo 100) y modelos del autónomo

> Matriz de lo que calcula la app, contra qué fuente y con qué pruebas. Información orientativa: la app prepara borradores y nunca presenta. Fecha: **21-10-2026**, rama `develop`. Las fuentes del catálogo de casos se comprobaron el 19-10-2026; las que se releyeron para esta auditoría llevan la fecha 21-10-2026. Sin datos de personas reales.

## 1. Resumen

| Medida | Antes (19-10-2026) | Ahora (21-10-2026) |
|---|---:|---:|
| Casos oficiales reproducidos (de 57 oficiales del catálogo) | 17 | **47**: 43 enteros y 4 en parte |
| Renta (37 oficiales) | 9 en el banco + 2 fuera | **25 en el banco + 2 fuera** (c07-01, c08-01); 23 enteros y 2 en parte |
| Autónomos (20 oficiales) | 8 | **20**: 18 enteros y 2 en parte (RETA-01 y RETA-02 solo en estructura); el 347-03 entero desde el 22-10-2026 |
| Casos de apoyo no oficiales (5) | 0 | 4 enteros (111-01, 111-02, 190-01 y 115-01, este con su complementaria desde el 22-10-2026) |
| Pruebas de propiedades | ninguna | Renta: 17 lugares de régimen común × 210 declaraciones inventadas; 130 y 303: 150 años inventados de 2023 a 2025 |
| Fallos de cálculo corregidos en esta ola | — | 5 (§4) |

Contando sobre los 62 casos del catálogo, con los de apoyo: **17 de 62 → 51 de 62** (con 5 en parte). Quedan 11: 10 casos de Renta que el motor no cubre (§3) y el 130-01, que no es oficial y tiene una casilla incoherente.

Estado en la matriz:

- **cubierto**: reglas implementadas, con caso oficial o cálculo a mano en las pruebas;
- **parcial**: falta una parte del supuesto, o no hay caso oficial;
- **falta**: el motor no lo calcula (la persona escribe el importe o solo hay un aviso);
- **dudoso**: hay un criterio sin confirmar.

## 2. Matriz: Renta (modelo 100, ejercicio 2025)

Abreviaturas:

- Normas: LIRPF = Ley 35/2006 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); RIRPF = RD 439/2007 ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)); Orden 100 = Orden HAC/277/2026 ([BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)).
- Manual = [Manual práctico de Renta 2025](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025.html), citado por capítulo (cN).
- Rutas: `D/` = `frontend/src/modules/tools/domain/`, `R/` = `frontend/src/modules/tools/data/renta/` y `T/` = `frontend/src/__tests__/`.
- «CO» = `T/casos/casosOficiales.test.ts`; «Banco» = `T/casos/casosRenta.test.ts` (personas inventadas con su cálculo a mano); «Prop.» = `T/casos/rentaPropiedades.test.ts`.

| Bloque | Fuente oficial | Implementación | Tests | Casos oficiales | Estado y notas |
|---|---|---|---|---|---|
| Rendimientos del trabajo: íntegros, cotizaciones, otros gastos 2.000 € (+ discapacidad y movilidad), reducción del art. 20, 40 % de la DT 12.ª | LIRPF arts. 17-20, DT 12.ª; Manual c03 | `D/rentaCalc.ts` `workIncome`, `basesOf`; `D/rentaWork.ts` | `T/tools/rentaCalc.test.ts`, `rentaWork.test.ts`, Banco, CO | c03-01 | **cubierto**. Faltan especie (0004-0007), irregulares y atrasos, y la contribución de la empresa al plan como rendimiento (D13) |
| Deducción por rendimientos del trabajo (340 €) | LIRPF art. 20 bis y DA 61.ª; Manual c18 | `lowPayDeduction`, `lowPayOf` | `rentaCalc.test.ts`, CO | c18-03 (Madrid, límite 187,19 €, comprobado el 21-10-2026) | **cubierto** en individual; en conjunta con dos perceptores se deja fuera y se avisa (**dudoso**). El tope proporcional cuando hay otras rentas (D08) es **parcial** |
| Capital inmobiliario por inmueble: gastos, tope de intereses y reparaciones con arrastre, amortización del mayor entre coste y valor catastral sin suelo, días alquilado, reducciones del art. 23.2, 30 % del 23.3 y mínimo del art. 24 | LIRPF arts. 22-24 y DT 31.ª; RIRPF arts. 13-14; Manual c04 | `D/rentaRentals.ts` `propertyResult`; `R/inmuebles.ts` | `T/tools/rentaRentals.test.ts`, Banco (p5-120 a p5-122), CO | c04-01, c04-02, c04-03, c04-04, c04-06 | **cubierto**. Corregido: la amortización de los muebles se prorratea por días (§4). Criterio distinto en c04-02: el Manual prorratea una reparación sin fecha y el motor toma lo escrito; la persona escribe la parte de los meses alquilados. Falta: usufructo temporal (c04-05), inmuebles accesorios (0133-0147), dos contratos en el mismo año con porcentajes distintos (c04-01 solo en la amortización) y el anexo D |
| Imputación de rentas inmobiliarias | LIRPF art. 85 y DA 55.ª (RDL 16/2025); Manual c10 | `basesOf` (`imputedValues`), `D/rentaForm.ts` `unrentedOf`, `propertyResult` (días a disposición) | `rentaCalc.test.ts`, `rentaRentals.test.ts`, CO | c10-01, c04-02 (90 días) | **cubierto** |
| Capital mobiliario del ahorro: intereses, dividendos, activos financieros, seguros, gastos de custodia | LIRPF arts. 25-26 y 46; Manual c05 | `D/rentaGains.ts` `capitalOf`, `savingsOf` | `rentaGains.test.ts`, `rentaSavingsDetail.test.tsx`, CO | c05-01 | **cubierto** en el ahorro. **Falta** el capital mobiliario de la base general: arrendamiento de negocio y préstamos a vinculadas por encima de 3 veces los fondos propios (0046-0060; c05-02, c05-03) |
| Ganancias y pérdidas: FIFO, regla de recompra de 2 meses o 1 año, liberadas, inmuebles con amortizaciones, reinversión en vivienda y exención de mayores de 65 | LIRPF arts. 33-38; Manual c11 | `fifo`, `propertyGain`, `D/invest/ledger.ts` | `rentaGains.test.ts`, `T/tools/invest/*`, `casosInversiones.test.ts`, CO | c11-01, c11-02 (sin abatimiento), c11-03, c11-06, c11-07 | **parcial**. **Falta**: coeficientes de abatimiento de la DT 9.ª con el límite de 400.000 € (c11-02 en parte, c11-04, c11-05) y la reinversión en renta vitalicia (c11-08). Criterios de cripto **dudosos**: lista en [inversiones.md](inversiones.md) |
| Integración y compensación (bases general y del ahorro, 25 %, pendientes de 4 años) | LIRPF arts. 45-49; Manual c12; Orden 100, página 19 | `savingsOf`, `generalBaseOf` | `rentaGains.test.ts`, CO | c12-01 | **cubierto** |
| Actividades económicas: directa, módulos, agrarias y reducciones del art. 32 | LIRPF arts. 27-32; RIRPF arts. 28-39; Orden HAC/1347/2024 (módulos de 2025); Manual c07-c09 | `D/rentaActivity.ts`, `finances/domain/annualActivity.ts`, `objectiveModules.ts`, `agrarianModules.ts` | `rentaActivity.test.ts`, `annualActivity.test.ts`, `objectiveModules.test.ts`, `rentaFromAutonomo.test.ts`, `casosModulos.test.ts` | c07-01 y c08-01 (fuera del banco) | **parcial**. **Falta** la reducción del 30 % de actividades artísticas de 2025 (c07-02). El caso agrario c09-01, con la PAC repartida, queda para la siguiente ola. Solo una actividad |
| Reducciones de la base: planes de pensiones (1.500 + 8.500, 30 %), plan del cónyuge, pensión compensatoria con el remanente al ahorro, conjunta | LIRPF arts. 50-55, 84; Manual c13 | `basesOf` | `rentaCalc.test.ts`, `rentaBaseCap.test.ts`, CO | c13-01 | **parcial**. **Falta**: los excesos de años anteriores, el cuadro del art. 52.1 (aportación del trabajador al plan de empleo según lo que aporta la empresa), el seguro de dependencia y el patrimonio protegido (c13-02 y la parte del hijo del c13-01) |
| Mínimo personal y familiar, estatal y autonómico | LIRPF arts. 56-61; Manual c14; mínimos propios de cada comunidad en `R/ccaa/*.ts` | `computeMinimum`, `mergeMinimums`, `withPartner` | `rentaCalc.test.ts`, Prop., CO | c14-01, c14-02 (individual), c14-03 | **cubierto**. Corregido: el incremento por adopción (§4). **Falta**: las rentas de los hijos (más de 8.000 €, o declaración propia con más de 1.800 €, art. 58.1), por eso la conjunta del c14-02 queda en parte. **Dudoso**: los mínimos de Aragón, Cantabria, Castilla-La Mancha, Extremadura y Murcia, que se presumen iguales a los estatales |
| Escalas estatal y autonómica, escala del ahorro y anualidades por alimentos | LIRPF arts. 63-66 y 74-76; Manual c15; escalas de 2025 en `R/state.ts`, `R/estado-extra.ts` y `R/ccaa/*.ts` (cada una con su URL) | `applyScale`, `applyMinimum`, `generalQuota` | `rentaCalc.test.ts`, Prop., CO | c15-01 (Aragón), c15-02 (Comunitat Valenciana) | **cubierto** en las 15 comunidades de régimen común, Ceuta y Melilla. Las propiedades comprueban que no hay cuotas negativas, que todo va al céntimo y que más sueldo nunca da menos cuota |
| Deducciones estatales: vivienda y alquiler del régimen transitorio, donativos con el 10 %, eficiencia energética, vehículo eléctrico y doble imposición | LIRPF arts. 68-70, 80, DT 15.ª y DT 18.ª; Ley 49/2002 arts. 19-22; Manual c16 | `deductionAmount`, `incomeFactor`, `D/rentaDonations.ts`, `doubleTaxationOf` | `rentaCalc.test.ts`, `rentaDonations.test.ts`, CO | c16-01, c16-03 | **cubierto**. **Falta**: la comprobación del aumento de patrimonio en la vivienda (c16-02; la base la escribe la persona) |
| Deducciones autonómicas por comunidad (366, con requisitos y casilla del anexo B) | Guías de deducciones autonómicas 2025 de la AEAT (URL en cada deducción de `R/ccaa/*.ts`) y `R/requisitos/` | `deductionsOf`, `capFactors`, `D/rentaRequirements.ts` | `requisitos.test.ts`, Banco, `rentaData.test.ts` | ninguno: el Manual no trae casos autonómicos | **parcial**. Sin caso oficial por comunidad; las incompatibilidades entre deducciones no se bloquean; hay casillas **dudosas** anotadas en [informe-gestor-real.md](informe-gestor-real.md) §5 P0-4 |
| Deducciones de la cuota diferencial: maternidad, guardería, familia numerosa, discapacidad y abonos anticipados | LIRPF arts. 81 y 81 bis; Manual c18 | `deductionsOf`, `capped`, `advanceOf` | `rentaCalc.test.ts`, CO | c18-01, c18-02 | **cubierto**. Corregido: los 150 € de la maternidad (§4). El importe de la guardería lo escribe la persona |
| Retenciones y pagos a cuenta (0596-0609) | Orden 100, páginas 24-25 | `computeRenta` (`withheld`) | `rentaCalc.test.ts`, Banco | c05-01 (retención solo de dato) | **cubierto**: son importes que escribe la persona o que salen de los ficheros |
| Tributación conjunta (3.400 / 2.150 €, mínimos, escalas, 30 % de los planes por miembro) | LIRPF arts. 82-84; Manual c13 y c14 | `D/rentaJoint.ts`, `computeRenta` (`joint`) | `rentaJoint.test.ts` | c14-01 (conjunta), c14-02 (en parte) | **parcial**: los hijos se suponen sin rentas; la deducción de 340 € con dos perceptores se deja fuera |
| Comparativa (individual frente a conjunta, borrador frente a app) | — (aritmética de dos resultados) | `rentaJoint.compareJoint`, `D/rentaCompare.ts` | `rentaCompare.test.ts`, `rentaJoint.test.ts` | — | **cubierto** |
| Resultado a ingresar o a devolver (casilla 0670) | Orden 100, página 25 | `computeRenta` (`result`) | Prop. (resultado = cuota líquida − pagos a cuenta + anticipos), Banco | c18-01, c18-02 | **cubierto** |
| Residencia y fuera de alcance | LIRPF art. 9; Ley 12/2002 y Ley 28/1990 (forales) | `D/rentaResidence.ts`; `regime: 'foral'` en `R/ccaa` | `rentaResidence.test.ts`, Prop. | — | Navarra y el País Vasco se marcan como forales y no se calculan. En Ceuta y Melilla, la deducción del 60 % (art. 68.4) la escribe la persona. No residentes, desplazados (art. 93) y regímenes especiales: fuera de alcance, se avisa |
| Ejercicios 2023-2024 | — | Las reglas son las de 2025 (sin versión por año) | — | — | **falta** (P0-1 del informe): una declaración de 2023 o 2024 se calcularía con las cifras de 2025 |

## 3. Casos oficiales de la Renta sin reproducir y por qué

| Caso | Motivo |
|---|---|
| c04-05 | Usufructo temporal: amortización = coste / años, hasta los ingresos. El motor no amortiza derechos |
| c05-02 | Arrendamiento de negocio: capital mobiliario de la base general |
| c05-03 | Préstamo a vinculada (art. 46.a) y obligaciones bonificadas |
| c07-02 | Reducción del 30 % de actividades artísticas, novedad de 2025 |
| c09-01 | Agraria con la PAC repartida entre cultivos: siguiente ola |
| c11-04, c11-05 | Coeficientes de abatimiento (DT 9.ª) y límite de 400.000 € |
| c11-08 | Reinversión en renta vitalicia de mayores de 65 (art. 38.3) |
| c13-02 | Excesos de años anteriores y cuadro del art. 52.1 |
| c16-02 | Comprobación del aumento de patrimonio (vivienda, régimen transitorio) |

Erratas y criterios de la fuente que no se copian:

- **c04-02**: el Manual imprime 388,13 € de amortización de muebles cuando su propia fórmula (10 % × 6.900 × 9/12) da 517,50 €; la cifra impresa prorratea dos veces. Por eso su rendimiento neto (3.287,09 €) es 129,37 € más alto que el del motor. Además, el Manual cuenta el año en meses y redondea al 63 % la parte de la construcción (29.120 / 46.200 = 63,03 %); el test lo reproduce con esos mismos datos.
- **c07-01**: las notas del Manual dicen 61.400 €; su tabla y su suma dan 58.100 €, que es lo que reproduce el motor.
- **c14-01**: una celda de la tabla dice 5.500 € donde el mínimo es 5.550 €.

## 4. Fallos corregidos en esta ola

| # | Severidad | Qué hacía mal | Fuente | Corrección | Test |
|---|---|---|---|---|---|
| 1 | Media | Con una vivienda alquilada solo parte del año, la amortización de los muebles se restaba entera | Manual c04, caso 2 (21-10-2026); RIRPF art. 14 | `YEARLY_EXPENSE` incluye la amortización escrita aparte | `rentaRentals.test.ts`, CO c04-02 |
| 2 | Media | Un hijo adoptado o acogido con 3 años o más no recibía el incremento de 2.800 € (unos 532 € menos de cuota en la escala mínima) | LIRPF art. 58.2; Manual c14, ejemplo 6 | `Child.adopted` y una casilla nueva en la familia (es/en) | `rentaCalc.test.ts`, `rentaForm.test.ts`, `rentaPlanner.test.tsx`, CO c14-03 |
| 3 | Media | La deducción por maternidad no sumaba los 150 € del mes de los 30 días cotizados (el texto lo prometía) | LIRPF art. 81.1; Manual c18, caso a | `Deduction.startBonus` y la pregunta «hijos con los 150 €» (es/en), con el tope de 1.350 € por hijo | `rentaCalc.test.ts`, `rentaDeductionsStep.test.tsx`, CO c18-01 |
| 4 | Media | 347: una devolución de otro año por más de 3.005,06 € en valor absoluto no se declaraba | Preguntas frecuentes del 347 de la AEAT (caso 347-02) | Umbral en valor absoluto, con el importe negativo | `casosOficialesAutonomos.test.ts` |
| 5 | Baja | 720: avisaba de declarar la baja de un bien sin haber presentado nunca un 720 | RGAT art. 42 bis.5; preguntas frecuentes del 720 | Solo avisa si hubo un 720 anterior | `casosOficialesAutonomos.test.ts`, `annualReturns.test.ts` |

## 5. Matriz: modelos del autónomo

Fuentes: Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)), RIVA (RD 1624/1992), RGAT (RD 1065/2007, [BOE-A-2007-15984](https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984)), [Manual práctico de IVA 2025](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025.html), las instrucciones y los diseños de registro de cada modelo en la sede de la AEAT, y la Orden PJC/297/2026 (cotización de 2026). «COA» = `frontend/src/__tests__/casos/casosOficialesAutonomos.test.ts`; «BE» = `backend/src/tests/domain/`.

| Modelo y bloque | Fuente | Implementación | Tests | Casos | Estado y notas |
|---|---|---|---|---|---|
| 130: casillas 01-19, acumulado, casilla 05 (suma de las 07 positivas anteriores), minoración de la 13, retenciones de la 06, agrario | [Instrucciones del 130](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html); RIRPF art. 110 | `backend/src/domain/services/autonomo.ts` `draft130`, `carryOf`, `agrarianSection`; `finances/domain/annualActivity.ts` `estimate130` | BE `autonomo-properties.test.ts` (150 años; escalones de la 13 en 9.000 / 9.000,01 / 10.000 / 11.000 / 12.000 / 12.000,01), `autonomo-filed130.test.ts`, `autonomo-activity.test.ts`, `annualActivity.test.ts` | 130-02 | **cubierto**. Sin actividad el año anterior la casilla 13 toma 0 € de rendimiento y aplica los 100 € (instrucciones del 130, casilla 13: «se considerará que la cuantía de los rendimientos netos del ejercicio anterior, son cero», comprobado 22-10-2026): la pantalla distingue «el año pasado no tuve actividad» (0 €) de dejarlo vacío (desconocido, sin minoración); también la casilla 09 del 131. Prueba BE «takes 0 € … when there was no activity» (3.000 − 1.000 € por trimestre → 13 = 100, 19 = 300). Falta la 16 (vivienda), la 18 (complementaria) y el 8 % de Ceuta y Melilla |
| 131 | Instrucciones del 131; órdenes de módulos HAC/1347/2024 y HAC/1425/2025 | `finances/domain/module131.ts` `form131`, `objectiveModules.ts` `instalments131` | `annualReturns.test.ts`, `objectiveModules.test.ts` | ninguno oficial | **parcial**: una actividad |
| 303: devengado (27) y deducible (45); 46 = 27 − 45; tipos 21/10/4 % y recargos 5,2/1,4/0,5/1,75 % | LIVA arts. 90-91, 161; diseño del 303 de 2026 | `backend/.../autonomo-vat.ts` `accruedOf`, `deductibleOf`, `quarter303` | BE `autonomo-properties.test.ts`, `autonomo-vat.test.ts`, `autonomo-vat-official.test.ts` | 303-01 a 303-04 | **cubierto** en 2025-2026. **Falta**: los tipos temporales del 5 % y del 2 % de 2023-2024 y sus recargos (0,62 % y 0,26 %) |
| 303: prorrata | LIVA arts. 102-106 | `autonomo-vat.ts` | `autonomo-vat.test.ts` | ninguno oficial | **parcial** |
| 303: recargo de equivalencia | LIVA arts. 154-163 | `autonomo-vat.ts` | casos oficiales | 303-01 a 303-04 | **cubierto** |
| 303: criterio de caja (62-63, 74-75) | LIVA arts. 163 decies-163 sexiesdecies | `autonomo-vat.ts` | `autonomo-vat.test.ts` | ninguno | **parcial** |
| 303: REAGP | LIVA arts. 124-134 | casilla 42 del comprador; el agricultor solo recibe aviso | `autonomo-vat.test.ts` | ninguno | **parcial** |
| 303: régimen simplificado (página 2, 47-71) | LIVA arts. 122-123; Orden de módulos | `finances/domain/vatSimplified.ts` `vatSimplified` | `vatSimplified.test.ts`, COA | 303-05, 303-06 | **cubierto** para una actividad; el backend solo avisa |
| 303: inversión del sujeto pasivo e intracomunitarias | LIVA art. 84.Uno.2.º y art. 85 | `autonomo-vat.ts` | `autonomo-vat.test.ts` | 303-01, 303-02 | **cubierto** |
| 303: compensación (110 / 78 / 87 / 72 / 73) | Instrucciones del 303, apartados 6 y 8; LIVA art. 99.Cinco | `autonomo-vat.ts` | BE `autonomo-properties.test.ts`, `autonomo-vat.test.ts` | 303-02 a 303-04 | **cubierto** |
| 390 | Diseño de 2025 (el de 2026 no está publicado: **dudoso**) | `backend/.../autonomo-390.ts` `draft390` | `autonomo-vat-official.test.ts` | 390-01, 390-02 | **cubierto** en régimen general; simplificado y sectores diferenciados, no |
| 349 | Manual de IVA 2025, cap. 9 | `backend/.../autonomo-349.ts` `draft349` | `autonomo-vat-official.test.ts` | 349-01, 349-02 | **cubierto**; el NIF-IVA solo se valida por el prefijo |
| 111 | [Instrucciones del 111](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/pagos-cuenta/modelo-111-reten_____moniales-imputaciones-renta-autoliquidacion_/instrucciones.html) (casillas 29-30 y «Complementaria», 22-10-2026) y diseño dr111e16v18 (538 «X», 539-551 justificante); RIRPF arts. 95 y 101; LGT art. 122.2 | `finances/domain/withholdings.ts` `withholdingsFor`, `form111`; fichero `aeatFiles/models.ts` `plan111` | `withholdings.test.ts`, `withholdingModels.test.ts`, `aeatFiles.test.ts`, `autonomoWithholdings.test.tsx`, COA | 111-01 y 111-02 (de apoyo); complementaria a mano (300 − 120 = 180 €) | **parcial**: la complementaria ya se calcula (29 = resultado del presentado, 30 = 28 − 29; si no sale a pagar más, aviso y sin fichero: es una rectificación). Falta especie de actividades, premios, forestales y derechos de imagen; la vista previa en papel no marca la casilla «complementaria» |
| 115 | Diseño DR115e15v13 (casillas 04 y 05 = 03 − 04; 192 «X», 193-205 justificante); RIRPF art. 101.8; LGT art. 122.2 (las instrucciones del 115 en la sede no detallan la casilla 04: se sigue el diseño y la regla del 111) | `withholdings.ts` `form115`; `aeatFiles/models.ts` `plan115` | `withholdings.test.ts`, `aeatFiles.test.ts`, COA | 115-01 (de apoyo) entero: 190 − 150 = 40 | **cubierto** con caso de apoyo; la vista previa en papel no marca la casilla «complementaria» |
| 180 | Diseño de 2023 (no hay de 2024-2026: **dudoso**) | `finances/domain/annualSummaries.ts` `summary180` | `annualReturns.test.ts`, `annualForms.test.ts` | ninguno | **parcial** |
| 190 | Instrucciones del 190 de 2025 | `annualSummaries.ts` `summary190` | `annualReturns.test.ts`, COA | 190-01 (de apoyo) | **parcial**: los empleados (clave A) solo con totales escritos |
| 347 | RGAT arts. 31-35; [preguntas frecuentes del 347](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-347-decla_____racion-anual-operaciones-personas_/preguntas-frecuentes.html) | `annualSummaries.ts` `summary347`, `cashAccrued`; libro de facturas `invoiceBook.ts` (columnas de cobro y pago); fichero `aeatFiles/informative.ts` `write347` | `annualReturns.test.ts`, `annualForms.test.ts`, `aeatAnnualFiles.test.ts`, `vatBook.test.ts`, `autonomoAnnual.test.tsx`, COA | 347-01 a 347-04 enteros | **cubierto**. Criterio de caja (RGAT arts. 33.1, 34.1.j y 35.1; LIVA art. 163 terdecies; diseño 347.pdf, 281 y 284-299; comprobado 22-10-2026): registro aparte, importe por la regla general y lo devengado por caja en el año (cobros del año y, de una factura del año anterior, lo pendiente el 31-12), sin trimestres; sin trimestres en ningún registro si la persona factura en criterio de caja. Sin los cobros de una factura de caja no hay fichero (aviso). **Dudoso**: si entran las facturas con retención; el registro del año siguiente se hace cuando la persona superó el umbral el año de la factura (lo da el ejemplo de la AEAT, no el RGAT). **Límite**: la pantalla del año solo tiene las facturas de ese año, así que lo cobrado este año de facturas del año pasado no se suma; un cobro por fila del libro |
| 720 y 721 | RGAT arts. 42 bis-42 quater y 54 bis; preguntas frecuentes del 720 | `finances/domain/wealthWarnings.ts` (solo avisos) | `annualReturns.test.ts`, COA | 720-01 a 720-03 | **parcial**: un solo valor por bloque, cuando la norma compara por separado el saldo a 31-12 y el medio del 4T; la pantalla no pasa la última declaración presentada |
| RETA | Orden PJC/297/2026; LGSS art. 308 | `D/retaCalc.ts` `retaQuote`; backend `autonomo.ts` `retaFor` | `retaCalc.test.ts`, BE `reta.test.ts`, COA | RETA-01 y RETA-02 (rendimiento, 7 % y rendimiento computable) | **parcial**: la cuota de 2023 no se puede comprobar con la tabla de 2026; falta la regularización anual; la tarifa plana de 2026 no tiene fuente |
| Modelo 100 de 2023 y 2024; modelos 303 de 2023 y 2024 | — | Cifras de 2025-2026 | Propiedades del 130 y del 303 de 2023 a 2025 | — | **parcial**: 130 y 303 sirven en 2023-2025, salvo los tipos temporales de IVA; la Renta, no (sin versión por año) |

## 6. Dudas abiertas (para decidir o confirmar)

1. **Reparaciones en un alquiler de parte del año.** El Manual (c04-02) prorratea una reparación sin fecha; el motor toma lo que escribe la persona. ¿Se prorratea también, o se pide la fecha? Hoy el texto de ayuda no lo explica.
2. **Rentas de los hijos (art. 58.1).** No se preguntan, así que un hijo con más de 8.000 €, o que presenta su declaración con más de 1.800 €, cuenta igual para el mínimo. Hace falta una pregunta.
3. ~~**130 sin actividad el año anterior**~~: resuelto el 22-10-2026 con las instrucciones del 130 (0 € de rendimiento, 100 € de minoración).
7. **347 de caja de facturas del año anterior:** la pantalla del año no tiene las facturas del año pasado. ¿Se pide el importe a mano o se guardan las facturas de caja pendientes de cobro de un año a otro?
8. **Complementarias en la vista previa en papel:** el fichero lleva la marca, la vista previa del 111 y del 115 no.
4. **Tipos de IVA de 2023-2024** (5 % y 2 %, con sus recargos): sin soporte.
5. **720:** pedir por separado el saldo a 31-12 y el saldo medio del 4T de cada bloque.
6. **Versionado por ejercicio de la Renta** (P0-1): hecho el 22-10-2026 para 2024, 2025 y 2026 ([reglas-por-ejercicio.md](reglas-por-ejercicio.md)). Faltan las comunidades de 2024 y 2026 y lo que dependa del RDL 29/2026.

## 7. Siguiente ola propuesta

1. Coeficientes de abatimiento de la DT 9.ª con el límite de 400.000 € (c11-02, c11-04, c11-05): afecta a quien vende inmuebles o acciones comprados antes de 1995.
2. Excesos de planes de pensiones y cuadro del art. 52.1 (c13-02); reducción artística del 30 % (c07-02); caso agrario c09-01.
3. Pregunta de las rentas de cada hijo y conjunta con repartos distintos por hijo (c14-02).
4. Capital mobiliario de la base general (c05-02, c05-03) y usufructo temporal (c04-05).
5. Versionado por ejercicio (2024, 2025 y 2026) con pruebas contra la fuente de cada año.
6. Tipos de IVA de 2023-2024 (el 347 por criterio de caja y las complementarias del 111 y del 115 quedaron hechos el 22-10-2026).
