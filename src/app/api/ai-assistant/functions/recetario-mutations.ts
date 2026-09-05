import { createAIClient } from "@/lib/ai-assistant/db";
import { InventoryUpdate, ReceiptItem } from "@/lib/ai-assistant/types";
import { getMissingIngredients } from "./recetario-queries";
import { logger } from "@/lib/logger";

async function getSupabase() {
  return createAIClient();
}

export async function addToShoppingList(itemName: string, quantity?: string) {
  const supabase = await getSupabase();
  const { data: existingItem } = await supabase
    .from("market_items")
    .select("id")
    .throwOnError()
    .ilike("name", `%${itemName}%`)
    .single();

  if (existingItem) {
    await supabase
      .from("market_checklist")
      .upsert({ item_id: existingItem.id, checked: false })
      .throwOnError()
      .select()
      .throwOnError();
    return {
      success: true,
      message: `"${itemName}" agregado a la lista de compras`,
    };
  }

  const { data: newItem } = await supabase
    .from("market_items")
    .insert({
      id: crypto.randomUUID(),
      name: itemName,
      category: "Otros",
      quantity: quantity || "unidad",
      unit: quantity || "unidad",
      is_custom: true,
      order_index: 999,
    })
    .throwOnError()
    .select()
    .throwOnError()
    .single();

  if (newItem) {
    await supabase
      .from("market_checklist")
      .insert({ item_id: newItem.id, checked: false })
      .throwOnError();
    return {
      success: true,
      message: `"${itemName}" creado y agregado a la lista`,
    };
  }

  return { success: false, message: "No se pudo agregar el item" };
}

export async function markShoppingItem(itemName: string, checked: boolean) {
  const supabase = await getSupabase();
  const { data: item } = await supabase
    .from("market_items")
    .select("id")
    .throwOnError()
    .ilike("name", `%${itemName}%`)
    .single();

  if (!item) {
    return {
      success: false,
      message: `No se encontró "${itemName}" en la lista`,
    };
  }

  await supabase
    .from("market_checklist")
    .update({ checked })
    .throwOnError()
    .eq("item_id", item.id);

  return {
    success: true,
    message: checked
      ? `"${itemName}" marcado como comprado`
      : `"${itemName}" desmarcado`,
  };
}

export async function addMissingToShopping(recipeName: string) {
  const missingResult = await getMissingIngredients(recipeName);

  if ("error" in missingResult) {
    return missingResult;
  }

  if (missingResult.missing_count === 0) {
    return {
      success: true,
      message: `¡Tienes todos los ingredientes para ${missingResult.recipe}!`,
      added: [],
    };
  }

  const added: string[] = [];
  for (const ingredient of missingResult.missing_ingredients) {
    const result = await addToShoppingList(ingredient);
    if (result.success) {
      added.push(ingredient);
    }
  }

  return {
    success: true,
    message: `Se agregaron ${added.length} ingredientes a la lista de compras`,
    added,
    recipe: missingResult.recipe,
  };
}

