# Persona Ficticia 03: Matrimonio con dos sueldos: dos declaraciones individuales

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Los dos trabajan; un hijo de 4 años que se reparten al 50 %. Se presentan dos individuales (la conjunta sale peor).

NIF ficticio 00000003A · Calle Ficticia 3, 08001 Barcelona (dirección inventada) · comunidad: cataluna

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 30.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.905,00
- Rendimiento neto previo (0017) = 30.000,00 − 1.905,00 = **28.095,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 28.095,00 − 2.000,00 = **26.095,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 28.095,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **26.095,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 26.095,00 = **26.095,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 26.095,00 = **26.095,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 1.200,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **6.750,00**
- Autonómico de Cataluña (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 1.200,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **6.750,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(26.095,00) 2.997,00 − escala(mínimo 6.750,00) 641,25 = 2.355,75
- General autonómica (Cataluña): escala(26.095,00) 3.030,20 − escala(mínimo 6.750,00) 641,25 = 2.388,95
- Cuota íntegra estatal (0545) = **2.355,75**; autonómica (0546) = **2.388,95**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.355,75 − 0,00 + 2.388,95 − 0,00 = 4.744,70
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **4.744,70**; retenciones (0609) = 4.800,00; cuota diferencial (0610) = **-55,30**
- Resultado (0670) = **-55,30** (a devolver)

## Declaración individual del cónyuge


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 24.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.524,00
- Rendimiento neto previo (0017) = 24.000,00 − 1.524,00 = **22.476,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 22.476,00 − 2.000,00 = **20.476,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 22.476,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **20.476,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 20.476,00 = **20.476,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 20.476,00 = **20.476,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 1.200,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **6.750,00**
- Autonómico de Cataluña (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 1.200,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **6.750,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(20.476,00) 2.154,15 − escala(mínimo 6.750,00) 641,25 = 1.512,90
- General autonómica (Cataluña): escala(20.476,00) 2.184,50 − escala(mínimo 6.750,00) 641,25 = 1.543,25
- Cuota íntegra estatal (0545) = **1.512,90**; autonómica (0546) = **1.543,25**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.512,90 − 0,00 + 1.543,25 − 0,00 = 3.056,15
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **3.056,15**; retenciones (0609) = 3.300,00; cuota diferencial (0610) = **-243,85**
- Resultado (0670) = **-243,85** (a devolver)

## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 54.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 3.429,00
- Rendimiento neto previo (0017) = 54.000,00 − 3.429,00 = **50.571,00**
- Otros gastos art. 19.2.f) (0019) = **4.000,00** (2.000 general)
- Rendimiento neto (0022) = 50.571,00 − 4.000,00 = **46.571,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 50.571,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **46.571,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 46.571,00 = **46.571,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 3.400,00 (matrimonio, art. 84.2.4.º)
- Base liquidable general (0500) = 46.571,00 − 3.400,00 = **43.171,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 0,00 = **7.950,00**
- Autonómico de Cataluña (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 0,00 = **7.950,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(43.171,00) 5.837,39 − escala(mínimo 7.950,00) 755,25 = 5.082,14
- General autonómica (Cataluña): escala(43.171,00) 6.067,49 − escala(mínimo 7.950,00) 755,25 = 5.312,24
- Cuota íntegra estatal (0545) = **5.082,14**; autonómica (0546) = **5.312,24**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 5.082,14 − 0,00 + 5.312,24 − 0,00 = 10.394,38
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **10.394,38**; retenciones (0609) = 8.100,00; cuota diferencial (0610) = **2.294,38**
- Resultado (0670) = **2.294,38** (a ingresar)
- Comparación: dos individuales -55,30 + -243,85 = -299,15 frente a conjunta 2.294,38 → mejor la individual
