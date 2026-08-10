/**
 * Imágenes editoriales aprobadas y versionadas con la aplicación.
 *
 * Estas rutas tienen prioridad sobre imágenes remotas o placeholders para que
 * la misma receta conserve una presentación fiel en todos los hogares.
 */
export const RECIPE_IMAGE_OVERRIDES: Readonly<Record<string, string>> = {
  "lc-co-01":
    "/images/recipes/pilot-2026-08/lc-co-01-pechuga-limon-brocoli.webp",
  "lc-co-03":
    "/images/recipes/pilot-2026-08/lc-co-03-pollo-cilantro-coliflor.webp",
  "lc-co-06":
    "/images/recipes/pilot-2026-08/lc-co-06-pimentones-pollo.webp",
  "lc-co-09":
    "/images/recipes/pilot-2026-08/lc-co-09-curry-pollo-espinaca.webp",
  "lc-co-16":
    "/images/recipes/pilot-2026-08/lc-co-16-tilapia-hogao-calabacin.webp",
  "lc-co-17":
    "/images/recipes/pilot-2026-08/lc-co-17-trucha-ajo-espinaca.webp",
  "lc-co-23":
    "/images/recipes/pilot-2026-08/lc-co-23-ceviche-pescado-pepino.webp",
  "lc-co-28":
    "/images/recipes/pilot-2026-08/lc-co-28-salmon-pepino-aguacate.webp",
  "reg-25": "/images/recipes/pilot-2026-08/reg-25-ajiaco-santafereno.webp",
  "reg-28":
    "/images/recipes/pilot-2026-08/reg-28-arepa-chocolo-quesito.webp",
  "tm6-01": "/images/recipes/pilot-2026-08/tm6-01-crema-ahuyama.webp",
  "int-09": "/images/recipes/pilot-2026-08/int-09-falafel-yogur.webp",
};

