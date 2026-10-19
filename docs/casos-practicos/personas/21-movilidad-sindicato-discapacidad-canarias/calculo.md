# Persona Ficticia 21: Trabajadora con discapacidad del 33 % que se muda por un nuevo empleo

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Acepta en 2025 un empleo en otro municipio y traslada su residencia (movilidad geográfica); paga 180 € de cuota sindical; discapacidad del 33 %.

NIF ficticio 00000021K · Calle Ficticia 21, 35001 Las Palmas de Gran Canaria (dirección inventada) · comunidad: canarias

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 27.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.715,00 + sindicato/colegio/defensa 180,00
- Rendimiento neto previo (0017) = 27.000,00 − 1.895,00 = **25.105,00**
- Otros gastos art. 19.2.f) (0019) = **7.500,00** (2.000 general, + 2.000 por movilidad geográfica, + 3.500 por discapacidad de trabajador activo)
- Rendimiento neto (0022) = 25.105,00 − 7.500,00 = **17.605,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 25.105,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **17.605,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 17.605,00 = **17.605,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 17.605,00 = **17.605,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 3.000,00 = **8.550,00**
- Autonómico de Canarias (0520): contribuyente 5.606,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 3.030,00 = **8.636,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(17.605,00) 1.801,35 − escala(mínimo 8.550,00) 812,25 = 989,10
- General autonómica (Canarias): escala(17.605,00) 1.680,88 − escala(mínimo 8.636,00) 777,24 = 903,64
- Cuota íntegra estatal (0545) = **989,10**; autonómica (0546) = **903,64**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 989,10 − 0,00 + 903,64 − 0,00 = 1.892,74
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **1.892,74**; retenciones (0609) = 3.100,00; cuota diferencial (0610) = **-1.207,26**
- Resultado (0670) = **-1.207,26** (a devolver)
