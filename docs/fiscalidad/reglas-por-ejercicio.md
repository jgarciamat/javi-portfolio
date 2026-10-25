# Reglas por ejercicio (Renta y autónomos)

Cada ejercicio tiene su paquete de reglas con sus fuentes. Un año sin paquete es un error, no «el último disponible». Lo que el BOE o la Agencia Tributaria no han publicado para un año se marca como dato que falta y la app no lo toma de otro año.

- Renta: `frontend/src/modules/tools/data/renta/ejercicios/` (`rentaRules(año)`, `loadCcaaFor(año, comunidad)`), tipos en `frontend/src/modules/tools/domain/rentaRules.ts`.
- Autónomos: `frontend/src/modules/finances/domain/fiscalFigures.ts`, `objectiveModules.ts` (`MODULE_TABLES`), `agrarianModules.ts` (`MODULE_YEARS`) y, en el servidor, `backend/src/domain/services/autonomo-data.ts` (`RETA_TABLES`).
- Pruebas: `frontend/src/__tests__/tools/rentaRules.test.ts` (cifras de cada año con su fuente), `frontend/src/__tests__/casos/instantanea2025.test.ts` (el banco de casos con 2025, igual al céntimo antes y después del paquete) y `backend/src/tests/domain/reta.test.ts`.

Fuentes comprobadas el 22-10-2026 salvo que se diga otra cosa. Las versiones de cada artículo de la Ley 35/2006 se leyeron en la API de legislación consolidada del BOE (`/datosabiertos/api/legislacion-consolidada/id/BOE-A-2006-20764/texto/bloque/<artículo>`).

## Renta

| Ejercicio | Estado | Estatal | Comunidades | Módulos | Falta |
|---|---|---|---|---|---|
| 2024 | confirmado | Manual práctico de Renta 2024 y BOE | Las 17 (las 15 de régimen común comparadas con 2025, ver abajo) | No están en la app (Orden HFP/1359/2023) | Módulos; 7 deducciones autonómicas de 2024 que no tiene la app (se listan en pantalla) |
| 2025 | confirmado | Manual práctico de Renta 2025 (comprobado el 19-10-2026) | Las 17 | Orden HAC/1347/2024 | — |
| 2026 | provisional | Solo BOE (no hay Manual 2026) | Solo Ceuta, Melilla y forales | Orden HAC/1425/2025 (igual que 2025) | Manual; comunidades; alquileres e imputación (RDL 29/2026) |

### Qué cambia de 2025 a 2024

| Regla | 2024 | 2025 | Fuente |
|---|---|---|---|
| Escala del ahorro desde 300.000 € | 14 % cada mitad (28 %) | 15 % (30 %) | Arts. 66 y 76 LIRPF; Ley 7/2024 (BOE-A-2024-26694) los cambió desde 2025 |
| Deducción por rendimientos del trabajo (DA 61.ª) | No existe | 340 € hasta 16.576 €, nada desde 18.276 € | Ley 5/2025 (BOE-A-2025-15424), «con efectos desde 1 de enero de 2025» |
| Eficiencia energética | Obras pagadas hasta 31-12-2024, certificado antes de 1-1-2025, alquilar antes de 31-12-2025 | Hasta 31-12-2025 | Manual 2024, c16 (cuadro resumen) |
| Vehículo eléctrico y punto de recarga | Hasta 31-12-2024 | Hasta 31-12-2025 | Manual 2024, c16 |
| La Palma | Prorrogada por el RDL 4/2024 (BOE-A-2024-12944) | Prorrogada (versión BOE-A-2025-23911) | DA 57.ª LIRPF |

Igual en 2024 y 2025 (BOE: artículo sin cambios desde antes de 2024, o Manual 2024 con las mismas cifras): escalas general y autonómica supletoria (arts. 63 y 65), mínimos (arts. 57-61), gastos del trabajo (art. 19), reducción del art. 20 (RDL 4/2024, con efectos desde el 1-1-2024: 7.302 € hasta 14.852 €), planes de pensiones (arts. 51 y 52), conjunta (art. 84: 3.400 y 2.150 €), donativos (art. 19 de la Ley 49/2002, RDL 6/2023: 80 % de 250 € y 40/45 %), imputación de inmuebles (2 % y 1,1 %), reducciones del alquiler (cuadro del art. 23.2 del Manual 2024), obligación de declarar (art. 96: 15.876 €) y gastos de difícil justificación (5 %, hasta 2.000 €: el 7 % de la DA 56.ª fue solo para 2023).

