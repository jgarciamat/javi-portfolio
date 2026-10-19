# Resultados del banco de pruebas

Cada cifra de `personas/*/esperado.json` contra el motor ACTUAL de la app. «Pendiente»: el motor no da esa cifra o la regla no se ha podido confirmar. Las discrepancias están en `discrepancias.json` con su causa probable.

| Parte | Coinciden | Discrepancias | Pendientes o no soportadas |
|---|---:|---:|---:|
| Renta (modelo 100, motor del frontend) | 2901 | 0 | 33 |
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

- 16 × El formulario de la Renta aún no recoge actividades económicas (el motor las calcula en rentaActivity.ts): ver actividadPropuesta en persona.json.
- 1 × Sus importes dependen del número de hijos y de la renta: no se ha confirmado la regla 2025 con un caso oficial.
- 1 × Límites de renta y requisitos 2025 no confirmados con un caso oficial.
- 1 × Declaración informativa, sin cuota: fuera del motor.
- 1 × Requisitos 2025 no confirmados con un caso oficial.
- 1 × No tributa en el IRPF del donatario (art. 6.4 LIRPF): se declara en el Impuesto sobre Donaciones de Castilla-La Mancha, fuera de Finanverso.
- 1 × No se compara aquí: la deducción del 60 % cambia con la cuota de la conjunta y el formulario solo guarda un importe.
- 1 × 54.000 × 92/365 = 13.610,96 €, exentos (art. 7.p LIRPF; RIRPF art. 6). El motor recibe ya la parte no exenta.
- 1 × No se integra en la base (DA 5.ª.1.c LIRPF): se declara solo como información.
- 1 × Exenta (DA 5.ª.1.a.6.ª LIRPF): no se integra.
- 1 × No se integran en la base (DA 5.ª.1.c y 5.ª.3 LIRPF): se declaran solo como información.
- 1 × Exenta (art. 7.h LIRPF): no forma parte de los rendimientos del trabajo.
- 1 × Se declara y queda exenta (art. 38.1): el motor recibe la base del ahorro ya neta.
- 1 × Exenta (art. 7.h LIRPF, menor de 22 años): no se declara como rendimiento.
- 1 × El motor no devuelve esta casilla (se comprueba solo en el cálculo a mano).
- 1 × La AEAT habla de «cantidades satisfechas» y no dice si se resta la ayuda: se toma el alquiler pagado entero (NO CONFIRMADO).
- 1 × Exenta (art. 7.h LIRPF).
- 1 × Exenta (art. 7.e LIRPF): no se suma a los rendimientos del trabajo; la parte que excede (8.000 €) va en el sueldo del primer pagador.
