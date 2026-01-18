// =====================================================
// CRONOGRAMA COMPLETO - 4 SEMANAS
// Basado en Manual de Operaciones Familia González
// =====================================================

export interface ScheduleTask {
  timeStart: string; // HH:MM
  timeEnd: string;
  taskName: string;
  description?: string;
  isSpecial: boolean;
  category: 'cocina' | 'limpieza' | 'lavanderia' | 'perros' | 'piscina' | 'jardin' | 'vehiculos' | 'general';
}

export interface DaySchedule {
  dayOfWeek: number; // 1=lunes, 2=martes, ..., 6=sábado
  tasks: ScheduleTask[];
}

export interface WeekSchedule {
  weekNumber: number; // 1-4
  days: DaySchedule[];
}

// =====================================================
// CRONOGRAMA YOLIMA - 4 SEMANAS
// =====================================================

export const YOLIMA_SCHEDULE: WeekSchedule[] = [
  // ═══ SEMANA 1 ═══
  {
    weekNumber: 1,
    days: [
      // LUNES - Semana 1
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Dar comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger TODA la ropa sucia, separar, poner lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Tender camas, organizar habitación principal, limpiar baño', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Tender ropa lavada, poner segunda carga', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + dejar cena lista', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Dar comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo Yolima', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza almuerzo, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: 'Barrer y trapear primer piso completo', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:00', taskName: 'Tender/recoger ropa, doblar', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:00', timeEnd: '15:30', taskName: 'Organizar cuarto de ropas', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Guardar ropa en habitaciones', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Dar comida #3 perros, revisión final cocina', isSpecial: false, category: 'perros' },
        ]
      },
      // MARTES - Semana 1
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno según menú', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa sucia, poner lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:30', taskName: 'LIMPIEZA PROFUNDA habitación principal', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:00', taskName: 'Limpiar oficina Mariana + baño oficina', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Limpiar sala de TV segundo piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Limpiar terraza/gimnasio, limpiar máquinas', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Trapear segundo piso completo', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/recoger ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MIÉRCOLES - Semana 1
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'LIMPIEZA PROFUNDA sala: muebles, cojines, tapete fique', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar comedor: pulir mesa, limpiar sillas', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Limpiar baño de visitantes profundo', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '15:00', taskName: 'Barrer y trapear primer piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // JUEVES - Semana 1
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'CAMBIAR SÁBANAS habitación + CAMBIAR TOALLAS baños', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:30', timeEnd: '10:00', taskName: 'Poner lavadora (sábanas), tender cama con ropa limpia', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar baño principal PROFUNDO (cabina ducha)', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Tender sábanas, poner toallas a lavar', isSpecial: false, category: 'lavanderia' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Limpiar cuarto de linos, organizar', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer y trapear zonas alto tráfico + escaleras', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Doblar/guardar toallas y sábanas', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // VIERNES - Semana 1
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Barrer y trapear sala exterior + limpiar muebles', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar comedor exterior + baño exterior', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ PLANCHADO (ropa acumulada semana)', isSpecial: true, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Continuar planchado + guardar ropa', isSpecial: true, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Revisión general, preparar pendientes lunes', isSpecial: false, category: 'general' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // SÁBADO - Semana 1
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '08:15', taskName: 'Llegar, cambiarse', isSpecial: false, category: 'general' },
          { timeStart: '08:15', timeEnd: '08:30', taskName: 'Dar comida #1 perros (John ya los paseó)', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Tender camas, organizar habitación, recoger ropa', isSpecial: false, category: 'limpieza' },
          { timeStart: '09:00', timeEnd: '09:30', taskName: 'CEPILLAR A CANELO + poner lavadora', isSpecial: false, category: 'perros' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer toda la casa', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:30', taskName: 'Trapear zonas principales + limpiar baños rápido', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Comida #2 perros, dejar comida #3 lista, revisión', isSpecial: false, category: 'perros' },
        ]
      },
    ]
  },
  // ═══ SEMANA 2 - MERCADO LUNES ═══
  {
    weekNumber: 2,
    days: [
      // LUNES - Semana 2 (MERCADO)
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, poner lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Tender camas, organizar habitación, limpiar baño', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Tender ropa, segunda carga', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ MERCADO: Vaciar nevera, limpiar interior, lavar productos', isSpecial: true, category: 'cocina' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: '★ Organizar nevera, barrer/trapear cocina', isSpecial: true, category: 'cocina' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MARTES - Semana 2 (Ventanas)
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:30', taskName: 'LIMPIEZA PROFUNDA habitación principal', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:00', taskName: 'Limpiar oficina + ★ VENTANAS INTERIORES', isSpecial: true, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ Continuar ventanas segundo piso', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Limpiar sala TV + gimnasio', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Trapear segundo piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/recoger ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MIÉRCOLES - Semana 2 (Desempolvar)
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar sala profundo + tapete fique', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar comedor + ★ DESEMPOLVAR toda la casa', isSpecial: true, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ Continuar desempolvado profundo', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '15:00', taskName: 'Barrer y trapear primer piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // JUEVES - Semana 2 (Baños secundarios)
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'CAMBIAR SÁBANAS + TOALLAS', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:30', timeEnd: '10:00', taskName: 'Lavadora sábanas, tender cama', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar baño principal PROFUNDO con cabina', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ BAÑOS SECUNDARIOS profundo (quincenal)', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Tender sábanas, lavar toallas', isSpecial: false, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer/trapear + escaleras', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Doblar/guardar ropa de cama', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // VIERNES - Semana 2
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar áreas exteriores (sala, comedor, baño)', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar área BBQ si se usó', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ PLANCHADO (ropa acumulada)', isSpecial: true, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Continuar planchado + guardar', isSpecial: true, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Revisión general', isSpecial: false, category: 'general' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // SÁBADO - Semana 2
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '08:15', taskName: 'Llegar, cambiarse', isSpecial: false, category: 'general' },
          { timeStart: '08:15', timeEnd: '08:30', taskName: 'Dar comida #1 perros', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Tender camas, organizar habitación, recoger ropa', isSpecial: false, category: 'limpieza' },
          { timeStart: '09:00', timeEnd: '09:30', taskName: 'CEPILLAR A CANELO + lavadora', isSpecial: false, category: 'perros' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer toda la casa', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:30', taskName: 'Trapear + limpiar baños', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Comida #2 perros, dejar comida #3 lista, revisión', isSpecial: false, category: 'perros' },
        ]
      },
    ]
  },
  // ═══ SEMANA 3 ═══
  {
    weekNumber: 3,
    days: [
      // LUNES - Semana 3 (Campana cocina)
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, poner lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Tender camas, organizar habitación, limpiar baño', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Tender ropa, segunda carga', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: 'Barrer y trapear primer piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Organizar cuarto ropas, tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: '★ LIMPIAR EXTRACTORES/CAMPANA COCINA (mensual)', isSpecial: true, category: 'cocina' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MARTES - Semana 3 (Voltear colchón)
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:30', taskName: 'LIMPIEZA PROFUNDA habitación principal', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:00', taskName: 'Limpiar oficina + baño', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Limpiar sala TV + gimnasio', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: '★ VOLTEAR COLCHÓN (mensual, con John)', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Trapear segundo piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/recoger ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MIÉRCOLES - Semana 3
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar sala profundo + tapete fique', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar comedor', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Limpiar baño visitantes profundo', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '15:00', taskName: 'Barrer y trapear primer piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // JUEVES - Semana 3 (Cobijas)
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'CAMBIAR SÁBANAS + TOALLAS + ★ LAVAR COBIJAS', isSpecial: true, category: 'lavanderia' },
          { timeStart: '09:30', timeEnd: '10:00', taskName: 'Lavadora sábanas, tender cama', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar baño principal PROFUNDO con cabina', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: 'Tender sábanas y cobijas', isSpecial: false, category: 'lavanderia' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Limpiar cuarto linos', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer/trapear + escaleras', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Doblar/guardar ropa de cama', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // VIERNES - Semana 3
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar áreas exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar área BBQ si se usó', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ PLANCHADO', isSpecial: true, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Continuar planchado + guardar', isSpecial: true, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Revisión general', isSpecial: false, category: 'general' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // SÁBADO - Semana 3
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '08:15', taskName: 'Llegar, cambiarse', isSpecial: false, category: 'general' },
          { timeStart: '08:15', timeEnd: '08:30', taskName: 'Dar comida #1 perros', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Tender camas, organizar habitación, recoger ropa', isSpecial: false, category: 'limpieza' },
          { timeStart: '09:00', timeEnd: '09:30', taskName: 'CEPILLAR A CANELO + lavadora', isSpecial: false, category: 'perros' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer toda la casa', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:30', taskName: 'Trapear + limpiar baños', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Comida #2 perros, dejar comida #3 lista, revisión', isSpecial: false, category: 'perros' },
        ]
      },
    ]
  },
  // ═══ SEMANA 4 - MERCADO LUNES ═══
  {
    weekNumber: 4,
    days: [
      // LUNES - Semana 4 (MERCADO)
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, poner lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Tender camas, organizar habitación, limpiar baño', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Tender ropa, segunda carga', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ MERCADO: Vaciar nevera, limpiar, lavar productos', isSpecial: true, category: 'cocina' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: '★ Organizar nevera, barrer/trapear cocina', isSpecial: true, category: 'cocina' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MARTES - Semana 4 (Ventanas)
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:00', timeEnd: '10:30', taskName: 'LIMPIEZA PROFUNDA habitación principal', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:00', taskName: 'Limpiar oficina + ★ VENTANAS (quincenal)', isSpecial: true, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ Continuar ventanas', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Limpiar sala TV + gimnasio', isSpecial: false, category: 'limpieza' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Trapear segundo piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Tender/recoger ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // MIÉRCOLES - Semana 4 (Desempolvar)
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar sala + tapete + ★ DESEMPOLVAR profundo', isSpecial: true, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar comedor', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ Continuar desempolvado', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '15:00', taskName: 'Barrer y trapear primer piso', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '15:45', taskName: 'Tender/guardar ropa', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // JUEVES - Semana 4 (Baños secundarios)
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'CAMBIAR SÁBANAS + TOALLAS', isSpecial: false, category: 'lavanderia' },
          { timeStart: '09:30', timeEnd: '10:00', taskName: 'Lavadora, tender cama', isSpecial: false, category: 'lavanderia' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar baño principal PROFUNDO', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:00', taskName: '★ BAÑOS SECUNDARIOS profundo (quincenal)', isSpecial: true, category: 'limpieza' },
          { timeStart: '14:00', timeEnd: '14:30', taskName: 'Tender sábanas/toallas', isSpecial: false, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer/trapear + escaleras', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Doblar/guardar', isSpecial: false, category: 'lavanderia' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // VIERNES - Semana 4
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '07:15', taskName: 'Llegar, cambiarse, lavar loza del día anterior', isSpecial: false, category: 'general' },
          { timeStart: '07:15', timeEnd: '07:45', taskName: 'Preparar desayuno', isSpecial: false, category: 'cocina' },
          { timeStart: '07:45', timeEnd: '08:00', taskName: 'Servir desayuno a todos', isSpecial: false, category: 'cocina' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Comida #1 perros, lavar loza, limpiar cocina', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Recoger ropa, lavadora, CEPILLAR A CANELO', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'Limpiar áreas exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:00', timeEnd: '10:30', taskName: 'Limpiar BBQ si se usó', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Preparar almuerzo + cena', isSpecial: false, category: 'cocina' },
          { timeStart: '12:00', timeEnd: '12:15', taskName: 'Comida #2 perros, empacar almuerzo', isSpecial: false, category: 'perros' },
          { timeStart: '12:15', timeEnd: '12:45', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:45', timeEnd: '13:15', taskName: 'Lavar loza, limpiar cocina', isSpecial: false, category: 'cocina' },
          { timeStart: '13:15', timeEnd: '14:30', taskName: '★ PLANCHADO', isSpecial: true, category: 'lavanderia' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Continuar planchado + guardar', isSpecial: true, category: 'lavanderia' },
          { timeStart: '15:30', timeEnd: '15:45', taskName: 'Revisión general mes siguiente', isSpecial: false, category: 'general' },
          { timeStart: '15:45', timeEnd: '16:00', taskName: 'Comida #3 perros, revisión final', isSpecial: false, category: 'perros' },
        ]
      },
      // SÁBADO - Semana 4
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '08:15', taskName: 'Llegar, cambiarse', isSpecial: false, category: 'general' },
          { timeStart: '08:15', timeEnd: '08:30', taskName: 'Dar comida #1 perros', isSpecial: false, category: 'perros' },
          { timeStart: '08:30', timeEnd: '09:00', taskName: 'Tender camas, organizar habitación, recoger ropa', isSpecial: false, category: 'limpieza' },
          { timeStart: '09:00', timeEnd: '09:30', taskName: 'CEPILLAR A CANELO + lavadora', isSpecial: false, category: 'perros' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer toda la casa', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '11:30', taskName: 'Trapear + limpiar baños', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Comida #2 perros, dejar comida #3 lista, revisión', isSpecial: false, category: 'perros' },
        ]
      },
    ]
  },
];

