# Persona Ficticia 07: Madre trabajadora con un hijo de 1 año y guardería

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Hijo nacido en 2024 que va a una guardería autorizada todo 2025 (paga 300 € al mes). Declaración individual; el mínimo del hijo se reparte con el padre.

NIF ficticio 00000007F · Calle Ficticia 7, 30001 Murcia (dirección inventada) · comunidad: murcia

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 36.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.286,00
- Rendimiento neto previo (0017) = 36.000,00 − 2.286,00 = **33.714,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 33.714,00 − 2.000,00 = **31.714,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 33.714,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **31.714,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 31.714,00 = **31.714,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 31.714,00 = **31.714,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.600,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.150,00**
- Autonómico de Región de Murcia (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 2.600,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.150,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(31.714,00) 3.839,85 − escala(mínimo 8.150,00) 774,25 = 3.065,60
- General autonómica (Región de Murcia): escala(31.714,00) 3.582,11 − escala(mínimo 8.150,00) 774,25 = 2.807,86
- Cuota íntegra estatal (0545) = **3.065,60**; autonómica (0546) = **2.807,86**

### 9. Deducciones, cuota resultante y resultado

- Maternidad (art. 81): 100 € × 12 meses = 1.200 €
- Incremento por guardería (art. 81.2): 3.600 € pagados sin subvención; tope 1.000 € al año
- Cuota líquida (0587) = 3.065,60 − 0,00 + 2.807,86 − 0,00 = 5.873,46
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **5.873,46**; retenciones (0609) = 6.100,00; cuota diferencial (0610) = **-226,54**
- Deducciones que se cobran aunque no haya cuota (maternidad, familia numerosa…) = 2.200,00
- Resultado (0670) = **-2.426,54** (a devolver)
