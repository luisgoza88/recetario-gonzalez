import type { ExpandedRecipe } from "@/data/expanded-recipes";
import type { Ingredient, RecipeDifficulty } from "@/types";

interface LowCarbRecipeSpec {
  id: string;
  name: string;
  type: "lunch" | "dinner";
  description: string;
  ingredients: Array<[name: string, total: string]>;
  steps: string[];
  prep: number;
  cook: number;
  difficulty?: RecipeDifficulty;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  tags: string[];
}

function ingredient([name, total]: [string, string]): Ingredient {
  return { name, total };
}

function createLowCarbRecipe(spec: LowCarbRecipeSpec): ExpandedRecipe {
  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    category: spec.type === "dinner" ? "cena-ligera" : "fitness",
    description: spec.description,
    total: "2 porciones",
    ingredients: spec.ingredients.map(ingredient),
    steps: spec.steps,
    prep_time: spec.prep,
    cook_time: spec.cook,
    total_time: spec.prep + spec.cook,
    difficulty: spec.difficulty ?? "fácil",
    nutrition: {
      calories: spec.calories,
      protein: spec.protein,
      carbs: spec.carbs,
      fat: spec.fat,
    },
    dietary_tags: [
      "bajo-carbohidrato",
      "alto-proteina",
      "sin-gluten",
      "sin-lactosa",
    ],
    tags: [
      ...spec.tags,
      "colombia-facil",
      "pocos-ingredientes",
      "bajo-carbohidrato",
    ],
    thermomixCompatible: false,
    source: "manual",
  };
}

