# Cambios de privacidad (17/10/2026)

Resumen para el propietario y para el abogado que revise los textos. Los textos legales
están en `frontend/src/locales/es.json` y `en.json` (claves `app.privacy.*` y `terms.*`).
Describen lo que hace el código a esta fecha. **No están validados jurídicamente: revisar con
un abogado.**

## Qué ha cambiado en los textos

- **Contacto**: `support@finanverso.app` sustituye a `moneymanager@outlook.es` en la política,
  las condiciones, la web, los correos y `VAPID_SUBJECT`.
- **Fecha**: política y condiciones actualizadas a 17 de octubre de 2026.
- **Datos (s2)**: se añaden las suscripciones push y los datos de uso (análisis con IA,
  usos de la Renta, clics en «Ofertas»).
- **Bases legales (s3)**: una por finalidad. Contrato: servicio, hogar compartido, invitaciones
  y lectura de los recibos reenviados. Consentimiento: IA, resumen semanal, avisos push y
  lectura de notificaciones bancarias en Android. Obligación legal e interés legítimo:
  registro de la aceptación de condiciones. Interés legítimo: origen del alta, seguridad y
  clics en ofertas. Se añade que el consentimiento se puede retirar en cualquier momento.
- **IA al importar**: antes se enviaba siempre al importar (Premium). Ahora es una opción
  («Sugerir categorías con IA») que viene **desactivada** y se recuerda en el dispositivo.
  La política lo describe como consentimiento.
- **Proveedores (s4)**: lista completa. Hetzner (UE). Cloudflare: proxy inverso y TLS de todo
  el tráfico, y correo de `facturas.finanverso.app`. Proveedor de IA (Cloudflare Workers AI o
  Google Gemini), con qué se envía. Resend, que también envía el resumen semanal con cifras.
  Stripe. Google (botón de inicio de sesión, solo en las páginas de acceso). Google Play y
  RevenueCat. Servicios push (FCM, Mozilla, Apple). Frankfurter. Se quita la frase «los
  únicos proveedores».
- **Transferencias internacionales**: se nombran los proveedores estadounidenses y se indica
  que las transferencias se basan en el Marco de Privacidad de Datos UE-EE. UU. y/o en las
  cláusulas contractuales tipo.
- **Conservación (s5)**, por tipo de dato:
  - cuenta: hasta que se elimina;
  - copias de seguridad y copias previas a migraciones: 14 días (ahora se borran de verdad);
  - registros técnicos: rotación, como máximo 30 MB por servicio;
  - recibos reenviados: solo el resultado de los 50 últimos;
  - aceptación de condiciones: hasta que se elimina la cuenta;
  - Stripe, RevenueCat y Google Play conservan sus registros.
  - Desaparece la promesa de borrado «en 30 días».
- **Seguridad (s6)**: los registros no guardan datos financieros ni IP (se desactiva el log
  de accesos de nginx y Caddy no tiene log de accesos). Lo borrado se sobrescribe en la base
  de datos (`secure_delete`).
- **Derechos (s7)**: cómo ejercerlos (email a support@finanverso.app, respuesta en un mes) y
  la exportación y el borrado desde la app. La exportación JSON incluye ahora todos los datos
  (formato `finanverso-export` v3).
- **Almacenamiento local (s8)**: el texto anterior era falso. Ahora hay una lista de lo que se
  guarda: sesión, preferencias, borradores, pagos captados, códigos de invitación y origen del
  alta. Se indica que no hay cookies de analítica de terceros. Al cerrar sesión o eliminar la
  cuenta se borra todo, salvo el tema, el idioma y el email de «Recordarme» (este solo se
  conserva al cerrar sesión).
- **Edad (s9 y condiciones s2)**: 14 años o más. En las condiciones se añade que, para pagar,
  hay que ser mayor de edad o tener autorización de los padres. En el registro hay una casilla
  obligatoria «Tengo 14 años o más» y un aviso con enlaces a las condiciones y a la política,
  también junto al botón de Google.
- **Eliminación (s11 y diálogo de borrado)**: se detalla qué se borra, el plazo de las copias
  (14 días), lo que conservan Stripe y RevenueCat, y el efecto en un hogar compartido: si el
  titular se da de baja, el miembro pierde el acceso, también a lo que él añadió.

## Dudas abiertas para el abogado

1. **Edad: 14 o 16.** El art. 7 de la LOPDGDD fija 14 años para consentir. La política antes
   decía 16. Hay que confirmar los 14 y decidir qué hacer con los pagos de menores (las
   condiciones piden mayoría de edad o autorización, pero no se comprueba).
