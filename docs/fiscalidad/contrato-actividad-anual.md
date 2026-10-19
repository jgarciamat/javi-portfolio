# Contrato anual de la actividad económica (Autónomos → Renta)

> **Aviso:** información orientativa, **no asesoramiento fiscal**. **Fecha de comprobación:** 19-10-2026. Ejercicios con datos: 2025 (Renta 2025, campaña de 2026) y 2026.

Este documento es para quien construya en el motor de la Renta el botón **«Preparar mi declaración de la renta»**. Explica qué entrega la pantalla de Autónomos y cómo leerlo. El código es puro: no tiene interfaz ni llamadas a la red.

| Pieza | Fichero |
|---|---|
| Contrato (tipos y cálculo) | `frontend/src/modules/finances/domain/annualActivity.ts` |
| Amortizaciones | `frontend/src/modules/finances/domain/depreciation.ts` |
| Subvenciones | `frontend/src/modules/finances/domain/subsidies.ts` |
| Módulos agrarios | `frontend/src/modules/finances/domain/agrarianModules.ts` |
| Punto de entrada desde el formulario | `frontend/src/modules/finances/ui/components/autonomoInputs.ts` (`annualOf`, `buildInputs`) |
| Tests (con el caso práctico oficial) | `frontend/src/__tests__/finances/{annualActivity,depreciation,autonomoActivity}.test.ts*` |

## 1. Cómo se llama

```ts
import { annualOf } from '@modules/finances/ui/components/autonomoInputs';
// manual: ManualForm (mm_autonomo_manual2) · extras: Extras (mm_autonomo_extras)
const annual = annualOf(manual, extras, 2025);
```

Si solo tienes los datos que se envían al servidor (`AutonomoInputs`, con su campo `activity`), usa `annualActivity(year, inputs)` de `domain/annualActivity.ts`. El formulario es el de la pantalla de Autónomos, el mismo que se guarda en el dispositivo y en la cuenta (`AutonomoSaved.manual` y `.extras`).

Una cuenta tiene **un solo formulario por año** y no guarda el año. Quien llame debe pasar el ejercicio de la Renta y comprobar que el formulario es de ese año: el selector de la pantalla y las fechas de las facturas lo dicen.

## 2. Qué devuelve: `AnnualActivity` (versión 1)

Todos los importes van en euros con dos decimales.

| Campo | Qué es | Casilla del modelo 100 |
|---|---|---|
| `version` | `1`. Sube si cambia el significado de un campo. | — |
| `year` | Ejercicio. | — |
| `regime` | Uno de estos valores: `directSimplified`, `directNormal`, `agrarianSimplified`, `agrarianNormal`, `objective` (módulos no agrarios, no calculados) u `objectiveAgrarian`. | — |
| `modality` | `'S'`, `'N'` o `null` en módulos. | 0168 |
| `income.sales` | Ventas y servicios, con IVA o sin él (todas las bases). | 0171 |
| `income.currentSubsidies` | Subvenciones corrientes y la parte del año de la ayuda a jóvenes agricultores. | 0173 |
| `income.capitalSubsidies` | Subvenciones de capital imputadas al ritmo de la amortización. | 0174 |
| `income.selfConsumption` | Autoconsumo. | 0175 |
| `income.compensations` | Compensaciones del REAGP cobradas. | 0176 |
| `income.stockIncrease` | Aumento de existencias. | 0177 |
| `income.total` | Total de ingresos. | 0180 |
| `expenses.byKind` | Lo deducible de cada clase de gasto de la app (ver la tabla del punto 3). | 0183…0202 |
| `expenses.reta` | Cuotas del RETA del titular. | 0186 |
| `expenses.retaFix.paid` y `.refunded` | Regularización del RETA pagada o devuelta en el año. | 0196 y 0197 |
| `expenses.stockDecrease` | Disminución de existencias. | 0182 |
| `expenses.depreciation.tangible` y `.intangible` | Amortización del inmovilizado material e intangible. | 0208 y 0227 |
| `expenses.provisions` | Provisiones; solo en la modalidad normal. | 0219 |
| `expenses.hardToJustify` | Provisiones y gastos de difícil justificación; solo en la simplificada. | 0222 |
| `expenses.total` | Total de gastos deducibles. | 0220 o 0223 |
| `subsidies.exempt` | Ayudas de la DA 5.ª LIRPF: **no** se integran en la base. | — |
| `subsidies.unassigned` | Subvenciones de capital sin bien amortizable: tributan al vender el bien; no se calculan. | — |
| `net` | Rendimiento neto antes de las reducciones del art. 32 (`null` en módulos no agrarios). | 0224, o 1553 en módulos agrarios |
| `withholdings` | Retenciones que le practicaron sus clientes (casilla 06 del 130, o 10 en la sección agraria). | **0599** |
| `payments130.quarters`, `.source` y `.total` | Lo pagado en cada 130, con su origen: `filed` (casilla 19 escrita por el usuario), `estimated` (estimación de la app) o `none`. | **0604** |
| `boxes` | Mapa casilla → importe, ya listo para el modelo 100 (ver el punto 4). | — |
| `depreciation` | Detalle por bien y trimestre (`DepreciationYear`). | — |
| `modules` | Resultado de los módulos agrarios con sus casillas, o `null`. | 1536-1553 |
| `warnings` | Avisos (ver el punto 5). | — |

