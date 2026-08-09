import type {
  CarbTarget,
  DietaryIngredientGroup,
  DietaryMealPlan,
  DietaryPreferences,
  Recipe,
  RecipeDifficulty,
} from "@/types";

export const DIETARY_GROUP_OPTIONS: ReadonlyArray<{
  id: DietaryIngredientGroup;
  label: string;
  icon: string;
  section: "proteinas" | "vegetales" | "carbohidratos" | "complementos";
}> = [
  { id: "pollo-aves", label: "Pollo y aves", icon: "🍗", section: "proteinas" },
  { id: "pescado", label: "Pescado", icon: "🐟", section: "proteinas" },
  { id: "mariscos", label: "Mariscos", icon: "🦐", section: "proteinas" },
  { id: "res", label: "Carne de res", icon: "🥩", section: "proteinas" },
  { id: "cerdo", label: "Cerdo", icon: "🐖", section: "proteinas" },
  { id: "otras-carnes", label: "Otras carnes", icon: "🍖", section: "proteinas" },
  { id: "huevos", label: "Huevos", icon: "🥚", section: "proteinas" },
  { id: "lacteos", label: "Lácteos", icon: "🧀", section: "proteinas" },
  { id: "verduras", label: "Verduras", icon: "🥦", section: "vegetales" },
  { id: "frutas", label: "Frutas", icon: "🍓", section: "vegetales" },
  { id: "leguminosas", label: "Leguminosas", icon: "🫘", section: "carbohidratos" },
  { id: "cereales-harinas", label: "Cereales y harinas", icon: "🌾", section: "carbohidratos" },
  { id: "tuberculos-platanos", label: "Tubérculos y plátanos", icon: "🥔", section: "carbohidratos" },
  {
    id: "frutos-secos-semillas",
    label: "Frutos secos y semillas",
    icon: "🌰",
    section: "complementos",
  },
  { id: "grasas", label: "Grasas y aceites", icon: "🫒", section: "complementos" },
  { id: "azucares", label: "Azúcares y dulces", icon: "🍬", section: "carbohidratos" },
] as const;

export const CARB_TARGET_OPTIONS: ReadonlyArray<{
  id: CarbTarget;
  label: string;
  description: string;
  maxPerServing: number | null;
}> = [
  {
    id: "sin-limite",
    label: "Sin límite",
    description: "No filtra por carbohidratos.",
    maxPerServing: null,
  },
  {
    id: "moderado",
    label: "Moderado",
    description: "Hasta 50 g por porción.",
    maxPerServing: 50,
  },
  {
    id: "bajo",
    label: "Bajo",
    description: "Hasta 30 g por porción.",
    maxPerServing: 30,
  },
  {
    id: "muy-bajo",
    label: "Muy bajo",
    description: "Hasta 15 g por porción; lo más cercano a “casi cero”.",
    maxPerServing: 15,
  },
] as const;

export type DietCompatibilityStatus = "compatible" | "review" | "incompatible";

export interface RecipePracticality {
  difficulty: RecipeDifficulty;
  totalTime: number | null;
  ingredientCount: number;
  stepCount: number;
  colombiaAvailability: "comun" | "variable" | "especializada";
  specializedIngredients: string[];
}

export interface RecipeDietAnalysis {
  status: DietCompatibilityStatus;
  groups: DietaryIngredientGroup[];
  reasons: string[];
  reviewReasons: string[];
  carbsPerServing: number | null;
  practicality: RecipePracticality;
}

const GROUP_LABELS = new Map(
  DIETARY_GROUP_OPTIONS.map((group) => [group.id, group.label]),
);

const RESTRICTED_BY_ALLOW_LIST = new Set<DietaryIngredientGroup>([
  "pollo-aves",
  "pescado",
  "mariscos",
  "res",
  "cerdo",
  "otras-carnes",
  "huevos",
  "lacteos",
  "verduras",
  "frutas",
  "leguminosas",
  "cereales-harinas",
  "tuberculos-platanos",
  "frutos-secos-semillas",
  "azucares",
]);

const CARB_DENSE_GROUPS = new Set<DietaryIngredientGroup>([
  "leguminosas",
  "cereales-harinas",
  "tuberculos-platanos",
  "azucares",
]);

