# Qué le falta a Finanverso para ser un gestor real (Renta y autónomos)

> Informe para el dueño. Información orientativa, no asesoramiento fiscal ni jurídico. Fecha: **19-10-2026**, sobre el código de la rama `develop` de ese día (después de las oleadas de IVA, actividades económicas, ganancias e inversiones, deducciones y revisor). Cada afirmación sobre lo que hace la app se ha comprobado leyendo el código; las cifras de cobertura salen de [cobertura.md](cobertura.md) y [cobertura.json](cobertura.json), y las del banco de pruebas, de [resultados.md](../casos-practicos/resultados.md) regenerado ese día. No contiene datos de ninguna persona real.

## Resumen ejecutivo

1. **La app ya prepara bien** la Renta de la mayoría de asalariados y pensionistas, la de muchos pequeños inversores (fondos, acciones, cripto) y la de un autónomo en estimación directa, y los modelos de un autónomo en régimen general de IVA. **No presenta nada**: deja borradores, vistas previas y ficheros que presenta la persona.
2. **Modelo 100** (cuenta casillas, no personas): núcleo del asalariado **40 %** calculado o leído (60 % con parciales; esta mañana, 30 % y 46 %). Modelo entero: **9 %** (35 % con parciales; antes, 4 % y 26 %). Integración y compensación y mínimos, al 100 %; estimación directa, al 53 %.
3. **Autónomos:** 303 al 100 % de lo aplicable, 130 al 89 %, 115 al 100 % y 111 al 40 %; 390, 349, 190, 180 y 347 calculados; 131 con pantalla, vista previa y fichero (19-10-2026); 720, 721 y 714, solo avisos.
4. **Banco de pruebas** (118 personas inventadas, 4.605 cifras esperadas): en la Renta coinciden al céntimo 2.978 cifras, con 0 discrepancias y 16 pendientes; en autónomos coinciden 320, con 0 discrepancias; de los casos oficiales se reproducían 17 de 62 (el 21-10-2026, 51 de 62; el 22-10-2026, 59 de 62: ver [auditoria-calculos.md](auditoria-calculos.md)).
5. **Los 7 fallos probables** detectados esta mañana (mínimo por discapacidad, planes de pensiones, abonos anticipados, Baleares, casilla 150 del 303, reparto de deducciones y pensión compensatoria) **están corregidos**. De las 24 discrepancias, 13 siguen abiertas y 2 lo están en parte; ninguna es de las graves.
6. **Riesgos P0** (resultado incorrecto sin que la persona lo note):
   - reglas de 2025 sin versión por año;
   - alquileres agregados;
   - nadie pregunta la residencia;
   - deducciones autonómicas sin comprobar requisitos;
   - ni los formatos de los brókers ni los ficheros para la sede se han probado con casos reales.
7. **Lo que hace un gestor y la app no:** presentar, representar, atender requerimientos, asesorar caso a caso y responder con su seguro. Se cubre con avisos, con la recomendación de un gestor colegiado y con ficheros que la persona importa en la sede.
8. **No prometer «perfecto» ni «exacto»:** hay 30 criterios NO CONFIRMADOS (§7) que debe revisar un gestor colegiado.
9. **El dueño debe probar en persona:**
   - los 9 ficheros en la sede, sin presentar;
   - sus exportaciones reales;
   - la tarifa plana de 2026;
   - los criterios de cripto, revisados con un gestor.
10. **Siguiente, antes de abril de 2027:** esas verificaciones; una revisión por un gestor colegiado; el versionado por ejercicio; un detector de casos fuera de alcance; los alquileres por inmueble; y el banco de casos al día.
11. **Todavía no:** forales, no residentes, regímenes especiales, exit tax, presentar por el usuario y calcular el patrimonio.

---

## 1. Cómo se ha medido

- **Cobertura:** se tomó el catálogo de las 2.275 casillas del modelo 100 de 2025 ([renta-casillas.json](renta-casillas.json)) y se volvió a clasificar cada casilla leyendo el código actual. Cada una queda como:
  - **calculada:** la app la produce;
  - **leída:** la escribe la persona o sale del borrador;
  - **parcial:** con límites;
  - **no soportada.**

  Una casilla solo sube si el resultado **llega a la persona**: el motor de módulos no agrarios existe, pero no tiene pantalla, así que cuenta como parcial. Detalle casilla a casilla en [cobertura.json](cobertura.json).
- **Banco de casos:** se ejecutaron `npm run casos` (documentos y 130/303 contra el motor del servidor) y `CASOS_INFORME=1 npx jest src/__tests__/casos` (la Renta contra el motor de la app). Resultado: 6 baterías de pruebas sin fallos, 3.250 comprobaciones superadas y 400 pendientes con su motivo.
- **Lo que no se ha hecho:** comparar con borradores reales, probar ficheros en la sede ni consultar a un gestor. Por eso todo lo que depende de eso figura como pendiente.

## 2. Qué cubre hoy, por tipo de persona

