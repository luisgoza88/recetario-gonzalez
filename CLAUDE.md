# Recetario App - Instrucciones para Claude

## Proyecto
Aplicación de recetario familiar con plan de 15 días y menú rotativo.

## Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel

## URLs
- **Producción**: https://recetario-app-self.vercel.app
- **Supabase Project ID**: snyelpbcfbzaxadrtxpa
- **GitHub**: https://github.com/luisgoza88/recetario-gonzalez

## Reglas de desarrollo

### Siempre hacer commit y deploy
Después de cada cambio de código:
1. Verificar que el build pase: `npm run build`
2. Hacer commit con mensaje descriptivo
3. Push a `main` para deploy automático en Vercel

### Base de datos
- Las tablas tienen RLS habilitado con políticas públicas (sin auth)
- Usar `onConflict` en upserts para evitar errores 409
