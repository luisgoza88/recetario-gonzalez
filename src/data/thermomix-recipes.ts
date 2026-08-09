import type { ThermomixRecipe } from "@/types";

/**
 * Biblioteca de recetas pre-adaptadas para Thermomix TM6
 * Todas probadas con tiempos reales y accesorios correctos.
 * Porciones: 5 (Luis 3, Mariana 2)
 */
export const THERMOMIX_LIBRARY: ThermomixRecipe[] = [
  // =====================================================
  // 1. Hogao TM6
  // =====================================================
  {
    name: "Hogao TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Pelar y partir en cuartos 4 tomates grandes y 2 cebollas",
        speed: "0",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Preparación manual previa",
      },
      {
        stepNumber: 2,
        description:
          "Agregar tomates, cebollas y 3 dientes de ajo al vaso. Triturar",
        speed: "5",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Velocidad progresiva: empezar en 3 y subir a 5",
      },
      {
        stepNumber: 3,
        description:
          "Agregar 3 cucharadas de aceite, comino, sal y pimienta. Sofreír en giro inverso",
        speed: "Spátula",
        temperature: "120°C",
        time: "12 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Giro inverso evita triturar más, solo sofríe",
      },
      {
        stepNumber: 4,
        description: "Agregar cilantro picado, mezclar 10 segundos y servir",
        speed: "3",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 15,
    manualTimeMinutes: 30,
    timeSaved: "Ahorra 15 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "El giro inverso (Spátula) es clave para no convertirlo en puré",
      "Puedes duplicar la receta y congelar porciones",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 2. Arroz en Thermomix
  // =====================================================
  {
    name: "Arroz Blanco TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 500g de arroz, 750ml de agua, 1 cucharada de aceite, sal al gusto",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description: "Cocinar a temperatura Varoma en giro inverso",
        speed: "Spátula",
        temperature: "Varoma",
        time: "12 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "NO usar velocidades altas - arruina los granos",
      },
      {
        stepNumber: 3,
        description: "Bajar temperatura y terminar cocción suave",
        speed: "Spátula",
        temperature: "90°C",
        time: "10 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Sin abrir la tapa para que el vapor cocine",
      },
      {
        stepNumber: 4,
        description: "Dejar reposar 5 minutos con la tapa puesta y servir",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "5 min",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 27,
    manualTimeMinutes: 25,
    timeSaved: "Similar tiempo",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Proporción: 1.5 de agua por 1 de arroz",
      "NO abrir la tapa durante la cocción",
      "Puedes agregar ajo o cúrcuma al inicio",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 3. Crema de Verduras
  // =====================================================
  {
    name: "Crema de Verduras TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Pelar y trocear: 2 zanahorias, 1 calabacín, 2 papas, 1 puerro",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description:
          "Agregar 2 cucharadas de aceite de oliva y la parte blanca del puerro. Sofreír",
        speed: "4",
        temperature: "120°C",
        time: "4 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description:
          "Agregar zanahoria, calabacín, papas, 800ml de caldo y sal",
        speed: "Spátula",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Los trozos pueden ser grandes, se van a triturar",
      },
      {
        stepNumber: 4,
        description: "Triturar progresivamente hasta obtener crema suave",
        speed: "7",
        temperature: "Sin temp",
        time: "1 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Subir velocidad gradualmente: 5→7→9 para mejor textura",
      },
      {
        stepNumber: 5,
        description: "Agregar 100ml de crema de leche, sal y pimienta. Mezclar",
        speed: "3",
        temperature: "90°C",
        time: "2 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 30,
    manualTimeMinutes: 50,
    timeSaved: "Ahorra 20 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Añade queso parmesano rallado al servir",
      "Perfecta para llevar en termo al trabajo",
      "Se puede congelar hasta 3 meses",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 4. Salsa Bolognesa
  // =====================================================
  {
    name: "Salsa Bolognesa TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Triturar 1 cebolla, 1 zanahoria, 1 tallo de apio y 2 dientes de ajo",
        speed: "7",
        temperature: "Sin temp",
        time: "7 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Agregar 40g de aceite de oliva. Sofreír las verduras",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Agregar 500g de carne molida. Cocinar en giro inverso",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Giro inverso para no desmenuzar la carne",
      },
      {
        stepNumber: 4,
        description:
          "Agregar 400g de tomate triturado, 200ml de vino tinto, orégano, sal, pimienta y una pizca de azúcar",
        speed: "Spátula",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Rectificar sazón y servir sobre pasta",
        speed: "2",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 33,
    manualTimeMinutes: 55,
    timeSaved: "Ahorra 22 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "El vino se puede omitir, reemplazar por caldo",
      "Se congela perfecto en porciones individuales",
      "Agregar albahaca fresca al servir",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 5. Risotto
  // =====================================================
  {
    name: "Risotto Cremoso TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Triturar 1 cebolla y 2 dientes de ajo",
        speed: "5",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Sofreír con 30g de mantequilla",
        speed: "Spátula",
        temperature: "120°C",
        time: "3 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Agregar 400g de arroz arborio. Nacarar",
        speed: "Spátula",
        temperature: "120°C",
        time: "2 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Nacarar = tostar ligeramente el arroz",
      },
      {
        stepNumber: 4,
        description: "Agregar 100ml de vino blanco. Evaporar",
        speed: "Spátula",
        temperature: "100°C",
        time: "2 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Agregar 900ml de caldo caliente. Cocinar en giro inverso",
        speed: "Spátula",
        temperature: "100°C",
        time: "18 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "NO abrir la tapa durante la cocción",
      },
      {
        stepNumber: 6,
        description:
          "Agregar 80g de queso parmesano rallado y 20g de mantequilla. Mantecar",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "30 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Mantecar = mezclar para hacer cremoso",
      },
    ],
    totalTimeMinutes: 28,
    manualTimeMinutes: 45,
    timeSaved: "Ahorra 17 min",
    difficulty: "media",
    accessories: ["Cuchilla"],
    tips: [
      'El risotto perfecto tiene textura "all\'onda" (fluida)',
      "Puedes agregar hongos, pollo o camarones",
      "No usar arroz normal, debe ser arborio o carnaroli",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 6. Masa para Arepas
  // =====================================================
  {
    name: "Masa para Arepas TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 500g de harina de maíz precocida, 600ml de agua tibia, 1 cucharadita de sal y 20g de mantequilla",
        speed: "6",
        temperature: "Sin temp",
        time: "30 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Amasar hasta obtener masa homogénea sin grumos",
        speed: "4",
        temperature: "Sin temp",
        time: "1 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Si queda seca agregar agua de a cucharadas",
      },
      {
        stepNumber: 3,
        description: "Dejar reposar 5 minutos. Armar las arepas con las manos",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "5 min",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Mojar las manos para que no se pegue",
      },
    ],
    totalTimeMinutes: 8,
    manualTimeMinutes: 15,
    timeSaved: "Ahorra 7 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Con agua tibia la masa queda más suave",
      "Puedes agregar queso rallado a la masa",
      "Rinde aproximadamente 10-12 arepas medianas",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 7. Sopa de Lentejas
  // =====================================================
  {
    name: "Sopa de Lentejas TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Triturar 1 cebolla, 2 dientes de ajo, 1 zanahoria",
        speed: "5",
        temperature: "Sin temp",
        time: "7 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Agregar 30ml de aceite. Sofreír",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description:
          "Agregar 300g de lentejas (lavadas), 1 papa en cubos, 1L de agua, comino, sal y pimienta",
        speed: "Spátula",
        temperature: "100°C",
        time: "25 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Las lentejas no necesitan remojo previo",
      },
      {
        stepNumber: 4,
        description:
          "Verificar que las lentejas estén blandas. Si no, cocinar 5 min más",
        speed: "Spátula",
        temperature: "100°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Agregar cilantro y ajustar sazón",
        speed: "2",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 38,
    manualTimeMinutes: 50,
    timeSaved: "Ahorra 12 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Si quieres más espesa, tritura la mitad en vel 5 por 15 seg",
      "Perfecta con arroz blanco al lado",
      "Rinde para 2 días fácilmente",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 8. Pollo al Vapor (Varoma)
  // =====================================================
  {
    name: "Pollo al Vapor con Verduras TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Marinar 800g de pechuga de pollo con limón, ajo, sal, pimienta y hierbas",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Si tiene tiempo, marinar 30 min antes",
      },
      {
        stepNumber: 2,
        description: "Agregar 1L de agua al vaso con sal y hierbas aromáticas",
        speed: "1",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description:
          "Colocar el pollo en la bandeja inferior del Varoma. Verduras (brócoli, zanahoria, papa) en la bandeja superior",
        speed: "Spátula",
        temperature: "Varoma",
        time: "30 min",
        accessory: "varoma",
        accessoryEmoji: "🫕",
        tip: "No llenar demasiado para que circule el vapor",
      },
      {
        stepNumber: 4,
        description:
          "Verificar que el pollo esté cocido (sin rosa por dentro). Si no, 5 min más",
        speed: "Spátula",
        temperature: "Varoma",
        time: "5 min",
        accessory: "varoma",
        accessoryEmoji: "🫕",
      },
      {
        stepNumber: 5,
        description:
          "Retirar Varoma con cuidado (caliente). El caldo del vaso sirve como sopa base",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Cuidado con el vapor al abrir",
      },
    ],
    totalTimeMinutes: 38,
    manualTimeMinutes: 50,
    timeSaved: "Ahorra 12 min",
    difficulty: "fácil",
    accessories: ["Cuchilla", "Varoma"],
    tips: [
      "El caldo que queda en el vaso es perfecto para sopa",
      "Cocinar pollo y arroz simultáneamente: arroz en cestillo dentro del vaso",
      "Las verduras quedan con todos sus nutrientes al vapor",
    ],
    vasoPrincipal: true,
    varoma: true,
    cestillo: false,
  },

  // =====================================================
  // 9. Bizcocho / Torta Básica
  // =====================================================
  {
    name: "Bizcocho Esponjoso TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Precalentar horno a 180°C. Engrasar molde",
        speed: "0",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description: "Agregar 4 huevos y 200g de azúcar. Batir",
        speed: "4",
        temperature: "Sin temp",
        time: "5 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "La mariposa incorpora aire para esponjar",
      },
      {
        stepNumber: 3,
        description:
          "Agregar 250g de harina, 1 sobre de polvo para hornear y 125ml de aceite",
        speed: "3",
        temperature: "Sin temp",
        time: "20 seg",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "Mezclar poco para no perder el aire",
      },
      {
        stepNumber: 4,
        description:
          "Agregar ralladura de limón o vainilla. Mezclar suavemente",
        speed: "2",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
      },
      {
        stepNumber: 5,
        description:
          "Retirar la mariposa. Verter en molde y hornear 35-40 minutos. Pinchar con palillo para verificar",
        speed: "0",
        temperature: "Sin temp",
        time: "40 min",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Si sale limpio el palillo, está listo",
      },
    ],
    totalTimeMinutes: 50,
    manualTimeMinutes: 60,
    timeSaved: "Ahorra 10 min",
    difficulty: "fácil",
    accessories: ["Mariposa"],
    tips: [
      "No abrir el horno los primeros 20 minutos",
      "Se puede hacer de chocolate agregando 30g de cacao",
      "Lavar el vaso inmediatamente después de verter la mezcla",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 10. Salsa de Tomate Casera
  // =====================================================
  {
    name: "Salsa de Tomate Casera TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Agregar 1kg de tomates maduros cortados en cuartos",
        speed: "5",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description:
          "Agregar 1 cebolla, 2 dientes de ajo, albahaca fresca y 30ml de aceite de oliva",
        speed: "5",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Cocinar la salsa a fuego medio",
        speed: "Spátula",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 4,
        description:
          "Agregar sal, pimienta y una pizca de azúcar. Triturar hasta textura deseada",
        speed: "7",
        temperature: "Sin temp",
        time: "30 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Menos tiempo = más rústica. Más tiempo = más fina",
      },
    ],
    totalTimeMinutes: 25,
    manualTimeMinutes: 40,
    timeSaved: "Ahorra 15 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Se congela perfecto en cubetas de hielo para porciones pequeñas",
      "Agregar zanahoria rallada la hace más dulce naturalmente",
      "Rinde para 4-5 porciones de pasta",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 11. Crema de Auyama (Zapallo)
  // =====================================================
  {
    name: "Crema de Auyama TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Pelar y trocear 600g de auyama/zapallo",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description: "Sofreír 1 cebolla troceada con 30ml de aceite",
        speed: "Spátula",
        temperature: "120°C",
        time: "4 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Agregar auyama, 700ml de caldo, sal, nuez moscada",
        speed: "Spátula",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 4,
        description: "Triturar hasta obtener crema suave",
        speed: "9",
        temperature: "Sin temp",
        time: "1 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Agregar 100ml de crema de leche, rectificar sazón",
        speed: "3",
        temperature: "80°C",
        time: "2 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 30,
    manualTimeMinutes: 45,
    timeSaved: "Ahorra 15 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "La nuez moscada es el secreto",
      "Servir con semillas de calabaza tostadas",
      "Perfecta para niños — dulce naturalmente",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 12. Arroz con Pollo
  // =====================================================
  {
    name: "Arroz con Pollo TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Triturar 1 cebolla, 2 dientes de ajo, 1 zanahoria y pimentón",
        speed: "5",
        temperature: "Sin temp",
        time: "7 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Agregar 30ml de aceite. Sofreír el sofrito",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Agregar 400g de pollo deshuesado en trozos. Sellar",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 4,
        description:
          "Agregar 400g de arroz, 700ml de caldo, color, comino, sal, pimienta",
        speed: "Spátula",
        temperature: "Varoma",
        time: "12 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Bajar temperatura para terminar cocción",
        speed: "Spátula",
        temperature: "90°C",
        time: "10 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "No destapear — el vapor cocina el arroz",
      },
      {
        stepNumber: 6,
        description: "Dejar reposar 5 min, esponjar con tenedor y servir",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "5 min",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 40,
    manualTimeMinutes: 55,
    timeSaved: "Ahorra 15 min",
    difficulty: "media",
    accessories: ["Cuchilla"],
    tips: [
      "Agregar arvejas y maíz al paso 4 para versión completa",
      "No mezclar una vez agregado el arroz",
      "El color (achiote) le da el tono amarillo tradicional",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 13. Smoothie / Batido Energético
  // =====================================================
  {
    name: "Smoothie Energético TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 2 bananos, 200g de fresas, 200ml de leche y 100g de yogurt",
        speed: "5",
        temperature: "Sin temp",
        time: "15 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description:
          "Agregar 1 cucharada de miel, avena y hielo. Triturar a máxima velocidad",
        speed: "10",
        temperature: "Sin temp",
        time: "30 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "El hielo va al final para no salpicar",
      },
      {
        stepNumber: 3,
        description: "Servir inmediatamente en vasos fríos",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 3,
    manualTimeMinutes: 8,
    timeSaved: "Ahorra 5 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Congelar la fruta la noche anterior para smoothie más espeso",
      "Agregar espinaca para versión verde (no cambia el sabor)",
      "Perfecto como desayuno rápido",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 14. Fríjoles / Caraotas
  // =====================================================
  {
    name: "Fríjoles Rojos TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Remojar 500g de fríjoles la noche anterior (8 horas mínimo)",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "El remojo es OBLIGATORIO",
      },
      {
        stepNumber: 2,
        description: "Triturar 1 cebolla, 2 tomates, 3 dientes de ajo",
        speed: "5",
        temperature: "Sin temp",
        time: "7 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Sofreír con 30ml de aceite, comino y color",
        speed: "Spátula",
        temperature: "120°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 4,
        description: "Agregar fríjoles escurridos y 1.2L de agua",
        speed: "Spátula",
        temperature: "100°C",
        time: "45 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Puede tomar más tiempo según el fríjol",
      },
      {
        stepNumber: 5,
        description:
          "Verificar que estén blandos. Agregar plátano verde rallado para espesar, sal",
        speed: "Spátula",
        temperature: "100°C",
        time: "10 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 65,
    manualTimeMinutes: 90,
    timeSaved: "Ahorra 25 min",
    difficulty: "media",
    accessories: ["Cuchilla"],
    tips: [
      "El plátano verde rallado espesa el caldo naturalmente",
      "No agregar sal hasta que estén blandos",
      "Rinden para 2-3 días, mejoran con el tiempo",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 15. Pescado al Vapor con Varoma
  // =====================================================
  {
    name: "Pescado al Vapor con Limón TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Marinar 4 filetes de pescado con limón, ajo, sal, pimienta y cilantro",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description: "Agregar 1L de agua al vaso con hierbas aromáticas",
        speed: "1",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description:
          "Colocar filetes de pescado en Varoma con rodajas de limón encima",
        speed: "Spátula",
        temperature: "Varoma",
        time: "20 min",
        accessory: "varoma",
        accessoryEmoji: "🫕",
        tip: "No superponer los filetes",
      },
      {
        stepNumber: 4,
        description:
          "Verificar cocción (se deshace fácilmente con tenedor). Servir con su jugo",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 25,
    manualTimeMinutes: 35,
    timeSaved: "Ahorra 10 min",
    difficulty: "fácil",
    accessories: ["Cuchilla", "Varoma"],
    tips: [
      "Cocinar verduras en la bandeja de abajo simultáneamente",
      "El pescado al vapor conserva todos los omega-3",
      "Servir con arroz blanco y ensalada",
    ],
    vasoPrincipal: true,
    varoma: true,
    cestillo: false,
  },

  // =====================================================
  // 16. Pandebono / Pan de Queso
  // =====================================================
  {
    name: "Pandebono TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Precalentar horno a 200°C",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
      {
        stepNumber: 2,
        description: "Rallar 250g de queso costeño en el vaso",
        speed: "7",
        temperature: "Sin temp",
        time: "10 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description:
          "Agregar 250g de almidón de yuca, 100g de harina de maíz, 1 huevo, 80ml de leche",
        speed: "6",
        temperature: "Sin temp",
        time: "30 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 4,
        description: "Amasar hasta obtener masa suave y moldeable",
        speed: "4",
        temperature: "Sin temp",
        time: "1 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Debe quedar suave pero no pegajosa",
      },
      {
        stepNumber: 5,
        description:
          "Formar bolitas, colocar en bandeja y hornear 15-20 minutos hasta dorar",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "20 min",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 25,
    manualTimeMinutes: 35,
    timeSaved: "Ahorra 10 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "El queso costeño es clave — no sustituir por mozzarella",
      "Rinde unos 15 pandebonos",
      "Se pueden congelar crudos y hornear directo",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 17. Sancocho Básico
  // =====================================================
  {
    name: "Caldo Base para Sancocho TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Triturar 2 tallos de cebolla larga, 3 dientes de ajo, cilantro",
        speed: "5",
        temperature: "Sin temp",
        time: "7 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description:
          "Agregar 2L de agua (máximo), 500g de pollo con hueso, sal, comino",
        speed: "Spátula",
        temperature: "100°C",
        time: "25 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "El hueso le da sabor al caldo",
      },
      {
        stepNumber: 3,
        description:
          "Mientras cocina en el vaso: cocinar papa, yuca y plátano cortados en Varoma",
        speed: "Spátula",
        temperature: "Varoma",
        time: "25 min",
        accessory: "varoma",
        accessoryEmoji: "🫕",
        tip: "Cortar los tubérculos en trozos medianos",
      },
      {
        stepNumber: 4,
        description:
          "Retirar Varoma. Agregar mazorca troceada al caldo si cabe",
        speed: "Spátula",
        temperature: "100°C",
        time: "10 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description:
          "Servir el pollo y verduras del Varoma en platos. Añadir caldo",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 40,
    manualTimeMinutes: 70,
    timeSaved: "Ahorra 30 min",
    difficulty: "media",
    accessories: ["Cuchilla", "Varoma"],
    tips: [
      "El vaso de 2.2L limita la cantidad — este es un sancocho para 5 porciones",
      "Servir con arroz blanco, aguacate y ají",
      "El Varoma cocina todo simultáneamente ahorrando mucho tiempo",
    ],
    vasoPrincipal: true,
    varoma: true,
    cestillo: false,
  },

  // =====================================================
  // 18. Limonada de Coco
  // =====================================================
  {
    name: "Limonada de Coco TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 200ml de leche de coco, jugo de 6 limones, 100g de azúcar y 600ml de agua fría",
        speed: "5",
        temperature: "Sin temp",
        time: "15 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 2,
        description: "Agregar hielo abundante y mezclar",
        speed: "10",
        temperature: "Sin temp",
        time: "20 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Vel 10 tritura el hielo perfecto",
      },
      {
        stepNumber: 3,
        description: "Probar y ajustar dulce/ácido. Servir inmediatamente",
        speed: "3",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
    ],
    totalTimeMinutes: 3,
    manualTimeMinutes: 10,
    timeSaved: "Ahorra 7 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Usar limones mandarina para versión más dulce",
      "Servir con rodaja de limón y coco rallado",
      "Rinde 5 vasos generosos",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 19. Huevos Revueltos Cremosos
  // =====================================================
  {
    name: "Huevos Revueltos Cremosos TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Agregar 8 huevos, 50ml de leche, sal y pimienta",
        speed: "4",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
      },
      {
        stepNumber: 2,
        description: "Cocinar a temperatura baja con mariposa",
        speed: "2",
        temperature: "80°C",
        time: "8 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "La mariposa mantiene los huevos cremosos sin triturar",
      },
      {
        stepNumber: 3,
        description: "Cuando empiecen a cuajar, agregar 20g de mantequilla",
        speed: "2",
        temperature: "80°C",
        time: "2 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "Sacar 30 seg ANTES de que estén al punto — siguen cocinándose",
      },
    ],
    totalTimeMinutes: 12,
    manualTimeMinutes: 15,
    timeSaved: "Ahorra 3 min",
    difficulty: "fácil",
    accessories: ["Mariposa"],
    tips: [
      "El secreto: temperatura baja y paciencia",
      "Agregar cebollín picado al final",
      "Servir sobre arepa con hogao",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 20. Mermelada Express
  // =====================================================
  {
    name: "Mermelada Express TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 500g de fruta (fresas, moras, mango) cortada en trozos",
        speed: "4",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Dejar algunos trozos para textura rústica",
      },
      {
        stepNumber: 2,
        description: "Agregar 250g de azúcar y jugo de 1 limón",
        speed: "3",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 3,
        description: "Cocinar destapado para que evapore",
        speed: "Spátula",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        tip: "Sin la tapa del orificio para que evapore agua",
      },
      {
        stepNumber: 4,
        description:
          "Verificar consistencia: debe espesar al enfriar. Si está líquida, 5 min más",
        speed: "Spátula",
        temperature: "100°C",
        time: "5 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
      },
      {
        stepNumber: 5,
        description: "Verter en frasco de vidrio esterilizado. Tapar y voltear",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
        tip: "Voltear el frasco caliente crea vacío — dura meses",
      },
    ],
    totalTimeMinutes: 30,
    manualTimeMinutes: 50,
    timeSaved: "Ahorra 20 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [
      "Proporción: mitad de azúcar del peso de la fruta",
      "El limón ayuda a gelificar",
      "Se conserva 3+ meses en nevera una vez abierta",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },

  // =====================================================
  // 21. Natilla Colombiana
  // =====================================================
  {
    name: "Natilla Colombiana TM6",
    thermomixSteps: [
      {
        stepNumber: 1,
        description:
          "Agregar 1L de leche, 200g de panela rallada, canela en rama y clavos",
        speed: "4",
        temperature: "90°C",
        time: "10 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "La mariposa evita que se pegue",
      },
      {
        stepNumber: 2,
        description:
          "Disolver 120g de maicena en 200ml de leche fría. Agregar al vaso",
        speed: "3",
        temperature: "90°C",
        time: "10 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
        tip: "No dejar de mezclar para evitar grumos",
      },
      {
        stepNumber: 3,
        description: "Subir velocidad cuando espese para evitar grumos",
        speed: "4",
        temperature: "90°C",
        time: "5 min",
        accessory: "mariposa",
        accessoryEmoji: "🦋",
      },
      {
        stepNumber: 4,
        description:
          "Retirar canela y clavos. Verter en molde y refrigerar 4 horas",
        speed: "Spátula",
        temperature: "Sin temp",
        time: "0 seg",
        accessory: "ninguno",
        accessoryEmoji: "✋",
      },
    ],
    totalTimeMinutes: 28,
    manualTimeMinutes: 45,
    timeSaved: "Ahorra 17 min",
    difficulty: "media",
    accessories: ["Mariposa"],
    tips: [
      "La Thermomix evita el dolor de brazo de mezclar natilla",
      "Usar panela buena — el sabor depende de ella",
      "Decorar con coco rallado al servir",
    ],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
  },
];

/**
 * Busca recetas pre-adaptadas por nombre (coincidencia parcial)
 */
export function findThermomixRecipe(name: string): ThermomixRecipe | undefined {
  const lower = name.toLowerCase();
  return THERMOMIX_LIBRARY.find(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      lower.includes(
        r.name.toLowerCase().replace(" tm6", "").replace(" thermomix", ""),
      ),
  );
}

/**
 * Busca recetas Thermomix por accesorio
 */
export function findByAccessory(accessory: string): ThermomixRecipe[] {
  return THERMOMIX_LIBRARY.filter((r) =>
    r.accessories.some((a) => a.toLowerCase() === accessory.toLowerCase()),
  );
}

/**
 * Recetas Thermomix por dificultad
 */
export function findByDifficulty(
  difficulty: "fácil" | "media" | "avanzada",
): ThermomixRecipe[] {
  return THERMOMIX_LIBRARY.filter((r) => r.difficulty === difficulty);
}
