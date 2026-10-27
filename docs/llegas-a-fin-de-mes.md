# «¿Llegas a fin de mes?»: cómo se calcula

La tarjeta del Resumen mensual ya no divide el saldo entre los días. Usa el ritmo de gasto del
mes, el de los meses anteriores y los pagos que aún faltan, y dice con cuánto terminarías el mes
y cuánto podrías gastar al día. Es orientativo: no es asesoramiento financiero.

- Cálculo (dominio, puro): `backend/src/domain/services/end-of-month.ts` (`planEndOfMonth`).
- Datos: `StatsService.forecast` en `backend/src/application/insights/InsightsServices.ts`;
  campo nuevo `endOfMonth` de `GET /api/stats/forecast` (los campos de antes siguen igual).
- Pantalla: `frontend/src/modules/finances/ui/components/EndOfMonthBlock.tsx`, dentro de
  `ForecastPanel`. El «Si gastas … al día» se calcula en el navegador con
  `frontend/src/modules/finances/domain/endOfMonth.ts` (`leftoverAt`).
- Pruebas: `backend/src/tests/domain/end-of-month.test.ts` (tabla de casos hechos a mano),
  `backend/src/tests/integration/data-and-insights.test.ts` (Forecast),
  `frontend/src/__tests__/finances/endOfMonth.test.tsx` y `forecast.test.tsx`.

## Las cifras

| Cifra | Qué es |
| --- | --- |
| **Disponible hoy** | El mismo «Saldo disponible» del resumen del mes (lo que suman las cuentas). |
| **Días que quedan** | De hoy a fin de mes, hoy incluido. «Hoy» es el día en Madrid (`madridDay`), aunque el servidor esté en UTC. |
| **Pagos que faltan** | Suscripciones detectadas (`subscriptions.ts`) que **no** se han cobrado este mes y cuyo próximo cobro cae entre hoy y fin de mes. Si su fecha ya pasó y no llegó, no se cuentan. |
| **Ya anotados con fecha posterior** | Gastos de este mes con fecha después de hoy. Ya están restados del saldo disponible: se enseñan, pero no se restan otra vez. |
| **Gasto del día a día del mes** | Gastos hasta hoy **sin**: operaciones automáticas (`recurringRuleId`) ni cargos con su mismo nombre, suscripciones detectadas, traspasos entre cuentas propias («traspaso», «entre cuentas», «cuenta propia», «mismo titular», categoría «Traspasos»; las transferencias de la app no son transacciones), categoría Ahorro o Inversiones, ingresos, ahorro (`SAVING`) ni gastos puntuales. |
| **Días transcurridos** | Del día 1 del mes (o de tu primera transacción, si empezaste este mes) a hoy, ambos incluidos. |
| **Histórico** | Los últimos meses completos (hasta 6) con al menos 7 días de datos. Gasto del día a día de cada mes ÷ sus días, y la media de esos meses. |
| **Meses fuera de la media** | Con 3 meses o más, el mes cuyo gasto diario pasa de 3 veces la mediana se deja fuera de la media y se dice cuál es. |
| **Gastos puntuales** | Un gasto suelto que pasa de 3 veces el gasto típico (la mediana de los gastos) **y** de dos semanas de gasto habitual. Se deja fuera del ritmo (de este mes y de los anteriores) y se lista. |

Operaciones automáticas: la app las anota el primer día del mes, así que cuando miras la tarjeta
ya están en el saldo disponible. Si mueves una a otro día del mes, sale en «Ya anotados con fecha
posterior».

## La fórmula

```
ritmo habitual   = (gasto del mes + 7 × histórico) ÷ (días transcurridos + 7)
                   sin histórico: gasto del mes ÷ días transcurridos  (aviso «pocos datos»)
terminarías con  = disponible − pagos que faltan − ritmo habitual × días que quedan
máximo al día    = (disponible − pagos que faltan) ÷ días que quedan   (nunca negativo)
si gastas X/día  = disponible − pagos que faltan − X × días que quedan
```

El histórico cuenta como **una semana más de datos**: al principio del mes pesa más (el día 1,
7 de cada 8 partes) y a final de mes pesa menos (el día 27, 7 de 34). Así un gasto grande el día 2
no dispara el ritmo y, a final de mes, manda lo que de verdad llevas.

Colores (borde y cifra principal): **verde** si te sobraría al menos lo de tres días a tu ritmo;
**ámbar** si te sobraría menos; **rojo** si no llegarías (cifra negativa).

Sin datos suficientes (menos de 5 transacciones o menos de 7 días desde la primera), la tarjeta
no adivina: pide más datos. El Resumen mensual ya no enseña el panel antes de eso (`useEnoughData`).