Casos oficiales del Manual 2024 en las pruebas: c15, cuota estatal de la base de 23.900 € (2.140,50 + 266 = 2.406,50 €) y autonómica de Aragón (2.094,64 + 266 = 2.360,64 €), y c16, alquiler anterior a 2015 (284,93 €).

### Comunidades de régimen común en 2024

`ejercicios/2024-ccaa.ts` construye cada comunidad de 2024 a partir de la de 2025 (`regionOfYear`, en `ejercicios/regions.ts`): se compararon una a una, el 22-10-2026, todas las páginas del Manual práctico de Renta 2024 (tomo 2, deducciones autonómicas; c14, mínimos autonómicos y su cuadro comparativo; c15, escalas) con las de 2025, cifra por cifra y frase por frase. Lo que no está en la tabla es igual en los dos años. Las casillas del anexo B son las mismas en 2024 (mismo elemento del diseño de registro, `xml/casillas-2024.json`; lo comprueba una prueba).

- Escalas: [c15 de 2024](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico.html). Distintas en Asturias, Canarias y Cataluña; las otras 12, iguales.
- Mínimos: [c14 de 2024, cuadro comparativo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/cuadro-minimos-personales-familiares-estatal-autonomicos.html). Iguales salvo Asturias (en 2024, los del Estado).
- Deducciones: [tomo 2 de 2024](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024-deducciones-autonomicas/guia-deducciones-autonomicas.html), una página por deducción.

| Comunidad | Qué cambia en 2024 | Deducciones de 2025 que no existían | De 2024 que la app no calcula |
|---|---|---|---|
| Andalucía | Nacimiento: bases hasta 25.000/30.000 €; vivienda protegida o jóvenes: 5 % (no 6 %); alquiler: 600 € (900 con discapacidad) y solo menores de 35, mayores de 65 y víctimas; cónyuge con discapacidad: que no declare | Deporte, veterinario, celiaquía | — |
| Aragón | Nada | — | Acogimiento de personas ucranianas; ayudas humanitarias a Ucrania |
| Asturias | Escala (10 % el primer tramo, 18,5 % el cuarto, 25,5 % el último); mínimos del Estado; cuidado de descendientes: 500 € el primero y 600 € los siguientes; vivienda protegida: 5.000 € al año; concejos en riesgo: hasta 20.000 habitantes y un 10 % menos de población que en 2000 (no el Decreto 83/2025); 3 páginas con otro nombre | Celiaquía | — |
| Illes Balears | Alquiler: sin el supuesto de autónomo | Vivienda ocupada ilegalmente | Subida de las hipotecas a tipo variable; gastos de ascendientes mayores de 65 |
| Canarias | Escala (tramos de 13.465 a 121.200 €); límites de renta 45.500/60.500 € (no 46.455/61.770), 36.300, 25.500 y 35.000 €; desempleo: trabajo desde 11.200 € | Acciones de empresas nuevas | Donaciones a descendientes menores de 35 para la vivienda |
| Cantabria | Zonas rurales con reto demográfico (Orden HAC/11/2024), no la Orden PRE/1/2025; 4 páginas con otro nombre | Viviendas vacías, residencia en municipio en riesgo, inversiones de nuevos residentes del extranjero, desplazamiento de nuevos residentes | — |
| Castilla-La Mancha | Los 5 alquileres: 450 € (no 500) | Ahorro para la primera vivienda, perros de asistencia | — |
| Castilla y León | Solo los años de los textos | — | — |
| Cataluña | Escala (10,5 % el primer tramo; 9 tramos); nacimiento sin acogimiento; alquiler: 32 años o menos, 300 € (600 en conjunta o familia numerosa/monoparental), bases hasta 20.000/30.000 € y alquiler por encima del 10 % de los rendimientos | Alquiler de víctimas de violencia machista, cooperativas agrarias y de vivienda | — |
| Comunitat Valenciana | Nacimiento: 300 € por hijo, también los dos años siguientes (no 600/750/900); discapacidad: 246/303 € sin acogimiento; salud y deporte: bases hasta 32.000/48.000 € (completo bajo 29.000/45.000); bici con carga: 750 €; donativos: los primeros 150 € al 20 %; sin la guarda con fines de adopción | Formación musical | — |
| Extremadura | Nada en las que quedan | ELA (2), traslado a Extremadura, donaciones culturales; y los arrendadores de viviendas vacías y la rehabilitación rural para alquilar, que en 2024 solo valían para fallecidos entre el 26-10 y el 21-11-2024 (Decreto-ley 2/2024, derogado) | — |
| Galicia | Nada en las que quedan | ELA, talidomida, adecuación de inmueble vacío, viviendas vacías, incendios de 2025, libros de texto | Ayudas por los incendios de octubre de 2017; explosión de Tui de 2018 |
| La Rioja | Intereses de la hipoteca: solo 2023 y 2024 | Celiaquía, población ocupada en el medio rural, cuotas agrarias | — |
| Madrid | Solo los años de los textos | — | — |
| Región de Murcia | Discapacidad: 120 € con bases hasta 19.000/24.000 €; idiomas: bases hasta 20.000 €; alquiler: menores de 40, base hasta 24.380 € (40.000 € si menos de 40 años) | Enfermedades raras, gafas y lentillas, deporte, veterinario, vehículo eléctrico y su recarga, economía social | — |

