import type { AdminPage } from "@/types/admin";

/**
 * Args: id (required record ID), getPage (required authenticated Admin page loader), preferredPage (optional zero-based page; default 0).
 * Input: authorized paginated Java API; scans pages only when the requested record is not on the preferred page.
 * Output: Promise<T | null>; exact record or null when absent. Side effects: read-only API calls.
 * Errors: propagates API failures to the caller for an in-page error state.
 */
export async function findAdminRecord<T extends { id: string }>(
  id: string,
  getPage: (page: number) => Promise<AdminPage<T>>,
  preferredPage = 0,
): Promise<T | null> {
  if (!id.trim()) return null;
  if (!Number.isInteger(preferredPage) || preferredPage < 0) throw new RangeError("preferredPage must be a nonnegative integer");
  const first = await getPage(preferredPage);
  const immediate = first.items.find((item) => item.id === id);
  if (immediate) return immediate;
  for (let page = 0; page < first.totalPages; page += 1) {
    if (page === preferredPage) continue;
    const result = await getPage(page);
    const found = result.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}
