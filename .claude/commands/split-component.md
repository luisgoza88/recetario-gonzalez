# Dividir Componente Monster

## Parametros

- $COMPONENT_PATH: Path al componente (ej: src/components/CalendarView.tsx)

## Instrucciones

1. **Leer el componente** completo y analizar responsabilidades

2. **Leer el skill** `recetario-component-patterns` para entender los patrones

3. **Identificar sub-componentes**:
   - Buscar secciones con JSX independiente (renderizadas condicionalmente)
   - Buscar useState/useEffect que se pueden extraer a hooks
   - Buscar logica de data fetching (debe ir a TanStack Query hooks)

4. **Proponer split**:
   - Container (logica + estado) → `{Name}Container.tsx`
   - Sub-componentes de UI → `{Name}/{SubComponent}.tsx`
   - Hooks de datos → `hooks/use{Name}Data.ts`
   - Hooks de acciones → `hooks/use{Name}Actions.ts`

5. **Implementar split**:
   - Crear directorio `{Name}/` si hay 3+ sub-componentes
   - Extraer hooks primero
   - Luego sub-componentes de UI
   - El container orquesta todo
   - Mantener exports para backwards compatibility

6. **Verificar accesibilidad**:
   - Modales con FocusTrap + aria-modal + Escape handler
   - Botones con aria-label si no tienen texto
   - ARIA roles donde aplique

7. **Verificar**:
   - [ ] `npm run build` exitoso
   - [ ] Cada archivo < 300 LOC
   - [ ] Sin CustomEvents (usar callbacks/context)
   - [ ] Spinner custom, no inline
   - [ ] Data fetching via TanStack Query
   - [ ] Tests actualizados si existian