const PROTEIN_GROUPS = new Set<DietaryIngredientGroup>([
  "pollo-aves",
  "pescado",
  "mariscos",
  "res",
  "cerdo",
  "otras-carnes",
  "huevos",
  "lacteos",
  "leguminosas",
]);

const PATTERNS: Record<DietaryIngredientGroup, RegExp[]> = {
  "pollo-aves": [
    /\bpollo\b/,
    /\bpechuga\b/,
    /\bmuslo(s)?\b/,
    /\bgallina\b/,
    /\bpavo\b/,
    /\bpato\b/,
  ],
  pescado: [
    /\bpescad[oa]\b/,
    /\bsalmon\b/,
    /\btilapia\b/,
    /\batun\b/,
    /\btrucha\b/,
    /\bmojarras?\b/,
    /\bpargo\b/,
    /\bcorvina\b/,
    /\brobalo\b/,
    /\bmerluza\b/,
    /\bbagre\b/,
    /\bsierra\b/,
    /\bpirarucu\b/,
    /\bbacalao\b/,
    /\bsardina(s)?\b/,
    /\banchov(a|as|i|is)\b/,
  ],
  mariscos: [
    /\bmarisc(os)?\b/,
    /\bcamaron(es)?\b/,
    /\blangostin(os)?\b/,
    /\bcangrejo\b/,
    /\bjaiba\b/,
    /\bcalamar(es)?\b/,
    /\bpulpo\b/,
    /\bmejillon(es)?\b/,
    /\balmeja(s)?\b/,
    /\bostras?\b/,
  ],
  res: [
    /\bcarne de res\b/,
    /\bcarne molida\b/,
    /\bbistec\b/,
    /\bternera\b/,
    /\bsolomillo\b/,
    /\blomo de res\b/,
    /\bchatas?\b/,
    /\bpunta de anca\b/,
    /\bfilete de res\b/,
    /\bvacuno\b/,
    /\bchurrasco\b/,
    /\bsteak\b/,
  ],
  cerdo: [
    /\bcerdo\b/,
    /\bchicharron\b/,
    /\btocino\b/,
    /\btocineta\b/,
    /\bpanceta\b/,
    /\bjamon\b/,
    /\bchorizo\b/,
    /\blonganiza\b/,
    /\bprosciutto\b/,
  ],
  "otras-carnes": [
    /\bcordero\b/,
    /\bcabro\b/,
    /\bcabra\b/,
    /\bchivo\b/,
    /\bconejo\b/,
    /\bvenado\b/,
    /\bbufalo\b/,
  ],
  huevos: [/\bhuevo(s)?\b/, /\bclara(s)?\b/, /\byema(s)?\b/],
  lacteos: [
    /\bqueso\b/,
    /\byogur(t)?\b/,
    /\bkumis\b/,
    /\bcrema de leche\b/,
    /\bmantequilla\b/,
    /\bsuero coste(no|n)o?\b/,
    /\bparmesano\b/,
    /\bmozzarella\b/,
  ],
  verduras: [
    /\bverdura(s)?\b/,
    /\bvegetal(es)?\b/,
    /\blechuga\b/,
    /\bespinaca\b/,
    /\bacelga\b/,
    /\bkale\b/,
    /\bcol(iflor)?\b/,
    /\bbrocoli\b/,
    /\brepollo\b/,
    /\bcalabacin\b/,
    /\bzucchini\b/,
    /\bahuyama\b/,
    /\bcalabaza\b/,
    /\bberenjena\b/,
    /\bpepino\b/,
    /\btomate\b/,
    /\bcebolla\b/,
    /\bajo\b/,
    /\bpimenton\b/,
    /\baji\b/,
    /\bchampinon(es)?\b/,
    /\bsetas?\b/,
    /\besparragos?\b/,
    /\bapio\b/,
    /\bzanahoria\b/,
    /\bhabichuela(s)?\b/,
    /\barveja verde\b/,
    /\bcilantro\b/,
    /\bperejil\b/,
    /\balbahaca\b/,
    /\bpuerro\b/,
    /\brabano\b/,
    /\bnabo\b/,
    /\bremolacha\b/,
    /\balcachofa\b/,
  ],
  frutas: [
    /\bfruta(s)?\b/,
    /\bmanzana\b/,
    /\bpera\b/,
    /\bfresa(s)?\b/,
    /\bmora(s)?\b/,
    /\bframbuesa(s)?\b/,
    /\bmaracuya\b/,
    /\bmango\b/,
    /\bpapaya\b/,
    /\bguayaba\b/,
    /\bbanano\b/,
    /\bplatano maduro\b/,
    /\bpi(na|n)a?\b/,
    /\buva(s)?\b/,
    /\bdurazno\b/,
    /\bciruela\b/,
    /\bkiwi\b/,
    /\bgranadilla\b/,
    /\bguanabana\b/,
    /\bpatilla\b/,
    /\bmelon\b/,
  ],
  leguminosas: [
    /\bfrijol(es)?\b/,
    /\blenteja(s)?\b/,
    /\bgarbanzo(s)?\b/,
    /\bhabas?\b/,
    /\barveja(s)? seca(s)?\b/,
    /\bsoya\b/,
    /\btofu\b/,
  ],
  "cereales-harinas": [
    /\barroz\b/,
    /\bharina\b/,
    /\bpan\b/,
    /\bpasta\b/,
    /\bfideos?\b/,
    /\bavena\b/,
    /\bmaiz\b/,
    /\bmazorca\b/,
    /\barepa(s)?\b/,
    /\btortilla(s)?\b/,
    /\bquinoa\b/,
    /\bcebada\b/,
    /\bcuscus\b/,
    /\bgalleta(s)?\b/,
    /\bmasa\b/,
  ],
  "tuberculos-platanos": [
    /\bpapa(s)?\b/,
    /\byuca\b/,
    /\bname\b/,
    /\bbatata\b/,
    /\bcamote\b/,
    /\barracacha\b/,
    /\bplatano verde\b/,
    /\bplatano maduro\b/,
  ],
  "frutos-secos-semillas": [
    /\bnuez|nueces\b/,
    /\balmendra(s)?\b/,
    /\bmani\b/,
    /\bpistacho(s)?\b/,
    /\bsemilla(s)?\b/,
    /\bchia\b/,
    /\blinaza\b/,
    /\bajonjoli\b/,
  ],
  grasas: [
    /\baceite\b/,
    /\bmayonesa\b/,
    /\baguacate\b/,
    /\bleche de coco\b/,
    /\bcrema de coco\b/,
    /\bmanteca\b/,
  ],
  azucares: [
    /\bazucar\b/,
    /\bpanela\b/,
    /\bmiel\b/,
    /\bjarabe\b/,
    /\bdulce\b/,
    /\bchocolate\b/,
    /\bcaramelo\b/,
  ],
};