| Flujo | Qué hace la app | Qué no hace (y qué ve la persona) |
|---|---|---|
| **Asalariado o pensionista** | Bruto, Seguridad Social, sindicatos, colegio y defensa jurídica, 2.000 € de otros gastos, movilidad, discapacidad (con asistencia), reducción del art. 20, 340 € de la DA 61.ª, plan de pensiones con los límites de 1.500 € y 8.500 €, varios pagadores para la obligación de declarar, 40 % del plan cobrado en capital de antes de 2007, retenciones. Lee del borrador unas 11 casillas y compara 29 con su explicación. El asistente da 29 casillas para copiar | Retribuciones en especie (0004-0007) y contribuciones de la empresa al plan como rendimiento (0008, D13); atrasos y rendimientos irregulares; rentas exentas con progresividad; no lee nóminas ni certificados de retenciones |
| **Pareja e hijos** | Conjunta frente a individual con la diferencia en euros; mínimos de hijos (menores de 3, discapacidad, reparto al 50 %), ascendientes, anualidades por alimentos a los hijos con escala aparte, monoparental, maternidad por meses, familia numerosa y demás deducciones reembolsables con su abono anticipado | La deducción de 340 € en conjunta con dos perceptores se deja fuera y se avisa; los datos por hijo de las anualidades (1741-1762) no se rellenan |
| **Vivienda** | Imputación de inmuebles vacíos por días; alquiler con gastos, topes de intereses y reparaciones con arrastre a 4 años (0103-0108), amortización del 3 %, reducciones del art. 23.2 de 2025; deducción por vivienda y por alquiler del régimen transitorio; deducciones autonómicas de alquiler del catálogo. Venta de vivienda con amortizaciones, reinversión en vivienda habitual y exención de mayores de 65 | **Todos los alquileres van juntos** (D10): con dos pisos, los topes y reducciones por inmueble salen mal. La amortización solo usa el coste de construcción. Sin coeficientes de abatimiento para compras anteriores a 1995 (DT 9.ª). No rellena el anexo D ni el C.1 |
| **Autónomo en estimación directa** | Desde las facturas de Autónomos: 303 trimestral (prorrata, caja, inversión del sujeto pasivo, operaciones con la UE, bienes de inversión), 130 secciones I y II, 111, 115, 390, 349, 190, 180 y 347. Amortizaciones (tablas oficiales, libertad, acelerada), provisiones, 5 % de difícil justificación, subvenciones y RETA. Botón «Preparar mi declaración de la renta»: lleva al apartado D las casillas 0171-0224, la 0599 y la 0604, con las reducciones del art. 32. Ficheros para la sede de los 9 modelos | **Una sola actividad.** 303 y 390 del régimen simplificado solo con aviso. Recargo de equivalencia y regímenes especiales de IVA no comprobados en esta revisión. 111 sin especie, premios ni derechos de imagen; 190 sin empleados con sus datos. Tope del 1 % de atenciones a clientes sin aplicar (D18). Regularización anual del RETA a mano. Sin el plazo del 180 ni los festivos |
| **Módulos no agrarios** | Anexo II (70 actividades), 131 con vista previa y fichero, 303 simplificado (página 2 y fichero) y paso a la Renta (19-10-2026) | Una sola actividad; accesorias de minoristas en recargo; horas de personal en el fichero del 131; ningún fichero probado en la sede |
| **Agrario y ganadero** | Módulos agrarios (13 grupos de índices, correctores, 5 %, jóvenes agricultores), 130 agrario (2 %), REAGP, titularidad compartida al 50 %, forestales | Índices reducidos por zona: los escribe la persona. Varias producciones: el reparto no tiene caso oficial. PAC tratada como subvención corriente: NO CONFIRMADO |
| **Subvenciones** | Del autónomo: corrientes y de capital, en el 130 y en la Renta (0173, 0174) | De particulares: ayudas al alquiler, Bono Cultural Joven, Bono Social Térmico y premios (0282-0303) no tienen casillas propias; solo una lista genérica de ganancias (0304) |
| **Inversiones, cripto y fondos** | Importa en el dispositivo 46 formatos de brókers, exchanges y gestoras. FIFO, permutas entre criptos, recompensas, traspasos entre fondos sin tributar, regla de dos meses (acciones) y de un año (fondos), derivados, dividendos, intereses y staking, retenciones (0597, 0603), doble imposición (0588), integración y compensación con pérdidas de 4 años. Da la tabla «Lo que tienes que copiar en tu Renta», con informe en Excel y PDF. Tipos de cambio del BCE incluidos | Derechos de suscripción (0341-0355), DT 9.ª, canjes y fusiones, precio aplazado, rentas vitalicias. **Ninguna columna de ningún formato se ha comprobado con una exportación real.** Recompra en cripto: solo aviso. 720 y 721 solo se avisan |
| **No residentes** | Nada | **No se pregunta la residencia.** Un no residente obtendría un resultado de IRPF que no le corresponde (tributa por el IRNR, modelo 210) |
| **Forales** (País Vasco y Navarra) | Se detectan al elegir la comunidad y la pantalla avisa de que se declara en su hacienda foral | Ni cálculo ni deducciones forales |

