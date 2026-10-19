# Persona Ficticia 19: Jubilada de 68 años que vende su vivienda habitual

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Vende su vivienda habitual con una ganancia de 80.000 €: exenta por ser mayor de 65 años (art. 33.4.b). Tiene 400 € de intereses.

NIF ficticio 00000019L · Calle Ficticia 19, 07001 Palma (dirección inventada) · comunidad: baleares

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Ganancia de la vivienda habitual 80.000,00: exenta (art. 33.4.b, mayor de 65); se declara pero no se integra
- Intereses 400,00 (retención 76,00; 2.900,00 + 76,00 = 2.976,00) → base del ahorro **400,00**

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 22.000,00 (de ellos 22.000,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 0,00
- Rendimiento neto previo (0017) = 22.000,00 − 0,00 = **22.000,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 22.000,00 − 2.000,00 = **20.000,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 22.000,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **20.000,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 20.000,00 = **20.000,00**
- Base imponible del ahorro (0460) = **400,00** (detalle en el apartado del ahorro)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 20.000,00 = **20.000,00**
- Base liquidable del ahorro (0510) = **400,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 1.150,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.700,00**
- Autonómico de Illes Balears (0520): contribuyente 6.105,00 + edad 1.265,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **7.370,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(20.000,00) 2.088,75 − escala(mínimo 6.700,00) 636,50 = 1.452,25
- General autonómica (Illes Balears): escala(20.000,00) 2.085,00 − escala(mínimo 7.370,00) 663,30 = 1.421,70
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 400,00 → estatal 38,00 y autonómica 38,00
- Cuota íntegra estatal (0545) = **1.490,25**; autonómica (0546) = **1.459,70**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.490,25 − 0,00 + 1.459,70 − 0,00 = 2.949,95
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **2.949,95**; retenciones (0609) = 2.976,00; cuota diferencial (0610) = **-26,05**
- Resultado (0670) = **-26,05** (a devolver)
