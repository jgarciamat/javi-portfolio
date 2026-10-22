# Skills de Instagram de Finanverso

Catorce skills en español que **solo producen borradores y análisis**. Ninguna publica, sigue, comenta, da «me gusta» ni manda mensajes: el dueño revisa y lo hace a mano (Instagram no permite automatizar esas acciones desde bots). Datos siempre de demostración. Origen de las ideas y licencia: ver `NOTICE.md`.

## Cómo se invocan
En Claude Code, escribe el nombre como orden o pídelo en lenguaje natural:

| Skill | Para qué | Ejemplo |
|---|---|---|
| `finanverso-ig-voz` | Voz, marca y reglas duras (la leen todas) | se carga sola |
| `finanverso-ig-plan` | Plan de la semana desde el calendario maestro | `/finanverso-ig-plan` |
| `finanverso-ig-reel` | Ganchos puntuados, guion y tiempos | `/finanverso-ig-reel N107` |
| `finanverso-ig-caption` | Pie con los ~125 caracteres visibles cuidados | `/finanverso-ig-caption N107` |
| `finanverso-ig-carousel` | Carrusel 4:5 de 6 a 10 diapositivas | `/finanverso-ig-carousel` |
| `finanverso-ig-story` | Historias con una pegatina | `/finanverso-ig-story` |
| `finanverso-ig-repurpose` | De un vídeo largo a una semana de piezas | `/finanverso-ig-repurpose` |
| `finanverso-ig-audit` | Qué funcionó (con capturas/exportación de Insights) | `/finanverso-ig-audit` |
| `finanverso-ig-profile` | Rúbrica de perfil y bio | `/finanverso-ig-profile` |
| `finanverso-ig-reply` | Borradores de respuesta a comentarios propios | `/finanverso-ig-reply` |
| `finanverso-ig-comment` | Borradores de comentarios para posts que pegues | `/finanverso-ig-comment` |
| `finanverso-ig-dm` | Borradores de DM a quien ya interactuó | `/finanverso-ig-dm` |
| `finanverso-ig-human` | Limpieza de texto antes de entregarlo | automático al final |
| `finanverso-ig-viral` | Qué ganchos funcionan, con ejemplos que anotes a mano | `/finanverso-ig-viral` |

## Flujo recomendado
**Semanal (lunes):** 1) `plan` con los 7 próximos días del calendario. 2) Para cada vídeo: `reel` (ganchos y tiempos) y `caption` (pie). 3) `carousel` o `story` en los días que toque. 4) `human` pasa solo por todos los textos.
**Diario (2 min):** `story` del día; `reply` con los comentarios que pegues; `dm` solo si alguien escribió. Publica el dueño a mano.
**A las 2 semanas:** pega capturas o la exportación de Instagram Insights y lanza `audit`; sus conclusiones alimentan el siguiente `plan`. Cada mes, `profile`.

## Herramientas Python (opcionales, locales, sin red ni dependencias)
Cada una vive en la carpeta de su skill y se lanza con `python3 -I`:
- `finanverso-ig-reel/ganchos.py "gancho"`: nota orientativa del gancho y avisos.
- `finanverso-ig-reel/tiempos.py < guion.txt`: tiempos por bloque, gancho ≤3 s, total ≤59 s.
- `finanverso-ig-caption/pie.py < pie.txt`: trozo visible (125), hashtags, cierre y avisos legales.
- `finanverso-ig-human/limpiar.py < in > out`: invisibles, espacios raros y muletillas.

Tests: `cd .claude/skills/finanverso-ig-reel && python3 -I -m unittest discover -s .` (igual en `-caption` y `-human`).
