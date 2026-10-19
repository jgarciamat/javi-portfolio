# Persona Ficticia 14: Aportaciones propias a un plan individual y de la empresa a un plan de empleo

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Aporta 2.000 € a un plan de pensiones individual y su empresa 1.500 € a un plan de empleo (incluidos en los 52.000 € íntegros, como retribución en especie).

NIF ficticio 00000014Z · Calle Ficticia 14, 08001 Barcelona (dirección inventada) · comunidad: cataluna

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 52.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 3.302,00
- Rendimiento neto previo (0017) = 52.000,00 − 3.302,00 = **48.698,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 48.698,00 − 2.000,00 = **46.698,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 48.698,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **46.698,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 46.698,00 = **46.698,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Planes de pensiones: propias 2.000,00 a un plan individual (límite 1.500 → 1.500,00) + contribución de la empresa 1.500,00 (incremento de hasta 8.500 → 1.500,00); límite del 30 % de los rendimientos netos (14.009,40) → **3.000,00** (art. 51 y 52 LIRPF)
- Base liquidable general (0500) = 46.698,00 − 3.000,00 = **43.698,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Cataluña (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(43.698,00) 5.934,88 − escala(mínimo 5.550,00) 527,25 = 5.407,63
- General autonómica (Cataluña): escala(43.698,00) 6.167,62 − escala(mínimo 5.550,00) 527,25 = 5.640,37
- Cuota íntegra estatal (0545) = **5.407,63**; autonómica (0546) = **5.640,37**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 5.407,63 − 0,00 + 5.640,37 − 0,00 = 11.048,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **11.048,00**; retenciones (0609) = 10.900,00; cuota diferencial (0610) = **148,00**
- Resultado (0670) = **148,00** (a ingresar)
