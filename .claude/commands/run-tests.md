# Ejecutar Tests y Verificacion

## Instrucciones

1. **Build**:

```bash
cd /Users/marianatejada/Documents/GitHub/recetario-app && npm run build
```

Reportar si falla con errores especificos.

2. **Lint**:

```bash
npm run lint
```

Reportar warnings y errores.

3. **Tests**:

```bash
npm run test:run
```

Reportar tests pasados/fallados.

4. **Coverage**:

```bash
npm run test:coverage
```

Reportar porcentajes por area.

5. **Resumen**:
   - Build: PASS/FAIL
   - Lint: X warnings, Y errores
   - Tests: X/Y pasaron
   - Coverage: lineas X%, funciones Y%, branches Z%
   - Areas sin tests que deberian tenerlos
   - Regressions detectadas (si hay cambios recientes)
