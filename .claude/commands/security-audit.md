# Auditoria de Seguridad

## Instrucciones

1. **Verificar auth en endpoints**: Buscar todos los archivos `route.ts` en `src/app/api/` y verificar que tengan autenticacion:
   - Buscar `x-user-id` o `auth.getUser()` en cada route
   - Listar endpoints SIN auth que no esten en la lista publica
   - Lista publica: `/api/validate-invitation`

2. **Auditar service role key**: Buscar `SUPABASE_SERVICE_ROLE_KEY` o `service_role` en todo el codigo:
   - Verificar que NUNCA se usa en codigo client-side
   - Verificar que solo se usa donde es necesario

3. **Buscar console.log en produccion**: Buscar `console.log` en `src/` excluyendo tests:
   - Listar todos los archivos con console.log
   - Marcar los que expongan datos sensibles

4. **Verificar RLS**: Para cada tabla con datos de usuario:
   - Verificar que RLS esta habilitado
   - Verificar que las policies usan household pattern

5. **Rate limiting**: Verificar que endpoints de IA y publicos tienen rate limiting

6. **Input validation**: Buscar queries con input del usuario (ILIKE, LIKE, etc):
   - Verificar sanitizacion

7. **Generar reporte**:
   | Severidad | Issue | Archivo | Linea |
   | --------- | ----- | ------- | ----- |
   | CRITICA   | ...   | ...     | ...   |
   | ALTA      | ...   | ...     | ...   |
   | MEDIA     | ...   | ...     | ...   |
