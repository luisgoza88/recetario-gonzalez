---
name: recetario-component-patterns
description: "UI library custom, patrones de componentes, anti-patrones a evitar, accesibilidad, TanStack Query hooks."
globs:
  - "src/components/**"
  - "src/components/ui/**"
---

# Recetario Component Patterns

## UI Library Custom (`src/components/ui/`)

| Componente             | Uso                                                     |
| ---------------------- | ------------------------------------------------------- |
| `Button.tsx`           | Boton con variantes (primary, secondary, danger, ghost) |
| `Card.tsx`             | Card container con header/body                          |
| `Toast.tsx`            | Notificacion temporal                                   |
| `ConfirmDialog.tsx`    | Dialogo de confirmacion                                 |
| `FocusTrap.tsx`        | Trap de focus para modales                              |
| `Spinner.tsx`          | Loading spinner                                         |
| `ErrorBoundary.tsx`    | Error boundary React                                    |
| `OfflineIndicator.tsx` | Indicador de estado offline                             |

## Patron Correcto: Componente con Data Fetching

```tsx
// Hook separado para datos
function useRecipeData(recipeId: string) {
  return useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () =>
      supabase.from("recipes").select("*").eq("id", recipeId).single(),
  });
}

// Componente solo renderiza
function RecipeCard({ recipeId }: { recipeId: string }) {
  const { data, isLoading, error } = useRecipeData(recipeId);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <Card>{data.name}</Card>;
}
```

## Anti-Patrones a EVITAR

### 1. CustomEvents para navegacion (17 instancias!)

```tsx
// MAL - No testeable, no type-safe
window.dispatchEvent(new CustomEvent("navigate-to-recipes"));

// BIEN - Callbacks o context
const { navigate } = useAppNavigation();
navigate("recipes");
```

### 2. Spinner inline (30+ instancias)

```tsx
// MAL
{isLoading && <div className="animate-spin h-5 w-5 border-2...">}

// BIEN
{isLoading && <Spinner size="sm" />}
```

### 3. Queries Supabase directas en componentes

```tsx
// MAL
useEffect(() => {
  supabase
    .from("recipes")
    .select("*")
    .then(({ data }) => setRecipes(data));
}, []);

// BIEN
const { data: recipes } = useQuery({
  queryKey: ["recipes", householdId],
  queryFn: () =>
    supabase.from("recipes").select("*").eq("household_id", householdId),
});
```

### 4. Sin lazy loading

```tsx
// MAL - Todo en bundle inicial
import CalendarView from "./CalendarView";

// BIEN - Lazy loading
const CalendarView = dynamic(() => import("./CalendarView"), {
  loading: () => <Spinner />,
  ssr: false,
});
```

## Accesibilidad (Patron Modal)

```tsx
function MyModal({ isOpen, onClose, children }) {
  return isOpen ? (
    <FocusTrap>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Titulo</h2>
        {children}
        <button onClick={onClose} aria-label="Cerrar">
          X
        </button>
      </div>
    </FocusTrap>
  ) : null;
}
```

## Componentes Monster -- Estrategia de Split

Dividir en: Container (logica) + Presenter (UI) + Sub-componentes

- `CalendarView.tsx` (1,025 LOC) → CalendarContainer + DayCell + MealSlot + MenuModal
- `MarketView.tsx` (936 LOC) → MarketContainer + CategoryList + ItemRow + SearchBar
- `AddCustomItemModal.tsx` (1,070 LOC) → AddItemModal + ManualForm + ScanForm + VoiceForm + BarcodeForm + SearchForm
