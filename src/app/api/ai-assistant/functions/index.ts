/**
 * AI Assistant Functions - Barrel Export
 *
 * Re-exports all function implementations from domain modules.
 */

// Gemini function declarations
export { functionDeclarations } from "./declarations";

// Recetario - Queries
export {
  getTodayMenu,
  getWeekMenu,
  searchRecipes,
  getRecipeDetails,
  getMissingIngredients,
  getInventory,
  getShoppingList,
  suggestRecipe,
} from "./recetario-queries";

// Recetario - Mutations
export {
  addToShoppingList,
  markShoppingItem,
  addMissingToShopping,
  swapMenuRecipe,
  updateInventory,
  bulkUpdateInventory,
  scanReceiptItems,
  resetInventoryToDefault,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "./recetario-mutations";

// Home - Queries
export {
  getTodayTasks,
  getEmployeeSchedule,
  getTasksSummary,
  listSpaces,
  getSpaceDetails,
  listEmployees,
  getEmployeeDetails,
  listTaskTemplates,
} from "./home-queries";

// Home - Mutations
export {
  completeTask,
  addQuickTask,
  createSpace,
  updateSpace,
  deleteSpace,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  rescheduleTask,
  generateTasksForDate,
} from "./home-mutations";

// Reports & Utilities
export {
  getCurrentDateInfo,
  getWeeklyReport,
  getLowInventoryAlerts,
  getUpcomingMeals,
  calculatePortions,
  getPreparationTips,
  smartShoppingList,
} from "./reports";

// Multi-step Agent
export { executeMultiStepTask } from "./multi-step";
