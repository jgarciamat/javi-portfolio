# Persona Ficticia 20: Hereda un piso en 2020 y lo vende en 2025

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Piso heredado (valor en el Impuesto sobre Sucesiones 100.000 € + 1.500 € de impuesto y gastos) que vende el 30 de junio por 130.000 € con 4.000 € de gastos. Hasta la venta estuvo vacío (181 días).

NIF ficticio 00000020C · Calle Ficticia 20, 15001 A Coruña (dirección inventada) · comunidad: galicia

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Valor de adquisición (art. 36: el del Impuesto sobre Sucesiones + gastos y tributos) = 100.000 + 1.500 = 101.500,00
- Valor de transmisión = 130.000 − 4.000 = 126.000,00 → ganancia **24.500,00** (base del ahorro)
- La herencia no tributa en el IRPF (sí en Sucesiones); la plusvalía del fallecido no se grava ("plusvalía del muerto")

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 33.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.096,00
- Rendimiento neto previo (0017) = 33.000,00 − 2.096,00 = **30.904,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 30.904,00 − 2.000,00 = **28.904,00**

### 3. Imputación de rentas inmobiliarias (LIRPF art. 85)

- Valor catastral 50.000,00 × 2 % × 181/365 días = **495,89** (0089)

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 24.995,89 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **28.904,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 28.904,00 + 495,89 (imputación) = **29.399,89**
- Base imponible del ahorro (0460) = **24.500,00** (detalle en el apartado del ahorro)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 29.399,89 = **29.399,89**
- Base liquidable del ahorro (0510) = **24.500,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Galicia (0520): contribuyente 5.789,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.789,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(29.399,89) 3.492,73 − escala(mínimo 5.550,00) 527,25 = 2.965,48
- General autonómica (Galicia): escala(29.399,89) 3.351,74 − escala(mínimo 5.789,00) 521,01 = 2.830,73
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 24.500,00 → estatal 2.512,50 y autonómica 2.512,50
- Cuota íntegra estatal (0545) = **5.477,98**; autonómica (0546) = **5.343,23**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 5.477,98 − 0,00 + 5.343,23 − 0,00 = 10.821,21
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **10.821,21**; retenciones (0609) = 5.200,00; cuota diferencial (0610) = **5.621,21**
- Resultado (0670) = **5.621,21** (a ingresar)
