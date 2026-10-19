# Banco de casos prácticos de Finanverso

La verdad de referencia y las pruebas de regresión de la Renta (modelo 100) y de los modelos de autónomos. **Todos los datos de las personas son inventados**: nombres «Persona Ficticia NN», NIF 000000NNX y direcciones «Calle Ficticia». Las cifras son una simulación orientativa, no el modelo oficial.

| Archivo | Qué es |
|---|---|
| `oficiales.json`, `oficiales.md` | 62 casos resueltos con importes: 37 del Manual práctico de Renta 2025 y 25 de autónomos (IVA 303/390/349, 347, 720, 130, 111, 115, 190 y RETA). Los no oficiales llevan `"oficial": false` |
| `personas/<slug>/persona.json` | Los datos de entrada en el formato del motor (`RentaForm` de `rentaForm.ts`; los movimientos y `DraftInputs` del backend para autónomos) y la descripción |
| `personas/<slug>/esperado.json` | Cada cifra esperada por modelo y casilla, con su origen: `oficial` (un caso de `oficiales.json`), `calculo-a-mano` (los pasos están en `calculo.md`) o `pendiente` (con el motivo) |
| `personas/<slug>/calculo.md` | El cálculo a mano, paso a paso, con la fórmula y el artículo |
| `personas/p4-<slug>/archivos/` | Inversores (p4-109 a p4-118): archivos inventados de cada plataforma (CSV, Excel, PDF) para «Importar mis inversiones»; se regeneran con `node scripts/casos/run-personas4.mjs` |
| `personas/<slug>/documentos/` | Documentos sintéticos para los importadores: borrador de Renta en PDF, libros de facturas y extracto en Excel, facturas en PDF, 130 y 303 presentados y el resumen de casillas |
| `discrepancias.json` | Las diferencias conocidas entre el motor y la referencia, con severidad, causa probable y fuente |
| `resultados.md`, `resultados-renta.json`, `resultados-autonomos.json` | La última pasada del banco de pruebas |

## Cómo se regenera

```sh
python3 -I frontend/scripts/casos/construir_casos.py   # personas, esperado y cálculo a mano
python3 -I frontend/scripts/casos/construir_personas5.py  # p5: riesgos P0 (alquileres por inmueble, residencia, donativos)
cd frontend && npm run casos                           # documentos, copia en ~/Downloads y 130/303 contra el backend
CASOS_INFORME=1 npx jest src/__tests__/casos            # Renta contra el motor del frontend
python3 -I scripts/casos/informe.py                    # oficiales.md y resultados.md
```

Los tests de `frontend/src/__tests__/casos/` cargan cada persona, ejecutan el motor actual y comparan al céntimo. Lo que el motor no calcula queda como `todo` con su motivo; una discrepancia conocida pasa mientras el motor siga dando lo registrado (o ya lo correcto); cualquier diferencia nueva falla.

Reglas: Ley 35/2006 del IRPF y Manual práctico de Renta 2025 de la AEAT; modelos 130, 303, 111 y 115 de la sede de la AEAT; Orden PJC/297/2026 (RETA). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/`, que citan su fuente. Comprobado el 19-10-2026.
