import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Space, SpaceType } from "@/types";
import type { TaskConfig, SpaceForm } from "@/lib/config/spaceConfig";
import { homeQueryKeys } from "./useHomeData";

// ============================================
// QUERY KEYS
// ============================================
export const spacesQueryKeys = {
  spaceTypes: ["spaceTypes"] as const,
  spaceTasks: (spaceId: string) => ["spaceTasks", spaceId] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchSpaceTypes(): Promise<SpaceType[]> {
  const { data, error } = await supabase
    .from("space_types")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as SpaceType[];
}

async function fetchSpaceTasks(spaceId: string): Promise<TaskConfig[]> {
  const { data, error } = await supabase
    .from("task_templates")
    .select("*")
    .eq("space_id", spaceId);

  if (error) throw error;

  if (data && data.length > 0) {
    return data.map((t) => ({
      id: t.id,
      name: t.name,
      frequency: t.frequency as TaskConfig["frequency"],
      enabled: t.is_active,
      estimatedMinutes: t.estimated_minutes,
      isCustom: false,
    }));
  }

  return [];
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener los tipos de espacio ordenados por sort_order
 */
export function useSpaceTypes() {
  return useQuery({
    queryKey: spacesQueryKeys.spaceTypes,
    queryFn: fetchSpaceTypes,
  });
}

/**
 * Hook para obtener las tareas (task_templates) de un espacio
 */
export function useSpaceTasks(spaceId: string | undefined) {
  return useQuery({
    queryKey: spacesQueryKeys.spaceTasks(spaceId!),
    queryFn: () => fetchSpaceTasks(spaceId!),
    enabled: !!spaceId,
  });
}

// ============================================
// HOOKS - MUTATIONS
// ============================================

/**
 * Hook para guardar (insertar o actualizar) un espacio y sus task_templates
 */
export function useSaveSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      space,
    }: {
      householdId: string;
      space: SpaceForm;
    }) => {
      if (!space.spaceTypeId) {
        throw new Error("Se requiere un tipo de espacio");
      }

      const spaceData = {
        household_id: householdId,
        space_type_id: space.spaceTypeId,
        custom_name: space.customName.trim() || null,
        category: space.category,
        usage_level: space.usageLevel,
        area_sqm: space.areaSqm > 0 ? space.areaSqm : null,
        attributes: space.attributes,
        has_bathroom: space.attributes.has_bathroom,
      };

      let spaceId = space.id;

      if (space.id) {
        // Update existing space
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", space.id);
        if (error) throw error;
      } else {
        // Insert new space
        const { data, error } = await supabase
          .from("spaces")
          .insert(spaceData)
          .select("id")
          .single();
        if (error) throw error;
        spaceId = data.id;
      }

      // Save task templates
      if (spaceId) {
        // Delete existing task_templates for this space
        await supabase.from("task_templates").delete().eq("space_id", spaceId);

        // Insert new enabled task_templates
        const tasksToInsert = space.tasks
          .filter((t) => t.enabled)
          .map((t) => ({
            household_id: householdId,
            space_id: spaceId,
            name: t.name,
            frequency: t.frequency,
            estimated_minutes: t.estimatedMinutes,
            priority: "normal",
            is_active: true,
          }));

        if (tasksToInsert.length > 0) {
          const { error: tasksError } = await supabase
            .from("task_templates")
            .insert(tasksToInsert);
          if (tasksError) throw tasksError;
        }
      }

      return { spaceId } as { spaceId: string };
    },
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({
        queryKey: homeQueryKeys.spaces(householdId),
      });
    },
  });
}

/**
 * Hook para eliminar un espacio y sus datos relacionados en cascada
 * (scheduled_tasks -> task_templates -> spaces)
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spaceId }: { spaceId: string }) => {
      // Fetch the space first to get the household_id for cache invalidation
      const { data: space, error: fetchError } = await supabase
        .from("spaces")
        .select("household_id")
        .eq("id", spaceId)
        .single();
      if (fetchError) throw fetchError;

      const householdId = (space as Pick<Space, "household_id">).household_id;

      // Cascade delete: scheduled_tasks -> task_templates -> space
      const { error: scheduledError } = await supabase
        .from("scheduled_tasks")
        .delete()
        .eq("space_id", spaceId);
      if (scheduledError) throw scheduledError;

      const { error: templatesError } = await supabase
        .from("task_templates")
        .delete()
        .eq("space_id", spaceId);
      if (templatesError) throw templatesError;

      const { error: spaceError } = await supabase
        .from("spaces")
        .delete()
        .eq("id", spaceId);
      if (spaceError) throw spaceError;

      return { householdId };
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: homeQueryKeys.spaces(householdId),
      });
    },
  });
}
