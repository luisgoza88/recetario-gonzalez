import { SpaceAttributes } from '@/types';

// ============================================
// TIPOS PARA CONFIGURACIÓN DE ESPACIOS
// ============================================

export interface TaskConfig {
  id?: string;
  name: string;
  frequency: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
  enabled: boolean;
  estimatedMinutes: number;
  isCustom?: boolean;
  requiresAttribute?: keyof SpaceAttributes;
}

export interface SpaceForm {
  id?: string;
  spaceTypeId: string;
  customName: string;
  category: 'interior' | 'exterior';
  usageLevel: 'alto' | 'medio' | 'bajo';
  areaSqm: number;
  attributes: SpaceAttributes;
  tasks: TaskConfig[];
}

// ============================================
// ATRIBUTOS POR DEFECTO
// ============================================

export const DEFAULT_ATTRIBUTES: SpaceAttributes = {
  has_bathroom: false,
  has_walkin_closet: false,
  has_balcony: false,
  has_windows: 2,
  floor_type: 'tile',
  has_curtains: true,
  has_air_conditioning: false,
};

// ============================================
// TAREAS BASADAS EN ATRIBUTOS
// ============================================

export const ATTRIBUTE_TASKS: Record<keyof SpaceAttributes, TaskConfig[]> = {
  has_bathroom: [
    { name: 'Limpiar sanitario', frequency: 'diaria', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar lavamanos', frequency: 'diaria', enabled: true, estimatedMinutes: 5, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar ducha/bañera', frequency: 'semanal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar espejo baño', frequency: 'semanal', enabled: true, estimatedMinutes: 5, requiresAttribute: 'has_bathroom' },
    { name: 'Desinfección baño', frequency: 'quincenal', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_bathroom' },
  ],
  has_walkin_closet: [
    { name: 'Organizar walking closet', frequency: 'mensual', enabled: true, estimatedMinutes: 45, requiresAttribute: 'has_walkin_closet' },
    { name: 'Barrer walking closet', frequency: 'semanal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_walkin_closet' },
    { name: 'Limpiar estantes closet', frequency: 'quincenal', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_walkin_closet' },
  ],
  has_balcony: [
    { name: 'Barrer balcón', frequency: 'semanal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_balcony' },
    { name: 'Limpiar baranda balcón', frequency: 'quincenal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_balcony' },
    { name: 'Lavar piso balcón', frequency: 'quincenal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_balcony' },
  ],
  has_windows: [], // Las tareas de ventanas se calculan dinámicamente
  floor_type: [], // Se usa para calcular tiempo de limpieza
  has_curtains: [
    { name: 'Limpiar cortinas', frequency: 'mensual', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_curtains' },
    { name: 'Aspirar cortinas', frequency: 'quincenal', enabled: false, estimatedMinutes: 15, requiresAttribute: 'has_curtains' },
  ],
  has_air_conditioning: [
    { name: 'Limpiar filtros A/C', frequency: 'quincenal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_air_conditioning' },
    { name: 'Limpiar rejillas A/C', frequency: 'mensual', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_air_conditioning' },
  ],
};

// ============================================
// TAREAS POR TIPO DE ESPACIO
// ============================================

export const DEFAULT_TASKS: Record<string, TaskConfig[]> = {
  'sala': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar vidrios/ventanas', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar marcos y puertas', frequency: 'mensual', enabled: true, estimatedMinutes: 15 },
    { name: 'Aspirar sofás', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
  ],
  'cocina': [
    { name: 'Limpiar mesones', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Barrer/Trapear', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Lavar platos', frequency: 'diaria', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar estufa', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar campana extractora', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar nevera por fuera', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar nevera por dentro', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar horno/microondas', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Organizar despensa', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar lavaplatos', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
  ],
  'habitación': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Tender cama', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Cambiar sábanas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Organizar closet', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar vidrios/ventanas', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'baño': [
    { name: 'Limpiar sanitario', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar lavamanos', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar ducha/bañera', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Barrer/Trapear', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar espejo', frequency: 'semanal', enabled: true, estimatedMinutes: 5 },
    { name: 'Desinfección profunda', frequency: 'quincenal', enabled: true, estimatedMinutes: 25 },
    { name: 'Limpiar azulejos', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Organizar productos', frequency: 'mensual', enabled: true, estimatedMinutes: 15 },
  ],
  'comedor': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar mesa', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar sillas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar vitrina/aparador', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'estudio': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar escritorio', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Organizar libros', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar estantes', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'lavandería': [
    { name: 'Barrer/Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar lavadora', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar secadora', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar productos', frequency: 'mensual', enabled: true, estimatedMinutes: 20 },
  ],
  'garaje': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Organizar herramientas', frequency: 'mensual', enabled: true, estimatedMinutes: 45 },
    { name: 'Limpiar piso', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
  ],
  'jardín': [
    { name: 'Regar plantas', frequency: 'diaria', enabled: true, estimatedMinutes: 20 },
    { name: 'Podar césped', frequency: 'semanal', enabled: true, estimatedMinutes: 45 },
    { name: 'Limpiar hojas', frequency: 'semanal', enabled: true, estimatedMinutes: 30 },
    { name: 'Abonar', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Podar arbustos', frequency: 'mensual', enabled: true, estimatedMinutes: 45 },
  ],
  'terraza': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Lavar piso', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar barandas', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'piscina': [
    { name: 'Verificar pH', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar superficie', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Aspirar fondo', frequency: 'semanal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar bordes', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Revisar filtros', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
  ],
};

// ============================================
// OPCIONES DE FRECUENCIA
// ============================================

export const FREQUENCY_OPTIONS = [
  { value: 'diaria', label: 'Diaria', color: 'red' },
  { value: 'semanal', label: 'Semanal', color: 'blue' },
  { value: 'quincenal', label: 'Quincenal', color: 'green' },
  { value: 'mensual', label: 'Mensual', color: 'gray' },
] as const;

// ============================================
// UTILIDADES
// ============================================

export function getDefaultTasksForType(typeName: string, attributes?: SpaceAttributes): TaskConfig[] {
  const normalizedName = typeName.toLowerCase();
  let baseTasks: TaskConfig[] = [];

  // Buscar tareas base por tipo
  for (const [key, tasks] of Object.entries(DEFAULT_TASKS)) {
    if (normalizedName.includes(key)) {
      baseTasks = tasks.map(t => ({ ...t }));
      break;
    }
  }

  // Tareas genéricas si no hay match
  if (baseTasks.length === 0) {
    baseTasks = [
      { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
      { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
      { name: 'Limpiar polvo', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    ];
  }

  // Agregar tareas basadas en atributos
  if (attributes) {
    // Solo agregar tareas de atributos si NO es un baño
    if (!normalizedName.includes('baño') && !normalizedName.includes('bano')) {
      for (const [attrKey, attrTasks] of Object.entries(ATTRIBUTE_TASKS)) {
        const attrValue = attributes[attrKey as keyof SpaceAttributes];
        if (attrValue && typeof attrValue === 'boolean' && attrTasks.length > 0) {
          baseTasks = [...baseTasks, ...attrTasks.map(t => ({ ...t }))];
        }
      }

      // Tareas de ventanas basadas en cantidad
      if (attributes.has_windows > 0) {
        const windowMinutes = attributes.has_windows * 8;
        baseTasks.push({
          name: `Limpiar ventanas (${attributes.has_windows})`,
          frequency: 'quincenal',
          enabled: true,
          estimatedMinutes: windowMinutes
        });
      }
    }
  }

  return baseTasks;
}

export function getFrequencyColor(frequency: string): string {
  const option = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  return option?.color || 'gray';
}

export function getFrequencyLabel(frequency: string): string {
  const option = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  return option?.label || frequency;
}
