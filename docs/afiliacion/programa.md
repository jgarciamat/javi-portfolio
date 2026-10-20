# Programa de afiliación para creadores (D7)

**Fecha:** 20-10-2026 · **Estado:** diseño aprobado en D7 («sí, con tope y contrato simple»); el código está
en `develop` **apagado** (`CREATOR_PROGRAM=false`). **Para:** el dueño. Las cifras son una propuesta: se
cambian con variables de entorno, sin tocar código.

Documentos de esta carpeta:

| Documento | Para qué |
|---|---|
| `programa.md` (este) | Reglas del programa, cifras, privacidad y cómo funciona por dentro |
| [`condiciones-creadores.md`](condiciones-creadores.md) | Plantilla de contrato para el creador (revisar con un abogado) |
| [`pagos-y-fiscalidad.md`](pagos-y-fiscalidad.md) | Cómo se paga: factura, IVA, retenciones, 111/190/347 (orientativo) |
| [`alta-y-seguimiento.md`](alta-y-seguimiento.md) | Checklist de alta de un creador y hoja de seguimiento |
| [`hoja-seguimiento.csv`](hoja-seguimiento.csv) | Plantilla de la hoja (se abre con Excel, Numbers o Google Sheets) |

---

## 1. Resumen en una tabla

| Regla | Propuesta | Variable |
|---|---|---|
| Comisión por Premium **anual** (29,99 €) | **7 €** | `CREATOR_COMMISSION_YEARLY_EUR` |
| Comisión por Premium **mensual** (3,49 €) | **2 €** (una sola vez) | `CREATOR_COMMISSION_MONTHLY_EUR` |
| Comisión por plan **fundador** (59 €, pago único) | **10 €** | `CREATOR_COMMISSION_LIFETIME_EUR` |
| Pase de la Renta, renovaciones, cambios de plan | **0 €** | — |
| Tope por creador | **300 € por año natural** (≈ 43 anuales) | `CREATOR_CAP_EUR` (o uno propio por creador) |
| Tope global del programa | **1.500 € por año natural** | `CREATOR_GLOBAL_CAP_EUR` |
| Ventana de atribución | El primer pago debe llegar en los **90 días** siguientes al alta | `CREATOR_WINDOW_DAYS` |
| Periodo de espera antes de pagar | **45 días** desde el cobro | `CREATOR_HOLD_DAYS` |
| Devoluciones y contracargos | Anulan la comisión si llegan en los **120 días** siguientes al cobro; si ya estaba pagada, se descuenta del siguiente pago | fijo en el código (`CREATOR_CLAWBACK_DAYS`) |
| Pago mínimo | Se paga cuando el neto llega a **20 €** (si no, se acumula); como mucho una vez al mes | decisión manual |
| Forma de pago | Transferencia manual del dueño, contra factura o recibo. **Nada se paga solo** | — |

### Por qué estas cifras

- **Economía del plan** (`docs/marketing/plan-crecimiento.md` §7): el valor de un cliente Premium ronda
  **25 €** y la afiliación es el único canal «sin riesgo», porque solo se paga si hay venta. El plan ponía
  como ejemplo «30 % del primer año ≈ 7 €».
- **Anual:** 29,99 € con IVA son 24,79 € sin IVA. Tras la comisión de Stripe (≈ 0,6 €) quedan ≈ 24 €; en
  Google Play (15 %), ≈ 21 €. **7 € es el 29-33 % del neto** y deja ≈ 14-17 € de margen el primer año, más
  las renovaciones, que no pagan comisión.
- **Mensual:** 3,49 € son 2,88 € sin IVA. Con una permanencia media prudente de 4-5 meses el cliente deja
  ≈ 11-13 €; **2 € es el 15-18 %**. Se paga una sola vez, aunque renueve.
- **Fundador:** 59 € son 48,76 € sin IVA; **10 € ≈ 20 %**. Es un plan con plazas limitadas: no hace falta
  incentivarlo más.
