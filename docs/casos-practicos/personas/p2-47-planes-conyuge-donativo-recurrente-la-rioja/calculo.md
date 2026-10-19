# Persona Ficticia 47: Plan propio, plan del cónyuge sin rentas y donativo recurrente

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Aporta 1.500 € a su plan de pensiones y 1.000 € al de su mujer, que no tiene rentas. Dona 1.000 € a la misma ONG por tercer año (1.000 en 2023 y 2024): el resto pasa del 40 al 45 %.

NIF ficticio 00000047R · Calle Ficticia 47, 26001 Logroño (dirección inventada) · comunidad: la-rioja

Qué prueba: plan de pensiones propio (1.500); plan del cónyuge (art. 51.7, 1.000); donativo con fidelidad (45 %); reparto 50/50 de la deducción.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 48.000,00, retenciones 9.300,00, Seguridad Social 3.110,40
- Íntegros (0003) = 48.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 3.110,40
- Rendimiento neto previo (0017) = **44.889,60**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **42.889,60**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 44.889,60: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **42.889,60**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 42.889,60 = **42.889,60**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Plan de pensiones propio: 1.500,00 (límite 1.500 y 30 % de los rendimientos netos del trabajo) → **1.500,00** (art. 52)
- Plan de pensiones del cónyuge sin rentas (art. 51.7: rendimientos del cónyuge < 8.000): 1.000,00, límite 1.000 → 1.000,00
- Base liquidable general (0500) = 42.889,60 − 1.500,00 − 1.000,00 = **40.389,60**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de La Rioja (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(40.389,60) 5.322,83 − escala(mínimo 5.550,00) 527,25 = 4.795,58
- General autonómica (La Rioja): escala(40.389,60) 4.783,20 − escala(mínimo 5.550,00) 444,00 = 4.339,20
- Cuota íntegra estatal (0545) = **4.795,58**; autonómica (0546) = **4.339,20**

### 9. Deducciones, cuota resultante y resultado

- Donativos Ley 49/2002 con fidelidad (art. 19 Ley 49/2002): 250 × 80 % + 750 × 45 % (tercer año seguido con 1.000 € a la misma entidad) = 537,50; la mitad en cada cuota (caso oficial renta-c16-01, [Manual](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/deducciones-donativos-otras-aportaciones/donativos-realizados-entidades-incluidas/ejemplo-deduccion-donativos.html))
- Cuota líquida (0587) = 4.795,58 − 268,75 + 4.339,20 − 268,75 = 8.597,28
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **8.597,28**; pagos a cuenta (0609) = 9.300,00; cuota diferencial (0610) = **-702,72**
- Resultado (0670) = **-702,72** (a devolver)