const SPECIALIZED_INGREDIENTS = [
  "azafran",
  "gochujang",
  "gochugaru",
  "miso",
  "mirin",
  "dashi",
  "galangal",
  "lemongrass",
  "harissa",
  "sumac",
  "trufa",
  "gruyere",
  "prosciutto",
  "pancetta",
  "alga nori",
  "wasabi",
  "queso halloumi",
  "pirarucu",
  "cangrejo azul",
];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, " ")
    .trim();
}

export function groupLabel(group: DietaryIngredientGroup): string {
  return GROUP_LABELS.get(group) ?? group;
}

export function classifyIngredientGroups(
  ingredientName: string,
): DietaryIngredientGroup[] {
  const name = normalize(ingredientName);
  if (!name) return [];

  // Sustitutos con nombres de carbohidratos que en realidad son vegetales.
  if (/arroz de coliflor|fideos? de (calabacin|zucchini)/.test(name)) {
    return ["verduras"];
  }

  const groups = new Set<DietaryIngredientGroup>();
  for (const [group, patterns] of Object.entries(PATTERNS) as Array<
    [DietaryIngredientGroup, RegExp[]]
  >) {
    if (patterns.some((pattern) => pattern.test(name))) groups.add(group);
  }

  // Las bebidas vegetales no son lácteos aunque contengan la palabra leche.
  if (/leche de (coco|almendra|soya|avena)/.test(name)) groups.delete("lacteos");
  else if (/\bleche\b/.test(name)) groups.add("lacteos");
  if (/salsa de soya|salsa soya/.test(name)) groups.delete("leguminosas");

  // "Piña" pierde la tilde al normalizar; el patrón intencionalmente se
  // completa aquí para mantener legibles las expresiones de arriba.
  if (/\bpina\b/.test(name)) groups.add("frutas");

  return [...groups];
}

