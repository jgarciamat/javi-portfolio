# Mapa de cobertura: qué hace hoy Finanverso frente a la norma

> Información orientativa, no asesoramiento fiscal. Verifica siempre en la fuente oficial. Fecha de comprobación: **19-10-2026**, sobre la rama `develop` de ese día.

Datos legibles por máquina en **[cobertura.json](cobertura.json)**: el estado de cada casilla, los resúmenes, los modelos, las discrepancias y las cifras verificadas. El catálogo de referencia es [renta-casillas.json](renta-casillas.json).

## Cómo se ha medido

Se leyó el código sin modificarlo:

- Renta: `frontend/src/modules/tools/domain/rentaCalc.ts`, `rentaForm.ts`, `rentaDraft.ts`, `rentaCompare.ts`, `rentaJoint.ts`, `rentaWork.ts`, `rentaData.ts`, `rentaExtras.ts`, `rentaCampaign.ts` y `frontend/src/modules/tools/data/renta/**`.
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

| Medida | Casillas | Calculadas + leídas | Con parciales |
|---|---|---|---|
| Todas las casillas (2.275) | 2.275 | **3,8 %** | 25,5 % |
| Todas, sin el anexo B de deducciones autonómicas | 1.780 | **4,9 %** | 7,9 % |
| **Núcleo del asalariado** (A, C, H, I, J, K y M; solo importes) | 259 | **29,7 %** | **46,3 %** |

En pocas palabras: la app cubre bien el caso «nómina o pensión + algún alquiler o inmueble vacío + ahorro escrito como una cifra + mínimos + deducciones por catálogo», y nada de actividades económicas, ganancias patrimoniales detalladas, regímenes especiales ni anexos informativos.

### Por apartado

| Apartado | Casillas | Calculado | Leído | Parcial | No soportado | Plena | Con parcial | Con parcial, solo importes |
|---|---|---|---|---|---|---|---|---|
| ID · Identificación | 70 | 2 | 5 | 4 | 59 | 10,0 % | 15,7 % | — |
| A · Trabajo | 27 | 8 | 5 | 2 | 12 | 48,1 % | 55,6 % | 60,0 % |
| B · Capital mobiliario | 32 | 0 | 0 | 3 | 29 | 0 % | 9,4 % | 10,7 % |
| C · Inmuebles | 94 | 3 | 11 | 7 | 73 | 14,9 % | 22,3 % | 31,1 % |
| D · Estimación directa | 62 | 0 | 0 | 0 | 62 | 0 % | 0 % | 0 % |
| D · Módulos | 44 | 0 | 0 | 0 | 44 | 0 % | 0 % | 0 % |
| D · Agrarias en módulos | 79 | 0 | 0 | 0 | 79 | 0 % | 0 % | 0 % |
| E · Regímenes especiales | 92 | 0 | 0 | 0 | 92 | 0 % | 0 % | 0 % |
| F · Ganancias sin transmisión | 34 | 0 | 0 | 0 | 34 | 0 % | 0 % | 0 % |
| F · Ganancias por transmisión | 155 | 0 | 0 | 0 | 155 | 0 % | 0 % | 0 % |
| F · Exit tax y fusiones | 14 | 0 | 0 | 0 | 14 | 0 % | 0 % | 0 % |
| G · Integración y compensación | 10 | 0 | 0 | 2 | 8 | 0 % | 20,0 % | 20,0 % |
| H · Bases imponibles | 24 | 3 | 0 | 0 | 21 | 12,5 % | 12,5 % | 12,5 % |
| I · Reducciones | 39 | 3 | 4 | 2 | 30 | 17,9 % | 23,1 % | 30,8 % |
| J · Bases liquidables | 13 | 6 | 0 | 2 | 5 | 46,2 % | 61,5 % | 61,5 % |
| K · Mínimos | 14 | 10 | 0 | 4 | 0 | 71,4 % | 100 % | 100 % |
| L · Datos adicionales | 33 | 0 | 0 | 0 | 33 | 0 % | 0 % | 0 % |
| M · Cuotas, deducciones y resultado | 142 | 22 | 5 | 27 | 88 | 19,0 % | 38,0 % | 55,2 % |
| M · Parte de la CCAA | 3 | 0 | 0 | 0 | 3 | 0 % | 0 % | 0 % |
| N · Regularización y devolución | 16 | 0 | 0 | 0 | 16 | 0 % | 0 % | 0 % |
| Anexos A.1-A.6 · Deducciones estatales (detalle) | 223 | 0 | 0 | 0 | 223 | 0 % | 0 % | 0 % |
| Anexos B.1-B.10 · Deducciones autonómicas | 495 | 0 | 0 | 441 | 54 | 0 % | 89,1 % ¹ | 100 % ¹ |
| Anexos B.11-B.15 · Información autonómica | 220 | 0 | 0 | 0 | 220 | 0 % | 0 % | 0 % |
| Anexos C.1-C.5 · Información adicional | 292 | 0 | 0 | 0 | 292 | 0 % | 0 % | 0 % |
| Anexo D · Gastos de inmuebles | 48 | 0 | 0 | 0 | 48 | 0 % | 0 % | 0 % |