- **Topes:** el de 300 € por creador evita depender de uno solo y limita el daño si alguien hace trampas;
  el global de 1.500 € al año protege la caja. Llegar a 1.500 € supone ≥ 214 ventas anuales, es decir,
  ≥ 5.000 € de ingresos netos: **si se alcanza, el programa va bien** y el dueño puede subirlo.
- **Espera de 45 días:** cubre los 14 días de desistimiento (aunque el usuario renuncia a él al pagar, ver
  condiciones de contratación), los reembolsos de Google Play y la mayoría de los contracargos.
- **Contracargos hasta 120 días:** es el plazo habitual de reclamación con tarjeta (Visa y Mastercard).
- **Ventana de 90 días:** la prueba gratis dura 14 días y mucha gente compra en la campaña de la Renta
  (abril-junio), semanas después de ver el vídeo.

> Primera temporada recomendada: **piloto con 3-5 creadores** de 2.000-50.000 seguidores (plan §5,
> «Alianzas») entre febrero y junio de 2027, con el tope global bajado a **500 €** (`CREATOR_GLOBAL_CAP_EUR=500`)
> hasta ver datos reales.

---

## 2. Qué es una venta válida

Cuenta como venta, y genera comisión, **solo** cuando se cumple todo esto:

1. Es una **cuenta nueva** creada desde el enlace del creador (`finanverso.app/?aff=CODIGO`) y la persona
   **marcó la casilla** «Me ha recomendado Finanverso el creador con el código …» al registrarse (por email
   o con Google). Sin casilla no hay atribución.
2. Es el **primer pago real de Premium** de esa cuenta (mensual, anual o fundador): un cobro mayor que 0.
   No cuentan la prueba gratis, un cupón del 100 %, el pase de la Renta, las renovaciones ni los cambios
   de plan.
3. Llega en los **90 días** siguientes al alta.
4. No se ha devuelto ni ha tenido contracargo durante los **45 días** de espera.
5. No supera el tope del creador ni el global de ese año (la última venta puede cobrarse en parte).
6. No es una venta prohibida por las condiciones: cuentas del propio creador o de su hogar, cuentas
   falsas o compradas, incentivos al seguidor no pactados (por ejemplo, devolverle parte de la comisión),
   pujar por la marca «Finanverso» en anuncios, spam o publicaciones sin etiquetar como publicidad
   (`condiciones-creadores.md` §4). Si el dueño detecta una, la anula a mano (ver §6).

Cada cuenta solo puede tener **un creador** (el del alta) y **una comisión** como máximo.

## 3. Estados de una venta (lo que enseña el informe)

| Estado | Significa | ¿Se paga? |
|---|---|---|
| `en espera` | Cobrada hace menos de 45 días | Todavía no |
| `a pagar` | Pasó la espera sin devolución | Sí, en el siguiente pago |
| `pagada` | Ya se transfirió | — |
| `devuelta` | Reembolso o contracargo antes de pagarla | No |
| `devuelta tras pagar: a descontar` | Reembolso después de pagarla | Se resta del siguiente pago |
| `sobre el tope` | Válida, pero el tope del año ya estaba lleno | No |

---

## 4. Privacidad: cómo se atribuye sin rastrear

Restricciones de partida: D4 quitó `mm_acq` del navegador por la LSSI (art. 22.2) y `docs/analitica.md`
dice que **no se guarda el origen en la cuenta**. Atribuir una venta a un creador sí exige guardar un dato
personal (esta cuenta → este código), así que se hace **solo con consentimiento** y lo mínimo posible:

- **Antes del registro no se guarda nada en el dispositivo**: ni cookie, ni `localStorage`, ni
  `sessionStorage`. El código del enlace se lee al cargar la página y se queda **en memoria** mientras dura
  esa visita (`frontend/src/core/creatorCode.ts`). Si la persona recarga o vuelve otro día, el código se
  pierde (es el mismo precio que ya se paga con las UTM).
