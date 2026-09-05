---
name: recetario-component-patterns
description: "UI library custom, patrones de componentes, anti-patrones a evitar, accesibilidad, TanStack Query hooks."
globs:
  - "src/components/**"
  - "src/components/ui/**"
---

# Componentes de la aplicación web

Esta aplicación usa Next.js App Router, React y Tailwind; no importar Expo/React Native por ser una PWA. Seguir componentes y tokens existentes.

TanStack Query: claves incluyen usuario/hogar y fecha cuando corresponde; activar consultas solo con sesión/hogar y cuando la vista las necesita. Comprobar error y ofrecer reintento. Separar carga de vistas mediante dynamic import. Usar selectores de Zustand y useShallow para objetos.

La navegación principal se refleja en URL mediante useAppNavigation; conservar Atrás y enlaces de entrada. Usar botones o enlaces semánticos con nombres accesibles. No declarar tablist sin el comportamiento de teclado/paneles requerido.

Las recetas usan RecipeModal y el catálogo combinado. Los controles visibles deben ejecutar una acción o presentarse claramente como información. No anunciar compras, idioma, tema o integraciones aún inexistentes.