## 3. De qué casilla es cada clase de gasto (orientativo)

| Clase de la app | Casilla | Clase de la app | Casilla |
|---|---|---|---|
| quota (cuota de autónomos) | 0186 | rent (alquiler) | 0192 |
| supplies (suministros, 30 % de la parte de vivienda afecta) | 0194 | management (gestoría) | 0199 |
| meals (manutención, 26,67 €/día) | 0191 | health (seguro de salud, 500 €/persona) | 0200 |
| staff (sueldos y Seguridad Social de empleados) | 0184 | material | 0183 |
| vehicle, clients, training, software, advertising, other | 0202 | fines (multas) | — (no deducibles) |

La regla de cada clase (qué parte es deducible) es la del servidor (`backend/src/domain/services/autonomo-expenses.ts sharesOf`) y su copia en `importChecks.ts irpfDeductible`. La casilla es una propuesta: la app no distingue, por ejemplo, reparaciones (0193) dentro de «vehicle». Los gastos marcados como «bien de inversión» no se restan enteros: se amortizan con los bienes del panel «Actividad del año».

## 4. Casillas que rellena

**Estimación directa:**
- 0171, 0173-0177, 0180, 0182-0184, 0186, 0191, 0192, 0194, 0196, 0197, 0199, 0200, 0202, 0208, 0227, 0218 y 0224.
- Además, 0219-0220 en la modalidad normal y 0221-0223 en la simplificada.

**Módulos agrarios:** 1536-1539, 1548-1553 y 0239.

**Siempre:** 0599 y 0604.

**No las rellena:**
- 0165-0167 y 0169-0170.
- 0172, 0178 y 0179.
- 0181, 0185, 0187-0190, 0193, 0195, 0198, 0203, 0205, 0206 y 0214-0217.
- 0225-0237: reducciones del art. 32.1, 32.2 y 32.3, Copa América y DA 60.ª. Estas las calcula el motor de la Renta.
- En módulos agrarios: 1540-1547 (son índices, no importes) y 1554-1560.

Las fórmulas son las del impreso de 2025 (Orden HAC/277/2026, BOE-A-2026-7041):
- 0218 = suma de gastos + 0196 − 0197
- Normal: 0220 = 0218 + 0219
- Simplificada: 0221 = 0180 − 0218, 0222 = 5 % × 0221 positiva con máximo 2.000 € (7 % en 2023, DA 56.ª), y 0223 = 0218 + 0222
- 0224 = 0180 − 0220, o 0180 − 0223

## 5. Avisos (`warnings`)

| Código | Qué hacer en la Renta |
|---|---|
| `noData` | No hay trimestres: no uses el resultado. |
| `priorTotals` | El 130 se preparó con los totales de un 130 anterior: comprueba que el año entero está en la app. |
| `objective` | Actividad en módulos que no es agraria: `net` vale `null`. Pide el rendimiento al usuario o deriva al programa de la AEAT. |
| `payments131` | En módulos los pagos del año son los del 131, no los del 130: la 0604 sale de los 131 presentados. |
| `payments130Estimated` | Alguna 0604 es una estimación: pide la casilla 19 de cada 130 presentado. |
| `investmentNoAsset` | Hay gastos de inversión sin bienes que amortizar: falta la amortización. |
| `capitalNoAsset` | Subvención de capital sin bien amortizable: tributa al vender el bien (no calculado). |
| `exemptAid` | Ayudas de la DA 5.ª: no se integran. |
| `provisionsSimplified` | Escribió provisiones en la simplificada: se ignoran, porque ya van dentro del 5 %. |
| `assetNotes` | Algún bien tiene una incidencia (por bien, en `depreciation.assets[i].notes`): coeficiente fuera de la tabla, afectación parcial no admitida, límite de la libertad de amortización, bien usado con incentivo, grupo desconocido o incentivo en módulos. |
| `vatInvestments` | Con prorrata, la regularización del IVA de bienes de inversión puede ser ingreso o gasto del año: no calculado (NO CONFIRMADO). |
| `modules` | Módulos agrarios: año sin orden conocida, producto sin índice de transformación, o más de 250.000 € (exclusión del art. 31.1.3.ª.b LIRPF). |
| `notWorkedOut` | Siempre presente: reducciones del art. 32, rendimientos irregulares, ganancias por venta de bienes afectos y la opción por cobros y pagos quedan para la Renta. |