const specs: LowCarbRecipeSpec[] = [
  {
    id: "lc-co-01",
    name: "Pechuga al Limón con Brócoli",
    type: "lunch",
    description: "Pollo dorado con limón y brócoli al vapor; rápido y de mercado cotidiano.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Brócoli", "1 cabeza"], ["Limón", "2 unidades"], ["Ajo", "2 dientes"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Sazonar el pollo con sal, pimienta, ajo y limón.", "Dorar en sartén 6 minutos por lado.", "Cocinar el brócoli al vapor 6 minutos y servir con el pollo."],
    prep: 10, cook: 18, protein: 47, carbs: 9, fat: 14, calories: 350, tags: ["pollo", "sartén", "brócoli"],
  },
  {
    id: "lc-co-02",
    name: "Pollo Sudado sin Papa",
    type: "lunch",
    description: "Versión ligera del sudado colombiano con calabacín, tomate y cebolla.",
    ingredients: [["Muslos de pollo sin piel", "500 g"], ["Calabacín", "2 unidades"], ["Tomate", "3 unidades"], ["Cebolla larga", "2 tallos"], ["Ajo", "2 dientes"], ["Cilantro", "1/4 manojo"]],
    steps: ["Dorar los muslos en una olla amplia.", "Agregar tomate, cebolla, ajo y media taza de agua.", "Cocinar tapado 25 minutos; añadir el calabacín los últimos 8 minutos.", "Terminar con cilantro."],
    prep: 12, cook: 35, difficulty: "media", protein: 39, carbs: 10, fat: 18, calories: 365, tags: ["pollo", "colombiana", "olla"],
  },
  {
    id: "lc-co-03",
    name: "Pollo al Cilantro con Arroz de Coliflor",
    type: "lunch",
    description: "Pechuga jugosa con salsa fresca de cilantro y coliflor rallada.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Coliflor", "1 pequeña"], ["Cilantro", "1/2 manojo"], ["Limón", "1 unidad"], ["Ajo", "2 dientes"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Rallar la coliflor y saltearla 6 minutos con sal.", "Licuar cilantro, limón, ajo y dos cucharadas de agua.", "Dorar el pollo y agregar la salsa los últimos 3 minutos."],
    prep: 15, cook: 18, protein: 45, carbs: 11, fat: 13, calories: 345, tags: ["pollo", "coliflor", "sartén"],
  },
  {
    id: "lc-co-04",
    name: "Pollo al Ajo con Habichuelas",
    type: "dinner",
    description: "Cena de una sola sartén con pollo, habichuelas tiernas y ajo.",
    ingredients: [["Pechuga de pollo", "350 g"], ["Habichuelas", "300 g"], ["Ajo", "3 dientes"], ["Limón", "1 unidad"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Cortar y sazonar el pollo.", "Dorarlo 8 minutos en sartén.", "Agregar habichuelas y ajo; cocinar 8 minutos más.", "Finalizar con limón."],
    prep: 10, cook: 16, protein: 42, carbs: 10, fat: 12, calories: 325, tags: ["pollo", "habichuelas", "una-sartén"],
  },
  {
    id: "lc-co-05",
    name: "Ensalada Tibia de Pollo y Aguacate",
    type: "dinner",
    description: "Pollo caliente sobre lechuga, pepino, tomate y aguacate.",
    ingredients: [["Pechuga de pollo", "350 g"], ["Lechuga", "1 unidad"], ["Pepino cohombro", "1 unidad"], ["Tomate", "2 unidades"], ["Aguacate", "1 unidad"], ["Limón", "2 unidades"]],
    steps: ["Dorar el pollo sazonado y cortarlo en tiras.", "Lavar y cortar los vegetales.", "Mezclar con limón, sal y aguacate; poner el pollo caliente encima."],
    prep: 15, cook: 14, protein: 39, carbs: 12, fat: 21, calories: 390, tags: ["pollo", "ensalada", "aguacate"],
  },
  {
    id: "lc-co-06",
    name: "Pimentones Rellenos de Pollo",
    type: "lunch",
    description: "Pimentones rellenos con pollo desmechado, tomate y calabacín, sin arroz ni queso.",
    ingredients: [["Pollo desmechado", "400 g"], ["Pimentones", "2 grandes"], ["Calabacín", "1 unidad"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Ajo", "1 diente"]],
    steps: ["Partir los pimentones y retirar semillas.", "Sofreír cebolla, ajo, tomate y calabacín; mezclar el pollo.", "Rellenar y hornear 22 minutos a 190 °C."],
    prep: 18, cook: 25, difficulty: "media", protein: 43, carbs: 13, fat: 11, calories: 330, tags: ["pollo", "horno", "pimentón"],
  },
  {
    id: "lc-co-07",
    name: "Tacos de Lechuga con Pollo",
    type: "dinner",
    description: "Hojas de lechuga crujientes rellenas de pollo especiado y pico de gallo.",
    ingredients: [["Pollo molido o picado", "350 g"], ["Lechuga", "1 unidad"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Pimentón", "1 unidad"], ["Limón", "1 unidad"]],
    steps: ["Sofreír pollo, cebolla y pimentón 12 minutos.", "Mezclar tomate y limón para el pico de gallo.", "Servir el pollo en hojas de lechuga con el pico de gallo."],
    prep: 12, cook: 14, protein: 38, carbs: 9, fat: 13, calories: 310, tags: ["pollo", "lechuga", "rápida"],
  },
  {
    id: "lc-co-08",
    name: "Pollo Salteado con Vegetales",
    type: "lunch",
    description: "Salteado rápido de pollo, brócoli, pimentón y calabacín.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Brócoli", "250 g"], ["Pimentón", "1 unidad"], ["Calabacín", "1 unidad"], ["Salsa de soya baja en sodio", "1 cucharada"], ["Jengibre", "1 cucharadita"]],
    steps: ["Cortar todo en piezas parejas.", "Dorar el pollo 7 minutos a fuego alto.", "Agregar vegetales, jengibre y salsa de soya; saltear 7 minutos."],
    prep: 15, cook: 14, protein: 44, carbs: 12, fat: 10, calories: 320, tags: ["pollo", "salteado", "vegetales"],
  },
  {
    id: "lc-co-09",
    name: "Curry Suave de Pollo y Espinaca",
    type: "lunch",
    description: "Curry casero sin arroz, con leche de coco y espinaca.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Espinaca", "250 g"], ["Leche de coco", "200 ml"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Curry en polvo", "1 cucharada"]],
    steps: ["Sofreír cebolla, tomate y curry.", "Agregar pollo en cubos y dorar 8 minutos.", "Verter leche de coco y cocinar 12 minutos.", "Añadir espinaca y cocinar 3 minutos."],
    prep: 12, cook: 25, difficulty: "media", protein: 40, carbs: 10, fat: 22, calories: 405, tags: ["pollo", "curry", "espinaca"],
  },
  {
    id: "lc-co-10",
    name: "Sopa de Pollo con Verduras sin Tubérculos",
    type: "dinner",
    description: "Caldo reconfortante con pollo, apio, calabacín, repollo y zanahoria moderada.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Calabacín", "1 unidad"], ["Repollo", "200 g"], ["Apio", "2 tallos"], ["Zanahoria", "1 pequeña"], ["Cebolla larga", "2 tallos"], ["Cilantro", "1/4 manojo"]],
    steps: ["Cocinar el pollo con cebolla y apio en 1,2 litros de agua por 20 minutos.", "Desmechar el pollo.", "Agregar los vegetales y cocinar 12 minutos.", "Devolver el pollo y terminar con cilantro."],
    prep: 15, cook: 35, difficulty: "media", protein: 38, carbs: 12, fat: 8, calories: 285, tags: ["pollo", "sopa", "verduras"],
  },
  {
    id: "lc-co-11",
    name: "Fideos de Calabacín con Pollo",
    type: "dinner",
    description: "Tiras de calabacín salteadas con pollo, tomate y albahaca.",
    ingredients: [["Pechuga de pollo", "350 g"], ["Calabacín", "3 unidades"], ["Tomate", "2 unidades"], ["Ajo", "2 dientes"], ["Albahaca", "10 hojas"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Cortar el calabacín en tiras finas.", "Dorar el pollo en cubos 10 minutos.", "Agregar tomate y ajo 4 minutos.", "Incorporar el calabacín solo 3 minutos y terminar con albahaca."],
    prep: 15, cook: 17, protein: 40, carbs: 11, fat: 13, calories: 325, tags: ["pollo", "calabacín", "rápida"],
  },
  {
    id: "lc-co-12",
    name: "Bowl de Pollo, Brócoli y Coliflor",
    type: "lunch",
    description: "Bowl sin granos con pollo, brócoli y arroz de coliflor.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Brócoli", "250 g"], ["Arroz de coliflor", "350 g"], ["Ajo", "2 dientes"], ["Limón", "1 unidad"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Dorar el pollo sazonado 12 minutos.", "Cocinar el brócoli al vapor.", "Saltear el arroz de coliflor con ajo 6 minutos.", "Armar el bowl y añadir limón."],
    prep: 12, cook: 20, protein: 46, carbs: 13, fat: 13, calories: 360, tags: ["pollo", "bowl", "coliflor"],
  },
  {
    id: "lc-co-13",
    name: "Pollo a la Mostaza con Champiñones",
    type: "dinner",
    description: "Pollo cremoso sin lácteos, ligado con mostaza y caldo.",
    ingredients: [["Pechuga de pollo", "400 g"], ["Champiñones", "250 g"], ["Mostaza", "1 cucharada"], ["Caldo de pollo", "150 ml"], ["Cebolla", "1/2 unidad"], ["Ajo", "1 diente"]],
    steps: ["Dorar el pollo y reservar.", "Saltear cebolla, ajo y champiñones.", "Agregar caldo y mostaza; devolver el pollo y cocinar 8 minutos."],
    prep: 10, cook: 22, protein: 45, carbs: 8, fat: 12, calories: 325, tags: ["pollo", "champiñones", "mostaza"],
  },
  {
    id: "lc-co-14",
    name: "Pollo al Horno con Romero y Verduras",
    type: "lunch",
    description: "Bandeja de pollo, calabacín, pimentón y cebolla con romero.",
    ingredients: [["Muslos de pollo sin piel", "500 g"], ["Calabacín", "2 unidades"], ["Pimentón", "1 unidad"], ["Cebolla", "1 unidad"], ["Romero", "2 ramas"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Calentar el horno a 200 °C.", "Cortar las verduras y ponerlas con el pollo en una bandeja.", "Sazonar con romero, sal y aceite.", "Hornear 35 minutos."],
    prep: 12, cook: 35, protein: 41, carbs: 12, fat: 17, calories: 365, tags: ["pollo", "horno", "bandeja"],
  },
  {
    id: "lc-co-15",
    name: "Pollo Desmechado con Repollo y Hogao",
    type: "dinner",
    description: "Salteado colombiano de pollo desmechado, repollo y hogao fresco.",
    ingredients: [["Pollo desmechado", "400 g"], ["Repollo", "300 g"], ["Tomate", "2 unidades"], ["Cebolla larga", "2 tallos"], ["Ajo", "1 diente"], ["Cilantro", "1/4 manojo"]],
    steps: ["Preparar hogao con tomate, cebolla y ajo.", "Agregar el repollo y cocinar 7 minutos.", "Incorporar el pollo, mezclar y calentar 5 minutos.", "Terminar con cilantro."],
    prep: 12, cook: 16, protein: 42, carbs: 11, fat: 10, calories: 315, tags: ["pollo", "repollo", "colombiana"],
  },
  {
    id: "lc-co-16",
    name: "Tilapia en Hogao con Calabacín",
    type: "lunch",
    description: "Filetes de tilapia cocidos en hogao y acompañados de calabacín.",
    ingredients: [["Tilapia en filetes", "400 g"], ["Calabacín", "2 unidades"], ["Tomate", "3 unidades"], ["Cebolla larga", "2 tallos"], ["Ajo", "1 diente"], ["Cilantro", "1/4 manojo"]],
    steps: ["Preparar un hogao con tomate, cebolla y ajo.", "Poner la tilapia sobre el hogao, tapar y cocinar 10 minutos.", "Saltear el calabacín 6 minutos y servir."],
    prep: 12, cook: 18, protein: 39, carbs: 10, fat: 9, calories: 285, tags: ["pescado", "tilapia", "hogao"],
  },
  {
    id: "lc-co-17",
    name: "Trucha al Ajo con Espinaca",
    type: "dinner",
    description: "Trucha a la plancha con espinaca salteada y limón.",
    ingredients: [["Trucha en filetes", "400 g"], ["Espinaca", "300 g"], ["Ajo", "3 dientes"], ["Limón", "1 unidad"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Sazonar la trucha.", "Cocinar en sartén 4 minutos por lado.", "Saltear espinaca y ajo 4 minutos.", "Servir con limón."],
    prep: 8, cook: 12, protein: 40, carbs: 5, fat: 18, calories: 345, tags: ["pescado", "trucha", "rápida"],
  },
  {
    id: "lc-co-18",
    name: "Ensalada de Atún y Vegetales",
    type: "dinner",
    description: "Atún con lechuga, pepino, tomate, pimentón y aguacate.",
    ingredients: [["Atún en agua", "2 latas"], ["Lechuga", "1 unidad"], ["Pepino cohombro", "1 unidad"], ["Tomate", "2 unidades"], ["Pimentón", "1/2 unidad"], ["Aguacate", "1 unidad"], ["Limón", "1 unidad"]],
    steps: ["Escurrir el atún.", "Lavar y cortar los vegetales.", "Mezclar todo con limón, sal y pimienta."],
    prep: 15, cook: 0, protein: 35, carbs: 11, fat: 18, calories: 345, tags: ["pescado", "atún", "sin-cocción"],
  },
  {
    id: "lc-co-19",
    name: "Aguacates Rellenos de Atún",
    type: "lunch",
    description: "Aguacate relleno de atún, tomate, pepino y limón.",
    ingredients: [["Atún en agua", "2 latas"], ["Aguacates", "2 unidades"], ["Tomate", "1 unidad"], ["Pepino cohombro", "1/2 unidad"], ["Cebolla", "1/4 unidad"], ["Limón", "1 unidad"]],
    steps: ["Escurrir el atún y mezclarlo con tomate, pepino, cebolla y limón.", "Partir los aguacates y retirar la semilla.", "Rellenar y servir de inmediato."],
    prep: 15, cook: 0, protein: 34, carbs: 13, fat: 24, calories: 410, tags: ["pescado", "atún", "aguacate"],
  },
  {
    id: "lc-co-20",
    name: "Salmón con Brócoli al Sartén",
    type: "lunch",
    description: "Salmón dorado y brócoli en una sola sartén.",
    ingredients: [["Salmón en filetes", "400 g"], ["Brócoli", "1 cabeza"], ["Ajo", "2 dientes"], ["Limón", "1 unidad"], ["Aceite de oliva", "1 cucharadita"]],
    steps: ["Cocinar el salmón 4 minutos por lado y reservar.", "Agregar brócoli, ajo y tres cucharadas de agua; tapar 6 minutos.", "Devolver el salmón y terminar con limón."],
    prep: 8, cook: 16, protein: 42, carbs: 8, fat: 22, calories: 405, tags: ["pescado", "salmón", "una-sartén"],
  },
  {
    id: "lc-co-21",
    name: "Pescado Blanco en Papillote con Verduras",
    type: "dinner",
    description: "Pescado blanco al horno en paquete con calabacín, tomate y pimentón.",
    ingredients: [["Pescado blanco en filetes", "400 g"], ["Calabacín", "1 unidad"], ["Tomate", "2 unidades"], ["Pimentón", "1/2 unidad"], ["Cebolla", "1/2 unidad"], ["Limón", "1 unidad"]],
    steps: ["Calentar el horno a 190 °C.", "Poner pescado y verduras sobre papel para hornear.", "Sazonar, cerrar los paquetes y hornear 18 minutos."],
    prep: 15, cook: 18, difficulty: "media", protein: 38, carbs: 10, fat: 8, calories: 275, tags: ["pescado", "horno", "verduras"],
  },
  {
    id: "lc-co-22",
    name: "Caldo de Pescado sin Yuca ni Papa",
    type: "dinner",
    description: "Caldo ligero con pescado, repollo, apio, tomate y cilantro.",
    ingredients: [["Pescado blanco", "450 g"], ["Repollo", "200 g"], ["Apio", "2 tallos"], ["Tomate", "2 unidades"], ["Cebolla larga", "2 tallos"], ["Ajo", "2 dientes"], ["Cilantro", "1/4 manojo"]],
    steps: ["Hervir 1,2 litros de agua con apio, cebolla, ajo y tomate durante 12 minutos.", "Agregar repollo y cocinar 6 minutos.", "Añadir el pescado y cocinar suavemente 8 minutos.", "Terminar con cilantro."],
    prep: 15, cook: 28, difficulty: "media", protein: 36, carbs: 9, fat: 7, calories: 255, tags: ["pescado", "caldo", "colombiana"],
  },
  {
    id: "lc-co-23",
    name: "Ceviche de Pescado con Pepino",
    type: "lunch",
    description: "Ceviche fresco de pescado con pepino, cebolla morada, tomate y limón.",
    ingredients: [["Pescado blanco muy fresco", "400 g"], ["Pepino cohombro", "1 unidad"], ["Tomate", "1 unidad"], ["Cebolla morada", "1/2 unidad"], ["Limón", "6 unidades"], ["Cilantro", "1/4 manojo"]],
    steps: ["Cortar el pescado en cubos y mantenerlo frío.", "Cubrir con limón y refrigerar 20 minutos.", "Agregar pepino, tomate, cebolla, cilantro y sal.", "Consumir el mismo día."],
    prep: 20, cook: 20, difficulty: "media", protein: 36, carbs: 8, fat: 4, calories: 220, tags: ["pescado", "ceviche", "frío"],
  },
  {
    id: "lc-co-24",
    name: "Tacos de Lechuga con Pescado",
    type: "dinner",
    description: "Pescado especiado servido en hojas de lechuga con repollo y pico de gallo.",
    ingredients: [["Pescado blanco en filetes", "400 g"], ["Lechuga", "1 unidad"], ["Repollo", "150 g"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Limón", "2 unidades"]],
    steps: ["Sazonar y dorar el pescado 4 minutos por lado.", "Mezclar repollo, tomate, cebolla y limón.", "Desmenuzar el pescado y servirlo en hojas de lechuga."],
    prep: 15, cook: 10, protein: 38, carbs: 9, fat: 8, calories: 275, tags: ["pescado", "lechuga", "rápida"],
  },
  {
    id: "lc-co-25",
    name: "Tilapia al Coco con Coliflor",
    type: "lunch",
    description: "Tilapia en salsa de coco y tomate con coliflor salteada.",
    ingredients: [["Tilapia en filetes", "400 g"], ["Coliflor", "1 pequeña"], ["Leche de coco", "200 ml"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Cilantro", "1/4 manojo"]],
    steps: ["Sofreír cebolla y tomate.", "Agregar leche de coco y cocinar 5 minutos.", "Añadir tilapia, tapar y cocinar 10 minutos.", "Saltear la coliflor y servir con cilantro."],
    prep: 15, cook: 22, difficulty: "media", protein: 37, carbs: 12, fat: 18, calories: 365, tags: ["pescado", "coco", "coliflor"],
  },
  {
    id: "lc-co-26",
    name: "Mojarra al Horno con Ensalada Criolla",
    type: "lunch",
    description: "Mojarra horneada, sin fritura, con tomate, pepino y cebolla.",
    ingredients: [["Mojarras limpias", "2 unidades"], ["Tomate", "2 unidades"], ["Pepino cohombro", "1 unidad"], ["Cebolla", "1/2 unidad"], ["Limón", "2 unidades"], ["Cilantro", "1/4 manojo"]],
    steps: ["Hacer cortes superficiales a la mojarra y sazonar.", "Hornear 25 minutos a 200 °C.", "Mezclar tomate, pepino, cebolla, limón y cilantro para la ensalada."],
    prep: 15, cook: 25, difficulty: "media", protein: 41, carbs: 8, fat: 12, calories: 330, tags: ["pescado", "mojarra", "horno"],
  },
  {
    id: "lc-co-27",
    name: "Pescado a la Mostaza con Espárragos",
    type: "dinner",
    description: "Filete de pescado a la mostaza con espárragos o habichuelas como alternativa local.",
    ingredients: [["Pescado blanco en filetes", "400 g"], ["Espárragos o habichuelas", "300 g"], ["Mostaza", "1 cucharada"], ["Limón", "1 unidad"], ["Ajo", "1 diente"], ["Aceite de oliva", "1 cucharada"]],
    steps: ["Untar el pescado con mostaza, ajo y limón.", "Cocinar 4 minutos por lado.", "Saltear espárragos o habichuelas 7 minutos y servir."],
    prep: 10, cook: 15, protein: 39, carbs: 8, fat: 11, calories: 300, tags: ["pescado", "mostaza", "rápida"],
  },
  {
    id: "lc-co-28",
    name: "Salmón con Ensalada de Pepino y Aguacate",
    type: "dinner",
    description: "Salmón a la plancha con ensalada fresca y saciante.",
    ingredients: [["Salmón en filetes", "400 g"], ["Pepino cohombro", "1 unidad"], ["Aguacate", "1 unidad"], ["Tomate", "2 unidades"], ["Limón", "1 unidad"], ["Cilantro", "1/4 manojo"]],
    steps: ["Cocinar el salmón 4 minutos por lado.", "Cortar pepino, aguacate y tomate.", "Mezclar la ensalada con limón y cilantro; servir con el salmón."],
    prep: 12, cook: 10, protein: 41, carbs: 10, fat: 27, calories: 455, tags: ["pescado", "salmón", "aguacate"],
  },
  {
    id: "lc-co-29",
    name: "Pescado al Curry de Coco y Espinaca",
    type: "lunch",
    description: "Pescado en salsa suave de coco, tomate, curry y espinaca, sin arroz.",
    ingredients: [["Pescado blanco", "400 g"], ["Espinaca", "250 g"], ["Leche de coco", "200 ml"], ["Tomate", "2 unidades"], ["Cebolla", "1/2 unidad"], ["Curry en polvo", "1 cucharada"]],
    steps: ["Sofreír cebolla, tomate y curry.", "Agregar leche de coco y cocinar 5 minutos.", "Añadir el pescado y cocinar 9 minutos.", "Incorporar la espinaca los últimos 3 minutos."],
    prep: 12, cook: 20, difficulty: "media", protein: 37, carbs: 9, fat: 19, calories: 365, tags: ["pescado", "curry", "espinaca"],
  },
  {
    id: "lc-co-30",
    name: "Pescado a la Plancha con Ratatouille Criollo",
    type: "dinner",
    description: "Pescado a la plancha con berenjena, calabacín, tomate y pimentón.",
    ingredients: [["Pescado blanco en filetes", "400 g"], ["Berenjena", "1 unidad"], ["Calabacín", "1 unidad"], ["Tomate", "2 unidades"], ["Pimentón", "1 unidad"], ["Ajo", "2 dientes"]],
    steps: ["Cortar los vegetales en cubos y saltearlos con ajo 15 minutos.", "Sazonar el pescado.", "Cocinarlo a la plancha 4 minutos por lado y servir con los vegetales."],
    prep: 15, cook: 20, protein: 38, carbs: 13, fat: 10, calories: 310, tags: ["pescado", "plancha", "vegetales"],
  },
];

export const lowCarbColombianRecipes: ExpandedRecipe[] = specs.map(
  createLowCarbRecipe,
);