¹ El anexo B se marca PARCIAL en bloque. La app tiene un catálogo de deducciones de las 17 comunidades (`data/renta/ccaa/*.ts`) y calcula las que elige el usuario, pero sin vincular cada una con su casilla ni comprobar todos los requisitos. Es la cifra más optimista del mapa.

### Casillas calculadas o leídas (lo que sí hace la app)

| Casillas | Estado | Dónde | Regla y límites |
|---|---|---|---|
| 10, 11, 70, 77, 92 (identificación) | LEÍDO | `rentaDraft.ts` | Edad a 31-12, discapacidad (0/33/65), comunidad, edades de hijos y ascendientes desde el borrador |
| 68/69 | CALCULADO | `rentaJoint.ts` | Compara la declaración individual con la conjunta y recomienda una |
| 0003, 0013-0016 | LEÍDO | `rentaForm.ts` | Bruto, Seguridad Social (6,5 % si se deja vacía), sindicatos, colegios (hasta 500 €), defensa jurídica (hasta 300 €) |
| 0017-0022 | CALCULADO | `rentaCalc.ts workIncome` | 2.000 € de otros gastos, +2.000 € de movilidad, +3.500/7.750 € por discapacidad en activo; en conjunta, regla del Manual (un incremento por discapacidad, el del mayor grado) |
| 0023, 0025 | CALCULADO | `rentaWork.ts` | Art. 20 LIRPF con el límite de 6.500 € de otras rentas |
| 0083-0089, 0155 | LEÍDO / PARCIAL | `rentaForm.ts unrentedOf` | 2 % o 1,1 % del valor catastral, prorrateado por meses |
| 0102-0156 | LEÍDO / PARCIAL | `rentaForm.ts rentalOf`, `rentaCalc.ts rentalNet` | Un alquiler agregado: intereses y reparación hasta los ingresos, resto de gastos, amortización del 3 % del coste de construcción, reducción del 50/60/70/90 % |
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
| 0670 | PARCIAL | `rentaCalc.ts` | Sin los abonos anticipados (D03) |

El JSON detalla una a una las 87 casillas calculadas o leídas y las 494 parciales.

### Novedad posterior a la medición: inversiones (19-10-2026)

Sin volver a medir los porcentajes de arriba: con «Importar mis inversiones» ([inversiones.md](inversiones.md)) la app **calcula** a partir de los archivos de brókers y exchanges los totales que hay que copiar en los apartados de IIC (0312, 0315, 0316, 0321, 0322), acciones negociadas (0328, 0331, 0332, 0337, 0338) y monedas virtuales (1802-1814, agrupados por moneda y clave), los rendimientos 0027, 0029, 0031 y 0037, las retenciones 0597 y 0603 (dentro de la 0609) y la deducción 0588. Las casillas de identificación (NIF del fondo, entidad emisora) siguen siendo **LEÍDAS** del certificado por la persona. Derivados en 1624-1640 y recompensas en 0304: **PARCIAL** (criterio NO CONFIRMADO).

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
| **131** | CALCULADO (dominio, 19-10-2026) | `module131.ts form131`; el lector lo reconoce y avisa | 01-15 | Instrucciones del 131 (AEAT) | El rendimiento neto por módulos (orden anual) lo da la persona; temporada; sin pantalla. Vista previa lista (`Model131FormPreview`, facsímil de BOE-A-2015-1656 pág. 8) para engancharla cuando haya pantalla |
| **720, 721, 714** | AVISOS (19-10-2026) | `wealthWarnings.ts`, panel `AutonomoAnnual.tsx` | — | RGAT 42 bis/ter/quater y 54 bis; Ley 19/1991 arts. 4.Nueve, 28.Dos y 37 | No se calcula el impuesto (mínimos y bonificaciones autonómicas) |
| **102, 309, 369, 036** | NO SOPORTADO | — | — | 0 % | Ver [modelos.md](modelos.md) y [hoja-de-ruta.md](hoja-de-ruta.md) |

