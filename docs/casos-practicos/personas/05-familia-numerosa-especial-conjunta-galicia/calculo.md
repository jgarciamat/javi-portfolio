# Persona Ficticia 05: Matrimonio con cinco hijos en conjunta: familia numerosa especial

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Cinco hijos (2, 5, 8, 11 y 14 años); solo trabaja el primer declarante. Declaración conjunta.

NIF ficticio 00000005M · Calle Ficticia 5, 15001 A Coruña (dirección inventada) · comunidad: galicia

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 45.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.858,00
- Rendimiento neto previo (0017) = 45.000,00 − 2.858,00 = **42.142,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 42.142,00 − 2.000,00 = **40.142,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 42.142,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **40.142,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 40.142,00 = **40.142,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 3.400,00 (matrimonio, art. 84.2.4.º)
- Base liquidable general (0500) = 40.142,00 − 3.400,00 = **36.742,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 20.900,00 + ascendientes 0,00 + discapacidad 0,00 = **26.450,00**
- Autonómico de Galicia (0520): contribuyente 5.789,00 + edad 0,00 + descendientes 21.799,00 + ascendientes 0,00 + discapacidad 0,00 = **27.588,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(36.742,00) 4.648,02 − escala(mínimo 26.450,00) 3.050,25 = 1.597,77
- General autonómica (Galicia): escala(36.742,00) 4.499,69 − escala(mínimo 27.588,00) 3.081,77 = 1.417,92
- Cuota íntegra estatal (0545) = **1.597,77**; autonómica (0546) = **1.417,92**

### 9. Deducciones, cuota resultante y resultado

- Familia numerosa especial (art. 81 bis): 2.400 € (el doble de la general); el tope de cotizaciones solo afecta a los primeros 1.200 €
- Cuota líquida (0587) = 1.597,77 − 0,00 + 1.417,92 − 0,00 = 3.015,69
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **3.015,69**; retenciones (0609) = 7.500,00; cuota diferencial (0610) = **-4.484,31**
- Deducciones que se cobran aunque no haya cuota (maternidad, familia numerosa…) = 2.400,00
- Resultado (0670) = **-6.884,31** (a devolver)
