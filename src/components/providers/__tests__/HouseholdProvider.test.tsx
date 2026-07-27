import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HouseholdProvider } from "../HouseholdProvider";
import { useHouseholdStore } from "@/lib/stores/useHouseholdStore";

const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("HouseholdProvider", () => {
  beforeEach(() => {
    useHouseholdStore.setState({
      household: null,
      user: null,
      isLoading: true,
      isInitialized: false,
      error: null,
    });
    mockUseAuth.mockReset();
  });

  it("sincroniza el hogar validado por AuthContext aunque no haya perfil legacy", async () => {
    mockUseAuth.mockReturnValue({
      supabaseUser: { id: "auth-user-1" },
      currentHousehold: {
        id: "household-1",
        name: "Familia González",
        cooking_profile: {
          portions_config: { Luis: 3, Mariana: 2, Yolima: 1 },
        },
      },
      isLoading: false,
    });

    render(
      <HouseholdProvider>
        <div>Contenido</div>
      </HouseholdProvider>,
    );

    await waitFor(() => {
      expect(useHouseholdStore.getState().household?.id).toBe("household-1");
    });
    expect(
      useHouseholdStore.getState().household?.cooking_profile?.portions_config,
    ).toEqual({ Luis: 3, Mariana: 2, Yolima: 1 });
    expect(useHouseholdStore.getState().isInitialized).toBe(true);
    expect(useHouseholdStore.getState().isLoading).toBe(false);
  });

  it("limpia el hogar cuando termina una sesión", async () => {
    useHouseholdStore.setState({
      household: { id: "household-anterior" } as never,
    });
    mockUseAuth.mockReturnValue({
      supabaseUser: null,
      currentHousehold: null,
      isLoading: false,
    });

    render(
      <HouseholdProvider>
        <div>Contenido</div>
      </HouseholdProvider>,
    );

    await waitFor(() => {
      expect(useHouseholdStore.getState().household).toBeNull();
    });
  });
});