export async function swapMenuRecipe(
  dayNumber: number,
  mealType: string,
  newRecipeName: string,
) {
  const supabase = await getSupabase();
  if (dayNumber < 1 || dayNumber > 12) {
    return { success: false, message: "El día debe estar entre 1 y 12" };
  }

  const validMealTypes = ["breakfast", "lunch", "dinner"];
  if (!validMealTypes.includes(mealType)) {
    return {
      success: false,
      message: "Tipo de comida debe ser: breakfast, lunch o dinner",
    };
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, name")
    .throwOnError()
    .ilike("name", `%${newRecipeName}%`)
    .single();

  if (!recipe) {
    return {
      success: false,
      message: `No se encontró la receta "${newRecipeName}"`,
    };
  }

  const updateField = `${mealType}_id`;
  const { error } = await supabase
    .from("day_menu")
    .update({ [updateField]: recipe.id })
    .eq("day_number", dayNumber);

  if (error) {
    return { success: false, message: "Error al actualizar el menú" };
  }

  const mealTypeSpanish: Record<string, string> = {
    breakfast: "desayuno",
    lunch: "almuerzo",
    dinner: "cena",
  };

  return {
    success: true,
    message: `${mealTypeSpanish[mealType]} del día ${dayNumber} cambiado a "${recipe.name}"`,
  };
}

export async function updateInventory(
  itemName: string,
  quantity: number,
  action: string = "set",
) {
  const supabase = await getSupabase();
  const { data: item } = await supabase
    .from("market_items")
    .select("id, name")
    .throwOnError()
    .ilike("name", `%${itemName}%`)
    .single();

  if (!item) {
    return {
      success: false,
      message: `No se encontró "${itemName}" en el inventario`,
    };
  }

  const { data: currentInv } = await supabase
    .from("inventory")
    .select("current_number")
    .throwOnError()
    .eq("item_id", item.id)
    .single();

  let newQuantity = quantity;
  const currentQty = currentInv?.current_number || 0;

  if (action === "add") {
    newQuantity = currentQty + quantity;
  } else if (action === "subtract") {
    newQuantity = Math.max(0, currentQty - quantity);
  }

  const { error } = await supabase.from("inventory").upsert(
    {
      item_id: item.id,
      current_number: newQuantity,
      current_quantity: `${newQuantity}`,
    },
    { onConflict: "item_id" },
  );

  if (error) {
    return { success: false, message: "Error al actualizar el inventario" };
  }

  return {
    success: true,
    message: `${item.name}: ${currentQty} → ${newQuantity}`,
    item: item.name,
    previous: currentQty,
    current: newQuantity,
  };
}

export async function bulkUpdateInventory(
  updates: InventoryUpdate[],
  confirm: boolean,
) {
  const supabase = await getSupabase();
  if (!confirm) {
    return {
      success: false,
      message:
        "Debe confirmar la actualización masiva estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const results: Array<{
      item: string;
      success: boolean;
      previousQuantity?: number;
      newQuantity?: number;
      error?: string;
    }> = [];

    const previousStates: Record<string, unknown>[] = [];
    const newStates: Record<string, unknown>[] = [];
    const affectedIds: string[] = [];

    for (const update of updates) {
      const { data: item } = await supabase
        .from("market_items")
        .select("id, name")
        .throwOnError()
        .ilike("name", `%${update.item_name}%`)
        .single();

      if (!item) {
        results.push({
          item: update.item_name,
          success: false,
          error: "Item no encontrado",
        });
        continue;
      }

      const { data: inventory } = await supabase
        .from("inventory")
        .select("*")
        .throwOnError()
        .eq("item_id", item.id)
        .single();

      const previousQuantity = inventory?.current_number || 0;
      previousStates.push({ item_id: item.id, quantity: previousQuantity });

      let newQuantity: number;
      const action = update.action || "set";

      switch (action) {
        case "add":
          newQuantity = previousQuantity + update.quantity;
          break;
        case "subtract":
          newQuantity = Math.max(0, previousQuantity - update.quantity);
          break;
        default:
          newQuantity = update.quantity;
      }

      const { error: updateError } = await supabase
        .from("inventory")
        .upsert({ item_id: item.id, current_number: newQuantity });

      if (updateError) {
        results.push({
          item: item.name,
          success: false,
          error: updateError.message,
        });
      } else {
        results.push({
          item: item.name,
          success: true,
          previousQuantity,
          newQuantity,
        });
        newStates.push({ item_id: item.id, quantity: newQuantity });
        affectedIds.push(item.id);
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      success: successCount > 0,
      message: `${successCount} de ${updates.length} items actualizados`,
      results,
      previousState: previousStates,
      newState: newStates,
      affectedTables: ["inventory"],
      affectedRecordIds: affectedIds,
    };
  } catch (err) {
    logger.error("bulkUpdateInventory error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al actualizar inventario" };
  }
}

export async function scanReceiptItems(items: ReceiptItem[]) {
  try {
    const updates: InventoryUpdate[] = items.map((item) => ({
      item_name: item.name,
      quantity: item.quantity,
      action: "add" as const,
    }));
    return await bulkUpdateInventory(updates, true);
  } catch (err) {
    logger.error("scanReceiptItems error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al procesar items del ticket" };
  }
}

export async function resetInventoryToDefault(confirm: boolean) {
  const supabase = await getSupabase();
  if (!confirm) {
    return {
      success: false,
      message: "Debe confirmar el reinicio estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const { data: previousInventory } = await supabase
      .from("inventory")
      .select("*, item:market_items(name)")
      .throwOnError();

    const { data: defaultValues } = await supabase
      .from("market_items")
      .select("id")
      .throwOnError();

    for (const item of defaultValues || []) {
      await supabase
        .from("inventory")
        .upsert({
          item_id: item.id,
          current_number: 0,
        })
        .throwOnError();
    }

    const { data: newInventory } = await supabase
      .from("inventory")
      .select("*, item:market_items(name)")
      .throwOnError();

    return {
      success: true,
      message: `Inventario reiniciado a valores predeterminados (${defaultValues?.length || 0} items)`,
      previousState: previousInventory,
      newState: newInventory,
      affectedTables: ["inventory"],
      affectedRecordIds: (defaultValues || []).map((i) => i.id),
    };
  } catch (err) {
    logger.error("resetInventoryToDefault error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al reiniciar inventario" };
  }
}

interface RecipeIngredient {
  name: string;
  /** Cantidad por miembro del hogar. Ver `@/lib/portions`. */
  per_person?: Record<string, string>;
  /** @deprecated Modelo legacy con nombres propios. */
  luis?: string;
  /** @deprecated Ver `luis`. */
  mariana?: string;
  total?: string;
}

export async function createRecipe(
  name: string,
  type: "breakfast" | "lunch" | "dinner",
  ingredients: RecipeIngredient[],
  steps: string[],
  prepTime?: number,
  cookTime?: number,
  difficulty?: string,
  description?: string,
  tips?: string,
) {
  const supabase = await getSupabase();
  try {
    const totalTime = (prepTime || 0) + (cookTime || 0);

    const { data: newRecipe, error } = await supabase
      .from("recipes")
      .insert({
        id: crypto.randomUUID(),
        name,
        type,
        ingredients: ingredients as unknown as never,
        steps,
        prep_time: prepTime,
        cook_time: cookTime,
        total_time: totalTime || null,
        difficulty: difficulty || "media",
        description,
        tips,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating recipe", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al crear receta: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Receta "${name}" creada exitosamente`,
      recipe: { id: newRecipe.id, name: newRecipe.name, type: newRecipe.type },
      previousState: null,
      newState: newRecipe,
      affectedTables: ["recipes"],
      affectedRecordIds: [newRecipe.id],
    };
  } catch (err) {
    logger.error("createRecipe error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al crear receta" };
  }
}

export async function updateRecipe(
  recipeId: string,
  updates: {
    name?: string;
    type?: string;
    ingredients?: RecipeIngredient[];
    steps?: string[];
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    description?: string;
    tips?: string;
  },
) {
  const supabase = await getSupabase();
  try {
    const { data: previousRecipe } = await supabase
      .from("recipes")
      .select("*")
      .throwOnError()
      .eq("id", recipeId)
      .single();

    if (!previousRecipe) {
      return { success: false, message: "Receta no encontrada" };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.type) updateData.type = updates.type;
    if (updates.ingredients) updateData.ingredients = updates.ingredients;
    if (updates.steps) updateData.steps = updates.steps;
    if (updates.prepTime) updateData.prep_time = updates.prepTime;
    if (updates.cookTime) updateData.cook_time = updates.cookTime;
    if (updates.difficulty) updateData.difficulty = updates.difficulty;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.tips !== undefined) updateData.tips = updates.tips;

    if (updates.prepTime || updates.cookTime) {
      const prep = updates.prepTime || previousRecipe.prep_time || 0;
      const cook = updates.cookTime || previousRecipe.cook_time || 0;
      updateData.total_time = prep + cook;
    }

    const { data: updatedRecipe, error } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", recipeId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating recipe", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al actualizar: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Receta "${updatedRecipe.name}" actualizada`,
      recipe: { id: updatedRecipe.id, name: updatedRecipe.name },
      previousState: previousRecipe,
      newState: updatedRecipe,
      affectedTables: ["recipes"],
      affectedRecordIds: [recipeId],
    };
  } catch (err) {
    logger.error("updateRecipe error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al actualizar receta" };
  }
}

export async function deleteRecipe(recipeId: string, confirm: boolean) {
  const supabase = await getSupabase();
  if (!confirm) {
    return {
      success: false,
      message: "Debe confirmar la eliminación estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const { data: previousRecipe } = await supabase
      .from("recipes")
      .select("*")
      .throwOnError()
      .eq("id", recipeId)
      .single();

    if (!previousRecipe) {
      return { success: false, message: "Receta no encontrada" };
    }

    const { data: menuUsage } = await supabase
      .from("day_menu")
      .select("day_number")
      .throwOnError()
      .or(
        `breakfast_id.eq.${recipeId},lunch_id.eq.${recipeId},dinner_id.eq.${recipeId}`,
      );

    if (menuUsage && menuUsage.length > 0) {
      return {
        success: false,
        message: `No se puede eliminar: la receta está en uso en ${menuUsage.length} día(s) del menú`,
        menu_days: menuUsage.map((m) => m.day_number),
      };
    }

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);

    if (error) {
      logger.error("Error deleting recipe", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Receta "${previousRecipe.name}" eliminada`,
      previousState: previousRecipe,
      newState: null,
      affectedTables: ["recipes"],
      affectedRecordIds: [recipeId],
    };
  } catch (err) {
    logger.error("deleteRecipe error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al eliminar receta" };
  }
}
