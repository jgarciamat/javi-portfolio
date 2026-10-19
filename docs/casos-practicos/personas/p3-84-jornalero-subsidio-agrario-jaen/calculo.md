# Persona Ficticia 84: Jornalero eventual agrario en Jaén con el subsidio agrario

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Trabaja en la campaña de la aceituna para dos empresarios (6.500 € y 3.000 €, Sistema Especial Agrario) y cobra 2.600 € del subsidio por desempleo de los trabajadores eventuales agrarios (rendimiento del trabajo). 12.100 € en total: no está obligado a declarar; le devuelven las retenciones.

NIF ficticio 00000084S · Calle Ficticia 84, 41001 Sevilla (dirección inventada) · comunidad: andalucia

Qué prueba: subsidio agrario (REASS); jornales de varios pagadores; sin obligación de declarar; deducción de 340 €.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`. Módulos agrarios: [Orden HAC/1347/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-24949) y [caso práctico oficial del Manual, cap. 9](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c09-rendimientos-actividades-economicas-eo-fores/caso-practico.html).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Olivarero Ficticio Uno (00000841J): íntegros 6.500,00, retenciones 130,00, Seguridad Social 312,00
- Pagador Olivarero Ficticio Dos (00000842Z): íntegros 3.000,00, retenciones 60,00, Seguridad Social 144,00
- Pagador Servicio Ficticio de Empleo (subsidio agrario) (Q00000843): íntegros 2.600,00, retenciones 0,00
- Íntegros (0003) = 12.100,00 (de ellos 2.600,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 456,00
- Rendimiento neto previo (0017) = **11.644,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **9.644,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 11.644,00: hasta 14.852 → 7.302; con el límite del rendimiento neto → **7.302,00** (0023)
- Rendimiento neto reducido (0025) = **2.342,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 2.342,00 = **2.342,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 2.342,00 = **2.342,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Andalucía (0520): contribuyente 5.790,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.790,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(2.342,00) 222,49 − escala(mínimo 2.342,00) 222,49 = 0,00
- General autonómica (Andalucía): escala(2.342,00) 222,49 − escala(mínimo 2.342,00) 222,49 = 0,00
- Cuota íntegra estatal (0545) = **0,00**; autonómica (0546) = **0,00**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 0,00 − 0,00 + 0,00 − 0,00 = 0,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **0,00**; pagos a cuenta (0609) = 190,00; cuota diferencial (0610) = **-190,00**
- Resultado (0670) = **-190,00** (a devolver)
