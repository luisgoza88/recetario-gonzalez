import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Mock AuthContext - valor mínimo funcional
const mockAuthContext = {
  user: null,
  supabaseUser: null,
  session: null,
  memberships: [],
  currentHousehold: null,
  currentMembership: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  switchHousehold: vi.fn(),
  refreshMemberships: vi.fn(),
  hasPermission: vi.fn(() => true),
  isAdmin: vi.fn(() => false),
  isEmployee: vi.fn(() => false),
  isFamily: vi.fn(() => true),
  getRole: vi.fn(() => "familia"),
};

// Mock para AuthContext.Provider
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthContext,
  useOptionalAuth: () => mockAuthContext,
  AuthContext: {
    Provider: ({ children }: { children: ReactNode }) => children,
  },
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

// Mock analytics
vi.mock("@/lib/analytics", () => {
  const noop = vi.fn();
  const handler = { get: () => noop };
  const createGroup = () => new Proxy({}, handler);
  return {
    __esModule: true,
    default: {
      menu: { viewed: noop },
      recipe: { viewed: noop, created: noop },
      ai: { recipeGenerated: noop },
    },
    initAnalytics: vi.fn().mockResolvedValue(undefined),
    trackEvent: noop,
    identifyUser: noop,
    updateUserProperties: noop,
    incrementUserProperty: noop,
    resetUser: noop,
    trackSessionStart: noop,
    onboardingAnalytics: createGroup(),
    authAnalytics: createGroup(),
    recipeAnalytics: createGroup(),
    menuAnalytics: createGroup(),
    shoppingAnalytics: createGroup(),
    inventoryAnalytics: createGroup(),
    aiAnalytics: createGroup(),
    homeAnalytics: createGroup(),
    subscriptionAnalytics: createGroup(),
    engagementAnalytics: createGroup(),
  };
});

// Mock logger
vi.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock hooks
vi.mock("@/hooks/useOfflineSync", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("@/lib/stores/useAppStore", () => ({
  useGoToTodaySignal: () => 0,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Create a new QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
