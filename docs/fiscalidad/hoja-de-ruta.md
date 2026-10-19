# Hoja de ruta: hacia una Renta y unos modelos de autónomo completos

> Información orientativa, no asesoramiento fiscal. Fecha de comprobación: **19-10-2026**. Se basa en [cobertura.md](cobertura.md) (qué hay hoy), [renta-casillas.json](renta-casillas.json) (qué pide el modelo) y [modelos.md](modelos.md).

## Criterios de orden

1. **Frecuencia:** cuántos usuarios de Finanverso (particulares con nómina o pensión, autónomos digitales y pequeños arrendadores) tienen ese caso.
2. **Riesgo:** cuánto se equivoca hoy la app (o cuánto promete) si el caso aparece.
3. **Palanca:** si reutiliza datos que la app ya tiene (libros de facturas, 130/303, borrador).

Esfuerzo: **S** (≤ 2 días), **M** (≤ 1 semana), **L** (2-4 semanas), **XL** (más de un mes o un experto fiscal dedicado).

## Resumen

| # | Bloque | Usuarios | Riesgo hoy | Esfuerzo | Casillas |
|---|---|---|---|---|---|
| 0 | Correcciones de las discrepancias D01-D07 | Muchos | Alto | **S-M** | 0517-0520, 0467-0468, 0670, 0512 (Baleares), 303-150, 0550-0563, 0507 |
| 1 | Actividades económicas en la Renta enlazadas con 130/303 (estimación directa) | Todos los autónomos | Alto: hoy el autónomo no puede hacer su Renta en la app | **L** | 0165-0237, 0186, 0196-0197, 0599, 0604 |
| 2 | Capital mobiliario detallado + integración y compensación | Casi todos (cuentas, dividendos) | Medio | **M** | 0026-0060, 0418-0460, C.3 |
| 3 | Ganancias patrimoniales: acciones, fondos, cripto e inmuebles | Muchos inversores | Alto (reglas complejas) | **XL** | 0281-0430, 1800-1846, 2224-2236, C.1-C.3 |
| 4 | Alquileres por inmueble y anexo D | Arrendadores | Medio | **L** | 0062-0156, anexo D, C.1 (excesos) |
| 5 | Lectura completa del borrador y de los datos fiscales | Todos | Bajo (mejora la confianza) | **M** | Todas las del borrador |
| 6 | Deducciones autonómicas vinculadas a su casilla, con requisitos | Muchos | Medio | **L** | Anexos B.1-B.15 |
| 7 | Mínimos y reducciones completos (discapacidad, anualidades a hijos, exentas con progresividad, excesos de planes) | Bastantes | Medio | **M** | 0462-0499, 0525-0527, 1741-1762, C.4 |
| 8 | Resúmenes del autónomo: 390, 190, 180, 347, 349 | Autónomos | Bajo (son sumas) | **M** | Modelos completos |
| 9 | 303 completo (intracomunitarias, inversión del sujeto pasivo, bienes de inversión, prorrata, caja) + 349 | Autónomos con UE o inversiones | Medio-alto | **L** | 303 10-45, 59-124; 349 |
| 10 | Versionado normativo por ejercicio (2026, 2027) | Todos | Alto a partir de enero | **M** | Constantes y datos |
| 11 | Patrimonio 714 y avisos 720/721 | Pocos | Bajo (solo avisos) | **S-M** | — |
| 12 | Módulos (131, apartado D-EO, 303 simplificado) | Pocos usuarios de la app | — | **XL** | 1441-1560 |
| 13 | Regímenes especiales, exit tax, no residentes (210), desplazados (151) | Muy pocos | — | **XL** (fuera de alcance) | E, F3, 210, 151 |

---

## Bloque 0 · Correcciones (S-M)

