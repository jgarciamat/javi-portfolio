# Persona Ficticia 12: Asalariada que alquila un piso y tiene otro vacío

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Alquila un piso como vivienda (contrato de 2021: reducción del 60 %) y tiene otro piso vacío todo el año (valor catastral no revisado).

NIF ficticio 00000012N · Calle Ficticia 12, 28001 Madrid (dirección inventada) · comunidad: madrid

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 38.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.413,00
- Rendimiento neto previo (0017) = 38.000,00 − 2.413,00 = **35.587,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 35.587,00 − 2.000,00 = **33.587,00**

### 2. Inmueble alquilado (LIRPF arts. 22-23)

- Ingresos 10.800,00 − intereses y reparaciones 2.200,00 (límite: los ingresos) − otros gastos (IBI, comunidad, seguro) 1.250,00 − amortización 3 % de 90.000,00 = 2.700,00 → rendimiento neto **4.650,00**
- Reducción del 60 % (art. 23.2: contrato anterior al 26-05-2023) = 2.790,00 → rendimiento neto reducido **1.860,00**

### 3. Imputación de rentas inmobiliarias (LIRPF art. 85)

- Valor catastral 60.000,00 × 2 % × 365/365 días = **1.200,00** (0089)

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 35.587,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **33.587,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 33.587,00 + 1.860,00 (alquiler) + 1.200,00 (imputación) = **36.647,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 36.647,00 = **36.647,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Comunidad de Madrid (0520): contribuyente 5.956,65 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.956,65**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(36.647,00) 4.630,45 − escala(mínimo 5.550,00) 527,25 = 4.103,20
- General autonómica (Comunidad de Madrid): escala(36.647,00) 4.053,93 − escala(mínimo 5.956,65) 506,32 = 3.547,61
- Cuota íntegra estatal (0545) = **4.103,20**; autonómica (0546) = **3.547,61**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 4.103,20 − 0,00 + 3.547,61 − 0,00 = 7.650,81
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **7.650,81**; retenciones (0609) = 6.500,00; cuota diferencial (0610) = **1.150,81**
- Resultado (0670) = **1.150,81** (a ingresar)
