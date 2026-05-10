export type Locale = "es" | "en" | "pt";

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en", "pt"];

export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

// Traducciones core (ejemplo - se expandirá)
export const TRANSLATIONS = {
  es: {
    common: {
      loading: "Cargando...",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      back: "Atrás",
      close: "Cerrar",
      yes: "Sí",
      no: "No",
    },
    navigation: {
      home: "Hoy",
      recipes: "Recetario",
      market: "Mercado",
      ai: "IA",
      home_management: "Hogar",
      settings: "Ajustes",
    },
    recipes: {
      title: "Recetas",
      filter_by_mood: "Filtrar por mood",
      cooking_time: "Tiempo de cocción",
      portions: "Porciones",
      ingredients: "Ingredientes",
      steps: "Preparación",
      start_cooking: "Empezar a cocinar",
      add_to_favorites: "Agregar a favoritos",
    },
    market: {
      title: "Lista de compras",
      total: "Total",
      add_item: "Agregar item",
      shopping_now: "Estoy comprando",
      compare_prices: "Comparar precios",
    },
    auth: {
      sign_in: "Iniciar sesión",
      sign_up: "Crear cuenta",
      sign_out: "Cerrar sesión",
      email: "Email",
      password: "Contraseña",
    },
  },
  en: {
    common: {
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      close: "Close",
      yes: "Yes",
      no: "No",
    },
    navigation: {
      home: "Today",
      recipes: "Recipes",
      market: "Shopping",
      ai: "AI",
      home_management: "Home",
      settings: "Settings",
    },
    recipes: {
      title: "Recipes",
      filter_by_mood: "Filter by mood",
      cooking_time: "Cooking time",
      portions: "Servings",
      ingredients: "Ingredients",
      steps: "Preparation",
      start_cooking: "Start cooking",
      add_to_favorites: "Add to favorites",
    },
    market: {
      title: "Shopping list",
      total: "Total",
      add_item: "Add item",
      shopping_now: "Shopping now",
      compare_prices: "Compare prices",
    },
    auth: {
      sign_in: "Sign in",
      sign_up: "Sign up",
      sign_out: "Sign out",
      email: "Email",
      password: "Password",
    },
  },
  pt: {
    common: {
      loading: "Carregando...",
      save: "Salvar",
      cancel: "Cancelar",
      delete: "Excluir",
      edit: "Editar",
      back: "Voltar",
      close: "Fechar",
      yes: "Sim",
      no: "Não",
    },
    navigation: {
      home: "Hoje",
      recipes: "Receitas",
      market: "Mercado",
      ai: "IA",
      home_management: "Casa",
      settings: "Configurações",
    },
    recipes: {
      title: "Receitas",
      filter_by_mood: "Filtrar por humor",
      cooking_time: "Tempo de cozimento",
      portions: "Porções",
      ingredients: "Ingredientes",
      steps: "Preparação",
      start_cooking: "Começar a cozinhar",
      add_to_favorites: "Adicionar aos favoritos",
    },
    market: {
      title: "Lista de compras",
      total: "Total",
      add_item: "Adicionar item",
      shopping_now: "Comprando agora",
      compare_prices: "Comparar preços",
    },
    auth: {
      sign_in: "Entrar",
      sign_up: "Criar conta",
      sign_out: "Sair",
      email: "Email",
      password: "Senha",
    },
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)["es"];
