# Cómo se pagan las comisiones (resumen orientativo)

> **Orientativo, no es asesoramiento fiscal.** Resume reglas generales del IVA y del IRPF a 20-10-2026 para
> que el dueño lo hable con su gestor, que es quien decide. Cada caso depende de cómo esté dado de alta el
> creador y de la forma jurídica del titular de Finanverso (autónomo o sociedad). Nada de esto se ha
> automatizado: el pago es siempre una transferencia manual.

## 1. El circuito, paso a paso

1. **Mes vencido**: el dueño ejecuta `npm run creators -- report` y mira la columna «Neto ahora» de cada
   creador (comisiones que ya pasaron los 45 días de espera, menos devoluciones).
2. Si el neto llega a **20 €** (pago mínimo propuesto), se lo comunica al creador con el detalle
   (`report CODIGO`: fecha, plan, canal y estado; sin datos de usuarios).
3. El creador envía su **factura** (o el documento que corresponda, ver §2).
4. El dueño comprueba la factura (§3), **transfiere** el importe y ejecuta `npm run creators -- paid CODIGO`
   para apuntarlo. Guarda factura, justificante y la pieza publicada.
5. Trimestral y anualmente, el gestor presenta lo que proceda (111, 190, 303, 349, 347: ver §4).

## 2. Según quién sea el creador

| Creador | Documento | IVA | Retención de IRPF | Notas |
|---|---|---|---|---|
| **Autónomo en España, actividad empresarial** (p. ej. IAE sección 1.ª, epígrafe 844 «servicios de publicidad, relaciones públicas y similares») | Factura completa | 21 % repercutido | **No** se retiene | Es el caso más frecuente de creadores de contenido; confirmar su epígrafe |
| **Autónomo en España, actividad profesional** (IAE sección 2.ª, p. ej. epígrafe 751 «profesionales de la publicidad, relaciones públicas y similares») | Factura completa | 21 % | **Sí: 15 %** (7 % el año de inicio de la actividad y los dos siguientes, si lo comunica por escrito) | Finanverso ingresa la retención en el modelo 111 |
| **Sociedad española** (SL…) | Factura completa | 21 % | En general **no** | — |
| **Empresa o autónomo de otro país de la UE** | Factura sin IVA español, con su NIF-IVA (VIES) | **Inversión del sujeto pasivo**: Finanverso se autorrepercute y se deduce el IVA en el 303 | No | Finanverso declara la operación en el **349** (servicios recibidos) |
| **Fuera de la UE** (o Canarias, Ceuta, Melilla) | Factura sin IVA español | Inversión del sujeto pasivo (303) | Según convenio de doble imposición | Consultar con el gestor antes de aceptarlo |
| **Particular sin alta** | — | — | Depende de cómo lo califique el gestor | **No recomendado al principio** (§5) |

Esto vale si el titular de Finanverso está dado de alta y **en el régimen general del IVA**: entonces el
IVA de la factura del creador se deduce en el 303 y no es un coste. Si no lo está, el IVA sí es coste.

## 3. Qué debe tener la factura del creador

- Número y fecha; nombre o razón social, NIF y domicilio de las dos partes.
- Concepto: «Comisiones del programa de creadores de Finanverso: ventas validadas de [mes/año], código
  [CODIGO]».
- Base imponible (la suma de comisiones), tipo y cuota de IVA, retención de IRPF si procede y total.
- Si no lleva IVA español: la mención que corresponda (por ejemplo, «inversión del sujeto pasivo»).
- A partir de 2027, el programa de facturación del creador deberá cumplir las reglas de VERI*FACTU según
  el calendario que esté en vigor; es responsabilidad suya.

**Ejemplo** (autónomo profesional con retención del 15 %, diez Premium anuales):

| Concepto | Importe |
|---|---|
| Base: 10 × 7 € | 70,00 € |
| IVA 21 % | + 14,70 € |
| Retención IRPF 15 % | − 10,50 € |
| **Total que se transfiere** | **74,20 €** |
| Lo que Finanverso ingresa a Hacienda en el 111 | 10,50 € |

## 4. Obligaciones de Finanverso que pueden aparecer

| Modelo | Cuándo | Si… |
|---|---|---|
| **111** (retenciones de profesionales) | Trimestral: 1-20 de abril, julio y octubre, y 1-20 de enero | Se ha practicado alguna retención en el trimestre |
| **190** (resumen anual de retenciones) | Enero del año siguiente | Se ha presentado algún 111 en el año. Además, se entrega al creador un certificado de retenciones |
| **303** (IVA) | Trimestral | Siempre que Finanverso declare IVA: deduce el IVA soportado y, en inversión del sujeto pasivo, se lo autorrepercute |
| **349** (operaciones intracomunitarias) | Según el volumen, mensual o trimestral | Creadores de otro país de la UE |
| **347** (operaciones con terceros) | Febrero | Pagos a un mismo creador de más de 3.005,06 € en el año (sin retención declarada en el 190). Con el tope de 300 € no se llega |

Contabilidad: la comisión es un gasto de publicidad. Guardar contrato, facturas, justificantes y una copia
o enlace de cada pieza publicada (sirve para justificar el gasto y para el contrato).

## 5. Creadores particulares (sin alta) y pagos en especie

- Si alguien cobra de forma continuada por publicitar productos, Hacienda suele verlo como **actividad
  económica**: el creador tendría que darse de alta (censo de Hacienda y, si hay habitualidad, Seguridad
  Social). Eso es responsabilidad suya, pero pagar a particulares sin alta complica a Finanverso:
  calificación de la renta, posible retención e ingreso a cuenta, y certificados.
- **Propuesta para el piloto:** trabajar solo con creadores que **facturen** (autónomos o sociedades). A
  los que no estén de alta, ofrecer **Premium vitalicio** a cambio de una colaboración puntual, en lugar de
  comisión. Ojo: un pago en especie también es renta para quien lo recibe y puede obligar a Finanverso a
  un ingreso a cuenta si el creador es profesional: **preguntarlo al gestor** antes de ofrecerlo.

## 6. Preguntas para el gestor

1. ¿Qué epígrafe del IAE y qué régimen tiene cada creador, y por tanto si hay que retener?
2. ¿Cómo tratamos los pagos en especie (Premium vitalicio) a creadores?
3. ¿Aceptamos particulares sin alta? Si sí, ¿con qué documento y retención?
4. Creadores de fuera de España: ¿qué pedimos (certificado de residencia fiscal, NIF-IVA en VIES)?
5. ¿Pago mínimo de 20 € y una vez al mes le parece razonable para no multiplicar facturas?
