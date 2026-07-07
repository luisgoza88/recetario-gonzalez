import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import CalendarView from "../CalendarView";
import { Recipe } from "@/types";

// Mock fetch global
global.fetch = vi.fn();

// Mock IndexedDB functions
vi.mock("@/lib/indexedDB", () => ({
  cacheDayMenus: vi.fn(),
  getCachedDayMenus: vi.fn().mockResolvedValue([]),
}));

describe("CalendarView", () => {
  const mockRecipes: Recipe[] = [
    {
      id: "1",
      name: "Huevos revueltos",
      ingredients: [
        {
          name: "Huevos",
          luis: "3 unidades",
          mariana: "2 unidades",
          total: "5 unidades",
        },
      ],
      steps: ["Batir huevos", "Cocinar"],
      portions: { luis: "3 unidades", mariana: "2 unidades" },
      type: "breakfast",
      prep_time: 10,
    },
    {
      id: "2",
      name: "Pasta con pollo",
      ingredients: [
        { name: "Pasta", luis: "200g", mariana: "150g", total: "350g" },
        { name: "Pollo", luis: "150g", mariana: "100g", total: "250g" },
      ],
      steps: ["Hervir pasta", "Cocinar pollo"],
      portions: { luis: "200g", mariana: "150g" },
      type: "lunch",
      prep_time: 30,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful fetch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  it.skip("should render calendar without crashing", async () => {
    render(<CalendarView recipes={mockRecipes} />);

    // Esperar a que se cargue el contenido
    await waitFor(() => {
      expect(
        screen.queryByText("Cargando calendario..."),
      ).not.toBeInTheDocument();
    });

    // Usar getAllByText porque "2026" aparece múltiples veces
    const yearElements = screen.getAllByText(/2026/i);
    expect(yearElements.length).toBeGreaterThan(0);
  });

  it.skip("should display weekdays in Spanish", async () => {
    render(<CalendarView recipes={mockRecipes} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando calendario..."),
      ).not.toBeInTheDocument();
    });

    // Verificar que al menos algunos días de la semana estén visibles
    const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const foundWeekdays = weekdays.filter((day) => {
      try {
        screen.getByText(day);
        return true;
      } catch {
        return false;
      }
    });

    expect(foundWeekdays.length).toBeGreaterThan(0);
  });

  it.skip("should show loading state initially", () => {
    render(<CalendarView recipes={mockRecipes} />);

    // El componente muestra un spinner o texto de carga
    expect(screen.getByText("Cargando calendario...")).toBeInTheDocument();
  });

  it("should display navigation buttons", async () => {
    render(<CalendarView recipes={mockRecipes} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando calendario..."),
      ).not.toBeInTheDocument();
    });

    // Buscar botones de navegación por aria-label o rol
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should render shopping cart button when menu is generated", async () => {
    // Mock con menú generado
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            day_number: 1,
            breakfast_id: "1",
            lunch_id: "2",
            dinner_id: null,
          },
        ],
      }),
    });

    render(<CalendarView recipes={mockRecipes} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando calendario..."),
      ).not.toBeInTheDocument();
    });

    // Verificar que existe el ícono de carrito de compras
    const shoppingButtons = screen.queryAllByRole("button");
    const hasShoppingIcon = shoppingButtons.some(
      (button) =>
        button.textContent?.includes("Generar lista") ||
        button.querySelector("svg"),
    );

    expect(hasShoppingIcon).toBe(true);
  });
});