Las deducciones de la última columna aparecen en la pantalla de 2024 de esa comunidad con el aviso de que la app no las calcula y que, si corresponden, se copian del borrador. Las demás deducciones de 2024 se ofrecen con sus cifras de 2024; ninguna de 2025 sin página en 2024 se ofrece.

Al comparar se vio que cuatro enlaces de La Rioja de 2025 (donaciones de mecenazgo) daban error: les faltaba la página que las agrupa. Arreglados en `ccaa/la-rioja.ts` (solo el enlace).

### Qué cambia de 2025 a 2026 (solo lo publicado en el BOE)

| Regla | 2026 | Norma | Estado |
|---|---|---|---|
| DA 61.ª | 590,89 € hasta 17.094 €, menos 0,2 por euro, nada desde 20.048,45 € | RDL 5/2026, art. 28 (BOE-A-2026-3810) | Convalidado (BOE-A-2026-6483) |
| DA 62.ª, autoconsumo renovable | 10 % (inmueble propio) o 20 % (edificio), base máxima 5.000 € | RDL 7/2026 (BOE-A-2026-6544) | Convalidado (BOE-A-2026-7125) |
| Eficiencia energética | Hasta 31-12-2026 (edificios, 31-12-2027) | RDL 7/2026 | Convalidado |
| Vehículo eléctrico y recarga | Hasta 31-12-2026 | RDL 7/2026 | Convalidado |
| La Palma | También en 2026 | RDL 23/2026 (BOE-A-2026-18828) | Convalidado (BOE-A-2026-19845) |
| DA 64.ª, actividades en Ceuta con la deducción del art. 68.4 | 10 % de provisiones y gastos de difícil justificación en directa simplificada (el tope de 2.000 € del art. 30 RIRPF no cambia) y 10 % de reducción del rendimiento neto de módulos y agrario (DA 1.ª de la Orden HAC/1425/2025), en lugar del 5 % | RDL 22/2026, art. 2 (BOE-A-2026-18429, en vigor el 3-9-2026) | Convalidado (BOE-A-2026-19420, BOE del 18-9-2026) |
| Art. 23.2 (alquiler de vivienda), art. 68.6 (deducción estatal por alquiler), DA 55.ª (1,1 % en 2026), DA 65.ª y 66.ª | Texto nuevo | RDL 29/2026 (BOE-A-2026-20823) | **Pendiente de convalidación** a 22-10-2026 (su antecesor, el RDL 26/2026, fue derogado el 2-10-2026). No se aplica: la app lo da como dato que falta |

Igual que en 2025: escalas, mínimos, arts. 19 y 20, ahorro y conjunta.

### Cuándo la app no muestra el resultado

`blockersOf(reglas, declaración)`: si la declaración necesita algo que el año no tiene (la comunidad, los módulos, los alquileres o la imputación de 2026), la pantalla dice qué falta y no da un resultado. Un año provisional lo dice siempre arriba.

### Retrocompatibilidad

Una Renta guardada en el dispositivo sin año se carga como 2025 (`loadProgress`), y un resultado guardado sin año solo se muestra en 2025 (`ownSnapshot`).

## Autónomos