## Ejemplo completo (la captura del dueño: 2.317,52 € y 5 días)

Hoy es 27 de octubre de 2026: quedan 5 días (27, 28, 29, 30 y 31) y han pasado 27.

**Octubre hasta hoy**

| Transacción | Importe | ¿Cuenta en el día a día? |
| --- | ---: | --- |
| Alquiler (operación automática, día 1) | 800,00 € | No: recurrente, ya cobrado |
| Nómina | +2.500,00 € | No: ingreso |
| GIMNASIO CENTRO (suscripción, día 2) | 35,00 € | No: suscripción ya cobrada este mes |
| Traspaso a cuenta ahorro | 300,00 € | No: traspaso entre tus cuentas |
| Fondo indexado (categoría Inversiones) | 200,00 € | No: ahorro / inversión |
| Hucha (ahorro) | 150,00 € | No: ahorro |
| Supermercado | 950,00 € | Sí |
| Gasolina | 540,00 € | Sí |
| Restaurante | 400,00 € | Sí |
| Dentista (anotado para el 30) | 60,00 € | No: fecha posterior, ya restado del saldo |

Gasto del día a día: 950 + 540 + 400 = **1.890,00 €** en 27 días = **70,00 €/día**.

**Meses anteriores** (sin Netflix ni el gimnasio, que son suscripciones)

| Mes | Gasto del día a día | Días | Al día |
| --- | ---: | ---: | ---: |
| Septiembre | 2.250,00 € | 30 | 75,00 € |
| Agosto | 2.232,00 € | 31 | 72,00 € |
| Julio | 2.418,00 € | 31 | 78,00 € |

Histórico: (75 + 72 + 78) ÷ 3 = **75,00 €/día**. Ningún mes pasa de 3 × 75 y ningún gasto suelto
es puntual (el típico es 1.000 €; harían falta más de 3.000 €).

**Pagos que faltan**

| Concepto | Fecha | Importe |
| --- | --- | ---: |
| NETFLIX.COM (último cobro 29 de septiembre) | 29 de octubre | 12,99 € |
| Seguro hogar (anual, último cobro 30-10-2025) | 30 de octubre | 186,40 € |
| **Total** | | **199,39 €** |

Spotify, que tocaba el 20 de octubre y no ha llegado, no se cuenta.

**Resultado**

```
ritmo habitual  = (1.890,00 + 7 × 75,00) ÷ (27 + 7) = 2.415,00 ÷ 34 = 71,03 €/día
terminarías con = 2.317,52 − 199,39 − 71,03 × 5   = 1.762,98 €          (verde)
máximo al día   = (2.317,52 − 199,39) ÷ 5         = 423,62 €/día
si gastas 100 €/día → te quedarían 2.118,13 − 500,00 = 1.618,13 € para ahorrar o invertir
si gastas 500 €/día → no llegarías a fin de mes con ese ritmo, te faltarían 381,87 €
```

La tarjeta de antes decía «463,50 € al día» (2.317,52 ÷ 5, sin contar los 199,39 € que faltan) y,
con estas transacciones, «terminarías el mes con 1.940,69 €» (la media bruta de julio a
septiembre, 2.336,32 €/mes con suscripciones incluidas, × 5/31 días; en la captura del dueño,
con sus datos, 1.945,61 €). La cifra nueva cuenta los pagos que faltan, es más prudente y se puede
comprobar a mano desde «Cómo lo calculamos».

Este ejemplo está en la prueba `reproduces the worked example…` del dominio y es el que se ve en
las capturas de `docs/auditoria-recorrido-2026-10-26/despues/llegas-a-fin-de-mes/` (390 y 1280 px,
claro y oscuro), hechas con el servidor real y estas transacciones cargadas.

## Mes con saldo negativo

Con −3.575,08 € disponibles, 12,99 € pendientes, 540 € de gasto del día a día en 27 días (20 €/día)
y sin histórico: terminarías con −3.575,08 − 12,99 − 20 × 5 = **−3.688,07 €** (rojo), máximo al
día 0 («Este mes ya no te queda saldo disponible») y el control dice «te faltarían …».

## Qué hacer con lo que sobre

Dos enlaces dentro de la app, sin recomendar comprar nada: **Cómo invertir** (la guía de
inversión) y **Consola crypto** (simulador para aprender con dinero ficticio). Los textos dicen
«podrías destinarlo» y «lo que te sobraría»; nunca «te recomendamos», «ahorrarás», «exacto» ni
«garantizado» (lo vigila `endOfMonth.test.tsx`).