// =====================================================
// CRONOGRAMA JOHN - 4 SEMANAS (Resumen - tareas principales)
// =====================================================

export const JOHN_SCHEDULE: WeekSchedule[] = [
  // ═══ SEMANA 1 ═══
  {
    weekNumber: 1,
    days: [
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS (Canelo y Pepperoni)', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Aspirar, pH, sal/cloro, limpiar bordes', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer terraza piscina, limpiar muebles', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Mantenimiento jardín frontal', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO AL EDIFICIO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Continuar jardín frontal, regar plantas', isSpecial: false, category: 'jardin' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer entrada principal, limpiar fachada', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Guardar herramientas, organizar bodega', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Aspirar, químicos, filtros', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #1: Hidrolavadora, interior', isSpecial: false, category: 'vehiculos' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Prepararse para llevar almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Mantenimiento jardín lateral', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Barrer áreas, recoger residuos, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Aspirar, cepillar paredes, bomba', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '12:00', taskName: 'Jardín trasero + canchita', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Continuar jardín, revisar cercas vivas', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Recoger residuos, basura jardín, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Mantenimiento diario', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #2', isSpecial: false, category: 'vehiculos' },
          { timeStart: '11:30', timeEnd: '12:00', taskName: 'Prepararse', isSpecial: false, category: 'general' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Limpiar fachada con hidrolavadora, muros', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Limpiar andenes, garage, organizar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Mantenimiento completo fin semana', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:00', taskName: 'Limpiar PÉRGOLA, revisar techo', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Jardineras 2do piso, verificar riego', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Recorrido inspección toda la propiedad', isSpecial: false, category: 'general' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Reparaciones menores, comprar insumos', isSpecial: false, category: 'general' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Organizar bodega, preparar informe', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '09:00', taskName: 'PASEAR PERROS + Desayuno', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'PISCINA: Mantenimiento rápido fin semana', isSpecial: false, category: 'piscina' },
          { timeStart: '10:00', timeEnd: '11:00', taskName: 'Barrer todas las áreas exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Tareas pendientes, organizar herramientas', isSpecial: false, category: 'general' },
        ]
      },
    ]
  },
  // ═══ SEMANA 2 ═══
  {
    weekNumber: 2,
    days: [
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: Aspirar, pH, sal/cloro', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer terraza piscina, muebles', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Mantenimiento jardín frontal', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Continuar jardín, regar', isSpecial: false, category: 'jardin' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Barrer entrada, fachada', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Guardar herramientas', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #1', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Jardín lateral', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Barrer, recoger, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '12:00', taskName: 'Jardín trasero + canchita', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Continuar jardín, cercas', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Recoger residuos, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #2', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: '★ FACHADAS CON HIDROLAVADORA (quincenal)', isSpecial: true, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Andenes, garage, organizar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA: completo fin semana', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:00', taskName: 'Limpiar pérgola, techo', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Jardineras 2do piso', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Recorrido inspección', isSpecial: false, category: 'general' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Reparaciones menores', isSpecial: false, category: 'general' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Organizar, informe', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '09:00', taskName: 'PASEAR PERROS + Desayuno', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'PISCINA rápido', isSpecial: false, category: 'piscina' },
          { timeStart: '10:00', timeEnd: '11:00', taskName: 'Barrer exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Pendientes, organizar', isSpecial: false, category: 'general' },
        ]
      },
    ]
  },
  // ═══ SEMANA 3 - PODA DE CÉSPED ═══
  {
    weekNumber: 3,
    days: [
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer terraza, muebles', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Jardín frontal', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Continuar jardín, regar', isSpecial: false, category: 'jardin' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Entrada, fachada', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Guardar herramientas', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #1', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '16:00', taskName: '★ PODAR CÉSPED COMPLETO - Parte 1', isSpecial: true, category: 'jardin' },
        ]
      },
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '12:00', taskName: '★ CONTINUAR PODA CÉSPED + CANCHITA - Parte 2', isSpecial: true, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Recoger todos los residuos de poda', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Disponer basura, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #2', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Fachada con hidrolavadora', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Andenes, garage, organizar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA + ★ REVISAR BOMBA (mensual)', isSpecial: true, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:00', taskName: '★ LIMPIAR TECHO PÉRGOLA profundo (mensual)', isSpecial: true, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Jardineras 2do piso', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Recorrido inspección', isSpecial: false, category: 'general' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Reparaciones menores', isSpecial: false, category: 'general' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Organizar, informe', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '09:00', taskName: 'PASEAR PERROS + Desayuno', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'PISCINA rápido', isSpecial: false, category: 'piscina' },
          { timeStart: '10:00', timeEnd: '11:00', taskName: 'Barrer exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Pendientes, organizar', isSpecial: false, category: 'general' },
        ]
      },
    ]
  },
  // ═══ SEMANA 4 ═══
  {
    weekNumber: 4,
    days: [
      {
        dayOfWeek: 1,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '10:30', taskName: 'Barrer terraza, muebles', isSpecial: false, category: 'limpieza' },
          { timeStart: '10:30', timeEnd: '12:00', taskName: 'Jardín frontal', isSpecial: false, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Continuar jardín, regar', isSpecial: false, category: 'jardin' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Entrada, fachada', isSpecial: false, category: 'limpieza' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Guardar herramientas', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 2,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #1', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Jardín lateral', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Barrer, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 3,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '12:00', taskName: 'Jardín trasero + ★ CORTAR SETOS (mensual)', isSpecial: true, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: 'Continuar setos + recoger residuos', isSpecial: false, category: 'jardin' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Disponer basura, guardar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 4,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:30', taskName: 'LAVAR CARRO #2', isSpecial: false, category: 'vehiculos' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '15:00', taskName: '★ FACHADAS CON HIDROLAVADORA (quincenal)', isSpecial: true, category: 'limpieza' },
          { timeStart: '15:00', timeEnd: '16:00', taskName: 'Andenes, garage, organizar', isSpecial: false, category: 'limpieza' },
        ]
      },
      {
        dayOfWeek: 5,
        tasks: [
          { timeStart: '07:00', timeEnd: '08:00', taskName: 'PASEAR PERROS', isSpecial: false, category: 'perros' },
          { timeStart: '08:00', timeEnd: '08:30', taskName: 'Desayuno', isSpecial: false, category: 'general' },
          { timeStart: '08:30', timeEnd: '09:30', taskName: 'PISCINA', isSpecial: false, category: 'piscina' },
          { timeStart: '09:30', timeEnd: '11:00', taskName: 'Pérgola + ★ VENTANAS EXTERIORES (mensual)', isSpecial: true, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Jardineras + ★ FUMIGAR si necesario', isSpecial: true, category: 'jardin' },
          { timeStart: '12:00', timeEnd: '12:30', taskName: 'LLEVAR ALMUERZO', isSpecial: false, category: 'general' },
          { timeStart: '12:30', timeEnd: '13:00', taskName: 'Almuerzo', isSpecial: false, category: 'general' },
          { timeStart: '13:00', timeEnd: '14:30', taskName: 'Recorrido inspección final del mes', isSpecial: false, category: 'general' },
          { timeStart: '14:30', timeEnd: '15:30', taskName: 'Reparaciones pendientes', isSpecial: false, category: 'general' },
          { timeStart: '15:30', timeEnd: '16:00', taskName: 'Organizar, informe mensual', isSpecial: false, category: 'general' },
        ]
      },
      {
        dayOfWeek: 6,
        tasks: [
          { timeStart: '08:00', timeEnd: '09:00', taskName: 'PASEAR PERROS + Desayuno', isSpecial: false, category: 'perros' },
          { timeStart: '09:00', timeEnd: '10:00', taskName: 'PISCINA rápido', isSpecial: false, category: 'piscina' },
          { timeStart: '10:00', timeEnd: '11:00', taskName: 'Barrer exteriores', isSpecial: false, category: 'limpieza' },
          { timeStart: '11:00', timeEnd: '12:00', taskName: 'Pendientes, organizar', isSpecial: false, category: 'general' },
        ]
      },
    ]
  },
];

// Función helper para contar tareas
export function countTasks(): { yolima: number; john: number; total: number } {
  let yolimaCount = 0;
  let johnCount = 0;

  YOLIMA_SCHEDULE.forEach(week => {
    week.days.forEach(day => {
      yolimaCount += day.tasks.length;
    });
  });

  JOHN_SCHEDULE.forEach(week => {
    week.days.forEach(day => {
      johnCount += day.tasks.length;
    });
  });

  return {
    yolima: yolimaCount,
    john: johnCount,
    total: yolimaCount + johnCount
  };
}

// Exportar conteo para referencia
export const TASK_COUNTS = countTasks();
// Resultado aproximado: ~384 tareas para Yolima, ~230 para John = ~614 total
