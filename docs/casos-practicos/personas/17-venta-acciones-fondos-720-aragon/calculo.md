# Persona Ficticia 17: Venta de acciones (FIFO), reembolso de un fondo con pérdida y cuenta en el extranjero

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Vende 150 de 200 acciones compradas en dos lotes; reembolsa un fondo con pérdidas; tiene 62.000 € en un bróker extranjero (modelo 720 informativo).

NIF ficticio 00000017V · Calle Ficticia 17, 50001 Zaragoza (dirección inventada) · comunidad: aragon

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Acciones (FIFO, art. 37.2 LIRPF): vende 150 a 40 € = 6.000 − 15 de gastos = 5.985,00. Coste: 100 del lote de 2019 (2.010,00 con gastos) + 50 del lote de 2021 (3.010 × 50/100 = 1.505,00) = 3.515,00 → ganancia **2.470,00**
- Fondo: reembolso 8.000,00 − coste 9.000,00 → pérdida **−1.000,00**
- Integración (art. 49): ganancias y pérdidas entre sí: 2.470 − 1.000 = 1.470,00; intereses 300,00 → base del ahorro **1.770,00**
- Retención de los intereses 57,00 sumada a las del trabajo (8.200,00 → 8.257,00)
- Modelo 720: saldo de valores en el extranjero de 62.000 € a 31-12 > 50.000 € → obligación de informar (sin cuota)

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
- Base imponible del ahorro (0460) = **1.770,00** (detalle en el apartado del ahorro)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 40.142,00 = **40.142,00**
- Base liquidable del ahorro (0510) = **1.770,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Aragón (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(40.142,00) 5.277,02 − escala(mínimo 5.550,00) 527,25 = 4.749,77
- General autonómica (Aragón): escala(40.142,00) 5.169,56 − escala(mínimo 5.550,00) 527,25 = 4.642,31
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 1.770,00 → estatal 168,15 y autonómica 168,15
- Cuota íntegra estatal (0545) = **4.917,92**; autonómica (0546) = **4.810,46**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 4.917,92 − 0,00 + 4.810,46 − 0,00 = 9.728,38
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **9.728,38**; retenciones (0609) = 8.257,00; cuota diferencial (0610) = **1.471,38**
- Resultado (0670) = **1.471,38** (a ingresar)
