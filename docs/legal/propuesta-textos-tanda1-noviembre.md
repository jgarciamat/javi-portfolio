# Propuesta de textos legales: tanda 1 de captación y retención (noviembre de 2026)

Fecha: 13 de noviembre de 2026. Estado: **propuesta para que la apruebe el dueño. No se ha
editado ningún texto legal** (`app.privacy.*`, `terms.*`). Acompaña a los commits de la tanda 1 de
`docs/plan-captacion-retencion.md` (invitaciones con un mes por amigo, calculadoras abiertas y
reseña de Google Play tras un logro).

Hasta que se aprueben, la política y las condiciones publicadas siguen describiendo los tramos
antiguos de las invitaciones («hasta 5 meses»). La pantalla «Invita a un amigo» ya explica la regla
nueva completa.

## 1. Política de privacidad

### 1.1 Invitaciones: qué guardamos (`app.privacy.s2.item8`)

Texto actual: «Si te registras con un enlace de invitación, guardamos quién te invitó y si has
completado los primeros pasos (3 movimientos, 1 presupuesto, 1 meta y 1 automatización). Al
completarlos recibes 30 días de Premium, y quien te invitó suma meses de Premium según los amigos
que los completen (hasta 5). También guardamos tu código de invitación y los meses que has ganado.»

Propuesta (es):

> Si te registras con un enlace de invitación, guardamos quién te invitó, si la invitación ya
> cuenta y, para quien invita, cuándo recibió el mes de Premium por ti. La invitación cuenta cuando
> completas los primeros pasos (3 movimientos, 1 presupuesto, 1 meta y 1 automatización) y apuntas
> movimientos en 3 días distintos de tu primer mes; para comprobarlo usamos las fechas de tus
> movimientos, sin guardar nada más. Entonces recibes 30 días de Premium y quien te invitó gana un
> mes (como mucho 3 al mes y 6 al año). Para evitar abusos comparamos tu email con el de quien te
> invitó y con los de sus otros invitados escrito de forma normalizada (por ejemplo, sin puntos ni
> «+etiqueta» en Gmail), y los emails de servicios de correo temporal no dan meses; esa comparación
> se hace en el momento y no se guarda. También guardamos tu código de invitación y los meses que
> has ganado.

Propuesta (en):

> If you sign up with an invitation link, we keep who invited you, whether the invitation already
> counts and, for the person who invited you, when they got their month of Premium for you. The
> invitation counts once you complete the first steps (3 transactions, 1 budget, 1 goal and 1
> automation) and write down transactions on 3 different days of your first month; to check it we
> use the dates of your transactions and keep nothing else. You then get 30 days of Premium and the
> person who invited you gets a month (at most 3 a month and 6 a year). To prevent abuse we compare
> your email address, in a normalised form (for example, without the dots or the "+tag" in Gmail),
> with that of the person who invited you and of their other guests, and throwaway email services
> earn no months; that comparison is made on the spot and is not stored. We also keep your
> invitation code and the months you have earned.

### 1.2 Base jurídica de las invitaciones (`app.privacy.s3.item6`)

Cambiar «y los meses para quien invita» por «y un mes por amigo para quien invita». La base sigue
siendo la ejecución del contrato. La comprobación antiabuso (días de uso, emails normalizados,
correo temporal) puede ir en la misma línea o, si se prefiere separar, en la de interés legítimo
(`app.privacy.s3.item10`: «proteger el servicio…»). Recomendación: añadirla a `s3.item10`:

> …y proteger el servicio con límites de intentos, registros técnicos y las comprobaciones que
> evitan abusos del programa de invitaciones: interés legítimo (art. 6.1.f).

### 1.3 Calculadoras abiertas: lo que se guarda en la pestaña (`app.privacy.s8`)

Las calculadoras de sueldo neto y de cuota de autónomos se usan sin cuenta. Si la persona pulsa
«Crear cuenta gratis» o «Ya tengo cuenta» bajo el resultado, las cifras que ha escrito se guardan en
esa pestaña del navegador (`sessionStorage`) para seguir con ellas al entrar, y se borran en cuanto
la calculadora las lee con la sesión iniciada. No salen del navegador. Es almacenamiento necesario
para un servicio que la persona pide (LSSI, art. 22.2): no requiere banner.

Propuesta de nuevo punto en `s8` (es):

> Las cifras que escribes en una calculadora abierta si pulsas «Crear cuenta gratis» o «Ya tengo
> cuenta», guardadas solo en esa pestaña (sessionStorage) para que sigas con ellas al entrar; se
> borran en cuanto inicias sesión o cierras la pestaña.

(en):

