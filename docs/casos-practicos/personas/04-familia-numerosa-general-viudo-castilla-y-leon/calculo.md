# Persona Ficticia 04: Viudo con tres hijos: familia numerosa general

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Tres hijos de 10, 13 y 16 años que viven solo con él; título de familia numerosa general todo el año.

NIF ficticio 00000004G · Calle Ficticia 4, 47001 Valladolid (dirección inventada) · comunidad: castilla-y-leon

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 40.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.540,00
- Rendimiento neto previo (0017) = 40.000,00 − 2.540,00 = **37.460,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 37.460,00 − 2.000,00 = **35.460,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 37.460,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **35.460,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 35.460,00 = **35.460,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 35.460,00 = **35.460,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 9.100,00 + ascendientes 0,00 + discapacidad 0,00 = **14.650,00**
- Autonómico de Castilla y León (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 9.100,00 + ascendientes 0,00 + discapacidad 0,00 = **14.650,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(35.460,00) 4.410,85 − escala(mínimo 14.650,00) 1.446,75 = 2.964,10
- General autonómica (Castilla y León): escala(35.460,00) 4.198,60 − escala(mínimo 14.650,00) 1.384,50 = 2.814,10
- Cuota íntegra estatal (0545) = **2.964,10**; autonómica (0546) = **2.814,10**

### 9. Deducciones, cuota resultante y resultado

- Familia numerosa general (art. 81 bis): 1.200 € (12 meses × 100); tope de cotizaciones 2.540 ≥ 1.200; se cobra aunque no haya cuota
- Cuota líquida (0587) = 2.964,10 − 0,00 + 2.814,10 − 0,00 = 5.778,20
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **5.778,20**; retenciones (0609) = 6.800,00; cuota diferencial (0610) = **-1.021,80**
- Deducciones que se cobran aunque no haya cuota (maternidad, familia numerosa…) = 1.200,00
- Resultado (0670) = **-2.221,80** (a devolver)
