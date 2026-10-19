# Resultados del banco de pruebas

Cada cifra de `personas/*/esperado.json` contra el motor ACTUAL de la app. «Pendiente»: el motor no da esa cifra o la regla no se ha podido confirmar. Las discrepancias están en `discrepancias.json` con su causa probable.

| Parte | Coinciden | Discrepancias | Pendientes o no soportadas |
|---|---:|---:|---:|
| Renta (modelo 100, motor del frontend) | 1392 | 0 | 19 |
| Autónomos 130 y 303 (motor del backend, `npm run casos`) | 320 | 0 | 0 |
| Casos oficiales reproducidos por el motor (`casosOficiales.test.ts`) | 9 | 0 | resto del catálogo |

## Discrepancias

| Severidad | Caso | Casilla | Esperado | Motor | Causa probable | Fuente |
|---|---|---|---:|---:|---|---|
| alta | 23-autonomo-intracomunitario-exportador-cataluna | 303 1T 150 | 0,00 | 13.200,00 | Las entregas intracomunitarias y las exportaciones (IVA 0 %) van a la casilla 150 («tipo 0 %») en vez de a la 59 y la 60: el motor no distingue operaciones exentas con derecho a deducción de las de tipo cero. Además la 59 debe cuadrar con el modelo 349. | Instrucciones del modelo 303; Manual práctico IVA 2025, cap. 9 (casos oficiales 303-01 y 303-02) |
| alta | 23-autonomo-intracomunitario-exportador-cataluna | 303 2T 150 | 0,00 | 11.100,00 | Las entregas intracomunitarias y las exportaciones (IVA 0 %) van a la casilla 150 («tipo 0 %») en vez de a la 59 y la 60: el motor no distingue operaciones exentas con derecho a deducción de las de tipo cero. Además la 59 debe cuadrar con el modelo 349. | Instrucciones del modelo 303; Manual práctico IVA 2025, cap. 9 (casos oficiales 303-01 y 303-02) |
| alta | 23-autonomo-intracomunitario-exportador-cataluna | 303 3T 150 | 0,00 | 11.100,00 | Las entregas intracomunitarias y las exportaciones (IVA 0 %) van a la casilla 150 («tipo 0 %») en vez de a la 59 y la 60: el motor no distingue operaciones exentas con derecho a deducción de las de tipo cero. Además la 59 debe cuadrar con el modelo 349. | Instrucciones del modelo 303; Manual práctico IVA 2025, cap. 9 (casos oficiales 303-01 y 303-02) |
| alta | 23-autonomo-intracomunitario-exportador-cataluna | 303 4T 150 | 0,00 | 15.000,00 | Las entregas intracomunitarias y las exportaciones (IVA 0 %) van a la casilla 150 («tipo 0 %») en vez de a la 59 y la 60: el motor no distingue operaciones exentas con derecho a deducción de las de tipo cero. Además la 59 debe cuadrar con el modelo 349. | Instrucciones del modelo 303; Manual práctico IVA 2025, cap. 9 (casos oficiales 303-01 y 303-02) |
| media | 22-autonomo-ed-empleado-local-madrid | 303 1T 28 | 5.400,00 | 12.500,01 | La casilla 28 del 303 suma las bases de los gastos sin IVA (nóminas y Seguridad Social a cargo de la empresa, tipo 0 %): bucket() en backend/src/domain/services/autonomo.ts añade a expenseBase todo gasto, también los de IVA 0. La 28 solo debe llevar la base de las cuotas soportadas deducibles. El resultado (71) no cambia. | Instrucciones del modelo 303 (AEAT), casillas 28-29 |
| media | 22-autonomo-ed-empleado-local-madrid | 303 2T 28 | 5.400,00 | 12.500,01 | La casilla 28 del 303 suma las bases de los gastos sin IVA (nóminas y Seguridad Social a cargo de la empresa, tipo 0 %): bucket() en backend/src/domain/services/autonomo.ts añade a expenseBase todo gasto, también los de IVA 0. La 28 solo debe llevar la base de las cuotas soportadas deducibles. El resultado (71) no cambia. | Instrucciones del modelo 303 (AEAT), casillas 28-29 |
| media | 22-autonomo-ed-empleado-local-madrid | 303 3T 28 | 5.400,00 | 12.500,01 | La casilla 28 del 303 suma las bases de los gastos sin IVA (nóminas y Seguridad Social a cargo de la empresa, tipo 0 %): bucket() en backend/src/domain/services/autonomo.ts añade a expenseBase todo gasto, también los de IVA 0. La 28 solo debe llevar la base de las cuotas soportadas deducibles. El resultado (71) no cambia. | Instrucciones del modelo 303 (AEAT), casillas 28-29 |
| media | 22-autonomo-ed-empleado-local-madrid | 303 4T 28 | 5.400,00 | 12.500,01 | La casilla 28 del 303 suma las bases de los gastos sin IVA (nóminas y Seguridad Social a cargo de la empresa, tipo 0 %): bucket() en backend/src/domain/services/autonomo.ts añade a expenseBase todo gasto, también los de IVA 0. La 28 solo debe llevar la base de las cuotas soportadas deducibles. El resultado (71) no cambia. | Instrucciones del modelo 303 (AEAT), casillas 28-29 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 1T 27 | 2.520,00 | 1.890,00 | No se autorrepercute el IVA de la adquisición intracomunitaria (casillas 10-11 y 36-37): falta la inversión del sujeto pasivo. El resultado no cambia (se devenga y se deduce lo mismo), pero las casillas 27 y 45 quedan cortas en 630 € por trimestre. | Art. 84.Uno.2.º y 85 Ley 37/1992; Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 1T 28 | 9.000,00 | 12.000,00 | La compra intracomunitaria (factura sin IVA) suma su base a la casilla 28 de operaciones interiores; debería ir a la 36. | Instrucciones del modelo 303 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 1T 45 | 2.520,00 | 1.890,00 | Igual que la 27: falta la deducción del IVA autorrepercutido de la adquisición intracomunitaria (casillas 36-37). | Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 2T 27 | 3.150,00 | 2.520,00 | No se autorrepercute el IVA de la adquisición intracomunitaria (casillas 10-11 y 36-37): falta la inversión del sujeto pasivo. El resultado no cambia (se devenga y se deduce lo mismo), pero las casillas 27 y 45 quedan cortas en 630 € por trimestre. | Art. 84.Uno.2.º y 85 Ley 37/1992; Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 2T 28 | 9.000,00 | 12.000,00 | La compra intracomunitaria (factura sin IVA) suma su base a la casilla 28 de operaciones interiores; debería ir a la 36. | Instrucciones del modelo 303 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 2T 45 | 2.520,00 | 1.890,00 | Igual que la 27: falta la deducción del IVA autorrepercutido de la adquisición intracomunitaria (casillas 36-37). | Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 3T 27 | 2.520,00 | 1.890,00 | No se autorrepercute el IVA de la adquisición intracomunitaria (casillas 10-11 y 36-37): falta la inversión del sujeto pasivo. El resultado no cambia (se devenga y se deduce lo mismo), pero las casillas 27 y 45 quedan cortas en 630 € por trimestre. | Art. 84.Uno.2.º y 85 Ley 37/1992; Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 3T 28 | 9.000,00 | 12.000,00 | La compra intracomunitaria (factura sin IVA) suma su base a la casilla 28 de operaciones interiores; debería ir a la 36. | Instrucciones del modelo 303 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 3T 45 | 2.520,00 | 1.890,00 | Igual que la 27: falta la deducción del IVA autorrepercutido de la adquisición intracomunitaria (casillas 36-37). | Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 4T 27 | 3.150,00 | 2.520,00 | No se autorrepercute el IVA de la adquisición intracomunitaria (casillas 10-11 y 36-37): falta la inversión del sujeto pasivo. El resultado no cambia (se devenga y se deduce lo mismo), pero las casillas 27 y 45 quedan cortas en 630 € por trimestre. | Art. 84.Uno.2.º y 85 Ley 37/1992; Manual práctico IVA 2025, caso oficial 303-01 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 4T 28 | 9.000,00 | 12.000,00 | La compra intracomunitaria (factura sin IVA) suma su base a la casilla 28 de operaciones interiores; debería ir a la 36. | Instrucciones del modelo 303 |
| media | 23-autonomo-intracomunitario-exportador-cataluna | 303 4T 45 | 2.520,00 | 1.890,00 | Igual que la 27: falta la deducción del IVA autorrepercutido de la adquisición intracomunitaria (casillas 36-37). | Manual práctico IVA 2025, caso oficial 303-01 |