## 3. Cobertura por modelo

### 3.1 Modelo 100 (Renta 2025)

| Medida | Ahora | Esta mañana |
|---|---|---|
| Núcleo del asalariado (A, C, H, I, J, K, M; 259 casillas de importe) | **40,2 %** (59,8 % con parciales) | 29,7 % (46,3 %) |
| Todas las casillas (2.275) | **9,1 %** (34,7 %) | 3,8 % (25,5 %) |
| Sin el anexo B de deducciones autonómicas (1.780) | **11,7 %** (19,6 %) | 4,9 % (7,9 %) |

Porcentaje calculado o leído por apartado:

| Apartado | Ahora | Antes | Apartado | Ahora | Antes |
|---|---|---|---|---|---|
| A · Trabajo | 48 % | 48 % | G · Integración y compensación | **100 %** | 0 % |
| B · Capital mobiliario | 22 % | 0 % | H · Bases imponibles | 33 % (100 % con parciales) | 13 % |
| C · Inmuebles | 19 % | 15 % | I · Reducciones | 23 % | 18 % |
| D · Estimación directa | **53 %** | 0 % | J · Bases liquidables | 62 % | 46 % |
| D · Módulos | 0 % (73 % con parciales: motor sin pantalla) | 0 % | K · Mínimos | **100 %** | 71 % |
| D · Agrarias | 15 % | 0 % | M · Cuotas y resultado | 26 % | 19 % |
| F · Ganancias por transmisión | 20 % | 0 % | E, F3, N y anexos A, B.11-15, C y D | 0 % | 0 % |

**Cómo leerlo.** Los porcentajes cuentan casillas, no personas. Las casillas que faltan son, sobre todo:
- regímenes que casi nadie usa (E, F3, Canarias);
- anexos informativos;
- datos de identificación que la app no guarda a propósito.

Para un asalariado típico, la pregunta útil es si están todas las casillas de su caso, y eso lo mide el banco de pruebas (§4), no este porcentaje.

### 3.2 Modelos del autónomo

| Modelo | Estado | Casillas | Qué falta |
|---|---|---|---|
| 130 | Calculado (I y II) | 17 de 19 (89 %) | Deducción por vivienda (16), complementaria (18), Ceuta, Melilla y La Palma |
| 131 | Pantalla, vista previa y fichero (19-10-2026) | 01-15 | Probar el fichero en la sede; varias actividades |
| 303 | Calculado (régimen general) | 74 de 106; **100 % de lo aplicable** | Simplificado, foral, rectificativa, exonerados del 390 |
| 349 | Calculado | Registros por operador y clave, rectificaciones | NIF-IVA validado solo por el prefijo |
| 390 | Calculado (régimen general) | Con el diseño de 2025 (el de 2026 no está publicado) | Simplificado, sectores diferenciados, foral |
| 111 | Parcial | 12 de 30 (40 %) | Especie, premios, forestales, derechos de imagen |
| 115 | Calculado | 100 % | Complementaria |
| 190 | Calculado | Profesionales (clave G) | Empleados (clave A) con sus datos |
| 180 | Calculado | Por arrendador | Plazo en el calendario; vista previa aproximada |
| 347 | Calculado | Por persona y trimestre | Facturas con retención: NO CONFIRMADO si van |
| 720, 721, 714 | Avisos | — | Rellenar los modelos; calcular el patrimonio |
| RETA | Estimación | Tramos y cuota de 2026 | Regularización anual, pluriactividad, tarifa plana de 2026 (sin fuente) |

Ficheros para la sede: 303, 130, 111, 115, 349, 390, 190, 180 y 347. Vistas previas con la maquetación del impreso, marcadas como simulación: 111, 115, 123, 130, 131, 180, 190, 303, 309, 347, 349 y 390. **Del modelo 100 no hay ni vista previa ni fichero:** se copia a mano en Renta WEB.

## 4. Banco de casos

| Qué | Cifra |
|---|---|
| Personas inventadas | **118**: 28 del primer banco, 30 y 50 de las dos ampliaciones y 10 inversores con sus archivos |
| Cifras esperadas | **4.605**: 4.555 calculadas a mano con su fórmula y 50 pendientes con motivo |
| Renta contra el motor (96 personas) | **2.978 coinciden**, 0 discrepancias, 16 pendientes |
| Autónomos 130 y 303 contra el servidor (3 personas, 4 trimestres) | **320 coinciden**, 0 discrepancias, 0 sin calcular |
| Casos oficiales catalogados | 62: 37 del Manual de Renta 2025 y 25 de autónomos |
| Casos oficiales reproducidos por el motor | **59 de 62 el 22-10-2026** (51 el 21-10-2026; [auditoria-calculos.md](auditoria-calculos.md)). El 19-10-2026 eran **17**: 9 de Renta y 8 de IVA (303-01 a 303-04, 390-01, 390-02, 349-01 y 349-02). Además, el caso práctico del capítulo 7 del Manual (estimación directa) se reproduce en `annualActivity.test.ts`, fuera del banco |
| Pruebas del banco | 3.250 superadas, 400 pendientes, 0 fallos |