2. **`mm_acq` (origen del alta).** Se guarda en el navegador antes del registro sin pedir
   consentimiento y se envía como contador anónimo. Hay que confirmar si basta el interés
   legítimo o si el art. 22.2 de la LSSI exige consentimiento (banner). Si lo exige, hay que
   pedirlo o eliminar la función.
3. **Mecanismo de transferencia por proveedor.** Hay que comprobar si Cloudflare, Google,
   Resend, RevenueCat y Stripe están adheridos al Data Privacy Framework o si dependen de las
   cláusulas contractuales tipo, y ajustar el texto.
4. **Contratos de encargado (art. 28 RGPD).** Firmar o aceptar el DPA de Hetzner, Cloudflare,
   Resend, Stripe (que es responsable independiente para los pagos) y RevenueCat, y del
   proveedor de IA (Cloudflare o Google), y guardarlos.
5. **Registro de actividades de tratamiento (RAT, art. 30).** Aún no existe. Las finalidades
   y bases de s3 y los proveedores de s4 sirven como borrador.
6. **Evaluación de impacto (EIPD/DPIA, art. 35).** Valorar si hace falta, por tratarse de
   datos financieros a gran escala y de la lectura de notificaciones bancarias en Android.
7. **Procedimiento ante brechas de seguridad.** Documentar cómo se detecta y registra una
   brecha y cómo se notifica a la AEPD en 72 horas (art. 33) y, si hay riesgo alto, a los
   usuarios (art. 34).
8. **Aceptación de condiciones tras la baja.** Hoy se borra al eliminar la cuenta. Si debe
   guardarse durante el plazo de prescripción para defenderse ante reclamaciones, hay que
   cambiar el código y la política (s5).
9. **Plazo de los registros técnicos.** Docker los rota por tamaño (3 ficheros de 10 MB por
   servicio), no por días. Si se quiere prometer un número de días, hace falta otro
   mecanismo (por ejemplo, journald con `MaxRetentionSec`).
10. **Stripe y RevenueCat tras la baja.** No se borran por API; la política dice que se
    conservan por obligaciones fiscales y de facturación. Confirmar si conviene borrar o
    anonimizar el cliente de Stripe y el registro de RevenueCat cuando no haya obligación.

# Cambios del 20/10/2026

## Qué ha cambiado en la política

- **Avatar (s2.item3, s8.item1, s11.p2)**: ya no se suben fotos de perfil; solo se elige un
  emoticono. Las fotos subidas antes se han borrado con la migración `033` (siguen solo en las
  copias de seguridad, que se borran a los 14 días, como dice s5.item2).
- **Invitaciones (s2.item8, s3.item6)**: la regla actual: el invitado recibe 30 días de Premium
  al completar los primeros pasos (3 movimientos, 1 presupuesto, 1 meta, 1 automatización) y
  quien invita gana hasta 5 meses (1, 5, 20, 40 y 50 amigos). Se guarda quién invitó y si el
  invitado completó los pasos.
- **Autónomos en la cuenta (s2.item17, s3.item1, s5.item9, s6.item8, s8.item3, s11.p2)**: copia
  opcional, cifrada con AES-256-GCM, de facturas, trimestres, retenciones, actividad, modelos
  importados, opciones y avance del asistente; se puede borrar. La Renta sigue solo en el
  dispositivo.
- **Verificación en dos pasos (s2.item16, s3.item1, s5.item9, s6.item8, s11.p2)**: clave cifrada,
  códigos de recuperación como hash.
- **Lectura en el dispositivo (s6.item9)**: borrador de la Renta, archivos de inversiones y PDF de
  Autónomos. **Tipos del BCE (s4.item8)**: la importación de inversiones usa un fichero servido
  desde finanverso.app.
- **IA (s3.item3, s4.item3)**: ya no es solo Premium: el plan Gratuito tiene 1 análisis al mes.
- **Datos de uso (s2.item15, s5.item4)**: se añaden los contadores de Autónomos e importaciones.
- **Eliminación (s11.step2-4)**: el botón está ahora al final del perfil, que se abre desde el menú.

## Dudas abiertas nuevas

11. **Base jurídica de la copia de Autónomos y de la verificación en dos pasos.** Se han añadido a
    «ejecución del contrato» (art. 6.1.b) porque son funciones que activa el usuario. Confirmar.
12. **Datos de terceros en la copia de Autónomos.** Las facturas llevan nombres y, a veces, NIF de
    clientes y proveedores del autónomo. Para esos datos Finanverso podría ser encargado del
    tratamiento del autónomo (art. 28): valorar una cláusula de encargo en las condiciones.