## Pendientes por motivo

- 2 × El motor no guarda saldos de años anteriores ni posteriores.
- 1 × Sus importes dependen del número de hijos y de la renta: no se ha confirmado la regla 2025 con un caso oficial.
- 1 × Límites de renta y requisitos 2025 no confirmados con un caso oficial.
- 1 × Dato informativo (sí, por superar el segundo pagador 1.500 € y el total 15.876 €): el motor no lo calcula.
- 1 × El motor recibe la base del ahorro ya neta: no calcula ganancias por lotes.
- 1 × Declaración informativa, sin cuota: fuera del motor.
- 1 × El motor recibe la base del ahorro ya neta: no calcula FIFO ni la compensación del art. 49.
- 1 × El motor no recibe ganancias exentas: se comprueba solo que la base del ahorro no la incluye.
- 1 × El motor recibe la base del ahorro ya calculada.
- 1 × Requisitos 2025 no confirmados con un caso oficial.
- 1 × Sí: 2.º y siguientes pagadores 9.000 € > 1.500 € y total 21.000 € > 15.876 € (art. 96.3 LIRPF). El motor no lo calcula.
- 1 × No tributa en el IRPF del donatario (art. 6.4 LIRPF): se declara en el Impuesto sobre Donaciones de Castilla-La Mancha, fuera de Finanverso.
- 1 × El motor recibe la base del ahorro ya calculada: no calcula la ganancia de un inmueble.
- 1 × No: total 15.000 € ≤ 15.876 € aunque el segundo pagador pase de 1.500 € (art. 96.3 LIRPF); le conviene declarar para que le devuelvan. El motor no lo calcula.
- 1 × El motor no guarda saldos de años anteriores: recibe la base del ahorro ya compensada.
- 1 × El motor recibe la base del ahorro ya neta.
- 1 × El motor recibe la base del ahorro ya neta: no calcula permutas ni FIFO.
- 1 × No se compara aquí: la deducción del 60 % cambia con la cuota de la conjunta y el formulario solo guarda un importe.
