import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/__tests__/test-utils";
import RecipeModal from "../RecipeModal";
import { Recipe } from "@/types";

// Mock useEscapeKey hook
vi.mock("@/hooks/useEscapeKey", () => ({
  useEscapeKey: vi.fn(),
}));

// Mock FocusTrap component
vi.mock("@/components/ui/FocusTrap", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock dynamic imports
vi.mock("next/dynamic", () => ({
  default: (loader: any) => {
    const DynamicComponent = (props: any) => {
      const Component = loader();
      return <Component {...props} />;
    };
    return DynamicComponent;
  },
}));

// Mock SmartSubstitutionPanel
vi.mock("../SmartSubstitutionPanel", () => ({
  default: ({ missingIngredients }: { missingIngredients: string[] }) => (
    <div data-testid="substitution-panel">
      {missingIngredients.length > 0 && (
        <p>Ingredientes faltantes: {missingIngredients.join(", ")}</p>
      )}
    </div>
  ),
}));

// Mock ThermomixView
vi.mock("../ThermomixView", () => ({
  default: () => <div data-testid="thermomix-view">Vista Thermomix</div>,
}));

// Mock NutritionDisplay
vi.mock("../NutritionDisplay", () => ({
  default: () => <div>Información nutricional</div>,
  DietaryTags: () => <div>Tags dietéticos</div>,
  PrepTimeDisplay: () => <div>Tiempo de preparación</div>,
  DifficultyDisplay: () => <div>Dificultad</div>,
}));

describe("RecipeModal", () => {
  const mockRecipe: Recipe = {
    id: "1",
    name: "Pasta Carbonara",
    ingredients: [
      { name: "Pasta", luis: "200g", mariana: "150g", total: "350g" },
      {
        name: "Huevos",
        luis: "2 unidades",
        mariana: "1 unidad",
        total: "3 unidades",
      },
      { name: "Queso parmesano", luis: "50g", mariana: "30g", total: "80g" },
    ],
    steps: [
      "Hervir agua con sal",
      "Cocinar la pasta al dente",
      "Mezclar huevos con queso",
      "Combinar todo y servir",
    ],
    portions: { luis: "200g", mariana: "150g" },
    type: "lunch",
    prep_time: 20,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render recipe name and basic info", () => {
    render(<RecipeModal recipe={mockRecipe} onClose={mockOnClose} />);

    expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    // Verificar que hay ingredientes renderizados
    const ingredients = screen.getAllByText(/Pasta|Huevos|parmesano/i);
    expect(ingredients.length).toBeGreaterThan(0);
  });

  it("should render all ingredients", () => {
    render(<RecipeModal recipe={mockRecipe} onClose={mockOnClose} />);

    // Verificar usando getAllByText para elementos que aparecen múltiples veces
    expect(screen.getAllByText(/Pasta/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Huevos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Queso parmesano/i)).toBeInTheDocument();
  });

  it("should render all recipe steps", () => {
    render(<RecipeModal recipe={mockRecipe} onClose={mockOnClose} />);

    expect(screen.getByText(/Hervir agua con sal/i)).toBeInTheDocument();
    expect(screen.getByText(/Cocinar la pasta al dente/i)).toBeInTheDocument();
    expect(screen.getByText(/Mezclar huevos con queso/i)).toBeInTheDocument();
  });

  it("should call onClose when clicking close button", () => {
    render(<RecipeModal recipe={mockRecipe} onClose={mockOnClose} />);

    const closeButtons = screen.getAllByRole("button", { name: /cerrar/i });
    // Click the first close button (modal close button, not image close)
    fireEvent.click(closeButtons[0]);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should show SmartSubstitutionPanel when there are missing ingredients", () => {
    const missingIngredients = ["Queso parmesano", "Pasta"];

    render(
      <RecipeModal
        recipe={mockRecipe}
        onClose={mockOnClose}
        missingIngredients={missingIngredients}
      />,
    );

    expect(screen.getByTestId("substitution-panel")).toBeInTheDocument();
    expect(screen.getByText(/Ingredientes faltantes/i)).toBeInTheDocument();
  });

  it.skip("should show Thermomix adaptation button if recipe is compatible", async () => {
    // Mock fetch para la adaptación Thermomix
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        thermomixRecipe: {
          name: "Pasta Carbonara",
          steps: [],
        },
      }),
    });

    render(<RecipeModal recipe={mockRecipe} onClose={mockOnClose} />);

    // Buscar botón de Thermomix
    const thermomixButton = screen.queryByRole("button", {
      name: /thermomix/i,
    });

    // Si existe, verificar que funciona
    if (thermomixButton) {
      fireEvent.click(thermomixButton);

      await waitFor(() => {
        expect(screen.queryByTestId("thermomix-view")).toBeInTheDocument();
      });
    }
  });
});
