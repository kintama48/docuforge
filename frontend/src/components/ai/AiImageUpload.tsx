"use client";

import { useI18n } from "@/src/lib/i18n";

type AiImageUploadProps = {
  disabled?: boolean;
  onUpload: (base64: string) => void;
};

export function AiImageUpload({ disabled, onUpload }: AiImageUploadProps) {
  const { messages } = useI18n();
  return (
    <div className="mt-3">
      <label className="text-xs text-[var(--muted)]">
        {messages.ai.uploadScreenshot}
      </label>
      <input
        type="file"
        accept=".png,.jpg,.jpeg"
        aria-label={messages.ai.uploadScreenshot}
        className="mt-2 w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border file:border-[var(--line)] file:bg-[var(--surface)] file:px-3 file:py-1 file:text-xs file:text-[var(--ink)]"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const base64 = await fileToBase64(file);
          onUpload(base64);
        }}
        disabled={disabled}
      />
    </div>
  );
}

async function fileToBase64(file: File) {
  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = result.split(",")[1];
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