## 6. Reglas y fuentes

Comprobadas el 19-10-2026 en el texto consolidado del BOE y en el Manual práctico de Renta 2025, capítulos 7 y 9.

**Amortización en la simplificada** (art. 30.1.ª RIRPF): tabla simplificada de la Orden de 27-3-1998 (BOE-A-1998-7200).

| Grupo | Elementos | Coeficiente máximo | Periodo máximo |
|---|---|---|---|
| 1 | Edificios | 3 % | 68 años |
| 2 | Instalaciones y mobiliario | 10 % | 20 años |
| 3 | Maquinaria | 12 % | 18 años |
| 4 | Transporte | 16 % | 14 años |
| 5 | Equipos informáticos y programas | 26 % | 10 años |
| 6 | Útiles | 30 % | 8 años |
| 7 | Vacuno, porcino, ovino y caprino | 16 % | 14 años |
| 8 | Equino y frutales no cítricos | 8 % | 25 años |
| 9 | Cítricos y viñedos | 4 % | 50 años |
| 10 | Olivar | 2 % | 100 años |

**Amortización en la normal:** tabla del art. 12.1.a LIS (BOE-A-2014-12328), con sus 33 filas. Las reglas comunes a las dos modalidades:
- Se puede elegir cualquier coeficiente entre el máximo y el que resulta del periodo máximo (art. 4.1 RIS).
- El suelo no se amortiza (art. 1.2 RIS).
- Intangibles: según su vida útil, o 1/20 al año si no se puede estimar (art. 12.2 LIS).
- Libertad de amortización para bienes nuevos de hasta 300 €, con un límite de 25.000 € al año (art. 12.3.e LIS).
- Amortización acelerada de la empresa de reducida dimensión: el coeficiente máximo por 2 en bienes nuevos (art. 103 LIS). En la simplificada se aplica por el art. 30.1.ª RIRPF.
- Bienes usados: hasta el doble del coeficiente máximo sobre el precio (art. 4.3.a RIS).
- Afectación parcial: solo de partes de un inmueble (art. 22.3 RIRPF). Turismos: solo con uso exclusivo (art. 22.4 RIRPF).

**Prorrateo:** por meses enteros, como en el ejemplo del Manual (una puesta en funcionamiento el 1 de diciembre da 1/12).

**Amortización en módulos agrarios** (anexo I, instrucción 2.2, y anexo II de las Órdenes HAC/1347/2024 y HAC/1425/2025):

| Grupo | Elementos | Coeficiente | Periodo |
|---|---|---|---|
| 1 | Edificios | 5 % | 40 años |
| 2 | Útiles, informática | 40 % | 5 años |
| 3 | Transporte y resto | 25 % | 8 años |
| 4 | Intangible | 15 % | 10 años |
| 5 | Batea | 10 % | 12 años |
| 6 | Barco | 10 % | 25 años |
| 7 | Vacuno, porcino, ovino y caprino | 22 % | 8 años |
| 8 | Equino y frutales no cítricos | 10 % | 17 años |
| 9 | Cítricos y viñedos | 5 % | 45 años |
| 10 | Olivar | 3 % | 80 años |

La libertad de amortización en módulos es para bienes de hasta 601,01 €, con un límite de 3.005,06 € al año. Las actividades forestales no amortizan.

**Enlace con el 303:** un bien de un año anterior con IVA soportado y coste de más de 3.005,06 € pasa a `vat.investments`. Así entra en la regularización de bienes de inversión de la casilla 43 (arts. 107-109 LIVA).