**Los 16 pendientes de la Renta** son, sobre todo, rentas exentas que no se integran (becas, indemnizaciones, ayudas de la DA 5.ª) y deducciones autonómicas sin caso oficial: dos de Castilla y León, Murcia y Canarias. Otros dos:
- una donación que va al impuesto de Donaciones, fuera de la app;
- una ayuda al alquiler: la AEAT no dice si se resta del alquiler pagado (NO CONFIRMADO).

**Lo que hay que saber del banco:**
- **Va por detrás del código.** 26 cifras de los resúmenes anuales (390, 190 y 347) siguen marcadas como «Finanverso todavía no los prepara», aunque la app ya los calcula. Y 45 casos oficiales siguen sin reproducir: 28 de Renta (capital inmobiliario y mobiliario, actividades, ganancias, compensación, donativos, maternidad) y 17 de autónomos (303 simplificado, 347, 130, 111, 115, 190, 720 y RETA). Mientras no se pasen a pruebas, la «verdad de referencia» oficial cubre poco de lo nuevo.
- **La tabla «Discrepancias» de resultados.md enseña 20 filas que ya están corregidas** (estado `corregida` en `discrepancias.json`). Hay que cambiar el generador `informe.py` para que no se confundan con fallos actuales (es código: no se toca en este informe).
- Las cifras esperadas son **cálculos a mano** sobre personas inventadas: prueban que el motor hace lo que dice la regla escrita, no que la regla sea la que aplica la AEAT. Para eso hacen falta los casos oficiales y borradores reales anonimizados.

## 5. Qué falta para un gestor real, por prioridad

Esfuerzo: **S** (2 días o menos), **M** (1 semana o menos), **L** (2-4 semanas), **XL** (más de un mes o un experto dedicado).

### P0 · Riesgos de dar un resultado incorrecto

