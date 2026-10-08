# ONBOARDING — Backend

1. **Instalar y arrancar**

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev          # http://localhost:3000/api/health
   ```

   Sin `RESEND_API_KEY`, los enlaces de verificación y de recuperación se imprimen en la consola.

2. **Recorrer el código** en este orden:
   `src/main.ts` → `src/infrastructure/container.ts` → `src/infrastructure/http/app.ts` y `routes/` →
   el servicio de aplicación de la funcionalidad (p. ej. `application/transactions/TransactionService.ts`) →
   el modelo en `domain/model/` → el repositorio en `infrastructure/sqlite/repositories/`.

3. **Añadir un endpoint**
   1. Regla o entidad en `domain/` (con sus tests en `src/tests/domain`).
   2. Método en el servicio de `application/<feature>/` usando solo puertos.
   3. Esquema zod en `http/schemas.ts`, presentador en `http/presenters.ts` y ruta en `http/routes/`.
   4. Test de integración en `src/tests/integration` (incluye el caso "otro usuario no puede acceder").

4. **Cambiar el esquema**: nueva migración `NNN-descripcion.ts` en `infrastructure/sqlite/migrations/`
   y añádela a `migrations/index.ts`. Pruébala también sobre una BD con datos (ver `migrations.test.ts`).

5. **Antes de hacer push**: `npm run lint && npx tsc --noEmit && npm test`.
