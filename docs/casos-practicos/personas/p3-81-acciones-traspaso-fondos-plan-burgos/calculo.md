# Persona Ficticia 81: Venta de acciones, traspaso entre fondos sin tributar y plan de pensiones

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Vende acciones con 3.200 € de ganancia y traspasa 20.000 € de un fondo a otro (no tributa: art. 94.1.a LIRPF). Aporta 1.500 € a su plan de pensiones.

NIF ficticio 00000081N · Calle Ficticia 81, 47001 Valladolid (dirección inventada) · comunidad: castilla-y-leon

Qué prueba: traspaso entre fondos sin tributación (art. 94); ganancia de acciones; plan de pensiones (1.500 €).

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`. Módulos agrarios: [Orden HAC/1347/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-24949) y [caso práctico oficial del Manual, cap. 9](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c09-rendimientos-actividades-economicas-eo-fores/caso-practico.html).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Acciones: transmisión 11.200 − adquisición 8.000 = ganancia **3.200,00** (base del ahorro)
- Traspaso de 20.000 € entre fondos: no se computa ganancia (art. 94.1.a LIRPF); el nuevo fondo conserva el coste y la fecha del anterior

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 55.000,00, retenciones 11.800,00, Seguridad Social 3.564,00
- Íntegros (0003) = 55.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 3.564,00
- Rendimiento neto previo (0017) = **51.436,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **49.436,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 51.436,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **49.436,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 49.436,00 = **49.436,00**
- Base imponible del ahorro (0460) = **3.200,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Plan de pensiones propio: 1.500,00 (límite 1.500 y 30 % de los rendimientos netos del trabajo) → **1.500,00** (art. 52)
- Base liquidable general (0500) = 49.436,00 − 1.500,00 = **47.936,00**
- Base liquidable del ahorro (0510) = **3.200,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Castilla y León (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(47.936,00) 6.718,91 − escala(mínimo 5.550,00) 527,25 = 6.191,66
- General autonómica (Castilla y León): escala(47.936,00) 6.506,66 − escala(mínimo 5.550,00) 499,50 = 6.007,16
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 3.200,00 → estatal 304,00 y autonómica 304,00
- Cuota íntegra estatal (0545) = **6.495,66**; autonómica (0546) = **6.311,16**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 6.495,66 − 0,00 + 6.311,16 − 0,00 = 12.806,82
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **12.806,82**; pagos a cuenta (0609) = 11.800,00; cuota diferencial (0610) = **1.006,82**
- Resultado (0670) = **1.006,82** (a ingresar)
