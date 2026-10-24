import { apiClient } from "./api-client";
import { putBackCatalogFood, removeCatalogFood, type FoodItem } from "./catalog";
import { isRecipeId } from "./recipe";
import { deleteRecipe, restoreRecipe } from "./recipe-store";

/**
 * Xóa món (Job C): the one place a delete of an own food happens, from the list, the food page and the ⋯ menu. No confirm here (the
 * caller asks first only when a saved meal or Ngày ăn mẫu holds the food): the food leaves at once, and the toast says
 * "Đã xóa <món>" with Hoàn tác for as long as the delete waits in the outbox (held OWN_FOOD_HOLD_MS, longer than the toast).
 *  - a dish made from ingredients (recipe-store): removed from this device, its server foods deleted after the window;
 *  - any other own food: out of the catalogue and the device's copy, DELETE /foods/custom/{id} held in the outbox.
 * Past diary entries keep their own numbers either way; Hoàn tác puts everything back, and nothing is sent.
 */
export function deleteOwnFood(food: FoodItem, notifyUndo: (message: string, onUndo: () => void) => void, notify: (message: string) => void): boolean {
  const message = `Đã xóa ${food.nameVi}`;
  if (isRecipeId(food.id)) {
    const gone = deleteRecipe(food.id);
    if (!gone) return false;
    notifyUndo(message, () => void restoreRecipe(gone));
    return true;
  }
  const removed = removeCatalogFood(food.id);
  if (!removed) return false;
  void apiClient.deleteOwnFood(food.id);
  notifyUndo(message, () => {
    // The DELETE is held past the toast, so this is nearly always true. When it has already gone the server no longer has the food:
    // it stays out of the catalogue (never back on screen with no server copy) and the toast says so.
    void apiClient.undoOwnFoodDelete(food.id, removed).then((taken) => {
      if (taken) putBackCatalogFood(removed);
      else notify("Món đã xóa rồi");
    });
  });
  return true;
}