> The figures you type in an open calculator if you press "Create free account" or "I already have
> an account", kept only in that tab (sessionStorage) so you can carry on with them when you sign
> in; they are deleted as soon as you sign in or close the tab.

Nota: `s8.p1` dice «(localStorage)»; con este punto conviene decir «(localStorage y, en un caso,
sessionStorage)».

### 1.4 Contadores anónimos (`app.privacy.s8.p2`)

Sin cambio necesario: los eventos nuevos (`calc_result`, `calc_cta_click`, `review_request`) son
contadores diarios agregados, sin cifras ni identificadores, igual que los que ya describe el
párrafo. Están en `docs/analitica.md`.

### 1.5 Hash de IP (E6): NO activado

No se ha implementado. Si algún día se activa (solo si aparece fraude), haría falta: base de interés
legítimo documentada (prueba de ponderación), plazo de 30 días, mención en `s2` («al registrarte con
una invitación guardamos durante 30 días un resumen cifrado e irreversible de parte de tu dirección
IP para detectar cuentas creadas por la misma persona»), en `s3.item10` y en el registro de
actividades, y revisar la sección de Seguridad de los datos de Play Console.

## 2. Condiciones del servicio: programa de invitaciones (`terms.*`)

Resuelve la duda 13 de `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`. Propuesta de sección nueva,
después de «3. Prueba gratuita» (renumerando las siguientes) o al final antes de «Legislación
aplicable»:

**Título (es):** «Programa de invitaciones»

> Cada usuario tiene un enlace de invitación. Si alguien se registra con él, completa los primeros
> pasos de la app (3 movimientos, 1 presupuesto, 1 meta y 1 automatización) y apunta movimientos en
> 3 días distintos dentro de sus primeros 30 días, recibe 30 días de Premium y quien le invitó gana
> 30 días de Premium. Quien invita puede ganar como mucho 3 meses por mes natural y 6 por año
> natural; los que pasen del límite se conceden el mes o el año siguiente. Los días se suman después
> del Premium ya pagado o de la prueba en curso; no se canjean por dinero ni se pueden transferir, y
> no se dan a quien tiene Premium de por vida. No cuentan las invitaciones a uno mismo (también con
> otra forma de escribir el mismo email), las cuentas con emails de correo temporal ni las que se
> creen de forma automatizada o fraudulenta; en esos casos podemos no conceder o retirar los días
> obtenidos así. Los meses ya concedidos con reglas anteriores se mantienen. Podemos cambiar o
> terminar el programa avisando en la app con antelación razonable; los días ya concedidos no se
> retiran salvo fraude.

**Title (en):** "Invitation programme"

> Every user has an invitation link. If someone signs up with it, completes the app's first steps
> (3 transactions, 1 budget, 1 goal and 1 automation) and writes down transactions on 3 different
> days within their first 30 days, they get 30 days of Premium and the person who invited them gets
> 30 days of Premium. An inviter can earn at most 3 months per calendar month and 6 per calendar
> year; any beyond the limit are granted the following month or year. The days are added after any
> Premium already paid for or the trial in progress; they cannot be exchanged for money or
> transferred, and are not given to lifetime Premium users. Self-invitations (also with another
> spelling of the same email address), accounts with throwaway email addresses and accounts created
> automatically or fraudulently do not count; in those cases we may withhold or withdraw the days
> obtained that way. Months already granted under earlier rules are kept. We may change or end the
> programme with reasonable notice in the app; days already granted are not withdrawn except in case
> of fraud.

**¿Pedir aceptación de nuevo?** Recomendación: subir `TERMS_VERSION` y `terms.updated` cuando se
publique y **no** bloquear con `terms.update` a quien no use las invitaciones: el cambio no empeora
las condiciones de pago ni del servicio contratado. Si el dueño prefiere pedirla, el mecanismo ya
existe (`terms.update.*`).

## 3. Aviso orientativo de las calculadoras abiertas

Se mantienen los avisos que ya tenían (`tools.salary.disclaimer`, `tools.reta.disclaimer`), ahora
justo debajo del resultado y visibles sin cuenta: «Resultado orientativo…» con la norma y el año.
Revisar si se quiere añadir al final de los dos: «No sustituye a tu nómina ni a la información de la
Seguridad Social.» (sueldo neto) y «Compruébalo en Import@ss antes de elegir tu base.» (cuota de
autónomos). No se ha cambiado.

## 4. Reseñas

Sin texto legal nuevo. La app no ofrece nada a cambio de una reseña ni filtra a quién se le pide
(directrices de Google Play), y «Danos tu opinión» en Ajustes es igual para todos.