13. **Condiciones del programa de invitaciones.** Las condiciones de contratación no lo
    mencionan; si se quieren reglas vinculantes (30 días, meses por tramos, límites, abusos),
    habría que añadirlas a `terms.*` y pedir de nuevo la aceptación. No se han tocado.
14. **Aviso de cambios (s10).** La política promete avisar en la app cuando cambie, pero solo hay
    aviso para las condiciones (`terms.update`). Decidir si se avisa de esta versión.

## Cambio propuesto: `mm_acq` eliminado (decisión D4)

15. **Origen del alta (s8 y duda 2).** La app ya no guarda `mm_acq` en el navegador (borra la
    clave que hubiera en cada arranque) ni envía el origen desde el cliente; el servidor lo mide
    con el UTM y el referrer de la petición. Texto propuesto: quitar de la política (s8) cualquier
    mención a `mm_acq` o al origen del alta guardado en el navegador antes del registro, y dar por
    resuelta la duda 2 (ya no hace falta banner por esto). No se ha editado ningún texto legal.

## Cambio propuesto: analítica propia del embudo (decisión D2)

Desde el 20/10/2026 el servidor cuenta, por día, los pasos del embudo (visitas, vistas de guía,
registros, primeros pasos, pagos, bajas) y, para los primeros pasos, el origen (`utm_source` o el
sitio que enlaza, normalizado). Solo contadores: sin IP, user-agent, cookies, almacenamiento en el
dispositivo ni vínculo con la cuenta. Respeta *Global Privacy Control* y *Do Not Track*. Detalle en
`docs/analitica.md`. **No se ha editado ningún texto legal.** Texto propuesto:

16. **s8.p2** (sustituir): «Para saber cómo se usa el servicio y de dónde llegan las visitas
    llevamos contadores diarios agregados en nuestro propio servidor: por ejemplo, cuántas veces
    se abrió una guía, cuántos registros hubo y desde qué web o campaña (el valor `utm_source` del
    enlace o el sitio que te enlazó). No usamos cookies ni guardamos nada en tu dispositivo para
    ello, no guardamos tu IP ni tu navegador, no los asociamos a tu cuenta y no usamos herramientas
    de analítica de terceros. Si tu navegador envía la señal *Global Privacy Control* o *Do Not
    Track*, no se envía nada.»
17. **s8.item6** (quitar): ya lo propone el punto 15.
18. **s3.item10** (sustituir): «Medir de forma agregada y anónima las visitas, los registros y su
    origen (ver el apartado 8) y proteger el servicio con límites de intentos y registros técnicos:
    interés legítimo (art. 6.1.f).»
19. **s5** (añadir un punto): «Contadores agregados de visitas y registros: 25 meses; no contienen
    datos personales.»
20. **Duda para el abogado.** Los contadores no guardan datos personales, pero el servidor recibe
    de forma transitoria la IP (límite de peticiones en memoria durante un minuto) y el
    user-agent (para descartar bots, sin guardarlo). Confirmar que basta con el interés legítimo
    y con esta mención en la política, y que no hace falta consentimiento al no haber acceso ni
    almacenamiento en el dispositivo (art. 22.2 LSSI).

## Avisos del fin de la prueba (decisión D5): puntos 21-23 aprobados e incorporados

Se envían hasta tres mensajes por usuario (2 días antes, el último día y uno después) por email y
push sobre el estado de su prueba de 14 días. **Los puntos 21-23 fueron aprobados por el dueño y están incorporados a la política (`s3.item11`, `s5.item10`, es/en, fecha de última actualización sin cambios: 20/10/2026).** Decisión del dueño: el aviso `ended` se envía **solo como push**, nunca por email (opción prudente del punto 23); `ends_soon` y `last_day` siguen por email y push. Como no
existe consentimiento para comunicaciones comerciales, se tratan como mensajes de servicio sobre el
contrato en vigor (art. 6.1.b RGPD): informan de la fecha de fin, de lo que se conserva y de lo que
pasa a ser de Premium, con un enlace a la página de planes y sin ofertas ni presión. Texto propuesto:

21. **s3** (APROBADO E INCORPORADO) (añadir un punto): «Avisarte por correo o notificación, hasta tres veces, de que tu prueba
    gratuita de Premium está a punto de terminar o ha terminado y de lo que cambia (texto final: el aviso posterior al fin se envía solo como push): ejecución del
    contrato (art. 6.1.b). Puedes desactivarlo en Ajustes («Avisos sobre mi prueba de Premium»).»
