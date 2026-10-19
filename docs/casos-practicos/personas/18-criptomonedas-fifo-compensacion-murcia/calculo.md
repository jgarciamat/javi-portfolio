# Persona Ficticia 18: Criptomonedas: ganancia FIFO en una, pérdida en otra y compensación del 25 %

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Vende 0,6 BTC de dos compras (FIFO) con ganancia y todo su ETH con pérdida; la pérdida neta se compensa con el 25 % de los intereses.

NIF ficticio 00000018H · Calle Ficticia 18, 30001 Murcia (dirección inventada) · comunidad: murcia

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- BTC (FIFO): compras 0,5 a 20.000 € (10.000) y 0,5 a 40.000 € (20.000); vende 0,6 a 30.000 € = 18.000 − 50 de comisión = 17.950,00. Coste 10.000 + 0,1 × 40.000 = 14.000,00 → ganancia **3.950,00**
- ETH: compra 3 a 3.000 € (9.000) y vende las 3 por 4.000,00 (comisión incluida) → pérdida **−5.000,00** (redondeo de ejemplo)
- Saldo de ganancias y pérdidas: 3.950 − 5.000 = −1.050,00 (art. 49.1.b)
- Se compensa con los rendimientos del capital (intereses 1.000,00) hasta el 25 %: 250,00 → intereses 750,00; quedan −800,00 para los 4 años siguientes
- Base del ahorro **750,00**; retención de los intereses 190,00 (5.300,00 + 190,00 = 5.490,00)

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 33.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.096,00
- Rendimiento neto previo (0017) = 33.000,00 − 2.096,00 = **30.904,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 30.904,00 − 2.000,00 = **28.904,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 30.904,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **28.904,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 28.904,00 = **28.904,00**
- Base imponible del ahorro (0460) = **750,00** (detalle en el apartado del ahorro)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 28.904,00 = **28.904,00**
- Base liquidable del ahorro (0510) = **750,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Región de Murcia (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(28.904,00) 3.418,35 − escala(mínimo 5.550,00) 527,25 = 2.891,10
- General autonómica (Región de Murcia): escala(28.904,00) 3.208,38 − escala(mínimo 5.550,00) 527,25 = 2.681,13
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 750,00 → estatal 71,25 y autonómica 71,25
- Cuota íntegra estatal (0545) = **2.962,35**; autonómica (0546) = **2.752,38**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.962,35 − 0,00 + 2.752,38 − 0,00 = 5.714,73
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **5.714,73**; retenciones (0609) = 5.490,00; cuota diferencial (0610) = **224,73**
- Resultado (0670) = **224,73** (a ingresar)
