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
