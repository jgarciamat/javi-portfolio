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
