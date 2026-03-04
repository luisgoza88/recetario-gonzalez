import { Calendar, ShoppingCart, Home, Target, Heart, Bot } from "lucide-react";
import { createElement } from "react";
import type {
  DietaryPreference,
  CuisineTemplate,
  GoalOption,
  SpaceConfig,
} from "./types";

export const DIETARY_PREFERENCES: DietaryPreference[] = [
  {
    id: "none",
    name: "Sin restricciones",
    icon: "🍽️",
    description: "Comemos de todo",
  },
  {
    id: "vegetariano",
    name: "Vegetariano",
    icon: "🥬",
    description: "Sin carnes",
  },
  {
    id: "vegano",
    name: "Vegano",
    icon: "🌱",
    description: "Sin productos animales",
  },
  {
    id: "sin-gluten",
    name: "Sin gluten",
    icon: "🌾",
    description: "Celíacos o sensibilidad",
  },
  {
    id: "sin-lactosa",
    name: "Sin lactosa",
    icon: "🥛",
    description: "Intolerancia a lácteos",
  },
  {
    id: "keto",
    name: "Keto / Low-carb",
    icon: "🥑",
    description: "Bajo en carbohidratos",
  },
  {
    id: "halal",
    name: "Halal",
    icon: "☪️",
    description: "Según normas islámicas",
  },
  {
    id: "kosher",
    name: "Kosher",
    icon: "✡️",
    description: "Según normas judías",
  },
];

export const CUISINE_TEMPLATES: CuisineTemplate[] = [
  {
    id: "colombiana",
    name: "Cocina Colombiana",
    flag: "🇨🇴",
    description: "Bandeja paisa, ajiaco, sancocho...",
    popular: ["Ajiaco", "Bandeja Paisa", "Arroz con Pollo", "Sancocho"],
  },
  {
    id: "mexicana",
    name: "Cocina Mexicana",
    flag: "🇲🇽",
    description: "Tacos, enchiladas, pozole...",
    popular: ["Tacos", "Enchiladas", "Pozole", "Mole"],
  },
  {
    id: "mediterranea",
    name: "Mediterránea",
    flag: "🇪🇸",
    description: "Paella, tapas, ensaladas...",
    popular: ["Paella", "Gazpacho", "Tortilla Española", "Tapas"],
  },
  {
    id: "peruana",
    name: "Cocina Peruana",
    flag: "🇵🇪",
    description: "Ceviche, lomo saltado, ají...",
    popular: ["Ceviche", "Lomo Saltado", "Ají de Gallina", "Causa"],
  },
  {
    id: "argentina",
    name: "Cocina Argentina",
    flag: "🇦🇷",
    description: "Asado, empanadas, milanesas...",
    popular: ["Asado", "Empanadas", "Milanesa", "Locro"],
  },
  {
    id: "internacional",
    name: "Internacional / Fusión",
    flag: "🌍",
    description: "Mezcla de diferentes cocinas",
    popular: ["Pasta", "Sushi", "Curry", "Stir-fry"],
  },
];

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "meal-planning",
    name: "Planificar comidas",
    icon: createElement(Calendar, { size: 24 }),
    description: "Organizar el menú semanal y no repetir platos",
  },
  {
    id: "shopping",
    name: "Lista de compras inteligente",
    icon: createElement(ShoppingCart, { size: 24 }),
    description: "Saber exactamente qué comprar cada semana",
  },
  {
    id: "home-management",
    name: "Gestionar el hogar",
    icon: createElement(Home, { size: 24 }),
    description: "Organizar empleados, tareas y limpieza",
  },
  {
    id: "save-money",
    name: "Ahorrar dinero",
    icon: createElement(Target, { size: 24 }),
    description: "Reducir desperdicios y optimizar compras",
  },
  {
    id: "eat-healthy",
    name: "Comer más sano",
    icon: createElement(Heart, { size: 24 }),
    description: "Seguir una dieta balanceada",
  },
  {
    id: "ai-assistant",
    name: "Tener un asistente IA",
    icon: createElement(Bot, { size: 24 }),
    description: "Que me ayude con recetas y sugerencias",
  },
];

export const DEFAULT_SPACES: SpaceConfig[] = [
  { id: "sala", name: "Sala", category: "interior", selected: true },
  { id: "comedor", name: "Comedor", category: "interior", selected: true },
  { id: "cocina", name: "Cocina", category: "interior", selected: true },
  {
    id: "habitacion1",
    name: "Habitación Principal",
    category: "interior",
    selected: true,
  },
  {
    id: "habitacion2",
    name: "Habitación 2",
    category: "interior",
    selected: false,
  },
  {
    id: "habitacion3",
    name: "Habitación 3",
    category: "interior",
    selected: false,
  },
  { id: "bano1", name: "Baño Principal", category: "interior", selected: true },
  { id: "bano2", name: "Baño 2", category: "interior", selected: false },
  {
    id: "estudio",
    name: "Estudio/Oficina",
    category: "interior",
    selected: false,
  },
  {
    id: "lavanderia",
    name: "Lavandería",
    category: "interior",
    selected: true,
  },
  { id: "jardin", name: "Jardín", category: "exterior", selected: false },
  { id: "terraza", name: "Terraza", category: "exterior", selected: false },
  { id: "garaje", name: "Garaje", category: "exterior", selected: false },
  { id: "patio", name: "Patio", category: "exterior", selected: false },
];

export const WORK_DAYS = [
  { id: "lunes", label: "L" },
  { id: "martes", label: "M" },
  { id: "miercoles", label: "Mi" },
  { id: "jueves", label: "J" },
  { id: "viernes", label: "V" },
  { id: "sabado", label: "S" },
];
