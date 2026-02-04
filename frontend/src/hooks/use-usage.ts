"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import type { UsageResponse } from "@/src/lib/api-types";

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: () => api.get<UsageResponse>("/v1/usage"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
