import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Valid Sort Options
export type SortOption = "best" | "cheapest" | "discount" | "rating";

interface UseDealsParams {
  search?: string;
  category?: string;
  sort?: SortOption;
}

export function useDeals({ search, category, sort }: UseDealsParams = {}) {
  // Construct URL with query params
  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (category && category !== "All Deals") queryParams.set("category", category);
  if (sort) queryParams.set("sort", sort);

  const url = `${api.deals.list.path}?${queryParams.toString()}`;

  return useQuery({
    queryKey: [api.deals.list.path, { search, category, sort }],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch deals");
      return api.deals.list.responses[200].parse(await res.json());
    },
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: [api.deals.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.deals.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch deal");
      return api.deals.get.responses[200].parse(await res.json());
    },
  });
}