22. **s5** (APROBADO E INCORPORADO) (añadir): «Registro de qué aviso de la prueba se envió a cada cuenta: mientras la cuenta
    exista.»
23. **Duda para el abogado** (APROBADO E INCORPORADO; adoptada la opción de limitar `ended` a push). Confirmar que estos mensajes, que incluyen un enlace a los planes de
    pago, son de servicio y no comunicaciones comerciales (art. 21 LSSI). Si se prefiere la
    prudencia, añadir una casilla de consentimiento explícito en el registro y enviar solo a quien la
    marque; o limitar el último mensaje (`ended`) a la notificación push. Con la decisión del dueño, `ended`
    ya no se envía por email.

## Cambio propuesto: programa de afiliación para creadores (decisión D7)

Desde el 20/10/2026 el código incluye un programa de comisiones para creadores
(`docs/afiliacion/programa.md`), **apagado por defecto** (`CREATOR_PROGRAM=false`). Cuando se encienda,
quien llegue con un enlace `finanverso.app/?aff=CODIGO` verá en el registro una casilla **sin marcar**:
«Me ha recomendado Finanverso el creador con el código CODIGO. Acepto que se guarde que mi cuenta viene de
ese código, para que pueda cobrar una comisión si contrato Premium. El creador no verá mi nombre ni mi
email.» Antes del registro **no se guarda nada en el dispositivo** (el código está solo en memoria durante
la visita). Solo si se marca, se guarda en la cuenta el código y la fecha y, si la persona paga Premium,
el plan, el canal (web o Google Play), la fecha del primer pago y si se devolvió. El creador solo recibe
cifras agregadas. **No se ha editado ningún texto legal.** Hay que publicar estos textos **antes** de
encender el programa:

24. **s2** (añadir un punto): «Si te registras desde el enlace de un creador y marcas la casilla que lo
    indica, guardamos el código de ese creador y la fecha. Si después contratas Premium, guardamos también
    el plan, si pagaste en la web o en Google Play, la fecha de tu primer pago y si se devolvió, para
    calcular su comisión. El creador no recibe tu nombre, tu email ni ningún otro dato tuyo: solo cuántas
    altas y ventas ha conseguido.»
25. **s3** (añadir un punto): «Atribuir tu alta y tu primer pago de Premium al creador que te recomendó la
    app, para pagarle su comisión: consentimiento (art. 6.1.a), que das al marcar la casilla del registro y
    puedes retirar cuando quieras escribiendo a support@finanverso.app.» Y, si el abogado lo ve necesario:
    «Conservar el registro contable de las comisiones pagadas, sin vincularlo a tu cuenta: obligación legal
    (art. 6.1.c).»
26. **s4**: sin proveedores nuevos (todo queda en nuestro servidor). Añadir, si se quiere ser explícito:
    «No compartimos tus datos con los creadores del programa de afiliación.»
27. **s5** (añadir un punto): «Código del creador que te recomendó la app: hasta que elimines la cuenta o
    retires el consentimiento. Si ya había generado una comisión, se conserva solo como registro contable
    anónimo, sin relación con tu cuenta.»
28. **s7**: la exportación JSON ya incluye la sección `creator` (código, fecha del consentimiento y venta,
    si la hay). Se puede añadir: «Para retirar el consentimiento del programa de creadores, escríbenos a
    support@finanverso.app.»
29. **s8**: añadir: «Si llegas con un enlace de un creador (`?aff=`), su código se lee de la dirección y se
    mantiene solo en la memoria de la página mientras dura la visita; no se guarda en tu dispositivo.»
30. **Dudas para el abogado.**
    - ¿Basta la casilla (consentimiento de mayores de 14 años) o conviene otra base (por ejemplo, interés
      legítimo con oposición)? Se ha elegido consentimiento por ser lo más prudente, dado que
      `docs/analitica.md` dice que el origen no se asocia a la cuenta.
    - Si alguien retira el consentimiento **después** de una venta, ¿debe anularse la comisión del creador?
      Hoy la venta se mantiene como registro anónimo.
    - Registro de actividades (RAT): añadir un tratamiento «Programa de creadores» (usuarios atribuidos:
      cuenta → código, fechas y plan; creadores: datos identificativos, fiscales y bancarios, fuera de la
      app, base 6.1.b y 6.1.c).
    - Responsabilidad de Finanverso como **anunciante** por lo que publiquen los creadores (Ley General de
      Publicidad y Ley de Competencia Desleal): ver la plantilla `docs/afiliacion/condiciones-creadores.md`.
    - Las condiciones de contratación (`terms.*`) no necesitan cambios para los usuarios; el programa se
      rige por un contrato aparte con cada creador.
