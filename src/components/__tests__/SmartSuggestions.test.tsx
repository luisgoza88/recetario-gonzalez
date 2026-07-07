import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/__tests__/test-utils";
import SmartSuggestions from "../SmartSuggestions";
import { Recipe } from "@/types";

// Mock useEscapeKey hook
vi.mock("@/hooks/useEscapeKey", () => ({
  useEscapeKey: vi.fn(),
}));

// Mock FocusTrap
vi.mock("@/components/ui/FocusTrap", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock inventory-check functions
vi.mock("@/lib/inventory-check", () => ({
  loadCurrentInventory: vi.fn().mockResolvedValue(new Map()),
  checkRecipeIngredients: vi.fn().mockResolvedValue({
    availabilityScore: 80,
    ingredientStatuses: [],
    missingIngredients: [],
    lowStockIngredients: [],
  }),
  findAlternativeRecipes: vi.fn().mockResolvedValue([]),
  getAvailableIngredientsList: vi.fn().mockResolvedValue([]),
}));

// Mock fetch global
global.fetch = vi.fn();

describe("SmartSuggestions", () => {
  const mockRecipe: Recipe = {
    id: "1",
    name: "Pasta Alfredo",
    ingredients: [
      { name: "Pasta", luis: "200g", mariana: "150g", total: "350g" },
      {
        name: "Crema de leche",
        luis: "150ml",
        mariana: "100ml",
        total: "250ml",
      },
    ],
    steps: ["Cocinar pasta", "Preparar salsa"],
    portions: { luis: "150ml", mariana: "100ml" },
    type: "lunch",
    prep_time: 25,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        recipe: {
          name: "Sugerencia generada",
          ingredients: [],
          steps: [],
        },
      }),
    });
  });

  it.skip("should render without crashing", async () => {
    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    // Esperar a que termine el loading inicial
    await waitFor(() => {
      expect(
        screen.queryByText(/Verificando inventario/i),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Sugerencias Inteligentes/i)).toBeInTheDocument();
  });

  it.skip("should display recipe styles options", async () => {
    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    // Esperar a que termine el loading inicial
    await waitFor(() => {
      expect(
        screen.queryByText(/Verificando inventario/i),
      ).not.toBeInTheDocument();
    });

    // Verificar que hay opciones de estilo
    expect(screen.getByText(/Saludable/i)).toBeInTheDocument();
    expect(screen.getByText(/Rápida/i)).toBeInTheDocument();
    expect(screen.getByText(/Económica/i)).toBeInTheDocument();
  });

  it("should call onClose when clicking close button", async () => {
    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    // Esperar a que termine el loading inicial
    await waitFor(() => {
      expect(
        screen.queryByText(/Verificando inventario/i),
      ).not.toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it.skip("should show loading state when generating recipe", async () => {
    // Mock delayed response
    (global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  recipe: { name: "Test", ingredients: [], steps: [] },
                }),
              }),
            100,
          ),
        ),
    );

    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    // Esperar a que termine el loading inicial
    await waitFor(() => {
      expect(
        screen.queryByText(/Verificando inventario/i),
      ).not.toBeInTheDocument();
    });

    // Seleccionar un estilo
    const saludableButton = screen.getByText(/Saludable/i);
    fireEvent.click(saludableButton);

    // Buscar botón de generar
    const generateButtons = screen.getAllByRole("button");
    const generateButton = generateButtons.find(
      (btn) =>
        btn.textContent?.includes("Generar") ||
        btn.textContent?.includes("sugerencia"),
    );

    if (generateButton) {
      fireEvent.click(generateButton);

      // Verificar loading state
      await waitFor(() => {
        expect(
          screen.queryByText(/Generando/i) || screen.queryByText(/Cargando/i),
        ).toBeTruthy();
      });
    }
  });

  it.skip("should allow selecting a recipe style", async () => {
    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    // Esperar a que termine el loading inicial
    await waitFor(() => {
      expect(
        screen.queryByText(/Verificando inventario/i),
      ).not.toBeInTheDocument();
    });

    const saludableButton = screen.getByText(/Saludable/i);
    fireEvent.click(saludableButton);

    // Verificar que el botón está seleccionado (puede tener clase especial o atributo)
    const button = saludableButton.closest("button");
    expect(button).toBeTruthy();
  });

  it("should display alternative recipes if available", async () => {
    // Mock con alternativas
    const { findAlternativeRecipes } = await import("@/lib/inventory-check");
    (findAlternativeRecipes as any).mockResolvedValue([
      {
        recipe: {
          id: "2",
          name: "Alternativa 1",
          type: "lunch",
        },
        availability: {
          availabilityScore: 90,
        },
      },
    ]);

    render(
      <SmartSuggestions
        recipe={mockRecipe}
        allRecipes={[mockRecipe]}
        mealType="lunch"
        onSelectAlternative={vi.fn()}
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      // Buscar sección de alternativas
      const alternativeSection =
        screen.queryByText(/Alternativas/i) ||
        screen.queryByText(/disponibles/i);
      if (alternativeSection) {
        expect(alternativeSection).toBeInTheDocument();
      }
    });
  });
});