export function getRecipeIngredientGroups(
  recipe: Pick<Recipe, "ingredients">,
): DietaryIngredientGroup[] {
  const groups = new Set<DietaryIngredientGroup>();
  for (const ingredient of recipe.ingredients ?? []) {
    for (const group of classifyIngredientGroups(ingredient.name)) {
      groups.add(group);
    }
  }
  return [...groups];
}

function recipeTotalTime(recipe: Recipe): number | null {
  if (typeof recipe.total_time === "number" && recipe.total_time > 0) {
    return recipe.total_time;
  }
  const prep = typeof recipe.prep_time === "number" ? recipe.prep_time : 0;
  const cook = typeof recipe.cook_time === "number" ? recipe.cook_time : 0;
  return prep + cook > 0 ? prep + cook : null;
}

const DIFFICULTY_RANK: Record<RecipeDifficulty, number> = {
  "fácil": 0,
  media: 1,
  "difícil": 2,
};

export function assessRecipePracticality(recipe: Recipe): RecipePracticality {
  const totalTime = recipeTotalTime(recipe);
  const ingredientCount = recipe.ingredients?.length ?? 0;
  const stepCount = recipe.steps?.length ?? 0;
  const normalizedIngredients = (recipe.ingredients ?? []).map((ingredient) =>
    normalize(ingredient.name),
  );
  const specializedIngredients = SPECIALIZED_INGREDIENTS.filter((special) =>
    normalizedIngredients.some((ingredient) => ingredient.includes(special)),
  );

  let score = 0;
  if (totalTime !== null) {
    if (totalTime > 90) score += 3;
    else if (totalTime > 60) score += 2;
    else if (totalTime > 35) score += 1;
  }
  if (ingredientCount > 14) score += 2;
  else if (ingredientCount > 9) score += 1;
  if (stepCount > 9) score += 2;
  else if (stepCount > 6) score += 1;

  const stepsText = normalize((recipe.steps ?? []).join(" "));
  if (/fermentar|ahumar|confitar|bano maria|deshuesar|amasar/.test(stepsText)) {
    score += 1;
  }
  if (specializedIngredients.length > 0) score += 1;

  const inferredDifficulty: RecipeDifficulty =
    score >= 6 ? "difícil" : score >= 3 ? "media" : "fácil";
  const declaredDifficulty = recipe.difficulty;
  const difficulty =
    declaredDifficulty &&
    DIFFICULTY_RANK[declaredDifficulty] > DIFFICULTY_RANK[inferredDifficulty]
      ? declaredDifficulty
      : inferredDifficulty;

  const colombiaAvailability =
    specializedIngredients.length >= 2
      ? "especializada"
      : specializedIngredients.length === 1
        ? "variable"
        : "comun";

  return {
    difficulty,
    totalTime,
    ingredientCount,
    stepCount,
    colombiaAvailability,
    specializedIngredients,
  };
}

export function hasActiveDietPlan(plan?: DietaryMealPlan | null): boolean {
  if (!plan) return false;
  return Boolean(
    plan.allowed_groups?.length ||
      plan.excluded_groups?.length ||
      (plan.carb_target && plan.carb_target !== "sin-limite") ||
      plan.meal_types?.length ||
      plan.max_difficulty ||
      plan.max_total_time ||
      plan.colombia_easy_only ||
      plan.required_any_groups?.length ||
      plan.min_protein ||
      plan.max_sodium ||
      plan.preset_id,
  );
}

const VEGETARIAN_EXCLUDED = new Set<DietaryIngredientGroup>([
  "pollo-aves",
  "pescado",
  "mariscos",
  "res",
  "cerdo",
  "otras-carnes",
]);

const VEGAN_EXCLUDED = new Set<DietaryIngredientGroup>([
  ...VEGETARIAN_EXCLUDED,
  "huevos",
  "lacteos",
]);

const GLUTEN_PATTERNS = [
  /\btrigo\b/,
  /\bharina(?!\s+de\s+(arroz|maiz|almendra|coco|yuca))/,
  /\bpan\b/,
  /\bpasta\b/,
  /\bcebada\b/,
  /\bcenteno\b/,
  /\bcuscus\b/,
  /\bcouscous\b/,
  /\bbulgur\b/,
  /\bseitan\b/,
];

function ingredientText(recipe: Recipe): string {
  return normalize((recipe.ingredients ?? []).map((item) => item.name).join(" "));
}

