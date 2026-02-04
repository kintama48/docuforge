"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import type { Asset } from "@/src/lib/api-types";

type UploadUrlResponse = { upload_url: string; asset_id: string };
type AssetsResponse = { assets: Asset[] };

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: () => api.get<AssetsResponse>("/v1/assets"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const uploadUrl = await api.post<UploadUrlResponse>(
        "/v1/assets/upload-url",
        {
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
        }
      );
      await fetch(uploadUrl.upload_url, {
        method: "PUT",
        body: file,
      });
      const hash = await sha256(file);
      await api.post("/v1/assets", {
        asset_id: uploadUrl.asset_id,
        name: file.name,
        hash,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
