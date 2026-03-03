"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import type { Template, TemplateDetail, TemplateVersion } from "@/src/lib/api-types";
import type { LowCodeSpec } from "@/src/lib/low-code";

type TemplatesResponse = {
  templates: Template[];
  pagination: { page: number; limit: number; total: number };
};

export function useTemplates(includeOfficial = true) {
  return useQuery({
    queryKey: ["templates", { includeOfficial }],
    queryFn: () =>
      api.get<TemplatesResponse>(
        `/v1/templates?include_official=${includeOfficial ? "true" : "false"}`
      ),
  });
}

export function useTemplate(id?: string) {
  return useQuery({
    queryKey: ["template", id],
    queryFn: () => api.get<{ template: TemplateDetail }>(`/v1/templates/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateTemplate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string | null;
      source?: string;
      low_code_spec?: LowCodeSpec;
      files?: Record<string, string>;
      defaults?: Record<string, unknown>;
    }) => api.post<{ template: TemplateDetail }>("/v1/templates", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/editor/${data.template.id}`);
    },
  });
}

export function usePublishVersion(defaultId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      id?: string;
      source?: string;
      low_code_spec?: LowCodeSpec;
      files?: Record<string, string>;
      defaults?: Record<string, unknown>;
      commit_message?: string;
    }) => {
      const requestBody: Record<string, unknown> = {
        files: payload.files,
        defaults: payload.defaults,
        commit_message: payload.commit_message,
      };

      if (payload.source !== undefined) {
        requestBody.source = payload.source;
      }
      if (payload.low_code_spec !== undefined) {
        requestBody.low_code_spec = payload.low_code_spec;
      }

      return api.post<{ version: { version_number: number } }>(
        `/v1/templates/${payload.id || defaultId}/publish`,
        requestBody
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template", defaultId] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useForkTemplate(options?: { navigate?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      api.post<{ template: TemplateDetail }>(`/v1/templates/${payload.id}/fork`, {
        name: payload.name,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      if (options?.navigate === false) return;
      router.push(`/editor/${data.template.id}`);
    },
  });
}

export function useDeleteTemplate(defaultId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => api.delete(`/v1/templates/${id || defaultId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push("/dashboard");
    },
  });
}

export function useUpdateTemplate(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; description?: string | null }) =>
      api.patch<{ template: TemplateDetail }>(`/v1/templates/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", id] });
    },
  });
}

export function useTemplateVersion(templateId?: string) {
  return useMutation({
    mutationFn: (versionId: string) =>
      api.get<{ version: TemplateVersion }>(
        `/v1/templates/${templateId}/versions/${versionId}`
      ),
  });
}

export function useAnalyzePdfImport() {
  return useMutation({
    mutationFn: (payload: {
      file_name: string;
      pdf_base64: string;
      user_prompt?: string;
    }) =>
      api.post<{
        analysis: {
          source: string;
          tokens_used: number;
          converter: string;
          extracted_text_preview: string;
          ai_credit_charged: number;
          usage_log_id: string;
        };
      }>("/v1/templates/import/pdf/analyze", payload),
  });
}

export function useCreateImportedTemplate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      source: string;
      defaults?: Record<string, unknown>;
      commit_message?: string;
    }) =>
      api.post<{ template: TemplateDetail }>(
        "/v1/templates/import/pdf/create",
        payload
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/editor/${data.template.id}`);
    },
  });
}
