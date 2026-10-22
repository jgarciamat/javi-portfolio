# Auditoría de seguridad: instagram-agent-skill (Jake Schincariol, MIT)

Repositorio: https://github.com/Jakeschincariol/instagram-agent-skill . Fecha: 2026-10-22. **Decisión: no se instala.** Se adaptan las ideas a skills propias (`.claude/skills/finanverso-ig-*`, ver `NOTICE.md`).

## Método y límites (importante)
- Sin `git clone`, sin `pip install`, sin ejecutar nada. Los 27 ficheros se leyeron solo vía web (API de GitHub para el árbol y `raw.githubusercontent.com` para el contenido). No se copió ningún binario.
- La lectura pasó por un modelo pequeño que resume y analiza cada fichero, no es una lectura byte a byte. Por tanto: los veredictos de red/ejecución/escritura vienen de ese análisis (coherente entre los 6 scripts y el README), pero **no se han verificado caracteres invisibles ni homoglifos en los fuentes** (el análisis de `detect.py` señaló una cadena de espacios raros intencionada para medir «huellas»). Esa es la razón de reescribir en vez de copiar.
- Ninguna skill declara `allowed-tools`: heredan los permisos de la sesión, y si el agente las sigue, ejecutaría `python3 …` y `yt_dlp` con ellos.

## Resumen
- Red: **ningún script Python usa red** (solo `argparse, json, re, sys, os, statistics, unicodedata`). Sin `subprocess`, `eval`, `exec`, `pickle`, ofuscación ni variables de entorno.
- Exfiltración: no se encontró ninguna (ni peticiones ni envíos de datos).
- Instrucciones ocultas o de «prompt injection»: ninguna dirigida a la IA; los campos `note` de los JSON son consejos de uso. Sí hay textos que piden «puntuar con severidad».
- Escritura en disco: los scripts solo escriben con `-o` (humanize.py) o `--out` (swipe.py, crea carpetas y sobrescribe sin avisar). Las SKILL.md escriben en `~/.claude/instagram/` (voice.md, log.md, plan.md, swipe.md) y, en ig-viral, **`channel.json` y subtítulos en el directorio de trabajo** (fuera de esa carpeta).
- Dependencias: ninguna en los scripts; ig-viral usa `yt_dlp` (no incluido) contra YouTube.
- Riesgo principal: **de cumplimiento**, no de malware (ver más abajo).