- En la página de registro aparece una **casilla sin marcar**, solo si la visita llegó con `?aff=`:
  «Me ha recomendado Finanverso el creador con el código LOLA. Acepto que se guarde que mi cuenta viene de
  ese código, para que pueda cobrar una comisión si contrato Premium. El creador no verá mi nombre ni mi
  email.» El código viaja en la petición de alta **solo si está marcada** (`creator: { code, consent: true }`);
  sin `consent: true` el servidor no guarda nada. Salir de la página desmarca la casilla.
- En la base de datos solo se guarda **cuenta → código y fecha** (`creator_attributions`) y, si hay venta,
  **plan, canal, fecha, comisión y si se devolvió** (`creator_sales`). Nada más: ni IP, ni importes de la
  persona, ni su email.
- El creador **no recibe datos personales**: solo números agregados (altas, ventas, comisión).
- **Exportación** (derecho de acceso): la exportación JSON incluye la sección `creator` (código, fecha del
  consentimiento y venta, si la hay).
- **Retirar el consentimiento**: la persona escribe a support@finanverso.app y el dueño ejecuta
  `npm run creators -- forget EMAIL`. Se borra la atribución; si ya había una venta, queda solo como
  **registro contable anónimo** (sin cuenta asociada).
- **Baja de la cuenta**: la atribución se borra con la cuenta; la venta, si existe, queda anónima.
- Los textos legales **no se han tocado**: los cambios propuestos están en
  `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md` (puntos 24-30).

Lo que **no** cubre esta versión (decisión del dueño, ver §8): quien llega por el enlace y se registra otro
día, o desde la app de Android instalada desde Play, no queda atribuido. La solución respetuosa sería un
campo opcional «¿Te ha recomendado un creador? Escribe su código» en el registro (el usuario lo escribe él
mismo: no hay nada guardado antes).

---

## 5. Cómo funciona por dentro (resumen técnico)

| Pieza | Dónde |
|---|---|
| Interruptor y cifras | `backend/src/config/env.ts` (`CREATOR_*`), ejemplos en `backend/.env.example` y `deploy/.env.example` |
| Tablas | Migración `036-creator-affiliates.ts`: `creator_affiliates` (código, alias, tope propio, activo), `creator_attributions` (cuenta → código), `creator_sales` |
| Reglas (ventana, topes, espera, devoluciones) | `backend/src/application/creators/CreatorProgram.ts` |
| Alta con la casilla | `POST /api/auth/register` y `/api/auth/google`, campo `creator` (validado aparte: un código malo nunca bloquea un registro) |
| Ventas web (Stripe) | `invoice.paid` con importe > 0 → venta mensual o anual (por el precio); `lifetime_purchased` → fundador |
| Devoluciones web | `charge.refunded` (reembolso total) y `charge.dispute.created` (contracargo) |
| Ventas Android (Google Play vía RevenueCat) | `INITIAL_PURCHASE`, `RENEWAL` o `NON_RENEWING_PURCHASE` con `period_type` distinto de `TRIAL` y `price` > 0; el plan sale del id del producto (`month`, `annual`/`year`, `lifetime`) |
| Devoluciones Android | `CANCELLATION` con `cancel_reason = CUSTOMER_SUPPORT`, o cualquier cancelación del plan fundador |
| Informe y gestión | `npm run creators -- …` (`backend/src/infrastructure/sqlite/creatorsCli.ts`) |

Con el programa **apagado**: no se atribuye a nadie y no se cuentan ventas nuevas, pero **sí se registran
las devoluciones** de ventas anteriores, para no pagar nunca algo devuelto.

### Órdenes

En local (`cd backend`):

