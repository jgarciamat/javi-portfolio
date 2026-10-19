# Persona Ficticia 08: Jubilado de 72 años con discapacidad del 65 %

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Cobra una pensión de jubilación de 18.000 €; discapacidad reconocida del 65 % (mínimo de 9.000 + 3.000 de gastos de asistencia).

NIF ficticio 00000008P · Calle Ficticia 8, 50001 Zaragoza (dirección inventada) · comunidad: aragon

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 18.000,00 (de ellos 18.000,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 0,00
- Rendimiento neto previo (0017) = 18.000,00 − 0,00 = **18.000,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general, sin incremento por discapacidad: es pensionista)
- Rendimiento neto (0022) = 18.000,00 − 2.000,00 = **16.000,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 18.000,00: 2.364,34 − 1,14 × (18.000,00 − 17.673,52); con el límite del rendimiento neto → **1.992,15** (0023)
- Rendimiento neto reducido (0025) = **14.007,85**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 14.007,85 = **14.007,85**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 14.007,85 = **14.007,85**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 1.150,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 12.000,00 = **18.700,00**
- Autonómico de Aragón (0520): contribuyente 5.550,00 + edad 1.150,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 12.000,00 = **18.700,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(14.007,85) 1.369,69 − escala(mínimo 14.007,85) 1.369,69 = 0,00
- General autonómica (Aragón): escala(14.007,85) 1.354,13 − escala(mínimo 14.007,85) 1.354,13 = 0,00
- Cuota íntegra estatal (0545) = **0,00**; autonómica (0546) = **0,00**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 0,00 − 0,00 + 0,00 − 0,00 = 0,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **0,00**; retenciones (0609) = 1.700,00; cuota diferencial (0610) = **-1.700,00**
- Resultado (0670) = **-1.700,00** (a devolver)