| Dato | 2024 | 2025 | 2026 | Fuente |
|---|---|---|---|---|
| RETA: tipo total | 31,30 % (MEI 0,70) | 31,40 % (MEI 0,80) | 31,50 % (MEI 0,90) | Orden PJC/51/2024 (BOE-A-2024-1691), PJC/178/2025 (BOE-A-2025-3780) y PJC/297/2026 (BOE-A-2026-7296) |
| RETA: base máxima (tramos G11 y G12) | 4.720,50 € | 4.909,50 € | 5.101,20 € | Las mismas órdenes, art. 15 |
| fiscalFigures (347, retenciones, 130, 131, 720, patrimonio) | Igual que 2025 | — | — | RGAT, RIRPF y LIP: ningún artículo usado cambió después de 2023 |
| Tarifa plana | 80 € | 80 € | Sin cifra (la fija la Ley de Presupuestos) | RDL 13/2022, DT 5.ª |
| Módulos (anexo II) e índices agrarios (anexo I) | No están | Orden HAC/1347/2024 | Orden HAC/1425/2025, iguales a 2025 | Comparados el 19-10-2026 |

Un año sin orden de cotización toma la última tabla y lo dice en el borrador; un año anterior a la primera tabla de módulos no estima el 131.

### Plazos (comprobado el 25-10-2026)

Un plazo que acaba en sábado, domingo o festivo pasa al primer día hábil siguiente (Ley 39/2015, art. 30.2 y 30.5, [BOE-A-2015-10565](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565); instrucciones del 130 y del 303 de la sede). La app conoce los festivos de todas las comunidades: los nacionales no sustituibles (RD 2001/1983, art. 45.1, [BOE-A-1983-20906](https://www.boe.es/buscar/act.php?id=BOE-A-1983-20906)), el Viernes Santo y el 6 de enero, que todas mantienen (fiestas de 2027: [BOE-A-2026-21254](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-21254)). No conoce los autonómicos ni los locales (art. 30.6), que pueden alargar el plazo un día más. Código: `backend/src/domain/services/working-days.ts` y `frontend/src/modules/finances/domain/workingDays.ts`.

| Plazo | 2026 | 2027 |
|---|---|---|
| 303 y 130 del 1T, 2T y 3T (día 20) | 20-04, 20-07, 20-10 | 20-04, 20-07, 20-10 |
| 303, 130 y 390 del 4T del año anterior (30 de enero) | 30-01-2026 (viernes) | **1-02-2027** (el 30 es sábado) |
| 111 y 115 del 4T (20 de enero) | 20-01-2026 | 20-01-2027 |
| 347 del año anterior («durante el mes de febrero»: Orden EHA/3012/2008, art. 10, [BOE-A-2008-16973](https://www.boe.es/buscar/act.php?id=BOE-A-2008-16973)) | 2-03-2026 (el 28-02 es sábado) | 1-03-2027 (el 28-02 es domingo); en 2028, el 29-02 |

El plan gratis deja preparar el trimestre recién terminado hasta ese último día real, con el día de la península o el de Canarias (el que aún esté en plazo).

## Pendiente

- **Comunidades de 2026.** Esperar al Manual 2026 (abril de 2027) y hacer lo mismo que con 2024 (`regionOfYear` con su tabla de cambios).
- **Deducciones autonómicas de 2024 que no tiene la app** (7, en la tabla de arriba): añadirlas si hay demanda.
- **RDL 29/2026.** Si el Congreso lo convalida, añadir al paquete 2026 el art. 23.2 nuevo, la deducción del art. 68.6, el 1,1 % de 2026 y las DA 65.ª y 66.ª; si lo deroga, quitar el aviso de alquileres e imputación.
- **Tipos de IVA de 2023-2024** (5 % y 2 %, también 7,5 %, con sus recargos): no hechos. Exigen los diseños del 303 y del 390 de esos años y las fechas de cada tipo (RDL 20/2022, art. 72; RDL 4/2024).
- **DA 64.ª (Ceuta, 2026)**: hecha en la Renta 2026 (`state.ceutaActivities` de 2026; la persona de Ceuta marca en cada actividad simplificada, de módulos o agraria que se desarrolla allí con la deducción del 60 %). Falta: (1) la pantalla de autónomos (`hardRateOf` de `annualActivity.ts` y el 130/131 del servidor) sigue con el 5 % en Ceuta; según la DA 64.ª.3, el 10 % cuenta en los pagos fraccionados de 2026 cuyo plazo empiece pasado un mes desde el 3-9-2026, es decir, desde el del cuarto trimestre (enero de 2027); (2) quien no reside en Ceuta pero obtiene allí rentas con la deducción del art. 68.4 no tiene la pregunta (solo se pregunta con la comunidad Ceuta); (3) una actividad traída de la pantalla de autónomos llega con su rendimiento ya calculado al 5 %.
