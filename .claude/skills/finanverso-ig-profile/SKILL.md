---
name: finanverso-ig-profile
description: Puntúa el perfil de Instagram de Finanverso con una rúbrica de 100 puntos y propone textos nuevos de nombre, biografía, destacadas y publicaciones fijadas. Úsala para «revisa el perfil». Solo borradores.
allowed-tools: Read Grep Glob
---

# Perfil

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Datos que necesita
El dueño pega nombre, usuario, biografía, enlace, nombres de destacadas y las 9 primeras portadas (capturas). No inicies sesión en Instagram ni pidas contraseñas.

## Rúbrica (100 puntos, puntúa con severidad)
| Bloque | Puntos | Qué se mira |
|---|---|---|
| Búsqueda | 30 | Nombre con palabra clave («Finanverso · Renta y autónomos»), primera línea de la bio con el beneficio, cuerpo de la bio claro |
| Conversión | 26 | 3 fijadas que expliquen la app, enlace único a finanverso.app, destacadas ordenadas (Renta, Autónomos, Primeros pasos) |
| Presentación | 20 | Portadas legibles, foto/logo reconocible, usuario fácil |
| Cuenta | 6 | Categoría y contacto |
| Actividad | 16 | Publicación reciente, historias recientes |

## Pasos
1. Puntúa los 12 apartados con tabla y total.
2. Reescribe lo que más puntos pierde, en este orden: nombre, bio, fijadas, destacadas, enlace, portadas. La bio dice qué hace la app y para quién, y: «La app prepara borradores; presentas tú en la Agencia Tributaria».
3. Pasa cada texto por `finanverso-ig-human`.
4. Vuelve a puntuar y di qué queda por hacer a mano (portadas, ritmo de publicación).

## Prohibido
Promesas («la mejor», «garantizado»), «gestor», datos reales, cambiar nada en Instagram: lo cambia el dueño.
