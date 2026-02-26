# ONBOARDING — Backend

Checklist paso a paso para levantar el backend en local y entender rápidamente el código.

1) Clonar y dependencias

```
git clone <repo>
cd javi-portfolio
npm run install:all
# o solo backend:
cd backend
npm install
```

2) Variables de entorno

- Copia `.env.example` a `.env` y rellena los valores.
- Asegúrate de definir `JWT_SECRET` y `DATABASE_URL` (p.ej. `./data/db.sqlite`).

3) Ejecutar en modo desarrollo

```
npm run dev:backend   # desde la raíz del monorepo
# o dentro de backend
cd backend && npm run dev
```

El servidor arranca desde `src/infrastructure/express/server.ts`.

4) Ejecutar tests y coverage

```
# Tests
npm run test:backend

# Coverage
npm run test:coverage
```

5) Entender la estructura (lectura recomendada)

- Empezar por `backend/src/domain` (entidades y value objects).
- Luego `backend/src/application/use-cases` (casos de uso que orquestan la lógica).
- Finalmente `backend/src/infrastructure` (controladores y persistencia).

6) Añadir un nuevo caso de uso (resumen)

- Crear o modificar entidades/VOs en `domain` si hace falta.
- Añadir la lógica de orquestación en `application/use-cases` (usar puertos definidos en `domain/repositories`).
- Implementar adaptadores en `infrastructure` (repo concreto, añadir endpoint en controller).
- Escribir tests unitarios para la lógica de dominio y el caso de uso.

7) Buenas prácticas y notas

- Mantener los controladores delgados: validación mínima, mapear request -> caso de uso.
- Preferir pruebas unitarias fast y deterministic; usar `InMemory*` repositorios para pruebas de integración locales.
- Documentar nuevas variables de entorno en este README.
