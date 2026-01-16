// Menú de 12 días (excluyendo domingos)
// El ciclo comienza el Lunes 6 de Enero 2026

export interface DayMenuData {
  day_number: number;
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
  reminder: string | null;
}

export const INITIAL_MENU: DayMenuData[] = [
  // SEMANA 1
  {
    day_number: 0, // Lunes S1
    breakfast_id: 'des1',
    lunch_id: 'alm1',
    dinner_id: 'cen1',
    reminder: 'Preparar: Hogao, Chimichurri, Tzatziki, Salsa Verde, Caldo'
  },
  {
    day_number: 1, // Martes S1
    breakfast_id: 'des2',
    lunch_id: 'alm2',
    dinner_id: 'cen2',
    reminder: 'Usar tzatziki preparado ayer'
  },
  {
    day_number: 2, // Miércoles S1
    breakfast_id: 'des3',
    lunch_id: 'alm3',
    dinner_id: 'cen3',
    reminder: 'Comprar champiñones suficientes para almuerzo Y cena. Preparar Arroz lote 2'
  },
  {
    day_number: 3, // Jueves S1
    breakfast_id: 'des4',
    lunch_id: 'alm4',
    dinner_id: 'cen4',
    reminder: null
  },
  {
    day_number: 4, // Viernes S1
    breakfast_id: 'des5',
    lunch_id: 'alm5',
    dinner_id: null, // Salen a comer
    reminder: 'Preparar Arroz lote 3. NO hay cena.'
  },
  {
    day_number: 5, // Sábado S1
    breakfast_id: 'des6',
    lunch_id: 'alm6',
    dinner_id: null, // Salen a comer
    reminder: 'NO hay cena. Desmechar pollo para el bowl.'
  },
  // Domingo S1 = día libre (no se incluye en el array)

  // SEMANA 2
  {
    day_number: 6, // Lunes S2
    breakfast_id: 'des7',
    lunch_id: 'alm7',
    dinner_id: 'cen5',
    reminder: 'Preparar batata EXTRA para mañana. Preparar bases de nuevo.'
  },
  {
    day_number: 7, // Martes S2
    breakfast_id: 'des1',
    lunch_id: 'alm8',
    dinner_id: 'cen6',
    reminder: 'Usar batata de ayer'
  },
  {
    day_number: 8, // Miércoles S2
    breakfast_id: 'des8',
    lunch_id: 'alm9',
    dinner_id: 'cen7',
    reminder: 'Preparar Arroz lote 2'
  },
  {
    day_number: 9, // Jueves S2
    breakfast_id: 'des3',
    lunch_id: 'alm10',
    dinner_id: 'cen8',
    reminder: 'Comprar kale fresco'
  },
  {
    day_number: 10, // Viernes S2
    breakfast_id: 'des2',
    lunch_id: 'alm11',
    dinner_id: null,
    reminder: 'Preparar Arroz lote 3. NO hay cena.'
  },
  {
    day_number: 11, // Sábado S2
    breakfast_id: 'des6',
    lunch_id: 'alm12',
    dinner_id: null,
    reminder: 'NO hay cena. Fin del ciclo - mañana reinicia!'
  }
  // Domingo S2 = día libre, luego reinicia ciclo
];

// Fecha de inicio del ciclo
export const CYCLE_START_DATE = new Date(2026, 0, 6); // Lunes 6 de Enero 2026
