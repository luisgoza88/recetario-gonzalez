# Optimizar Bundle

## Instrucciones

1. **Analizar bundle actual**:

```bash
cd /Users/marianatejada/Documents/GitHub/recetario-app && ANALYZE=true npm run build
```

2. **Identificar archivos grandes** en el bundle:
   - Buscar chunks > 100KB
   - Verificar si `recipe-library.ts` (231KB), `image-library-dishes.ts` (145KB) estan en bundle cliente
   - Listar componentes sin lazy loading

3. **Implementar lazy loading** para componentes pesados:

```typescript
import dynamic from 'next/dynamic';

const CalendarView = dynamic(() => import('./CalendarView'), {
  loading: () => <Spinner />,
  ssr: false
});
```

4. **Mover datos grandes** a server-side:
   - Datos > 50KB no deben importarse en client components
   - Usar API routes o server components para servir datos grandes

5. **Verificar mejora**:

```bash
ANALYZE=true npm run build
```

- Comparar tamanos de chunks antes/despues
- Reportar reduccion

6. **Checklist**:
   - [ ] Chunks principales < 200KB
   - [ ] Datos grandes no en bundle cliente
   - [ ] Componentes pesados con lazy loading
   - [ ] Build exitoso
