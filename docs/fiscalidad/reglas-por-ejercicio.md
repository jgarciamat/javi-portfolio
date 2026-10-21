# Reglas por ejercicio (Renta y autónomos)

Cada ejercicio tiene su paquete de reglas con sus fuentes. Un año sin paquete es un error, no «el último disponible». Lo que el BOE o la Agencia Tributaria no han publicado para un año se marca como dato que falta y la app no lo toma de otro año.

- Renta: `frontend/src/modules/tools/data/renta/ejercicios/` (`rentaRules(año)`, `loadCcaaFor(año, comunidad)`), tipos en `frontend/src/modules/tools/domain/rentaRules.ts`.
- Autónomos: `frontend/src/modules/finances/domain/fiscalFigures.ts`, `objectiveModules.ts` (`MODULE_TABLES`), `agrarianModules.ts` (`MODULE_YEARS`) y, en el servidor, `backend/src/domain/services/autonomo-data.ts` (`RETA_TABLES`).
- Pruebas: `frontend/src/__tests__/tools/rentaRules.test.ts` (cifras de cada año con su fuente), `frontend/src/__tests__/casos/instantanea2025.test.ts` (el banco de casos con 2025, igual al céntimo antes y después del paquete) y `backend/src/tests/domain/reta.test.ts`.

Fuentes comprobadas el 22-10-2026 salvo que se diga otra cosa. Las versiones de cada artículo de la Ley 35/2006 se leyeron en la API de legislación consolidada del BOE (`/datosabiertos/api/legislacion-consolidada/id/BOE-A-2006-20764/texto/bloque/<artículo>`).

## Renta

| Ejercicio | Estado | Estatal | Comunidades | Módulos | Falta |
|---|---|---|---|---|---|
| 2024 | confirmado | Manual práctico de Renta 2024 y BOE | Solo Ceuta, Melilla y forales | No están en la app (Orden HFP/1359/2023) | Comunidades de régimen común; módulos |
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

Casos oficiales del Manual 2024 en las pruebas: c15, cuota estatal de la base de 23.900 € (2.140,50 + 266 = 2.406,50 €) y c16, alquiler anterior a 2015 (284,93 €).

### Qué cambia de 2025 a 2026 (solo lo publicado en el BOE)

| Regla | 2026 | Norma | Estado |
|---|---|---|---|
| DA 61.ª | 590,89 € hasta 17.094 €, menos 0,2 por euro, nada desde 20.048,45 € | RDL 5/2026, art. 28 (BOE-A-2026-3810) | Convalidado (BOE-A-2026-6483) |
| DA 62.ª, autoconsumo renovable | 10 % (inmueble propio) o 20 % (edificio), base máxima 5.000 € | RDL 7/2026 (BOE-A-2026-6544) | Convalidado (BOE-A-2026-7125) |
| Eficiencia energética | Hasta 31-12-2026 (edificios, 31-12-2027) | RDL 7/2026 | Convalidado |
| Vehículo eléctrico y recarga | Hasta 31-12-2026 | RDL 7/2026 | Convalidado |
| La Palma | También en 2026 | RDL 23/2026 (BOE-A-2026-18828) | Convalidado (BOE-A-2026-19845) |
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

## Pendiente

- **Comunidades de 2024 y 2026.** Método propuesto para 2024: comparar página a página el Manual 2024 (tomo 2) con el de 2025, como se hizo con la parte estatal, y revisar las casillas del anexo B de 2024 (`xml/casillas-2024.json`). Para 2026, esperar al Manual 2026 (abril de 2027).
- **RDL 29/2026.** Si el Congreso lo convalida, añadir al paquete 2026 el art. 23.2 nuevo, la deducción del art. 68.6, el 1,1 % de 2026 y las DA 65.ª y 66.ª; si lo deroga, quitar el aviso de alquileres e imputación.
- **Tipos de IVA de 2023-2024** (5 % y 2 %, también 7,5 %, con sus recargos): no hechos. Exigen los diseños del 303 y del 390 de esos años y las fechas de cada tipo (RDL 20/2022, art. 72; RDL 4/2024).
- **DA 64.ª (Ceuta, 2026)**: 10 % de gastos de difícil justificación y de reducción de módulos para actividades en Ceuta; no está en el motor.