```sh
npm run creators -- add LOLA "@lola.finanzas"        # alta; imprime el enlace
npm run creators -- add PEPE "@pepe" 100             # con tope propio de 100 €/año
npm run creators -- report                           # informe de todos
npm run creators -- report LOLA                      # detalle de sus ventas (fecha, plan, canal, estado)
npm run creators -- paid LOLA                        # apunta como pagado el neto (después de transferir)
npm run creators -- off LOLA                         # desactiva el código (las ventas ya hechas siguen)
npm run creators -- forget persona@example.com       # retira la atribución de un usuario
```

En producción, en el servidor:

```sh
docker compose exec api node dist/infrastructure/sqlite/cli.js creators report
```

El informe no enseña ningún id, email ni nombre de usuario.

---

## 6. Antes de encenderlo (checklist del dueño)

1. 👤 Leer y ajustar las cifras de §1; decidir el tope global de la primera temporada.
2. 👤 Revisar con un abogado `condiciones-creadores.md` y los textos de privacidad propuestos
   (`docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`, puntos 24-30), y publicarlos en la app.
3. 👤 Hablar con el gestor sobre `pagos-y-fiscalidad.md` (factura, IVA, retenciones, 111/190/347).
4. 👤 **Stripe** (panel → Desarrolladores → Webhooks → el endpoint de la API): añadir los eventos
   `invoice.paid` y `charge.dispute.created` (hoy no hacen falta para nada más). Sin ellos no se cuentan
   las ventas web ni los contracargos.
5. 👤 **RevenueCat**: comprobar que los ids de producto de Play contienen `month`, `annual` (o `year`) y
   `lifetime`; si no, decírselo al agente `app` para adaptar `playPlanOf`.
6. 👤 En el `.env` del servidor: `CREATOR_PROGRAM=true` y, si cambian, las cifras. Reiniciar la API.
7. 👤 Dar de alta a cada creador (`alta-y-seguimiento.md`) y probar su enlace en una ventana privada:
   debe salir la casilla en el registro.

**Anular una venta a mano** (fraude, cuenta del propio creador): de momento no hay orden; un agente puede
hacerlo con una consulta (`UPDATE creator_sales SET reversed_at = … WHERE id = …`) después de mirar el
detalle. Si se usa a menudo, añadir una orden `void`.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Atribución perdida (recarga, vuelta otro día, app Android) → el creador cobra menos de lo que trae | Explicarlo en el contrato («solo cuenta el registro hecho desde tu enlace en esa visita»); valorar el campo manual (§8) |
| Fraude: cuentas propias o compradas para cobrar | Solo se paga por cobros reales (pagar 29,99 € para cobrar 7 € no compensa), espera de 45 días, tope, una comisión por cuenta, cláusula de anulación |
| Publicidad encubierta o promesas falsas del creador (la marca responde también como anunciante) | Contrato con obligaciones de etiquetado y prohibiciones; revisar cada pieza antes o justo después de publicarse; poder desactivar el código al momento |
| Webhooks de Stripe sin `invoice.paid` → no se cuenta nada | Paso 4 del checklist; el informe de la primera semana debe mostrar ventas si hay pagos |
| Reembolso de una renovación muy posterior | Solo se anulan devoluciones en los 120 días siguientes a la venta |
| Pagos a particulares sin alta (problema fiscal) | Ver `pagos-y-fiscalidad.md`: empezar solo con creadores que facturen, o pagar en especie |
| Cambio de precios | La comisión se fija en el momento de la venta; cambiar las variables solo afecta a ventas futuras |

## 8. Decisiones pendientes del dueño

1. Cifras (§1) y tope de la primera temporada.
2. ¿Se paga por el pase de la Renta (10 €)? Propuesta: no en el piloto.
3. ¿Campo manual «código de creador» en el registro (también en Android)? Mejora mucho la atribución sin
   guardar nada antes del alta; es otra tarea pequeña.
4. ¿Se aceptan creadores particulares sin alta de autónomo? Propuesta: no al principio (ver fiscalidad).
5. ¿Retirar el consentimiento después de una venta anula la comisión? Propuesta: no (la venta ya ocurrió y
   queda anónima), pero confirmarlo con el abogado.