| # | Riesgo | Por qué importa | Qué hacer | Esfuerzo |
|---|---|---|---|---|
| P0-1 | **Las reglas son de 2025 y no hay versión por ejercicio** | Cambian en 2026: deducción de 340 € a 590,89 € (DA 61.ª), reducciones del alquiler (art. 23.2), deducción por autoconsumo (DA 62.ª) y exención de la DA 65.ª. En 2027 cambia la imputación de inmuebles (art. 85). Con los datos de un solo año, la Renta 2026 saldría mal | Un paquete de datos por año, con pruebas contra su fuente (D22-D24) | M |
| P0-2 | **Varios inmuebles alquilados agregados** (D10) | Los topes de gastos y la reducción del 23.2 son por inmueble; un piso con pérdidas compensa mal al otro | Modelar cada inmueble, prorratear por días y usar el mayor del coste o del valor catastral para la amortización | L |
| P0-3 | **Nadie pregunta por la residencia** | Un no residente obtiene un IRPF que no le corresponde | Pregunta obligatoria («¿has vivido en España más de 183 días?») y bloqueo del resultado con derivación | S |
| P0-4 | **Deducciones autonómicas sin comprobar requisitos** | La app aplica lo que la persona marca; donativos sin el límite del 10 % de la base (D17) | Pedir los requisitos de cada deducción, vincularla a su casilla del anexo B y aplicar el 10 % | L |
| P0-5 | **Formatos de brókers y exchanges sin probar con archivos reales** | Una columna mal leída da una ganancia falsa sin aviso | El dueño exporta sus archivos y los comprueba en local; marcar cada formato confirmado con su fecha | S (dueño) + M |
| P0-6 | **Ficheros para la sede sin probar** | Un campo desplazado puede importarse con importes cambiados: la persona presentaría cifras que no son las suyas | Importar cada fichero en la sede con datos inventados y su identificación, sin presentar | S (dueño) |
| P0-7 | **El lector de PDF confunde modelos** | Un 390, un PDF con varios trimestres o un 303 foral se leen como un 303 o un 130 estatal sin aviso ([documentos-oficiales.md §6](documentos-oficiales.md#6-consecuencias-para-la-app-para-decidir)) | Rechazarlos o avisar | S |
| P0-8 | **Criterios fiscales no confirmados en la cuenta**: FIFO global entre brókers, staking en la 0027, airdrops en la 0304, derivados en 1624-1640, clave F/N de la 1803 | Si el criterio no es el de la AEAT, la cifra va a otra casilla o a otra base | Revisión por un gestor colegiado y, si hace falta, una consulta a la DGT | S + coste externo |

**Estado a 19-10-2026 (agente gestor-fiscal):**

- **P0-1 hecho en parte (22-10-2026).** Paquete de reglas por ejercicio para 2024, 2025 y 2026 con sus fuentes, selector de año en la Renta, RETA y cifras de autónomos por año ([reglas-por-ejercicio.md](reglas-por-ejercicio.md)). Sin datos autonómicos de 2024 y 2026 (la app lo dice y no da resultado), y 2026 sin lo del RDL 29/2026, pendiente de convalidación.
- **P0-2 hecho.** Alquileres inmueble a inmueble (`rentaRentals.ts`): titularidad o usufructo, días alquilado y a disposición con imputación, límite de intereses y reparaciones y arrastre por inmueble, gastos anuales por días, amortización del mayor entre coste y valor catastral sin suelo, reducción del 23.2 según contrato y zona tensionada (90/70/60/50 %), 30 % del 23.3, mínimo del art. 24 y retenciones. Un inmueble por pantalla en el asistente con «Añadir otro inmueble». Personas p5-120 a p5-122. Falta: inmuebles accesorios (0133-0147), amortización en casos especiales (0132), anexo D, NIF de inquilinos.
- **P0-3 hecho.** Pregunta de residencia en el paso 1 (183 días, centro de intereses, presunción familiar, traslado, desplazados, funcionarios en el extranjero, territorio vasco). No residentes, régimen de desplazados, art. 10 y forales ven dónde se presenta (enlaces oficiales) en lugar del resultado; el resto de la app sigue.
- **P0-4 hecho en lo esencial.** Donativos por lo donado con 80/40/45 %, prioritarias y límite del 10-15 % de la base liquidable (D17). Motor de requisitos: las 366 deducciones autonómicas de las 15 comunidades de régimen común se aplican solo si cumplen sus requisitos (edad, hijos y discapacidad comprobados solos; el resto, preguntas sí/no), con su casilla del anexo B (357) y su norma (`data/renta/requisitos/`, `deducciones-requisitos.json`); límite conjunto de las donaciones autonómicas sobre la base liquidable en Castilla y León (10 %) y la Comunitat Valenciana (30 %). Falta: las incompatibilidades entre deducciones (se explican en el texto de requisitos y en preguntas, no se bloquean entre sí), los límites conjuntos de donaciones del resto de comunidades y revisar las casillas dudosas que anota el control interno (Madrid 1119-1120, La Rioja 1204-1165, Asturias 2242, Castilla-La Mancha 0201).

### P1 · Coberturas que usa mucha gente

| # | Qué | Esfuerzo |
|---|---|---|
| P1-1 | **Detector de casos fuera de alcance:** no residentes, forales, módulos no agrarios, regímenes especiales, exit tax, varias actividades. Si aparece uno, el resultado se marca como incompleto (hoy solo hay avisos sueltos) | S-M |
| P1-2 | **Leer los datos fiscales y el borrador completos** con el catálogo de casillas (hoy, unas 11) y dar la lista entera de «qué copiar» del modelo 100, no solo 29 casillas | M |
| P1-3 | **Entrada de datos (oleada 3):** nóminas, certificados de retenciones del trabajo y de pensiones, certificados bancarios e informes fiscales de entidades españolas. Hoy solo se leen archivos de inversiones, el borrador, facturas y tickets | L |
| P1-4 | **Ganancias sin transmisión con sus casillas:** Bono Cultural Joven, ayudas al alquiler, Bono Social Térmico, premios y loterías (0282-0303); rentas exentas con progresividad (0525-0526) | M |
| P1-5 | **Pantalla de módulos no agrarios**, con el 131 y su fichero para la sede (el motor ya existe) | M |
| P1-6 | **Varias actividades del mismo autónomo** y el tope del 1 % de atenciones a clientes (D18) | M |
| P1-7 | **Poner al día el banco de casos:** reproducir los 45 casos oficiales pendientes, pasar a «calculado» los resúmenes anuales que ya existen, limpiar el informe de discrepancias corregidas y, en abril de 2027, añadir los casos del Manual de 2026 | M |
| P1-8 | **Ayuda con requerimientos y notificaciones (oleada 6):** explicar una carta de la AEAT, qué plazo corre y qué documento aportar, siempre sin representar a la persona | M |
| P1-9 | **Calendario completo:** plazo del 180, festivos nacionales y avisos de 720 y 721 en el calendario (D19) | S |
| P1-10 | **Retoques de exactitud:** tope proporcional de la 0414 (D08); contribución de la empresa al plan (D13); irregularidad del alquiler aparte (D11); Seguridad Social por ejercicio (D16); validación de la etiqueta al leer el borrador (D14); cita del RETA (D20) | S-M |

### P2 · Completitud

| Qué | Esfuerzo |
|---|---|
| Derechos de suscripción (0341-0355), coeficientes de abatimiento (DT 9.ª), precio aplazado, canjes y fusiones, rentas vitalicias | L |
| 303 y 390 del régimen simplificado; 111 en especie, premios y derechos de imagen; 190 con empleados; complementarias y rectificativas | L |
| Regularización (apartado N) y autoliquidación rectificativa | M |
| Anexos informativos: A (detalle de deducciones estatales), B.11-B.15, C.1-C.5 y D | L |
| Capital mobiliario de la base general (0046-0060), seguros con DT 4.ª, planes de ahorro a largo plazo | M |
| Rellenar el 720 y el 721 (hoy, solo avisos) | L |
| Reserva para Inversiones en Canarias e Illes Balears, deducciones de Canarias | L |

## 6. Lo que un gestor humano hace y la app no

| Lo que hace un gestor | ¿La app? | Cómo cubrirlo honestamente |
|---|---|---|
| **Presentar** la declaración en nombre del cliente (colaboración social o apoderamiento) | No | La app genera el fichero o la lista de casillas; **la persona se identifica y presenta en la sede**. El texto «Finanverso no presenta ni firma nada» ya está en las vistas previas. No conviene hacerlo: exige convenio de colaboración social, apoderamientos y asumir responsabilidad |
| **Representar** al cliente ante la AEAT y la Seguridad Social | No | Recomendar un gestor o asesor colegiado cuando haya actuaciones de la Administración |
| **Atender requerimientos, comprobaciones e inspecciones**, alegaciones y recursos | No | Como mucho, una guía que explique la carta y los plazos (P1-8), con la derivación a un profesional |
| **Comprobar con la AEAT** (datos fiscales, borrador, censos, 036 y 037, ROI, notificaciones electrónicas) | No (la persona sube el borrador) | Pedir siempre que la persona contraste con sus datos fiscales; leerlos completos (P1-2) |
| **Asesorar caso a caso**: qué régimen elegir, cuándo dar de alta, cómo hacer una operación | No: la app compara números (conjunta frente a individual) y sugiere comprobaciones | Mantener los rótulos «orientativo, no asesoramiento» y la frase «revísalo con un gestor colegiado antes de presentar» |
| **Responder** de sus errores (responsabilidad profesional y seguro de responsabilidad civil) | No | No prometer resultados; condiciones de uso claras; valorar un acuerdo con un despacho colegiado que revise los casos que la app marque como dudosos |
| **Custodiar** la documentación 4 años | En parte (la guía lo recuerda) | Avisar de qué guardar y durante cuánto tiempo (LGT art. 66) |

## 7. Riesgos legales y de confianza

1. **No prometer «perfecto», «exacto» ni «definitivo».** Una publicidad que lo diga y no se cumpla puede ser engañosa. Usar «estimación orientativa» y «borrador para revisar». Ni la app ni este informe garantizan el resultado.
2. **Responsabilidad:** quien presenta y firma responde ante Hacienda. Con la persona que presenta lo que la app calculó, el riesgo reputacional es de Finanverso aunque el legal no lo sea. Condiciones de uso revisadas por un abogado: NO CONFIRMADO que las actuales cubran el uso fiscal.
3. **El nombre «gestor»:** no presentar la app como «gestor administrativo» ni como profesional colegiado. Es una profesión con colegio propio; el alcance exacto de la protección del título está NO CONFIRMADO: consultarlo con un abogado.
4. **Datos personales (RGPD):** los datos fiscales son muy sensibles.
   - Los ficheros para la sede ponen el NIF, el nombre y el IBAN solo en el dispositivo, y las inversiones se leen en el dispositivo.
   - Pero el borrador de Autónomos se calcula en el servidor y tiene una copia en la cuenta.
   - Revisar la política de privacidad, el registro de actividades y el cifrado. No usar IA en un servidor sin consentimiento explícito.
5. **Apariencia oficial:** las vistas previas llevan la marca «simulación, no oficial», sin logotipos ni código de barras de la AEAT. Mantenerlo así.
6. **Datos NO CONFIRMADOS pendientes de verificar con un gestor** (lista consolidada; detalle en cada documento):

| # | Asunto | Dónde |
|---|---|---|
| 1 | Tarifa plana del RETA de 2026 y 2027 (80 € solo confirmados para 2023-2025) | [modelos.md](modelos.md), D21 |
| 2 | Régimen transitorio del nuevo art. 23.2 (qué contratos se acogen a cada porcentaje) | [cobertura.md](cobertura.md) |
| 3 | FIFO global por valor frente a FIFO por bróker o cuenta | [inversiones.md](inversiones.md) |
| 4 | Staking y lending en la casilla 0027 | inversiones.md |
| 5 | Airdrops, cashback, «learn» e invitaciones en la 0304 (base general) | inversiones.md |
| 6 | Hard fork con coste cero | inversiones.md |
| 7 | DeFi (pools, wrapping, staking en contrato) como permuta | inversiones.md |
| 8 | Regla de recompra (art. 33.5) en cripto: solo aviso | inversiones.md |
| 9 | Derivados y CFD en 1624-1640 y en la base del ahorro | inversiones.md |
| 10 | Claves F/N de la casilla 1803 | inversiones.md |
| 11 | Intereses de fondos monetarios (Revolut) en la 0029 | inversiones.md |
| 12 | Comisiones pagadas en monedas (red, BNB) | inversiones.md |
| 13 | Columnas de todos los formatos de brókers, exchanges y gestoras | inversiones.md |
| 14 | Límite del convenio por país en la 0588 | inversiones.md |
| 15 | Compensación del REAGP en la casilla 08 del 130 | [contrato-actividad-anual.md](contrato-actividad-anual.md) |
| 16 | Pago básico de la PAC como subvención corriente | contrato-actividad-anual.md |
| 17 | Reparto de índices entre varios productos agrarios | contrato-actividad-anual.md |
| 18 | Prorrateo de amortizaciones por días y bienes usados en la tabla simplificada | contrato-actividad-anual.md |
| 19 | Imputación de la regularización del RETA y del IVA de bienes de inversión en el IRPF | contrato-actividad-anual.md |
| 20 | Facturas con retención y servicios no sujetos en el 347 | cobertura.md, documentos-oficiales.md |
| 21 | Ficheros para la sede: codificación, saltos de línea, extensiones, campos del bloque `<AUX>`, número identificativo | [documentos-oficiales.md §7](documentos-oficiales.md#7-ficheros-para-importar-en-la-sede-19-10-2026) |
| 22 | Diseños de 2026 del 390 y del 190 (se usan los de 2025) y del 180 (el de 2023) | documentos-oficiales.md |
| 23 | Ayuda al alquiler: si se resta del alquiler pagado en la deducción | [resultados.md](../casos-practicos/resultados.md) |
| 24 | Deducciones autonómicas de Castilla y León (familia numerosa), Murcia (guardería) y Canarias (discapacidad) | resultados.md |
| 25 | Inicio de actividad (art. 32.3): detalle de requisitos | [hoja-de-ruta.md](hoja-de-ruta.md) |
| 26 | Umbrales del 720 y del 721 y su orden | modelos.md |
| 27 | Mínimos autonómicos de Aragón, Cantabria, Castilla-La Mancha, Extremadura y Murcia (se presumen iguales a los estatales) | cobertura.md |
| 28 | Que el PDF de Renta WEB Open tenga el mismo formato que el de Renta WEB | documentos-oficiales.md |
| 29 | Exoneraciones del 390 y del 347 (módulos, solo arrendamientos, SII) | modelos.md |
| 30 | Casillas 0058 y 0237 (rendimientos de actividades artísticas excepcionales, DA 60.ª) como novedad de 2025 | [README.md](README.md) |

## 8. Lo que debe verificar el dueño en persona

| Qué | Cómo | Por qué no lo puede hacer la app ni un agente |
|---|---|---|
| **Los 9 ficheros para la sede** (303, 130, 111, 115, 349, 390, 190, 180 y 347) | En la sede, con su certificado o Cl@ve: formulario del modelo → «Importar» con un fichero de datos inventados → comprobar casilla a casilla la vista previa → **no presentar**. Anotar si admite la extensión, la codificación y los saltos de línea | Exige identificarse; no debe hacerlo nadie más |
| **Exportaciones reales de sus plataformas** (Binance, Coinbase, Kraken, Revolut, Degiro, IBKR, Trade Republic, eToro, Quantfury, gestoras) | Descargar el historial, importarlo en la app en local y comparar con el informe fiscal de la plataforma. Marcar cada formato confirmado con su fecha. **Nunca subir esos archivos al repositorio** | Son datos personales |
| **Tarifa plana de 2026** | Buscar en el BOE la cuantía vigente (LETA art. 38 ter y la LPGE o el real decreto-ley que la fije) y la página de la Seguridad Social | Hoy no hay fuente y la app deja el dato vacío |
| **FIFO global, staking, DeFi, airdrops, recompras en cripto, derivados** | Llevar la lista del §7 a un gestor o asesor colegiado; si no hay criterio claro, valorar una consulta vinculante a la DGT | Son criterios, no cálculos |
| **Su propio borrador y los de personas de confianza** (asalariado, pensionista, arrendador, autónomo) | Compararlos con la app en local, anonimizados antes de guardar nada | Datos reales |
| **Predeclaraciones del 111, 115 y 130 y borrador del 303 de 2026** | Pasos en [documentos-oficiales.md §4.2](documentos-oficiales.md#42-identificándose-dni-o-nie-con-dato-de-contraste-clve-o-certificado) para medir las vistas previas con un PDF auténtico | Exige identificarse |
| **Renta WEB Open** | Simular 3 o 4 personas del banco y comparar el resultado | Sirve de contraste independiente |

## 9. Mantenimiento anual

| Cuándo | Qué | Dónde |
|---|---|---|
| Noviembre-diciembre | Orden de módulos del año siguiente | `data/renta/modulos-2025.ts`, `agrario-2025.ts` (falta el paquete por año) |
| Diciembre-enero | Orden de cotización (RETA y régimen general), tarifa plana | `reta2026.ts` y su copia en el servidor, `fiscalFigures.ts` |
| Enero | Calendario del contribuyente; diseños de registro nuevos del 303, 390, 190, 180 y 347 (suelen salir en el BOE en otoño o invierno) | `deadlinesFor`, `aeatFiles/designs.ts` (script `extract-designs.py`) |
| Enero | Tipos de cambio del BCE del año cerrado | Script de tipos del BCE de la app |
| Marzo | Orden del modelo 100 en el BOE: volver a generar el catálogo de casillas y comparar con el del año anterior | [renta-casillas.md](renta-casillas.md) |
| Abril (campaña) | Manual práctico: escalas, mínimos y deducciones autonómicas; fechas de la campaña; casos oficiales nuevos al banco | `data/renta/**`, `rentaCampaign.ts`, `docs/casos-practicos/` |
| Tras cada cambio | Volver a medir la cobertura y ejecutar el banco | Este directorio |

**Cambios ya conocidos:**
- **Renta 2026:** DA 61.ª (590,89 €), art. 23.2 nuevo, DA 62.ª (autoconsumo) y DA 65.ª.
- **Renta 2027:** el art. 85 por escala.

Hoy nada de esto está en el código: sin el versionado (P0-1), cada año hay que tocar constantes repartidas por varios archivos.

## 10. Hoja de ruta recomendada

| Orden | Qué | Esfuerzo | Por qué en este orden |
|---|---|---|---|
| 1 | **Verificaciones del dueño** (§8): ficheros en la sede, exportaciones reales, tarifa plana | S (dueño) | Desbloquean P0-5, P0-6 y el RETA sin escribir código |
| 2 | **Revisión externa por un gestor colegiado** de 15-20 personas del banco y de los criterios del §7 | S + coste | Es la única forma honesta de decir «revisado por un profesional» |
| 3 | **Versionado por ejercicio y cifras de 2026** (P0-1) | M | Tiene que estar antes de abril de 2027 |
| 4 | **Detector de fuera de alcance** con la pregunta de residencia (P0-3, P1-1) | S-M | Barato y evita los peores errores |
| 5 | **Lector de PDF sin falsos positivos** (P0-7) | S | Barato |
| 6 | **Alquileres inmueble a inmueble** (P0-2) | L | Arrendadores: un perfil frecuente |
| 7 | **Banco de casos al día** (P1-7) | M | Que la verdad de referencia cubra lo nuevo |
| 8 | **Deducciones autonómicas con requisitos y casilla**, y donativos con el 10 % (P0-4) | L | Mucha gente, mucho riesgo |
| 9 | **Lectura completa de datos fiscales y lista entera de qué copiar** (P1-2) | M | Mejora la confianza en todos los perfiles |
| 10 | **Ganancias sin transmisión, rentas exentas y calendario** (P1-4, P1-9) | M | Jóvenes y perceptores de ayudas |
| 11 | **Pantalla de módulos y 131** (P1-5), varias actividades (P1-6) | M + M | Completa autónomos |
| 12 | **Nóminas y certificados** (P1-3) y **guía de requerimientos** (P1-8) | L + M | Menos fricción y más servicio |
| 13 | P2 por demanda real | L-XL | Solo si los usuarios lo piden |

**Qué no conviene hacer todavía:**
- **Forales (País Vasco y Navarra):** son cuatro haciendas con modelos, escalas y deducciones propias. Basta con el aviso actual.
- **No residentes (IRNR, modelo 210):** es otro impuesto, con convenios por país. Solo detectarlos y derivar.
- **Regímenes especiales y exit tax** (apartados E y F3): muy pocos usuarios y mucho riesgo.
- **Presentar en nombre del usuario o representarlo:** exige convenio, apoderamientos y responsabilidad profesional.
- **Calcular el impuesto sobre el patrimonio** (714): cada comunidad tiene sus bonificaciones; seguir con avisos.
- **Consultar precios de cripto a terceros o usar IA en un servidor** sin consentimiento explícito: rompe el «nada sale del dispositivo».

## Fuentes y documentos relacionados

- [cobertura.md](cobertura.md) y [cobertura.json](cobertura.json): medición casilla a casilla y 24 discrepancias con su estado.
- [hoja-de-ruta.md](hoja-de-ruta.md): bloques técnicos con sus casillas y su validación.
- [inversiones.md](inversiones.md), [contrato-actividad-anual.md](contrato-actividad-anual.md), [documentos-oficiales.md](documentos-oficiales.md) y [modelos.md](modelos.md): detalle y NO CONFIRMADOS de cada área.
- [Banco de casos](../casos-practicos/README.md) y [resultados](../casos-practicos/resultados.md).
- Normas: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Orden HAC/277/2026 del modelo 100 de 2025 ([BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)), Ley 37/1992 del IVA, Orden PJC/297/2026 de cotización y Ley 58/2003 General Tributaria (art. 66, prescripción).
