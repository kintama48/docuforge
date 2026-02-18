"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { useTemplates } from "@/src/hooks/use-templates";

export default function EditorEntryPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useTemplates(true);

  useEffect(() => {
    if (isLoading || isError) return;
    const templates = data?.templates || [];
    if (!templates.length) {
      router.replace("/dashboard");
      return;
    }

    const preferred = templates.find((template) => !template.is_official);
    router.replace(`/editor/${preferred?.id || templates[0].id}`);
  }, [data, isError, isLoading, router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-[--bg] text-sm text-[--muted]">
        Opening editor...
      </div>
    </ProtectedRoute>
  );
}