**Enlace entre modelos (actualizado el 19-10-2026):** el contrato anual `frontend/src/modules/finances/domain/annualActivity.ts` lleva los ingresos, gastos (con amortización, provisiones y difícil justificación), subvenciones, rendimiento neto, retenciones (0599) y pagos del 130 (0604) a las casillas de la Renta; ver [contrato-actividad-anual.md](contrato-actividad-anual.md). Falta que el motor de la Renta lo consuma. **Antes:** no existía. El rendimiento acumulado del 130 (backend) no llega al apartado D de la Renta ni los pagos fraccionados a la casilla 0604, y las retenciones del 111/115 que practica el autónomo no se usan en ninguna parte del 100 (son de terceros, así que es correcto). Lo que falta es que **las retenciones que le practican sus clientes** (casilla 06 del 130) lleguen a la 0599 de la Renta.

## Discrepancias encontradas (de mayor a menor gravedad)

Severidad: **bug probable** (la app da un resultado distinto del que exige la norma en casos reales), **duda** (simplificación que puede dar un resultado distinto en algunos casos) y **mejora** (exactitud, trazabilidad o normativa futura).

| Id | Severidad | Área | Qué pasa | Norma y fuente | Impacto | Propuesta |
|---|---|---|---|---|---|---|
| D01 | **bug probable** | Renta · 0517/0518 | El mínimo por discapacidad no suma los **3.000 € de gastos de asistencia** (obligatorios con ≥ 65 %, o con ayuda de terceros o movilidad reducida). `rentaCalc.ts` y `rentaCompare.ts` no usan `assistance`, aunque `salaryCalc.ts` sí. | LIRPF art. 60.1-60.2 ([BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); [cuadro de mínimos del Manual 2025](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/cuadro-minimos-personales-familiares-estatal-autonomicos.html) | Unos 570 € más de cuota por persona con ≥ 65 % en el primer tramo; la comparación con el borrador atribuye la diferencia a otra causa | Sumar la asistencia, preguntar por la ayuda de terceros o la movilidad reducida y aplicar también los 7.750 € de gastos del trabajo en ese caso |
| D02 | **bug probable** | Renta · planes de pensiones | La aportación **propia** no se limita a 1.500 €: se suman propia y empresa y se limita el total a 10.000 €. | LIRPF art. 52.1.b) | Con 5.000 € propios sin empresa se reducen 3.500 € de más (≈ 1.050 € al 30 %) | Límite propio de 1.500 € + tabla del 8.500 €; base del 30 % con actividades; exceso a 5 años |
| D03 | **bug probable** | Renta · 0670 | El resultado no suma los **abonos anticipados** cobrados (modelos 140/143): casillas 0612, 0624, 0637, 0249, 0661 y 0663. | Fórmula impresa de 0670 ([BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf), página 25); LIRPF arts. 81 y 81 bis | Devolución inflada en hasta 1.200 € (2.400 €) por deducción | Preguntar si se cobra cada mes y leer esas casillas del borrador |
| D04 | **bug probable** | Renta · Baleares | Mínimo del contribuyente **mayor de 65 años: 6.105 €** (más 1.265 €). La app usa 5.550 € + 1.265 €. | [Manual 2025, mínimos de Baleares](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/comunidad-autonoma-illes-balears.html) (DLeg 1/2014 de Baleares, art. 2) | ≈ 50 € de cuota autonómica | Añadir `personalOver65` a los mínimos autonómicos |
| D05 | **CORREGIDA (19-10-2026)** | Autónomo · 303 | Las ventas sin IVA se llevan a la **casilla 150 (tipo 0 %)**. Las intracomunitarias van a la 59, las exportaciones a la 60, las no sujetas a la 120/123 y las de inversión del sujeto pasivo a la 122. El lector de PDF hace lo contrario (lee 59 + 60 como «0 %»). | [Instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html) | 303 mal cumplimentado para profesionales con clientes extranjeros o con servicios exentos | Pedir el motivo de la ausencia de IVA y mapearlo a su casilla |
| D06 | **bug probable** | Renta · deducciones del art. 68 | Donativos, interés cultural, incentivos empresariales, Ceuta y Melilla, La Palma y alquiler transitorio se restan **100 % de la cuota estatal**; la ley y el modelo las reparten 50/50 (parejas de casillas estatal y autonómica). | LIRPF art. 68; modelo 100, página 22 | Tope por cuota mal aplicado cuando una cuota no alcanza; desglose distinto del borrador | Campo «parte estatal» en cada deducción |
| D07 | **bug probable** | Renta · 0507 | El remanente de la pensión compensatoria no reduce la base del ahorro. | LIRPF art. 50.2 | Raro | Llevarlo a la base del ahorro, como la 0506 |
| D08 | duda | Renta · 0414 | El tope de los 340 € es la cuota restante, no la «parte de cuota proporcional a los rendimientos del trabajo»; en conjunta con dos perceptores se omite. | [Manual 2025, DA 61.ª](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion/deducciones-cuota-liquida-total/deduccion-obtencion-rendimientos-trabajo.html) | Pequeño, con otras rentas | Tope proporcional |
| D09 | duda | Renta · 0588 | La doble imposición internacional se resta de la cuota íntegra estatal, no de la cuota líquida total. | LIRPF art. 80 | Orden y tope | Paso propio tras 0587 |
| D10 | duda | Renta · apartado C | Todos los inmuebles arrendados van **agregados**: los topes de gastos y la reducción del 23.2 son por inmueble; la amortización solo usa el coste de construcción (la ley dice el mayor de coste o valor catastral, sin suelo). | LIRPF art. 23 | Errores con varios pisos o con pérdidas | Modelar cada inmueble |
| D11 | duda | Renta · 0151 | La reducción del 30 % por irregularidad figura como alternativa a la del 23.2; son casillas y reglas distintas. | Modelo 100, página 7 | Raro | Separarlas |
| D12 | duda | Renta · 0085/0089 | La imputación se prorratea por meses (la ley, por días) y no se aplica el 50 % del valor de adquisición cuando no hay valor catastral. | LIRPF art. 85 | Euros | Usar días |
| D13 | duda | Renta · 0008 | La contribución empresarial al plan reduce la base pero no se suma como rendimiento del trabajo. | Modelo 100 (0008 dentro de 0012) | Base infravalorada si el bruto no la incluye | Pedirla como especie o avisar |
| D14 | duda | Renta · lectura del borrador | «0010/0011/0077/0092» son casillas de identificación del **borrador**; en el impreso, esos números con 4 cifras son otras casillas. | Modelo 100, páginas 1-2 y 4-6 | Lectura errónea si se sube otro documento | Validar la etiqueta junto al número |
| D15 | mejora | Renta · comparación | `ourBoxes` mezcla 0019 con 0020/0021. | Modelo 100, página 4 | Diferencias falsas | Comparar por separado |
| D16 | mejora | Renta · 0013 | Seguridad Social estimada al 6,5 % (en 2025 era el 6,48 %). | [Orden PJC/297/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296) (2026) | Céntimos | Tipo por ejercicio |
| D17 | mejora | Renta · donativos | El usuario escribe la deducción, no lo donado, y no se aplica el límite del 10 % de la base liquidable. | Ley 49/2002 arts. 19-20 | Riesgo de deducir el 100 % | Pedir lo donado y calcular |
| D18 | mejora | Autónomo · gastos | Atenciones a clientes deducibles al 100 % en el IRPF, sin el tope del 1 % de la cifra de negocios. | LIS art. 15.e (aplicable por el art. 28 LIRPF; no reverificado) | Gastos sobrestimados | Tope anual |
| D19 | mejora | Autónomo · calendario | Falta el **180** entre los resúmenes y no se consideran festivos. | [Calendario 2026](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html) | Aviso ausente | Añadir 180 (y 349) |
| D20 | mejora | RETA · cita | El código cita el «art. 15» de la Orden PJC/297/2026; la tabla del RETA está en el **art. 18.1**. | Orden PJC/297/2026 | Trazabilidad | Corregir el comentario |
| D21 | mejora | RETA · tarifa plana | 80 €/mes para 2026 sin fuente de 2026 (la cuantía la fija la LPGE, prorrogada). | LETA art. 38 ter | Probablemente correcto | Confirmar y citar. 19-10-2026: 80 € confirmado solo para 2023-2025 (RDL 13/2022, DT 5.ª, BOE-A-2022-12482); para 2026 y 2027 sigue NO CONFIRMADO (`fiscalFigures.ts` lo deja en null) |
| D22 | mejora | Normativa futura | **Art. 23.2 LIRPF** modificado en octubre de 2026: reducciones de 100, 95, 90, 85, 70 y 50 % (y de 40 a 15 % según la subida de la renta). Régimen transitorio NO CONFIRMADO. | LIRPF art. 23, historial de versiones | Renta 2026 en adelante | Versionar las reducciones por fecha de contrato |
| D23 | mejora | Normativa futura | **Art. 85 LIRPF desde el 1-1-2027**: imputación por escala sobre la suma de valores catastrales (1,1 / 1,5 / 2 / 3 %). | LIRPF art. 85 (redacción no vigente aún) | Renta 2027 | Escala por ejercicio |
| D24 | mejora | Normativa futura | **DA 61.ª en 2026**: 590,89 € hasta 17.094 €, a cero en 20.048,45 €. Las constantes de 340 € están en el código. | LIRPF DA 61.ª (redacción desde el 20-2-2026) | Escenario «año siguiente» | Mover a los datos del ejercicio |

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