**Qué:** las 7 discrepancias «bug probable» de [cobertura.md](cobertura.md#discrepancias-encontradas-de-mayor-a-menor-gravedad):

- D01: asistencia en el mínimo por discapacidad, más la pregunta por la ayuda de terceros o la movilidad reducida.
- D02: límite propio de 1.500 € en planes de pensiones.
- D03: abonos anticipados de los modelos 140/143.
- D04: Baleares, mínimo del contribuyente mayor de 65 años.
- D05: casilla 150 del 303.
- D06: reparto 50/50 de las deducciones del art. 68.
- D07: remanente de la pensión compensatoria (0507).

**Reglas y fuentes:** LIRPF arts. 50.2, 52, 60, 68, 81 y 81 bis; instrucciones del 303 de 2026; Manual de Renta 2025, capítulo 14 (enlaces en cobertura.md).

**Datos nuevos que pedir:** «¿necesitas ayuda de otra persona o tienes movilidad reducida?»; «¿cobras esta deducción cada mes por anticipado? ¿cuánto has cobrado?»; en el 303, «¿por qué esta factura no lleva IVA? (cliente de la UE / de fuera de la UE / exenta / inversión del sujeto pasivo)».

**Validación:** tests de unidad con los ejemplos del capítulo 14 del Manual ([ejemplos prácticos](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/ejemplos-practicos.html)) y del capítulo 15 ([ejemplo de cuotas íntegras](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/ejemplo-practico-calculo-cuotas-integras-autonomica.html)).

**Riesgos:** ninguno legal; el riesgo es de regresión (en D06 cambia el desglose que se muestra).

---

## Bloque 1 · Actividades económicas en la Renta, enlazadas con 130 y 303 (L)

**Por qué primero:** la obligación de declarar es **universal** para quien estuvo de alta en el RETA ([Orden HAC/277/2026, art. 1.2](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)). La app ya tiene ingresos, gastos, cuotas y retenciones por trimestre (backend `autonomo.ts`, libros de facturas `invoiceBook.ts`), pero la Renta no los usa.

**Casillas:** 0165-0237 (estimación directa: ingresos 0171-0180; gastos 0181-0217; provisiones y difícil justificación 0219-0223; rendimiento neto 0224-0226; reducciones del art. 32: 0232-0234), 0186 (Seguridad Social del titular), 0196/0197 (regularización de cuotas del RETA), **0599** (retenciones de actividades), **0604** (pagos fraccionados del 130).

**Reglas clave:**
- LIRPF arts. 27-30. Modalidad simplificada: gastos de difícil justificación del 5 % con un máximo de 2.000 € (RIRPF art. 30; la app ya lo usa en el 130).
- Art. 30.2.5.ª: suministros de la vivienda al 30 % de la parte afecta, manutención con los límites del art. 9 RIRPF (26,67 €/día en España sin pernoctar) y seguros de salud (500 €/persona, 1.500 € con discapacidad). La app ya los aplica en `autonomo-expenses.ts`.
- Art. 32.1 (irregulares, 30 %) y 32.2 (reducción de 2.000 € y hasta 6.498 € para rendimientos netos de actividad inferiores a 19.747,5 € con los requisitos del 32.2.2.º: estimación directa, un solo cliente no vinculado o TRADE, etc.).
- Art. 32.3: inicio de actividad (20 % en el primer periodo con rendimiento positivo y el siguiente; NO CONFIRMADO el detalle en esta revisión).
- Gastos de atenciones a clientes hasta el 1 % de la cifra de negocios (D18).

**Datos que pedir o reutilizar:** epígrafe IAE y modalidad (036); criterio de cobros y pagos (0169); amortizaciones (tabla simplificada); los 130 presentados (ya se importan) para la 0604; retenciones que le practicaron (casilla 06 del 130) para la 0599; cuotas del RETA del año y su regularización.

**Validación:**
1. Cuadre: ingresos de la 0171 = suma de las bases del 303 (01 + 04 + 07 + 150 + 59 + 60...) del año, salvo diferencias explicadas por el criterio de imputación.
2. La 0604 debe coincidir con la suma de las casillas 19 positivas de los 130.
3. Ejemplos del capítulo 7 del Manual ([estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa.html)).
4. Un borrador real anonimizado de un autónomo en estimación directa simplificada.

**Riesgos:** confundir el criterio de devengo con el de caja; el IVA no deducible como gasto (la app ya lo trata); la amortización de bienes de inversión. Riesgo legal: que el usuario crea que el resultado es definitivo. Mostrar siempre los avisos de la sección final.

**Fuera conscientemente:** estimación directa normal con contabilidad del Código de Comercio (solo se aceptaría escribir los totales), entidades en atribución (apartado E) y actividades agrarias.

---

## Bloque 2 · Capital mobiliario detallado e integración y compensación (M)

**Casillas:** 0027-0041 (ahorro), 0045-0060 (general: arrendamiento de bienes muebles, asistencia técnica...), 0597 (retenciones), 0418-0460 (integración y compensación con el **límite del 25 %** entre rendimientos y ganancias del ahorro) y anexo C.3 (saldos negativos de 2021-2024).

**Reglas:** LIRPF arts. 25 y 26 (solo son deducibles los gastos de administración y depósito), 46 (qué va al ahorro), 48-49 (integración y compensación: 25 % cruzado y 4 años de arrastre). Las cifras de los arts. 66 y 76 ya están.

**Datos:** intereses, dividendos y seguros por separado, con sus retenciones (del certificado del banco o del borrador); saldos negativos pendientes del año anterior (la casilla correspondiente del anexo C.3 del borrador).

**Validación:** los ejemplos del capítulo 12 del Manual ([integración y compensación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html)).

**Fuera:** seguros con régimen transitorio (DT 4.ª), deuda subordinada y participaciones preferentes (DA 44.ª), planes de ahorro a largo plazo con incumplimiento.

---

## Bloque 3 · Ganancias patrimoniales: acciones, fondos, cripto e inmuebles (XL)

**Casillas:** F1 (0281-0362: premios, subvenciones, otras ganancias de la base general), F2 (0308-0400, 1624, 1800-1846 monedas virtuales, 1815 y siguientes inmuebles, 2224-2236), integración G y anexos C.1 (precio aplazado) y C.2 (reinversión).

**Reglas (LIRPF arts. 33-39, DT 9.ª):**
- **Acciones y fondos cotizados:** valor de transmisión menos valor de adquisición con gastos; **FIFO** (art. 37.2); los traspasos entre fondos no tributan (art. 94); la regla de los **dos meses** (art. 33.5.f) impide computar pérdidas si se recompran valores homogéneos; derechos de suscripción.
- **Cripto:** FIFO por moneda; las permutas entre criptomonedas tributan; el staking y el lending son capital mobiliario. Los exchanges extranjeros pueden obligar al 721.
- **Inmuebles:** adquisición más gastos y mejoras, menos amortizaciones practicadas; coeficientes de abatimiento de la DT 9.ª para bienes anteriores a 1995 (límite de 400.000 € de valor de transmisión acumulado); exención por reinversión en vivienda habitual (art. 38.1); exención de mayores de 65 años (art. 33.4.b); exención nueva de la DA 65.ª para ventas a entes públicos de vivienda (desde octubre de 2026: afecta a la Renta 2026).
- **Mayores de 65 que reinvierten en renta vitalicia** (art. 38.3).

**Datos:** fichero de operaciones del bróker o exchange (fecha, cantidad, precio, comisiones). Esto exige **importadores** (CSV de brókeres y exchanges), lo más caro del bloque.

**Validación:** casos prácticos del capítulo 11 del Manual ([ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html)) y los informes fiscales anuales de los brókeres como contraste.

**Riesgos:** alto. Un FIFO mal hecho o una permuta olvidada producen errores grandes. Recomendación: primero **leer** las casillas del borrador (que ya trae las ventas de valores cotizados con retención) y solo después calcular.

**Fuera:** canjes y fusiones (F3), elementos afectos a actividades, precio aplazado complejo, exit tax.

---

## Bloque 4 · Alquileres por inmueble (L)

**Casillas:** 0062-0156 por cada inmueble (referencia catastral, días, uso, NIF del arrendatario, ingresos, cada gasto, base de amortización 0123-0130, reducción 0150, irregular 0151, rendimiento mínimo por parentesco 0152), el anexo D (desglose voluntario de gastos) y el anexo C.1 (excesos de intereses y reparación de 2021-2024).

**Reglas:** LIRPF arts. 22-24 (topes **por inmueble**, 3 % del mayor de coste o valor catastral sin suelo, rendimiento mínimo con parientes) y art. 23.2 (en 2025, la redacción de la Ley 12/2023; para 2026, **versionar**: ver D22). Prorrateo por días de uso.

**Datos:** por inmueble: valor catastral total y de la construcción (del recibo del IBI), fecha y precio de adquisición con gastos, días alquilados, fecha del contrato y edad del inquilino o zona tensionada para la reducción.

**Validación:** el ejemplo del capítulo 4 del Manual ([capital inmobiliario](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c04-rendimientos-capital-inmobiliario.html)) y un borrador real de arrendador (las casillas 0083-0156 vienen en el borrador).

**Fuera:** alquiler turístico con servicios (es actividad económica), subarrendamiento, inmuebles en régimen de atribución.

---

## Bloque 5 · Lectura completa del borrador (M)

**Qué:** usar el catálogo [renta-casillas.json](renta-casillas.json) como diccionario para leer **todas** las casillas del borrador, mostrarlas por apartado con su etiqueta oficial y marcar las que la app no calcula («cópiala de tu borrador»).

**Riesgos:** la colisión de números de identificación de 4 cifras (D14) y los datos personales del borrador (no guardar NIF ni nombres; la app ya los descarta).

**Validación:** borradores reales anonimizados de varios perfiles (asalariado, pensionista, arrendador, autónomo).

---

## Bloque 6 · Deducciones autonómicas por casilla (L)

**Qué:** añadir a cada deducción de `data/renta/ccaa/*.ts` su número de casilla del anexo B y sus datos de información adicional (anexos B.11-B.15: NIF del arrendador en las deducciones por alquiler, de la entidad en las inversiones...), y comprobar los requisitos (renta, edad, fechas).

**Fuentes:** el capítulo 17 del Manual ([deducciones autonómicas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c17-deducciones-autonomicas-cuota.html)) y las páginas de anexos B del BOE-A-2026-7041.

**Riesgo:** volumen (495 casillas de importe) y los cambios anuales de cada comunidad.

---

## Bloque 7 · Mínimos y reducciones completos (M)

- Mínimos: aumento por adopción o acogimiento (art. 58.2), fallecimiento en el año, ascendientes compartidos entre varios descendientes, límites de rentas de 8.000 € y de 1.800 € (declaración propia).
- **Anualidades por alimentos a los hijos** (arts. 64 y 75, casillas 0456-0459 y 1741-1762): escala separada. Frecuente en separados.
- **Rentas exentas con progresividad** (0525/0526): trabajadores con rentas exentas por convenio.
- Reducciones especiales: personas con discapacidad (0470-0476), patrimonios protegidos (0477-0481), deportistas (0487-0490) y **excesos** de planes de años anteriores (0463, anexo C.4).

**Validación:** los ejemplos del capítulo 14 del Manual y del capítulo 13 ([base liquidable](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html)).

---

## Bloque 8 · Resúmenes del autónomo: 390, 190, 180, 347 y 349 (M)

Son sumas de datos que la app ya tiene por trimestre:

- **390** = Σ 303 más el volumen de operaciones y la prorrata.
- **190** = Σ 111 por perceptor (hace falta el NIF de cada perceptor; los libros ya lo guardan).
- **180** = Σ 115 por arrendador, con la referencia catastral.
- **347** = clientes y proveedores de más de 3.005,06 € al año (por NIF y trimestre), excluidas las operaciones que ya van en el 349 o con retención (NO CONFIRMADO el detalle de exclusiones: verificar en la ficha [GI27](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml)).
- **349**: operaciones intracomunitarias por NIF-IVA y clave.

**Validación:** cuadre automático de los resúmenes con los trimestres. Plazos del [calendario 2026](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html).

---

## Bloque 9 · 303 completo y 349 (L)

**Casillas:** 10-11 y 36-37 (adquisiciones intracomunitarias: devengo y deducción a la vez), 12-13 (inversión del sujeto pasivo, p. ej. servicios de empresas de fuera de la UE como software o publicidad), 30-31 (bienes de inversión), 32-35 (importaciones), 40-41 (rectificaciones), 44 (prorrata), 59/60/120/122-124 (información), criterio de caja (62-63, 74-75), resultado a devolver o compensar.

**Reglas:** LIVA arts. 13-15 y 25 (intracomunitarias), 69-70 (lugar de los servicios), 84.Uno.2.º (inversión del sujeto pasivo), 92-114 (deducciones y prorrata), 163 decies-sexiesdecies (criterio de caja). Fuente práctica: las [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html).

**Datos:** por factura, país y NIF-IVA del cliente o proveedor, y el tipo de operación. Requiere el alta en el ROI (036) para el 349.

**Riesgo:** medio-alto. Los profesionales digitales suelen tener servicios de fuera de la UE con inversión del sujeto pasivo y no lo saben.

---

## Bloque 10 · Versionado normativo por ejercicio (M)

Hoy las constantes de 2025 están en el código (`LOW_PAY_*` en `rentaCalc.ts`) o en los datos de un solo año. Propuesta: un paquete de datos por ejercicio (`data/renta/2025`, `data/renta/2026`) con escalas, mínimos, DA 61.ª, art. 23.2, art. 85 y RETA, y tests que comparen cada paquete con su fuente.

**Cambios ya publicados que obligan a hacerlo:**
- DA 61.ª para 2026: 590,89 € hasta 17.094 €, a cero en 20.048,45 € (D24).
- Art. 23.2 desde octubre de 2026 (D22).
- Art. 85 desde 2027 (D23).
- Deducción de autoconsumo renovable de 2026 (DA 62.ª: 10 % o 20 %, base máxima de 5.000 €) y exención de la DA 65.ª.

Todas comprobadas en el [texto consolidado de la LIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764).

---

## Bloque 11 · Patrimonio (714) y avisos de 720/721 (S-M)

Solo avisos con umbrales: el 714 si los bienes superan 2.000.000 € o la cuota sale a ingresar ([Orden HAC/277/2026, art. 2](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); el 720 y el 721 con sus umbrales (NO CONFIRMADOS en esta revisión: verificar en las fichas [GI34](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml) y la del 721). No calcular el impuesto: cada comunidad tiene sus bonificaciones.

## Bloques 12-13 · Fuera de alcance (XL)

Módulos (131 y apartado D-EO, con sus índices y la orden anual), regímenes especiales (atribución de rentas, TFI, derechos de imagen, IIC en paraísos), exit tax, no residentes (210, 216) y desplazados (151). Recomendación: **detectarlos y derivar** («tu caso necesita el programa de la AEAT o un asesor»), sin calcular.

---

## Cómo validar (para todos los bloques)

1. **Casos prácticos oficiales:** cada capítulo del Manual 2025 tiene ejemplos con las cifras resueltas (enlaces arriba). Convertirlos en tests con la entrada del ejemplo y las casillas esperadas.
2. **Borradores reales anonimizados:** varios perfiles; quitar NIF, nombres, direcciones, referencias catastrales e IBAN **antes** de guardarlos en `docs/` o en los tests. Comparar casilla a casilla con `rentaCompare.ts`.
3. **Simulador oficial:** Renta WEB permite simular sin presentar. NO CONFIRMADA en esta revisión la URL exacta del simulador abierto («Renta WEB Open»).
4. **Cuadres internos:** 303 ↔ 390, 111 ↔ 190, 115 ↔ 180, 130 ↔ casilla 0604, ingresos de la Renta ↔ bases del 303.
5. **Tests de cifras contra la fuente:** como ya hace `reta2026` (el test que comprueba que backend y frontend coinciden), uno por cada tabla del ejercicio.

## Cómo evitar prometer de más

**Principios:**
- La app **orienta y prepara**; la declaración la presenta el usuario en la AEAT. No usar «tu Renta», «resultado definitivo» ni «presenta con Finanverso».
- Toda casilla que la app no calcula se muestra como **«No calculada: cópiala de tu borrador»**, nunca como cero.
- Si el usuario declara algo fuera de alcance (actividad en módulos, ganancias por venta de acciones, no residencia...), el resultado se marca como **incompleto** y no se muestra «a devolver» o «a pagar» sin ese aviso.
- Cada cifra lleva su fuente (artículo o Manual) y el ejercicio al que corresponde.

**Textos recomendados:**

| Dónde | Texto |
|---|---|
| Cabecera del resultado de la Renta | «Estimación orientativa con los datos que has introducido. No sustituye a tu borrador ni a la declaración oficial: compruébala en Renta WEB antes de presentar.» |
| Casilla no soportada | «No calculada. Cópiala de tu borrador (casilla 0XXX) si te corresponde.» |
| Caso fuera de alcance detectado | «Tienes [rendimientos de actividad en módulos / ganancias por venta de acciones / …]. Finanverso todavía no los calcula, así que el resultado de abajo está incompleto. Usa el programa de la AEAT o consulta con un asesor.» |
| Deducción elegida sin comprobar requisitos | «Hemos aplicado esta deducción porque la has marcado. Comprueba que cumples todos los requisitos: [enlace a la página de la AEAT].» |
| Comparación con el borrador | «Diferencia de X € en la casilla 0XXX. Lo más probable es que [motivo]. Si no encaja, manda el borrador de la AEAT: es el dato oficial.» |
| Borradores del 303/130/111/115 | «Borrador para ayudarte a rellenar el modelo. Revisa cada casilla en la sede de la AEAT antes de presentar; la app no presenta modelos.» |
| RETA | «Cuota estimada según tus rendimientos. La Seguridad Social regulariza al año siguiente con los datos de Hacienda.» |
| Normativa futura | «Cifras del ejercicio 2025. Las de 2026 cambian (p. ej. la deducción por rendimientos del trabajo); lo actualizaremos cuando se apruebe el modelo.» |
| Pie de todas las pantallas fiscales | «Información orientativa, no asesoramiento fiscal. Fuente: Agencia Tributaria y BOE (fecha de comprobación: DD-MM-AAAA).» |

## Lo que se deja fuera conscientemente (y por qué)

- **Presentar** modelos en nombre del usuario: requiere colaboración social o apoderamiento y supone responsabilidad legal.
- **Módulos, regímenes especiales, no residentes, desplazados y exit tax:** pocos usuarios y mucho riesgo.
- **Patrimonio:** solo avisos; las bonificaciones autonómicas lo hacen muy variable.
- **Asesoramiento** (qué régimen elegir, si conviene tributar en conjunta más allá de la comparación numérica): la app muestra números, no recomienda decisiones con efectos legales.
