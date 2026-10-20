# Alta de un creador y hoja de seguimiento

## 1. Checklist de alta (por cada creador)

**Antes de hablar con él**

- [ ] Encaja con el público: finanzas personales, autónomos o Renta; 2.000-50.000 seguidores; mayoría de
      público adulto en España.
- [ ] Revisar sus últimas 20 piezas: no promete rentabilidades, no hace cripto/forex «para ganar dinero»,
      etiqueta su publicidad y no ha tenido polémicas de engaño.

**Acuerdo**

- [ ] Enviarle `condiciones-creadores.md` (la versión revisada por el abogado) con las cifras rellenadas.
- [ ] Pedirle por escrito: nombre o razón social, NIF/NIE, domicilio, email, IBAN, **cómo factura**
      (autónomo, epígrafe del IAE, sociedad, país) y si aplica la retención reducida del 7 %.
      Guardarlo en la **carpeta privada** del dueño, **no en el repositorio** (es público) **ni en la base de
      datos** (allí solo va un alias).
- [ ] Decidir con él un **código** de 3 a 20 letras o cifras, fácil de decir en voz alta (p. ej. `LOLA`).
- [ ] Firmar (vale una firma electrónica o un «acepto» por email que quede guardado).

**Puesta en marcha**

- [ ] `npm run creators -- add CODIGO "@alias"` (con tope propio si se pacta: `… "@alias" 100`).
- [ ] Probar el enlace `https://finanverso.app/?aff=CODIGO` en una ventana privada: en «Crear cuenta» sale
      la casilla con su código, sin marcar.
- [ ] Enviarle el kit: enlace, código, logotipo y capturas, la lista de lo que **no** puede decir
      (condiciones §4.2) y las frases correctas, por ejemplo:
  - «Finanverso te ayuda a preparar y revisar tu Renta; la presentas tú en la Agencia Tributaria.»
  - «No es una gestoría: si tu caso es complicado, consulta con un profesional.»
  - «Enlace de afiliado: si contratas Premium, gano una comisión.»
- [ ] Explicarle la limitación: solo cuenta quien se registra **en la misma visita** desde el enlace, en la
      web, y marca la casilla.
- [ ] Apuntarlo en la hoja de seguimiento (pestaña «Creadores»).

**Cada pieza publicada**

- [ ] Etiqueta visible al principio («Publi», «Colaboración pagada»…) y herramienta de contenido de marca
      de la red activada.
- [ ] Sin promesas de ahorro ni de devoluciones, sin «gestoría» ni «presenta por ti».
- [ ] Apuntar enlace y fecha en la pestaña «Piezas». Si incumple: pedir corrección en 48 h y, si no, `off`.

**Cada mes**

- [ ] `npm run creators -- report` y copiar las cifras a la pestaña «Mensual».
- [ ] Pagar a quien tenga neto ≥ 20 € (`pagos-y-fiscalidad.md`) y ejecutar `paid CODIGO`.
- [ ] Guardar factura y justificante.

**Baja**

- [ ] `npm run creators -- off CODIGO`. Las ventas en espera se pagan cuando la superen (salvo
      incumplimiento).

## 2. Hoja de seguimiento

Plantilla: [`hoja-seguimiento.csv`](hoja-seguimiento.csv). Se importa en Google Sheets o Excel y se
divide en tres pestañas, una por bloque (las filas que empiezan por `#` son los títulos). **No poner en ella
datos fiscales ni bancarios**: esos van en la carpeta privada.

| Pestaña | Columnas | De dónde sale |
|---|---|---|
| **Creadores** | código, alias, red principal, seguidores, fecha de alta, tipo (autónomo/sociedad/UE), retención (0/7/15 %), tope propio, estado, notas | Acuerdo |
| **Piezas** | fecha, código, red, enlace a la pieza, tipo (vídeo/historia/post), etiqueta visible (sí/no), revisada (sí/no), incidencias | Revisión manual |
| **Mensual** | mes, código, altas, ventas, en espera, a pagar (€), a descontar (€), neto pagado (€), nº de factura, fecha de pago | `npm run creators -- report` y facturas |

Indicadores para decidir cada trimestre:

- **Ventas por pieza** y **altas por pieza** (las altas solo cuentan con casilla marcada).
- **Coste por venta** = neto pagado / ventas válidas (debería ser ≤ 7 €).
- **% devoluciones** = devueltas / ventas (alarma si supera el 10 %).
- Compararlo con el resto de canales del embudo (`npm run funnel`).
