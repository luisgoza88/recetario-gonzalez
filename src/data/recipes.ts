import { Recipe } from '@/types';

// Recetas iniciales del Recetario Familia González
export const INITIAL_RECIPES: Omit<Recipe, 'created_at' | 'updated_at'>[] = [
  // DESAYUNOS
  {
    id: 'des1',
    name: 'Bistec al Caballo con Aguacate',
    type: 'breakfast',
    portions: { luis: '280g bistec + 2 huevos + 1 aguacate entero + arepa peq', mariana: '150g bistec + 1-2 huevos + 1/2 aguacate + arepa med' },
    ingredients: [
      { name: 'Bistec de res', luis: '280g', mariana: '150g' },
      { name: 'Huevos fritos', luis: '2', mariana: '1-2' },
      { name: 'Hogao', luis: '60g', mariana: '40g' },
      { name: 'Aguacate', luis: '1 entero', mariana: '1/2' },
      { name: 'Arepa', luis: '1 pequeña', mariana: '1 mediana' }
    ],
    steps: ['Sartén muy caliente. Sellar bistec 3-4 min/lado.', 'Freír huevos con yema líquida.', 'Servir huevo ENCIMA del bistec, hogao y aguacate al lado.']
  },
  {
    id: 'des2',
    name: 'Huevos con Jamón, Queso y Champiñones',
    type: 'breakfast',
    portions: { luis: '2 huevos + 80g jamón + 80g champ + 50g queso', mariana: '2 huevos + 50g jamón + 60g champ + 40g queso' },
    ingredients: [
      { name: 'Huevos', luis: '2', mariana: '2' },
      { name: 'Jamón en cubos', luis: '80g', mariana: '50g' },
      { name: 'Champiñones', luis: '80g', mariana: '60g' },
      { name: 'Queso mozzarella', luis: '50g', mariana: '40g' },
      { name: 'Hogao + Aguacate', luis: '60g + 1/2', mariana: '40g + 1/2' }
    ],
    steps: ['Saltear champiñones 3 min.', 'Agregar jamón 2 min.', 'Agregar hogao.', 'Verter huevos batidos, revolver suave.', 'Agregar queso al final.']
  },
  {
    id: 'des3',
    name: 'Steak Chimichurri + Queso Costeño',
    type: 'breakfast',
    portions: { luis: '280g bistec + 2 huevos + 60g queso', mariana: '150g bistec + 1-2 huevos + 40g queso' },
    ingredients: [
      { name: 'Bistec de res', luis: '280g', mariana: '150g' },
      { name: 'Chimichurri', luis: '40ml', mariana: '30ml' },
      { name: 'Huevos', luis: '2', mariana: '1-2' },
      { name: 'Queso costeño', luis: '60g', mariana: '40g' },
      { name: 'Tomate + Arepa', luis: '1 med + peq', mariana: '1/2 + med' }
    ],
    steps: ['Cocinar steak 3-4 min/lado.', 'Huevos al gusto.', 'Servir con chimichurri encima y queso desmenuzado.']
  },
  {
    id: 'des4',
    name: 'Omelette Carne y Queso + Aguacate',
    type: 'breakfast',
    portions: { luis: '2 huevos + 100g carne + aguacate entero', mariana: '2 huevos + 60g carne + 1/2 aguacate' },
    ingredients: [
      { name: 'Huevos', luis: '2', mariana: '2' },
      { name: 'Carne molida', luis: '100g', mariana: '60g' },
      { name: 'Queso mozzarella', luis: '50g', mariana: '40g' },
      { name: 'Hogao', luis: '50g', mariana: '40g' },
      { name: 'Aguacate', luis: '1 entero', mariana: '1/2' }
    ],
    steps: ['Dorar carne con comino.', 'Hacer omelette a fuego bajo.', 'Rellenar con carne, hogao y queso.', 'Doblar. El aguacate compensa la proteína.']
  },
  {
    id: 'des5',
    name: 'Bistec Costra de Café + Tocineta',
    type: 'breakfast',
    portions: { luis: '280g bistec + 2 huevos + 3 tocinetas', mariana: '150g bistec + 1-2 huevos + 2 tocinetas' },
    ingredients: [
      { name: 'Bistec de res', luis: '280g', mariana: '150g' },
      { name: 'Costra de café', luis: '2 cdas', mariana: '1 cda' },
      { name: 'Huevos', luis: '2', mariana: '1-2' },
      { name: 'Tocineta', luis: '3 tiras', mariana: '2 tiras' },
      { name: 'Espárragos', luis: '150g', mariana: '100g' }
    ],
    steps: ['Costra: café + azúcar morena + paprika + sal.', 'Frotar sobre carne.', 'Dorar tocineta primero.', 'Cocinar bistec con costra.', 'Saltear espárragos en grasa de tocineta.']
  },
  {
    id: 'des6',
    name: 'Steak Ranchero + Salsa Criolla',
    type: 'breakfast',
    portions: { luis: '280g bistec + 2 huevos + 60g queso', mariana: '150g bistec + 1-2 huevos + 40g queso' },
    ingredients: [
      { name: 'Bistec de res', luis: '280g', mariana: '150g' },
      { name: 'Huevos fritos', luis: '2', mariana: '1-2' },
      { name: 'Queso cuajada', luis: '60g', mariana: '40g' },
      { name: 'Salsa criolla', luis: '1 porción', mariana: '1 porción' },
      { name: 'Aguacate + Arepa', luis: '1/2 + peq', mariana: '1/2 + med' }
    ],
    steps: ['Salsa criolla: tomate + cebolla morada + cilantro + limón. Reposar 10 min.', 'Cocinar steak.', 'Servir con huevos, salsa criolla y queso encima.']
  },
  {
    id: 'des7',
    name: 'Huevos Cremosos + Yogur',
    type: 'breakfast',
    portions: { luis: '2 huevos + 80g jamón + 100g yogur', mariana: '2 huevos + 50g jamón + 80g yogur' },
    ingredients: [
      { name: 'Huevos', luis: '2', mariana: '2' },
      { name: 'Jamón en tiras', luis: '80g', mariana: '50g' },
      { name: 'Queso crema', luis: '2 cdas', mariana: '1 cda' },
      { name: 'Yogur griego (al lado)', luis: '100g', mariana: '80g' },
      { name: 'Tomate cherry + Cebollín', luis: '6 + 1 cda', mariana: '4 + 1 cda' }
    ],
    steps: ['Batir huevos con queso crema.', 'Dorar jamón.', 'Agregar huevos, revolver a fuego bajo.', 'Servir con yogur al lado (proteína extra).']
  },
  {
    id: 'des8',
    name: 'Omelette de Vegetales con Jamón',
    type: 'breakfast',
    portions: { luis: '2 huevos + 60g jamón + vegetales + aguacate', mariana: '2 huevos + 40g jamón + vegetales + aguacate' },
    ingredients: [
      { name: 'Huevos', luis: '2', mariana: '2' },
      { name: 'Jamón en cubos', luis: '60g', mariana: '40g' },
      { name: 'Champiñones + Pimentón', luis: '60g + 1/2', mariana: '40g + 1/4' },
      { name: 'Cebolla + Espinaca', luis: '1/4 + 1 puño', mariana: '1/8 + 1/2' },
      { name: 'Queso + Aguacate', luis: '50g + 1/2', mariana: '40g + 1/2' }
    ],
    steps: ['Saltear vegetales y jamón 4 min.', 'Reservar.', 'Hacer omelette con 2 huevos.', 'Rellenar con vegetales y queso.', 'Servir con aguacate.']
  },

  // ALMUERZOS
  {
    id: 'alm1',
    name: 'Pollo con Salsa Verde de Aguacate',
    type: 'lunch',
    total: '1.3kg pechuga + 300ml salsa + 20 papas criollas',
    ingredients: [
      { name: 'Pechuga de pollo', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Salsa verde aguacate', total: '300ml', luis: '80ml', mariana: '60ml' },
      { name: 'Papa criolla dorada', total: '20 unid', luis: 'NO', mariana: '5 unid' },
      { name: 'Ensalada (hojas, manzana, nueces)', total: '---', luis: 'Grande', mariana: 'Normal' }
    ],
    steps: ['Aplanar pechugas. Salpimentar con comino.', 'Cocinar 5-6 min/lado. Cortar en láminas.', 'Papa criolla: hervir 15 min, dorar.', 'Servir con salsa verde en zigzag encima.']
  },
  {
    id: 'alm2',
    name: 'Albóndigas con Salsa de Yogur',
    type: 'lunch',
    total: '1kg carne molida + 300ml tzatziki',
    ingredients: [
      { name: 'Carne molida', total: '1 kg', luis: '250g (5-6 alb)', mariana: '150g (3-4 alb)' },
      { name: 'Cebolla + Ajo + Perejil', total: '1/2 + 3 + 3 cdas', luis: '---', mariana: '---' },
      { name: 'Huevo + Pan rallado', total: '1 + 3 cdas', luis: '---', mariana: '---' },
      { name: 'Salsa tzatziki', total: '300ml', luis: '80ml', mariana: '60ml' }
    ],
    steps: ['Mezclar carne + cebolla rallada + ajo + perejil + huevo + pan rallado + sal + comino.', 'Formar bolas tamaño pelota de golf.', 'Dorar 8-10 min por todos lados.', 'Servir con salsa tzatziki generosa.']
  },
  {
    id: 'alm3',
    name: 'Cerdo en Salsa de Champiñones',
    type: 'lunch',
    total: '1.2kg solomillo + 500g champiñones + crema',
    ingredients: [
      { name: 'Solomillo de cerdo', total: '1.2 kg', luis: '280g', mariana: '160g' },
      { name: 'Champiñones', total: '500g hoy', luis: '---', mariana: '---' },
      { name: 'Crema de leche + Caldo', total: '200ml + 1/2 taza', luis: '---', mariana: '---' },
      { name: 'Cebolla + Ajo + Tomillo', total: '1 + 3 + 1 cdita', luis: '---', mariana: '---' }
    ],
    steps: ['Cortar cerdo en medallones 2cm. Dorar 2-3 min/lado. Reservar.', 'Sofreír cebolla, ajo, champiñones 5 min.', 'Agregar caldo y crema. Cocinar 3 min.', 'Volver cerdo a la salsa 2 min.']
  },
  {
    id: 'alm4',
    name: 'Pollo Teriyaki con Vegetales',
    type: 'lunch',
    total: '1.3kg pechuga + 150ml teriyaki + vegetales',
    ingredients: [
      { name: 'Pechuga en cubos', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Salsa teriyaki', total: '150ml', luis: '---', mariana: '---' },
      { name: 'Brócoli + Pimentones', total: '400g + 4 unid', luis: '---', mariana: '---' },
      { name: 'Cebolla + Jengibre', total: '1 + 1 cda', luis: '---', mariana: '---' }
    ],
    steps: ['Dorar pollo en wok. Reservar.', 'Saltear cebolla y jengibre 1 min.', 'Agregar vegetales 3-4 min.', 'Volver pollo, agregar teriyaki. Glasear 2 min.']
  },
  {
    id: 'alm5',
    name: 'Bistec a la Criolla',
    type: 'lunch',
    total: '1.3kg bistec + hogao fresco',
    ingredients: [
      { name: 'Bistec de res', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Hogao (tomate + cebolla)', total: '4 tom + 2 ceb', luis: '---', mariana: '---' },
      { name: 'Arroz', total: '---', luis: '80g', mariana: '150g' },
      { name: 'Papa criolla', total: '---', luis: 'NO', mariana: '5 unid' }
    ],
    steps: ['Salpimentar bistecs con comino.', 'Sartén muy caliente. Dorar 3-4 min/lado. Reservar.', 'Hacer hogao rápido en la misma sartén.', 'Bañar bistecs con hogao.']
  },
  {
    id: 'alm6',
    name: 'Bowl Mexicano de Pollo',
    type: 'lunch',
    total: '1.5kg pechuga + guacamole + pico de gallo',
    ingredients: [
      { name: 'Pechuga para desmechar', total: '1.5 kg', luis: '280g', mariana: '160g' },
      { name: 'Guacamole (2 aguacates)', total: '300g', luis: '80g', mariana: '60g' },
      { name: 'Pico de gallo', total: '300g', luis: '---', mariana: '---' },
      { name: 'Papa al horno + Maíz', total: '8 unid + 2 latas', luis: 'NO', mariana: '2 unid' }
    ],
    steps: ['Pollo: Cocinar en caldo con especias 25 min. Desmechar.', 'Papa: Cubos con aceite y paprika. Hornear 200°C 25 min.', 'Guacamole: Machacar aguacate + tomate + cebolla + cilantro + limón.', 'Armar bowls: lechuga + pollo + guacamole + pico de gallo + papa + maíz.']
  },
  {
    id: 'alm7',
    name: 'Tilapia con Batata Asada',
    type: 'lunch',
    total: '1.2kg tilapia + 4 batatas grandes',
    ingredients: [
      { name: 'Filetes de tilapia', total: '1.2 kg', luis: '280g', mariana: '160g' },
      { name: 'Batata (8 grandes)', total: '4 hoy', luis: 'NO', mariana: '1 unid' },
      { name: 'Ensalada mixta', total: '---', luis: 'Grande', mariana: 'Normal' },
      { name: 'Limón', total: '2 unid', luis: '---', mariana: '---' }
    ],
    steps: ['Batata en cubos + aceite + paprika. Hornear 200°C 25-30 min.', 'GUARDAR batata extra para mañana almuerzo y cena.', 'Tilapia: salpimentar con paprika y ajo.', 'Cocinar 3-4 min/lado.']
  },
  {
    id: 'alm8',
    name: 'Bowl de Carne Molida con Batata',
    type: 'lunch',
    total: '1kg carne molida + batata de ayer',
    ingredients: [
      { name: 'Carne molida', total: '1 kg', luis: '250g', mariana: '150g' },
      { name: 'Batata de ayer', total: 'restante', luis: 'poca', mariana: '1 porc' },
      { name: 'Pimentones + Cebolla', total: '4 + 1', luis: '---', mariana: '---' },
      { name: 'Aguacate + Salsa yogur', total: '2 + 200ml', luis: '1/2 + 50ml', mariana: '1/2 + 40ml' }
    ],
    steps: ['Dorar carne en sartén, desmenuzando, 8-10 min.', 'Sazonar con comino, paprika, ajo en polvo.', 'Saltear pimentones y cebolla en julianas 5 min.', 'Recalentar batata de ayer.', 'Armar bowls.']
  },
  {
    id: 'alm9',
    name: 'Pollo con Jamón y Calabacín',
    type: 'lunch',
    total: '1.3kg pechuga + 200g jamón + 3 calabacines',
    ingredients: [
      { name: 'Pechuga en cubos', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Jamón en taquitos', total: '200g', luis: '---', mariana: '---' },
      { name: 'Calabacín en cubos', total: '3 medianos', luis: '---', mariana: '---' },
      { name: 'Hogao', total: '200g', luis: '---', mariana: '---' }
    ],
    steps: ['Dorar pollo, reservar.', 'Dorar jamón 2 min.', 'Agregar calabacín 4-5 min.', 'Agregar hogao y pollo. Mezclar 2-3 min.']
  },
  {
    id: 'alm10',
    name: 'Bistec con Puré y Ensalada de Kale',
    type: 'lunch',
    total: '1.3kg bistec + 8 papas + 1 manojo kale',
    ingredients: [
      { name: 'Bistec de res', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Papa para puré', total: '8 unid', luis: 'poco', mariana: 'normal' },
      { name: 'Kale/Col rizada', total: '1 manojo', luis: 'Grande', mariana: '---' },
      { name: 'Tomate cherry', total: '2 bandejas', luis: '---', mariana: '---' }
    ],
    steps: ['Puré: Hervir papa, hacer puré con leche y mantequilla.', 'Kale: Masajear con aceite y sal 2 min (suaviza).', 'Mezclar kale con tomate cherry y vinagreta.', 'Cocinar bistec 3-4 min/lado.']
  },
  {
    id: 'alm11',
    name: 'Pollo Glaseado BBQ',
    type: 'lunch',
    total: '1.3kg pechuga + salsa BBQ',
    ingredients: [
      { name: 'Pechuga de pollo', total: '1.3 kg', luis: '300g', mariana: '180g' },
      { name: 'Salsa BBQ', total: '1 frasco', luis: '---', mariana: '---' },
      { name: 'Ensalada', total: '---', luis: 'Grande', mariana: 'Normal' },
      { name: 'Arroz', total: '---', luis: '80g', mariana: '150g' }
    ],
    steps: ['Aplanar pechugas. Salpimentar.', 'Cocinar 5 min/lado.', 'Agregar salsa BBQ, cocinar 2-3 min bañando el pollo.', 'Cortar en láminas.']
  },
  {
    id: 'alm12',
    name: 'Bowl Estilo Big Mac',
    type: 'lunch',
    total: '1kg carne molida + lechuga + salsa especial',
    ingredients: [
      { name: 'Carne molida', total: '1 kg', luis: '250g', mariana: '150g' },
      { name: 'Lechuga iceberg + Tomate', total: '2 + 3', luis: '---', mariana: '---' },
      { name: 'Cebolla + Pepinillos', total: '1 + 1 frasco', luis: '---', mariana: '---' },
      { name: 'Papa al horno', total: '8 unid', luis: 'NO', mariana: '2 unid' }
    ],
    steps: ['Salsa Big Mac: 4 cdas mayo + 1 cda mostaza + 1 cda ketchup + 2 cdas pepinillos picados.', 'Papa: Cubos con aceite. Hornear 200°C 25 min.', 'Dorar carne suelta con sal, pimienta, cebolla en polvo.', 'Armar bowls: lechuga + carne + tomate + cebolla + papa + salsa.']
  },

  // CENAS
  {
    id: 'cen1',
    name: 'Salmón Teriyaki con Coliflor',
    type: 'dinner',
    ingredients: [
      { name: 'Filete de salmón', luis: '260g', mariana: '150g' },
      { name: 'Salsa teriyaki', luis: '40ml', mariana: '30ml' },
      { name: 'Coliflor', luis: '300g', mariana: '200g' },
      { name: 'Semillas de sésamo', luis: '1 cda', mariana: '1 cda' }
    ],
    steps: ['Coliflor: aceite + ajo polvo + sal. Hornear 200°C 25 min.', 'Salmón: 4 min/lado.', 'Agregar teriyaki al final para glasear.', 'Recalentar: HORNO 150°C 10 min (nunca microondas).']
  },
  {
    id: 'cen2',
    name: 'Lomo con Chimichurri',
    type: 'dinner',
    ingredients: [
      { name: 'Lomo de res', luis: '260g', mariana: '150g' },
      { name: 'Chimichurri', luis: '40ml', mariana: '30ml' },
      { name: 'Ensalada', luis: 'Grande', mariana: 'Normal' },
      { name: 'Papa criolla', luis: 'NO', mariana: '6 papitas' }
    ],
    steps: ['Sartén muy caliente. Cocinar 4 min/lado.', 'Reposar 5 min.', 'Cortar en láminas. Chimichurri ENCIMA.']
  },
  {
    id: 'cen3',
    name: 'Salmón Crema de Champiñones',
    type: 'dinner',
    ingredients: [
      { name: 'Filete de salmón', luis: '260g', mariana: '150g' },
      { name: 'Champiñones (restantes)', luis: '200g', mariana: '150g' },
      { name: 'Crema de leche', luis: '100ml', mariana: '80ml' },
      { name: 'Cebolla + Ajo + Tomillo', luis: '1/4 + 2 + 1/2 cdita', mariana: '---' }
    ],
    steps: ['Cocinar salmón 4 min/lado. Reservar.', 'Sofreír cebolla, ajo, champiñones.', 'Agregar crema y tomillo. Cocinar 3 min.', 'Servir salmón con crema al lado.']
  },
  {
    id: 'cen4',
    name: 'Salteado Lomo + Espárragos + Parmesano',
    type: 'dinner',
    ingredients: [
      { name: 'Lomo en cubos', luis: '260g', mariana: '150g' },
      { name: 'Espárragos', luis: '200g', mariana: '150g' },
      { name: 'Parmesano en lascas', luis: '30g', mariana: '20g' },
      { name: 'Cilantro fresco', luis: '2 cdas', mariana: '1 cda' }
    ],
    steps: ['Dorar lomo en cubos 3-4 min. Reservar.', 'Saltear espárragos con ajo 3-4 min.', 'Mezclar con lomo.', 'Servir con cilantro y parmesano encima.']
  },
  {
    id: 'cen5',
    name: 'Salmón con Tzatziki y Batata',
    type: 'dinner',
    ingredients: [
      { name: 'Filete de salmón', luis: '260g', mariana: '150g' },
      { name: 'Batata del almuerzo', luis: 'poca', mariana: '150g' },
      { name: 'Salsa tzatziki', luis: '60ml', mariana: '50ml' },
      { name: 'Aguacate', luis: '1/2', mariana: '1/2' }
    ],
    steps: ['Salmón: frotar con paprika y ajo en polvo.', 'Cocinar 4 min/lado.', 'Recalentar batata del almuerzo.', 'Servir con tzatziki y aguacate.']
  },
  {
    id: 'cen6',
    name: 'Lomo al Romero con Vegetales',
    type: 'dinner',
    ingredients: [
      { name: 'Lomo de res', luis: '260g', mariana: '150g' },
      { name: 'Romero + Ajo', luis: '2 ramitas + 3', mariana: '---' },
      { name: 'Zucchini + Pimentón', luis: '1 + 1', mariana: '1/2 + 1/2' },
      { name: 'Cebolla morada', luis: '1/2', mariana: '1/4' }
    ],
    steps: ['Marinar lomo con ajo + romero + aceite 30 min.', 'Vegetales: hornear 200°C 20 min.', 'Lomo: sartén caliente 4 min/lado.']
  },
  {
    id: 'cen7',
    name: 'Crispy Salmon Bowl',
    type: 'dinner',
    ingredients: [
      { name: 'Salmón en cubos', luis: '260g', mariana: '150g' },
      { name: 'Salsa teriyaki + miel', luis: '50ml', mariana: '40ml' },
      { name: 'Arroz (opcional)', luis: '80g', mariana: '150g' },
      { name: 'Zanahoria + Aguacate + Sésamo', luis: '100g + 1/2 + 1 cda', mariana: '80g + 1/2 + 1 cda' }
    ],
    steps: ['Cortar salmón en cubos.', 'Dorar 2 min/lado (que quede jugoso).', 'Glasear con teriyaki + miel 1 min.', 'Armar bowl: arroz + zanahoria + aguacate + salmón + sésamo.']
  },
  {
    id: 'cen8',
    name: 'Lomo con Salsa de Champiñones',
    type: 'dinner',
    ingredients: [
      { name: 'Lomo de res', luis: '260g', mariana: '150g' },
      { name: 'Champiñones', luis: '200g', mariana: '150g' },
      { name: 'Crema de leche', luis: '100ml', mariana: '80ml' },
      { name: 'Cebolla + Ajo + Tomillo', luis: '1/4 + 2 + 1/2 cdita', mariana: '---' }
    ],
    steps: ['Salpimentar lomo. Cocinar 4 min/lado. Reservar tapado.', 'Sofreír cebolla 3 min.', 'Agregar ajo y champiñones. Cocinar 5 min.', 'Agregar crema y tomillo. Cocinar 3 min.', 'Cortar lomo en medallones. Servir con salsa.']
  }
];