**Subvenciones** (Manual Renta 2025, cap. 7, «Subvenciones corrientes y de capital»):
- Corrientes: en el periodo en que se devengan.
- De capital: en proporción a la amortización del bien. Si el bien no se amortiza, al enajenarlo.
- Jóvenes agricultores (primera instalación): por cuartas partes, en el año en que se obtienen y en los tres siguientes (art. 14.1.b LIRPF).
- Exentas: las de la DA 5.ª LIRPF.
- IVA: solo las vinculadas al precio forman parte de la base imponible (art. 78.Dos.3.º LIVA). Se escriben como ingresos del trimestre con su IVA; el art. 104 vigente ya no las cita en la prorrata.

**REAGP:**
- Compensación del 12 % en agrícolas y forestales y del 10,5 % en ganaderas y pesqueras (art. 130.Cinco LIVA).
- Para esa actividad no se presenta el 303 (art. 129).
- En estimación directa la compensación es ingreso (casilla 0176; Manual cap. 7, «IVA devengado»).

**Sección II del 130** (art. 110.1.c y 110.3.b RIRPF; instrucciones del 130):
- Casilla 08: ingresos del trimestre con las subvenciones corrientes, sin las de capital ni las indemnizaciones.
- Casilla 09: el 2 % de la 08.
- Casilla 10: retenciones del trimestre.
- Casilla 12: 07 + 11, cada una con su signo.
- No se presenta si al menos el 70 % de los ingresos del año anterior tuvo retención (art. 109.3).

**Módulos agrarios** (Órdenes HAC/1347/2024 para 2025 y HAC/1425/2025 para 2026; los dos anexos I son iguales):
- Índices de rendimiento neto, con la DA 2.ª: uva de mesa y flores al 0,32 y tabaco al 0,26.
- Índices reducidos de 2025 de ámbito estatal (Orden HAC/484/2026): apicultura 0,13, ovino y caprino de leche 0,18, y de carne 0,09. Los de cada municipio los escribe el usuario.
- Ayudas PAC repartidas entre los cultivos, o al 0,56 si el resto de los ingresos es menor del 25 %.
- Correctores:
  - a) medios ajenos: 0,75
  - b) personal asalariado: de 0,90 a 0,75
  - c) tierras arrendadas: 0,90
  - d) piensos comprados: 0,50
  - e) agricultura ecológica: 0,95
  - f) regadío con electricidad: 0,75
  - g) rendimiento de hasta 9.447,91 €: 0,90
  - h) forestal con plan aprobado: 0,80
- Reducción general del 5 % (DA 1.ª) y del 25 % para jóvenes agricultores (DA 6.ª LIRPF).
- El gasóleo y los fertilizantes **no** tienen reducción en 2025 ni en 2026.

**Caso práctico oficial:** Manual práctico de Renta 2025, cap. 7, «Caso práctico». Es un radiólogo en la simplificada con ingresos de 138.400 €, gastos de 78.300 € y 2.000 € de difícil justificación. Su rendimiento neto es **58.100 €**: las notas (10) y (11) del Manual dicen 61.400 € por error, pero su tabla y su suma dan 58.100 €. Está reproducido al céntimo en `annualActivity.test.ts`.

## 7. NO CONFIRMADO (fuera del cálculo o con la opción más prudente)

- El prorrateo por días en lugar de por meses. Un bien puesto en uso a mitad de mes empieza a contar el mes siguiente: nunca se deduce de más.
- Que la regla de bienes usados (doble coeficiente) se aplique a la tabla simplificada. Está aplicada, con el aviso del bien.
- Que la compensación del REAGP entre en la casilla 08 del 130. Se deja fuera.
- El tratamiento del pago básico de la PAC en estimación directa. Se trata como subvención corriente, por analogía con módulos.
- El efecto en el IRPF de la regularización del IVA de bienes de inversión.
- El momento en que se imputa la regularización de cuotas del RETA. Se usa lo que el usuario escribe para el año, y no entra en el 130.
- Las claves de la casilla 1486 (tipo de actividad agraria).
- Los índices reducidos de 2025 por provincia o municipio. No se incluyen: los escribe el usuario.

## 8. Lo que no cubre

- Módulos no agrarios (el 131 y su rendimiento anual son de otro bloque).
- Varias actividades a la vez.
- Entidades en atribución.
- La libertad de amortización con creación de empleo (art. 102 LIS) y la de vehículos eléctricos y puntos de recarga (DA 18.ª LIS, prorrogada a 2026).
- La regla de que el 5 % no se aplica si se opta por la reducción del art. 26.1 RIRPF (TRADE o único cliente).
- La deducción por vivienda del 130 (casilla 16) y las complementarias.
