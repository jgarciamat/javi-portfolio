# Persona Ficticia 02: Matrimonio con un solo sueldo y dos hijos: individual frente a conjunta

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Solo trabaja el primer declarante; el cónyuge no tiene rentas. Dos hijos de 6 y 9 años. La conjunta debería salir mejor.

NIF ficticio 00000002W · Calle Ficticia 2, 41001 Sevilla (dirección inventada) · comunidad: andalucia

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 32.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.032,00
- Rendimiento neto previo (0017) = 32.000,00 − 2.032,00 = **29.968,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 29.968,00 − 2.000,00 = **27.968,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 29.968,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **27.968,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 27.968,00 = **27.968,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 27.968,00 = **27.968,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.550,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.100,00**
- Autonómico de Andalucía (0520): contribuyente 5.790,00 + edad 0,00 + descendientes 2.665,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.455,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(27.968,00) 3.277,95 − escala(mínimo 8.100,00) 769,50 = 2.508,45
- General autonómica (Andalucía): escala(27.968,00) 3.237,20 − escala(mínimo 8.455,00) 803,23 = 2.433,97
- Cuota íntegra estatal (0545) = **2.508,45**; autonómica (0546) = **2.433,97**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.508,45 − 0,00 + 2.433,97 − 0,00 = 4.942,42
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **4.942,42**; retenciones (0609) = 4.600,00; cuota diferencial (0610) = **342,42**
- Resultado (0670) = **342,42** (a ingresar)

## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 32.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.032,00
- Rendimiento neto previo (0017) = 32.000,00 − 2.032,00 = **29.968,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 29.968,00 − 2.000,00 = **27.968,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 29.968,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **27.968,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 27.968,00 = **27.968,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 3.400,00 (matrimonio, art. 84.2.4.º)
- Base liquidable general (0500) = 27.968,00 − 3.400,00 = **24.568,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 5.100,00 + ascendientes 0,00 + discapacidad 0,00 = **10.650,00**
- Autonómico de Andalucía (0520): contribuyente 5.790,00 + edad 0,00 + descendientes 5.330,00 + ascendientes 0,00 + discapacidad 0,00 = **11.120,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(24.568,00) 2.767,95 − escala(mínimo 10.650,00) 1.011,75 = 1.756,20
- General autonómica (Andalucía): escala(24.568,00) 2.727,20 − escala(mínimo 11.120,00) 1.056,40 = 1.670,80
- Cuota íntegra estatal (0545) = **1.756,20**; autonómica (0546) = **1.670,80**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.756,20 − 0,00 + 1.670,80 − 0,00 = 3.427,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **3.427,00**; retenciones (0609) = 4.600,00; cuota diferencial (0610) = **-1.173,00**
- Resultado (0670) = **-1.173,00** (a devolver)
