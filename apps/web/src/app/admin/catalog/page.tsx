import { redirect } from "next/navigation";

/** Args: none. Input: legacy catalog entry route. Output: never; redirects to the Subject list. Errors: Next navigation redirect. */
export default function AdminCatalogPage(): never {
  redirect("/admin/catalog/subjects");
}
