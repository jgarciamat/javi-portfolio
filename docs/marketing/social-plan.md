# Plan de redes sociales: Instagram y TikTok

Objetivo: conseguir usuarios para Money Manager con vídeos cortos útiles (90 vídeos, 4 por semana), sin trucos que
pongan en riesgo las cuentas. Los vídeos, guiones, pies de foto y calendario están en `/Users/javi/money-manager-videos/`
(`GUIONES.md`, `CALENDARIO.md`, `calendario.csv`).

## 1. Crear las cuentas (lo hace el propietario, una sola vez)

Las cuentas las tiene que crear una persona con su correo y su teléfono: yo no puedo crearlas ni verificarlas.

1. Correo de la marca: `moneymanager@outlook.es` (ya existe). Úsalo para las dos cuentas.
2. Nombre de usuario: busca uno igual en ambas redes, corto y sin guiones bajos (por ejemplo `moneymanager.app`,
   `moneymanager.es` o `winjgm`); comprueba cuál está libre.
3. Convertir a cuenta **de empresa/creador** (Instagram: «Cuenta profesional → Creador»; TikTok: «Cuenta de empresa»).
   Dan estadísticas y botón de enlace.
4. Foto de perfil: el logo de la app (`docs/marketing/assets/moneyLogo.png`).
5. Biografía (150 car. en Instagram, 80 en TikTok):
   - «Controla tus gastos, ahorra y prepara tu Renta y tus impuestos de autónomo. Gratis 👇»
   - Enlace: `https://www.winjgm.com` (o la ficha de Google Play).
6. Activar la verificación en dos pasos en las dos cuentas y guardar los accesos en un gestor de contraseñas.
7. Crear también un canal de YouTube Shorts con el mismo correo: los mismos vídeos, sin trabajo extra.

## 2. Calendario de publicación

- **Primer día: 3 vídeos** de golpe, para que quien llegue al perfil entienda qué es la app y vea contenido: el 86
  (primeros pasos), el 81 (movimientos por día, semana y calendario) y el 90 (avisos de presupuesto).
- **Después, 1 vídeo al día**, a la misma hora (por ejemplo, 19:30). Orden: primero el resto de «cómo manejar la app»
  (82-85, 87-89), luego las series por tema; los de renta y autónomos se adelantan o se retrasan para caer junto a sus
  plazos fiscales (ver `CALENDARIO.md`).
- **Serie «Cómo invertir»:** los vídeos 61-80 van seguidos y en orden (mapa de clases → acciones → fondos → bonos →
  cripto…) con la misma etiqueta, y solo cuando «Cómo invertir» ya esté publicada en la app.
- Cada vídeo lleva el pie de foto de `GUIONES.md`: gancho en la primera línea, 3-5 etiquetas y el aviso
  «orientativo, consulta con tu gestor» en los de impuestos.
- **Al subir en la web de Instagram:** en el paso «Recortar», cambia el formato de **1:1 a 9:16**; si no, recorta el
  vídeo por arriba y por abajo.
- Con 1 por día, los 90 vídeos cubren unos 3 meses.

## 3. Cómo conseguir seguidores y usuarios (sin spam)

Lo que funciona y no pone en riesgo la cuenta:

1. **Colaboraciones personalizadas:** escribir a 30-50 creadores pequeños de finanzas personales y de autónomos
   (entre 2.000 y 50.000 seguidores), uno a uno, ofreciendo Premium gratis a cambio de una prueba honesta.
   Plantilla más abajo. Mejor 5 mensajes bien hechos al día que 100 iguales.
2. **Comentar con valor** en vídeos de finanzas del mismo tamaño o mayor: una respuesta útil de dos líneas, sin enlaces.
   El algoritmo y la gente miran el perfil de quien aporta.
3. **Responder a todos los comentarios** de los primeros 60 minutos de cada vídeo.
4. **Reutilizar cada vídeo** en Instagram Reels, TikTok y YouTube Shorts el mismo día.
5. **Enlace en la biografía** con una página que lleve a Play Store; en cada vídeo, «enlace en mi perfil».
6. **Sistema de invitaciones de la app:** 1 mes de Premium para quien invita y para quien se registra; mencionarlo en
   un vídeo al mes.
7. **Directos o respuestas** a preguntas habituales (¿cuánto IVA pago?, ¿me compensa la tarifa plana?) con los
   mismos temas de los vídeos.

Lo que **no** vamos a hacer: seguir o mandar solicitudes en masa a miles de cuentas, comprar seguidores, usar bots,
ni mensajes idénticos a cientos de personas. Instagram y TikTok lo detectan, limitan o cierran la cuenta, y las
condiciones de uso lo prohíben.

### Plantilla de mensaje a creadores

> Hola {nombre}, soy Javier, el desarrollador de Money Manager, una app gratuita en español para controlar gastos,
> preparar la Renta y el borrador de impuestos de autónomo. He visto tu vídeo sobre {tema} y me ha parecido muy útil.
> Si te apetece probarla, te regalo Premium sin compromiso y sin que tengas que mencionarla. Si te gusta, estaré
> encantado de colaborar. ¿Te la mando? Un saludo.

## 4. Medir (cada semana, 10 minutos)

- Instagram Insights y TikTok Analytics: visualizaciones, % que ve más del 50 %, guardados, compartidos y clics al perfil.
- Play Console → Estadísticas: instalaciones por origen.
- Repetir el tipo de vídeo que más se guarda y se comparte; cambiar el gancho de los que se abandonan en 3 segundos.

## 5. Quién hace qué

| Tarea | Quién |
| --- | --- |
| Crear y verificar las cuentas, guardar contraseñas | Propietario |
| Guiones, vídeos, pies de foto, etiquetas, calendario | Claude (ya hecho en la carpeta de vídeos) |
| Preparar cada lote semanal (vídeo + texto listo para pegar) | Claude |
| Subir los vídeos y publicarlos | Propietario, o Claude con confirmación expresa de cada publicación (ver abajo) |
| Mensajes a creadores y respuestas | Claude redacta; el propietario revisa y envía, o lo envía Claude con su confirmación |

### Sobre la publicación por parte de Claude

Publicar en una red social es una acción pública. Claude puede abrir TikTok o Instagram en el navegador del propietario
con sus cuentas ya iniciadas y subir un vídeo, pero solo cuando el propietario lo confirma en la conversación para
ese vídeo concreto («sube el vídeo 7»): no hay permiso permanente para publicar solo ni para publicar cada semana
sin que nadie esté. Para una publicación programada sin intervención se pueden usar las herramientas de programación
de las propias redes (Meta Business Suite para Instagram y el programador de TikTok en el ordenador): el propietario
carga el lote semanal y fija las fechas del calendario.
