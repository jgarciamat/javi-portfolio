# Persona Ficticia 06: Madre sola con un hijo: individual frente a conjunta monoparental

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Custodia exclusiva de un hijo de 7 años, sin convivir con el otro progenitor. La conjunta resta 2.150 €.

NIF ficticio 00000006Y · Calle Ficticia 6, 46001 València (dirección inventada) · comunidad: comunitat-valenciana

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 22.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.397,00
- Rendimiento neto previo (0017) = 22.000,00 − 1.397,00 = **20.603,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 20.603,00 − 2.000,00 = **18.603,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 20.603,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **18.603,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 18.603,00 = **18.603,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 18.603,00 = **18.603,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 0,00 = **7.950,00**
- Autonómico de Comunitat Valenciana (0520): contribuyente 6.105,00 + edad 0,00 + descendientes 2.640,00 + ascendientes 0,00 + discapacidad 0,00 = **8.745,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(18.603,00) 1.921,11 − escala(mínimo 7.950,00) 755,25 = 1.165,86
- General autonómica (Comunitat Valenciana): escala(18.603,00) 1.872,36 − escala(mínimo 8.745,00) 787,05 = 1.085,31
- Cuota íntegra estatal (0545) = **1.165,86**; autonómica (0546) = **1.085,31**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.165,86 − 0,00 + 1.085,31 − 0,00 = 2.251,17
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **2.251,17**; retenciones (0609) = 2.500,00; cuota diferencial (0610) = **-248,83**
- Resultado (0670) = **-248,83** (a devolver)

## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 22.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.397,00
- Rendimiento neto previo (0017) = 22.000,00 − 1.397,00 = **20.603,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 20.603,00 − 2.000,00 = **18.603,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 20.603,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **18.603,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 18.603,00 = **18.603,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 2.150,00 (familia monoparental, art. 84.2.4.º)
- Base liquidable general (0500) = 18.603,00 − 2.150,00 = **16.453,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 0,00 = **7.950,00**
- Autonómico de Comunitat Valenciana (0520): contribuyente 6.105,00 + edad 0,00 + descendientes 2.640,00 + ascendientes 0,00 + discapacidad 0,00 = **8.745,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(16.453,00) 1.663,11 − escala(mínimo 7.950,00) 755,25 = 907,86
- General autonómica (Comunitat Valenciana): escala(16.453,00) 1.614,36 − escala(mínimo 8.745,00) 787,05 = 827,31
- Cuota íntegra estatal (0545) = **907,86**; autonómica (0546) = **827,31**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 907,86 − 0,00 + 827,31 − 0,00 = 1.735,17
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **1.735,17**; retenciones (0609) = 2.500,00; cuota diferencial (0610) = **-764,83**
- Resultado (0670) = **-764,83** (a devolver)
