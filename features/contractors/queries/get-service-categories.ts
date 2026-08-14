import "server-only";

import {
  getActiveServiceCategories,
} from
  "@/features/contractors/repositories/service-category-repository";

export async function getServiceCategories() {
  return getActiveServiceCategories();
}