## Por fichero
| Fichero | Qué hace | Red / disco / comandos | Veredicto |
|---|---|---|---|
| `LICENSE` | MIT | Nada | Seguro |
| `.gitignore` | Exclusiones | Nada | Seguro |
| `.claude-plugin/plugin.json` | Metadatos del plugin (nombre, autor, licencia) | Sin hooks, comandos ni servidores MCP | Seguro |
| `.claude-plugin/marketplace.json` | Catálogo (fuente `./`) | Sin ejecución automática | Seguro (instalar el plugin carga las 13 skills, que no se quieren tal cual) |
| `README.md` | Instalación y metodología; declara «sin red», no publica, no usa la API de publicación | Pide copiar a `~/.claude/skills`; menciona yt-dlp fuera del repo. Afirmaciones de precisión (AUC) y política de Instagram (tope de 5 hashtags) no verificables | Revisar (leer, no seguir sus instrucciones de instalación) |
| `templates/voice.md` | Plantilla de voz que leen todas las skills | Se copia a `~/.claude/instagram/voice.md` | Seguro (inspiración de `finanverso-ig-voz`) |
| `skills/ig-reel/SKILL.md` | Guion de Reel con gancho puntuado y tiempos | Ejecuta `hookscore.py` y `beats.py`; lee voice/swipe; añade a `log.md` | Seguro (idea reutilizada) |
| `skills/ig-reel/hookscore.py` | Puntúa ganchos (longitud, especificidad, tensión, dirección, bloqueos) | Solo lee un fichero o stdin; sin escritura. Rareza: coincidencia por prefijo en aperturas débiles | Seguro |
| `skills/ig-reel/beats.py` | Tiempos por palabras/minuto, etiquetas gancho/remate | Solo lectura; `--wpm 0` da error | Seguro |
| `skills/ig-reel/hooks.json` | 26 fórmulas de gancho con expresiones regulares | Datos; sin URLs | Seguro (las regex vienen de fichero: riesgo teórico de ReDoS local) |
| `skills/ig-caption/SKILL.md` | Pie de Instagram, lo corre por el linter y `ig-human` | Ejecuta `caption.py` | Seguro |
| `skills/ig-caption/caption.py` | Linter del pie: trozo visible 125, 2200 car., 5 hashtags, enlaces | Solo lectura; sin red | Seguro |
| `skills/ig-carousel/SKILL.md` | Carrusel 1080x1350 | Sugiere Chrome sin interfaz para renderizar HTML (genera PDF, no PNG) | Seguro |
| `skills/ig-story/SKILL.md` | Secuencia de historias y pegatinas | Nada; menciona respuestas automáticas oficiales de Instagram | Seguro |
| `skills/ig-repurpose/SKILL.md` | De contenido largo a piezas cortas | Puede usar una herramienta de transcripción si hay URL | Seguro |
| `skills/ig-audit/SKILL.md` | Qué funcionó, desde datos que pega el usuario | Lee `log.md`; sin red | Seguro |
| `skills/ig-profile/SKILL.md` | Puntuación de perfil | Sin red, indica no iniciar sesión | Seguro |
| `skills/ig-profile/rubric.json` | Rúbrica de 12 apartados / 100 puntos | Datos | Seguro |
| `skills/ig-plan/SKILL.md` | Plan semanal; **ronda diaria de 10 cuentas para comentar** | Escribe `plan.md`; remite a `ig-comment` | Revisar (la ronda de engagement empuja a actividad diaria en masa; no se adopta) |
| `skills/ig-reply/SKILL.md` | Responder comentarios propios | Sin red; admite DM por palabra clave vía herramientas «aprobadas» | Revisar (cuidado con terceros) |
| `skills/ig-comment/SKILL.md` | Comentarios para posts ajenos, modo lote 5-10 y registro de cuentas | Escribe `log.md`; dice que no se automatiza | Revisar (el modo lote diario roza el comportamiento de granja de engagement) |
| `skills/ig-dm/SKILL.md` | Redacta DM; prohíbe masivos | Sin red; menciona automatización «aprobada» solo para palabra clave | Revisar |
| `skills/ig-human/SKILL.md` | «Humanizador»: quita huellas de IA y marcas invisibles | Ejecuta `humanize.py` y `detect.py` | Revisar (finalidad ambigua: ocultar procedencia de IA; el código es inocuo) |
| `skills/ig-human/humanize.py` | Quita invisibles, normaliza tipografía, sustituye palabras de `slop.json` | `-o` sobrescribe sin preguntar; carga un léxico con regex | Seguro (con la cautela del léxico) |
| `skills/ig-human/detect.py` | Puntúa 5 señales (variación de frases, especificidad, relleno, huella, voz) | Solo lectura; cadena con espacios Unicode raros a comprobar | Seguro / Revisar (verificar con volcado hexadecimal si se usara) |
| `skills/ig-human/slop.json` | Léxico de ~95 palabras, ~58 frases, 18 invisibles, 16 estructuras | Datos | Seguro |
| `skills/ig-viral/SKILL.md` | Investigación de qué funciona; lee reels en el navegador del usuario, su colección «Guardados» y **ejecuta `python3 -m yt_dlp`** contra YouTube Shorts | Escribe `swipe.md`, `channel.json` y subtítulos; sin allowed-tools; descarga fuera del alcance de `~/.claude/instagram` | **No usar** (rastreo/descarga y términos de plataformas; sin límites) |
| `skills/ig-viral/swipe.py` | Ordena una tabla TSV por múltiplo sobre la mediana; nombra fórmulas | Importa código de `../ig-reel/hookscore.py` en tiempo de ejecución (confianza entre carpetas); `--out` crea carpetas y sobrescribe; `1.2M` se lee como `12` | Revisar |

## Riesgos de cumplimiento (Instagram y España)
1. **Automatización**: las condiciones de Instagram no permiten publicar, seguir, comentar ni enviar DM mediante bots o terceros. El repositorio lo declara, pero `ig-plan`, `ig-comment` (lote) y `ig-viral` empujan hacia rutinas masivas o rastreo. Nuestras skills: solo borradores, sin listas diarias de cuentas ni registro de objetivos.
2. **Rastreo y descarga** (`yt_dlp`, lectura masiva de Guardados): no adoptado. El análisis de competencia lo hace el dueño a mano.
3. **«Humanizar» texto de IA**: no se adopta la finalidad de evadir detectores ni de borrar marcas de procedencia; `finanverso-ig-human` solo limpia ruido y relleno.
4. **Afirmaciones no verificables** (tope de hashtags, validez estadística de las puntuaciones): se tratan como orientativas; nuestra herramienta lo dice.
5. **Contenido regulado**: el original no tiene avisos fiscales ni de datos reales; las skills propias imponen datos de demostración, «orientativo, no es asesoramiento», «la app no presenta nada», sin «gestor» ni «perfecto/exacto/garantizado».
6. **Datos personales**: nunca pedir ni publicar DNI, IBAN o contraseñas; tratamiento conforme al RGPD y a la LOPDGDD.

## Conclusión
El repositorio no muestra código malicioso ni exfiltración en lo analizado, pero tiene permisos abiertos, una skill que ejecuta descargas (`ig-viral`) y varias que animan a actividad masiva. Se reescribe con las ideas útiles, en español y con las herramientas mínimas locales de `finanverso-ig-*`.