function carbLimitFor(target?: CarbTarget): number | null {
  return (
    CARB_TARGET_OPTIONS.find((option) => option.id === target)?.maxPerServing ??
    null
  );
}

export function analyzeRecipeForDiet(
  recipe: Recipe,
  preferences?: DietaryPreferences | null,
): RecipeDietAnalysis {
  const plan = preferences?.meal_plan;
  const groups = getRecipeIngredientGroups(recipe);
  const groupSet = new Set(groups);
  const reasons: string[] = [];
  const reviewReasons: string[] = [];
  const practicality = assessRecipePracticality(recipe);
  const carbsPerServing =
    typeof recipe.nutrition?.carbs === "number" ? recipe.nutrition.carbs : null;
  const normalizedRestrictions = new Set(
    (preferences?.restrictions ?? []).map(normalize),
  );
  const normalizedAllergies = (preferences?.allergies ?? []).map(normalize);
  const ingredientsText = ingredientText(recipe);

  const conflictsWith = (
    restricted: Set<DietaryIngredientGroup>,
    label: string,
  ) => {
    for (const group of groups) {
      if (restricted.has(group)) {
        reasons.push(
          `${label}: contiene ${groupLabel(group).toLocaleLowerCase("es")}`,
        );
      }
    }
  };

  if (normalizedRestrictions.has("vegetariano")) {
    conflictsWith(VEGETARIAN_EXCLUDED, "No es vegetariana");
  }
  if (normalizedRestrictions.has("vegano")) {
    conflictsWith(VEGAN_EXCLUDED, "No es vegana");
  }
  if (normalizedRestrictions.has("pescetariano")) {
    conflictsWith(
      new Set<DietaryIngredientGroup>([
        "pollo-aves",
        "res",
        "cerdo",
        "otras-carnes",
      ]),
      "No es pescetariana",
    );
  }
  if (
    normalizedRestrictions.has("sin-lactosa") &&
    groupSet.has("lacteos") &&
    !recipe.dietary_tags?.includes("sin-lactosa")
  ) {
    reasons.push("Contiene lácteos o requiere confirmar que sean sin lactosa");
  }
  if (
    normalizedRestrictions.has("sin-gluten") &&
    !recipe.dietary_tags?.includes("sin-gluten")
  ) {
    if (GLUTEN_PATTERNS.some((pattern) => pattern.test(ingredientsText))) {
      reasons.push("Contiene una fuente probable de gluten");
    } else {
      reviewReasons.push("Falta confirmar contaminación cruzada o gluten oculto");
    }
  }

  const allergyGroups: Record<string, DietaryIngredientGroup> = {
    mariscos: "mariscos",
    huevos: "huevos",
    lacteos: "lacteos",
  };
  for (const allergy of normalizedAllergies) {
    const allergyGroup = allergyGroups[allergy];
    if (allergyGroup && groupSet.has(allergyGroup)) {
      reasons.push(`Contiene el alérgeno indicado: ${groupLabel(allergyGroup)}`);
    } else if (allergy && ingredientsText.includes(allergy)) {
      reasons.push(`Contiene el alérgeno indicado: ${allergy}`);
    }
  }

  for (const excluded of plan?.excluded_groups ?? []) {
    if (groupSet.has(excluded)) {
      reasons.push(`Contiene ${groupLabel(excluded).toLocaleLowerCase("es")}`);
    }
  }

  const allowed = new Set(plan?.allowed_groups ?? []);
  if (allowed.size > 0) {
    const disallowedDetected = groups.filter(
      (group) => RESTRICTED_BY_ALLOW_LIST.has(group) && !allowed.has(group),
    );
    for (const group of disallowedDetected) {
      reasons.push(`${groupLabel(group)} no está entre los grupos permitidos`);
    }
    const hasAllowedMainGroup = groups.some(
      (group) => RESTRICTED_BY_ALLOW_LIST.has(group) && allowed.has(group),
    );
    if (!hasAllowedMainGroup && disallowedDetected.length === 0) {
      reviewReasons.push("No se pudo identificar un grupo principal permitido");
    }
  }

  const explicitRequiredAny = plan?.required_any_groups;
  const requiredAny =
    explicitRequiredAny ??
    [...allowed].filter((group) => PROTEIN_GROUPS.has(group));
  if (
    requiredAny.length > 0 &&
    !groups.some((group) => requiredAny.includes(group))
  ) {
    reasons.push(
      explicitRequiredAny
        ? `Debe contener al menos uno de estos grupos: ${requiredAny
            .map(groupLabel)
            .join(" o ")}`
        : `Debe contener al menos una proteína permitida: ${requiredAny
            .map(groupLabel)
            .join(" o ")}`,
    );
  }

  const normalizedAvoided = (preferences?.avoid_ingredients ?? []).map(normalize);
  for (const ingredient of recipe.ingredients ?? []) {
    const normalizedName = normalize(ingredient.name);
    const avoided = normalizedAvoided.find(
      (item) => item && (normalizedName.includes(item) || item.includes(normalizedName)),
    );
    if (avoided) reasons.push(`Contiene el ingrediente evitado: ${ingredient.name}`);
  }

  const carbLimit = carbLimitFor(plan?.carb_target);
  if (carbLimit !== null) {
    if (carbsPerServing !== null) {
      if (carbsPerServing > carbLimit) {
        reasons.push(
          `Tiene ${carbsPerServing} g de carbohidratos por porción (máximo ${carbLimit} g)`,
        );
      }
    } else {
      const carbDenseGroups = groups.filter((group) => CARB_DENSE_GROUPS.has(group));
      const taggedLowCarb =
        recipe.dietary_tags?.includes("bajo-carbohidrato") ||
        recipe.dietary_tags?.includes("keto");
      if (plan?.carb_target === "muy-bajo" && carbDenseGroups.length > 0) {
        reasons.push(
          `Sin dato nutricional y con ${carbDenseGroups
            .map((group) => groupLabel(group).toLocaleLowerCase("es"))
            .join(", ")}`,
        );
      } else if (!taggedLowCarb) {
        reviewReasons.push("Falta confirmar carbohidratos por porción");
      }
    }
  }

  if (plan?.meal_types?.length && !plan.meal_types.includes(recipe.type as never)) {
    reasons.push("No corresponde a los horarios seleccionados");
  }

  if (
    plan?.max_difficulty &&
    DIFFICULTY_RANK[practicality.difficulty] > DIFFICULTY_RANK[plan.max_difficulty]
  ) {
    reasons.push(`La dificultad estimada es ${practicality.difficulty}`);
  }

  if (
    plan?.max_total_time &&
    practicality.totalTime !== null &&
    practicality.totalTime > plan.max_total_time
  ) {
    reasons.push(`Toma aproximadamente ${practicality.totalTime} minutos`);
  }

  if (plan?.max_total_time && practicality.totalTime === null) {
    reviewReasons.push("Falta confirmar el tiempo total");
  }

  if (plan?.colombia_easy_only && practicality.colombiaAvailability !== "comun") {
    reasons.push("Incluye ingredientes de disponibilidad variable en Colombia");
  }

  if (plan?.min_protein) {
    const protein = recipe.nutrition?.protein;
    if (typeof protein === "number" && protein < plan.min_protein) {
      reasons.push(
        `Tiene ${protein} g de proteína por porción (mínimo ${plan.min_protein} g)`,
      );
    } else if (typeof protein !== "number") {
      reviewReasons.push("Falta confirmar la proteína por porción");
    }
  }

  if (plan?.max_sodium) {
    const sodium = recipe.nutrition?.sodium;
    if (typeof sodium === "number" && sodium > plan.max_sodium) {
      reasons.push(
        `Tiene ${sodium} mg de sodio por porción (máximo ${plan.max_sodium} mg)`,
      );
    } else if (typeof sodium !== "number") {
      reviewReasons.push("Falta confirmar el sodio por porción");
    }
  }

  return {
    status:
      reasons.length > 0
        ? "incompatible"
        : reviewReasons.length > 0
          ? "review"
          : "compatible",
    groups,
    reasons: [...new Set(reasons)],
    reviewReasons: [...new Set(reviewReasons)],
    carbsPerServing,
    practicality,
  };
}

export function summarizeDietCompatibility(
  recipes: Recipe[],
  preferences?: DietaryPreferences | null,
): { compatible: number; review: number; incompatible: number } {
  return recipes.reduce(
    (summary, recipe) => {
      summary[analyzeRecipeForDiet(recipe, preferences).status] += 1;
      return summary;
    },
    { compatible: 0, review: 0, incompatible: 0 },
  );
}
