import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// localStorage polyfill
//
// Node 22 ships an experimental global `localStorage` that, when launched
// without a valid `--localstorage-file`, exposes a stub WITHOUT working
// getItem/setItem methods. That stub shadows JSDOM's implementation and makes
// any component that reads localStorage during render throw
// "localStorage.getItem is not a function". We install a simple in-memory
// implementation so components behave as they do in the browser.
// ---------------------------------------------------------------------------
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStorage,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memoryStorage,
  });
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.GOOGLE_GEMINI_API_KEY = "test-gemini-key";
